<script setup lang="ts">
import { useRoomStore } from '~/stores/room'

const room = useRoomStore()
</script>

<template>
  <div class="participants" aria-label="Participantes">
    <TransitionGroup name="signal" tag="div" class="participants__signals">
      <div
        v-for="p in room.participants"
        :key="p.id"
        class="participants__signal"
        :title="p.displayName"
        :class="{ 'participants__signal--me': p.id === room.participantId }"
      >
        <div class="participants__dot" />
        <span class="participants__name microtext">{{ p.displayName }}</span>
      </div>
    </TransitionGroup>
    <span class="microtext participants__count">
      {{ room.participants.length }} LIVE
    </span>
  </div>
</template>

<style scoped>
.participants {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.participants__signals {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.participants__signal {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0.65;
  transition: opacity var(--t-fast) linear;
}

.participants__signal--me {
  opacity: 1;
}

.participants__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ink-dim);
  animation: signal-pulse 3s ease-in-out infinite alternate;
}

.participants__signal--me .participants__dot {
  background: var(--ink);
}

@keyframes signal-pulse {
  from { opacity: 0.4; transform: scale(0.9); }
  to   { opacity: 1;   transform: scale(1.1); }
}

.participants__name {
  letter-spacing: 0.14em;
  font-size: 10px;
}

.participants__count {
  margin-left: auto;
}

/* TransitionGroup */
.signal-enter-active { transition: opacity 0.5s var(--ease-scene), transform 0.5s var(--ease-scene); }
.signal-leave-active { transition: opacity 0.3s linear; }
.signal-enter-from   { opacity: 0; transform: scale(0.7); }
.signal-leave-to     { opacity: 0; }
</style>
