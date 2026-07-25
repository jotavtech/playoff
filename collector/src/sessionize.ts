import type { Listen, Outcome, PlayerSample, SessionizeOptions } from './types.js'

/**
 * Amostras cruas → escutas. Função pura: sem relógio, sem banco, sem I/O.
 *
 * Este arquivo é o coração do projeto. Skip é o sinal que o sistema existe para
 * capturar (PRD §3.1) e é o único que nenhuma ferramenta pronta entrega — então
 * classificar errado aqui não é um bug de relatório, é o produto inteiro mentindo.
 *
 * ── A ideia central ────────────────────────────────────────────────────────
 *
 * Uma amostra **não é uma fronteira**. Ela é evidência que *cerca* uma fronteira
 * que ninguém observou. Com poll de 20s, o fim real de uma faixa está em algum
 * lugar dentro de um intervalo de 20s — mas a primeira amostra da faixa seguinte
 * diz onde, com precisão de ~1s:
 *
 *     fim(A) = B.primeira.observed_at − B.primeira.progress_ms
 *
 * Reconstruir a fronteira pelos dois lados é o que separa este algoritmo de um
 * que compara `duration − progress` contra uma constante. A versão por constante
 * tem dois defeitos fatais: ela torna os últimos ~25s de *toda* faixa incapazes de
 * serem skip — justamente onde mora "já ouvi o suficiente" — e transforma qualquer
 * poll atrasado (429, refresh de token lento) em um skip fabricado. Um skip falso
 * é o pior erro possível aqui: depois de gravado, é indistinguível de um real.
 *
 * ── Limites conhecidos, e por que não dá pra fechá-los ─────────────────────
 *
 * 1. **Faixa curta some.** Uma faixa abandonada após t segundos só é amostrada com
 *    probabilidade ~min(t/20, 1): ~15% para uma rejeição de 3s. O histograma de
 *    duração-até-skip cai perto de zero por artefato do amostrador, não por
 *    comportamento. Nenhuma taxa de poll viável fecha isso.
 * 2. **Teto de 3 skips/min.** Não dá para registrar mais de um evento por poll.
 *    A "taxa de skip" do PRD §6 satura — é propriedade do instrumento, não da pessoa.
 * 3. **Crossfade.** Até 12s, invisível pela API. Ver `endToleranceMs`.
 * 4. **Restart no meio da faixa** (não wraparound) fica dentro do mesmo segmento e
 *    é invisível à assinatura de skip, de propósito: é indistinguível de um seek.
 *
 * Os limites 1 e 2 são do dado, não do código. Estão documentados aqui porque em
 * seis meses a forma do histograma não vai ser recuperável a partir do próprio dado.
 */

/** Faixas religadas pelo Spotify (relinking) trocam de id sem trocar de música. */
const RELINK_SLACK_MS = 5_000

/** Folga para reconhecer que o playhead deu a volta (fim → recomeço). */
const WRAP_SLACK_MS = 3_000

/** Pausa acumulada acima disto encerra o segmento em vez de esticá-lo. */
const PAUSE_SPLIT_MS = 120_000

/** Piso da folga de continuidade; acima disso escala com o tamanho do buraco. */
const CONTINUITY_SLACK_MS = 5_000

/** Faixa termina no máximo isto antes de `duration_ms` e ainda conta como completa. */
const DEFAULT_END_TOLERANCE_MS = 5_000

/** `completion` acima disto denuncia erro de segmentação, não gosto musical. */
const COMPLETION_SANITY_CEILING = 1.02

/** Por que um segmento terminou. Decide o `outcome` mais do que qualquer limiar. */
type BoundaryReason =
  /** Outra faixa começou logo em seguida. Único caso que pode virar skip. */
  | 'track-change'
  /** O playhead deu a volta: a faixa chegou ao fim e recomeçou. Repeat. */
  | 'wraparound'
  /** Pausa sustentada. Pausar não é pular. */
  | 'pause'
  /** Progresso incompatível com o tempo de parede: parou, ou há buraco de cobertura. */
  | 'discontinuity'
  /** Fim do fluxo sem evidência de término. */
  | 'open'

