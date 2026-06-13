<script setup lang="ts">
import { useLyrics } from '~/composables/useLyrics'
import { usePlayerStore } from '~/stores/player'
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'

const { lines, available, activeIndex, status } = useLyrics()
const player = usePlayerStore()
const music = useMusicVisualStore()
const cinematic = useCinematicStore()

// TV Mode (R6) — ativa karaokeMode da store para esconder nav/mini player
const tvMode = ref(false)
function toggleTvMode () {
  tvMode.value = !tvMode.value
  cinematic.karaokeMode = tvMode.value
  if (tvMode.value) {
    document.documentElement.requestFullscreen?.().catch(() => {})
  } else {
    document.exitFullscreen?.().catch(() => {})
  }
}

// Sync fullscreen state
function onFsChange () {
  if (!document.fullscreenElement && tvMode.value) {
    tvMode.value = false
    cinematic.karaokeMode = false
  }
}
onMounted(() => document.addEventListener('fullscreenchange', onFsChange))
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFsChange)
  if (tvMode.value) {
    cinematic.karaokeMode = false
    document.exitFullscreen?.().catch(() => {})
  }
})

// Auto-scroll sincronizado pelo índice da linha ativa (D2, R5.4)
const listEl = ref<HTMLElement | null>(null)
watch(activeIndex, (idx) => {
  if (!listEl.value || idx < 0) return
  const lineEl = listEl.value.children[idx] as HTMLElement | undefined
  if (lineEl) {
    lineEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
})

// Timecode — mesma fonte que o player (R5.5)
const timecode = computed(() => player.timecode)
const hasTrack = computed(() => !!music.currentTrack)
</script>

<template>
  <div class="karaoke-screen" :class="{ 'karaoke-screen--tv': tvMode }">

    <!-- Header informativo (sem toques — só título; oculto no TV mode) -->
    <header v-if="!tvMode" class="karaoke-screen__header">
      <p class="karaoke-screen__title">Karaokê</p>
      <!-- Progresso sempre visível (R5.5) -->
      <p class="karaoke-screen__timecode" aria-live="off">{{ timecode }}</p>
    </header>

    <!-- Sem música -->
    <div v-if="!hasTrack" class="karaoke-screen__empty">
      <p class="karaoke-screen__empty-text">Letra ainda não disponível</p>
    </div>

    <!-- Letra indisponível (R5.6) -->
    <div v-else-if="!available" class="karaoke-screen__empty">
      <p class="karaoke-screen__empty-text">
        {{ status === 'loading' ? 'Carregando letra…' : 'Letra ainda não disponível' }}
      </p>
    </div>

    <!-- Letra sincronizada (R5.1–R5.4) -->
    <div v-else class="karaoke-screen__lyrics-wrap">
      <ul ref="listEl" class="karaoke-screen__lyrics" aria-live="polite" aria-atomic="false">
        <li
          v-for="(line, i) in lines"
          :key="i"
          class="karaoke-screen__line"
          :class="{
            'karaoke-screen__line--active':  i === activeIndex,
            'karaoke-screen__line--past':    i < activeIndex,
            'karaoke-screen__line--future':  i > activeIndex,
          }"
          :aria-current="i === activeIndex ? 'true' : undefined"
        >
          {{ line.text }}
        </li>
      </ul>
    </div>

    <!-- Fundo animado — SOMENTE no TV mode (R6.2, R6.3) -->
    <div v-if="tvMode" class="karaoke-screen__tv-bg" aria-hidden="true">
      <div
        v-if="music.currentTrack?.coverUrl"
        class="karaoke-screen__tv-cover"
        :style="{ backgroundImage: `url(${music.currentTrack.coverUrl})` }"
      />
    </div>

    <!-- Modo TV: ação flutuante na zona do polegar (canto inferior direito) -->
    <button
      v-if="!tvMode"
      class="karaoke-screen__tv-fab"
      aria-label="Ativar modo TV (tela cheia)"
      @click="toggleTvMode"
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
        <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
      </svg>
      <span class="karaoke-screen__tv-fab-label">TV</span>
    </button>

    <!-- Sair do TV mode — também na base, alcançável pelo polegar -->
    <button v-if="tvMode" class="karaoke-screen__tv-exit" aria-label="Sair do modo TV" @click="toggleTvMode">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
      </svg>
    </button>

  </div>
