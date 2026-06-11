<script setup lang="ts">
/**
 * CinematicBarsEngine (PRD §5.3) — sistema global de barras pretas.
 * Não é decoração: é identidade. Vive no AppShell, acima do background
 * e abaixo dos controles de foreground.
 */
</script>

<template>
  <div class="cinematic-bars" aria-hidden="false">
    <CinematicBarTop />
    <CinematicDepthMask />
    <CinematicBarBottom />
  </div>
</template>

<style scoped>
.cinematic-bars {
  position: absolute;
  inset: 0;
  z-index: var(--layer-04-bars);
  pointer-events: none;
}
</style>
