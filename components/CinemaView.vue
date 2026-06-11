<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useSpotifyPlayer } from '~/composables/useSpotifyPlayer'

const cinematic = useCinematicStore()
const music = useMusicVisualStore()
const { togglePlay } = useSpotifyPlayer()

// Disco grande no centro da experiência (PRD Radiola §8.2: Focus/Cinema)
const discSize = ref(380)
function measure () {
  if (!import.meta.client) return
  const v = Math.min(window.innerWidth, window.innerHeight)
  discSize.value = Math.max(240, Math.min(440, Math.round(v * 0.5)))
}
onMounted(() => {
  measure()
  window.addEventListener('resize', measure, { passive: true })
  onBeforeUnmount(() => window.removeEventListener('resize', measure))
})
</script>

<template>
  <!-- Cinema View (PRD §5.7.1): o disco vira centro da experiência -->
  <section class="cinema">
    <div class="cinema__stage" :class="{ 'cinema__stage--hidden': cinematic.smartIdle }">
      <p class="microtext">{{ music.statusLabel }}</p>

      <!-- O Disco Radiola: coração da cena -->
      <div class="cinema__disc">
        <VinylDisc :size="discSize" />
      </div>

      <!-- Título corta entre faixas como cartela nova, não troca seca de texto -->
      <Transition name="title-cut" mode="out-in">
        <h2 :key="music.currentTrack?.id ?? 'idle'" class="cinema__title">
          {{ music.currentTrack?.title ?? 'AWAITING SIGNAL' }}
        </h2>
      </Transition>

      <p v-if="music.currentTrack" class="cinema__artist microtext microtext--bright">
        {{ music.currentTrack.artist }} — {{ music.currentTrack.album }}
      </p>

      <!-- Letras sincronizadas (inerte sem provider — PRD Radiola §10.8) -->
      <LiveLyricsLayer />

      <!-- Progress cinematográfica com a cor da música -->
      <div v-if="music.currentTrack" class="cinema__progress">
        <div class="cinema__progress-fill" :style="{ width: `${music.progress * 100}%` }" />
      </div>

      <!-- Audio Visualizer (PRD Radiola §5) -->
      <AudioVisualizer v-if="music.currentTrack" :height="110" class="cinema__viz" />

      <div v-if="music.currentTrack" class="cinema__controls">
        <button class="cinema__btn microtext" @click="togglePlay()">
          {{ music.isPlaying ? '❚❚' : '▶' }}
        </button>
        <span class="microtext">{{ music.timecode }}</span>
      </div>

      <button v-else class="cinema__btn cinema__btn--wide microtext" @click="cinematic.toggleCommandCenter()">
        SEARCH TO BEGIN
      </button>

      <!-- Mood Timeline da sessão (PRD Radiola §10.2) -->
      <MoodTimeline class="cinema__timeline" />
    </div>

    <p class="cinema__hint microtext" :class="{ 'cinema__hint--hidden': cinematic.smartIdle }">
      ESC EXIT · SPACE PLAY · S SEARCH
    </p>
  </section>
</template>

<style scoped>
.cinema {
  position: relative;
  height: 100%;
  display: grid;
  place-items: center;
}

.cinema__stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  transition: opacity 1.4s var(--ease-scene);
}

/* Smart Idle: controles desaparecem, cena assume */
.cinema__stage--hidden {
  opacity: 0.4;
}

.cinema__disc {
  margin-bottom: 6px;
}

.cinema__title {
  font-size: clamp(34px, 6vw, 92px);
  font-weight: 600;
  line-height: 0.95;
  letter-spacing: -0.03em;
  max-width: 90vw;
  mix-blend-mode: difference;
  color: #f2f2f2;
}

.cinema__artist {
  letter-spacing: 0.3em;
}

/* Corte de cartela na troca de faixa */
.title-cut-enter-active { transition: opacity 0.5s var(--ease-scene), transform 0.5s var(--ease-scene), filter 0.5s var(--ease-scene); }
.title-cut-leave-active { transition: opacity 0.25s var(--ease-cut), transform 0.25s var(--ease-cut), filter 0.25s var(--ease-cut); }
.title-cut-enter-from   { opacity: 0; transform: translateY(0.2em); filter: blur(4px); }
.title-cut-leave-to     { opacity: 0; transform: translateY(-0.15em) scale(1.02); filter: blur(6px); }

.cinema__progress {
  width: min(420px, 70vw);
  height: 2px;
  background: var(--line);
  overflow: hidden;
}

.cinema__progress-fill {
  height: 100%;
  background: var(--music-accent, var(--ink));
  box-shadow: 0 0 8px var(--music-glow, transparent);
  transition: width 0.4s linear;
}

.cinema__viz {
  margin-top: 4px;
}

.cinema__timeline {
  margin-top: 14px;
}

.cinema__controls {
  display: flex;
  align-items: center;
  gap: 22px;
  margin-top: 8px;
}

.cinema__btn {
  padding: 14px 26px;
  border: 1px solid var(--ink-dim);
  color: var(--ink);
  letter-spacing: 0.24em;
  transition: background var(--t-fast) linear, color var(--t-fast) linear;
}

.cinema__btn:hover {
  background: var(--ink);
  color: var(--bg);
}

.cinema__btn--wide {
  padding: 16px 38px;
}

.cinema__hint {
  position: absolute;
  bottom: 18px;
  left: 50%;
  translate: -50% 0;
  letter-spacing: 0.26em;
  transition: opacity 1.4s var(--ease-scene);
}

.cinema__hint--hidden {
  opacity: 0;
}
</style>