interface Segment {
  samples: PlayerSample[]
  reason: BoundaryReason
  /** Última amostra do segmento anterior. Limita o quanto `startedAt` pode recuar. */
  prev: PlayerSample | null
  /** Primeira amostra do segmento seguinte. Reconstrói a fronteira de fim. */
  next: PlayerSample | null
}

function ms(a: Date, b: Date): number {
  return a.getTime() - b.getTime()
}

function continuitySlack(wallDelta: number): number {
  return Math.max(CONTINUITY_SLACK_MS, wallDelta * 0.03)
}

/**
 * O par (prev, curr) pertence ao mesmo segmento?
 *
 * Invertido em relação ao ingênuo: um segmento **continua enquanto a evidência de
 * progresso for compatível com reprodução contínua**, e só quebra quando não for.
 * Quebrar por "buraco grande no tempo de parede" trata queda do coletor como
 * comportamento do usuário — e num laptop isso acontece o tempo todo, o que faria
 * `interrupted` virar um log do uptime do coletor em vez da vida de quem escuta.
 */
function boundaryBetween(prev: PlayerSample, curr: PlayerSample): BoundaryReason | null {
  const wallDelta = ms(curr.observedAt, prev.observedAt)

  // Relógio andou para trás (passo do NTP, dual-boot com o RTC em localtime).
  // Cortar aqui produziria DUAS escutas para uma reprodução só — inflando o play
  // count justamente da faixa que por acaso tocava durante o incidente. O
  // progresso é a testemunha confiável: se é a mesma faixa e o playhead avançou, o
  // áudio nunca parou, por mais que o relógio diga o contrário. Segue um segmento
  // só; `classify` se recusa a afirmar como ele terminou.
  if (wallDelta < 0) {
    const advanced = curr.progressMs - prev.progressMs
    return prev.trackId === curr.trackId && advanced > 0 ? null : 'discontinuity'
  }

  if (prev.trackId !== curr.trackId) {
    // Relinking: mesma gravação, id diferente. Se a duração bate e o progresso
    // andou junto com o relógio, ninguém trocou de faixa — o Spotify só
    // reidentificou a mesma. Sem esta guarda, um relink vira skip fabricado.
    const progressDelta = curr.progressMs - prev.progressMs
    const sameRecording =
      prev.durationMs === curr.durationMs &&
      progressDelta > 0 &&
      Math.abs(progressDelta - wallDelta) <= RELINK_SLACK_MS
    return sameRecording ? null : 'track-change'
  }

  const progressDelta = curr.progressMs - prev.progressMs
  const predicted = prev.progressMs + wallDelta

  if (progressDelta < 0) {
    // O playhead recuou. Duas causas muito diferentes: a faixa acabou e recomeçou
    // (repeat), ou a pessoa arrastou para trás.
    //
    // Testar `curr.progressMs < 3000` para detectar recomeço só acerta quando o
    // poll cai nos primeiros 3s — ~15% das vezes. Os outros 85% viram "seek" e
    // cinco execuções seguidas colapsam em uma escuta com completion 4.7,
    // justamente na faixa que a pessoa mais amava naquele dia.
    //
    // O teste que não depende de onde o poll caiu é o desdobramento de fase: se o
    // progresso previsto passou da duração, a faixa provadamente acabou dentro do
    // intervalo, e o valor baixo é uma passada nova.
    const wrapped = predicted >= prev.durationMs - WRAP_SLACK_MS
    if (wrapped && curr.progressMs <= predicted - prev.durationMs + WRAP_SLACK_MS) {
      return 'wraparound'
    }
    // `repeat_state` já está no schema e corrobora de graça.
    if (prev.repeatState === 'track' && prev.progressMs - curr.progressMs > 10_000) {
      return 'wraparound'
    }
    return null // seek para trás: mesma escuta
  }

  // Progresso andou junto com o relógio ⇒ tocou continuamente, **por maior que
  // tenha sido o buraco**. Isto costura queda do coletor, troca de dispositivo e
  // poll atrasado sem inventar interrupção nem duplicar a contagem de plays.
  if (Math.abs(progressDelta - wallDelta) <= continuitySlack(wallDelta)) return null

  // Sobrou tempo de parede sem áudio correspondente: ficou parado no meio.
  const unaccounted = wallDelta - progressDelta
  if (unaccounted > PAUSE_SPLIT_MS) return 'discontinuity'

  // Progresso andou mais que o relógio ⇒ seek para frente. Mesma escuta; o
  // crédito excedente é aparado pelo teto de segmento em `listenedMs`.
  return null
}

