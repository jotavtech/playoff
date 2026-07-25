/**
 * Log estruturado em stdout, uma linha por evento.
 *
 * O coletor roda sob systemd, então stdout vai direto para o journald e não há
 * arquivo de log para rotacionar. `journalctl -u playoff-collector -f` é a interface.
 */

type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

const threshold = LEVELS[(process.env.COLLECTOR_LOG_LEVEL as Level) ?? 'info'] ?? LEVELS.info

function emit(level: Level, message: string, fields?: Record<string, unknown>): void {
  if (LEVELS[level] < threshold) return
  const line = { ts: new Date().toISOString(), level, message, ...fields }
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout
  stream.write(`${JSON.stringify(line, replacer)}\n`)
}

/** Erros não são serializáveis por padrão; sem isto o log vira `{}`. */
function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack }
  }
  return value
}

export const log = {
  debug: (message: string, fields?: Record<string, unknown>) => emit('debug', message, fields),
  info: (message: string, fields?: Record<string, unknown>) => emit('info', message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => emit('warn', message, fields),
  error: (message: string, fields?: Record<string, unknown>) => emit('error', message, fields)
}
