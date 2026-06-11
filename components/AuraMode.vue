<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useAuraMode } from '~/composables/useAuraMode'

/**
 * Aura Mode (PRD Radiola §10.1) — overlay que assume a tela após idle longo.
 * Disco gigante, cor da música dominando, anel de energia pulsando.
 * Sempre montado; só aparece quando cinematic.auraMode liga.
 */
const cinematic = useCinematicStore()
const music = useMusicVisualStore()

useAuraMode()

// Disco ocupa ~72vmin (PRD §10.1: disco cresce até dominar a tela)
const auraSize = ref(560)
function measure () {
  if (!import.meta.client) return
  auraSize.value = Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.72)
}
onMounted(() => {
  measure()
  window.addEventListener('resize', measure, { passive: true })
  onBeforeUnmount(() => window.removeEventListener('resize', measure))
})
</script>

<template>
  <Transition name="aura">
    <div v-if="cinematic.auraMode" class="aura" aria-hidden="true">
      <!-- Cor da música domina o fundo (PRD §10.1: opacidade ~8%) -->
      <div class="aura__wash" />

      <!-- Anel de energia em volta do disco, pulsa com --viz-energy -->
      <div class="aura__ring" />

      <div class="aura__disc">
        <VinylDisc :size="auraSize" :show-arm="false" />
      </div>

      <div class="aura__meta">
        <h2 class="aura__title">{{ music.currentTrack?.title ?? '' }}</h2>
        <p class="aura__artist microtext">{{ music.currentTrack?.artist ?? '' }}</p>
      </div>

      <p class="aura__hint microtext">MOVE TO RETURN</p>
    </div>
  </Transition>
</template>

<style scoped>
.aura {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  background: #000;
  overflow: hidden;
}

.aura__wash {
  position: absolute;
  inset: -20%;
  background: radial-gradient(circle at 50% 50%, var(--music-glow, transparent) 0%, transparent 60%);
  opacity: calc(0.4 + 0.6 * var(--viz-energy, 0));
  transition: opacity 0.2s linear;
  mix-blend-mode: screen;
}

.aura__ring {
  position: absolute;
  width: 92vmin;
  height: 92vmin;
  border-radius: 50%;
  border: 1px solid var(--music-accent-soft, rgba(255, 255, 255, 0.1));
  box-shadow: 0 0 80px var(--music-glow, transparent);
  scale: calc(1 + 0.06 * var(--viz-energy, 0));
  opacity: 0.6;
  transition: scale 0.12s var(--ease-liquid);
}

.aura__disc {
  position: relative;
  z-index: 2;
}

.aura__meta {
  position: absolute;
  bottom: 8vmin;
  left: 50%;
  translate: -50% 0;
  text-align: center;
  z-index: 3;
}

.aura__title {
  font-size: clamp(24px, 4vw, 52px);
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--ink-dim);
  mix-blend-mode: difference;
}

.aura__artist {
  letter-spacing: 0.4em;
  margin-top: 8px;
}

.aura__hint {
  position: absolute;
  bottom: 2vmin;
  left: 50%;
  translate: -50% 0;
  letter-spacing: 0.3em;
  opacity: 0.3;
  animation: aura-hint 3s ease-in-out infinite;
}

@keyframes aura-hint {
  0%, 100% { opacity: 0.15; }
  50% { opacity: 0.4; }
}

.aura-enter-active { transition: opacity 1.2s var(--ease-scene); }
.aura-leave-active { transition: opacity 0.4s var(--ease-cut); }
.aura-enter-from, .aura-leave-to { opacity: 0; }
</style>
