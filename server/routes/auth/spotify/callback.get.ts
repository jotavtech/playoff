/** GET /auth/spotify/callback — troca o code por tokens e redireciona para o frontend. */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  setHeader(event, 'Cache-Control', 'no-store')
  const query = getQuery(event)

  const code = query.code as string | undefined
  const state = query.state as string | undefined
  const error = query.error as string | undefined

  // Valida state anti-CSRF
  const savedState = getCookie(event, 'spotify_oauth_state')
  deleteCookie(event, 'spotify_oauth_state', { path: '/' })
  if (!savedState || savedState !== state) {
    return sendRedirect(event, '/?login_error=state_mismatch')
  }

  if (error || typeof code !== 'string') return sendRedirect(event, '/?login_error=' + (error === 'access_denied' ? 'access_denied' : 'missing_code'))

  // Troca code por tokens (server-side, seguro)
  const basicAuth = Buffer.from(`${config.spotifyClientId}:${config.spotifyClientSecret}`).toString('base64')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.spotifyRedirectUri
    })
  }).catch(() => null)

  if (!res?.ok) {
    return sendRedirect(event, '/?login_error=token_exchange_failed')
  }

  const data = await res.json()

  // O frontend consome o fragmento e o remove imediatamente do histórico.
  const params = new URLSearchParams({
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? '',
    expires_in: String(data.expires_in),
    login: 'ok'
  })

  return sendRedirect(event, `/#${params}`)
})
