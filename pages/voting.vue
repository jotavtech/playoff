<script setup lang="ts">
import { useRoomStore } from '~/stores/room'
import { usePlayerStore } from '~/stores/player'
import { useRoom } from '~/composables/useRoom'

const room = useRoomStore()
const player = usePlayerStore()
const { vote, unvote } = useRoom()

// Estado local de feedback por card (R4.3)
const cardFeedback = ref<Record<string, { confetti: boolean }>>({})
// Favoritos locais (só UI — R4.2)
const favorites = ref<Set<string>>(new Set())
// Dislikes locais (só UI — R4.2)
const dislikes = ref<Set<string>>(new Set())

function triggerHaptic () {
  if ('vibrate' in navigator) navigator.vibrate(40)
}

function getOrCreateFeedback (id: string) {
  if (!cardFeedback.value[id]) cardFeedback.value[id] = { confetti: false }
  return cardFeedback.value[id]
}

function handleVote (trackId: string) {
  const alreadyVoted = room.myVotes.includes(trackId)
  if (alreadyVoted) {
    unvote(trackId)
  } else {
    vote(trackId)
    triggerHaptic()
    // Remove dislike se tiver
    dislikes.value.delete(trackId)
    // Confetti pontual (R4.4)
    const fb = getOrCreateFeedback(trackId)
    fb.confetti = true
    setTimeout(() => { fb.confetti = false }, 700)
    player.triggerVotePulse()
  }
}

function handleDislike (trackId: string) {
  if (room.myVotes.includes(trackId)) unvote(trackId)
  if (dislikes.value.has(trackId)) {
    dislikes.value.delete(trackId)
  } else {
    dislikes.value.add(trackId)
    favorites.value.delete(trackId)
    triggerHaptic()
  }
}

function handleFavorite (trackId: string) {
  if (favorites.value.has(trackId)) {
    favorites.value.delete(trackId)
  } else {
    favorites.value.add(trackId)
    dislikes.value.delete(trackId)
    triggerHaptic()
  }
}

function fmtDuration (ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
</script>

<template>
  <div class="voting-screen">
    <header class="voting-screen__header">
      <h1 class="voting-screen__heading">Votação</h1>
    </header>

    <!-- Estado vazio -->
    <div v-if="room.queue.length === 0" class="voting-screen__empty">
      <p class="voting-screen__empty-text">Nenhuma música na fila para votar</p>
      <p class="voting-screen__empty-sub">Adicione faixas para começar</p>
    </div>

    <!-- Cards de votação (R4.1 — 140px) -->
    <ul v-else class="voting-screen__list" role="list">
      <li
        v-for="item in room.queue"
        :key="item.id"
        class="voting-screen__card"
        :class="{ 'voting-screen__card--voted': room.myVotes.includes(item.id) }"
        role="listitem"
      >
        <!-- Confetti one-shot pontual (R4.4) -->
        <div
          v-if="cardFeedback[item.id]?.confetti"
          class="vote-confetti"
          aria-hidden="true"
        >
          <span v-for="n in 8" :key="n" class="vote-confetti__dot" :style="{ '--i': n - 1 }" />
        </div>

        <!-- Cover -->
        <img
          v-if="item.track.coverUrl"
          :src="item.track.coverUrl"
          :alt="item.track.title"
          class="voting-screen__card-cover"
          loading="lazy"
          width="60"
          height="60"
        />
        <div v-else class="voting-screen__card-cover voting-screen__card-cover--empty" aria-hidden="true" />

        <!-- Info -->
        <div class="voting-screen__card-info">
          <p class="voting-screen__card-title">{{ item.track.title }}</p>
          <p class="voting-screen__card-artist">{{ item.track.artist }}</p>
          <p class="voting-screen__card-meta">{{ fmtDuration(item.track.durationMs) }}</p>
          <!-- Ações secundárias (R4.2) -->
          <div class="voting-screen__card-secondary">
            <button
              class="voting-screen__secondary-btn"
              :class="{ 'voting-screen__secondary-btn--active': favorites.has(item.id) }"
              :aria-label="`${favorites.has(item.id) ? 'Remover dos favoritos' : 'Favoritar'} ${item.track.title}`"
              :aria-pressed="favorites.has(item.id)"
              @click="handleFavorite(item.id)"
            >❤️</button>
            <button
              class="voting-screen__secondary-btn"
              :class="{ 'voting-screen__secondary-btn--active': dislikes.has(item.id) }"
              :aria-label="`${dislikes.has(item.id) ? 'Remover desgosto de' : 'Não gostei de'} ${item.track.title}`"
              :aria-pressed="dislikes.has(item.id)"
              @click="handleDislike(item.id)"
            >👎</button>
          </div>
        </div>

        <!-- Votar — ação principal, mais acessível ao polegar (R4.5) -->
        <div class="voting-screen__card-vote">
          <span class="voting-screen__card-votes" aria-live="polite">{{ item.votes }}</span>
          <button
            class="voting-screen__vote-btn"
            :class="{ 'voting-screen__vote-btn--active': room.myVotes.includes(item.id) }"
            :aria-label="`${room.myVotes.includes(item.id) ? 'Remover voto de' : 'Votar em'} ${item.track.title}`"
            :aria-pressed="room.myVotes.includes(item.id)"
            @click="handleVote(item.id)"
          >
            👍
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.voting-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.voting-screen__header {
  padding: 16px 20px 8px;
  flex-shrink: 0;
}

.voting-screen__heading {
  font-size: clamp(22px, 6vw, 32px);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink);
}

