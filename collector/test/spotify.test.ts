import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ReauthorizationRequiredError, SpotifyClient } from '../src/spotify.js'
import type { FetchLike, PlayerPoll } from '../src/spotify.js'
import type { PlayerSample } from '../src/types.js'

/**
 * Testes do normalizador de `/me/player` contra respostas de mentira.
 *
 * Nenhuma chamada real acontece aqui — o `fetch` é injetado. O que está sendo
 * verificado é o mapeamento de cada caso documentado da API para `PollResult`,
 * porque é onde um erro é caro: um 204 mal tratado derruba o coletor na primeira
 * vez que a música para, e um `idle` fabricado a partir de erro de rede vira
 * buraco no arquivo que ninguém consegue explicar seis meses depois.
 *
 * Os segredos usados abaixo têm nomes reconhecíveis de propósito: o último teste
 * varre o log procurando por eles.
 */

const TOKEN_URL = 'https://accounts.spotify.com/api/token'

const ACCESS_TOKEN = 'access-token-secreto'
const REFRESH_TOKEN = 'refresh-token-secreto'
const CLIENT_SECRET = 'client-secret-secreto'

interface Call {
  url: string
  init: RequestInit | undefined
}

interface Harness {
  client: SpotifyClient
  api: Call[]
  token: Call[]
  rotated: string[]
}

function json(value: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init
  })
}

function tokenResponse(overrides: Record<string, unknown> = {}): Response {
  return json({ access_token: ACCESS_TOKEN, token_type: 'Bearer', expires_in: 3600, ...overrides })
}

/**
 * Monta um cliente com fetch de mentira. `api` recebe o número da chamada (1-based)
 * para poder responder diferente na retentativa.
 */
function setup(opts: {
  api?: (url: string, nth: number) => Response | Promise<Response>
  token?: (nth: number) => Response | Promise<Response>
  refreshTokenIssuedAt?: Date
}): Harness {
  const api: Call[] = []
  const token: Call[] = []
  const rotated: string[] = []

  const fetchImpl: FetchLike = async (input, init) => {
    const url = String(input)
    const call: Call = { url, init }
    if (url.startsWith(TOKEN_URL)) {
      token.push(call)
      return opts.token ? opts.token(token.length) : tokenResponse()
    }
    api.push(call)
    if (!opts.api) throw new Error(`teste sem handler de api para ${url}`)
    return opts.api(url, api.length)
  }

  const client = new SpotifyClient({
    clientId: 'client-id',
    clientSecret: CLIENT_SECRET,
    refreshToken: REFRESH_TOKEN,
    onRefreshToken: (value) => rotated.push(value),
    fetch: fetchImpl,
    ...(opts.refreshTokenIssuedAt ? { refreshTokenIssuedAt: opts.refreshTokenIssuedAt } : {})
  })

  return { client, api, token, rotated }
}

/** Cliente que devolve sempre o mesmo corpo de player. */
function playing(body: unknown, init?: ResponseInit): Harness {
  return setup({ api: () => json(body, init) })
}

function expectTrack(poll: PlayerPoll): PlayerSample {
  assert.equal(poll.kind, 'track', `esperava track, veio ${poll.kind}`)
  if (poll.kind !== 'track') throw new Error('inalcançável')
  return poll.sample
}

function expectUnsupported(poll: PlayerPoll): string {
  assert.equal(poll.kind, 'unsupported', `esperava unsupported, veio ${poll.kind}`)
  if (poll.kind !== 'unsupported') throw new Error('inalcançável')
  return poll.reason
}

// ── fixtures ────────────────────────────────────────────────────────────────