</template>

<style scoped>
.karaoke-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 0 var(--page-bottom-pad);
  overflow: hidden;
  position: relative;
}

/* ── Header (informativo, sem toques) ── */
.karaoke-screen__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 14px 20px 8px;
  flex-shrink: 0;
}

.karaoke-screen__title {
  font-family: var(--font-mono);
  font-size: 16px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink);
}

/* ── Timecode (R5.5) ── */
.karaoke-screen__timecode {
  font-family: var(--font-mono);
  font-size: 16px;
  letter-spacing: 0.12em;
  color: var(--ink-faint);
}

/* ── FAB Modo TV — zona do polegar, acima do mini player + nav ── */
.karaoke-screen__tv-fab {
  position: fixed;
  right: 16px;
  bottom: calc(var(--page-bottom-pad) + 8px);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 8px;
  height: var(--touch-min);
  padding: 0 20px;
  border-radius: 28px;
  background: var(--ink);
  color: var(--bg);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
  transition: transform var(--t-fast) var(--ease-liquid), opacity var(--t-fast) linear;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.karaoke-screen__tv-fab:active {
  transform: scale(0.94);
  opacity: 0.9;
}

.karaoke-screen__tv-fab-label {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

/* ── Estado vazio ── */
.karaoke-screen__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.karaoke-screen__empty-text {
  font-size: 18px;
  color: var(--ink-dim);
  text-align: center;
}

/* ── Letras (R5.1–R5.4) ── */
.karaoke-screen__lyrics-wrap {
  flex: 1;
  overflow: hidden;
  padding: 0 16px;
}

.karaoke-screen__lyrics {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20vh 0;
  overflow-y: auto;
  height: 100%;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.karaoke-screen__line {
  font-size: clamp(20px, 5vw, 32px);
  font-weight: 600;
  line-height: 1.3;
  text-align: center;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

/* Opacidades (R5.2) */
.karaoke-screen__line--active {
  opacity: var(--lyric-current);
  transform: scale(1.04);
  color: var(--ink);
}

.karaoke-screen__line--future {
  opacity: var(--lyric-future);
  color: var(--ink-dim);
}

.karaoke-screen__line--past {
  opacity: var(--lyric-past);
  color: var(--ink-faint);
}

/* ── Modo TV (R6) ── */
.karaoke-screen--tv {
  position: fixed;
  inset: 0;
  z-index: 1100;
  padding: 0;
  background: #000;
}

.karaoke-screen--tv .karaoke-screen__lyrics-wrap {
  padding: 0 40px;
}

.karaoke-screen--tv .karaoke-screen__line {
  font-size: clamp(28px, 5vw, 56px);
}

/* Fundo animado — SOMENTE TV (R6.3) */
.karaoke-screen__tv-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
}

.karaoke-screen__tv-cover {
  position: absolute;
  inset: -20%;
  background-size: cover;
  background-position: center;
  filter: blur(60px) brightness(0.25) saturate(1.5);
  animation: tv-bg-drift 20s ease-in-out infinite alternate;
}

@keyframes tv-bg-drift {
  from { transform: scale(1.05) translate(-1%, -1%); }
  to   { transform: scale(1.12) translate(1%, 1%); }
}

/* Botão sair do TV mode — base direita, alcançável pelo polegar */
.karaoke-screen__tv-exit {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom) + 24px);
  right: 24px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.75);
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.15);
  transition: color var(--t-fast) linear, transform var(--t-fast) var(--ease-liquid);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  z-index: 10;
}

.karaoke-screen__tv-exit:active {
  color: #fff;
  transform: scale(0.92);
}

@media (prefers-reduced-motion: reduce) {
  .karaoke-screen__tv-cover { animation: none; }
  .karaoke-screen__line { transition: none; }
  .karaoke-screen__lyrics { scroll-behavior: auto; }
}
</style>
