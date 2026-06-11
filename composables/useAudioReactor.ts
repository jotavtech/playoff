import { useAudioAnalyser } from '~/composables/useAudioAnalyser'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useCinematicStore } from '~/stores/cinematic'

/**
 * Audio Reactor (PRD Radiola §5.6, §4.5) — bridge global.
 *
 * Roda enquanto o app vive. Mantém o motor de análise ativo e converte cada
 * beat detectado em pulso do disco (music.pulseBeat → aberração cromática,
 * micro-scale do vinil). É a batida da música chegando na cena inteira.
 */
export function useAudioReactor () {
  if (!import.meta.client) return

  const analyser = useAudioAnalyser()
  const music = useMusicVisualStore()
  const cinematic = useCinematicStore()

  let unsub: (() => void) | null = null

  onMounted(() => {
    analyser.start()
    unsub = analyser.subscribe((_frame, beat) => {
      if (beat && !cinematic.reducedMotion) music.pulseBeat()
    })
  })

  onBeforeUnmount(() => {
    unsub?.()
    analyser.stop()
  })
}
