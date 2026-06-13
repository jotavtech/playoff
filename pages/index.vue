<script setup lang="ts">
import { usePlayerStore } from '~/stores/player'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useSpotifyPlayer } from '~/composables/useSpotifyPlayer'
import { useCinematicStore } from '~/stores/cinematic'
import { useRoomStore } from '~/stores/room'
import { useRoom } from '~/composables/useRoom'
import HomeVinyl from '~/components/shell/HomeVinyl.vue'

const player = usePlayerStore()
const music = useMusicVisualStore()
const cinematic = useCinematicStore()
const room = useRoomStore()
const { togglePlay } = useSpotifyPlayer()
const { vote, unvote } = useRoom()
const router = useRouter()

// Tamanho do disco: máx 35vw (R2.2, R9.5)
const vinylSize = ref(200)
onMounted(() => {
  vinylSize.value = Math.min(Math.floor(window.innerWidth * 0.33), 240)
})

// Gestos mobile — R8.1
let touchStartX = 0
let touchStartY = 0
let lastTap = 0

function onTouchStart (e: TouchEvent) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

function onTouchEnd (e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)
  const threshold = 50

  if (adx > ady && adx > threshold) {
    if (dx < 0) router.push('/voting')
    else router.push('/queue')
  } else if (dy > threshold && ady > adx) {
    router.push('/karaoke')
  }
}

function onTap () {
  const now = Date.now()
  if (now - lastTap < 300) {
    // double tap → curtir primeira da fila — R8.1
    const top = room.queue[0]
    if (top) {
      const alreadyVoted = room.myVotes.includes(top.id)
      alreadyVoted ? unvote(top.id) : vote(top.id)
      player.triggerVotePulse()
      triggerHaptic()
    }
  }
  lastTap = now
}

function triggerHaptic () {
  if ('vibrate' in navigator) navigator.vibrate(40)
}

const hasTrack = computed(() => !!music.currentTrack)
const albumArt = computed(() => music.currentTrack?.coverUrl ?? '')
</script>

<template>
  <div
    class="home-screen"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
    @click="onTap"
  >
    <!-- Estado com música (R2.1–R2.4) -->
    <template v-if="hasTrack">
      <!-- Disco (R2.2, R9) -->
      <div class="home-screen__vinyl-wrap">
        <HomeVinyl
          :size="vinylSize"
          :cover="albumArt"
          :status="player.status"
          :vote-pulse="player.lastVotePulse"
        />
      </div>

      <!-- Info da faixa -->
      <div class="home-screen__track">
        <p class="home-screen__track-title">{{ music.currentTrack!.title }}</p>
        <p class="home-screen__track-artist">{{ music.currentTrack!.artist }}</p>
      </div>

      <!-- Progresso -->
      <div
        class="home-screen__progress"
        role="progressbar"
        :aria-valuenow="Math.round(player.progress * 100)"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`Progresso: ${player.timecode}`"
      >
        <div class="home-screen__progress-fill" :style="{ width: `${player.progress * 100}%` }" />
      </div>
      <p class="home-screen__timecode" aria-hidden="true">{{ player.timecode }}</p>

      <!-- Controles (R2.3) -->
      <div class="home-screen__controls" role="group" aria-label="Controles de reprodução">
        <button
          class="home-screen__ctrl-btn"
          :aria-label="player.muted ? 'Ativar som' : 'Silenciar'"
          @click.stop="player.toggleMute()"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path v-if="!player.muted" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            <path v-else d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
          </svg>
        </button>

        <button
          class="home-screen__play-btn"
          :aria-label="music.isPlaying ? 'Pausar' : 'Reproduzir'"
          @click.stop="togglePlay"
        >
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" aria-hidden="true">
            <path v-if="music.isPlaying" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            <path v-else d="M8 5v14l11-7z" />
          </svg>
        </button>

        <button class="home-screen__ctrl-btn" aria-label="Fila" @click.stop="router.push('/queue')">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
          </svg>
        </button>
      </div>

      <!-- CTA Votar — ação mais importante (R2.4) -->
      <NuxtLink to="/voting" class="home-screen__vote-cta" aria-label="Votar na próxima música">
        VOTAR AGORA
      </NuxtLink>
    </template>

    <!-- Estado vazio (R2.5) -->
    <div v-else class="home-screen__empty">
      <div class="home-screen__vinyl-wrap">
        <HomeVinyl :size="vinylSize" cover="" status="paused" :vote-pulse="0" />
      </div>
      <p class="home-screen__empty-title">Escolha uma música para começar</p>
      <p class="home-screen__empty-sub">Entre em uma sala para participar</p>
      <button
        class="home-screen__empty-btn"
        @click.stop="cinematic.toggleCommandCenter()"
      >
        ADICIONAR FAIXA
      </button>
    </div>
  </div>
