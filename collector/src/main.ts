import { createPool, acquireCollectorLock, getCoverageSummary, runMigrations } from './db.js'
import { loadConfig, loadEnvFiles } from './config.js'
import { derive } from './derive.js'
import { log } from './log.js'
import { runPollLoop } from './poll.js'
import { SpotifyClient } from './spotify.js'

/** Configuração inválida ou credencial morta: systemd mostra como falha, não como flap. */
const EXIT_CONFIG = 78

/** De quanto em quanto tempo o modo `run` rederiva `listen`. */
const DERIVE_EVERY_MS = 5 * 60 * 1000

function usage(): string {
  return `playoff-collector — coletor de histórico de escuta

  run                  laço de coleta (é isto que o systemd roda)
  once                 um único poll, para checar a configuração
  probe                Fase 0 — checa auth, audio-features e escopos
  authorize            obtém o refresh token do coletor (uma vez só)
  migrate              aplica as migrações do banco
  derive [--rebuild]   recalcula listen a partir de play_event
  status               cobertura das últimas 24h
`
}

async function main(): Promise<number> {
  loadEnvFiles()
  const command = process.argv[2] ?? 'run'

  // Fase 0 não precisa de banco nem de refresh token configurado.
  if (command === 'authorize') {
    const { runAuthorize } = await import('./authorize.js')
    await runAuthorize()
    return 0
  }
  if (command === 'probe') {
    const { runProbe } = await import('./probe.js')
    await runProbe()
    return 0
  }
  if (command === 'help' || command === '--help' || command === '-h') {
    process.stdout.write(usage())
    return 0
  }

  const config = loadConfig()
  const pool = createPool(config.databaseUrl)

  try {
    if (command === 'migrate') {
      const ran = await runMigrations(pool)
      log.info(ran.length > 0 ? 'migrações aplicadas' : 'banco já estava atualizado', { ran })
      return 0
    }

    if (command === 'derive') {
      await runMigrations(pool)
      const rebuild = process.argv.includes('--rebuild')
      await derive({
        pool,
        pollIntervalMs: config.pollIntervalMs,
        endToleranceMs: config.endToleranceMs,
        rebuild
      })
      return 0
    }

    if (command === 'status') {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const coverage = await getCoverageSummary(pool, since)
      const total = coverage.reduce((sum, row) => sum + row.polls, 0)
      // 24h de cobertura ininterrupta no intervalo nominal.
      const expected = Math.round((24 * 60 * 60 * 1000) / config.pollIntervalMs)
      process.stdout.write(`\ncobertura das últimas 24h\n\n`)
      for (const row of coverage) {
        process.stdout.write(`  ${row.kind.padEnd(14)} ${String(row.polls).padStart(6)}\n`)
      }
      process.stdout.write(
        `\n  ${'total'.padEnd(14)} ${String(total).padStart(6)} de ~${expected} esperados ` +
          `(${Math.round((total / expected) * 100)}% do dia coberto)\n\n`
      )
      return 0
    }

    if (command !== 'run' && command !== 'once') {
      process.stderr.write(`comando desconhecido: ${command}\n\n${usage()}`)
      return 2
    }

    await runMigrations(pool)

    // Duas instâncias escrevendo é o modo realista de duplicar evento — um restart
    // do systemd que se sobrepõe, ou um `npm start` manual esquecido num terminal.
    const lock = await acquireCollectorLock(config.databaseUrl)
    if (!lock) {
      log.error('outro coletor já está rodando; saindo sem escrever nada')
      return EXIT_CONFIG
    }

    let refreshToken = config.refreshToken
    const client = new SpotifyClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken,
      onRefreshToken: (rotated: string) => {
        // O Spotify pode rotacionar o refresh token. Perder o novo em silêncio
        // deixa o coletor funcionando até a próxima reinicialização e só então
        // quebra — com o .env apontando para um token que não vale mais.
        refreshToken = rotated
        log.warn(
          'o Spotify rotacionou o refresh token. Atualize o .env com o valor novo, ' +
            'senão o coletor não sobe na próxima reinicialização.',
          { COLLECTOR_SPOTIFY_REFRESH_TOKEN: rotated }
        )
      }
    })

    if (command === 'once') {
      const result = await client.getPlayerState()
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
      return 0
    }

    const controller = new AbortController()
    let fatal = false
    const stop = (signal: string) => {
      log.info('sinal recebido, encerrando', { signal })
      controller.abort()
    }
    process.once('SIGTERM', () => stop('SIGTERM'))
    process.once('SIGINT', () => stop('SIGINT'))

    // A derivação roda junto, em intervalo próprio: o ARCHIVE fica fresco sem
    // precisar de um segundo processo agendado. Uma falha aqui nunca pode derrubar
    // a coleta — `listen` é cache reconstruível, `play_event` é o que não volta.
    const deriveTimer = setInterval(() => {
      derive({
        pool,
        pollIntervalMs: config.pollIntervalMs,
        endToleranceMs: config.endToleranceMs
      }).catch((err) =>
        log.error('derivação falhou; a coleta segue', { err })
      )
    }, DERIVE_EVERY_MS)
    deriveTimer.unref()

    try {
      await runPollLoop({
        pool,
        source: client,
        pollIntervalMs: config.pollIntervalMs,
        signal: controller.signal,
        onFatal: () => {
          fatal = true
        }
      })
    } finally {
      clearInterval(deriveTimer)
      await lock.release()
    }

    return fatal ? EXIT_CONFIG : 0
  } finally {
    await pool.end().catch(() => {})
  }
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((err: Error) => {
    log.error('coletor abortou', { err })
    process.exitCode = 1
  })
