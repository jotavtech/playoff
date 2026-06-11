import { useCinematicStore } from '~/stores/cinematic'

/**
 * Smart Idle (PRD §5.11): sem interação por `delayMs`, a UI recua e as barras
 * assumem protagonismo. Mouse move ou tecla traz a UI de volta.
 */
export function useSmartIdle (delayMs = 8000) {
  const cinematic = useCinematicStore()
  let timer: ReturnType<typeof setTimeout> | null = null

  function arm () {
    if (timer) clearTimeout(timer)
    if (cinematic.smartIdle) cinematic.setSmartIdle(false)
    timer = setTimeout(() => cinematic.setSmartIdle(true), delayMs)
  }

  onMounted(() => {
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'pointerdown', 'touchstart', 'wheel']
    events.forEach(e => window.addEventListener(e, arm, { passive: true }))
    arm()

    onBeforeUnmount(() => {
      events.forEach(e => window.removeEventListener(e, arm))
      if (timer) clearTimeout(timer)
    })
  })
}
