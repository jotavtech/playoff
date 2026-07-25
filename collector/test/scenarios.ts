import type { Listen, Outcome, PlayerSample, SessionizeOptions } from '../src/types.js'

/**
 * Cenários com verdade conhecida para o sessionizador.
 *
 * Cada cenário aqui é uma falha concreta levantada na revisão do algoritmo — a
 * lista inteira das 26 críticas virou caso de teste, com linha do tempo e números.
 * A verdade de cada um foi derivada **do comportamento real do player**, não da
 * saída do `sessionize`: se os dois discordarem, o teste falha e quem está errado
 * é a implementação. Nenhuma expectativa aqui pode ser afrouxada para o teste
 * passar; o critério do PRD §10 ("acerta skip em 9 de 10 casos à mão") já é fraco
 * demais porque casos escolhidos à mão são os fáceis.
 *
 * Ponto de partida obrigatório: uma amostra **cerca** uma fronteira, não é a
 * fronteira. Por isso quase todo cenário é escrito com o instante real de início e
 * de fim da faixa, e os polls são derivados dele — nunca o contrário.
 */

/** Intervalo nominal de poll do coletor (PRD §3.1). */
export const POLL_MS = 20_000

/** Meia-noite UTC do dia fictício de referência. Horas ≥ 24 caem no dia seguinte. */
const DAY = Date.UTC(2026, 2, 14)

/** `t('12:00:00')`, `t('12:00:28.500')`, `t('33:00:00')` = 09:00 do dia seguinte. */
export function t(clock: string): Date {
  const m = /^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/.exec(clock)
  if (!m) throw new Error(`relógio inválido: ${clock}`)
  const h = Number(m[1])
  const min = Number(m[2])
  const s = Number(m[3])
  const frac = m[4] ? Number(m[4].padEnd(3, '0')) : 0
  return new Date(DAY + ((h * 60 + min) * 60 + s) * 1000 + frac)
}

/** Deslocamento em ms sobre um instante. Evita aritmética de relógio no cenário. */
export function plus(when: Date, deltaMs: number): Date {
  return new Date(when.getTime() + deltaMs)
}

export interface TrackSpec {
  id: string
  durationMs: number
}

export function track(id: string, durationMs: number): TrackSpec {
  return { id, durationMs }
}

interface SampleSpec {
  at: Date
  track: TrackSpec
  progressMs: number
  isPlaying?: boolean
  deviceType?: string | null
  contextUri?: string | null
  repeatState?: string | null
}

export function sample(spec: SampleSpec): PlayerSample {
  return {
    observedAt: spec.at,
    trackId: spec.track.id,
    trackName: `faixa ${spec.track.id}`,
    artistIds: [`artist-${spec.track.id}`],
    artistNames: [`artista ${spec.track.id}`],
    albumId: `album-${spec.track.id}`,
    durationMs: spec.track.durationMs,
    progressMs: spec.progressMs,
    isPlaying: spec.isPlaying ?? true,
    deviceType: spec.deviceType ?? 'computer',
    contextUri: spec.contextUri ?? 'spotify:playlist:teste',
    shuffle: false,
    repeatState: spec.repeatState ?? 'off'
  }
}

interface PlayRunSpec {
  track: TrackSpec
  /** Instante real em que a faixa começou (progress = 0). Não observado. */
  startedAt: Date
  /** Instante do primeiro poll desta sequência. */
  firstPollAt: Date
  count: number
  stepMs?: number
  deviceType?: string
  repeatState?: string
}

/**
 * Sequência de polls sobre uma faixa tocando, com o progresso **derivado do
 * relógio**. Escrever progressos à mão é como o erro entra no teste: aqui só
 * existem dois números independentes (quando a faixa começou, quando o poll caiu)
 * e o resto é consequência.
 */
export function playRun(spec: PlayRunSpec): PlayerSample[] {
  const step = spec.stepMs ?? POLL_MS
  const out: PlayerSample[] = []
  for (let i = 0; i < spec.count; i++) {
    const at = plus(spec.firstPollAt, i * step)
    const progressMs = at.getTime() - spec.startedAt.getTime()
    if (progressMs < 0 || progressMs > spec.track.durationMs) {
      throw new Error(`playRun saiu da faixa: progress ${progressMs} em ${at.toISOString()}`)
    }
    out.push(
      sample({
        at,
        track: spec.track,
        progressMs,
        deviceType: spec.deviceType ?? 'computer',
        repeatState: spec.repeatState ?? 'off'
      })
    )
  }
  return out
}

interface PausedRunSpec {
  track: TrackSpec
  progressMs: number
  firstPollAt: Date
  count: number
  stepMs?: number
}

/** Player parado reportando o mesmo estado a cada poll. Uma noite inteira cabe aqui. */
export function pausedRun(spec: PausedRunSpec): PlayerSample[] {
  const step = spec.stepMs ?? POLL_MS
  const out: PlayerSample[] = []
  for (let i = 0; i < spec.count; i++) {
    out.push(
      sample({
        at: plus(spec.firstPollAt, i * step),
        track: spec.track,
        progressMs: spec.progressMs,
        isPlaying: false
      })
    )
  }
  return out
}

/** Fim da cobertura = último poll. É o que `collector_poll` diria. */
export function through(samples: PlayerSample[]): Date {
  return samples.at(-1)!.observedAt
}

