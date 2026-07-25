import { loadSpotifyCredentials } from './config.js'
import type { PollResult } from './types.js'

/**
 * Fase 0 (PRD §11): descobrir o que dá para usar, antes de comprometer semanas de
 * coleta com uma premissa errada.
 *
 * Responde quatro perguntas e nenhuma a mais:
 *
 *   1. o auth ainda funciona?         — a única que pode reprovar
 *   2. tem audio-features?            — decide `SIGNAL_SOURCE`, não bloqueia nada
 *   3. que conta é esta?
 *   4. os escopos leem o player?      — confirmação antes de dias de coleta
 *
 * A pergunta 2 é o ponto do PRD §4.2: um 403 aqui é **informação**, não falha. O
 * probe existe para tirar essa incógnita do caminho, não para virar um portão.
 */

const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const API_BASE = 'https://api.spotify.com/v1'

/** O mesmo id de faixa que o curl do PRD §4.2 usa. Serve só de cobaia. */
const PROBE_TRACK_ID = '11dFghVXANMlKmJXsNCbNl'

const HTTP_TIMEOUT_MS = 15_000

// ── saída ───────────────────────────────────────────────────────────────────

function out(text = ''): void {
  process.stdout.write(`${text}\n`)
}

function section(title: string): string {
  const head = `── ${title} `
  return head + '─'.repeat(Math.max(3, 76 - head.length))
}

function row(label: string, value: string): string {
  return `  ${label.padEnd(18)}${value}`
}

/**
 * Imprime o diagnóstico em português e devolve o erro curto para `throw`.
 *
 * O `main` serializa o Error numa linha de log JSON, onde um texto de dez linhas
 * vira uma tripa de `\n` ilegível — então a explicação sai como texto e só a
 * etiqueta sobe. O `throw` é o que faz o comando sair diferente de zero.
 */
function abort(explanation: string, short: string): Error {
  out(explanation)
  out()
  return new Error(short)
}

// ── leitura defensiva de JSON ───────────────────────────────────────────────
//
// O Spotify removeu um lote de campos em fev/2026, reverteu um em março e não
// promete o resto. Nada aqui pode estourar por campo ausente ou tipo inesperado:
// o probe é justamente o comando que precisa continuar imprimindo quando a
// resposta muda de forma.

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function clock(ms: number | null): string {
  if (ms === null) return '--:--'
  const total = Math.max(0, Math.round(ms / 1000))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// ── auth ────────────────────────────────────────────────────────────────────

type AuthResult =
  | {
      ok: true
      status: number
      rttMs: number
      accessToken: string
      expiresIn: number | null
      scope: string | null
      /** Preenchido só quando o Spotify devolveu um refresh token diferente. */
      rotated: string | null
    }
  | {
      ok: false
      /** `dead` = credencial morta e irrecuperável. `transport` = não deu para saber. */
      kind: 'dead' | 'client' | 'http' | 'transport'
      status: number | null
      rttMs: number
      error: string
      description: string
    }

/**
 * Renova o access token pelo mesmo caminho que o coletor usa de hora em hora:
 * `refresh_token` com Basic auth de client_id:client_secret. Testar por outro
 * caminho tornaria o resultado inútil — o que interessa é se *aquilo* funciona.
 */
async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<AuthResult> {
  const started = Date.now()

  let response: Response
  let raw: string
  try {
    response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS)
    })
    raw = await response.text()
  } catch (err) {
    return {
      ok: false,
      kind: 'transport',
      status: null,
      rttMs: Date.now() - started,
      error: 'transporte',
      description: (err as Error).message
    }
  }

  const rttMs = Date.now() - started
  const payload = asRecord(parseJson(raw))
  const error = asText(payload?.['error'])
  const description = asText(payload?.['error_description']) ?? raw.slice(0, 300)

  if (!response.ok) {
    // invalid_grant é a única resposta desta lista que não adianta tentar de novo:
    // o token expirou (6 meses) ou foi revogado. As duas causas são indistinguíveis
    // pela resposta, e a saída é a mesma.
    const kind: 'dead' | 'client' | 'http' =
      error === 'invalid_grant' ? 'dead' : error === 'invalid_client' ? 'client' : 'http'
    return { ok: false, kind, status: response.status, rttMs, error: error ?? '', description }
  }

  const accessToken = asText(payload?.['access_token'])
  if (accessToken === null) {
    return {
      ok: false,
      kind: 'http',
      status: response.status,
      rttMs,
      error: '200 sem access_token',
      description: raw.slice(0, 300)
    }
  }

  const returned = asText(payload?.['refresh_token'])
  return {
    ok: true,
    status: response.status,
    rttMs,
    accessToken,
    expiresIn: asNumber(payload?.['expires_in']),
    scope: asText(payload?.['scope']),
    rotated: returned !== null && returned !== refreshToken ? returned : null
  }
}

