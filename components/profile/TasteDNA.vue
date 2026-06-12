<script setup lang="ts">
const metrics = [
  ['ENERGY', 78],
  ['MELODY', 60],
  ['COMPLEXITY', 82],
  ['NOSTALGIA', 44],
  ['AGGRESSION', 70]
] as const
</script>

<template>
  <section class="taste-dna">
    <p class="microtext">YOUR TASTE DNA</p>
    <div class="taste-dna__metrics">
      <div v-for="[label, value] in metrics" :key="label" class="taste-dna__metric">
        <span class="microtext">{{ label }}</span>
        <div class="taste-dna__bar" aria-hidden="true">
          <i :style="{ width: `${value}%` }" />
        </div>
        <strong>{{ value }}%</strong>
      </div>
    </div>
    <div class="taste-dna__footer microtext">
      <span>ANCHOR ARTISTS / QOTSA / THE WHITE STRIPES / ARCTIC MONKEYS</span>
      <span>PEAK LISTENING / 21H - 01H</span>
      <span>FAVORITE ERA / 2000S</span>
    </div>
  </section>
</template>

<style scoped>
.taste-dna {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.035);
}

.taste-dna__metrics {
  display: grid;
  gap: 10px;
}

.taste-dna__metric {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 10px;
}

.taste-dna__bar {
  height: 7px;
  background: rgba(255, 255, 255, 0.09);
}

.taste-dna__bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #39ff9c, #00e5ff);
}

.taste-dna__metric strong {
  color: var(--ink-dim);
  font-family: var(--font-mono);
  font-size: 11px;
}

.taste-dna__footer {
  display: grid;
  gap: 6px;
}
</style>