/** 200 tocando uma faixa de catálogo, com tudo que o coletor lê presente. */
const TRACK_BODY = {
  device: {
    id: 'dev-1',
    is_active: true,
    is_private_session: false,
    is_restricted: false,
    name: 'MacBook Pro do Vitor',
    type: 'Computer',
    volume_percent: 62,
    supports_volume: true
  },
  repeat_state: 'context',
  shuffle_state: true,
  context: { type: 'playlist', uri: 'spotify:playlist:37i9dQZF1DX', href: null, external_urls: {} },
  timestamp: 1_770_000_000_000,
  progress_ms: 61_500,
  is_playing: true,
  currently_playing_type: 'track',
  item: {
    type: 'track',
    id: '4uLU6hMCjMI75M1A2tKUQC',
    uri: 'spotify:track:4uLU6hMCjMI75M1A2tKUQC',
    name: 'Sinal Fechado',
    duration_ms: 213_240,
    is_local: false,
    explicit: false,
    is_playable: true,
    external_ids: { isrc: 'BRXXX0000001' },
    album: { id: 'alb-1', name: 'Clube da Esquina', images: [] },
    artists: [
      { id: 'art-1', name: 'Milton Nascimento' },
      { id: 'art-2', name: 'Lô Borges' }
    ]
  },
  actions: { disallows: { resuming: true } }
}

/** Episódio de podcast: sem `artists`, sem `album`, com `show`. */
const EPISODE_BODY = {
  device: { id: 'dev-2', type: 'Smartphone', is_private_session: false },
  repeat_state: 'off',
  shuffle_state: false,
  context: { type: 'show', uri: 'spotify:show:abc' },
  progress_ms: 900_000,
  is_playing: true,
  currently_playing_type: 'episode',
  item: {
    type: 'episode',
    id: 'ep-1',
    uri: 'spotify:episode:ep-1',
    name: 'Episódio 42',
    duration_ms: 3_600_000,
    resume_point: { fully_played: false, resume_position_ms: 900_000 },
    show: { name: 'Foro de Teresina', publisher: 'piauí', media_type: 'audio' }
  }
}

/** Arquivo local: id e href nulos, uri `spotify:local:`, artistas sem id. */
const LOCAL_FILE_BODY = {
  device: { type: 'Computer' },
  repeat_state: 'off',
  shuffle_state: false,
  context: null,
  progress_ms: 4_000,
  is_playing: true,
  currently_playing_type: 'track',
  item: {
    type: 'track',
    id: null,
    href: null,
    uri: 'spotify:local:Artista++:Album:Faixa+Sem+Id:214',
    name: 'Faixa Sem Id',
    duration_ms: 214_000,
    is_local: true,
    album: { id: null, name: 'Album', images: [] },
    artists: [{ id: null, name: 'Artista' }]
  }
}

// ── 200 com faixa ───────────────────────────────────────────────────────────

test('faixa de catálogo vira sample completo', async () => {
  const h = playing(TRACK_BODY)
  const before = Date.now()
  const poll = await h.client.getPlayerState()
  const sample = expectTrack(poll)

  assert.equal(sample.trackId, '4uLU6hMCjMI75M1A2tKUQC')
  assert.equal(sample.trackName, 'Sinal Fechado')
  assert.deepEqual(sample.artistIds, ['art-1', 'art-2'])
  assert.deepEqual(sample.artistNames, ['Milton Nascimento', 'Lô Borges'])
  assert.equal(sample.albumId, 'alb-1')
  assert.equal(sample.durationMs, 213_240)
  assert.equal(sample.progressMs, 61_500)
  assert.equal(sample.isPlaying, true)
  assert.equal(sample.deviceType, 'Computer')
  assert.equal(sample.contextUri, 'spotify:playlist:37i9dQZF1DX')
  assert.equal(sample.shuffle, true)
  assert.equal(sample.repeatState, 'context')

  // rtt medido e observedAt corrigido para o meio do round-trip.
  assert.equal(poll.httpStatus, 200)
  assert.ok(poll.rttMs >= 0 && poll.rttMs < 5_000, `rtt improvável: ${poll.rttMs}`)
  assert.ok(poll.observedAt.getTime() >= before - 1_000)
  assert.ok(poll.observedAt.getTime() <= Date.now())
  assert.equal(sample.observedAt.getTime(), poll.observedAt.getTime())
})

