<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'

const cinematic = useCinematicStore()
</script>

<template>
  <OLEDWallpaperMode v-if="cinematic.wallpaperMode" />
  <CinemaView v-else-if="cinematic.cinemaView" />
  <HeroSection v-else />
</template>
