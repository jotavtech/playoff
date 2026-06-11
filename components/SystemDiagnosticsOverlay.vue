<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'

const cinematic = useCinematicStore()
const music = useMusicVisualStore()
const config = useRuntimeConfig()

/* System Diagnostics Overlay (PRD §5.7.9) — Cmd/Ctrl+Shift+D */

const fps = ref(0)
const webgl = ref<'available' | 'unavailable' | 'checking'>('checking')
let rafId = 0

onMounted(() => {
  try {
    const canvas = document.createElement('canvas')
    webgl.value = (canvas.getContext('webgl2') || canvas.getContext('webgl')) ? 'available' : 'unavailable'
  } catch { webgl.value = 'unavailable' }

  let frames = 0
  let last = performance.now()
  const loop = (now: number) => {
    frames++
    if (now - last >= 1000) {
      fps.value = frames
      frames = 0
      last = now
    }
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
})

onBeforeUnmount(() => cancelAnimationFrame(rafId))

const rows = computed(() => [
  ['FPS', String(fps.value)],
  ['WEBGL', webgl.value.toUpperCase()],
  ['THEME', cinematic.theme],
  ['MODE', cinematic.mode],
  ['BARS', cinematic.barsState],
  ['PRESET', cinematic.preset],
  ['TIER', cinematic.performanceTier],
  ['MOTION', cinematic.reducedMotion ? 'REDUCED' : cinematic.motionIntensity.toFixed(2)],
  ['SPOTIFY', 'OFFLINE — PHASE 2'],
  ['REALTIME', 'OFFLINE — PHASE 3'],
  ['SIGNAL', music.statusLabel],
  ['BUILD', config.public.buildVersion]
])
</script>

<template>
  <Transition name="diag">
    <aside v-if="cinematic.diagnosticsOpen" class="diag" aria-label="System diagnostics">
      <p class="diag__title microtext microtext--bright">SYSTEM DIAGNOSTICS</p>
      <dl class="diag__grid">
        <template v-for="[key, value] in rows" :key="key">
          <dt class="microtext">{{ key }}</dt>
          <dd class="diag__value">{{ value }}</dd>
        </template>
      </dl>
    </aside>
  </Transition>
</template>

<style scoped>
.diag {
  position: absolute;
  top: calc(var(--cinema-bar-top-height) + 20px);
  left: 20px;
  z-index: var(--layer-09-metadata);
  width: 250px;
  padding: 16px;
  background: var(--glass);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(14px);
}

.diag__title {
  margin-bottom: 12px;
  letter-spacing: 0.28em;
}

.diag__grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 16px;
  align-items: baseline;
}

.diag__value {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-dim);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.diag-enter-active, .diag-leave-active { transition: opacity var(--t-fast) linear, transform var(--t-fast) var(--ease-scene); }
.diag-enter-from, .diag-leave-to { opacity: 0; transform: translateX(-8px); }
</style>
