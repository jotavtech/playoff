<script setup lang="ts">
import { useLyrics } from '~/composables/useLyrics'

/**
 * Live Lyrics Layer (PRD Radiola §10.8) — linha atual em destaque, adjacentes
 * esmaecidas, transição em cross-fade. Só aparece quando há um provedor de
 * letras ativo; caso contrário, fica invisível (sem poluir a cena).
 */
const { lines, available, activeIndex } = useLyrics()

// Janela de 3 linhas: anterior, atual, próxima
const window3 = computed(() => {
  if (!available.value) return []
  const i = activeIndex.value
  return [lines.value[i - 1], lines.value[i], lines.value[i + 1]]
})
</script>

<template>
  <div v-if="available && activeIndex >= 0" class="lyrics" aria-hidden="true">
    <Transition name="lyric" mode="out-in">
      <div :key="activeIndex" class="lyrics__stack">
        <p v-if="window3[0]" class="lyrics__line lyrics__line--adj">{{ window3[0].text }}</p>
        <p v-if="window3[1]" class="lyrics__line lyrics__line--active">{{ window3[1].text }}</p>
        <p v-if="window3[2]" class="lyrics__line lyrics__line--adj">{{ window3[2].text }}</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.lyrics {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
}

.lyrics__stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lyrics__line {
  font-family: var(--font-display);
  letter-spacing: -0.01em;
}

.lyrics__line--active {
  font-size: 22px;
  color: var(--ink);
}

.lyrics__line--adj {
  font-size: 16px;
  color: var(--ink-faint);
}

.lyric-enter-active { transition: opacity 0.4s var(--ease-scene), transform 0.4s var(--ease-scene); }
.lyric-leave-active { transition: opacity 0.2s var(--ease-cut); }
.lyric-enter-from { opacity: 0; transform: translateY(-8px); }
.lyric-leave-to { opacity: 0; }
</style>