// ── chamadas à API ──────────────────────────────────────────────────────────

interface ApiCall {
  path: string
  /** `null` quando não houve resposta nenhuma (timeout, DNS, TLS). */
  status: number | null
  rttMs: number
  body: unknown
  raw: string
  retryAfter: string | null
  transport: string | null
}

async function apiGet(path: string, accessToken: string): Promise<ApiCall> {
  const started = Date.now()
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS)
    })
    // Ler como texto antes de tentar JSON: o 204 vem com zero byte e `.json()`
    // estoura nele. É o crash mais comum de coletor ingênuo, e o probe é
    // exatamente o comando que costuma encontrar o 204 primeiro.
    const raw = await response.text()
    return {
      path,
      status: response.status,
      rttMs: Date.now() - started,
      body: raw === '' ? null : parseJson(raw),
      raw,
      retryAfter: response.headers.get('retry-after'),
      transport: null
    }
  } catch (err) {
    return {
      path,
      status: null,
      rttMs: Date.now() - started,
      body: null,
      raw: '',
      retryAfter: null,
      transport: (err as Error).message
    }
  }
}

function describe(call: ApiCall): string {
  const verdict =
    call.status === null ? `sem resposta (${call.transport ?? 'falhou'})` : `${call.status}`
  return `  GET ${call.path}  →  ${verdict} em ${call.rttMs}ms`
}

// ── leitura do player ───────────────────────────────────────────────────────

interface PlayerReading {
  kind: PollResult['kind']
  lines: string[]
  /** 401/403 aqui é escopo ou autorização — o coletor não coletaria nada. */
  authBroken: boolean
}

/**
 * Classifica a resposta nos mesmos casos de `PollResult` que o coletor usa.
 *
 * O probe não escreve nada e não precisa normalizar a amostra; precisa só dizer
 * qual ramo caiu, para o humano confirmar que os escopos estão certos antes de
 * comprometer dias de coleta.
 */
