import { useCinematicStore } from '~/stores/cinematic'

/**
 * SPEC 09 — Back do navegador fecha overlays / modos imersivos em vez de
 * sair da página. Empurra uma entrada sentinela no histórico quando o 1º
 * overlay abre e a consome quando tudo fecha (via ESC/botão).
 *
 * Seguro para o vue-router: a sentinela só existe enquanto há overlay aberto;
 * sem overlay, o popstate não é interceptado e a navegação normal segue
 * (ex.: sair de uma /room). Não altera URL nem cria rotas.
 */
export function useOverlayHistory () {
  const cinematic = useCinematicStore()
  let sentinelActive = false
  let closingFromPop = false

  function onPopState () {
    // Só intercepta se a sentinela é nossa E ainda há overlay aberto.
    if (sentinelActive && cinematic.hasOpenOverlay) {
      closingFromPop = true
      sentinelActive = false
      cinematic.closeAllOverlays()
      setTimeout(() => { closingFromPop = false }, 0)
    }
  }

  onMounted(() => {
    if (!import.meta.client) return

    window.addEventListener('popstate', onPopState)

    const stop = watch(() => cinematic.hasOpenOverlay, (open) => {
      if (open && !sentinelActive) {
        sentinelActive = true
        try { history.pushState({ ...history.state, playoffOverlay: true }, '') } catch { /* noop */ }
      } else if (!open && sentinelActive && !closingFromPop) {
        // Fechado por ESC/botão → consome a sentinela do histórico.
        sentinelActive = false
        try {
          if (history.state && (history.state as Record<string, unknown>).playoffOverlay) history.back()
        } catch { /* noop */ }
      }
    })

    onBeforeUnmount(() => {
      window.removeEventListener('popstate', onPopState)
      stop()
    })
  })
}