/** Quebra o fluxo em segmentos, resolvendo pausa acumulada além do teste par a par. */
function splitSegments(samples: PlayerSample[]): Segment[] {
  const groups: { rows: PlayerSample[]; reason: BoundaryReason }[] = []
  let current: PlayerSample[] = []
  /** Quando a reprodução parou, para medir pausa que atravessa várias amostras. */
  let pausedSince: Date | null = null

  for (let i = 0; i < samples.length; i++) {
    const curr = samples[i]!
    const prev = i > 0 ? samples[i - 1]! : null

    if (prev) {
      let reason = boundaryBetween(prev, curr)

      // Uma pausa longa aparece como muitas amostras de 20s com is_playing=false.
      // Nenhum par isolado estoura o limite, então a pausa precisa ser acumulada —
      // senão um notebook deixado pausado a noite toda vira uma escuta de 8 horas.
      if (!reason && !curr.isPlaying) {
        pausedSince ??= prev.observedAt
        if (ms(curr.observedAt, pausedSince) > PAUSE_SPLIT_MS) reason = 'pause'
      }

      if (reason) {
        groups.push({ rows: current, reason })
        current = []
        pausedSince = null
      }
    }

    if (curr.isPlaying) pausedSince = null
    current.push(curr)
  }
  if (current.length > 0) groups.push({ rows: current, reason: 'open' })

  return groups.map((g, i) => ({
    samples: g.rows,
    reason: g.reason,
    prev: i > 0 ? (groups[i - 1]!.rows.at(-1) ?? null) : null,
    next: i < groups.length - 1 ? (groups[i + 1]!.rows[0] ?? null) : null
  }))
}

interface Boundary {
  startedAt: Date
  endedAt: Date
  /** Posição na faixa em que a reprodução de fato parou, reconstruída. */
  finalProgressMs: number
  /** Áudio ouvido antes da primeira amostra do segmento, quando é comprovável. */
  headCreditMs: number
  /** O relógio andou para trás dentro do segmento: nada aqui pode ser afirmado. */
  clockAnomaly: boolean
  /**
   * `true` quando não houve buraco na observação entre este segmento e o seguinte.
   *
   * É sobre o fluxo de AMOSTRAS, não sobre a reprodução: diz que o coletor estava
   * de pé e amostrando na hora da transição. Só então dá para afirmar como a faixa
   * terminou. Com buraco no meio, "a pessoa pulou" e "o coletor piscou" produzem
   * exatamente o mesmo dado, e o honesto é não afirmar nenhum dos dois.
   */
  streamContinuous: boolean
}

/**
 * Reconstrói início e fim reais a partir das amostras vizinhas.
 *
 * O fim vem da faixa seguinte quando ela existe: `B.observed_at − B.progress_ms` é
 * o instante em que B começou, que é o instante em que A parou. Isso troca uma
 * incerteza de ±20s por ~±1s e conserta de uma vez a classificação e o ponto de skip.
 */
