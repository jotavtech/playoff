import { randomBytes } from 'node:crypto'

/** GET /auth/spotify/login — redireciona para o OAuth do Spotify. */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const state = randomBytes(16).toString('hex')

  // Anti-CSRF: grava o state num cookie de curta duração
  setCookie(event, 'spotify_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 300,
    path: '/'
  })

  const scopes = [
    'user-read-private',
    'user-read-email',
    'streaming',
    'user-modify-playback-state',
    'user-read-playback-state',
    'user-read-currently-playing',
    'user-library-read',
    'user-top-read',
    'user-read-recently-played'
  ].join(' ')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.spotifyClientId,
    scope: scopes,
    redirect_uri: config.spotifyRedirectUri,
    state
  })

  return sendRedirect(event, `https://accounts.spotify.com/authorize?${params}`)
})
