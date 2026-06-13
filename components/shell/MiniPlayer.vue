<script setup lang="ts">
import { usePlayerStore } from '~/stores/player'
import { useCinematicStore } from '~/stores/cinematic'
import { useSpotifyPlayer } from '~/composables/useSpotifyPlayer'
import { useRoom } from '~/composables/useRoom'
import { useRoomStore } from '~/stores/room'

const player = usePlayerStore()
const cinematic = useCinematicStore()
const room = useRoomStore()
const { togglePlay, playTrack } = useSpotifyPlayer()
const { nextTrack: roomNextTrack } = useRoom()
const router = useRouter()

function skipNext () {
  if (room.inRoom) {
    roomNextTrack()
    const next = room.queue[0]
    if (next?.track?.uri) {
      playTrack({
        id: next.track.id,
        name: next.track.title,
        artists: [{ id: '', name: next.track.artist }],
        album: {
          id: '', name: next.track.album,
          images: next.track.coverUrl
            ? [{ url: next.track.coverUrl, height: 300, width: 300 }]
            : [],
          release_date: ''
        },
        duration_ms: next.track.durationMs,
        preview_url: next.track.previewUrl,
        popularity: 0,
        uri: next.track.uri
      })
    }
  }
}

function openFullPlayer () {
  router.push('/')
}

// Gestos no MiniPlayer — R8.1
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
  const threshold = 40

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
    // double tap → curtir
    player.triggerVotePulse()
    if ('vibrate' in navigator) navigator.vibrate(40)
  } else {
    openFullPlayer()
  }
  lastTap = now
}
</script>

<template>
  <div
    v-if="player.currentTrack && !cinematic.karaokeMode"
    class="mini-player"
    role="complementary"
    aria-label="Mini player"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
    @click="onTap"
  >
    <!-- Album art -->
    <img
      v-if="player.currentTrack.coverUrl"
      :src="player.currentTrack.coverUrl"
      :alt="player.currentTrack.title"
      class="mini-player__art"
      loading="lazy"
      width="44"
      height="44"
    />
    <div v-else class="mini-player__art mini-player__art--placeholder" aria-hidden="true" />

    <!-- Track info -->
    <div class="mini-player__info">
      <p class="mini-player__title">{{ player.currentTrack.title }}</p>
      <p class="mini-player__artist">{{ player.currentTrack.artist }}</p>
      <!-- Progress bar -->
      <div class="mini-player__bar" role="progressbar" :aria-valuenow="Math.round(player.progress * 100)" aria-valuemin="0" aria-valuemax="100">
        <div class="mini-player__bar-fill" :style="{ width: `${player.progress * 100}%` }" />
      </div>
    </div>

    <!-- Play/Pause -->
    <button
      class="mini-player__btn"
      :aria-label="player.status === 'playing' ? 'Pausar' : 'Reproduzir'"
      @click.stop="togglePlay"
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
        <path v-if="player.status === 'playing'" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        <path v-else d="M8 5v14l11-7z" />
      </svg>
    </button>

    <!-- Skip — só aparece quando há fila na sala -->
    <button
      v-if="room.inRoom && room.queue.length > 0"
      class="mini-player__btn"
      aria-label="Próxima música"
      @click.stop="skipNext"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.mini-player {
  position: fixed;
  bottom: calc(var(--nav-height) + var(--safe-bottom));
  left: 0;
  right: 0;
  z-index: 999;
  height: var(--mini-player-height);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: color-mix(in srgb, var(--bar) 95%, transparent);
  border-top: 1px solid var(--glass-border);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.mini-player__art {
  width: 44px;
  height: 44px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.mini-player__art--placeholder {
  background: var(--glass);
  border: 1px solid var(--glass-border);
}

.mini-player__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mini-player__title {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink);
  line-height: 1.15;
}

.mini-player__artist {
  font-size: 16px;
  color: var(--ink-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.15;
}

.mini-player__bar {
  margin-top: 4px;
  height: 2px;
  background: var(--glass-border);
  border-radius: 1px;
  overflow: hidden;
}

.mini-player__bar-fill {
  height: 100%;
  background: var(--ink-dim);
  border-radius: 1px;
  transition: width 1s linear;
}

.mini-player__btn {
  width: var(--touch-min);
  height: var(--touch-min);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--ink);
  border-radius: 50%;
  transition: background var(--t-fast) linear;
  touch-action: manipulation;
}

.mini-player__btn:hover {
  background: var(--glass);
}
</style>
