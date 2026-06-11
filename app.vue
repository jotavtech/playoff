<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useAuth } from '~/composables/useAuth'

const cinematic = useCinematicStore()
const { boot } = useAuth()

usePlatformAdaptation()
useSmartIdle()
useKeyboardShortcuts()

onMounted(async () => {
  cinematic.restoreSession()
  // Lê tokens do hash (callback Spotify) ou restaura localStorage
  await boot()
})
</script>

<template>
  <CinematicViewport>
    <NuxtPage />
  </CinematicViewport>
</template>