function reconstructBoundary(
  seg: Segment,
  playing: PlayerSample[],
  pollIntervalMs: number
): Boundary {
  const first = playing[0]!
  const last = playing.at(-1)!

  const clockAnomaly = seg.samples.some(
    (s, i) => i > 0 && s.observedAt.getTime() < seg.samples[i - 1]!.observedAt.getTime()
  )

  // ── início ───────────────────────────────────────────────────────────────
  // A faixa começou em algum ponto de (prev.observed_at, first.observed_at].
  // Recuar `first.progress_ms` só é válido dentro dessa janela: recuar 35s através
  // de um buraco de 20s é aritmeticamente impossível e prova entrada no meio da
  // faixa (seek-in), não início. Sem o clamp, escutas se sobrepõem no tempo e a
  // linha do tempo do ARCHIVE (PRD §7.2) deixa de somar.
  const naive = new Date(first.observedAt.getTime() - first.progressMs)
  const floor = seg.prev ? seg.prev.observedAt : null
  // Além de caber na janela, o tempo desde a observação anterior precisa ser
  // EXPLICADO pelo próprio progresso da faixa. Retomar uma faixa em 1:35 depois de
  // 40 minutos sem amostra nenhuma cabe na janela e mesmo assim não prova nada:
  // sobram 38 minutos que ninguém viu. Sem esta segunda condição, o crédito de
  // início inventa 95s de áudio que jamais foi ouvido e a faixa retomada arquiva
  // como escuta completa.
  // Retomada da MESMA faixa, seja de pausa ou de um buraco de cobertura. O
  // progresso de uma faixa só anda tocando, então o avanço desde a última amostra
  // dela foi ouvido — inclusive através de 40 minutos sem amostra nenhuma. É a
  // única evidência disponível de onde a escuta recomeçou, e ignorá-la joga fora
  // até um intervalo de poll de áudio comprovado por poll.
  const resumed =
    seg.prev !== null &&
    seg.prev.trackId === first.trackId &&
    seg.prev.progressMs <= first.progressMs

  // O tempo desde a observação anterior precisa estar EXPLICADO. Duas coisas o
  // explicam: o que faltava da faixa anterior terminar, e o progresso já feito
  // por esta. O que sobrar disso é tempo que ninguém viu.
  //
  // Sem esta conta, começar uma faixa em 1:35 depois de 40 minutos sem amostra
  // "cabe" na janela e credita 95s de áudio que jamais foi ouvido.
  const prevRemaining = seg.prev ? Math.max(0, seg.prev.durationMs - seg.prev.progressMs) : 0
  const explainable = first.progressMs + prevRemaining + CONTINUITY_SLACK_MS
  const startBracketed =
    resumed || (floor !== null
      ? naive.getTime() > floor.getTime() && ms(first.observedAt, floor) <= explainable
      : first.progressMs <= 2 * pollIntervalMs)

  const headCreditMs = resumed
    ? first.progressMs - seg.prev!.progressMs
    : startBracketed
      ? first.progressMs
      : 0
  let startedAt = startBracketed
    ? new Date(first.observedAt.getTime() - headCreditMs)
    : floor !== null && naive.getTime() <= floor.getTime()
      ? floor
      : first.observedAt

  // ── fim ──────────────────────────────────────────────────────────────────
  let finalProgressMs = last.progressMs
  let endedAt = last.observedAt
  let streamContinuous = false

  // A amostra parada logo depois da última tocando diz, de graça e com precisão,
  // onde a reprodução parou: o playhead congela exatamente ali. Sem isto o segmento
  // termina na última amostra tocando e joga fora até um intervalo de poll de áudio
  // que comprovadamente tocou.
  const frozen = seg.samples.slice(seg.samples.indexOf(last) + 1).find((s) => !s.isPlaying)
  if (frozen && frozen.progressMs >= last.progressMs) {
    finalProgressMs = Math.min(frozen.progressMs, last.durationMs)
    endedAt = new Date(last.observedAt.getTime() + (finalProgressMs - last.progressMs))
  }

  if (seg.reason === 'wraparound') {
    streamContinuous = true
    // A faixa provadamente chegou ao fim: foi isso que definiu a fronteira.
    finalProgressMs = last.durationMs
    endedAt = new Date(last.observedAt.getTime() + (last.durationMs - last.progressMs))
  } else if (seg.next && !frozen) {
    // `frozen` presente significa que a reprodução parou DENTRO deste segmento —
    // há prova direta disso. Reconstruir a partir da faixa seguinte por cima de uma
    // amostra parada faria a faixa "continuar tocando" depois de comprovadamente
    // ter parado, e a transição pararia de ser contígua sem ninguém notar.
    const gap = ms(seg.next.observedAt, last.observedAt)

    // A pergunta aqui é sobre OBSERVAÇÃO, não sobre reprodução: o coletor estava
    // amostrando na hora da transição? Se o espaçamento entre amostras é o normal,
    // estava — e o que houve no meio foi reprodução. Se há buraco, o coletor pode
    // ter estado fora do ar, e aí "pulou" e "o coletor piscou" produzem o mesmo
    // dado; o honesto é não afirmar nenhum dos dois. Este é o único ponto em que o
    // tamanho do buraco decide algo — a segmentação segue decidindo por
    // continuidade de progresso, e não por espaçamento.
    streamContinuous = gap <= pollIntervalMs * 2.5

    // Reconstruir exige a próxima amostra TOCANDO: num player pausado,
    // `observed_at − progress_ms` não é o instante em que a faixa começou, é um
    // número sem significado.
    if (streamContinuous && seg.next.isPlaying) {
      const advanced = gap - seg.next.progressMs
      if (advanced >= 0) {
        // `advanced` maior do que faltava não é buraco — é prova de que a faixa
        // passou do próprio fim e ainda sobrou tempo, ou seja, ela COMPLETOU e
        // houve faixa curta não observada no meio. O clamp pela duração resolve.
        // (Tratar esse excedente como buraco transformava um poll atrasado sobre
        // uma faixa que acabou sozinha em `interrupted`.)
        finalProgressMs = Math.min(last.progressMs + advanced, last.durationMs)
        endedAt = new Date(seg.next.observedAt.getTime() - seg.next.progressMs)
      }
      // `advanced` negativo: a faixa seguinte já tocava antes desta parar — foi
      // entrada no meio dela (seek-in). Não dá para reconstruir o fim desta a
      // partir dali, mas a transição foi observada, então ainda dá para dizer que
      // esta faixa foi cortada.
    }
  }

  // Com o relógio invertido, "primeira" e "última" amostra deixam de ser cedo e
  // tarde. Usa os extremos observados para a linha não sair com duração negativa.
  if (clockAnomaly) {
    const times = seg.samples.map((s) => s.observedAt.getTime())
    startedAt = new Date(Math.min(...times))
    endedAt = new Date(Math.max(...times))
  }

  if (endedAt.getTime() < startedAt.getTime()) endedAt = startedAt
  return { startedAt, endedAt, finalProgressMs, headCreditMs, streamContinuous, clockAnomaly }
}

