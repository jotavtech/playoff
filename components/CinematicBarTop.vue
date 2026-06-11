<script setup lang="ts">
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useAuthStore } from '~/stores/auth'

const music = useMusicVisualStore()
const auth = useAuthStore()

// SystemStatus (PRD §Componentes): estado claro e único no header
const systemStatus = computed(() => {
  if (auth.authError) return 'ERROR'
  if (music.transitioning) return 'LOADING'
  if (music.isPlaying) return 'PLAYING'
  if (music.currentTrack) return 'HELD'
  if (auth.isAuthenticated) return 'READY'
  return 'OFFLINE'
})
</script>

<template>
  <header class="bar bar--top">
    <!-- Camada 1: base mask · Camada 2: soft edge (::after) -->
    <div class="bar__mask" aria-hidden="true" />

    <!-- Camada 3: reactive line -->
    <div class="bar__line" aria-hidden="true" />

    <!-- Camada 4: metadata overlay — header limpo (PRD §Header) -->
    <div class="bar__metadata microtext">
      <img class="bar__logo" src="/logo-playoff.png" alt="Playoff" draggable="false">
      <span class="bar__meta-item bar__meta-item--status">STATUS: {{ systemStatus }}</span>
    </div>

    <!-- Camada 5: foreground UI -->
    <div class="bar__foreground">
      <ModeSwitcher />
    </div>
  </header>
</template>

<style scoped>
.bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 100dvw;
  height: calc(var(--cinema-bar-top-height) + env(safe-area-inset-top));
  transition: height var(--t-scene) var(--ease-cut);
  pointer-events: none;
}

.bar__mask {
  position: absolute;
  inset: 0;
  background: var(--bar);
  opacity: var(--cinema-bar-opacity);
}

/* Textura interna: a barra não é um retângulo chapado — tem um
   brilho mínimo na borda externa que dá volume de superfície */
.bar__mask::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.05), transparent 45%);
  opacity: calc(0.4 + 0.6 * var(--motion-intensity));
}

.bar__mask::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(-1 * var(--cinema-edge-blur));
  height: var(--cinema-edge-blur);
  background: linear-gradient(to bottom, var(--bar), transparent);
  opacity: 0.85;
}

.bar__line {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 1px;
  width: 100%;
  background: var(--ink);
  opacity: var(--cinema-line-opacity);
  transform: scaleX(var(--cinema-line-scale));
  transform-origin: left center;
  transition: transform var(--t-scene) var(--ease-scene), opacity var(--t-fast) linear;
  animation: line-vibrate calc(2.4s / max(var(--motion-intensity), 0.1)) ease-in-out infinite alternate;
  /* Ruído cromático monocromático: linha fantasma deslocada quando a cena tensiona */
  box-shadow: 0 calc(var(--cinema-chromatic-noise) * 3px) 0 rgba(255, 255, 255, calc(var(--cinema-chromatic-noise) * 0.45));
}

@keyframes line-vibrate {
  from { translate: 0 0; opacity: var(--cinema-line-opacity); }
  to   { translate: 0 calc(var(--cinema-vibration) * -2px); opacity: calc(var(--cinema-line-opacity) * 0.7); }
}

.bar__metadata {
  position: absolute;
  inset: env(safe-area-inset-top) 0 0 0;
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 0 28px;
  opacity: var(--cinema-metadata-opacity);
  transition: opacity var(--t-scene) var(--ease-scene);
  /* anti burn-in: deriva quase imperceptível (PRD §5.10) */
  animation: metadata-drift 90s ease-in-out infinite alternate;
}

@keyframes metadata-drift {
  from { translate: 0 0; }
  to   { translate: calc(var(--motion-intensity) * 4px) 0; }
}

.bar__logo {
  height: 22px;
  width: auto;
  display: block;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.6));
}

.bar__meta-item--status {
  margin-left: auto;
  /* reserva o espaço do ModeSwitcher (3 botões) à direita */
  margin-right: 220px;
}

.bar__foreground {
  position: absolute;
  top: env(safe-area-inset-top);
  right: 20px;
  height: var(--cinema-bar-top-height);
  display: flex;
  align-items: center;
  pointer-events: auto;
}

@media (max-width: 768px) {
  .bar__metadata { gap: 14px; padding: 0 16px; }
  .bar__meta-item { display: none; }
  .bar__meta-item--status { display: block; margin-right: 170px; }
}
</style>
