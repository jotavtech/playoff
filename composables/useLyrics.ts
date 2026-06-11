import { ref, watch } from 'vue'
import { useMusicVisualStore } from '~/stores/musicVisual'

/**
 * Live Lyrics (PRD Radiola §10.8) — letras sincronizadas.
 *
 * A API pública do Spotify não expõe letras e o Genius exige chave + scraping,
 * então este composable nasce com um *provider plugável*: quando um endpoint de
 * letras estiver disponível, basta implementá-lo em `fetchLyrics`. Sem provider,
 * degrada em silêncio (available = false) e a camada não renderiza nada.
 */

export interface LyricLine {
  /** Tempo de início em ms. */
  at: number
  text: string
}

// Hook de provider — null por padrão (sem fonte de letras configurada).
type LyricsProvider = (trackId: string, title: string, artist: string) => Promise<LyricLine[] | null>
let provider: LyricsProvider | null = null

/** Registra um provedor de letras sincronizadas (ex.: endpoint próprio). */
export function setLyricsProvider (fn: LyricsProvider) {
  provider = fn
}

export function useLyrics () {
  const music = useMusicVisualStore()

  const lines = ref<LyricLine[]>([])
  const available = ref(false)
  const activeIndex = ref(-1)

  async function load (trackId: string, title: string, artist: string) {
    lines.value = []
    available.value = false
    activeIndex.value = -1
    if (!provider) return
    try {
      const result = await provider(trackId, title, artist)
      if (result && result.length) {
        lines.value = result
        available.value = true
      }
    } catch { /* provider falhou — segue sem letras */ }
  }

  // Recarrega ao trocar de faixa
  watch(() => music.currentTrack?.id, (id) => {
    const t = music.currentTrack
    if (id && t) load(id, t.title, t.artist)
  }, { immediate: true })

  // Sincroniza a linha ativa com o progresso
  watch(() => music.progressMs, (ms) => {
    if (!available.value) return
    let idx = -1
    for (let i = 0; i < lines.value.length; i++) {
      if (lines.value[i].at <= ms) idx = i
      else break
    }
    activeIndex.value = idx
  })

  return { lines, available, activeIndex }
}
