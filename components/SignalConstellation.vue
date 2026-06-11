<script setup lang="ts">
import { useRoomStore } from '~/stores/room'

/**
 * Signal Constellation (PRD Radiola §10.3) — participantes como pontos de luz
 * em órbita. Substitui a lista linear por uma constelação viva. Novos sinais
 * entram do fundo; quem sai se apaga devagar.
 */
const room = useRoomStore()

interface Star {
  id: string
  name: string
  x: number
  y: number
  me: boolean
}

const stars = computed<Star[]>(() => {
  const ps = room.participants
  const n = ps.length
  return ps.map((p, i) => {
    // Distribui em órbita; raio respira um pouco com a quantidade
    const angle = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2
    const radius = 38 + (n > 8 ? 6 : 0)
    return {
      id: p.id,
      name: p.displayName,
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
      me: p.id === room.participantId
    }
  })
})
</script>

<template>
  <div class="constel" :class="{ 'constel--tense': room.tensionActive }" aria-hidden="true">
    <div class="constel__core" />
    <TransitionGroup name="star">
      <div
        v-for="s in stars"
        :key="s.id"
        class="constel__star"
        :class="{ 'constel__star--me': s.me }"
        :style="{ left: `${s.x}%`, top: `${s.y}%` }"
        :title="s.name"
      >
        <span class="constel__dot" />
        <span class="constel__name microtext">{{ s.name.slice(0, 8) }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.constel {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  max-width: 220px;
  margin: 0 auto;
}

.constel__core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14%;
  height: 14%;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, var(--music-accent, #e8e8e8), transparent 70%);
  box-shadow: 0 0 24px var(--music-glow, transparent);
}

.constel--tense .constel__core {
  animation: core-throb 0.4s steps(2) infinite;
}

@keyframes core-throb {
  0%, 100% { scale: 1; }
  50% { scale: 1.18; }
}

.constel__star {
  position: absolute;
  translate: -50% -50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.constel__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ink);
  box-shadow: 0 0 8px var(--music-glow, rgba(255, 255, 255, 0.4));
  transition: transform 0.3s var(--ease-liquid);
}

.constel__star--me .constel__dot {
  background: var(--music-accent, var(--ink));
  scale: 1.3;
}

.constel__name {
  letter-spacing: 0.12em;
  opacity: 0.6;
  white-space: nowrap;
}

/* Entrada do fundo escuro; saída lenta (PRD §10.3) */
.star-enter-active { transition: opacity 0.8s var(--ease-scene), transform 0.8s var(--ease-scene); }
.star-leave-active { transition: opacity 2s var(--ease-scene); }
.star-enter-from { opacity: 0; transform: scale(0.2); }
.star-leave-to { opacity: 0; }
</style>