export function options(observedThrough: Date | null, endToleranceMs?: number): SessionizeOptions {
  const base: SessionizeOptions = { observedThrough, pollIntervalMs: POLL_MS }
  return endToleranceMs === undefined ? base : { ...base, endToleranceMs }
}

/** Uma escuta esperada. `completion` é comparada com tolerância explícita. */
export interface ExpectedListen {
  outcome: Outcome
  completion: number
  /** Tolerância absoluta sobre `completion`. Padrão 0.02. */
  tol?: number
  trackId?: string
  deviceType?: string
}

export interface Scenario {
  /** Nome afirma o comportamento, não o teste: "skip de outro não é completed". */
  name: string
  /** De qual crítica veio, para rastrear. */
  origin: string
  samples: PlayerSample[]
  options: SessionizeOptions
  expected: ExpectedListen[]
  /** Por que a verdade é essa, quando não é óbvio da linha do tempo. */
  why?: string
}

/** Resultado de rodar um cenário: ou saiu a lista, ou `sessionize` lançou. */
export type Run = { ok: true; listens: Listen[] } | { ok: false; error: Error }

// ── cenários ─────────────────────────────────────────────────────────────────

function repeatOne(): Scenario {
  const a = track('A', 180_000)
  // A passada em curso às 12:00:00 termina às 12:00:08; daí em diante cada passada
  // dura exatamente 3:00 e o poll cai sempre no mesmo lugar dela.
  const samples: PlayerSample[] = [
    sample({ at: t('12:00:00'), track: a, progressMs: 172_000, repeatState: 'track' })
  ]
  for (let pass = 0; pass < 5; pass++) {
    samples.push(
      ...playRun({
        track: a,
        startedAt: plus(t('12:00:08'), pass * 180_000),
        firstPollAt: plus(t('12:00:20'), pass * 180_000),
        count: 9,
        repeatState: 'track'
      })
    )
  }
  return {
    name: 'repeat-one rende cinco escutas completas, não uma com completion 4.7',
    origin: 'C1-1 / C2-7a',
    samples,
    options: options(through(samples)),
    expected: [
      // Só os últimos 8s da passada em curso foram observados: a escuta é real, a
      // completion é artefato de entrar no meio. Ver a invariante de coerência.
      { outcome: 'completed', completion: 0.044 },
      { outcome: 'completed', completion: 1.0 },
      { outcome: 'completed', completion: 1.0 },
      { outcome: 'completed', completion: 1.0 },
      { outcome: 'completed', completion: 1.0 }
    ],
    why: 'cinco fronteiras de wraparound observadas; a sexta passada segue tocando e fica retida'
  }
}

function overnightPause(): Scenario {
  const a = track('A', 210_000)
  // 23:00 pausado em 35s; o coletor sobe às 09:00 e vê 8 horas do mesmo estado.
  const samples = pausedRun({
    track: a,
    progressMs: 35_000,
    firstPollAt: t('33:00:00'),
    count: 1441
  })
  return {
    name: 'notebook pausado a noite toda não emite nada',
    origin: 'C1-2',
    samples,
    options: options(through(samples)),
    expected: [],
    why: '1441 amostras idênticas com is_playing=false; ninguém ouviu nada'
  }
}

function endOfQueueIdle(): Scenario {
  const a = track('A', 210_000)
  const samples = pausedRun({ track: a, progressMs: 0, firstPollAt: t('12:00:00'), count: 60 })
  return {
    name: 'fim de fila com progress=0 parado não vira escuta de completion 0',
    origin: 'C1-2 variante / C2-7b',
    samples,
    options: options(through(samples)),
    expected: [],
    why: 'progress 0 com is_playing=false é marcador de parada, nunca nascimento de escuta'
  }
}

function outroSkip(): Scenario {
  const a = track('A', 245_000)
  const b = track('B', 200_000)
  // A começa 11:56:35 e é cortada às 12:00:28, 12s antes do fim natural.
  const samples = [
    ...playRun({ track: a, startedAt: t('11:56:35'), firstPollAt: t('11:56:40'), count: 12 }),
    sample({ at: t('12:00:40'), track: b, progressMs: 12_000 })
  ]
  return {
    name: 'skip de outro não é completed',
    origin: 'C1-3',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'skipped', completion: 0.951, trackId: 'A' }],
    why: 'B em 12000 às 12:00:40 prova que B começou 12:00:28; A tinha 20s pela frente às 12:00:20'
  }
}

function coverageHoleAfterStop(): Scenario {
  const a = track('A', 240_000)
  const d = track('D', 200_000)
  // Usuário para às 12:00:05. Polls de 12:00:20 a 12:40:00 devolvem 204 e não
  // escrevem linha nenhuma. D aparece 40 minutos depois.
  const samples = [
    ...playRun({ track: a, startedAt: t('11:59:00'), firstPollAt: t('11:59:20'), count: 3 }),
    sample({ at: t('12:40:20'), track: d, progressMs: 10_000 })
  ]
  return {
    name: 'buraco de 40 minutos não fabrica escuta completa da faixa anterior',
    origin: 'C1-4 / C2-2',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'interrupted', completion: 0.25, tol: 0.03, trackId: 'A' }],
    why: 'nada prova que A chegou ao fim: 40 minutos sem cobertura comportam qualquer coisa'
  }
}

