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
      class="mode-switcher__btn mode-switcher__btn--search microtext"
      type="button"
      title="Buscar música (S · ⌘K)"
      aria-label="Buscar música"
      @click="cinematic.toggleCommandCenter()"
    >
      <svg class="mode-switcher__search-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <span class="mode-switcher__search-hint">⌘K</span>
    </button>
  </nav>
</template>

<style scoped>
.mode-switcher {
  display: flex;
  gap: 8px;
}

.mode-switcher__btn {
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--glass-border);
  background: var(--glass);
  color: var(--ink-dim);
  letter-spacing: 0.14em;
  transition: color var(--t-fast) linear, border-color var(--t-fast) linear, background var(--t-fast) linear;
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

/* Botão de busca: ícone de lupa + dica ⌘K (a dica some no mobile) */
.mode-switcher__btn--search {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
}

.mode-switcher__search-icon {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
}

.mode-switcher__search-hint {
  letter-spacing: 0.14em;
}

/* Celular: esconde o ModeSwitcher — BottomNav cobre toda a navegação */
@media (max-width: 768px) {
  .mode-switcher {
    display: none;
  }
}
</style>
