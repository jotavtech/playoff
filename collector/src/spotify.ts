import { log } from './log.js'
import type { PlayerSample, PollResult, TokenSet } from './types.js'

/**
 * Cliente HTTP do Spotify: ciclo de vida do token e `GET /v1/me/player`
 * normalizado em `PollResult`.
 *
 * Este arquivo trata o transporte como hostil, por uma razão específica: o
 * coletor roda por meses sob systemd, sem ninguém olhando, e **cada dia sem
 * coleta é dado perdido pra sempre** (PRD §3). Então toda resposta cai em um dos
 * casos previstos — nenhuma exceção sobe para derrubar o loop de poll.
 *
 * A única exceção que escapa de propósito é `ReauthorizationRequiredError`, e ela
 * escapa exatamente porque retry não conserta.
 *
 * Regra sem exceção neste arquivo: nem access token, nem refresh token, nem client
 * secret aparecem em log — nem truncados. O journal do systemd é texto plano.
 */

const API_BASE = 'https://api.spotify.com/v1'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'

/** Faixa de referência do probe da Fase 0 (PRD §4.2). */
const PROBE_TRACK_ID = '11dFghVXANMlKmJXsNCbNl'

/**
 * Um socket pendurado não pode segurar o tick. Com poll de 20s, uma requisição
 * que demore mais que isto já perdeu a janela: melhor registrar 'error' (que é
 * dado observado) do que atrasar o próximo poll em cascata.
 */
const PLAYER_TIMEOUT_MS = 10_000

/** Renovar token pode ser mais lento que ler o player; ainda assim é limitado. */
const TOKEN_TIMEOUT_MS = 15_000

/**
 * Margem de renovação proativa. O access token vale 3600s; renovar 60s antes
 * evita o caso em que a requisição sai com um token que expira em trânsito — que
 * viraria um 401 e um poll gasto. O 401 reativo continua existindo porque o token
 * também morre por revogação, não só por relógio.
 */
const REFRESH_SKEW_MS = 60_000

/**
 * Espera padrão quando o 429 vem sem `Retry-After`.
 *
 * 30s é a janela deslizante sobre a qual o Spotify calcula o limite: esperar menos
 * que isso reentra na mesma janela que acabou de estourar. Também é maior que o
 * poll de 20s, então o loop de fato pula um tick em vez de fingir que esperou.
 */
const DEFAULT_RETRY_AFTER_MS = 30_000

/** Piso: `Retry-After: 0` existe e retentar na hora é como um 429 vira ban. */
const MIN_RETRY_AFTER_MS = 1_000

/**
 * Teto. Valores absurdos (dezenas de milhares de segundos) são reportados como
 * penalidade após abuso sustentado. Um coletor de 3 req/min não deveria vê-los —
 * se vir, dormir 21 horas em silêncio é pior do que voltar e registrar os erros,
 * porque o silêncio é indistinguível de coletor morto. O aviso é logado.
 */
const MAX_RETRY_AFTER_MS = 3_600_000

/** Aviso proativo: 5 dos 6 meses de vida do refresh token. */
const REFRESH_TOKEN_WARN_AGE_MS = 150 * 24 * 60 * 60 * 1000

// ── erros ───────────────────────────────────────────────────────────────────

/**
 * Re-autorização interativa obrigatória. **Não é falha transitória.**
 *
 * Desde 20/07/2026 o refresh token expira 6 meses após ser emitido, e renovar o
 * access token não estende o relógio — é vida absoluta. Na expiração,
 * `POST /api/token` devolve HTTP 400 com `error: "invalid_grant"`. O mesmo 400
 * aparece quando o usuário revoga o app ou troca a senha: pela resposta, os dois
 * casos são indistinguíveis.
 *
 * Classe própria porque o loop de poll trata quase tudo como transitório. Sem
 * este tipo, o coletor tentaria de novo a cada 20 segundos, para sempre, em
 * silêncio — que é a forma mais cara de falhar neste projeto: um mês inteiro de
 * escuta some antes de alguém notar. O chamador tem que gritar, não retentar.
 */
