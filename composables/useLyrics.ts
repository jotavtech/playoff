import { computed, ref, watch } from 'vue'
import { useMusicVisualStore } from '~/stores/musicVisual'

export type LyricsStatus =
  | 'available'
  | 'unavailable'
  | 'loading'
  | 'error'
  | 'provider-required'

export interface LyricLine {
  at: number
  timeMs?: number
  text: string
}

export interface LyricsResult {
  status: LyricsStatus
  provider?: string
  lines: LyricLine[]
  message?: string
}

type LyricsProvider = (trackId: string, title: string, artist: string) => Promise<LyricLine[] | null>
let provider: LyricsProvider | null = null
let providerName = ''

export function setLyricsProvider (fn: LyricsProvider, name = 'custom') {
  provider = fn
  providerName = name
}

export function useLyrics () {
  const music = useMusicVisualStore()

  const lines = ref<LyricLine[]>([])
  const status = ref<LyricsStatus>('provider-required')
  const available = computed(() => status.value === 'available' && lines.value.length > 0)
  const activeIndex = ref(-1)
  const message = ref('Lyrics are not available for this track yet. Connect a lyrics provider or open the track on Spotify.')

  async function load (trackId: string, title: string, artist: string) {
    lines.value = []
    activeIndex.value = -1
    message.value = 'Lyrics are not available for this track yet. Connect a lyrics provider or open the track on Spotify.'

    if (!provider) {
      status.value = 'provider-required'
      return
    }

    status.value = 'loading'
    try {
      const result = await provider(trackId, title, artist)
      if (result && result.length) {
        lines.value = result.map(line => ({
          ...line,
          at: line.at ?? line.timeMs ?? 0,
          timeMs: line.timeMs ?? line.at ?? 0
        }))
        status.value = 'available'
        return
      }

      status.value = 'unavailable'
      message.value = 'Lyrics unavailable for this track. The signal is locked.'
    } catch {
      status.value = 'error'
      message.value = 'Lyrics signal lost. The player is using a safe fallback.'
    }
  }

  watch(() => music.currentTrack?.id, (id) => {
    const track = music.currentTrack
    if (id && track) load(id, track.title, track.artist)
    else {
      lines.value = []
      activeIndex.value = -1
      status.value = provider ? 'unavailable' : 'provider-required'
    }
  }, { immediate: true })

  watch(() => music.progressMs, (ms) => {
    if (!available.value) return
    let idx = -1
    for (let i = 0; i < lines.value.length; i++) {
      if (lines.value[i].at <= ms) idx = i
      else break
    }
    activeIndex.value = idx
  })

  const result = computed<LyricsResult>(() => ({
    status: status.value,
    provider: providerName || undefined,
    lines: lines.value,
    message: message.value
  }))

  return { lines, available, activeIndex, status, message, result, load }
}
