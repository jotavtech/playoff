/** GET /auth/spotify/callback — troca o code por tokens e redireciona para o frontend. */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)

  const code = query.code as string | undefined
  const state = query.state as string | undefined
  const error = query.error as string | undefined

  if (error || !code) {
    return sendRedirect(event, `/?login_error=${error ?? 'missing_code'}`)
  }

  // Valida state anti-CSRF
  const savedState = getCookie(event, 'spotify_oauth_state')
  deleteCookie(event, 'spotify_oauth_state')
  if (!savedState || savedState !== state) {
    return sendRedirect(event, '/?login_error=state_mismatch')
  }

  // Troca code por tokens (server-side, seguro)
  const basicAuth = Buffer.from(`${config.spotifyClientId}:${config.spotifyClientSecret}`).toString('base64')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.spotifyRedirectUri
    })
  })

  if (!res.ok) {
    return sendRedirect(event, '/?login_error=token_exchange_failed')
  }

  const data = await res.json()

  // Passa os tokens ao frontend via query params da URL de redirect.
  // O frontend os lê imediatamente e os move para localStorage — os parâmetros
  // ficam expostos apenas no histórico do browser do próprio usuário.
  const params = new URLSearchParams({
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? '',
    expires_in: String(data.expires_in),
    login: 'ok'
  })

  return sendRedirect(event, `/#${params}`)
})
