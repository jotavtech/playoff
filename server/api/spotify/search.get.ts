/** GET /api/spotify/search?q=...&type=track&limit=12 — proxy de busca via Spotify API. */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string || '').trim()
  const type = (query.type as string) || 'track'
  const limit = Math.min(Number(query.limit) || 12, 30)

  if (!q) throw createError({ statusCode: 400, message: 'q required' })

  // O token vem no header Authorization: Bearer <token> enviado pelo cliente
  const authorization = getHeader(event, 'authorization')
  if (!authorization) throw createError({ statusCode: 401, message: 'Authorization required' })

  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}&market=BR`,
    { headers: { Authorization: authorization } }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw createError({ statusCode: res.status, message: (err as any)?.error?.message ?? 'search failed' })
  }

  return res.json()
})