function collectorDiedMidTrack(): Scenario {
  const a = track('A', 480_000)
  const b = track('B', 200_000)
  const samples = [
    ...playRun({ track: a, startedAt: t('11:58:00'), firstPollAt: t('11:58:20'), count: 6 }),
    ...playRun({ track: a, startedAt: t('11:58:00'), firstPollAt: t('12:03:00'), count: 9 }),
    sample({ at: t('12:06:00'), track: b, progressMs: 0 })
  ]
  return {
    name: 'queda do coletor no meio da faixa continua sendo uma escuta só',
    origin: 'C1-5 / C2-5',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'completed', completion: 1.0, trackId: 'A' }],
    why: 'progresso andou 180s em 180s de relógio: o áudio provadamente não parou no buraco'
  }
}

function openTailHeldBack(): Scenario {
  const x = track('X', 240_000)
  const samples = playRun({
    track: x,
    startedAt: t('13:58:10'),
    firstPollAt: t('13:58:20'),
    count: 5
  })
  return {
    name: 'faixa ainda tocando na borda da janela fica retida em vez de virar interrupted',
    origin: 'C1-6 / C2-11c',
    samples,
    options: options(through(samples)),
    expected: [],
    why: 'a última amostra É a observação mais recente; emitir agora obriga a corrigir depois'
  }
}

function openTailClosedByLaterPoll(): Scenario {
  const x = track('X', 240_000)
  const samples = playRun({
    track: x,
    startedAt: t('13:58:10'),
    firstPollAt: t('13:58:20'),
    count: 5
  })
  return {
    name: 'cauda aberta com poll posterior observado sai como interrupted',
    origin: 'C1-6 controle positivo',
    samples,
    // Houve poll às 14:00:20 e ele não viu a faixa: a reprodução parou de fato.
    options: options(t('14:00:20')),
    expected: [{ outcome: 'interrupted', completion: 0.375, trackId: 'X' }]
  }
}

function rapidSkipsHideTracks(): Scenario {
  const a = track('A', 200_000)
  const c = track('C', 180_000)
  // A é pulada às 12:00:07; B vive 2 segundos e nunca é amostrada; C entra 12:00:09.
  const samples = [
    ...playRun({ track: a, startedAt: t('11:58:02'), firstPollAt: t('11:58:20'), count: 6 }),
    sample({ at: t('12:00:20'), track: c, progressMs: 11_000 })
  ]
  return {
    name: 'faixa rejeitada em 2s some e desloca o ponto de skip da anterior',
    origin: 'C1-7a / C2-10',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'skipped', completion: 0.625, trackId: 'A' }],
    why: 'A foi cortada em 125000; a reconstrução devolve 127000 porque B é invisível'
  }
}

function interludeCompleted(): Scenario {
  const i = track('I', 14_000)
  const n = track('N', 200_000)
  const samples = [
    sample({ at: t('12:00:00'), track: i, progressMs: 6_000 }),
    sample({ at: t('12:00:20'), track: n, progressMs: 12_000 })
  ]
  return {
    name: 'interlúdio de 14s visto uma vez só reporta completion 1.0, não 0.0',
    origin: 'C1-7b / C2-1',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'completed', completion: 1.0, trackId: 'I' }],
    why: 'segmento de uma amostra só não tem par nenhum: sem crédito de cabeça e cauda vira 0.0'
  }
}

function interludeSkipped(): Scenario {
  const i = track('I', 14_000)
  const n = track('N', 200_000)
  const samples = [
    sample({ at: t('12:00:02'), track: i, progressMs: 2_000 }),
    sample({ at: t('12:00:22'), track: n, progressMs: 19_000 })
  ]
  return {
    name: 'faixa mais curta que o intervalo de poll ainda pode ser skip',
    origin: 'C1-7c',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'skipped', completion: 0.214, trackId: 'I' }],
    why: 'com tolerância constante de 25s, nenhuma faixa abaixo de 25s poderia ser skip'
  }
}

function playedInFull(): Scenario {
  const a = track('A', 180_000)
  const b = track('B', 200_000)
  const samples = [
    ...playRun({ track: a, startedAt: t('12:00:00'), firstPollAt: t('12:00:05'), count: 9 }),
    sample({ at: t('12:03:05'), track: b, progressMs: 5_000 })
  ]
  return {
    name: 'faixa ouvida inteira arquiva completion 1.0, não 0.89',
    origin: 'C1-8 / C2-1',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'completed', completion: 1.0, trackId: 'A' }],
    why: 'somar só os pares perde um intervalo de poll por escuta, sempre para baixo'
  }
}

