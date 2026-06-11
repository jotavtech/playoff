import { useCinematicStore } from '~/stores/cinematic'
import type { PerformanceTier } from '~/types/cinematic'

/**
 * Detecta capacidades do dispositivo e preferências do usuário, e alimenta
 * a CinematicStore: prefers-reduced-motion (PRD critério técnico obrigatório)
 * e Adaptive Performance Mode (PRD §5.7.10).
 */
export function usePlatformAdaptation () {
  const cinematic = useCinematicStore()

  function detectTier (): PerformanceTier {
    const nav = navigator as Navigator & { deviceMemory?: number }
    const memory = nav.deviceMemory ?? 8
    const cores = navigator.hardwareConcurrency ?? 4

    let webgl = false
    try {
      const canvas = document.createElement('canvas')
      webgl = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
    } catch { webgl = false }

    if (!webgl || memory <= 2 || cores <= 2) return 'low'
    if (memory <= 4 || cores <= 4) return 'medium'
    if (memory >= 8 && cores >= 8 && window.devicePixelRatio >= 2) return 'ultra'
    return 'high'
  }

  onMounted(() => {
    cinematic.setPerformanceTier(detectTier())

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    cinematic.setReducedMotion(motionQuery.matches)
    const onMotionChange = (e: MediaQueryListEvent) => cinematic.setReducedMotion(e.matches)
    motionQuery.addEventListener('change', onMotionChange)

    onBeforeUnmount(() => motionQuery.removeEventListener('change', onMotionChange))
  })
}
