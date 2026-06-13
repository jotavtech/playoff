<script setup lang="ts">
defineProps<{
  active?: boolean
}>()
</script>

<template>
  <section class="loading-profile" :data-active="active || undefined">
    <p class="microtext">ANALYZING YOUR SPOTIFY PROFILE</p>
    <ul>
      <li><span>OK</span> Top tracks loaded</li>
      <li><span>OK</span> Anchor artists detected</li>
      <li><span>OK</span> Listening signal mapped</li>
      <li><span>OK</span> Battle seeds generated</li>
      <li><span>--</span> Building your Taste DNA...</li>
    </ul>
  </section>
</template>

<style scoped>
.loading-profile {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.035);
}

.loading-profile ul {
  display: grid;
  gap: 8px;
  list-style: none;
}

.loading-profile li {
  display: flex;
  gap: 10px;
  color: var(--ink-dim);
  font-size: 16px;
}

.loading-profile li span {
  color: #39ff9c;
  font-family: var(--font-mono);
  font-size: 10px;
}

.loading-profile[data-active] {
  border-color: rgba(57, 255, 156, 0.28);
}
</style>
