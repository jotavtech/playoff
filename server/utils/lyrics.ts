import { parseLrc } from '../../utils/lyrics.ts'
import type { LyricsPayload } from '../../types/lyrics.ts'

interface Candidate {
  trackName?: string
  artistName?: string
  albumName?: string
  duration?: number
  instrumental?: boolean
  syncedLyrics?: string | null
  plainLyrics?: string | null
}
interface Song { title: string; artist: string; album: string; duration: number }

const normalize = (s = '') => s.normalize('NFKD').replace(/\p{Mark}/gu, '').toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, ' ').trim()

function format (row: Candidate): LyricsPayload {
  const lines = row.syncedLyrics ? parseLrc(row.syncedLyrics) : []
  if (lines.length) return { kind: 'synced', lines }
  if (row.plainLyrics?.trim()) return { kind: 'plain', text: row.plainLyrics.trim() }
  return { kind: row.instrumental ? 'instrumental' : 'missing' }
}

export async function lookupLyrics (song: Song, request = fetch): Promise<LyricsPayload> {
  const params = new URLSearchParams({ track_name: song.title, artist_name: song.artist })
  const headers = { 'User-Agent': 'Playoff (https://playoff-eight.vercel.app)' }
  // Shared timeout for the exact lookup and fallback.
  const options = { headers, signal: AbortSignal.timeout(6500) }
  let exact: LyricsPayload = { kind: 'missing' }
  if (song.album && song.duration > 0) {
    const signature = new URLSearchParams(params)
    signature.set('album_name', song.album)
    signature.set('duration', String(Math.round(song.duration)))
    const response = await request('https://lrclib.net/api/get-cached?' + signature, options)
    if (response.ok) {
      exact = format(await response.json() as Candidate)
      if (exact.kind === 'synced' || exact.kind === 'instrumental') return exact
    } else if (response.status !== 404) throw new Error('LRCLIB ' + response.status)
  }
  const response = await request('https://lrclib.net/api/search?' + params, options)
  if (!response.ok) throw new Error('LRCLIB ' + response.status)
  const matches = (await response.json() as Candidate[]).filter(row =>
    normalize(row.trackName) === normalize(song.title) &&
    normalize(row.artistName) === normalize(song.artist) &&
    (song.duration <= 0 || (typeof row.duration === 'number' && Math.abs(row.duration - song.duration) <= 3))
  ).sort((a, b) => Number(normalize(b.albumName) === normalize(song.album)) -
    Number(normalize(a.albumName) === normalize(song.album)))
  if (exact.kind === 'plain') return exact
  for (const row of matches) {
    const result = format(row)
    if (result.kind !== 'missing') return result
  }
  return { kind: 'missing' }
}
