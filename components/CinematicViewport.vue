<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useChromaticEngine } from '~/composables/useChromaticEngine'
import PlayoffToast from '~/components/ui/PlayoffToast.vue'

const cinematic = useCinematicStore()
const music = useMusicVisualStore()
const { tokens: chromaticTokens } = useChromaticEngine()

/**
 * O viewport é o AppShell da cena: traduz o estado da CinematicStore
 * em CSS variables que todas as camadas (00–11) consomem.
 */
const sceneVars = computed(() => {
  const bars = cinematic.barsVisual
  // Mood adjustments sobrescrevem os defaults de chrome-speed e motion-intensity
  // com valores específicos da música (PRD §5.7.4)
  const mood = music.moodAdjustments

  const chromeSpeed = mood['--chrome-speed']
    ? parseFloat(mood['--chrome-speed'])
    : (music.isPlaying ? 0.8 : 0.35)

  return {
    '--cinema-bar-top-height': `${bars.topHeight}px`,
    '--cinema-bar-bottom-height': `${bars.bottomHeight}px`,
    '--cinema-bar-opacity': String(bars.opacity),
    '--cinema-edge-blur': `${bars.edgeBlur}px`,
    '--cinema-depth-shadow': mood['--cinema-depth-shadow'] ?? String(bars.depthShadow),
    '--cinema-line-opacity': String(bars.innerLineOpacity),
    '--cinema-line-scale': String(bars.innerLineScale),
    '--cinema-vibration': String(bars.vibration),
    '--cinema-metadata-opacity': String(bars.metadataOpacity),
    '--cinema-chromatic-noise': String(bars.chromaticNoise),
    '--motion-intensity': mood['--motion-intensity'] ?? String(cinematic.effectiveMotion),
    '--music-reactivity': String(music.isPlaying ? 0.65 + 0.35 * cinematic.effectiveMotion : 0.2),
    '--chrome-speed': String(chromeSpeed * Math.max(0.05, cinematic.effectiveMotion)),
    '--music-progress': String(music.progress),
    // Chromatic Engine (PRD Radiola §4): accent, glow, bg-tint, aberração
    ...chromaticTokens.value
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

    <!-- Layer 02 — abstract album influence: luminância da capa como halo atmosférico -->
    <div
      class="layer-album"
      aria-hidden="true"
      :style="music.currentTrack?.coverUrl
        ? { backgroundImage: `url(${music.currentTrack.coverUrl})`, opacity: '0.3' }
        : {}"
    />

    <!-- Layer 02b — tint cromático: a cor da música assombra a cena (PRD Radiola §4.2) -->
    <div class="layer-chroma" aria-hidden="true" />

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
    <PlayoffToast />
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
  inset: -10%;
  z-index: var(--layer-02-album);
  background-size: cover;
  background-position: center;
  /* Influência abstrata: blur massivo + dessaturação total → apenas luminância da capa */
  filter: blur(80px) saturate(0) contrast(0.7);
  opacity: 0;
  transition: opacity 2.5s var(--ease-scene);
  mix-blend-mode: screen;
}

/* Tint cromático atmosférico — radial suave na cor da música, crossfade 1.8s (§4.3) */
.layer-chroma {
  position: absolute;
  inset: 0;
  z-index: var(--layer-02-album);
  background:
    radial-gradient(120% 100% at 50% 30%, var(--music-bg-tint, transparent) 0%, transparent 60%),
    radial-gradient(80% 70% at 50% 108%, var(--music-glow, transparent) 0%, transparent 52%);
  opacity: calc(0.25 + 0.35 * var(--music-reactivity, 0.4));
  transition: background 1.8s var(--ease-liquid), opacity 1.8s var(--ease-scene);
  pointer-events: none;
  mix-blend-mode: screen;
}

.layer-content {
  position: absolute;
  inset: 0;
  z-index: var(--layer-06-content);
  padding-top: calc(var(--cinema-bar-top-height) + env(safe-area-inset-top));
  /* Garante que conteúdo não fique atrás da bottom nav mobile (D1 / tasks 0.3) */
  padding-bottom: max(
    calc(var(--cinema-bar-bottom-height) + var(--safe-bottom)),
    calc(var(--nav-height) + var(--mini-player-height) + var(--safe-bottom))
  );
  transition: padding var(--t-scene) var(--ease-scene);
}

/* Smart Idle: conteúdo recua, cena assume (PRD §5.11) */
.cinematic-viewport[data-smart-idle][data-immersive] .layer-content {
  opacity: 0.95;
}
</style>
