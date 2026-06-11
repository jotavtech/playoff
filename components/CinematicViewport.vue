<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'

const cinematic = useCinematicStore()
const music = useMusicVisualStore()

/**
 * O viewport é o AppShell da cena: traduz o estado da CinematicStore
 * em CSS variables que todas as camadas (00–11) consomem.
 */
const sceneVars = computed(() => {
  const bars = cinematic.barsVisual
  return {
    '--cinema-bar-top-height': `${bars.topHeight}px`,
    '--cinema-bar-bottom-height': `${bars.bottomHeight}px`,
    '--cinema-bar-opacity': String(bars.opacity),
    '--cinema-edge-blur': `${bars.edgeBlur}px`,
    '--cinema-depth-shadow': String(bars.depthShadow),
    '--cinema-line-opacity': String(bars.innerLineOpacity),
    '--cinema-line-scale': String(bars.innerLineScale),
    '--cinema-vibration': String(bars.vibration),
    '--cinema-metadata-opacity': String(bars.metadataOpacity),
    '--cinema-chromatic-noise': String(bars.chromaticNoise),
    '--motion-intensity': String(cinematic.effectiveMotion),
    '--music-reactivity': String(music.isPlaying ? 0.65 + 0.35 * cinematic.effectiveMotion : 0.2),
    '--chrome-speed': String((music.isPlaying ? 0.8 : 0.35) * Math.max(0.05, cinematic.effectiveMotion)),
    '--music-progress': String(music.progress)
  }
})
</script>

<template>
  <div
    class="cinematic-viewport"
    :style="sceneVars"
    :data-mode="cinematic.mode"
    :data-bars-state="cinematic.barsState"
    :data-immersive="cinematic.immersive || undefined"
    :data-smart-idle="cinematic.smartIdle || undefined"
    :data-tier="cinematic.performanceTier"
  >
    <!-- Layer 00 — base background -->
    <div class="layer-base" aria-hidden="true" />

    <!-- Layer 01 — dynamic monochrome gradient -->
    <div class="layer-gradient" aria-hidden="true" />

    <!-- Layer 02 — abstract album influence (Fase 2: reflexo da capa) -->
    <div class="layer-album" aria-hidden="true" />

    <!-- Layer 03 — chrome liquid -->
    <ChromeLiquid />

    <!-- Layer 04+05 — cinematic bars + depth -->
    <CinematicBars />

    <!-- Layer 06 — conteúdo -->
    <main class="layer-content">
      <slot />
    </main>

    <!-- Layer 10 — command center -->
    <CommandCenter />

    <!-- Layer 09 — diagnostics -->
    <SystemDiagnosticsOverlay />

    <!-- Layer 11 — corte de cena na troca de faixa -->
    <TrackTransitionOverlay />
  </div>
</template>

<style scoped>
.cinematic-viewport {
  position: fixed;
  inset: 0;
  width: 100dvw;
  height: 100dvh;
  overflow: hidden;
  isolation: isolate;
}

.layer-base {
  position: absolute;
  inset: 0;
  z-index: var(--layer-00-base);
  background: var(--bg);
  transition: background var(--t-scene) var(--ease-scene);
}

.layer-gradient {
  position: absolute;
  inset: 0;
  z-index: var(--layer-01-gradient);
  background:
    radial-gradient(120% 90% at 70% 20%, var(--bg-soft) 0%, transparent 55%),
    radial-gradient(90% 70% at 15% 85%, var(--bg-soft) 0%, transparent 50%);
  opacity: calc(0.5 + 0.5 * var(--motion-intensity));
  animation: gradient-drift calc(60s / max(var(--chrome-speed), 0.05)) ease-in-out infinite alternate;
}

@keyframes gradient-drift {
  from { transform: translate3d(-1.5%, -1%, 0) scale(1.04); }
  to   { transform: translate3d(1.5%, 1%, 0) scale(1.08); }
}

.layer-album {
  position: absolute;
  inset: 0;
  z-index: var(--layer-02-album);
  /* Fase 2: influência abstrata da capa (luminância/reflexo, nunca tema colorido) */
  opacity: 0;
}

.layer-content {
  position: absolute;
  inset: 0;
  z-index: var(--layer-06-content);
  padding-top: calc(var(--cinema-bar-top-height) + env(safe-area-inset-top));
  padding-bottom: calc(var(--cinema-bar-bottom-height) + env(safe-area-inset-bottom));
  transition: padding var(--t-scene) var(--ease-scene);
}

/* Smart Idle: conteúdo recua, cena assume (PRD §5.11) */
.cinematic-viewport[data-smart-idle][data-immersive] .layer-content {
  opacity: 0.95;
}
</style>
