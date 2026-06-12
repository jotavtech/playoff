<script setup lang="ts">
defineProps<{
  cover: string
  title: string
  artist: string
  duration: string
  votes: number
  active?: boolean
}>()
</script>

<template>
  <div class="queue-item" :class="{ 'queue-item--active': active }">
    <img
      v-if="cover"
      :src="cover"
      :alt="title"
      class="queue-item__cover"
      loading="lazy"
      width="52"
      height="52"
    />
    <div v-else class="queue-item__cover queue-item__cover--empty" aria-hidden="true" />

    <div class="queue-item__info">
      <p class="queue-item__title">{{ title }}</p>
      <p class="queue-item__artist">{{ artist }}</p>
    </div>

    <div class="queue-item__meta">
      <span v-if="votes > 0" class="queue-item__votes">{{ votes }} ▲</span>
      <span class="queue-item__duration">{{ duration }}</span>
    </div>
  </div>
</template>

<style scoped>
.queue-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--glass-border);
  min-height: var(--touch-min);
}

.queue-item--active .queue-item__title {
  color: var(--ink);
}

.queue-item--active {
  border-left: 2px solid var(--ink);
  padding-left: 10px;
}

.queue-item__cover {
  width: 52px;
  height: 52px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.queue-item__cover--empty {
  background: var(--glass);
  border: 1px solid var(--glass-border);
}

.queue-item__info {
  flex: 1;
  min-width: 0;
}

.queue-item__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ink-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.queue-item__artist {
  font-size: 16px;
  color: var(--ink-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.queue-item__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.queue-item__votes {
  font-family: var(--font-mono);
  font-size: 16px;
  color: var(--ink-dim);
  letter-spacing: 0.05em;
}

.queue-item__duration {
  font-family: var(--font-mono);
  font-size: 16px;
  color: var(--ink-faint);
  letter-spacing: 0.05em;
}
</style>
