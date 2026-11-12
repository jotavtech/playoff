import { lookupLyrics } from '../utils/lyrics'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const clean = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, 250) : ''
  const title = clean(query.title)
  const artist = clean(query.artist)
  const album = clean(query.album)
  const seconds = Number(clean(query.duration))
  const duration = Number.isFinite(seconds) && seconds > 0 ? seconds : 0
  if (!title || !artist) throw createError({ statusCode: 400, message: 'title and artist required' })

  try {
    const result = await lookupLyrics({ title, artist, album, duration })
    setHeader(event, 'Cache-Control', result.kind === 'missing'
      ? 'public, max-age=120'
      : 'public, max-age=3600, stale-while-revalidate=86400')
    return result
  } catch {
    throw createError({ statusCode: 502, message: 'Lyrics provider unavailable' })
  }
})