function longPauseSamePlayerAlive(): Scenario {
  const a = track('A', 210_000)
  const b = track('B', 200_000)
  const samples = [
    ...playRun({ track: a, startedAt: t('13:58:25'), firstPollAt: t('13:58:40'), count: 5 }),
    // Pausa às 14:00:10 — o progresso congelado em 105000 prova o instante. O device
    // continua vivo e repete o mesmo corpo por 40 minutos.
    ...pausedRun({ track: a, progressMs: 105_000, firstPollAt: t('14:00:20'), count: 121 }),
    // Retomada às 14:40:25, faixa termina às 14:42:10.
    ...playRun({ track: a, startedAt: t('14:38:40'), firstPollAt: t('14:40:40'), count: 5 }),
    sample({ at: t('14:42:20'), track: b, progressMs: 10_000 })
  ]
  return {
    name: 'pausa de 40 minutos com device vivo não credita o tempo parado',
    origin: 'C1-9 variante 1',
    samples,
    options: options(through(samples)),
    expected: [
      { outcome: 'interrupted', completion: 0.5, trackId: 'A' },
      { outcome: 'completed', completion: 0.5, trackId: 'A' }
    ],
    why: 'ouviu 105s antes da pausa e 105s depois; o resto é player parado'
  }
}

function longPauseDeviceIdle(): Scenario {
  const a = track('A', 210_000)
  const b = track('B', 200_000)
  const samples = [
    ...playRun({ track: a, startedAt: t('13:58:25'), firstPollAt: t('13:58:40'), count: 5 }),
    // Device dorme: 204 de 14:00:20 a 14:40:20, nenhuma linha escrita.
    ...playRun({ track: a, startedAt: t('14:38:40'), firstPollAt: t('14:40:40'), count: 5 }),
    sample({ at: t('14:42:20'), track: b, progressMs: 10_000 })
  ]
  return {
    name: 'pausa longa sem cobertura não vira duas escutas completas da mesma faixa',
    origin: 'C1-9 variante 2',
    samples,
    options: options(through(samples)),
    expected: [
      // Sem linha de poll na pausa, o instante exato dela não é observável: a
      // escuta cobre entre 95s e 105s de áudio.
      { outcome: 'interrupted', completion: 0.476, tol: 0.03, trackId: 'A' },
      // Sem linha de poll na pausa, o instante da retomada também não é observável.
      // O que o coletor sabe é que o playhead saiu de 95s e apareceu em 120s, e
      // progresso só anda tocando — então esses 25s foram ouvidos. A verdade é 105s
      // e a melhor estimativa possível é 115s; a diferença é o preço de não ter
      // cobertura, e é justamente por isso que `collector_poll` existe.
      { outcome: 'completed', completion: 0.5, tol: 0.06, trackId: 'A' }
    ],
    why: 'a faixa tocou uma vez; contar duas passadas completas dobra o play count'
  }
}

function practisingASection(): Scenario {
  const a = track('A', 300_000)
  const b = track('B', 200_000)
  const samples = [
    ...playRun({ track: a, startedAt: t('14:57:40'), firstPollAt: t('14:58:00'), count: 7 })
  ]
  // Oito minutos repetindo um solo: 12 seeks para trás intercalados com avanço normal.
  let progressMs = 140_000
  for (let i = 1; i <= 24; i++) {
    progressMs += i % 2 === 1 ? 20_000 : -18_000
    samples.push(sample({ at: plus(t('15:00:00'), i * POLL_MS), track: a, progressMs }))
  }
  // Depois arrasta para a introdução e escuta de novo.
  samples.push(sample({ at: t('15:08:20'), track: a, progressMs: 1_500 }))
  samples.push(sample({ at: t('15:08:40'), track: a, progressMs: 21_500 }))
  samples.push(sample({ at: t('15:09:00'), track: b, progressMs: 10_000 }))
  return {
    name: 'ensaiar um trecho é uma escuta só, sem estourar o teto de completion',
    origin: 'C1-10 / C2-7c',
    samples,
    options: options(through(samples)),
    // A pessoa passou 11:10 numa faixa de 5:00 — tempo gasto acima da duração. A
    // decisão de projeto é que `completion` responde "quanto da faixa eu percorri"
    // e vive em [0,1], porque é assim que o PRD §5 define a coluna e é o que toda
    // consulta do §6 assume. Tempo gasto acima de uma passada não cabe nela; segue
    // legível como `ended_at − started_at`. O que este caso precisa provar é o
    // resto: seek para trás não zera crédito, e arrastar para a introdução não abre
    // passada nova.
    // 0.607 é o resultado CERTO e o mais informativo possível: repetindo o mesmo
    // solo, a pessoa passou 11:10 na faixa mas percorreu só 61% da linha do tempo
    // dela. Uma soma de tempo gasto diria 2.23 e um teto artificial diria 1.00 —
    // os dois perdem a informação de que a faixa nunca foi ouvida inteira.
    expected: [{ outcome: 'skipped', completion: 0.607, tol: 0.02, trackId: 'A' }],
    why:
      'uma escuta só de ponta a ponta; seek para trás não zera escuta e ' +
      'seek para a introdução não abre passada nova'
  }
}

function seekToTheEnd(): Scenario {
  const a = track('A', 300_000)
  const b = track('B', 200_000)
  const samples = [
    sample({ at: t('16:00:00'), track: a, progressMs: 8_000 }),
    sample({ at: t('16:00:20'), track: a, progressMs: 28_000 }),
    // Arrastou o cursor para 4:40 às 16:00:30.
    sample({ at: t('16:00:40'), track: a, progressMs: 290_000 }),
    sample({ at: t('16:01:00'), track: b, progressMs: 10_000 })
  ]
  return {
    name: 'pular para o fim ouve 58s de 5 minutos e ainda assim termina a faixa',
    origin: 'C1-11',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'completed', completion: 0.193, trackId: 'A' }],
    why: 'outcome diz como terminou, completion diz quanto foi ouvido; um não é proxy do outro'
  }
}