function classify(seg: Segment, b: Boundary, endTol: number): Outcome {
  const rawLast = seg.samples.at(-1)!
  const remaining = rawLast.durationMs - b.finalProgressMs

  // Inversão de relógio é quebra de integridade: a aritmética de tempo do segmento
  // não é confiável, então a linha pode ser suspeita, nunca afirmativa.
  if (b.clockAnomaly) return 'interrupted'

  // Deu a volta ⇒ chegou ao fim. É assim que repeat vira N escutas completas em
  // vez de uma linha esquisita de 15 minutos.
  if (seg.reason === 'wraparound') return 'completed'

  // Sem transição contígua não dá para afirmar que a faixa terminou: o tempo que
  // sobra pode ser faixa não observada ou coletor fora do ar. Só é `completed` se
  // a fronteira foi reconstruída de verdade, ou se a última amostra já estava
  // praticamente no fim.
  if (remaining <= endTol && (b.streamContinuous || seg.reason !== 'track-change')) {
    return 'completed'
  }

  // Só troca de faixa contígua no tempo pode ser skip. Pausa, buraco de cobertura
  // e fim de fluxo são `interrupted` de propósito: sem isso "fechei o notebook"
  // entra na assinatura de skip e a contamina para sempre.
  //
  // `rawLast`, e não a última amostra TOCANDO: filtrar por `isPlaying` antes deixa
  // a checagem verdadeira por construção e nunca protege nada. O caso real que
  // isso deixava passar é o dispositivo que dorme e reporta a última faixa com
  // `is_playing=false` — que virava skip fabricado, o pior erro que este sistema
  // pode cometer.
  if (seg.reason === 'track-change' && rawLast.isPlaying && b.streamContinuous) return 'skipped'

  return 'interrupted'
}

