<template>
  <!-- Camada 05 — sombras suaves que dão distância entre as barras e a cena -->
  <div class="depth-mask" aria-hidden="true" />
</template>

<style scoped>
.depth-mask {
  position: absolute;
  inset: 0;
  z-index: var(--layer-05-depth);
  pointer-events: none;
  background:
    linear-gradient(to bottom,
      rgba(0, 0, 0, calc(var(--cinema-depth-shadow) * 0.8)) 0%,
      transparent calc(var(--cinema-bar-top-height) + 90px)),
    linear-gradient(to top,
      rgba(0, 0, 0, calc(var(--cinema-depth-shadow) * 0.8)) 0%,
      transparent calc(var(--cinema-bar-bottom-height) + 110px));
  transition: background var(--t-scene) var(--ease-scene);
}
</style>