function deviceTransferGap(): Scenario {
  const a = track('A', 240_000)
  const b = track('B', 200_000)
  const samples = [
    ...playRun({
      track: a,
      startedAt: t('16:59:00'),
      firstPollAt: t('16:59:20'),
      count: 3,
      deviceType: 'smartphone'
    }),
    // Desktop leva 80s para acordar; nesse intervalo o áudio andou 3s.
    ...playRun({
      track: a,
      startedAt: t('17:00:17'),
      firstPollAt: t('17:01:20'),
      count: 9,
      deviceType: 'computer'
    }),
    sample({ at: t('17:04:20'), track: b, progressMs: 3_000 })
  ]
  return {
    name: 'troca de dispositivo no meio da faixa é uma escuta só, atribuída ao device modal',
    origin: 'C1-12 variante 1',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'completed', completion: 1.0, trackId: 'A', deviceType: 'computer' }]
  }
}

function connectResumeRewind(): Scenario {
  const a = track('A', 202_500)
  const b = track('B', 200_000)
  const samples = [
    sample({ at: t('18:00:00'), track: a, progressMs: 6_000, deviceType: 'smartphone' }),
    // Connect retoma 3,5s antes do ponto de saída depois de um vão de transferência.
    sample({ at: t('18:00:20'), track: a, progressMs: 2_500, deviceType: 'computer' }),
    ...playRun({
      track: a,
      startedAt: t('17:59:57.500'),
      firstPollAt: t('18:00:40'),
      count: 9,
      deviceType: 'computer'
    }),
    sample({ at: t('18:03:40'), track: b, progressMs: 0 })
  ]
  return {
    name: 'retomada do Connect que recua o playhead não inventa passada nova nem estoura o teto',
    origin: 'C1-12 variante 2',
    samples,
    options: options(through(samples)),
    // O que este caso precisa provar é que a retomada do Connect não abre passada
    // nova (uma escuta, não duas) e não estoura teto nenhum. A cobertura sai
    // conservadora: no intervalo da transferência o playhead anda 40s em 20s de
    // relógio, que é catch-up de reporte e não áudio ouvido, então esse trecho não
    // é creditado. Preferir subestimar a inventar.
    expected: [{ outcome: 'completed', completion: 0.919, tol: 0.02, trackId: 'A' }],
    why: 'uma escuta só através da transferência; o vão de catch-up não vira áudio ouvido'
  }
}

function relinkedTrack(): Scenario {
  const x = track('X', 210_000)
  const y = track('Y', 210_000)
  const z = track('Z', 180_000)
  const samples = [
    ...playRun({ track: x, startedAt: t('17:59:00'), firstPollAt: t('17:59:20'), count: 3 }),
    ...playRun({ track: y, startedAt: t('17:59:00'), firstPollAt: t('18:00:20'), count: 7 }),
    sample({ at: t('18:02:40'), track: z, progressMs: 10_000 })
  ]
  return {
    name: 'relinking troca o id sem trocar a música e não fabrica skip',
    origin: 'C1-13',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'completed', completion: 1.0, trackId: 'Y' }],
    why: 'mesma duração e progresso andando junto com o relógio: é a mesma gravação reidentificada'
  }
}

function jitterWithHiddenInterlude(): Scenario {
  const a = track('A', 200_000)
  const c = track('C', 180_000)
  // A termina naturalmente 12:00:28; um interlúdio de 8s toca sem ser visto; C entra
  // 12:00:36; o poll seguinte atrasa para 12:00:45 por refresh de token lento.
  const samples = [
    ...playRun({ track: a, startedAt: t('11:57:08'), firstPollAt: t('11:57:20'), count: 9 }),
    sample({ at: t('12:00:45'), track: c, progressMs: 9_000 })
  ]
  return {
    name: 'poll atrasado sobre faixa terminada naturalmente não vira skip fabricado',
    origin: 'C1-14 / C2-3b',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'completed', completion: 1.0, trackId: 'A' }],
    why: 'adjacência no fluxo de amostras não é adjacência no fluxo de reprodução'
  }
}

function crossfadeDefaultTolerance(): Scenario {
  const a = track('A', 200_000)
  const b = track('B', 200_000)
  const samples = [
    ...playRun({ track: a, startedAt: t('11:57:02'), firstPollAt: t('11:57:20'), count: 9 }),
    sample({ at: t('12:00:20'), track: b, progressMs: 8_000 })
  ]
  return {
    name: 'crossfade de 12s com tolerância padrão é lido como skip (limite conhecido)',
    origin: 'C1-15',
    samples,
    options: options(through(samples)),
    // Este cenário documenta um LIMITE, não um acerto. B começa 10s antes do fim de
    // A porque o crossfade sobrepõe as duas, não porque houve corte — e do lado de
    // fora as duas coisas são idênticas: a API não expõe o ajuste de crossfade.
    //
    // O padrão de 5s vale para crossfade DESLIGADO, que é o padrão do Spotify, e
    // preserva a detecção de skip de outro — que é o sinal mais valioso do sistema.
    // Adotar 13s por padrão protegeria quem usa crossfade e cegaria todo mundo nos
    // últimos 13s de toda faixa. A saída é a calibragem explícita, que o cenário
    // seguinte exercita: COLLECTOR_END_TOLERANCE_MS = crossfade + 2s.
    //
    // Fixar a expectativa aqui garante que o limite seja uma decisão consciente e
    // que ninguém o mude por acidente sem ver este comentário.
    expected: [{ outcome: 'skipped', completion: 0.95, trackId: 'A' }],
    why: 'sem calibrar a tolerância, crossfade e corte real são indistinguíveis'
  }
}