/**
 * Áudio de fato ouvido.
 *
 * Somar apenas os deltas entre amostras observadas perde, em média, um intervalo
 * de poll inteiro por escuta — sempre para baixo — porque ignora o trecho antes da
 * primeira amostra e depois da última. Uma faixa de 3:00 ouvida inteira arquivaria
 * 0.89, uma de 0:40 arquivaria 0.50, e `completion` deixaria de ser comparável
 * entre faixas de durações diferentes: qualquer regra do tipo "completion > 0.8 =
 * gostei" viraria uma ordenação por duração.
 */
function computeListenedMs(seg: Segment, b: Boundary, playing: PlayerSample[]): number {
  // Trechos da LINHA DO TEMPO DA FAIXA que foram ouvidos, unidos no fim.
  //
  // Somar tempo gasto e somar trecho ouvido são contas diferentes, e `completion`
  // precisa ser a segunda: quem repete o mesmo solo oito vezes gasta mais tempo do
  // que a faixa dura, e uma soma de tempo gasto sairia 2.2 — quebrando toda
  // consulta do PRD §6, que assume [0,1]. Aparar em 1.0 também não serve: aí
  // "ouvi a faixa inteira" e "fiquei o tempo dela num pedaço só" viram o mesmo
  // número, e `skipped` com completion 1.0 passa a ser possível.
  //
  // Unindo intervalos, `completion` responde exatamente "quanto desta faixa eu
  // ouvi", fica naturalmente em [0,1] sem teto artificial, e o tempo total
  // continua legível como `ended_at − started_at`.
  const duration = playing[0]!.durationMs
  const heard: [number, number][] = []

  const add = (from: number, to: number): void => {
    const lo = Math.max(0, Math.min(from, duration))
    const hi = Math.max(0, Math.min(to, duration))
    if (hi > lo) heard.push([lo, hi])
  }

  // Tempo de parede acumulado em intervalos nos quais o progresso não andou, com o
  // player tocando. O Spotify Connect reporta a posição de um device remoto em
  // rajadas: o progresso congela num poll e salta no seguinte. Limitar o salto pelo
  // tempo de parede DAQUELE par subestima o trecho em ~37%, e o erro correlaciona
  // com `device_type` — o arquivo passaria a "revelar" que a pessoa termina menos
  // as faixas no celular, que é artefato do instrumento e não comportamento.
  // Carregando o tempo parado para frente, congela-e-salta fecha exato.
  let stalledWall = 0

  for (let i = 1; i < seg.samples.length; i++) {
    const prev = seg.samples[i - 1]!
    const curr = seg.samples[i]!
    // Intervalo iniciado com o player parado não consumiu áudio.
    if (!prev.isPlaying) {
      stalledWall = 0
      continue
    }

    const wallDelta = Math.max(0, ms(curr.observedAt, prev.observedAt))
    const advance = curr.progressMs - prev.progressMs

    if (advance === 0) {
      stalledWall += wallDelta
      continue
    }

    // O áudio termina em `curr.progressMs`; o quanto dele foi ouvido é limitado
    // pelo tempo de parede do intervalo. Isso resolve de uma vez os três casos:
    // reprodução normal (avanço == parede), pausa no meio (avanço < parede) e seek
    // para frente (avanço >> parede, e o trecho saltado não entra). Para seek para
    // trás, o áudio tocou até `curr.progressMs` durante o intervalo — o trecho é
    // creditado de novo, mas a UNIÃO impede que conte duas vezes.
    const budget = wallDelta + stalledWall
    stalledWall = 0
    const span = advance > 0 ? Math.min(advance, budget) : Math.min(budget, curr.progressMs)
    add(curr.progressMs - span, curr.progressMs)
  }

  const first = playing[0]!
  const last = playing.at(-1)!
  // Antes da primeira amostra, quando é comprovável (início ou retomada).
  add(first.progressMs - b.headCreditMs, first.progressMs)
  // Depois da última amostra, até a fronteira reconstruída.
  add(last.progressMs, b.finalProgressMs)

  heard.sort((x, y) => x[0] - y[0])
  let total = 0
  let cursor = -1
  for (const [from, to] of heard) {
    const lo = Math.max(from, cursor)
    if (to > lo) {
      total += to - lo
      cursor = to
    }
  }
  return total
}

