import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

import { log } from './log.js'
import type { Listen, PlayerSample, PollResult } from './types.js'

const { Client, Pool } = pg

/**
 * `timestamptz` volta como `Date` por padrão, mas `int8` (bigserial, count(*)) volta
 * como string para não perder precisão além de 2^53. Os contadores deste schema não
 * chegam perto disso, então converter para number aqui evita string vazando em
 * aritmética silenciosamente.
 */
pg.types.setTypeParser(pg.types.builtins.INT8, (value: string) => Number.parseInt(value, 10))

/**
 * Chave do advisory lock. Garante que só um coletor escreva por vez — é a defesa
 * primária do critério "não duplica eventos" (PRD §10). Duas instâncias competindo
 * (um systemd restart que se sobrepõe, ou um `npm start` manual esquecido) é o modo
 * de falha realista, não a colisão de milissegundo.
 */
const COLLECTOR_LOCK_KEY = 0x504c4159 // "PLAY"

/** Sobe até achar a raiz do repo (a pasta que contém `db/migrations`). */
function findMigrationsDir(): string {
  let dir = dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, 'db', 'migrations')
    if (existsSync(candidate)) return candidate
    const parent = resolve(dir, '..')
    if (parent === dir) break
    dir = parent
  }
  throw new Error('Não encontrei db/migrations subindo a partir do coletor')
}

export function createPool(databaseUrl: string): pg.Pool {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 4,
    // O coletor roda por meses. Um socket morto silenciosamente (NAT, suspend do
    // laptop) é o modo de falha esperado, não a exceção.
    keepAlive: true,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 60_000
  })
  pool.on('error', (err) => log.error('erro ocioso no pool do postgres', { err }))
  return pool
}

// ── migrations ──────────────────────────────────────────────────────────────