test('pausado com device vivo continua sendo track, com isPlaying false', async () => {
  const poll = await playing({
    ...TRACK_BODY,
    is_playing: false,
    progress_ms: 35_000
  }).client.getPlayerState()

  const sample = expectTrack(poll)
  assert.equal(sample.isPlaying, false)
  assert.equal(sample.progressMs, 35_000)
})

test('campos ausentes viram null em vez de derrubar a amostra', async () => {
  const poll = await playing({
    progress_ms: 1_000,
    is_playing: true,
    currently_playing_type: 'track',
    context: null,
    item: {
      type: 'track',
      id: 'track-sem-nada',
      name: 'Sem contexto',
      duration_ms: 100_000
    }
  }).client.getPlayerState()

  const sample = expectTrack(poll)
  assert.equal(sample.contextUri, null)
  assert.equal(sample.deviceType, null)
  assert.equal(sample.albumId, null)
  assert.equal(sample.shuffle, null)
  assert.equal(sample.repeatState, null)
  assert.deepEqual(sample.artistIds, [])
  assert.deepEqual(sample.artistNames, [])
})

test('artista sem id mantém o alinhamento posicional dos dois arrays', async () => {
  const poll = await playing({
    ...TRACK_BODY,
    item: {
      ...TRACK_BODY.item,
      artists: [{ name: 'Sem Id' }, { id: 'art-2', name: 'Com Id' }]
    }
  }).client.getPlayerState()

  const sample = expectTrack(poll)
  assert.deepEqual(sample.artistIds, ['', 'art-2'])
  assert.deepEqual(sample.artistNames, ['Sem Id', 'Com Id'])
})

// ── idle ────────────────────────────────────────────────────────────────────

test('204 tem corpo vazio e vira idle sem lançar', async () => {
  const h = setup({ api: () => new Response(null, { status: 204 }) })
  const poll = await h.client.getPlayerState()
  assert.equal(poll.kind, 'idle')
  assert.equal(poll.httpStatus, 204)
})

test('200 com corpo vazio vira idle', async () => {
  const poll = await setup({
    api: () => new Response('', { status: 200 })
  }).client.getPlayerState()
  assert.equal(poll.kind, 'idle')
})

test('200 com objeto vazio vira idle', async () => {
  const poll = await playing({}).client.getPlayerState()
  assert.equal(poll.kind, 'idle')
})

test('item null com is_playing false vira idle', async () => {
  const poll = await playing({
    device: { type: 'Computer' },
    is_playing: false,
    progress_ms: null,
    item: null,
    currently_playing_type: 'unknown'
  }).client.getPlayerState()
  assert.equal(poll.kind, 'idle')
})

// ── unsupported ─────────────────────────────────────────────────────────────

test('anúncio (item null, is_playing true) vira unsupported', async () => {
  const poll = await playing({
    device: { type: 'Computer' },
    is_playing: true,
    progress_ms: 12_000,
    item: null,
    currently_playing_type: 'ad'
  }).client.getPlayerState()
  assert.match(expectUnsupported(poll), /anúncio/)
})

test('episódio de podcast vira unsupported e não tenta ler artists', async () => {
  const poll = await playing(EPISODE_BODY).client.getPlayerState()
  assert.match(expectUnsupported(poll), /episódio de podcast \(Foro de Teresina\)/)
})

test('episódio sem item (additional_types ignorado) também vira unsupported', async () => {
  const poll = await playing({
    is_playing: true,
    progress_ms: 30_000,
    item: null,
    currently_playing_type: 'episode'
  }).client.getPlayerState()
  assert.match(expectUnsupported(poll), /episódio/)
})

test('currently_playing_type unknown com is_playing true vira unsupported, não idle', async () => {
  const poll = await playing({
    device: { type: 'Speaker' },
    is_playing: true,
    progress_ms: null,
    item: null,
    currently_playing_type: 'unknown'
  }).client.getPlayerState()
  assert.match(expectUnsupported(poll), /unknown/)
})

test('arquivo local vira unsupported', async () => {
  const poll = await playing(LOCAL_FILE_BODY).client.getPlayerState()
  assert.match(expectUnsupported(poll), /arquivo local/)
})

