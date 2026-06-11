<script setup lang="ts">
import { useRoomStore } from '~/stores/room'

/**
 * Queue Tension Meter (PRD Radiola §10.4) — barra vertical que mede a disputa.
 * Branco (calma) → tons frios → vermelho-escuro (DEAD HEAT). Quando atinge o
 * topo, pulsa e anuncia o empate mortal.
 */
const room = useRoomStore()

const level = computed(() => room.tensionLevel)
const deadHeat = computed(() => level.value > 0.92)

// Cor fria→quente conforme a tensão sobe (dentro do universo monocromático+accent)
const fillColor = computed(() => {
  const t = level.value
  if (t < 0.4) return 'rgba(242, 242, 242, 0.5)'
  if (t < 0.7) return 'var(--music-accent, rgba(180, 200, 230, 0.8))'
  // Alta tensão: vermelho-escuro dramático
  return `rgba(${Math.round(140 + t * 80)}, ${Math.round(40 * (1 - t))}, ${Math.round(40 * (1 - t))}, 0.92)`
})
</script>

<template>
  <div class="tmeter" :class="{ 'tmeter--dead-heat': deadHeat }" aria-hidden="true">
    <div class="tmeter__track">
      <div
        class="tmeter__fill"
        :style="{ height: `${level * 100}%`, background: fillColor }"
      />
    </div>
    <p class="tmeter__label microtext">
      {{ deadHeat ? 'DEAD HEAT' : 'TENSION' }}
    </p>
  </div>
</template>

<style scoped>
.tmeter {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  height: 100%;
}

.tmeter__track {
  position: relative;
  flex: 1;
  width: 4px;
  background: var(--line);
  border-radius: 2px;
  overflow: hidden;
  min-height: 80px;
}

.tmeter__fill {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  border-radius: 2px;
  transition: height 0.5s var(--ease-liquid), background 0.6s linear;
  box-shadow: 0 0 12px var(--music-glow, transparent);
}

.tmeter__label {
  writing-mode: vertical-rl;
  letter-spacing: 0.3em;
  transform: rotate(180deg);
}

.tmeter--dead-heat {
  animation: dead-heat-pulse 0.5s steps(2) infinite;
}

.tmeter--dead-heat .tmeter__label {
  color: rgba(220, 80, 80, 0.95);
}

@keyframes dead-heat-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
</style>
