<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useAuth } from '~/composables/useAuth'
import { useAudioReactor } from '~/composables/useAudioReactor'
import { loadGoWithTheFlow } from '~/composables/useDemoSignal'

const cinematic = useCinematicStore()
const { boot } = useAuth()

usePlatformAdaptation()
useSmartIdle()
useKeyboardShortcuts()
useAudioReactor()

onMounted(async () => {
  cinematic.restoreSession()
  // Lê tokens do hash (callback Spotify) ou restaura localStorage
  await boot()

  // Sinal de demonstração via ?demo=gwtf (passa pelo pipeline real)
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
</template>