.voting-screen__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 24px;
}

.voting-screen__empty-text {
  font-size: 18px;
  color: var(--ink-dim);
  text-align: center;
}

.voting-screen__empty-sub {
  font-size: 16px;
  color: var(--ink-faint);
  text-align: center;
}

/* Lista */
.voting-screen__list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 0 var(--page-bottom-pad);
  display: flex;
  flex-direction: column;
  list-style: none;
}

/* Card (R4.1 — 140px) */
.voting-screen__card {
  height: var(--vote-card-height);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px 0 20px;
  border-bottom: 1px solid var(--glass-border);
  position: relative;
  transition: background var(--t-fast) linear;
  flex-shrink: 0;
}

.voting-screen__card--voted {
  background: var(--glass);
}

.voting-screen__card-cover {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.voting-screen__card-cover--empty {
  background: var(--glass);
  border: 1px solid var(--glass-border);
}

.voting-screen__card-info {
  flex: 1;
  min-width: 0;
}

.voting-screen__card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.voting-screen__card-artist {
  font-size: 16px;
  color: var(--ink-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.voting-screen__card-meta {
  font-family: var(--font-mono);
  font-size: 16px;
  color: var(--ink-faint);
  margin-top: 2px;
}

/* Ações secundárias: favoritar e dislike (R4.2) */
.voting-screen__card-secondary {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  margin-left: -10px; /* compensa o padding interno dos botões 48px */
}

.voting-screen__secondary-btn {
  width: var(--touch-min);
  height: var(--touch-min);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border-radius: 50%;
  border: 1px solid transparent;
  transition: background var(--t-fast) linear, border-color var(--t-fast) linear, transform var(--t-fast) var(--ease-liquid);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  opacity: 0.55;
}

.voting-screen__secondary-btn--active {
  opacity: 1;
  border-color: var(--glass-border);
  background: var(--glass);
}

.voting-screen__secondary-btn:active {
  transform: scale(0.88);
  opacity: 1;
}

/* Voto — área direita, ação principal acessível ao polegar (R4.5) */
.voting-screen__card-vote {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.voting-screen__card-votes {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1;
  text-align: center;
  min-width: 28px;
}

/* Botão de voto: maior e mais proeminente — polegar zona direita (R4.5) */
.voting-screen__vote-btn {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  border-radius: 50%;
  border: 2px solid var(--glass-border);
  background: var(--glass);
  transition: transform var(--t-fast) var(--ease-liquid), border-color var(--t-fast) linear, background var(--t-fast) linear;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.voting-screen__vote-btn--active {
  border-color: var(--ink-dim);
  background: rgba(255,255,255,0.1);
}

.voting-screen__vote-btn:active {
  transform: scale(0.88);
}

/* Confetti one-shot (R4.4) */
.vote-confetti {
  position: absolute;
  top: 50%;
  right: 38px;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 10;
}

.vote-confetti__dot {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ink);
  transform: translate(0, 0) scale(1);
  opacity: 1;
  animation: confetti-burst 0.65s ease-out forwards;
  animation-delay: calc(var(--i) * 0.02s);
}

/* 8 ângulos: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315° */
.vote-confetti__dot:nth-child(1) { --tx: 30px;  --ty: 0px; }
.vote-confetti__dot:nth-child(2) { --tx: 21px;  --ty: -21px; }
.vote-confetti__dot:nth-child(3) { --tx: 0px;   --ty: -30px; }
.vote-confetti__dot:nth-child(4) { --tx: -21px; --ty: -21px; }
.vote-confetti__dot:nth-child(5) { --tx: -30px; --ty: 0px; }
.vote-confetti__dot:nth-child(6) { --tx: -21px; --ty: 21px; }
.vote-confetti__dot:nth-child(7) { --tx: 0px;   --ty: 30px; }
.vote-confetti__dot:nth-child(8) { --tx: 21px;  --ty: 21px; }

@keyframes confetti-burst {
  0%   { opacity: 1; transform: translate(0, 0) scale(1); }
  70%  { opacity: 0.8; transform: translate(var(--tx), var(--ty)) scale(0.7); }
  100% { opacity: 0; transform: translate(calc(var(--tx) * 1.3), calc(var(--ty) * 1.3 + 8px)) scale(0); }
}

@media (prefers-reduced-motion: reduce) {
  .vote-confetti { display: none; }
  .voting-screen__vote-btn,
  .voting-screen__secondary-btn { transition: none; }
}
</style>