export async function runMigrations(pool: pg.Pool): Promise<string[]> {
  await pool.query(`
    create table if not exists schema_migration (
      name       text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  const dir = findMigrationsDir()
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const { rows } = await pool.query<{ name: string }>('select name from schema_migration')
  const applied = new Set(rows.map((r) => r.name))
  const ran: string[] = []

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = readFileSync(join(dir, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query(sql)
      await client.query('insert into schema_migration (name) values ($1)', [file])
      await client.query('commit')
      ran.push(file)
      log.info('migração aplicada', { file })
    } catch (err) {
      await client.query('rollback')
      throw new Error(`migração ${file} falhou: ${(err as Error).message}`, { cause: err })
    } finally {
      client.release()
    }
  }
  return ran
}

// ── advisory lock ───────────────────────────────────────────────────────────

/**
 * Trava de instância única, presa a uma conexão dedicada pela vida do processo.
 * Um lock de pool seria devolvido junto com o cliente e não valeria nada.
 * Devolve `null` se outro coletor já estiver com a trava.
 */
export async function acquireCollectorLock(
  databaseUrl: string
): Promise<{ release: () => Promise<void> } | null> {
  const client = new Client({ connectionString: databaseUrl, keepAlive: true })
  await client.connect()

  const { rows } = await client.query<{ locked: boolean }>(
    'select pg_try_advisory_lock($1) as locked',
    [COLLECTOR_LOCK_KEY]
  )

  if (!rows[0]?.locked) {
    await client.end()
    return null
  }

  return {
    release: async () => {
      try {
        await client.query('select pg_advisory_unlock($1)', [COLLECTOR_LOCK_KEY])
      } catch {
        // Conexão já caiu: o Postgres solta o lock sozinho ao encerrar a sessão.
      }
      await client.end().catch(() => {})
    }
  }
}

// ── play_event ──────────────────────────────────────────────────────────────

/** Devolve `true` se a linha foi gravada, `false` se o unique index barrou. */
export async function insertPlayEvent(pool: pg.Pool, s: PlayerSample): Promise<boolean> {
  const { rowCount } = await pool.query(
    `insert into play_event (
       observed_at, track_id, track_name, artist_ids, artist_names, album_id,
       duration_ms, progress_ms, is_playing, device_type, context_uri, shuffle, repeat_state
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     on conflict (track_id, observed_at) do nothing`,
    [
      s.observedAt,
      s.trackId,
      s.trackName,
      s.artistIds,
      s.artistNames,
      s.albumId,
      s.durationMs,
      s.progressMs,
      s.isPlaying,
      s.deviceType,
      s.contextUri,
      s.shuffle,
      s.repeatState
    ]
  )
  return (rowCount ?? 0) > 0
}

interface PlayEventRow {
  id: string | number
  observed_at: Date
  track_id: string
  track_name: string
  artist_ids: string[]
  artist_names: string[]
  album_id: string | null
  duration_ms: number
  progress_ms: number
  is_playing: boolean
  device_type: string | null
  context_uri: string | null
  shuffle: boolean | null
  repeat_state: string | null
}

function toSample(r: PlayEventRow): PlayerSample {
  return {
    seq: Number(r.id),
    observedAt: r.observed_at,
    trackId: r.track_id,
    trackName: r.track_name,
    artistIds: r.artist_ids,
    artistNames: r.artist_names,
    albumId: r.album_id,
    durationMs: r.duration_ms,
    progressMs: r.progress_ms,
    isPlaying: r.is_playing,
    deviceType: r.device_type,
    contextUri: r.context_uri,
    shuffle: r.shuffle,
    repeatState: r.repeat_state
  }
}

const SELECT_EVENT_COLS = `
  id, observed_at, track_id, track_name, artist_ids, artist_names, album_id,
  duration_ms, progress_ms, is_playing, device_type, context_uri, shuffle, repeat_state
`

/** Última amostra gravada. Reidrata o estado de deduplicação após um restart. */
export async function getLastPlayEvent(pool: pg.Pool): Promise<PlayerSample | null> {
  const { rows } = await pool.query<PlayEventRow>(
    `select ${SELECT_EVENT_COLS} from play_event order by observed_at desc limit 1`
  )
  const row = rows[0]
  return row ? toSample(row) : null
}

export async function loadSamples(
  pool: pg.Pool,
  from: Date | null,
  to: Date | null
): Promise<PlayerSample[]> {
  const { rows } = await pool.query<PlayEventRow>(
    `select ${SELECT_EVENT_COLS}
       from play_event
      where ($1::timestamptz is null or observed_at >= $1)
        and ($2::timestamptz is null or observed_at <= $2)
      order by observed_at asc, id asc`,
    [from, to]
  )
  return rows.map(toSample)
}

// ── collector_poll ──────────────────────────────────────────────────────────

export interface PollRecord {
  observedAt: Date
  kind: PollResult['kind']
  httpStatus: number | null
  rttMs: number | null
  detail: string | null
}

export async function insertPoll(pool: pg.Pool, r: PollRecord): Promise<void> {
  await pool.query(
    `insert into collector_poll (observed_at, kind, http_status, rtt_ms, detail)
     values ($1, $2, $3, $4, $5)
     on conflict (observed_at) do nothing`,
    [r.observedAt, r.kind, r.httpStatus, r.rttMs, r.detail]
  )
}

/**
 * Instante do poll mais recente, de qualquer tipo.
 *
 * É o que permite à derivação saber se a última faixa ainda está tocando sem
 * consultar relógio nenhum — ver `SessionizeOptions.observedThrough`.
 */
export async function getLatestPollAt(pool: pg.Pool): Promise<Date | null> {
  const { rows } = await pool.query<{ observed_at: Date | null }>(
    'select max(observed_at) as observed_at from collector_poll'
  )
  return rows[0]?.observed_at ?? null
}

/** Janelas em que o coletor esteve de pé, para medir cobertura. */
export async function getCoverageSummary(
  pool: pg.Pool,
  since: Date
): Promise<{ kind: string; polls: number }[]> {
  const { rows } = await pool.query<{ kind: string; polls: number }>(
    `select kind, count(*)::int as polls
       from collector_poll
      where observed_at >= $1
      group by kind
      order by polls desc`,
    [since]
  )
  return rows
}

// ── listen ──────────────────────────────────────────────────────────────────

/**
 * Upsert por `(track_id, started_at)`.
 *
 * Não apaga janela antes de inserir: apagar "listens que cruzam a janela" e
 * recalcular só a partir das amostras de dentro dela decapita qualquer listen que
 * começou antes da borda. O upsert é idempotente sem precisar acertar a borda.
 * Para trocar a lógica de derivação existe `clearListens` — o "apaga e recalcula"
 * do PRD §5, que é uma operação explícita e total, não um efeito colateral.
 */
export async function upsertListens(pool: pg.Pool, listens: Listen[]): Promise<number> {
  if (listens.length === 0) return 0

  const client = await pool.connect()
  try {
    await client.query('begin')
    let written = 0
    for (const l of listens) {
      const { rowCount } = await client.query(
        `insert into listen (
           track_id, started_at, ended_at, duration_ms, listened_ms,
           completion, outcome, device_type, context_uri
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (track_id, started_at) do update set
           ended_at    = excluded.ended_at,
           duration_ms = excluded.duration_ms,
           listened_ms = excluded.listened_ms,
           completion  = excluded.completion,
           outcome     = excluded.outcome,
           device_type = excluded.device_type,
           context_uri = excluded.context_uri`,
        [
          l.trackId,
          l.startedAt,
          l.endedAt,
          l.durationMs,
          l.listenedMs,
          l.completion,
          l.outcome,
          l.deviceType,
          l.contextUri
        ]
      )
      written += rowCount ?? 0
    }
    await client.query('commit')
    return written
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

/** "Apaga e recalcula" do PRD §5. `listen` é cache; play_event nunca é tocado. */
export async function clearListens(pool: pg.Pool): Promise<void> {
  await pool.query('truncate table listen restart identity')
}

/** Instante da última amostra já coberta por um listen fechado. */
export async function getLastListenEnd(pool: pg.Pool): Promise<Date | null> {
  const { rows } = await pool.query<{ ended_at: Date | null }>(
    'select max(ended_at) as ended_at from listen'
  )
  return rows[0]?.ended_at ?? null
}

// ── collector_run ───────────────────────────────────────────────────────────

export async function startRun(pool: pg.Pool, hostname: string, pid: number): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    'insert into collector_run (hostname, pid) values ($1, $2) returning id',
    [hostname, pid]
  )
  const id = rows[0]?.id
  if (id === undefined) throw new Error('collector_run insert não devolveu id')
  return id
}

export async function tickRun(pool: pg.Pool, runId: number, wroteEvent: boolean): Promise<void> {
  await pool.query(
    `update collector_run
        set last_tick_at = now(),
            ticks  = ticks + 1,
            events = events + $2
      where id = $1`,
    [runId, wroteEvent ? 1 : 0]
  )
}

export async function stopRun(pool: pg.Pool, runId: number, reason: string): Promise<void> {
  await pool.query(
    'update collector_run set stopped_at = now(), stop_reason = $2 where id = $1',
    [runId, reason]
  )
}
