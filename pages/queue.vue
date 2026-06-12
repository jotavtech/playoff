<script setup lang="ts">
import { useRoomStore } from '~/stores/room'
import { useMusicVisualStore } from '~/stores/musicVisual'

const room = useRoomStore()
const music = useMusicVisualStore()

const currentTrack = computed(() => music.currentTrack)

// Fila dividida em seções (R7.1)
const upcoming = computed(() => room.queue.slice(0, 1))
const later = computed(() => room.queue.slice(1))

function fmtDuration (ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
</script>

<template>
  <div class="queue-screen">
    <header class="queue-screen__header">
      <h1 class="queue-screen__heading">Fila</h1>
    </header>

    <!-- Estado vazio (R7.4) -->
    <div v-if="!currentTrack && room.queue.length === 0" class="queue-screen__empty">
      <p class="queue-screen__empty-text">Nenhuma música na fila</p>
    </div>

    <div v-else class="queue-screen__content">
      <!-- Tocando Agora (R7.1) -->
      <section v-if="currentTrack" class="queue-screen__section">
        <h2 class="queue-screen__section-label">TOCANDO AGORA</h2>
        <QueueItem
          :cover="currentTrack.coverUrl ?? ''"
          :title="currentTrack.title"
          :artist="currentTrack.artist"
          :duration="fmtDuration(currentTrack.durationMs)"
          :votes="0"
          :active="true"
        />
      </section>

      <!-- Próxima (R7.1) -->
      <section v-if="upcoming.length > 0" class="queue-screen__section">
        <h2 class="queue-screen__section-label">PRÓXIMA</h2>
        <QueueItem
          v-for="item in upcoming"
          :key="item.id"
          :cover="item.track.coverUrl ?? ''"
          :title="item.track.title"
          :artist="item.track.artist"
          :duration="fmtDuration(item.track.durationMs)"
          :votes="item.votes"
        />
      </section>

      <!-- Depois (R7.1) -->
      <section v-if="later.length > 0" class="queue-screen__section">
        <h2 class="queue-screen__section-label">DEPOIS</h2>
        <QueueItem
          v-for="item in later"
          :key="item.id"
          :cover="item.track.coverUrl ?? ''"
          :title="item.track.title"
          :artist="item.track.artist"
          :duration="fmtDuration(item.track.durationMs)"
          :votes="item.votes"
        />
      </section>

      <!-- Fila vazia mas há música tocando -->
      <div v-if="room.queue.length === 0" class="queue-screen__empty">
        <p class="queue-screen__empty-text">Nenhuma música na fila</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.queue-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.queue-screen__header {
  padding: 16px 20px 8px;
  flex-shrink: 0;
}

.queue-screen__heading {
  font-size: clamp(22px, 6vw, 32px);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink);
}

.queue-screen__content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 0 var(--page-bottom-pad);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.queue-screen__section {
  padding: 0 20px;
}

.queue-screen__section-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.22em;
  color: var(--ink-faint);
  padding: 16px 0 8px;
  text-transform: uppercase;
}

.queue-screen__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
}

.queue-screen__empty-text {
  font-size: 18px;
  color: var(--ink-dim);
  text-align: center;
}
</style>
