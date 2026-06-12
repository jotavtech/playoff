<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useAuthStore } from '~/stores/auth'
import BattleHome from '~/components/battle/BattleHome.vue'
import { useBattleEngine } from '~/composables/useBattleEngine'

const cinematic = useCinematicStore()
const auth = useAuthStore()
const battle = useBattleEngine()
const showBattleHome = computed(() => auth.isAuthenticated || !!battle.session.value)
</script>

<template>
  <OLEDWallpaperMode v-if="cinematic.wallpaperMode" />
  <CinemaView v-else-if="cinematic.cinemaView" />
  <BattleHome v-else-if="showBattleHome" />
  <HeroSection v-else />
</template>
