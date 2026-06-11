<script setup lang="ts">
import { useRoomStore } from '~/stores/room'
import { useRoom } from '~/composables/useRoom'

const room = useRoomStore()
const { vote, unvote, superVote } = useRoom()

const maxVotes = computed(() =>
  room.queue.reduce((m, i) => Math.max(m, i.votes), 0)
)
</script>

<template>
  <section class="queue-drama" aria-label="Fila de músicas">
    <header class="queue-drama__header microtext">
      <span class="microtext--bright">QUEUE SIGNAL</span>
      <span>{{ room.queue.length }} TRACK{{ room.queue.length !== 1 ? 'S' : '' }}</span>
      <span v-if="room.tensionActive" class="queue-drama__tension microtext--bright">
        TENSION HELD
      </span>
    </header>

    <TransitionGroup name="queue" tag="ul" class="queue-drama__list">
      <QueueDramaItem
        v-for="(item, i) in room.queue"
        :key="item.id"
        :item="item"
        :rank="i + 1"
        :max-votes="maxVotes"
        :is-my-vote="room.myVotes.includes(item.id)"
        @vote="vote"
        @unvote="unvote"
        @super-vote="superVote"
      />
    </TransitionGroup>

    <!-- Empty state -->
    <div v-if="room.queue.length === 0" class="queue-drama__empty microtext">
      <span class="microtext--bright">NO TRACKS IN QUEUE</span>
      <p>SEARCH AND ADD MUSIC TO BEGIN</p>
    </div>
  </section>
</template>

<style scoped>
.queue-drama {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.queue-drama__header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.queue-drama__tension {
  margin-left: auto;
  animation: tension-blink 0.9s ease-in-out infinite alternate;
}

@keyframes tension-blink {
  from { opacity: 0.5; }
  to   { opacity: 1; }
}

.queue-drama__list {
  position: relative; /* ancora os itens absolutos durante o leave */
  list-style: none;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.queue-drama__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex: 1;
  text-align: center;
  padding: 40px;
}

/* TransitionGroup — entrada como sinal novo, saída como corte seco (PRD §5.7.5).
   Itens saindo ficam absolutos para a disputa de posição reordenar com fluidez */
.queue-enter-active { transition: opacity 0.45s var(--ease-scene), transform 0.45s var(--ease-scene), filter 0.45s var(--ease-scene); }
.queue-leave-active { position: absolute; width: 100%; transition: opacity 0.25s var(--ease-cut), transform 0.25s var(--ease-cut); }
.queue-move         { transition: transform 0.55s var(--ease-liquid); }
.queue-enter-from   { opacity: 0; transform: translateX(-16px); filter: blur(3px); }
.queue-leave-to     { opacity: 0; transform: translateX(20px) scaleY(0.7); }
</style>