function crossfadeCalibratedTolerance(): Scenario {
  const base = crossfadeDefaultTolerance()
  return {
    ...base,
    name: 'crossfade com endToleranceMs calibrado volta a ser completed',
    origin: 'C1-15 mitigação',
    expected: [{ outcome: 'completed', completion: 0.95, trackId: 'A' }],
    options: options(through(base.samples), 13_000)
  }
}

function fullTrackOffPhase(): Scenario {
  const a = track('A', 210_000)
  const b = track('B', 200_000)
  // Fase de 8,2s: a que produz 0.857 quando só os pares entre amostras são somados.
  const samples = [
    ...playRun({ track: a, startedAt: t('12:00:00'), firstPollAt: t('12:00:08.200'), count: 11 }),
    // A termina 12:03:30; o poll seguinte já pega B com 18,2s andados.
    sample({ at: t('12:03:48.200'), track: b, progressMs: 18_200 })
  ]
  return {
    name: 'faixa de 3:30 ouvida inteira fora de fase ainda arquiva 1.0',
    origin: 'C2-1',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'completed', completion: 1.0, trackId: 'A' }],
    why: 'o viés de um intervalo de poll por escuta escala com 1/duração e mata a comparabilidade'
  }
}

function coverageHoleBetweenTracks(): Scenario {
  const a = track('A', 240_000)
  const b = track('B', 240_000)
  // Quatro horas sem linha nenhuma: suspensão, unit caída, podcast ou 204 — os
  // quatro produzem exatamente o mesmo artefato.
  const samples = [
    ...playRun({ track: a, startedAt: t('13:59:30'), firstPollAt: t('13:59:50'), count: 2 }),
    sample({ at: t('18:00:00'), track: b, progressMs: 150_000 })
  ]
  return {
    name: 'buraco de quatro horas não deixa a faixa anterior sair como completed',
    origin: 'C2-2',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'interrupted', completion: 0.167, tol: 0.03, trackId: 'A' }],
    why: 'sem linha de poll no intervalo, o fim de A não foi observado e não pode ser afirmado'
  }
}

function blindWindowOutroSkip(): Scenario {
  const a = track('A', 220_000)
  const b = track('B', 200_000)
  // Corte aos 3:22 de uma faixa de 3:40 — dentro dos últimos 25s, a faixa cega da
  // regra por constante.
  const samples = [
    ...playRun({ track: a, startedAt: t('11:56:40'), firstPollAt: t('11:57:00'), count: 10 }),
    sample({ at: t('12:00:20'), track: b, progressMs: 18_000 })
  ]
  return {
    name: 'skip nos últimos 18s continua sendo skip',
    origin: 'C2-3a',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'skipped', completion: 0.918, trackId: 'A' }],
    why: 'os últimos segundos de toda faixa são exatamente onde mora "já ouvi o bastante"'
  }
}

function twoLostPolls(): Scenario {
  const a = track('A', 200_000)
  const b = track('B', 200_000)
  const samples = [
    ...playRun({ track: a, startedAt: t('11:59:20'), firstPollAt: t('11:59:40'), count: 2 }),
    ...playRun({ track: a, startedAt: t('11:59:20'), firstPollAt: t('12:01:00'), count: 5 }),
    sample({ at: t('12:02:40'), track: b, progressMs: 0 })
  ]
  return {
    name: 'dois polls perdidos não viram interrupted mais play duplicado',
    origin: 'C2-5',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'completed', completion: 1.0, trackId: 'A' }],
    why: 'a 2% de falha por poll isto dispara ~52 vezes por mês e infla o play count'
  }
}

function pausedTailHeldBack(): Scenario {
  const x = track('X', 240_000)
  const samples = [
    ...playRun({ track: x, startedAt: t('13:58:00'), firstPollAt: t('13:58:20'), count: 5 }),
    sample({ at: t('14:00:00'), track: x, progressMs: 110_000, isPlaying: false })
  ]
  return {
    name: 'faixa pausada na borda da janela também fica retida',
    origin: 'C2-6',
    samples,
    options: options(through(samples)),
    expected: [],
    why: 'emitir como interrupted agora obriga a apagar a linha na janela seguinte'
  }
}

function idleDeviceZeroProgress(): Scenario {
  const a = track('A', 200_000)
  const b = track('B', 200_000)
  const samples = [
    ...playRun({ track: a, startedAt: t('11:58:00'), firstPollAt: t('11:58:20'), count: 6 }),
    // Device ocioso devolve a última faixa com progress 0 e is_playing=false.
    sample({ at: t('12:00:20'), track: a, progressMs: 0, isPlaying: false }),
    sample({ at: t('12:00:40'), track: b, progressMs: 10_000 })
  ]
  return {
    name: 'device ocioso com progress 0 não transforma a faixa anterior em skip',
    origin: 'C2-7b',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'interrupted', completion: 0.6, tol: 0.05, trackId: 'A' }],
    why: 'houve amostra parada entre as duas faixas: a troca não é contígua e não é skip'
  }
}