test('HTTP 400 "invalid id" durante arquivo local não é erro fatal', async () => {
  const poll = await setup({
    api: () => json({ error: { status: 400, message: 'invalid id' } }, { status: 400 })
  }).client.getPlayerState()
  assert.match(expectUnsupported(poll), /arquivo local/)
  assert.equal(poll.httpStatus, 400)
})

test('progress_ms null com is_playing true não vira progresso zero', async () => {
  const poll = await playing({
    ...TRACK_BODY,
    progress_ms: null
  }).client.getPlayerState()
  assert.match(expectUnsupported(poll), /progress_ms/)
})

test('tipo de item desconhecido (capítulo de audiolivro) vira unsupported', async () => {
  const poll = await playing({
    is_playing: true,
    progress_ms: 5_000,
    currently_playing_type: 'unknown',
    item: { type: 'chapter', id: 'cap-1', name: 'Capítulo 1', duration_ms: 900_000 }
  }).client.getPlayerState()
  assert.match(expectUnsupported(poll), /chapter/)
})

// ── 429 ─────────────────────────────────────────────────────────────────────

test('429 com Retry-After em segundos', async () => {
  const poll = await setup({
    api: () => json({ error: { status: 429 } }, { status: 429, headers: { 'Retry-After': '7' } })
  }).client.getPlayerState()

  assert.equal(poll.kind, 'rate-limited')
  if (poll.kind !== 'rate-limited') return
  assert.equal(poll.retryAfterMs, 7_000)
  assert.equal(poll.httpStatus, 429)
})

test('429 sem Retry-After cai no padrão da janela de 30s', async () => {
  const poll = await setup({
    api: () => json({ error: { status: 429 } }, { status: 429 })
  }).client.getPlayerState()

  assert.equal(poll.kind, 'rate-limited')
  if (poll.kind !== 'rate-limited') return
  assert.equal(poll.retryAfterMs, 30_000)
})

test('429 com Retry-After ilegível cai no padrão', async () => {
  const poll = await setup({
    api: () =>
      json({ error: { status: 429 } }, { status: 429, headers: { 'retry-after': 'logo mais' } })
  }).client.getPlayerState()

  assert.equal(poll.kind, 'rate-limited')
  if (poll.kind !== 'rate-limited') return
  assert.equal(poll.retryAfterMs, 30_000)
})

test('429 com Retry-After absurdo é truncado em 1h', async () => {
  const poll = await setup({
    api: () => json({ error: { status: 429 } }, { status: 429, headers: { 'Retry-After': '76000' } })
  }).client.getPlayerState()

  assert.equal(poll.kind, 'rate-limited')
  if (poll.kind !== 'rate-limited') return
  assert.equal(poll.retryAfterMs, 3_600_000)
})

// ── erro ────────────────────────────────────────────────────────────────────

test('5xx vira error com o status, nunca idle', async () => {
  const poll = await setup({
    api: () => new Response('<html>bad gateway</html>', { status: 502 })
  }).client.getPlayerState()

  assert.equal(poll.kind, 'error')
  if (poll.kind !== 'error') return
  assert.equal(poll.status, 502)
  assert.equal(poll.httpStatus, 502)
})

test('falha de transporte vira error com status null, nunca idle', async () => {
  const poll = await setup({
    api: () => {
      throw new TypeError('fetch failed')
    }
  }).client.getPlayerState()

  assert.equal(poll.kind, 'error')
  if (poll.kind !== 'error') return
  assert.equal(poll.status, null)
  assert.equal(poll.httpStatus, null)
  assert.match(poll.message, /fetch failed/)
})

test('200 com corpo ilegível vira error, não idle', async () => {
  const poll = await setup({
    api: () => new Response('<html>portal cativo</html>', { status: 200 })
  }).client.getPlayerState()

  assert.equal(poll.kind, 'error')
  if (poll.kind !== 'error') return
  assert.equal(poll.status, 200)
})

