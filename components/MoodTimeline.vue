<script setup lang="ts">
import { useMusicVisualStore } from '~/stores/musicVisual'

/**
 * Mood Timeline (PRD Radiola §10.2) — linha do tempo visual da sessão.
 * Cada faixa tocada é um ponto: cor pelo accent extraído, altura pela energia.
 * Conta a jornada sonora sem palavras.
 */
const music = useMusicVisualStore()

const points = computed(() => music.moodHistory)
const hasHistory = computed(() => points.value.length >= 2)

function fmtTime (ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div v-if="hasHistory" class="mtl" aria-label="Mood timeline da sessão">
    <p class="mtl__label microtext">SESSION MOOD</p>
    <div class="mtl__track">
      <div class="mtl__line" />
      <div
        v-for="(p, i) in points"
        :key="p.at + '-' + i"
        class="mtl__point"
        :style="{
          left: `${(i / Math.max(1, points.length - 1)) * 100}%`,
          '--p-accent': p.accent,
          '--p-energy': p.energy
        }"
        :title="`${p.title} — ${p.artist} · ${p.mood} · ${fmtTime(p.at)}`"
      >
        <span class="mtl__dot" />
      </div>
    </div>
    <div class="mtl__ends microtext">
      <span>{{ points[0]?.mood }}</span>
      <span>{{ points[points.length - 1]?.mood }}</span>
    </div>
  </div>
</template>

<style scoped>
.mtl {
  width: min(560px, 80vw);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mtl__label {
  letter-spacing: 0.3em;
  text-align: center;
}

.mtl__track {
  position: relative;
  height: 40px;
}

.mtl__line {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--line);
}

.mtl__point {
  position: absolute;
  top: 50%;
  translate: -50% -50%;
}

.mtl__dot {
  display: block;
  width: calc(6px + 10px * var(--p-energy, 0.5));
  height: calc(6px + 10px * var(--p-energy, 0.5));
  border-radius: 50%;
  background: var(--p-accent, var(--ink));
  box-shadow: 0 0 10px var(--p-accent, transparent);
  transition: transform 0.3s var(--ease-liquid);
}

.mtl__point:hover .mtl__dot {
  transform: scale(1.4);
}

.mtl__ends {
  display: flex;
  justify-content: space-between;
  letter-spacing: 0.2em;
  opacity: 0.6;
}
</style>