export function sessionize(samples: PlayerSample[], opts: SessionizeOptions): Listen[] {
  if (samples.length === 0) return []

  const endTol = opts.endToleranceMs ?? DEFAULT_END_TOLERANCE_MS

  // Ordena por ordem de GRAVAÇÃO (`seq`, que vem do bigserial), não por
  // `observed_at`. Parece equivalente e não é: `observed_at` vem do relógio de
  // parede do coletor, que pode andar para trás (passo do NTP, boot duplo com o
  // RTC em localtime). Ordenar por ele reembaralha as amostras em ordem
  // cronológica plausível e apaga o próprio vestígio do salto — a guarda de
  // `wallDelta < 0` em `boundaryBetween` nunca chega a rodar, e o salto vira uma
  // escuta completa fantasma. Ordenando pela sequência de gravação, a inversão
  // sobrevive na ordem e é detectada como quebra de integridade.
  const ordered = samples.every((s) => s.seq !== undefined)
    ? [...samples].sort((a, b) => a.seq! - b.seq!)
    : [...samples]
  const listens: Listen[] = []

  for (const seg of splitSegments(ordered)) {
    // Segmento sem nenhuma amostra tocando não é escuta: é um player parado sendo
    // reportado. Sem esta regra, uma noite inteira pausado vira uma linha de 8h.
    const playing = seg.samples.filter((s) => s.isPlaying)
    if (playing.length === 0) continue

    // Segmento aberto: a última amostra ainda é a observação mais recente, então a
    // faixa provavelmente continua tocando. Retém para a próxima derivação em vez
    // de classificar no escuro — senão toda faixa em andamento entra como
    // `interrupted` e depois precisa ser corrigida.
    if (seg.reason === 'open') {
      const through = opts.observedThrough
      if (!through) continue
      if (ms(through, seg.samples.at(-1)!.observedAt) < opts.pollIntervalMs) continue
    }

    const b = reconstructBoundary(seg, playing, opts.pollIntervalMs)
    const outcome = classify(seg, b, endTol)
    const listenedMs = computeListenedMs(seg, b, playing)
    const last = playing.at(-1)!
    const completion = last.durationMs > 0 ? listenedMs / last.durationMs : 0

    // Guarda de regressão. O teto em `computeListenedMs` já torna isto
    // inalcançável; se um dia disparar, o teto foi removido e várias passadas
    // estão sendo fundidas num segmento só — que é o erro que fazia repeat virar
    // uma linha com completion 4.7. Melhor descobrir alto e claro aqui do que seis
    // meses depois, olhando um gráfico torto.
    if (completion > COMPLETION_SANITY_CEILING) {
      throw new Error(
        `segmentação inválida: completion ${completion.toFixed(2)} para ${last.trackId} ` +
          `(listened ${listenedMs}ms, duration ${last.durationMs}ms, ` +
          `início ${b.startedAt.toISOString()}, motivo ${seg.reason})`
      )
    }

    listens.push({
      trackId: last.trackId,
      startedAt: b.startedAt,
      endedAt: b.endedAt,
      durationMs: last.durationMs,
      listenedMs,
      completion,
      outcome,
      // Faixa que atravessa dispositivos: fica com o que mais apareceu, não com o
      // primeiro nem com o último.
      deviceType: modal(playing.map((s) => s.deviceType)),
      contextUri: modal(playing.map((s) => s.contextUri))
    })
  }

  return listens
}

function modal<T>(values: (T | null)[]): T | null {
  const counts = new Map<T, number>()
  for (const v of values) {
    if (v === null) continue
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  let best: T | null = null
  let bestCount = 0
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v
      bestCount = c
    }
  }
  return best
}
