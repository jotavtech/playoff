<script setup lang="ts">
import { useAudioAnalyser } from '~/composables/useAudioAnalyser'
import { useCinematicStore } from '~/stores/cinematic'

const cinematic = useCinematicStore()
const meter = ref<HTMLElement | null>(null)
let unsubscribe: (() => void) | undefined
onMounted(() => {
  const bars = Array.from(meter.value?.children ?? []) as HTMLElement[]
  unsubscribe = useAudioAnalyser().subscribe(frame => {
    if (cinematic.reducedMotion) return
    for (const [i, bar] of bars.entries()) {
      const strength = frame.bands[Math.round(i * (frame.bands.length - 1) / (bars.length - 1))] ?? 0
      bar.style.transform = 'scaleY(' + (0.07 + strength * 0.93).toFixed(3) + ')'
    }
  })
})
onBeforeUnmount(() => unsubscribe?.())
</script>

<template>
  <div ref="meter" class="signal-meter" aria-hidden="true">
    <i v-for="i in 25" :key="i" />
  </div>
</template>

<style scoped>
.signal-meter {
  display: flex;
  height: 36px;
  gap: 4px;
  align-items: center;
}
.signal-meter i {
  width: 3px;
  height: 100%;
  border-radius: 2px;
  background: var(--remaster-accent, #d9fa6e);
  transform: scaleY(.07);
}
@media (prefers-reduced-motion: reduce) {
  .signal-meter i { transform: scaleY(.07) !important; }
}
</style>
