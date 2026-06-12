<script setup lang="ts">
/**
 * Disco reduzido da HomeScreen.
 * CSS animation controlada por status + IntersectionObserver (R9.1–R9.6).
 */
const props = defineProps<{
  size: number
  cover: string
  status: 'playing' | 'paused' | 'buffering'
  votePulse: number
}>()

const rootEl = ref<HTMLElement | null>(null)
const isVisible = ref(true)
const pulsing = ref(false)

// Estado de desaceleração — simula "parar suavemente" (R9.2)
const decelerating = ref(false)

let pulseTimer: ReturnType<typeof setTimeout> | null = null
let decelTimer: ReturnType<typeof setTimeout> | null = null

// IntersectionObserver — pausa animação fora da tela (R9.6)
let observer: IntersectionObserver | null = null
onMounted(() => {
  if (!rootEl.value) return
  observer = new IntersectionObserver(
    ([entry]) => { isVisible.value = entry.isIntersecting },
    { threshold: 0.1 }
  )
  observer.observe(rootEl.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  if (pulseTimer) clearTimeout(pulseTimer)
  if (decelTimer) clearTimeout(decelTimer)
})

// Pulso no voto (R9.4)
watch(() => props.votePulse, (v) => {
  if (!v) return
  pulsing.value = true
  if (pulseTimer) clearTimeout(pulseTimer)
  pulseTimer = setTimeout(() => { pulsing.value = false }, 600)
})

// Deceleration ao pausar — aumenta duração por 600ms antes de parar (R9.2)
watch(() => props.status, (next, prev) => {
  if (prev === 'playing' && next === 'paused') {
    decelerating.value = true
    if (decelTimer) clearTimeout(decelTimer)
    decelTimer = setTimeout(() => { decelerating.value = false }, 600)
  } else if (next === 'playing') {
    decelerating.value = false
  }
})

// Buffering: desacelera para 24s (R9.3)
// Deceleration: usa 24s temporariamente (R9.2)
// Playing normal: usa --vinyl-spin-duration (8s) (R9.1)
const spinDuration = computed(() => {
  if (props.status === 'buffering') return '24s'
  if (decelerating.value) return '24s'
  return 'var(--vinyl-spin-duration)'
})

const spinState = computed(() => {
  if (!isVisible.value) return 'paused'
  if (props.status === 'playing') return 'running'
  if (decelerating.value) return 'running'
  return 'paused'
})
</script>

<template>
  <div
    ref="rootEl"
    class="home-vinyl"
    :class="{ 'home-vinyl--pulse': pulsing }"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      animationPlayState: spinState,
      animationDuration: spinDuration,
    }"
    aria-hidden="true"
  >
    <div class="home-vinyl__grooves" />
    <div
      class="home-vinyl__label"
      :style="cover ? { backgroundImage: `url(${cover})` } : {}"
    />
    <div class="home-vinyl__hole" />
  </div>
</template>

<style scoped>
.home-vinyl {
  border-radius: 50%;
  position: relative;
  background: #111;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.06),
    0 8px 40px rgba(0,0,0,0.7),
    inset 0 0 0 1px rgba(255,255,255,0.04);
  animation: vinyl-spin var(--vinyl-spin-duration) linear infinite;
  will-change: transform;
  flex-shrink: 0;
  transition: box-shadow 0.3s ease, animation-duration 0.6s ease;
}

.home-vinyl__grooves {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: repeating-radial-gradient(
    circle at center,
    transparent 0%,
    transparent calc(var(--g) - 1px),
    rgba(255,255,255,0.04) var(--g),
    transparent calc(var(--g) + 1px)
  );
  --g: 4%;
}

.home-vinyl__label {
  position: absolute;
  inset: 25%;
  border-radius: 50%;
  background: #1a1a1a center / cover no-repeat;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
}

.home-vinyl__hole {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 8%;
  height: 8%;
  border-radius: 50%;
  background: #000;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.1);
}

@keyframes vinyl-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* Pulso no voto (R9.4) */
.home-vinyl--pulse {
  animation: vinyl-spin var(--vinyl-spin-duration) linear infinite, vinyl-pulse 0.5s ease-out;
}

@keyframes vinyl-pulse {
  0%   { box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 8px 40px rgba(0,0,0,0.7), 0 0 0 0 rgba(255,255,255,0.3); }
  50%  { box-shadow: 0 0 0 1px rgba(255,255,255,0.1),  0 8px 60px rgba(0,0,0,0.5), 0 0 24px 8px rgba(255,255,255,0.12); }
  100% { box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 8px 40px rgba(0,0,0,0.7), 0 0 0 0 rgba(255,255,255,0); }
}

@media (prefers-reduced-motion: reduce) {
  .home-vinyl,
  .home-vinyl--pulse {
    animation: none !important;
  }
}
</style>