export class ReauthorizationRequiredError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'ReauthorizationRequiredError'
  }
}

// ── contratos ───────────────────────────────────────────────────────────────

export type FetchLike = typeof globalThis.fetch

/** Metadado de observação do poll. Vai para `collector_poll`, não para `play_event`. */
export interface PollMeta {
  /**
   * Instante atribuído à amostra: recebimento **menos metade do round-trip**.
   *
   * A amostra já era velha quando chegou. O meio do round-trip é a melhor
   * estimativa de quando o servidor leu o estado, e essa correção derruba a folga
   * que a derivação precisa absorver de ~1s para ~250ms. `rttMs` fica gravado ao
   * lado para que a escolha possa ser revista depois — é impossível reconstruir
   * retroativamente.
   *
   * O chamador deve usar **este** instante tanto em `collector_poll.observed_at`
   * quanto em `play_event.observed_at`: as duas tabelas se cruzam por ele.
   */
  observedAt: Date
  /** Round-trip medido em relógio monotônico. `collector_poll.rtt_ms`. */
  rttMs: number
  /** `collector_poll.http_status`. `null` quando a requisição nem completou. */
  httpStatus: number | null
}

/**
 * `PollResult` com o metadado do poll junto.
 *
 * É atribuível a `PollResult`, então quem só quer o `kind` ignora o resto. O
 * metadado não entra em `types.ts` de propósito: `PollResult` é o contrato de
 * domínio, e rtt/status são detalhes de instrumentação.
 */
export type PlayerPoll = PollResult & PollMeta

export interface SpotifyClientOptions {
  clientId: string
  clientSecret: string
  refreshToken: string
  /**
   * Chamado quando o Spotify **rotaciona** o refresh token, com o valor novo.
   *
   * Persistir aqui não é opcional: o Spotify invalida o antigo no mesmo instante,
   * e um coletor que continuar com o valor velho morre na próxima renovação — dias
   * depois, longe da causa.
   */
  onRefreshToken?: (token: string) => void
  /**
   * Quando o refresh token atual foi emitido, se conhecido. Só serve para avisar
   * antes dos 6 meses, em vez de descobrir pela interrupção.
   */
  refreshTokenIssuedAt?: Date
  /** Injeção para teste. Ausente, resolve `globalThis.fetch` na hora da chamada. */
  fetch?: FetchLike
}

export interface SpotifyUser {
  id: string
  /**
   * `account_id` (maio/2026): identificador pseudônimo e imutável, que a própria
   * Spotify recomenda usar como chave no lugar de `id`. `null` se a resposta não
   * trouxer o campo.
   */
  accountId: string | null
  displayName: string | null
}

interface AuthorizedResponse {
  res: Response
  rttMs: number
  receivedAt: number
}

// ── cliente ─────────────────────────────────────────────────────────────────

export class SpotifyClient {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly onRefreshToken: ((token: string) => void) | undefined
  private readonly refreshTokenIssuedAt: Date | undefined
  private readonly fetchImpl: FetchLike | undefined

  private refreshToken: string
  private token: TokenSet | null = null
  /** Renovação em voo. Ver `getAccessToken`. */
  private refreshing: Promise<string> | null = null
  private warnedAboutTokenAge = false
  private privateSessionSeen = false

  constructor(opts: SpotifyClientOptions) {
    this.clientId = opts.clientId
    this.clientSecret = opts.clientSecret
    this.refreshToken = opts.refreshToken
    this.onRefreshToken = opts.onRefreshToken
    this.refreshTokenIssuedAt = opts.refreshTokenIssuedAt
    this.fetchImpl = opts.fetch
  }

  // ── token ─────────────────────────────────────────────────────────────────

