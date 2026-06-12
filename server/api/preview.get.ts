/**
 * GET /api/preview?title=...&artist=... — fallback de preview de 30s.
 *
 * O Spotify descontinuou o preview_url para apps novos (fim de 2024), então
 * contas free ficavam sem áudio nenhum. A iTunes Search API é pública, sem
 * auth, e cobre praticamente o mesmo catálogo com previews de 30s.
 */

const cache = new Map<string, { url: string | null; at: number }>()
const TTL = 6 * 60 * 60 * 1000

/** Normaliza para comparação: minúsculas, sem acentos, sem pontuação. */
function norm (s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)|\[.*?\]/g, ' ')   // "(Remastered)" etc. não contam
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const title = String(q.title ?? '').trim()
  const artist = String(q.artist ?? '').trim()
  if (!title) throw createError({ statusCode: 400, message: 'title required' })

  const key = `${norm(artist)}|${norm(title)}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return { previewUrl: hit.url }

  const term = encodeURIComponent(`${artist} ${title}`.trim())
  let url: string | null = null

  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=8`
    )
    if (res.ok) {
      const data = await res.json() as { results?: Array<{ trackName?: string; artistName?: string; previewUrl?: string }> }
      const results = (data.results ?? []).filter(r => r.previewUrl)
      const wantT = norm(title)
      const wantA = norm(artist)

      const best =
        results.find(r =>
          norm(r.trackName ?? '') === wantT &&
          (!wantA || norm(r.artistName ?? '').includes(wantA) || wantA.includes(norm(r.artistName ?? '')))
        ) ??
        results.find(r => norm(r.trackName ?? '').includes(wantT) || wantT.includes(norm(r.trackName ?? ''))) ??
        null

      url = best?.previewUrl ?? null
    }
  } catch { /* iTunes fora do ar → sem preview, visual segue no synth */ }

  cache.set(key, { url, at: Date.now() })
  return { previewUrl: url }
})
