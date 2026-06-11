import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'

/**
 * Aura Mode (PRD Radiola §10.1) — após `delayMs` sem interação E com música
 * tocando, a UI some e o disco cresce até dominar a tela. Qualquer interação
 * encerra na hora. É o Playoff virando peça visual no monitor.
 */
export function useAuraMode (delayMs = 20000) {
  const cinematic = useCinematicStore()
  const music = useMusicVisualStore()
  let timer: ReturnType<typeof setTimeout> | null = null

  // No modo de demonstração, a Aura entra mais cedo para a vitrine ficar enxuta
  const demo = import.meta.client && new URLSearchParams(location.search).has('demo')
  const effectiveDelay = demo ? 7000 : delayMs

  function exit () {
    if (cinematic.auraMode) cinematic.setAuraMode(false)
  }

  function arm () {
    if (timer) clearTimeout(timer)
    exit()
    // Só faz sentido entrar em Aura se há som vivo e movimento permitido
    if (cinematic.reducedMotion) return
    timer = setTimeout(() => {
      if (music.isPlaying && music.currentTrack) cinematic.setAuraMode(true)
    }, effectiveDelay)
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
