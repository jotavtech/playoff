<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'

const cinematic = useCinematicStore()
</script>

<template>
  <nav class="mode-switcher" aria-label="Modos visuais">
    <button
      class="mode-switcher__btn microtext"
      :class="{ 'mode-switcher__btn--active': cinematic.cinemaView }"
      :aria-pressed="cinematic.cinemaView"
      title="Cinema View (C)"
      @click="cinematic.toggleCinemaView()"
    >
      CINEMA
    </button>
    <button
      class="mode-switcher__btn microtext"
      :class="{ 'mode-switcher__btn--active': cinematic.wallpaperMode }"
      :aria-pressed="cinematic.wallpaperMode"
      title="OLED Wallpaper Mode (W)"
      @click="cinematic.toggleWallpaperMode()"
    >
      OLED
    </button>
    <button
      class="mode-switcher__btn microtext"
      title="Command Center (Cmd/Ctrl+K)"
      @click="cinematic.toggleCommandCenter()"
    >
      ⌘K
    </button>
  </nav>
</template>

<style scoped>
.mode-switcher {
  display: flex;
  gap: 8px;
}

.mode-switcher__btn {
  padding: 8px 14px;
  border: 1px solid var(--glass-border);
  background: var(--glass);
  color: var(--ink-dim);
  letter-spacing: 0.2em;
  transition: color var(--t-fast) linear, border-color var(--t-fast) linear;
}

.mode-switcher__btn:hover {
  color: var(--ink);
  border-color: var(--ink-dim);
}

.mode-switcher__btn--active {
  color: var(--bg);
  background: var(--ink);
  border-color: var(--ink);
}
</style>
