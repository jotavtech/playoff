<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useAuth } from '~/composables/useAuth'
import { useAudioReactor } from '~/composables/useAudioReactor'
import { loadGoWithTheFlow } from '~/composables/useDemoSignal'
import KaraokeMode from '~/components/karaoke/KaraokeMode.vue'
import EqualizerPanel from '~/components/EqualizerPanel.vue'
import BottomNav from '~/components/shell/BottomNav.vue'
import MiniPlayer from '~/components/shell/MiniPlayer.vue'

const cinematic = useCinematicStore()
const { boot } = useAuth()

usePlatformAdaptation()
useSmartIdle()
useKeyboardShortcuts()
useOverlayHistory()
useAudioReactor()

onMounted(async () => {
  cinematic.restoreSession()
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
