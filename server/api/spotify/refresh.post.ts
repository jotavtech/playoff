/** POST /api/spotify/refresh — renova o access_token usando o refresh_token. */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  setHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody(event)
  const refreshToken = body?.refresh_token as string | undefined

  if (!refreshToken) {
    throw createError({ statusCode: 400, message: 'refresh_token required' })
  }

  const basicAuth = Buffer.from(`${config.spotifyClientId}:${config.spotifyClientSecret}`).toString('base64')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  })

  if (!res.ok) {
    throw createError({ statusCode: 401, message: 'token refresh failed' })
  }

  return res.json()
})
