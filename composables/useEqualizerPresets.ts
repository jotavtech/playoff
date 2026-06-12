import { computed, ref } from 'vue'
import { useAudioAnalyser } from '~/composables/useAudioAnalyser'

/**
 * Equalizer Presets (SPEC 07).
 *
 * Honestidade: os ganhos só afetam o áudio quando há um elemento real grampeado
 * (o preview de 30s). Na reprodução completa via Spotify SDK (EME/DRM) o grafo
 * não é acessível — o preset fica salvo e passa a valer no próximo preview.
 *
 * Bandas (Hz): [60, 230, 910, 3000, 14000]. Ganhos em dB.
 */
export interface EqPreset {
  key: string
  label: string
  gains: number[]
}

export const EQ_PRESETS: EqPreset[] = [
  { key: 'flat', label: 'Flat', gains: [0, 0, 0, 0, 0] },
  { key: 'bass-boost', label: 'Bass Boost', gains: [6, 4, 1, 0, 0] },
  { key: 'vocal-boost', label: 'Vocal Boost', gains: [-2, 0, 3, 4, 1] },
  { key: 'karaoke', label: 'Karaoke', gains: [-3, -2, 2, 3, -1] },
  { key: 'rock', label: 'Rock', gains: [4, 2, -1, 2, 3] },
  { key: 'funk', label: 'Funk', gains: [3, 2, 0, 2, 1] },
  { key: 'electronic', label: 'Electronic', gains: [5, 1, -1, 1, 4] },
  { key: 'night', label: 'Night Mode', gains: [-2, -1, 0, -1, -3] },
  { key: 'bar', label: 'Bar Speaker', gains: [4, 1, -2, 2, 3] },
  { key: 'phone', label: 'Phone Speaker', gains: [-6, -2, 2, 3, -2] }
]

const STORAGE_KEY = 'playoff:eq-preset:v1'
const activeKey = ref<string>('flat')
let initialized = false

export function useEqualizerPresets () {
  const analyser = useAudioAnalyser()

  function apply (key: string) {
    const preset = EQ_PRESETS.find(p => p.key === key) ?? EQ_PRESETS[0]
    activeKey.value = preset.key
    analyser.setEqGains(preset.gains)
    if (import.meta.client) {
      try { localStorage.setItem(STORAGE_KEY, preset.key) } catch { /* storage off → preset ainda funciona na sessão */ }
    }
  }

  /** Carrega o preset salvo e injeta os ganhos no analyser (idempotente). */
  function init () {
    if (initialized || !import.meta.client) return
    initialized = true
    let saved = 'flat'
    try { saved = localStorage.getItem(STORAGE_KEY) || 'flat' } catch { /* noop */ }
    apply(EQ_PRESETS.some(p => p.key === saved) ? saved : 'flat')
  }

  const activePreset = computed(() => EQ_PRESETS.find(p => p.key === activeKey.value) ?? EQ_PRESETS[0])

  /** O EQ afeta o áudio neste instante? (preview de 30s grampeado) */
  function isAffectingAudio (): boolean {
    return analyser.eqAvailable()
  }

  return { presets: EQ_PRESETS, activeKey, activePreset, apply, init, isAffectingAudio }
}
