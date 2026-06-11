<script setup lang="ts">
import { useRoomStore } from '~/stores/room'
import { useCinematicStore } from '~/stores/cinematic'
import { useRoom } from '~/composables/useRoom'
import type { SessionRecap as SessionRecapData } from '~/types/room'

/**
 * Room Live Mode (PRD §5.2.4) — a sala é um ambiente vivo, não uma lista.
 * Fila com drama visual, participantes como sinais, barras reagindo
 * à atividade e transição cinematográfica na troca de música.
 */
const route = useRoute()
const router = useRouter()
const room = useRoomStore()
const cinematic = useCinematicStore()
const { connect, disconnect, nextTrack } = useRoom()

const roomId = computed(() => String(route.params.id || '').toUpperCase())
const notFound = ref(false)
const recap = ref<SessionRecapData | null>(null)
const showRecap = ref(false)
const recapLoading = ref(false)

onMounted(async () => {
  // Valida a sala antes de abrir o socket
  const res = await fetch(`/api/room/${roomId.value}`)
  if (!res.ok) { notFound.value = true; return }
  connect(roomId.value)
})

onBeforeUnmount(() => {
  disconnect()
})

async function openRecap () {
  recapLoading.value = true
  try {
    const res = await fetch(`/api/room/${roomId.value}/recap`)
    if (res.ok) recap.value = await res.json()
  } finally {
    recapLoading.value = false
    showRecap.value = true
  }
}

function leaveToHome () {
  disconnect()
  router.push('/')
}

const linkCopied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

async function copyLink () {
  try {
    await navigator.clipboard.writeText(window.location.href)
    // Confirmação técnica curta no próprio botão — sem modal
    linkCopied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { linkCopied.value = false }, 1600)
  } catch { /* clipboard bloqueado */ }
}

onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
})
</script>

<template>
  <section class="room-stage">
    <!-- Sala não encontrada -->
    <div v-if="notFound" class="room-stage__missing">
      <p class="microtext">ROOM NOT FOUND</p>
      <h2 class="room-stage__missing-title">NO SIGNAL</h2>
      <button class="room-stage__btn microtext" @click="leaveToHome">RETURN TO BASE</button>
    </div>

    <!-- Conectando -->
    <div v-else-if="!room.inRoom" class="room-stage__connecting">
      <p class="microtext room-stage__pulse">ESTABLISHING SIGNAL — {{ roomId }}</p>
    </div>

    <!-- Sala viva -->
    <div v-else class="room-stage__live">
      <!-- Cabeçalho da sala -->
      <header class="room-stage__header">
        <div class="room-stage__title-block">
          <p class="microtext">LIVE SESSION</p>
          <h2 class="room-stage__name">{{ room.room?.name }}</h2>
          <button class="room-stage__link microtext" title="Copiar link da sala" @click="copyLink">
            {{ linkCopied ? 'LINK COPIED' : `${roomId} ⧉` }}
          </button>
        </div>
        <RoomParticipants />
      </header>

      <!-- Música atual -->
      <div v-if="room.room?.currentTrack" class="room-stage__now">
        <p class="microtext">NOW PLAYING</p>
        <p class="room-stage__now-title">{{ room.room.currentTrack.title }}</p>
        <p class="microtext microtext--bright">{{ room.room.currentTrack.artist }}</p>
      </div>

      <!-- Fila dramática -->
      <div class="room-stage__queue">
        <QueueDramaLayer />
      </div>

      <!-- Ações -->
      <footer class="room-stage__actions">
        <button class="room-stage__btn room-stage__btn--primary microtext" @click="cinematic.toggleCommandCenter()">
          ADD TRACK (⌘K)
        </button>
        <button
          class="room-stage__btn microtext"
          :disabled="room.queue.length === 0"
          @click="nextTrack()"
        >
          LOCK WINNER ▶
        </button>
        <button class="room-stage__btn microtext" :disabled="recapLoading" @click="openRecap">
          {{ recapLoading ? '...' : 'SESSION RECAP' }}
        </button>
        <button class="room-stage__btn microtext" @click="leaveToHome">
          LEAVE
        </button>
      </footer>
    </div>

    <!-- Session Recap overlay -->
    <SessionRecap
      v-if="showRecap && recap"
      :recap="recap"
      @close="showRecap = false"
    />
  </section>
</template>

<style scoped>
.room-stage {
  height: 100%;
  display: grid;
  place-items: center;
  padding: 16px clamp(16px, 4vw, 48px);
}

.room-stage__missing,
.room-stage__connecting {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.room-stage__missing-title {
  font-size: clamp(48px, 9vw, 120px);
  font-weight: 700;
  letter-spacing: -0.03em;
  mix-blend-mode: difference;
  color: #f2f2f2;
}

.room-stage__pulse {
  animation: connecting-pulse 1.2s ease-in-out infinite alternate;
  letter-spacing: 0.3em;
}

@keyframes connecting-pulse {
  from { opacity: 0.35; }
  to   { opacity: 1; }
}

.room-stage__live {
  width: min(860px, 100%);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

.room-stage__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.room-stage__title-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.room-stage__name {
  font-size: clamp(28px, 4.5vw, 56px);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.02em;
}

.room-stage__link {
  align-self: flex-start;
  padding: 4px 10px;
  border: 1px solid var(--glass-border);
  letter-spacing: 0.3em;
  transition: border-color var(--t-fast) linear;
}

.room-stage__link:hover {
  border-color: var(--ink-dim);
}

.room-stage__now {
  display: flex;
  align-items: baseline;
  gap: 16px;
  padding: 12px 16px;
  border: 1px solid var(--glass-border);
  background: var(--glass);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.room-stage__now-title {
  font-size: 18px;
  font-weight: 600;
}

.room-stage__queue {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--glass-border);
  background: var(--glass);
}

.room-stage__actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.room-stage__btn {
  padding: 13px 22px;
  border: 1px solid var(--glass-border);
  color: var(--ink);
  letter-spacing: 0.22em;
  transition: background var(--t-fast) linear, color var(--t-fast) linear, border-color var(--t-fast) linear;
}

.room-stage__btn:hover:not(:disabled) {
  border-color: var(--ink-dim);
  background: var(--glass);
}

.room-stage__btn--primary {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}

.room-stage__btn--primary:hover:not(:disabled) {
  background: transparent;
  color: var(--ink);
}

.room-stage__btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .room-stage { padding: 10px 12px; }
  .room-stage__live { gap: 10px; }
  .room-stage__now { padding: 10px 12px; gap: 10px; }
  .room-stage__actions { gap: 8px; }
  .room-stage__btn { padding: 12px 16px; flex: 1; }
}
</style>