  /**
   * Access token válido, renovando quando necessário.
   *
   * Lança `ReauthorizationRequiredError` quando o refresh token morreu, e `Error`
   * comum para falha transitória (rede, 5xx do accounts).
   */
  async getAccessToken(): Promise<string> {
    const current = this.token
    if (current !== null && current.expiresAt.getTime() - REFRESH_SKEW_MS > Date.now()) {
      return current.accessToken
    }

    // Uma renovação por vez. Duas em paralelo podem rotacionar o refresh token
    // duas vezes, e a resposta da primeira já nasce inválida — o coletor gravaria
    // um token morto achando que gravou o novo. O advisory lock em db.ts cobre
    // duas *instâncias*; isto cobre duas chamadas dentro da mesma.
    const inflight = this.refreshing
    if (inflight !== null) return inflight

    const started = this.refreshAccessToken().finally(() => {
      this.refreshing = null
    })
    this.refreshing = started
    return started
  }

  private async refreshAccessToken(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken
    })
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')

    let res: Response
    try {
      res = await this.doFetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          authorization: `Basic ${basic}`,
          'content-type': 'application/x-www-form-urlencoded'
        },
        body,
        signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS)
      })
    } catch (err) {
      throw new Error(`falha de rede ao renovar o access token: ${describeError(err)}`, {
        cause: err
      })
    }

    const payload = parseJson(await readBody(res))

    if (!res.ok) {
      // O accounts.spotify.com devolve `{error, error_description}` com `error`
      // string — formato diferente do `{error:{status,message}}` da api.
      const code = str(payload?.error) ?? ''
      const description = str(payload?.error_description) ?? ''

      if (res.status === 400 && code === 'invalid_grant') {
        throw new ReauthorizationRequiredError(
          'refresh token inválido (400 invalid_grant): expirou aos 6 meses, foi revogado, ' +
            'ou a senha da conta mudou. Retentar não resolve — rode `npm run authorize` ' +
            'e grave o novo COLLECTOR_SPOTIFY_REFRESH_TOKEN. ' +
            `Detalhe do Spotify: ${description || '(sem descrição)'}`
        )
      }
      if (res.status === 401) {
        throw new Error(
          'accounts.spotify.com recusou as credenciais do app (401): conferir ' +
            'SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET'
        )
      }
      throw new Error(
        `renovação do access token falhou: HTTP ${res.status} ${code}${description ? ` — ${description}` : ''}`
      )
    }

    const accessToken = str(payload?.access_token)
    if (accessToken === null) {
      throw new Error('resposta de token sem access_token')
    }
    const expiresInS = num(payload?.expires_in) ?? 3600
    const rotated = str(payload?.refresh_token)

    this.token = {
      accessToken,
      expiresAt: new Date(Date.now() + expiresInS * 1000),
      refreshToken: rotated
    }

    if (rotated !== null && rotated !== this.refreshToken) {
      this.refreshToken = rotated
      // Notifica antes de devolver o access token: o valor novo tem que estar
      // persistido antes de a próxima requisição sair. Se a persistência falhar,
      // seguimos com o token novo em memória mesmo assim — o antigo já está morto
      // do lado do Spotify, então parar aqui não recuperaria nada; só perderia
      // polls até o processo reiniciar.
      try {
        this.onRefreshToken?.(rotated)
      } catch (err) {
        log.error('falha ao persistir o refresh token rotacionado — reautorização vai ser necessária no próximo restart', { err })
      }
      log.info('refresh token rotacionado pelo Spotify')
    }

    log.debug('access token renovado', { expiresInS })
    this.warnIfRefreshTokenIsOld()
    return accessToken
  }

  /**
   * O aviso é uma vez por processo. O objetivo é aparecer no journal semanas
   * antes da parada, não a cada hora — a re-autorização é manual e agendável.
   */
  private warnIfRefreshTokenIsOld(): void {
    const issuedAt = this.refreshTokenIssuedAt
    if (issuedAt === undefined || this.warnedAboutTokenAge) return
    const ageMs = Date.now() - issuedAt.getTime()
    if (ageMs < REFRESH_TOKEN_WARN_AGE_MS) return
    this.warnedAboutTokenAge = true
    log.warn('refresh token perto do limite de 6 meses — reautorizar antes que o coletor pare', {
      issuedAt: issuedAt.toISOString(),
      ageDays: Math.floor(ageMs / 86_400_000)
    })
  }

  // ── player ────────────────────────────────────────────────────────────────

  /**
   * Um poll de `/me/player`, normalizado.
   *
   * Nunca lança, exceto `ReauthorizationRequiredError`. Em particular, falha de
   * rede e 5xx viram `{kind:'error'}` e **nunca** `idle`: registrar silêncio que
   * não foi observado fabrica um buraco no arquivo que depois é indistinguível de
   * abandono real (PRD §6 — "abandono" e "reentrada" são taxas).
   */
  async getPlayerState(): Promise<PlayerPoll> {
    // `additional_types=track,episode`: sem isto o Spotify mapeia episódio para o
    // tipo antigo e o poll volta com `item: null` — podcast vira silêncio
    // indistinguível de 204, e o buraco no arquivo fica sem explicação.
    //
    // `market` fica de fora de propósito: `PrivateUser.country` e `GET /markets`
    // sumiram em fev/2026, e o token já carrega o mercado do usuário.
    const url = `${API_BASE}/me/player?additional_types=track,episode`

    const startedAt = performance.now()
    let attempt: AuthorizedResponse
    try {
      attempt = await this.fetchAuthorized(url, PLAYER_TIMEOUT_MS)
    } catch (err) {
      if (err instanceof ReauthorizationRequiredError) throw err
      // Inclui o tempo de renovação de token, mas este rtt só é diagnóstico:
      // não existe amostra para corrigir.
      const rttMs = Math.round(performance.now() - startedAt)
      return {
        kind: 'error',
        status: null,
        message: describeError(err),
        observedAt: new Date(),
        rttMs,
        httpStatus: null
      }
    }

    const { res, rttMs, receivedAt } = attempt
    const meta: PollMeta = {
      observedAt: new Date(receivedAt - Math.round(rttMs / 2)),
      rttMs,
      httpStatus: res.status
    }

    // 204 tem corpo VAZIO, zero bytes: `res.json()` aqui lança. É o caso mais
    // comum da operação normal (nada tocando, device dormiu, sessão do Connect
    // expirou), então errar isto mata o coletor na primeira vez que a música para.
    if (res.status === 204) {
      await readBody(res)
      return { ...meta, kind: 'idle' }
    }

    if (res.status === 429) {
      // `Headers.get` é case-insensitive por spec; não precisa varrer variações.
      const retryAfterMs = parseRetryAfter(res.headers.get('retry-after'))
      await readBody(res)
      return { ...meta, kind: 'rate-limited', retryAfterMs }
    }

    const text = await readBody(res)
    const payload = parseJson(text)

    if (res.ok) {
      // 200 com corpo vazio existe na prática, e significa a mesma coisa que 204.
      if (text.trim() === '') return { ...meta, kind: 'idle' }
      // Corpo ilegível (portal cativo, proxy, HTML de erro da borda) é falha, não
      // silêncio: virar 'idle' aqui fabricaria ausência de escuta que nunca houve.
      if (payload === null) {
        return withMeta(
          { kind: 'error', status: res.status, message: 'corpo 200 não é JSON de objeto' },
          meta
        )
      }
      this.notePrivateSession(asRecord(payload.device)?.is_private_session === true)
      return withMeta(normalizePlayer(payload, meta.observedAt), meta)
    }

    const apiMessage = str(asRecord(payload?.error)?.message) ?? str(payload?.error) ?? ''

    // Bug antigo (spotify/web-api #721): alguns clientes devolvem
    // 400 "invalid id" enquanto um arquivo local toca, em vez do corpo. Não é
    // falha do coletor nem erro de código — é reprodução inarquivável, e tratar
    // como erro fatal derrubaria o loop toda vez que um mp3 local entrasse.
    if (res.status === 400 && /invalid id/i.test(apiMessage)) {
      return withMeta(
        { kind: 'unsupported', reason: 'arquivo local (HTTP 400 "invalid id")' },
        meta
      )
    }

    if (res.status === 403) {
      // 403 persistente num token que funcionava ontem quase nunca é bug de
      // código: desde fev/2026 o dono do app precisa de Premium ativo, e o app em
      // Dev Mode só atende 5 usuários autorizados.
      // O campo não pode se chamar `message`: `log` monta a linha com
      // `{...campos}` depois do texto, e um campo homônimo apagaria o aviso.
      log.warn('403 no player — conferir Premium do dono do app e a lista de usuários autorizados no dashboard', { detail: apiMessage })
    }

    return withMeta(
      { kind: 'error', status: res.status, message: apiMessage || `HTTP ${res.status}` },
      meta
    )
  }

  /**
   * Sessão privada: a reprodução não é reportada (204 constante) **e** fica fora
   * de `/me/player/recently-played`, então o buraco não é recuperável por
   * backfill nenhum. Só `/me/player` expõe o flag, e só enquanto ainda há um 200 —
   * daí valer um aviso na virada em vez de silêncio.
   */
  private notePrivateSession(active: boolean): void {
    if (active === this.privateSessionSeen) return
    this.privateSessionSeen = active
    if (active) {
      log.warn('dispositivo em sessão privada — a escuta deste período não é recuperável nem por backfill')
    }
  }

  // ── fase 0 ────────────────────────────────────────────────────────────────

  /**
   * Probe do PRD §4.2. Devolve o status HTTP cru, sem interpretar.
   *
   * `200` habilita a fonte de sinal `spotify-analysis`; `403` é o esperado para
   * qualquer app registrado depois de 27/11/2024 e **não bloqueia nada** — o LIVE
   * cai para mic ou para animação derivada de `progress_ms`.
   */
  async probeAudioFeatures(): Promise<number> {
    const { res } = await this.fetchAuthorized(
      `${API_BASE}/audio-features/${PROBE_TRACK_ID}`,
      PLAYER_TIMEOUT_MS
    )
    await readBody(res)
    return res.status
  }

  /**
   * `GET /me`. Confirma que o auth ainda funciona e devolve a identidade da conta.
   *
   * Não dá para checar Premium por aqui: `product` foi removido de `PrivateUser`
   * em fev/2026, junto com `country`, `email` e `followers`. A confirmação de
   * Premium da Fase 0 é manual, na conta — e importa porque desde fev/2026 um app
   * em Dev Mode para de funcionar se o Premium do dono vencer.
   */
  async getCurrentUser(): Promise<SpotifyUser> {
    const { res } = await this.fetchAuthorized(`${API_BASE}/me`, PLAYER_TIMEOUT_MS)
    const payload = parseJson(await readBody(res))

    if (!res.ok) {
      const message = str(asRecord(payload?.error)?.message) ?? ''
      throw new Error(`GET /me falhou: HTTP ${res.status}${message ? ` — ${message}` : ''}`)
    }

    const id = str(payload?.id)
    if (id === null) throw new Error('GET /me devolveu corpo sem id')

    return {
      id,
      accountId: str(payload?.account_id),
      displayName: str(payload?.display_name)
    }
  }

  // ── transporte ────────────────────────────────────────────────────────────

  private async fetchAuthorized(url: string, timeoutMs: number): Promise<AuthorizedResponse> {
    for (let attempt = 0; ; attempt += 1) {
      const accessToken = await this.getAccessToken()

      // Relógio monotônico: o de parede pode dar passo (NTP, resume de suspend) e
      // produziria rtt negativo, que envenenaria a correção de `observedAt`.
      const startedAt = performance.now()
      const res = await this.doFetch(url, {
        headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs)
      })
      const rttMs = Math.round(performance.now() - startedAt)
      const receivedAt = Date.now()

      // 401 é garantido de hora em hora (o access token vale 3600s) e também
      // aparece em revogação. Uma renovação e uma retentativa, nunca em laço: 401
      // repetido logo após renovar não é token velho, é credencial inválida — e
      // um laço aqui vira tempestade de requisição contra a cota compartilhada.
      if (res.status === 401 && attempt === 0) {
        await readBody(res)
        this.token = null
        continue
      }

      return { res, rttMs, receivedAt }
    }
  }

  /** Resolve o fetch na hora da chamada, para que um stub global também valha. */
  private doFetch(url: string, init: RequestInit): Promise<Response> {
    const impl = this.fetchImpl ?? globalThis.fetch
    return impl(url, init)
  }
}