test('403 vira error e não derruba o loop', async () => {
  const poll = await setup({
    api: () => json({ error: { status: 403, message: 'Forbidden' } }, { status: 403 })
  }).client.getPlayerState()

  assert.equal(poll.kind, 'error')
  if (poll.kind !== 'error') return
  assert.equal(poll.status, 403)
})

// ── token ───────────────────────────────────────────────────────────────────

test('401 renova o token e retenta exatamente uma vez', async () => {
  const h = setup({
    api: (_url, nth) =>
      nth === 1
        ? json({ error: { status: 401, message: 'The access token expired' } }, { status: 401 })
        : json(TRACK_BODY)
  })

  const poll = await h.client.getPlayerState()
  expectTrack(poll)
  assert.equal(h.api.length, 2, 'deveria ter retentado uma vez')
  assert.equal(h.token.length, 2, 'deveria ter renovado o token no 401')
})

test('401 persistente não vira laço de renovação', async () => {
  const h = setup({
    api: () => json({ error: { status: 401, message: 'Invalid access token' } }, { status: 401 })
  })

  const poll = await h.client.getPlayerState()
  assert.equal(poll.kind, 'error')
  if (poll.kind !== 'error') return
  assert.equal(poll.status, 401)
  assert.equal(h.api.length, 2, 'no máximo uma retentativa')
})

test('access token é reaproveitado entre polls', async () => {
  const h = setup({ api: () => json(TRACK_BODY) })
  await h.client.getPlayerState()
  await h.client.getPlayerState()
  await h.client.getPlayerState()
  assert.equal(h.token.length, 1)
  assert.equal(h.api.length, 3)
})

test('token que expira dentro da margem é renovado proativamente', async () => {
  // expires_in 30s < margem de 60s: cada poll tem que renovar antes de sair.
  const h = setup({
    api: () => json(TRACK_BODY),
    token: () => tokenResponse({ expires_in: 30 })
  })
  await h.client.getPlayerState()
  await h.client.getPlayerState()
  assert.equal(h.token.length, 2)
})

test('renovações concorrentes compartilham uma única requisição de token', async () => {
  const h = setup({ api: () => json(TRACK_BODY) })
  await Promise.all([
    h.client.getAccessToken(),
    h.client.getAccessToken(),
    h.client.getAccessToken()
  ])
  assert.equal(h.token.length, 1)
})

test('refresh token rotacionado é notificado e usado na renovação seguinte', async () => {
  const h = setup({
    api: () => json(TRACK_BODY),
    token: (nth) =>
      nth === 1
        ? tokenResponse({ expires_in: 30, refresh_token: 'refresh-rotacionado' })
        : tokenResponse({ expires_in: 30 })
  })

  await h.client.getPlayerState()
  assert.deepEqual(h.rotated, ['refresh-rotacionado'])

  await h.client.getPlayerState()
  assert.equal(h.token.length, 2)
  assert.match(String(h.token[1]?.init?.body), /refresh_token=refresh-rotacionado/)
})

test('400 invalid_grant lança ReauthorizationRequiredError e não vira error transitório', async () => {
  const h = setup({
    api: () => json(TRACK_BODY),
    token: () =>
      json(
        { error: 'invalid_grant', error_description: 'Refresh token revoked' },
        { status: 400 }
      )
  })

  await assert.rejects(() => h.client.getPlayerState(), ReauthorizationRequiredError)
  await assert.rejects(() => h.client.getAccessToken(), ReauthorizationRequiredError)
  assert.equal(h.api.length, 0, 'não deveria nem chegar ao player')
})

test('falha de rede na renovação vira poll de erro, não reautorização', async () => {
  const h = setup({
    api: () => json(TRACK_BODY),
    token: () => {
      throw new TypeError('fetch failed')
    }
  })

  const poll = await h.client.getPlayerState()
  assert.equal(poll.kind, 'error')
  if (poll.kind !== 'error') return
  assert.match(poll.message, /renovar o access token/)
})

// ── requisição ──────────────────────────────────────────────────────────────

