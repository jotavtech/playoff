import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'

/**
 * Atalhos globais (PRD §5.7.1 e §5.7.8):
 * C — Cinema View · Space — play/pause · S / Cmd+K — Command Center
 * Q — fila (Fase 3) · Esc — sai do modo · Cmd+Shift+D — diagnostics
 */
export function useKeyboardShortcuts () {
  const cinematic = useCinematicStore()
  const music = useMusicVisualStore()

  function onKeydown (e: KeyboardEvent) {
    const target = e.target as HTMLElement
    const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault()
      cinematic.toggleDiagnostics()
      return
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      cinematic.toggleCommandCenter()
      return
    }

    if (typing) {
      if (e.key === 'Escape' && cinematic.commandCenterOpen) cinematic.toggleCommandCenter()
      return
    }

    switch (e.key) {
      case 'Escape':
        // Prioridade (SPEC 09): aura → command center → diagnostics → imersivo
        if (cinematic.auraMode) cinematic.setAuraMode(false)
        else if (cinematic.commandCenterOpen) cinematic.toggleCommandCenter()
        else if (cinematic.diagnosticsOpen) cinematic.toggleDiagnostics()
        else cinematic.exitImmersive()
        break
      case ' ':
        e.preventDefault()
        music.togglePlay()
        break
      case 'c':
      case 'C':
        cinematic.toggleCinemaView()
        break
      case 's':
      case 'S':
        cinematic.toggleCommandCenter()
        break
      case 'w':
      case 'W':
        cinematic.toggleWallpaperMode()
        break
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
    onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
  })
}
