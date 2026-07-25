/**
 * Contratos compartilhados do coletor.
 *
 * Regra: `PlayerSample` é o que o coletor observou (fonte da verdade, append-only).
 * `Listen` é derivado — cache reconstruível. Nunca o contrário.
 * Ver docs/PRD.md §5.
 */

/**
 * Como um listen terminou.
 *
 * - `completed`   — a faixa chegou ao fim.
 * - `skipped`     — o usuário trocou de faixa antes do fim. **Este é o sinal que o
 *                   projeto existe para capturar** (PRD §3.1). Só é atribuído quando
 *                   há evidência positiva de troca deliberada.
 * - `interrupted` — a reprodução parou sem que outra faixa começasse: pausa longa,
 *                   máquina desligada, coletor fora do ar. Deliberadamente **não** é
 *                   skip, para não poluir a assinatura de skip com "fechei o notebook".
 */
export type Outcome = 'completed' | 'skipped' | 'interrupted'

/** Uma amostra do player num instante. Uma linha de `play_event`. */
export interface PlayerSample {
  /**
   * Ordem de gravação (`play_event.id`). Ausente em amostras recém-observadas,
   * que ainda não passaram pelo banco.
   *
   * Existe porque `observedAt` é relógio de parede e pode andar para trás; a
   * sequência de gravação não pode. Ver a ordenação em `sessionize`.
   */
  seq?: number
  observedAt: Date
  trackId: string
  trackName: string
  artistIds: string[]
  artistNames: string[]
  albumId: string | null
  durationMs: number
  progressMs: number
  isPlaying: boolean
  deviceType: string | null
  contextUri: string | null
  shuffle: boolean | null
  repeatState: string | null
}

/** Uma escuta derivada. Uma linha de `listen`. */
export interface Listen {
  trackId: string
  startedAt: Date
  endedAt: Date
  durationMs: number
  /** Quanto de áudio foi de fato ouvido, descontando pausa e seek. */
  listenedMs: number
  /** `listenedMs / durationMs`. */
  completion: number
  outcome: Outcome
  deviceType: string | null
  contextUri: string | null
}

/** Parâmetros da derivação. Injetados para manter `sessionize` pura e testável. */
export interface SessionizeOptions {
  /**
   * Instante do poll mais recente de **qualquer** tipo (de `collector_poll`).
   *
   * Decide se o último segmento já terminou, sem consultar relógio nenhum: se
   * observamos algo depois da última amostra da faixa, ela acabou; se a última
   * amostra É a observação mais recente, ainda está tocando e o segmento fica
   * retido para a próxima derivação.
   *
   * Usar `Date.now()` aqui acoplaria a derivação (que roda na Vercel) ao relógio
   * do coletor (que roda local) — e um skew de 30s bastaria para emitir uma faixa
   * ainda tocando como `interrupted`.
   *
   * `null` = sem informação de cobertura: o último segmento nunca é emitido.
   */
  observedThrough: Date | null
  /** Intervalo nominal de poll. Só usado onde não há medida melhor disponível. */
  pollIntervalMs: number
  /**
   * Quanto a faixa pode terminar antes de `duration_ms` e ainda contar como
   * completa. Absorve fade-out e, principalmente, **crossfade**: o Spotify permite
   * até 12s e não expõe o ajuste pela API. Com crossfade ligado, toda transição
   * natural termina N segundos antes do fim — e uma tolerância apertada
   * transformaria *toda* transição do arquivo em skip, que é um erro pior do que
   * o que ele corrige. Padrão conservador; suba para ~13000 se usar crossfade.
   */
  endToleranceMs?: number
}

/**
 * O que o Spotify devolveu num poll, normalizado.
 *
 * `kind` separa os casos que não são faixa tocando — cada um exige tratamento
 * diferente e nenhum deles pode virar `play_event`.
 */
export type PollResult =
  /** Uma faixa do catálogo Spotify, com id. Único caso que vira `play_event`. */
  | { kind: 'track'; sample: PlayerSample }
  /** 204/`{}` — nenhum player ativo. Silêncio observado, não é ausência de dado. */
  | { kind: 'idle' }
  /** Tocando algo que não é faixa de catálogo: arquivo local, episódio, anúncio. */
  | { kind: 'unsupported'; reason: string }
  /** 429. Respeitar `retryAfterMs` antes do próximo poll. */
  | { kind: 'rate-limited'; retryAfterMs: number }
  /** Falha transitória — logar e tentar de novo no próximo tick. */
  | { kind: 'error'; status: number | null; message: string }

/** Tokens do Spotify. `refreshToken` só vem preenchido quando o Spotify o rotaciona. */
export interface TokenSet {
  accessToken: string
  expiresAt: Date
  refreshToken: string | null
}
