<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'

const cinematic = useCinematicStore()
const music = useMusicVisualStore()

const trackLine = computed(() => {
  if (!music.currentTrack) return 'NO TRACK LOCKED'
  return `${music.currentTrack.title} — ${music.currentTrack.artist}`
})
</script>

<template>
  <footer class="bar bar--bottom">
    <div class="bar__mask" aria-hidden="true" />

    <!-- Reactive line: comprimento acompanha o progresso da faixa -->
    <div class="bar__line" aria-hidden="true">
      <div class="bar__line-progress" />
    </div>

    <div class="bar__metadata microtext">
      <span class="bar__meta-item microtext--bright">{{ trackLine }}</span>
      <span class="bar__meta-item">{{ music.timecode }}</span>
      <span class="bar__meta-item bar__meta-item--right">CHROME AUDIO ENGINE</span>
    </div>

    <div class="bar__foreground">
      <button
        v-if="music.currentTrack"
        class="bar__play microtext microtext--bright"
        @click="music.togglePlay()"
      >
        {{ music.isPlaying ? '❚❚ PAUSE' : '▶ PLAY' }}
      </button>
    </div>
  </footer>
</template>

<style scoped>
.bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100dvw;
  height: calc(var(--cinema-bar-bottom-height) + env(safe-area-inset-bottom));
  transition: height var(--t-scene) var(--ease-cut);
  pointer-events: none;
}

.bar__mask {
  position: absolute;
  inset: 0;
  background: var(--bar);
  opacity: var(--cinema-bar-opacity);
}

.bar__mask::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: calc(-1 * var(--cinema-edge-blur));
  height: var(--cinema-edge-blur);
  background: linear-gradient(to top, var(--bar), transparent);
  opacity: 0.85;
}

.bar__line {
  position: absolute;
  left: 0;
  top: 0;
  height: 1px;
  width: 100%;
  background: var(--line);
}

.bar__line-progress {
  height: 100%;
  width: calc(var(--music-progress, 0) * 100%);
  background: var(--ink);
  opacity: calc(var(--cinema-line-opacity) * 1.6);
  transition: width 1s linear;
  box-shadow: 0 0 calc(var(--cinema-vibration) * 12px) var(--ink);
}

.bar__metadata {
  position: absolute;
  inset: 0 0 env(safe-area-inset-bottom) 0;
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 0 28px;
  opacity: var(--cinema-metadata-opacity);
  transition: opacity var(--t-scene) var(--ease-scene);
  animation: metadata-drift 100s ease-in-out infinite alternate-reverse;
}

@keyframes metadata-drift {
  from { translate: 0 0; }
  to   { translate: calc(var(--motion-intensity) * -4px) 0; }
}

.bar__meta-item--right {
  margin-left: auto;
  margin-right: 120px;
  letter-spacing: 0.3em;
}

.bar__foreground {
  position: absolute;
  right: 20px;
  bottom: env(safe-area-inset-bottom);
  height: var(--cinema-bar-bottom-height);
  display: flex;
  align-items: center;
  pointer-events: auto;
}

.bar__play {
  padding: 10px 18px;
  border: 1px solid var(--glass-border);
  background: var(--glass);
  color: var(--ink);
  letter-spacing: 0.2em;
  transition: border-color var(--t-fast) linear, background var(--t-fast) linear;
}

.bar__play:hover {
  border-color: var(--ink-dim);
}

@media (max-width: 768px) {
  .bar__metadata { gap: 12px; padding: 0 16px; }
  .bar__meta-item--right { display: none; }
}
</style>
