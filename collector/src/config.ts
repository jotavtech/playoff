import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Configuração do coletor, lida do ambiente.
 *
 * Aceita os nomes com e sem o prefixo `NUXT_` que o site já usa, para que um único
 * `.env` na raiz sirva aos dois processos sem duplicação de credencial.
 */

export interface CollectorConfig {
  databaseUrl: string
  clientId: string
  clientSecret: string
  refreshToken: string
  redirectUri: string
  /**
   * Intervalo de poll. Constante, inclusive quando nada está tocando.
   *
   * Não existe backoff em ocioso de propósito: se o poll alargar enquanto o player
   * está parado, a primeira faixa de uma sessão é capturada tarde — e uma faixa curta
   * pode passar inteira dentro da janela. É exatamente a perda de resolução que o
   * PRD §3.1 recusa. 4320 chamadas/dia estão muito abaixo do limite do Spotify.
   */
  pollIntervalMs: number
  /**
   * Quanto a faixa pode terminar antes de `duration_ms` e ainda contar como
   * completa. Ver `SessionizeOptions.endToleranceMs`.
   *
   * O padrão de 5s vale para crossfade desligado, que é o padrão do Spotify. Com
   * crossfade ligado, TODA transição natural termina N segundos antes do fim e
   * viraria skip — suba para o valor do crossfade + 2s. É a diferença entre um
   * arquivo com alguns skips de outro perdidos e um arquivo em que todo fim de
   * faixa é um skip inventado.
   */
  endToleranceMs: number
}

/** Lê `.env` da raiz do repo e do diretório do coletor, sem dependência externa. */
export function loadEnvFiles(cwd = process.cwd()): void {
  for (const candidate of ['.env', '../.env']) {
    const path = resolve(cwd, candidate)
    if (existsSync(path)) {
      try {
        process.loadEnvFile(path)
      } catch {
        // Arquivo ilegível ou malformado: o ambiente ainda pode estar completo.
      }
    }
  }
}

function env(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]
    if (value !== undefined && value !== '') return value
  }
  return undefined
}

function required(label: string, ...names: string[]): string {
  const value = env(...names)
  if (value === undefined) {
    throw new Error(
      `Falta ${label}. Defina uma destas variáveis de ambiente: ${names.join(', ')}`
    )
  }
  return value
}

function intEnv(fallback: number, name: string): number {
  const raw = env(name)
  if (raw === undefined) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Valor inválido para ${name}: ${JSON.stringify(raw)}`)
  }
  return parsed
}

/** Credenciais mínimas para falar com a API do Spotify (probe e authorize). */
export function loadSpotifyCredentials(): Pick<
  CollectorConfig,
  'clientId' | 'clientSecret' | 'redirectUri'
> {
  return {
    clientId: required('o client id do Spotify', 'SPOTIFY_CLIENT_ID', 'NUXT_SPOTIFY_CLIENT_ID'),
    clientSecret: required(
      'o client secret do Spotify',
      'SPOTIFY_CLIENT_SECRET',
      'NUXT_SPOTIFY_CLIENT_SECRET'
    ),
    redirectUri: env('COLLECTOR_REDIRECT_URI') ?? 'http://127.0.0.1:8888/callback'
  }
}

export function loadConfig(): CollectorConfig {
  return {
    ...loadSpotifyCredentials(),
    databaseUrl: required('a URL do banco', 'COLLECTOR_DATABASE_URL', 'DATABASE_URL'),
    refreshToken: required(
      'o refresh token do coletor (rode `npm run authorize`)',
      'COLLECTOR_SPOTIFY_REFRESH_TOKEN'
    ),
    pollIntervalMs: intEnv(20_000, 'COLLECTOR_POLL_INTERVAL_MS'),
    endToleranceMs: intEnv(5_000, 'COLLECTOR_END_TOLERANCE_MS')
  }
}
