<script setup lang="ts">
import type { QueueItem } from '~/types/room'

const props = defineProps<{
  item: QueueItem
  rank: number
  maxVotes: number
  isMyVote: boolean
}>()

const emit = defineEmits<{
  vote: [id: string]
  unvote: [id: string]
  superVote: [id: string]
}>()

const voteScale = computed(() => {
  if (props.maxVotes === 0) return 1
  return 1 + (props.item.votes / props.maxVotes) * 0.35
})

const stateClass = computed(() => ({
  'drama-item--winner':  props.item.dramaticState === 'winner',
  'drama-item--tension': props.item.dramaticState === 'tension',
  'drama-item--leading': props.item.dramaticState === 'leading'
}))

function fmt (ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
</script>

<template>
  <li
    class="drama-item"
    :class="stateClass"
    :style="{ '--vote-scale': voteScale }"
    :data-state="item.dramaticState"
  >
    <!-- Rank indicator -->
    <span class="drama-item__rank microtext">{{ String(rank).padStart(2, '0') }}</span>

    <!-- Cover -->
    <div class="drama-item__cover-wrap">
      <img
        v-if="item.track.coverUrl"
        :src="item.track.coverUrl"
        class="drama-item__cover"
        loading="lazy"
        alt=""
      >
      <div v-else class="drama-item__cover drama-item__cover--empty" />
      <!-- Winner/tension overlay -->
      <div v-if="item.dramaticState !== 'normal'" class="drama-item__state-badge microtext">
        {{ item.dramaticState === 'winner' ? '▶' : item.dramaticState === 'tension' ? '≈' : '↑' }}
      </div>
    </div>

    <!-- Info -->
    <div class="drama-item__info">
      <p class="drama-item__title">{{ item.track.title }}</p>
      <p class="drama-item__meta microtext">
        {{ item.track.artist }} · {{ fmt(item.track.durationMs) }}
      </p>
      <p class="drama-item__added microtext">ADDED BY {{ item.addedByName }}</p>
    </div>

    <!-- Vote count (escala pelo volume de votos; cada voto novo dá um pulso) -->
    <div class="drama-item__votes">
      <Transition name="vote-pop" mode="out-in">
        <span :key="item.votes" class="drama-item__vote-count">{{ item.votes }}</span>
      </Transition>
      <span class="microtext">VOTES</span>
    </div>

    <!-- Ações -->
    <div class="drama-item__actions">
      <button
        v-if="isMyVote"
        class="drama-item__btn drama-item__btn--voted microtext"
        title="Remover voto"
        aria-label="Remover voto"
        @click.stop="emit('unvote', item.id)"
      >
        ✕
      </button>
      <button
        v-else
        class="drama-item__btn microtext"
        title="Votar"
        aria-label="Votar"
        @click.stop="emit('vote', item.id)"
      >
        ▲
      </button>
      <button
        class="drama-item__btn drama-item__btn--super microtext"
        title="Super Vote (+3)"
        aria-label="Super Vote, vale 3 votos"
        @click.stop="emit('superVote', item.id)"
      >
        ⚡
      </button>
    </div>
  </li>
</template>

<style scoped>
.drama-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-left: 2px solid transparent;
  transition:
    border-color var(--t-fast) linear,
    background var(--t-fast) linear,
    transform 0.5s var(--ease-scene);
  position: relative;
}

.drama-item--winner {
  border-left-color: var(--ink);
  background: var(--glass);
  /* spotlight interno — a vencedora ocupa o palco */
  box-shadow: inset 0 0 40px rgba(255, 255, 255, 0.04);
}

.drama-item--tension {
  border-left-color: var(--ink-dim);
  animation:
    tension-pulse 1.8s ease-in-out infinite alternate,
    tension-jitter 0.18s steps(2) infinite;
}

.drama-item--leading {
  border-left-color: var(--ink-faint);
}

@keyframes tension-pulse {
  from { background: transparent; }
  to   { background: var(--glass); }
}

/* Micro tremor de disputa — quase subliminar, só inquieta a cena */
@keyframes tension-jitter {
  from { translate: 0 0; }
  to   { translate: 0.4px 0; }
}

.drama-item__rank {
  width: 22px;
  flex-shrink: 0;
  text-align: right;
}

.drama-item__cover-wrap {
  position: relative;
  flex-shrink: 0;
}

.drama-item__cover {
  width: 48px;
  height: 48px;
  object-fit: cover;
  display: block;
  filter: saturate(0) contrast(1.05);
  transition: filter var(--t-scene) var(--ease-scene);
}

.drama-item--winner .drama-item__cover,
.drama-item--tension .drama-item__cover {
  filter: saturate(0.15) contrast(1.1);
}

.drama-item__cover--empty {
  background: var(--glass);
  border: 1px solid var(--glass-border);
}

.drama-item__state-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  background: var(--ink);
  color: var(--bg);
  width: 16px;
  height: 16px;
  display: grid;
  place-items: center;
  font-size: 8px;
}

.drama-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.drama-item__title {
  font-size: 16px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drama-item__meta, .drama-item__added {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drama-item__votes {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  transform-origin: center;
  /* escala dirigida por --vote-scale (setada no <li>) — quem tem mais votos cresce */
  transform: scale(var(--vote-scale, 1));
  transition: transform 0.6s var(--ease-liquid);
}

.drama-item__vote-count {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

/* Pulso a cada voto: o número novo entra com impacto, não troca seca */
.vote-pop-enter-active { transition: transform 0.35s var(--ease-liquid), opacity 0.2s linear; }
.vote-pop-leave-active { transition: transform 0.12s var(--ease-cut), opacity 0.12s linear; }
.vote-pop-enter-from   { transform: scale(1.6); opacity: 0; }
.vote-pop-leave-to     { transform: scale(0.7); opacity: 0; }

.drama-item__actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.drama-item__btn {
  width: 30px;
  height: 30px;
  border: 1px solid var(--glass-border);
  display: grid;
  place-items: center;
  font-size: 11px;
  transition: background var(--t-fast) linear, border-color var(--t-fast) linear;
}

.drama-item__btn:hover {
  border-color: var(--ink-dim);
  background: var(--glass);
}

.drama-item__btn--voted {
  background: var(--glass);
  border-color: var(--ink-dim);
}

.drama-item__btn--super {
  font-size: 16px;
}

/* Winner ganha destaque de escala */
.drama-item--winner .drama-item__vote-count {
  color: var(--ink);
}

@media (max-width: 600px) {
  .drama-item { gap: 10px; padding: 10px 12px; }
  .drama-item__rank { display: none; }
  .drama-item__added { display: none; }
  .drama-item__cover { width: 40px; height: 40px; }
}
</style>