function clockStepBackwards(): Scenario {
  const a = track('A', 200_000)
  // chronyd recua o relógio 37 minutos; a faixa nunca parou de tocar.
  const samples = [
    sample({ at: t('15:20:00'), track: a, progressMs: 60_000 }),
    sample({ at: t('15:20:20'), track: a, progressMs: 80_000 }),
    sample({ at: t('14:43:00'), track: a, progressMs: 100_000 }),
    sample({ at: t('14:43:20'), track: a, progressMs: 120_000 })
  ]
  return {
    name: 'relógio andando para trás não vira wraparound nem passada completa',
    origin: 'C2-8a',
    samples,
    options: options(t('15:20:20')),
    // O coletor entrou com a faixa já em 60s e nunca observou o começo dela, então
    // credita só o que viu. O intervalo que atravessa o salto do relógio também não
    // entra: sem tempo de parede confiável não dá para dizer quanto áudio correu
    // ali. Sobram 40s dos 100s reais. Creditar o resto seria inventar. O que este
    // caso precisa provar é que a inversão não vira wraparound, não duplica o play
    // count e não sai afirmativa.
    expected: [{ outcome: 'interrupted', completion: 0.2, tol: 0.03, trackId: 'A' }],
    why: 'inversão de tempo é quebra de integridade: a linha pode ser suspeita, nunca afirmativa'
  }
}

function suspendForwardJump(): Scenario {
  const a = track('A', 200_000)
  const samples = [
    ...playRun({ track: a, startedAt: t('11:59:00'), firstPollAt: t('11:59:20'), count: 3 }),
    // Máquina suspende; ao voltar, 4 horas depois, o player está no mesmo ponto.
    sample({ at: t('16:00:00'), track: a, progressMs: 60_000 })
  ]
  return {
    name: 'suspensão de quatro horas não completa a faixa que estava tocando',
    origin: 'C2-8b',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'interrupted', completion: 0.3, trackId: 'A' }],
    why: 'progresso parado contra 4h de relógio prova que o áudio não tocou no intervalo'
  }
}

function connectFreezeThenJump(): Scenario {
  const a = track('A', 200_000)
  const b = track('B', 200_000)
  const samples = [
    ...playRun({ track: a, startedAt: t('11:59:00'), firstPollAt: t('11:59:20'), count: 3 }),
    // Device remoto não reportou posição: progresso congela e salta no poll seguinte.
    sample({ at: t('12:00:20'), track: a, progressMs: 60_000 }),
    ...playRun({ track: a, startedAt: t('11:59:00'), firstPollAt: t('12:00:40'), count: 5 }),
    sample({ at: t('12:02:20'), track: b, progressMs: 0 })
  ]
  return {
    name: 'progresso congela-e-salta no Connect não subestima a escuta em 37%',
    origin: 'C2-9',
    samples,
    options: options(through(samples)),
    expected: [{ outcome: 'completed', completion: 1.0, trackId: 'A' }],
    why: 'aparar por par correlaciona o erro com device_type e inventa "termino menos no celular"'
  }
}

function playlistHunting(): Scenario {
  const a = track('A', 200_000)
  const z = track('Z', 180_000)
  const w = track('W', 200_000)
  // A pulada em 12:00:04; X vive 4s, Y vive 8s (invisíveis); Z entra 12:00:16 e é
  // pulada em 12s; W fica.
  const samples = [
    ...playRun({ track: a, startedAt: t('11:58:20'), firstPollAt: t('11:58:40'), count: 5 }),
    sample({ at: t('12:00:20'), track: z, progressMs: 4_000 }),
    sample({ at: t('12:00:40'), track: w, progressMs: 12_000 })
  ]
  return {
    name: 'caça por playlist registra dois dos três skips e nenhum a mais',
    origin: 'C2-10 / C1-7a',
    samples,
    options: options(through(samples)),
    expected: [
      { outcome: 'skipped', completion: 0.58, trackId: 'A' },
      { outcome: 'skipped', completion: 0.067, trackId: 'Z' }
    ],
    why:
      'A foi cortada em 104000 e o arquivo registra 116000: X e Y são invisíveis e o ' +
      'teto de 3 skips/min é do instrumento, não da pessoa'
  }
}

function scrubIntoNextTrack(): Scenario {
  const a = track('A', 200_000)
  const b = track('B', 240_000)
  const c = track('C', 200_000)
  const samples = [
    ...playRun({ track: a, startedAt: t('13:56:38'), firstPollAt: t('13:56:50'), count: 10 }),
    // Entrou em B já no refrão: 35s de progresso num buraco de 20s é impossível.
    sample({ at: t('14:00:10'), track: b, progressMs: 35_000 }),
    sample({ at: t('14:00:30'), track: b, progressMs: 55_000 }),
    sample({ at: t('14:00:50'), track: c, progressMs: 5_000 })
  ]
  return {
    name: 'entrada no meio da faixa seguinte não sobrepõe as duas escutas',
    origin: 'C2-11a',
    samples,
    options: options(through(samples)),
    expected: [
      { outcome: 'skipped', completion: 0.96, trackId: 'A' },
      { outcome: 'skipped', completion: 0.146, trackId: 'B' }
    ],
    why: 'recuar 35s através de um buraco de 20s é aritmeticamente impossível: é seek-in'
  }
}