// ── normalização ────────────────────────────────────────────────────────────

/**
 * Corpo de 200 → `PollResult`.
 *
 * A ordem dos testes importa: `item` e `is_playing` são independentes (anúncio
 * tem `is_playing: true` com `item: null`), e `currently_playing_type` pode
 * discordar de `item.type`. Cada caso vira um `kind` explícito — nenhum deles
 * pode virar `play_event`, e nenhum pode ser confundido com silêncio.
 */
function normalizePlayer(raw: Record<string, unknown>, observedAt: Date): PollResult {
  // `{}` acontece: alguns caminhos devolvem 200 com objeto vazio no lugar do 204.
  if (Object.keys(raw).length === 0) return { kind: 'idle' }

  const isPlaying = raw.is_playing === true
  const playingType = str(raw.currently_playing_type)
  const item = asRecord(raw.item)

  if (item === null) {
    if (playingType === 'ad') {
      return { kind: 'unsupported', reason: 'anúncio' }
    }
    if (playingType === 'episode') {
      // Chega aqui quando o `additional_types` não foi aceito. O poll fica
      // registrado como podcast em vez de sumir como silêncio.
      return { kind: 'unsupported', reason: 'episódio de podcast (sem item)' }
    }
    if (isPlaying) {
      return {
        kind: 'unsupported',
        reason: `reprodução sem item (currently_playing_type=${playingType ?? 'ausente'})`
      }
    }
    // Sem item e sem tocar: player vivo, nada rolando. É o mesmo que 204.
    return { kind: 'idle' }
  }

  if (playingType === 'ad') {
    // O anúncio às vezes vem com um objeto de fachada no lugar de null.
    return { kind: 'unsupported', reason: 'anúncio' }
  }

  const itemType = str(item.type)

  if (itemType === 'episode' || playingType === 'episode') {
    // EpisodeObject tem forma estruturalmente diferente: não existe `artists` nem
    // `album`. Tratar como faixa lança em todo podcast.
    const show = str(asRecord(item.show)?.name)
    return {
      kind: 'unsupported',
      reason: show === null ? 'episódio de podcast' : `episódio de podcast (${show})`
    }
  }

  if (itemType !== null && itemType !== 'track') {
    // `additional_types` só aceita 'track' e 'episode', e a própria Spotify avisa
    // que o parâmetro pode ser descontinuado e que o cliente deve olhar `type`.
    // Capítulo de audiolivro — e o que vier depois — cai aqui em vez de virar
    // exceção ou, pior, uma linha errada.
    return { kind: 'unsupported', reason: `tipo de item não suportado: ${itemType}` }
  }

  const trackId = str(item.id)
  if (trackId === null || item.is_local === true) {
    // Arquivo local: `id` e `href` nulos, uri `spotify:local:...`, álbum e
    // artistas presentes mas sem id. Não há o que cruzar com o resto do arquivo,
    // e `play_event.track_id` é `not null`.
    const uri = str(item.uri)
    return { kind: 'unsupported', reason: `arquivo local${uri === null ? '' : ` (${uri})`}` }
  }

  const durationMs = num(item.duration_ms)
  if (durationMs === null) {
    return { kind: 'unsupported', reason: 'faixa sem duration_ms' }
  }

  const progressMs = num(raw.progress_ms)
  if (progressMs === null) {
    // `progress_ms` é nullable **mesmo com `is_playing: true`** — acontece em
    // transição de faixa, episódio hospedado fora e estado 'unknown'.
    //
    // Default 0 seria pior do que perder a amostra: a derivação lê queda de
    // progresso como reinício de faixa, então um zero fabricado vira uma
    // reprodução extra no histórico da faixa que a pessoa mais ouve. Perder um
    // poll é recuperável no poll seguinte; contagem inflada não é.
    return { kind: 'unsupported', reason: 'faixa sem progress_ms' }
  }

  const artistIds: string[] = []
  const artistNames: string[] = []
  for (const entry of Array.isArray(item.artists) ? item.artists : []) {
    const artist = asRecord(entry)
    if (artist === null) continue
    // Os dois arrays são lidos por posição no ARCHIVE, então entram sempre em
    // par: string vazia onde o Spotify não deu o campo, nunca um array mais curto
    // que o outro.
    artistIds.push(str(artist.id) ?? '')
    artistNames.push(str(artist.name) ?? '')
  }

  const sample: PlayerSample = {
    observedAt,
    trackId,
    trackName: str(item.name) ?? '',
    artistIds,
    artistNames,
    albumId: str(asRecord(item.album)?.id),
    durationMs: Math.round(durationMs),
    progressMs: Math.round(progressMs),
    // 200 não quer dizer que está tocando: pausado com device vivo devolve 200 com
    // `is_playing: false` e progresso congelado.
    isPlaying,
    deviceType: str(asRecord(raw.device)?.type),
    // `context` é null em busca, autoplay/rádio, fila e arquivo local. Não é erro
    // e não pode impedir a gravação da linha.
    contextUri: str(asRecord(raw.context)?.uri),
    shuffle: bool(raw.shuffle_state),
    repeatState: str(raw.repeat_state)
  }

  return { kind: 'track', sample }
}

