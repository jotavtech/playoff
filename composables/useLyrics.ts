import { computed } from 'vue'
import { useMusicVisualStore } from '~/stores/musicVisual'
import type { LyricLine, LyricsPayload } from '~/types/lyrics'
import { activeLyric } from '~/utils/lyrics'

export type { LyricLine } from '~/types/lyrics'
type Status = 'available' | 'unavailable' | 'loading' | 'error' | 'provider-required'
type State = { status: Status; payload: LyricsPayload | null; message: string }

const empty: State = { status: 'unavailable', payload: null, message: 'Escolha uma faixa para ver a letra.' }

export function useLyrics () {
  const music = useMusicVisualStore()
  const state = useState<State>('track-lyrics', () => empty)
  const retryCount = useState('track-lyrics-retry', () => 0)
  const local = computed(() => music.currentTrack?.source === 'local')
  const synced = computed(() => local.value && music.localLyrics.length > 0)
  const lines = computed<LyricLine[]>(() => {
    if (local.value) return music.localLyrics
    const lyrics = state.value.payload
    if (lyrics?.kind === 'synced') return lyrics.lines.filter(line => line.text)
    if (lyrics?.kind === 'plain') return lyrics.text.split(/\r?\n/).filter(line => line.trim()).map(text => ({ at: 0, text }))
    return []
  })
  const status = computed<Status>(() => local.value ? (synced.value ? 'available' : 'unavailable') : state.value.status)
  const message = computed(() => local.value ? 'Adicione um arquivo .lrc para cantar com a letra sincronizada.' : state.value.message)
  const available = computed(() => status.value === 'available' && lines.value.length > 0)
  const activeIndex = computed(() => synced.value ? activeLyric(lines.value, music.progressMs) : -1)
  const result = computed(() => ({ status: status.value, provider: local.value ? 'LRC' : 'LRCLIB', lines: lines.value, message: message.value }))
  const retry = () => { retryCount.value++ }

  return { lines, available, activeIndex, status, message, result, synced, retry }
}

export function startLyrics () {
  const music = useMusicVisualStore()
  const state = useState<State>('track-lyrics', () => empty)
  const retryCount = useState('track-lyrics-retry', () => 0)
  const cache = new Map<string, LyricsPayload>()

  watch([() => music.currentTrack, retryCount], async ([track], _, onCleanup) => {
    state.value = empty
    if (!track || track.source === 'local') return
    const params = new URLSearchParams({
      title: track.title, artist: track.lyricsArtist ?? track.artist, album: track.album,
      duration: String(Math.round((track.catalogDurationMs ?? track.durationMs) / 1000))
    })
    const key = params.toString()
    const controller = new AbortController()
    onCleanup(() => controller.abort())
    state.value = { status: 'loading', payload: null, message: 'Carregando letra…' }
    try {
      const payload = cache.get(key) ?? await $fetch<LyricsPayload>('/api/lyrics', { query: Object.fromEntries(params), signal: controller.signal })
      if (controller.signal.aborted) return
      if (cache.size >= 64) cache.delete(cache.keys().next().value!)
      if (payload.kind !== 'missing') cache.set(key, payload)
      const found = payload.kind === 'synced' || payload.kind === 'plain'
      state.value = {
        status: found ? 'available' : 'unavailable', payload,
        message: payload.kind === 'instrumental' ? 'Esta faixa é instrumental.' : found ? '' : 'Nenhuma letra encontrada para esta versão.'
      }
    } catch {
      if (!controller.signal.aborted) state.value = { status: 'error', payload: null, message: 'O serviço de letras está indisponível.' }
    }
  }, { immediate: true })
}
