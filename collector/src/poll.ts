import { hostname } from 'node:os'
import type pg from 'pg'

import { log } from './log.js'
import {
  insertPlayEvent,
  insertPoll,
  startRun,
  stopRun,
  tickRun
} from './db.js'
import { ReauthorizationRequiredError } from './spotify.js'
import type { PollResult } from './types.js'

/**
 * O laço de coleta.
 *
 * Só depende de uma fonte capaz de devolver o estado do player, e não da classe
 * concreta do Spotify — o que mantém o laço testável sem rede.
 */
export interface PlayerSource {
  getPlayerState(): Promise<PollResult>
}

export interface PollLoopOptions {
  pool: pg.Pool
  source: PlayerSource
  pollIntervalMs: number
  /** Encerra o laço. */
  signal: AbortSignal
  /** Chamado quando o refresh token morreu: nenhum retry resolve. */
  onFatal?: (err: Error) => void
}

/**
 * Amplitude do jitter aplicado ao intervalo, como fração.
 *
 * 0.15 sobre 20s dá [17s, 23s].
 *
 * Isto **não** é para aliviar a API — é para a validade da assinatura de skip.
 * Um amostrador travado numa grade fixa produz erro *estruturado* em vez de ruído:
 * para uma faixa cuja duração é próxima de um múltiplo do intervalo, o ponto de
 * abandono registrado sai idêntico em toda execução (desvio padrão 0.00s, errado
 * por até 20s), e para outras durações ele caminha numa rampa linear limpa. O
 * resultado é um artefato com alta repetibilidade aparente — exatamente o formato
 * de "existe faixa que eu sempre pulo no mesmo ponto" (PRD §6). O instrumento
 * fabricaria a descoberta que o projeto existe para fazer.
 *
 * O jitter não reduz o viés (a reconstrução de fronteira em sessionize.ts faz
 * isso); ele converte o padrão falso em ruído honesto, que se dilui entre
 * repetições. Mesma taxa média, mesmo custo de API.
 *
 * Precisa ser decidido antes de o dado acumular: misturar um regime travado com um
 * regime com jitter no mesmo arquivo deixa o artefato em metade dos dados, sem
 * como saber qual metade.
 */
const JITTER_FRACTION = 0.15

function jitteredDelay(baseMs: number): number {
  const spread = baseMs * JITTER_FRACTION
  return Math.round(baseMs - spread + Math.random() * spread * 2)
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
    function done(): void {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
  })
}

export async function runPollLoop(opts: PollLoopOptions): Promise<void> {
  const { pool, source, pollIntervalMs, signal } = opts

  const runId = await startRun(pool, hostname(), process.pid)
  log.info('coletor de pé', { runId, pollIntervalMs, pid: process.pid })

  let stopReason = 'sinal de parada'

  try {
    while (!signal.aborted) {
      // O período é medido a partir do INÍCIO do poll. Medir a partir do fim
      // somaria o round-trip a cada volta e o intervalo real derivaria para
      // 20s + RTT, o que é justamente a resolução que o PRD §3.1 está comprando.
      const startedAt = Date.now()
      let nextDelay = jitteredDelay(pollIntervalMs)

      try {
        const result = await source.getPlayerState()
        const observedAt = new Date(startedAt)
        const rttMs = Date.now() - startedAt

        await recordPoll(pool, observedAt, rttMs, result)
        await tickRun(pool, runId, result.kind === 'track')

        if (result.kind === 'rate-limited') {
          // Respeitar o Retry-After não é cortesia: insistir dentro da janela
          // estende a punição e transforma um contratempo em buraco de cobertura.
          nextDelay = Math.max(nextDelay, result.retryAfterMs)
          log.warn('rate limited pelo Spotify', { retryAfterMs: result.retryAfterMs })
        }
      } catch (err) {
        const error = err as Error
        // Refresh token expirado ou revogado. Desde 2026-07-20 todo refresh token
        // morre em 6 meses, e nenhum retry conserta — insistir em silêncio é a
        // forma mais provável de perder meses de coleta sem perceber.
        // `instanceof` E o nome: o nome sobrevive a uma classe duplicada por
        // resolução de módulo, o `instanceof` sobrevive a uma renomeação. Errar
        // este ramo significa entrar em laço de retry contra uma credencial morta
        // enquanto cada dia de escuta é perdido em silêncio (PRD §3).
        if (
          error instanceof ReauthorizationRequiredError ||
          error.name === 'ReauthorizationRequiredError'
        ) {
          stopReason = 'reautorização necessária'
          log.error(
            'PARADO: o refresh token expirou ou foi revogado. ' +
              'Rode `npm run authorize` no coletor e atualize COLLECTOR_SPOTIFY_REFRESH_TOKEN. ' +
              'Nenhum dado é coletado até lá.',
            { err: error }
          )
          opts.onFatal?.(error)
          return
        }

        // Falha transitória: registrar como buraco observado e seguir. Derrubar o
        // processo por um 5xx trocaria um poll perdido por um restart inteiro.
        log.warn('poll falhou', { err: error })
        await recordPoll(pool, new Date(startedAt), null, {
          kind: 'error',
          status: null,
          message: error.message
        }).catch((dbErr) => log.error('não consegui registrar o poll com falha', { err: dbErr }))
      }

      const elapsed = Date.now() - startedAt
      await sleep(Math.max(0, nextDelay - elapsed), signal)
    }
  } finally {
    await stopRun(pool, runId, stopReason).catch(() => {})
    log.info('coletor parado', { runId, stopReason })
  }
}

/**
 * Grava o que este poll observou.
 *
 * A linha em `collector_poll` sai **sempre**, qualquer que seja o resultado. É ela
 * que separa "nada tocou" de "o coletor estava fora do ar" — sem isso, as métricas
 * de taxa do PRD §6 ficam sem denominador e um buraco de cobertura é idêntico a um
 * abandono real.
 */
async function recordPoll(
  pool: pg.Pool,
  observedAt: Date,
  rttMs: number | null,
  result: PollResult
): Promise<void> {
  const detail =
    result.kind === 'unsupported'
      ? result.reason
      : result.kind === 'error'
        ? result.message
        : null
  const status = result.kind === 'error' ? result.status : null

  await insertPoll(pool, {
    observedAt,
    kind: result.kind,
    httpStatus: status,
    rttMs,
    detail
  })

  if (result.kind === 'track') {
    // Mesmo observedAt do poll, que é a chave de junção entre as duas tabelas.
    await insertPlayEvent(pool, { ...result.sample, observedAt })
  }
}