// ── utilitários ─────────────────────────────────────────────────────────────

function withMeta(result: PollResult, meta: PollMeta): PlayerPoll {
  return { ...meta, ...result }
}

/** `Retry-After` vem em SEGUNDOS. A forma de data HTTP é aceita por precaução. */
function parseRetryAfter(header: string | null): number {
  if (header === null) return DEFAULT_RETRY_AFTER_MS

  const raw = header.trim()
  let ms: number | null = null

  if (/^\d+$/.test(raw)) {
    ms = Number.parseInt(raw, 10) * 1000
  } else {
    const at = Date.parse(raw)
    if (Number.isFinite(at)) ms = at - Date.now()
  }

  if (ms === null || !Number.isFinite(ms)) return DEFAULT_RETRY_AFTER_MS
  if (ms > MAX_RETRY_AFTER_MS) {
    log.warn('Retry-After absurdo, truncando', { requestedMs: ms, cappedMs: MAX_RETRY_AFTER_MS })
    return MAX_RETRY_AFTER_MS
  }
  return Math.max(MIN_RETRY_AFTER_MS, Math.round(ms))
}

/**
 * Lê o corpo sempre, mesmo quando não interessa: em 4xx/5xx e 204 o corpo não
 * consumido segura o socket no pool do undici até o timeout.
 */
async function readBody(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

function parseJson(text: string): Record<string, unknown> | null {
  if (text.trim() === '') return null
  try {
    return asRecord(JSON.parse(text))
  } catch {
    return null
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function bool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    // `AbortSignal.timeout` produz TimeoutError com mensagem genérica; sem o nome,
    // o journal não distingue timeout de DNS caído.
    return `${err.name}: ${err.message}`
  }
  return String(err)
}
