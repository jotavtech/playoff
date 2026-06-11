<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useSpotifyPlayer } from '~/composables/useSpotifyPlayer'

const cinematic = useCinematicStore()
const music = useMusicVisualStore()
const { togglePlay } = useSpotifyPlayer()

/*
 * OLED Wallpaper Mode (PRD §5.7.2): o Playoff vira um wallpaper animado
 * funcional. UI mínima, relógio, anti burn-in via deriva lenta.
 */
const clock = ref('')
let timer: ReturnType<typeof setInterval> | null = null

// Disco grande — máximo impacto visual (PRD Radiola §8.2: OLED 440–500px)
const discSize = ref(460)
function measure () {
  if (!import.meta.client) return
  const v = Math.min(window.innerWidth, window.innerHeight)
  discSize.value = Math.max(260, Math.min(500, Math.round(v * 0.6)))
}

onMounted(() => {
  const tick = () => {
    clock.value = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  tick()
  timer = setInterval(tick, 10_000)
  measure()
  window.addEventListener('resize', measure, { passive: true })
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  if (import.meta.client) window.removeEventListener('resize', measure)
})
</script>

<template>
  <section class="wallpaper">
    <div class="wallpaper__drift">
      <p class="wallpaper__clock">{{ clock }}</p>

      <!-- Disco dominando o wallpaper -->
      <div class="wallpaper__disc">
        <VinylDisc :size="discSize" :show-arm="false" />
      </div>

      <h2 class="wallpaper__track">
        {{ music.currentTrack?.title ?? 'SYSTEM IDLE' }}
      </h2>

      <p class="wallpaper__artist microtext">
        {{ music.currentTrack ? music.currentTrack.artist : 'AWAITING SIGNAL' }}
      </p>
    </div>

    <!-- Visualizer espalhado pela base (PRD Radiola §5.5: OLED bottom spread) -->
    <AudioVisualizer v-if="music.currentTrack" :height="80" class="wallpaper__viz" />

    <!-- Controles aparecem apenas quando há interação (Smart Idle inverso) -->
    <div class="wallpaper__controls" :class="{ 'wallpaper__controls--visible': !cinematic.smartIdle }">
      <button v-if="music.currentTrack" class="wallpaper__btn microtext" @click="togglePlay()">
        {{ music.isPlaying ? '❚❚' : '▶' }}
      </button>
      <button class="wallpaper__btn microtext" @click="cinematic.toggleWallpaperMode()">
        EXIT
      </button>
    </div>
  </section>
</template>

<style scoped>
.wallpaper {
  position: relative;
  height: 100%;
  display: grid;
  place-items: center;
}

.wallpaper__drift {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
  /* anti burn-in (PRD §5.10): deriva lenta de todo o bloco persistente */
  animation: oled-drift 120s ease-in-out infinite alternate;
}

.wallpaper__disc {
  margin: 4px 0 10px;
}

.wallpaper__viz {
  position: absolute;
  bottom: 70px;
  left: 50%;
  translate: -50% 0;
  width: min(880px, 88vw);
  opacity: 0.85;
}

@keyframes oled-drift {
  from { translate: -1.2vmin -0.8vmin; }
  to   { translate: 1.2vmin 0.8vmin; }
}

.wallpaper__clock {
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.5em;
  color: var(--ink-faint);
}

.wallpaper__track {
  font-size: clamp(36px, 6vw, 96px);
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--ink-dim);
  max-width: 86vw;
}

.wallpaper__artist {
  letter-spacing: 0.34em;
}

.wallpaper__controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  translate: -50% 0;
  display: flex;
  gap: 10px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.8s var(--ease-scene);
}

.wallpaper__controls--visible {
  opacity: 1;
  pointer-events: auto;
}

.wallpaper__btn {
  padding: 10px 20px;
  border: 1px solid var(--glass-border);
  background: var(--glass);
  color: var(--ink-dim);
  letter-spacing: 0.24em;
}

.wallpaper__btn:hover {
  color: var(--ink);
}
</style>