</template>

<style scoped>
.home-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 16px 24px var(--page-bottom-pad);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.home-screen__vinyl-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: var(--vinyl-max);
  max-height: var(--vinyl-max);
  flex-shrink: 0;
}

.home-screen__track {
  text-align: center;
  max-width: 320px;
  width: 100%;
}

.home-screen__track-title {
  font-size: clamp(18px, 5vw, 26px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--ink);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.home-screen__track-artist {
  font-size: 16px;
  color: var(--ink-dim);
  margin-top: 4px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.home-screen__progress {
  width: 100%;
  max-width: 320px;
  height: 3px;
  background: var(--glass-border);
  border-radius: 2px;
  overflow: hidden;
}

.home-screen__progress-fill {
  height: 100%;
  background: var(--ink-dim);
  border-radius: 2px;
  transition: width 1s linear;
}

.home-screen__timecode {
  font-family: var(--font-mono);
  font-size: 16px;
  letter-spacing: 0.1em;
  color: var(--ink-faint);
  margin-top: -12px;
}

.home-screen__controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.home-screen__ctrl-btn {
  width: var(--touch-min);
  height: var(--touch-min);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-dim);
  border-radius: 50%;
  transition: color var(--t-fast) linear, background var(--t-fast) linear;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.home-screen__ctrl-btn:hover,
.home-screen__ctrl-btn:active {
  color: var(--ink);
  background: var(--glass);
}

.home-screen__play-btn {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ink);
  color: var(--bg);
  border-radius: 50%;
  flex-shrink: 0;
  transition: transform var(--t-fast) var(--ease-liquid), opacity var(--t-fast) linear;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.home-screen__play-btn:active {
  transform: scale(0.92);
  opacity: 0.85;
}

.home-screen__vote-cta {
  display: block;
  width: 100%;
  max-width: 360px;
  padding: 20px 24px;
  background: var(--ink);
  color: var(--bg);
  text-align: center;
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-decoration: none;
  border-radius: 4px;
  transition: opacity var(--t-fast) linear, transform var(--t-fast) var(--ease-liquid);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}

.home-screen__vote-cta:active {
  opacity: 0.85;
  transform: scale(0.97);
}

/* ── Estado vazio ── */
.home-screen__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  padding-bottom: var(--page-bottom-pad);
}

.home-screen__empty-title {
  font-size: clamp(18px, 5vw, 24px);
  font-weight: 600;
  color: var(--ink);
}

.home-screen__empty-sub {
  font-size: 16px;
  color: var(--ink-dim);
}

.home-screen__empty-btn {
  padding: 16px 32px;
  border: 1px solid var(--glass-border);
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 16px;
  letter-spacing: 0.1em;
  border-radius: 4px;
  min-width: var(--touch-min);
  min-height: var(--touch-min);
  transition: background var(--t-fast) linear, border-color var(--t-fast) linear;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.home-screen__empty-btn:hover {
  background: var(--glass);
  border-color: var(--ink-dim);
}
</style>