function readPlayer(call: ApiCall): PlayerReading {
  if (call.status === null) {
    return {
      kind: 'error',
      lines: [`  Sem resposta: ${call.transport ?? 'falha de transporte'}.`],
      authBroken: false
    }
  }

  if (call.status === 429) {
    return {
      kind: 'rate-limited',
      lines: [
        `  429 — limite de taxa. Retry-After: ${call.retryAfter ?? 'ausente'}.`,
        '  Desde jul/2026 a cota do Development Mode é contada por CONTA de',
        '  desenvolvedor, não por client id: outra app sua, ou um segundo coletor',
        '  esquecido rodando, consome o mesmo bolo.'
      ],
      authBroken: false
    }
  }

  if (call.status === 401 || call.status === 403) {
    return {
      kind: 'error',
      lines: [
        `  ${call.status} — o token é válido mas não abre este endpoint. As causas, em`,
        '  ordem de probabilidade:',
        '',
        '    escopo faltando       o refresh token foi emitido sem',
        '                          user-read-playback-state. Rode `npm run authorize`.',
        '    usuário não incluso   desde fev/2026 uma app em Development Mode aceita 5',
        '                          usuários, e cada um precisa estar na lista do',
        '                          dashboard → Settings → User Management.',
        '    Premium do dono       desde fev/2026 a app em Development Mode para de',
        '                          funcionar se a assinatura Premium do DONO vencer.',
        '',
        '  Este 403 não tem nada a ver com o 403 de audio-features: lá é cota, aqui é',
        '  autorização. Aqui o coletor não coletaria nada.'
      ],
      authBroken: true
    }
  }

  if (call.status === 400) {
    return {
      kind: 'unsupported',
      lines: [
        '  400 — bug antigo do Spotify com arquivo local tocando: o endpoint responde',
        '  "invalid id" em vez de um corpo. Não é fatal e não é erro de configuração.'
      ],
      authBroken: false
    }
  }

  if (call.status >= 500) {
    return {
      kind: 'error',
      lines: [`  ${call.status} — falha na borda do Spotify. Transitória; tente de novo.`],
      authBroken: false
    }
  }

  const body = asRecord(call.body)

  // 204 (corpo vazio) e 200 com objeto vazio significam a mesma coisa: nenhum
  // player ativo. É silêncio OBSERVADO, que é dado — não ausência de dado.
  if (
    call.status === 204 ||
    (call.status === 200 && (body === null || Object.keys(body).length === 0))
  ) {
    return {
      kind: 'idle',
      lines: [
        `  ${call.status} — nenhum player ativo. Nada tocando, ou o dispositivo dormiu, ou a`,
        '  sessão do Connect expirou, ou é sessão privada.',
        '',
        '  Os escopos estão certos mesmo assim: escopo faltando responderia 403, não',
        '  204. Para ver uma leitura de faixa completa, ponha algo para tocar e rode',
        '  o probe de novo.'
      ],
      authBroken: false
    }
  }

  if (call.status !== 200) {
    return { kind: 'error', lines: [`  ${call.status} — resposta inesperada.`], authBroken: false }
  }

  if (body === null) {
    return {
      kind: 'error',
      lines: ['  200 com corpo que não é objeto JSON:', `    ${call.raw.slice(0, 200)}`],
      authBroken: false
    }
  }

  const type = asText(body['currently_playing_type'])
  const item = asRecord(body['item'])
  const device = asRecord(body['device'])
  const isPlaying = body['is_playing'] === true

  const deviceLines: string[] = []
  if (device !== null) {
    deviceLines.push(
      row('device', `${asText(device['type']) ?? '?'} — ${asText(device['name']) ?? '?'}`)
    )
    // Sessão privada é o único buraco permanente do arquivo: as faixas não vêm
    // aqui e também não aparecem em recently-played. Não tem como recuperar depois.
    if (device['is_private_session'] === true) {
      deviceLines.push(
        row('sessão privada', 'LIGADA — nada tocado assim entra no arquivo, nunca')
      )
    }
  }

  if (type === 'ad') {
    return {
      kind: 'unsupported',
      lines: ['  200, mas é intervalo de anúncio: sem item e sem identidade.', '', ...deviceLines],
      authBroken: false
    }
  }

  if (item === null) {
    return {
      kind: 'unsupported',
      lines: [
        `  200 com item nulo e currently_playing_type=${type ?? 'ausente'}.`,
        '  Estado opaco: o Spotify está tocando algo que não descreve.',
        '',
        ...deviceLines
      ],
      authBroken: false
    }
  }

  if (asText(item['type']) === 'episode') {
    return {
      kind: 'unsupported',
      lines: [
        `  200 — episódio de podcast: "${asText(item['name']) ?? '?'}".`,
        '  Episódio não tem artists[] nem album{}, então não vira play_event.',
        '',
        ...deviceLines
      ],
      authBroken: false
    }
  }

  const trackId = asText(item['id'])
  if (item['is_local'] === true || trackId === null) {
    return {
      kind: 'unsupported',
      lines: [
        `  200 — arquivo local: "${asText(item['name']) ?? '?'}".`,
        '  Sem track id, com metadados só no uri. Não vira play_event.',
        '',
        ...deviceLines
      ],
      authBroken: false
    }
  }

  const artists = asList(item['artists'])
    .map((a) => asText(asRecord(a)?.['name']))
    .filter((name): name is string => name !== null)
  const context = asRecord(body['context'])

  return {
    kind: 'track',
    lines: [
      row('tocando', `${asText(item['name']) ?? '?'} — ${artists.join(', ') || '?'}`),
      row(
        'progresso',
        `${clock(asNumber(body['progress_ms']))} / ${clock(asNumber(item['duration_ms']))}` +
          `   is_playing=${isPlaying}`
      ),
      ...deviceLines,
      row('contexto', asText(context?.['uri']) ?? 'nenhum (busca, rádio ou fila)'),
      '',
      '  Os escopos estão certos: o coletor consegue ler o player.'
    ],
    authBroken: false
  }
}

