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
      <!-- Reflexo interno em contra-rotação: cria a interferência líquida do metal -->
      <div v-if="!simplified" class="chrome-blob__inner" />
      <div v-if="!simplified" class="chrome-blob__sheen" />
    </div>
    <!-- Sombra de contato: ancora o objeto na cena, dá distância real do fundo -->
    <div class="chrome-shadow" />
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

/* Blob e sombra ocupam a mesma célula — empilhados, não em linhas separadas */
.chrome-stage > * {
  grid-area: 1 / 1;
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
  /* Superfície metálica: cônico (reflexos de ambiente) fundido com dois
     radiais (luz de estúdio + oclusão inferior) — o blend cria o metal */
  background:
    radial-gradient(58% 48% at 30% 24%, rgba(255, 255, 255, 0.85), transparent 62%),
    radial-gradient(70% 60% at 68% 82%, rgba(0, 0, 0, 0.75), transparent 58%),
    conic-gradient(from 210deg,
      var(--chrome-lo) 0%,
      var(--chrome-hi) 18%,
      var(--chrome-lo) 36%,
      var(--chrome-hi) 55%,
      var(--chrome-lo) 72%,
      var(--chrome-hi) 90%,
      var(--chrome-lo) 100%);
  background-blend-mode: screen, multiply, normal;
  border-radius: 58% 42% 55% 45% / 48% 56% 44% 52%;
  box-shadow:
    inset 0 0 60px rgba(0, 0, 0, calc(var(--cinema-depth-shadow) * 0.9)),
    inset 0 -18px 40px rgba(0, 0, 0, calc(var(--cinema-depth-shadow) * 0.6)),
    inset 0 2px 6px rgba(255, 255, 255, 0.35),
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

/* Reflexo interno: gradiente girando ao contrário do corpo — a defasagem
   entre as duas rotações produz a sensação de líquido se reorganizando */
.chrome-blob__inner {
  position: absolute;
  inset: 9%;
  background: conic-gradient(from 30deg,
    transparent 0%,
    rgba(255, 255, 255, 0.5) 12%,
    transparent 30%,
    rgba(0, 0, 0, 0.55) 52%,
    transparent 70%,
    rgba(255, 255, 255, 0.3) 86%,
    transparent 100%);
  border-radius: 52% 48% 46% 54% / 50% 46% 54% 50%;
  mix-blend-mode: soft-light;
  filter: blur(calc(6px + var(--chrome-distortion) * 14px));
  animation:
    blob-morph calc(14s / max(var(--chrome-speed), 0.05)) ease-in-out infinite alternate-reverse,
    blob-spin-reverse calc(46s / max(var(--chrome-speed), 0.05)) linear infinite;
}

@keyframes blob-spin-reverse {
  to { rotate: -360deg; }
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

.chrome-shadow {
  position: absolute;
  width: min(34vmin, 380px);
  height: min(7vmin, 80px);
  translate: 0 min(27vmin, 305px);
  border-radius: 50%;
  background: radial-gradient(50% 50% at center, rgba(0, 0, 0, calc(var(--cinema-depth-shadow) * 0.9)), transparent 70%);
  filter: blur(10px);
  animation: shadow-drift calc(34s / max(var(--chrome-speed), 0.05)) ease-in-out infinite alternate;
}

@keyframes shadow-drift {
  from { transform: translateX(-2%) scaleX(0.96); opacity: 0.85; }
  to   { transform: translateX(2%) scaleX(1.06); opacity: 1; }
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

[data-immersive] .chrome-shadow {
  translate: 0 min(36vmin, 420px);
}
</style>