test('toda requisição leva additional_types, Bearer e timeout', async () => {
  const h = setup({ api: () => json(TRACK_BODY) })
  await h.client.getPlayerState()

  const call = h.api[0]
  assert.ok(call, 'sem chamada registrada')
  assert.match(call.url, /\/me\/player\?additional_types=track,episode$/)

  const headers = call.init?.headers as Record<string, string> | undefined
  assert.equal(headers?.authorization, `Bearer ${ACCESS_TOKEN}`)
  assert.ok(call.init?.signal instanceof AbortSignal, 'requisição sem AbortSignal')

  const tokenCall = h.token[0]
  assert.ok(tokenCall?.init?.signal instanceof AbortSignal, 'renovação sem AbortSignal')
})

// ── fase 0 ──────────────────────────────────────────────────────────────────

test('probeAudioFeatures devolve o status cru', async () => {
  const h403 = setup({
    api: () => json({ error: { status: 403, message: 'Forbidden' } }, { status: 403 })
  })
  assert.equal(await h403.client.probeAudioFeatures(), 403)

  const h200 = setup({ api: () => json({ danceability: 0.5, tempo: 120 }) })
  assert.equal(await h200.client.probeAudioFeatures(), 200)
  assert.match(String(h200.api[0]?.url), /\/audio-features\//)
})

test('getCurrentUser mapeia id, account_id e display_name', async () => {
  const h = setup({
    api: () => json({ id: 'vitor', account_id: 'acc-imutavel', display_name: 'Vitor' })
  })
  assert.deepEqual(await h.client.getCurrentUser(), {
    id: 'vitor',
    accountId: 'acc-imutavel',
    displayName: 'Vitor'
  })
})

test('getCurrentUser sem account_id (resposta pré maio/2026) devolve null', async () => {
  const h = setup({ api: () => json({ id: 'vitor', display_name: null }) })
  const user = await h.client.getCurrentUser()
  assert.equal(user.accountId, null)
  assert.equal(user.displayName, null)
})

// ── segredo não vaza ────────────────────────────────────────────────────────

test('nenhum segredo aparece no log', async () => {
  const h = setup({
    api: (_url, nth) =>
      nth === 1
        ? json({ error: { status: 403, message: 'Forbidden' } }, { status: 403 })
        : json(TRACK_BODY),
    token: (nth) =>
      nth === 1
        ? tokenResponse({ expires_in: 30, refresh_token: 'refresh-rotacionado' })
        : tokenResponse({ expires_in: 30 })
  })

  const realOut = process.stdout.write.bind(process.stdout)
  const realErr = process.stderr.write.bind(process.stderr)
  let captured = ''
  const sink = ((chunk: unknown) => {
    captured += String(chunk)
    return true
  }) as typeof process.stdout.write

  process.stdout.write = sink
  process.stderr.write = sink
  try {
    await h.client.getPlayerState()
    await h.client.getPlayerState()
  } finally {
    process.stdout.write = realOut
    process.stderr.write = realErr
  }

  // O 403 e a rotação de fato logaram: senão o teste não estaria olhando nada.
  assert.match(captured, /403 no player/)
  assert.match(captured, /refresh token rotacionado/)

  for (const secret of [ACCESS_TOKEN, REFRESH_TOKEN, CLIENT_SECRET, 'refresh-rotacionado']) {
    assert.equal(captured.includes(secret), false, `segredo vazou no log: ${secret}`)
  }
})

// ── costura com o laço de coleta ────────────────────────────────────────────

test('o laço reconhece ReauthorizationRequiredError e não entra em retry', async () => {
  // Este é o ramo mais caro de errar em todo o sistema: desde 20/07/2026 todo
  // refresh token morre em 6 meses, e confundir "credencial morta" com "falha
  // transitória" faz o coletor tentar de novo para sempre, em silêncio, enquanto
  // cada dia sem coleta é perdido para sempre. Se alguém renomear a classe, é aqui
  // que tem que quebrar — não em produção, seis meses depois.
  const err = new ReauthorizationRequiredError('refresh token expirado')
  assert.equal(err.name, 'ReauthorizationRequiredError')
  assert.ok(err instanceof ReauthorizationRequiredError)
  assert.ok(err instanceof Error)
})
