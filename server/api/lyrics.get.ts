/**
 * GET /api/lyrics?title=...&artist=...&album=...&duration=...
 * Proxy para o lrclib.net (letras sincronizadas LRC, grátis e sem auth).
 * Faz o parse do formato LRC em linhas { at: ms, text } prontas pro karaokê.
 * Retorna { lines: [...] } ou { lines: null } quando não há letra sincronizada.
 */

interface LrcLibResult {
  syncedLyrics?: string | null
  plainLyrics?: string | null
  duration?: number | null
}

/** Converte "[mm:ss.xx] texto" em linhas com timestamp em ms. */
function parseLrc (lrc: string): { at: number; text: string }[] {
  const out: { at: number; text: string }[] = []
  const lineRe = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g

  for (const raw of lrc.split(/\r?\n/)) {
    lineRe.lastIndex = 0
    const stamps: number[] = []
    let m: RegExpExecArray | null
    let lastIndex = 0
    // Uma linha pode ter múltiplos timestamps (ex.: refrão repetido)
    while ((m = lineRe.exec(raw)) !== null) {
      const min = Number(m[1])
      const sec = Number(m[2])
      const frac = m[3] ? Number(m[3].padEnd(3, '0')) : 0
      stamps.push(min * 60_000 + sec * 1_000 + frac)
      lastIndex = lineRe.lastIndex
    }
    if (stamps.length === 0) continue
    const text = raw.slice(lastIndex).trim()
    for (const at of stamps) out.push({ at, text })
  }

  out.sort((a, b) => a.at - b.at)
  return out
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const title = (query.title as string || '').trim()
  const artist = (query.artist as string || '').trim()
  const album = (query.album as string || '').trim()
  const duration = Number(query.duration) || 0

  if (!title || !artist) {
    throw createError({ statusCode: 400, message: 'title and artist required' })
  }

  const params = new URLSearchParams({
    track_name: title,
    artist_name: artist
  })
  if (album) params.set('album_name', album)
  if (duration > 0) params.set('duration', String(Math.round(duration)))

  try {
    const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      headers: { 'User-Agent': 'Playoff (https://playoff-eight.vercel.app)' }
    })

    if (!res.ok) {
      // 404 = sem letra para essa faixa → estado vazio honesto
      return { lines: null }
    }

    const data = (await res.json()) as LrcLibResult

    if (data.syncedLyrics) {
      const lines = parseLrc(data.syncedLyrics)
      if (lines.length) return { lines, synced: true }
    }

    // Fallback: plain lyrics distributed across the track duration
    if (data.plainLyrics) {
      const trackDuration = (duration > 0 ? duration : (data.duration ?? 180)) * 1000
      const rawLines = data.plainLyrics
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('['))
      if (rawLines.length > 0) {
        const step = Math.floor(trackDuration / rawLines.length)
        const lines = rawLines.map((text, i) => ({ at: i * step, text }))
        return { lines, synced: false }
      }
    }

    return { lines: null }
  } catch {
    return { lines: null }
  }
})
