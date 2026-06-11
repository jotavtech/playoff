<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'

const cinematic = useCinematicStore()

/*
 * Layer 03 — objeto chrome liquid.
 * Fase 1: render CSS (morph de border-radius + gradiente cônico metálico),
 * que também é o fallback permanente sem WebGL / tier low.
 * Fase 2: versão WebGL (Three.js) lazy-loaded para tiers high/ultra,
 * com distorção reagindo a --music-reactivity.
 */
const simplified = computed(() => cinematic.performanceTier === 'low')
</script>

<template>
  <div class="chrome-stage" aria-hidden="true">
    <div class="chrome-blob" :class="{ 'chrome-blob--simple': simplified }">
      <div class="chrome-blob__surface" />
      <div v-if="!simplified" class="chrome-blob__sheen" />
    </div>
  </div>
</template>

<style scoped>
.chrome-stage {
  position: absolute;
  inset: 0;
  z-index: var(--layer-03-chrome);
  display: grid;
  place-items: center;
  pointer-events: none;
}

.chrome-blob {
  position: relative;
  width: min(46vmin, 520px);
  height: min(46vmin, 520px);
  filter: saturate(0) contrast(1.15);
  animation: blob-drift calc(34s / max(var(--chrome-speed), 0.05)) ease-in-out infinite alternate;
}

@keyframes blob-drift {
  from { transform: translate3d(-2%, 1%, 0) rotate(-2deg) scale(0.98); }
  to   { transform: translate3d(2%, -1.5%, 0) rotate(3deg) scale(1.03); }
}

.chrome-blob__surface {
  position: absolute;
  inset: 0;
  background:
    conic-gradient(from 210deg,
      var(--chrome-lo) 0%,
      var(--chrome-hi) 18%,
      var(--chrome-lo) 36%,
      var(--chrome-hi) 55%,
      var(--chrome-lo) 72%,
      var(--chrome-hi) 90%,
      var(--chrome-lo) 100%);
  border-radius: 58% 42% 55% 45% / 48% 56% 44% 52%;
  box-shadow:
    inset 0 0 60px rgba(0, 0, 0, calc(var(--cinema-depth-shadow) * 0.9)),
    0 30px 90px rgba(0, 0, 0, var(--cinema-depth-shadow));
  animation:
    blob-morph calc(18s / max(var(--chrome-speed), 0.05)) ease-in-out infinite alternate,
    blob-spin calc(70s / max(var(--chrome-speed), 0.05)) linear infinite;
}

@keyframes blob-morph {
  0%   { border-radius: 58% 42% 55% 45% / 48% 56% 44% 52%; }
  50%  { border-radius: 45% 55% 48% 52% / 56% 44% 58% 42%; }
  100% { border-radius: 52% 48% 42% 58% / 44% 52% 48% 56%; }
}

@keyframes blob-spin {
  to { rotate: 360deg; }
}

.chrome-blob__sheen {
  position: absolute;
  inset: -12%;
  background: radial-gradient(40% 32% at 32% 26%, rgba(255, 255, 255, 0.5), transparent 70%);
  border-radius: 50%;
  mix-blend-mode: screen;
  opacity: calc(0.4 + 0.5 * var(--music-reactivity));
  filter: blur(calc(var(--cinema-edge-blur) * 0.8));
  animation: sheen-pulse calc(6s / max(var(--music-reactivity), 0.1)) ease-in-out infinite alternate;
}

@keyframes sheen-pulse {
  from { transform: scale(0.96); }
  to   { transform: scale(1.05) translateX(2%); }
}

.chrome-blob--simple {
  filter: saturate(0);
}

.chrome-blob--simple .chrome-blob__surface {
  animation: none;
  box-shadow: 0 20px 60px rgba(0, 0, 0, var(--cinema-depth-shadow));
}

/* Em modo imersivo o chrome ganha protagonismo e atravessa a composição */
[data-immersive] .chrome-blob {
  width: min(62vmin, 720px);
  height: min(62vmin, 720px);
}
</style>
