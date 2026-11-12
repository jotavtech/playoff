<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useAuth } from '~/composables/useAuth'
import { useAudioReactor } from '~/composables/useAudioReactor'
import { useRoom } from '~/composables/useRoom'
import { loadGoWithTheFlow } from '~/composables/useDemoSignal'
import KaraokeMode from '~/components/karaoke/KaraokeMode.vue'
import EqualizerPanel from '~/components/EqualizerPanel.vue'
import { usePlayerStore } from '~/stores/player'
import { useSpotifyPlayer } from '~/composables/useSpotifyPlayer'
import BottomNav from '~/components/shell/BottomNav.vue'
import MiniPlayer from '~/components/shell/MiniPlayer.vue'

const player = usePlayerStore()
const { syncVolume, destroy } = useSpotifyPlayer()
watch([() => player.muted, () => player.volume], syncVolume)
onBeforeUnmount(destroy)

const cinematic = useCinematicStore()
const { boot } = useAuth()
const { restoreSession: restoreRoomSession } = useRoom()

usePlatformAdaptation()
useSmartIdle()
useKeyboardShortcuts()
useOverlayHistory()
useAudioReactor()

onMounted(async () => {
  cinematic.restoreSession()
  // Reconecta à sala persistida — a sessão de sala sobrevive a reloads e à
  // navegação entre as abas do shell mobile.
  restoreRoomSession()
  await boot()

  if (import.meta.client && new URLSearchParams(location.search).has('demo')) {
    loadGoWithTheFlow()
  }
})
</script>

<template>
  <CinematicViewport>
    <NuxtPage />
  </CinematicViewport>
  <AuraMode />
  <KaraokeMode />
  <EqualizerPanel />
  <!-- Mobile shell — oculto em modo Karaokê TV (R3.1, R6.1) -->
  <MiniPlayer />
  <BottomNav />
</template>
