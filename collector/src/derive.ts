import type pg from 'pg'

import {
  clearListens,
  getLastListenEnd,
  getLatestPollAt,
  loadSamples,
  upsertListens
} from './db.js'
import { log } from './log.js'
import { sessionize } from './sessionize.js'

/**
 * Quanto a derivação incremental relê para trás.
 *
 * Um segmento pode ter começado antes da borda da janela. Reler só a partir da
 * borda decapitaria essa escuta e emitiria uma segunda linha para a mesma
 * reprodução — com `started_at` diferente, então nem o upsert desfaz. E o pior:
 * a divisão é determinística, então re-rodar reproduz o mesmo erro e a promessa
 * de "cache reconstruível" do PRD §5 deixa de ser verdade.
 *
 * Seis horas cobre com folga qualquer faixa mais uma pausa longa. É barato: o
 * arquivo inteiro de seis meses cabe em memória.
 */
const LOOKBACK_MS = 6 * 60 * 60 * 1000

export interface DeriveOptions {
  pool: pg.Pool
  pollIntervalMs: number
  /** Apaga `listen` e recalcula tudo. O "apaga e recalcula" do PRD §5. */
  rebuild?: boolean
  endToleranceMs?: number
}

export interface DeriveResult {
  samplesRead: number
  listensWritten: number
  from: Date | null
}

export async function derive(opts: DeriveOptions): Promise<DeriveResult> {
  const { pool, pollIntervalMs, rebuild = false } = opts

  const from = rebuild ? null : await computeLookbackStart(pool)
  const [samples, observedThrough] = await Promise.all([
    loadSamples(pool, from, null),
    getLatestPollAt(pool)
  ])

  if (samples.length === 0) {
    log.info('derivação: nenhuma amostra na janela', { from })
    return { samplesRead: 0, listensWritten: 0, from }
  }

  const listens = sessionize(samples, {
    observedThrough,
    pollIntervalMs,
    ...(opts.endToleranceMs !== undefined ? { endToleranceMs: opts.endToleranceMs } : {})
  })

  let written: number
  if (rebuild) {
    // `delete` e não `truncate`: dentro de uma transação o MVCC deixa o site
    // continuar lendo as linhas antigas até o commit. `truncate` pega lock
    // exclusivo e faria o ARCHIVE travar no meio da reconstrução.
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query('delete from listen')
      await client.query('commit')
    } catch (err) {
      await client.query('rollback')
      throw err
    } finally {
      client.release()
    }
    written = await upsertListens(pool, listens)
  } else {
    written = await upsertListens(pool, listens)
  }

  log.info('derivação concluída', {
    from,
    samplesRead: samples.length,
    listens: listens.length,
    written,
    rebuild
  })

  return { samplesRead: samples.length, listensWritten: written, from }
}

async function computeLookbackStart(pool: pg.Pool): Promise<Date | null> {
  const lastEnd = await getLastListenEnd(pool)
  if (!lastEnd) return null
  return new Date(lastEnd.getTime() - LOOKBACK_MS)
}

/** Reexportado para o CLI conseguir zerar o cache sem falar SQL. */
export { clearListens }
