<script setup lang="ts">
/**
 * CinematicBarsEngine (PRD §5.3) — sistema global de barras pretas.
 * Não é decoração: é identidade. Vive no AppShell, acima do background
 * e abaixo dos controles de foreground.
 */
</script>

<template>
  <!-- Não usa aria-hidden: as barras carregam metadados legíveis e controles reais -->
  <div class="cinematic-bars">
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