export const scenarios: Scenario[] = [
  repeatOne(),
  overnightPause(),
  endOfQueueIdle(),
  outroSkip(),
  coverageHoleAfterStop(),
  collectorDiedMidTrack(),
  openTailHeldBack(),
  openTailClosedByLaterPoll(),
  rapidSkipsHideTracks(),
  interludeCompleted(),
  interludeSkipped(),
  playedInFull(),
  longPauseSamePlayerAlive(),
  longPauseDeviceIdle(),
  practisingASection(),
  seekToTheEnd(),
  deviceTransferGap(),
  connectResumeRewind(),
  relinkedTrack(),
  jitterWithHiddenInterlude(),
  crossfadeDefaultTolerance(),
  crossfadeCalibratedTolerance(),
  fullTrackOffPhase(),
  coverageHoleBetweenTracks(),
  blindWindowOutroSkip(),
  twoLostPolls(),
  pausedTailHeldBack(),
  idleDeviceZeroProgress(),
  clockStepBackwards(),
  suspendForwardJump(),
  connectFreezeThenJump(),
  playlistHunting(),
  scrubIntoNextTrack()
]

// ── varredura de fase ────────────────────────────────────────────────────────
//
// O amostrador é travado em fase: para uma faixa cuja duração é próxima de um
// múltiplo do intervalo de poll, o erro é uma CONSTANTE, não ruído. Um teste com
// fase fixa passa enquanto o algoritmo está sistematicamente errado — e pior, a
// constante tem alta repetibilidade aparente, que é exatamente o que a "assinatura
// de skip" do PRD §6 vai ler como comportamento estável da pessoa.

/** Passos da varredura sobre [0, 20s). */
export const SWEEP_STEPS = 40

export interface SweepCase {
  name: string
  phaseMs: number
  durationMs: number
  samples: PlayerSample[]
  options: SessionizeOptions
  expectedOutcome: Outcome
  minCompletion: number
  maxCompletion: number
}

/**
 * Faixa que começa em `12:00:00` e é interrompida (ou termina) em `cutAtMs`, com os
 * polls caindo em `phaseMs + k*20s`. A faixa seguinte entra no mesmo instante do
 * corte, então a fronteira real é conhecida com precisão de milissegundo.
 */
function sweepSamples(durationMs: number, cutAtMs: number, phaseMs: number): PlayerSample[] {
  const a = track('SWEEP-A', durationMs)
  const b = track('SWEEP-B', 240_000)
  const t0 = t('12:00:00')
  const cut = t0.getTime() + cutAtMs
  const out: PlayerSample[] = []
  for (let k = 0; ; k++) {
    const at = plus(t0, phaseMs + k * POLL_MS)
    if (at.getTime() >= cut + 2 * POLL_MS) break
    out.push(
      at.getTime() < cut
        ? sample({ at, track: a, progressMs: at.getTime() - t0.getTime() })
        : sample({ at, track: b, progressMs: at.getTime() - cut })
    )
  }
  return out
}

function sweepCase(
  label: string,
  durationMs: number,
  cutAtMs: number,
  phaseMs: number,
  expectedOutcome: Outcome,
  minCompletion: number,
  maxCompletion: number
): SweepCase {
  const samples = sweepSamples(durationMs, cutAtMs, phaseMs)
  return {
    name: `${label} @ fase ${phaseMs}ms`,
    phaseMs,
    durationMs,
    samples,
    options: options(through(samples)),
    expectedOutcome,
    minCompletion,
    maxCompletion
  }
}

export function phaseSweep(): SweepCase[] {
  const step = POLL_MS / SWEEP_STEPS
  const out: SweepCase[] = []
  for (let i = 0; i < SWEEP_STEPS; i++) {
    const phase = i * step

    // Faixa ouvida inteira: completion tem que fechar em 1.0 em qualquer fase.
    out.push(sweepCase('faixa inteira', 213_000, 213_000, phase, 'completed', 0.95, 1.02))

    // Skip de outro: 12s antes do fim, dentro da faixa cega de uma tolerância fixa.
    out.push(sweepCase('skip de outro', 213_000, 201_000, phase, 'skipped', 0.92, 0.97))

    // Skip no meio: o ponto de corte não pode depender de onde o poll caiu.
    out.push(sweepCase('skip no meio', 213_000, 85_000, phase, 'skipped', 0.37, 0.43))

    // Mesmo abandono real (2:41) em três durações: uma múltipla exata do intervalo
    // de poll e duas em torno dela, que é onde o aliasing produz a rampa linear.
    for (const durationMs of [200_000, 197_500, 203_000]) {
      const expected = 161_000 / durationMs
      out.push(
        sweepCase(
          `abandono em 2:41 de faixa ${durationMs}ms`,
          durationMs,
          161_000,
          phase,
          'skipped',
          expected - 0.02,
          expected + 0.02
        )
      )
    }
  }
  return out
}
