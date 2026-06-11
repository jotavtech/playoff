<script setup lang="ts">
import { useAudioAnalyser } from '~/composables/useAudioAnalyser'
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'

/**
 * Audio Visualizer (PRD Radiola §5) — barras simétricas estilo FXSound.
 * Butterfly: grave pulsando no centro, agudos finos nas pontas. Cor segue
 * --music-accent, glow via drop-shadow. Pinta direto no DOM (sem re-render).
 */
const props = withDefaults(defineProps<{
  /** Altura máxima das barras em px. */
  height?: number
  /** Variante de densidade. */
  variant?: 'full' | 'compact'
}>(), {
  height: 96,
  variant: 'full'
})

const analyser = useAudioAnalyser()
const cinematic = useCinematicStore()
const music = useMusicVisualStore()

const B = analyser.bandCount
const count = B * 2  // espelhado: butterfly simétrico

const containerEl = ref<HTMLElement | null>(null)
let unsub: (() => void) | null = null

/** Mapeia índice visual → banda (centro = grave, pontas = agudo). */
function bandFor (v: number): number {
  return v < B ? (B - 1 - v) : (v - B)
}

function paint (frame: { bands: number[] }) {
  const el = containerEl.value
  if (!el) return
  const children = el.children
  for (let v = 0; v < count; v++) {
    const band = bandFor(v)
    const h = Math.max(0.03, frame.bands[band] ?? 0)
    ;(children[v] as HTMLElement)?.style.setProperty('--h', h.toFixed(3))
  }
}

onMounted(() => {
  if (cinematic.reducedMotion) return  // estático: barras curtas fixas
  analyser.start()
  unsub = analyser.subscribe(paint)
})

onBeforeUnmount(() => {
  if (cinematic.reducedMotion) return
  unsub?.()
  analyser.stop()
})
</script>

<template>
  <div
    ref="containerEl"
    class="viz"
    :class="[`viz--${variant}`, { 'viz--reduced': cinematic.reducedMotion, 'viz--silent': !music.isPlaying }]"
    :style="{ '--viz-h': `${height}px` }"
    aria-hidden="true"
  >
    <span v-for="i in count" :key="i" class="viz__bar" />
  </div>
</template>

<style scoped>
.viz {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 1px;
  height: var(--viz-h);
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}

.viz--compact { gap: 1px; }

.viz__bar {
  flex: 1 1 auto;
  min-width: 1.5px;
  max-width: 8px;
  height: 100%;
  border-radius: 2px 2px 0 0;
  background: var(--music-accent, #c8cace);
  opacity: 0.82;
  transform: scaleY(var(--h, 0.03));
  transform-origin: bottom;
  filter: drop-shadow(0 0 4px var(--music-glow, transparent));
  /* Suaviza a transição entre frames sem perder a resposta */
  transition: transform 0.06s linear;
  will-change: transform;
}

/* Sem áudio tocando: barras recolhem e perdem o glow */
.viz--silent .viz__bar {
  opacity: 0.4;
  transition: transform 0.4s var(--ease-scene);
}

/* Reduced motion: barras estáticas com leve variação de altura por posição */
.viz--reduced .viz__bar {
  transform: scaleY(0.18);
  transition: none;
  filter: none;
}
.viz--reduced .viz__bar:nth-child(3n) { transform: scaleY(0.3); }
.viz--reduced .viz__bar:nth-child(5n) { transform: scaleY(0.24); }
</style>
