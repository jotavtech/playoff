/** Search tracks within the limit supported by Spotify Development Mode. */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 250) : ''
  const limit = Math.max(1, Math.min(10, Math.trunc(Number(query.limit)) || 10))
  if (!q) throw createError({ statusCode: 400, message: 'q required' })

  const authorization = getHeader(event, 'authorization')
  if (!authorization?.startsWith('Bearer ')) throw createError({ statusCode: 401, message: 'Authorization required' })

  const params = new URLSearchParams({ q, type: 'track', limit: String(limit) })
  const res = await fetch('https://api.spotify.com/v1/search?' + params, {
    headers: { Authorization: authorization }, signal: AbortSignal.timeout(8000)
  }).catch(() => { throw createError({ statusCode: 502, message: 'Spotify unavailable' }) })

  if (!res.ok) {
    const retryAfter = Number(res.headers.get('Retry-After'))
    if (Number.isFinite(retryAfter) && retryAfter > 0) setHeader(event, 'Retry-After', retryAfter)
    throw createError({ statusCode: res.status, message: 'Spotify search failed' })
  }
  setHeader(event, 'Cache-Control', 'private, no-store')
  return res.json()
})