// ── comando ─────────────────────────────────────────────────────────────────

export async function runProbe(): Promise<void> {
  // Não usa `loadConfig()`: a Fase 0 roda antes de existir banco, e exigir
  // DATABASE_URL aqui transformaria o probe num teste de infraestrutura.
  const { clientId, clientSecret } = loadSpotifyCredentials()
  const refreshToken = process.env.COLLECTOR_SPOTIFY_REFRESH_TOKEN ?? ''

  out()
  out('playoff-collector — probe (Fase 0)')
  out()
  out(row('client_id', clientId))
  out(row('api', API_BASE))
  out()
  out(section('1. auth'))
  out()

  if (refreshToken === '') {
    throw abort(
      '  COLLECTOR_SPOTIFY_REFRESH_TOKEN não está definida.\n\n' +
        '  O coletor precisa de um refresh token próprio para renovar o access token\n' +
        '  sozinho por meses. Rode `npm run authorize` e cole a linha que ele imprime\n' +
        '  no .env da raiz do repo.',
      'sem refresh token configurado'
    )
  }

  const auth = await refreshAccessToken(clientId, clientSecret, refreshToken)
  out(`  POST ${TOKEN_URL}  (grant_type=refresh_token)`)
  out(`  →  ${auth.status ?? 'sem resposta'} em ${auth.rttMs}ms`)
  out()

  if (!auth.ok) {
    if (auth.kind === 'dead') {
      throw abort(
        '  400 invalid_grant — O REFRESH TOKEN NÃO VALE MAIS.\n\n' +
          '  Ele expirou ou foi revogado. Desde 20/07/2026 todo refresh token do\n' +
          '  Spotify vale seis meses contados da emissão, e renovar o access token não\n' +
          '  estende o prazo. Revogar o acesso em spotify.com/account/apps, ou trocar a\n' +
          '  senha da conta, dá exatamente a mesma resposta — não dá para distinguir\n' +
          '  as duas causas por aqui, e não faz diferença: a saída é a mesma.\n\n' +
          '  Não adianta tentar de novo. Isto nunca volta sozinho.\n\n' +
          '    o que fazer   rodar `npm run authorize` e trocar a linha\n' +
          '                  COLLECTOR_SPOTIFY_REFRESH_TOKEN no .env\n\n' +
          '  Enquanto isso o coletor não coleta, e o que não for coletado hoje não é\n' +
          '  recuperável depois (PRD §3).',
        'refresh token expirado ou revogado'
      )
    }

    if (auth.kind === 'client') {
      throw abort(
        `  ${auth.status} invalid_client — o par client_id/client_secret não confere com\n` +
          '  nenhuma app. Confira SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET no .env\n' +
          '  contra o dashboard do Spotify.\n\n' +
          `    error_description  ${auth.description}`,
        'client_id ou client_secret inválido'
      )
    }

    if (auth.kind === 'transport') {
      throw abort(
        `  Não deu para falar com o endpoint de token: ${auth.description}\n\n` +
          '  Isto NÃO é credencial morta — é rede. O probe não chegou a testar nada.\n' +
          '  Não rode `npm run authorize` por causa disto: tente de novo daqui a pouco.',
        'falha de rede no endpoint de token'
      )
    }

    throw abort(
      `  ${auth.status} inesperado do endpoint de token.\n\n` +
        `    error              ${auth.error || '(ausente)'}\n` +
        `    error_description  ${auth.description}\n\n` +
        '  5xx é transitório: tente de novo. Qualquer outra coisa merece uma olhada\n' +
        '  no dashboard antes de reautorizar.',
      `endpoint de token respondeu ${auth.status}`
    )
  }

  out(row('access token', `ok, vale ${auth.expiresIn ?? 3600}s`))
  out(row('escopos', auth.scope ?? '(o Spotify não informou)'))

  if (auth.rotated === null) {
    out(row('refresh token', 'o Spotify não rotacionou nesta troca'))
  } else {
    // Quando o Spotify rotaciona, o token antigo morre na hora — inclusive o que
    // ainda está no .env, que este comando acabou de queimar. Sem este aviso, o
    // probe deixa o sistema pior do que encontrou.
    out(row('refresh token', 'ROTACIONADO — o valor do .env acabou de morrer'))
    out()
    out('  O Spotify devolveu um refresh token novo e invalidou o anterior. Atualize o')
    out('  .env AGORA, antes de subir o coletor:')
    out()
    out(`COLLECTOR_SPOTIFY_REFRESH_TOKEN=${auth.rotated}`)
  }

  out()
  out('  O probe não tem como saber quando este token foi emitido — o Spotify não')
  out('  conta. Os seis meses correm desde o último `npm run authorize`; a data é')
  out('  sua para anotar.')
  out()

  // ── 2. audio-features ─────────────────────────────────────────────────────

  out(section('2. audio-features'))
  out()
  const features = await apiGet(`/audio-features/${PROBE_TRACK_ID}`, auth.accessToken)
  out(describe(features))
  out()

  let signalSource: 'spotify-analysis' | 'room-mic' = 'room-mic'

  if (features.status === 200) {
    signalSource = 'spotify-analysis'
    out('  200 — a app TEM audio-features. Grade de beats, seções e vetores de timbre')
    out('  por segmento disponíveis. A LIVE pode usar isso como fonte primária, com o')
    out('  microfone como complemento (PRD §4.1). Vale lembrar que é dado pré-calculado:')
    out('  descreve a gravação, não o que está saindo pela caixa.')
  } else if (features.status === 403) {
    out('  403 — sem audio-features. É o esperado: o acesso ficou restrito a apps que')
    out('  já tinham cota estendida concedida ou pendente em 27/11/2024, e ~20 meses')
    out('  depois não houve restauração nem substituto oficial.')
    out()
    out('  ISTO NÃO É UMA FALHA E NÃO MUDA NADA NO RESTO DO SISTEMA.')
    out('  PRD §4.2, ao pé da letra: "403 → seguir só com mic. Nada no restante deste')
    out('  PRD muda." A LIVE lê o microfone da sala — que, aliás, capta o que sai da')
    out('  caixa, incluindo a acústica do cômodo, e não a gravação abstrata.')
    out('  O coletor, o schema e o ARCHIVE não têm nada a ver com esta linha.')
  } else {
    out(`  ${features.status ?? 'sem resposta'} — nem 200 nem 403.`)
    out(`  ${features.transport ?? features.raw.slice(0, 200)}`)
    out()
    out('  Sem um 200 limpo não dá para contar com a análise do Spotify, então o probe')
    out('  registra room-mic. Isso não bloqueia nada (PRD §4.2).')
  }

  // ── 3. conta ──────────────────────────────────────────────────────────────

  out()
  out(section('3. conta'))
  out()
  const me = await apiGet('/me', auth.accessToken)
  out(describe(me))
  out()

  let accountLabel = '(não identificada)'
  const profile = asRecord(me.body)

  if (me.status === 200 && profile !== null) {
    const accountId = asText(profile['account_id'])
    const id = asText(profile['id'])
    accountLabel = accountId ?? id ?? '(sem identificador)'

    out(row('account_id', accountId ?? 'ausente nesta resposta — caindo para `id`'))
    out(row('id', id ?? '(ausente)'))
    out(row('display_name', asText(profile['display_name']) ?? '(ausente)'))
    out()

    if (accountId !== null) {
      out('  Chaveie por account_id: é público, imutável e estável pela vida da conta.')
      out('  É o que o Spotify passou a recomendar em mai/2026, no lugar de `id`.')
      out()
    }

    // Reportar o que veio, não o que a documentação antiga prometia. Imprimir
    // "Premium: sim" a partir de um campo que não existe mais seria pior do que
    // não imprimir nada — o probe existe para desfazer incerteza, não para criar.
    const product = asText(profile['product'])
    if (product === null) {
      out(row('product', 'AUSENTE — o campo saiu do perfil em fev/2026'))
      out()
      out('  Premium não é mais verificável por aqui, e o probe não vai fingir que é.')
      out('  Isso importa: desde fev/2026 uma app em Development Mode exige que o DONO')
      out('  tenha Premium ativo, e a app para de funcionar quando a assinatura vence.')
      out('  Confira em spotify.com/account. O sintoma seria 403 em tudo, de repente.')
    } else {
      out(row('product', `${product} (o campo veio, ao contrário do esperado)`))
    }
  } else if (me.status === 403) {
    out('  403 em /me — o usuário provavelmente não está na lista de 5 autorizados da')
    out('  app (dashboard → Settings → User Management), ou o Premium do dono venceu.')
  } else {
    out(`  Não deu para ler o perfil: ${me.transport ?? me.raw.slice(0, 200)}`)
  }

  // ── 4. player ─────────────────────────────────────────────────────────────

  out()
  out(section('4. player'))
  out()
  // additional_types=track,episode mesmo no probe: sem isso um episódio de podcast
  // volta como item nulo e o probe reportaria "nada tocando" com o podcast tocando.
  const player = await apiGet('/me/player?additional_types=track,episode', auth.accessToken)
  out(describe(player))
  out()
  const reading = readPlayer(player)
  out(row('PollResult', reading.kind))
  out()
  for (const line of reading.lines) out(line)

  // ── resumo ────────────────────────────────────────────────────────────────

  out()
  out(section('resumo'))
  out()
  out(row('auth', 'OK — refresh token vivo'))
  out(
    row(
      'audio-features',
      features.status === 200
        ? '200 — análise do Spotify disponível'
        : `${features.status ?? 'sem resposta'} — só microfone`
    )
  )
  out(row('conta', accountLabel))
  out(row('player', `${reading.kind}${reading.authBroken ? ' — ESCOPO OU AUTORIZAÇÃO' : ''}`))
  out()
  out('Registre no .env da raiz:')
  out()
  out(`SIGNAL_SOURCE=${signalSource}`)
  out()

  if (reading.authBroken) {
    throw abort(
      '  O coletor NÃO subiria: o token renova, mas não lê o player. Resolva o 403 da\n' +
        '  seção 4 antes de qualquer outra coisa — sem essa leitura não existe coleta,\n' +
        '  e sem coleta não existe ARCHIVE (PRD §3).',
      'sem acesso a /me/player'
    )
  }

  out('Fase 0 fechada. Próximo passo: `npm run migrate` e `npm start` (PRD §11, Fase 1).')
  out()
}
