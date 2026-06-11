<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'

const cinematic = useCinematicStore()

usePlatformAdaptation()
useSmartIdle()
useKeyboardShortcuts()

onMounted(() => {
  cinematic.restoreSession()
})
</script>

<template>
  <CinematicViewport>
    <NuxtPage />
  </CinematicViewport>
</template>
