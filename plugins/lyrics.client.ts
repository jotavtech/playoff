import { setLyricsProvider } from '~/composables/useLyrics'
import { useMusicVisualStore } from '~/stores/musicVisual'

/**
 * Registra a fonte de letras sincronizadas (lrclib.net via /api/lyrics).
 * Roda só no client. Sem isso, o karaokê nunca sai do estado vazio.
 */
export default defineNuxtPlugin(() => {
  setLyricsProvider(async (_trackId, title, artist) => {
    const music = useMusicVisualStore()
    const track = music.currentTrack
    const params = new URLSearchParams({ title, artist })
    if (track?.album) params.set('album', track.album)
    if (track?.durationMs) params.set('duration', String(Math.round(track.durationMs / 1000)))

    try {
      const res = await $fetch<{ lines: { at: number; text: string }[] | null }>(
        `/api/lyrics?${params.toString()}`
      )
      return res.lines ?? null
    } catch {
      return null
    }
  }, 'lrclib')
})
