<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'

const cinematic = useCinematicStore()
const music = useMusicVisualStore()
</script>

<template>
  <section class="hero editorial-grid">
    <div class="hero__composition">
      <p class="hero__kicker microtext">CINEMATIC MUSIC SYSTEM — REBUILD 4.0</p>

      <!-- Tipografia massiva, cortada pelas bordas (PRD §5.5.1) -->
      <h1 class="hero__title" aria-label="PLAYOFF">
        PLAY<wbr>OFF
      </h1>

      <p v-if="music.currentTrack" class="hero__track microtext microtext--bright">
        NOW — {{ music.currentTrack.title }} · {{ music.currentTrack.artist }}
      </p>

      <div class="hero__ctas">
        <button class="hero__cta hero__cta--primary" @click="cinematic.toggleCommandCenter()">
          {{ music.currentTrack ? 'ENTER CINEMA VIEW' : 'SEARCH MUSIC' }}
        </button>
        <button class="hero__cta" disabled title="Fase 3 — salas em tempo real">
          CREATE ROOM
        </button>
      </div>

      <div class="hero__footnotes microtext">
        <span>{{ music.statusLabel }}</span>
        <span>MONOCHROME ENGINE v1</span>
        <span>TIER {{ cinematic.performanceTier.toUpperCase() }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  height: 100%;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.hero__composition {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  text-align: center;
}

.hero__kicker {
  letter-spacing: 0.34em;
}

.hero__title {
  font-size: clamp(96px, 19vw, 320px);
  font-weight: 700;
  line-height: 0.84;
  letter-spacing: -0.04em;
  color: var(--ink);
  /* composição cortada pelas bordas */
  width: 104vw;
  margin-inline: -2vw;
  user-select: none;
  mix-blend-mode: difference;
  color: #f2f2f2;
}

.hero__track {
  letter-spacing: 0.26em;
}

.hero__ctas {
  display: flex;
  gap: 14px;
  margin-top: 10px;
}

.hero__cta {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.24em;
  padding: 16px 30px;
  border: 1px solid var(--ink-dim);
  color: var(--ink);
  transition: background var(--t-fast) linear, color var(--t-fast) linear, opacity var(--t-fast) linear;
}

.hero__cta--primary {
  background: var(--ink);
  color: var(--bg);
}

.hero__cta--primary:hover {
  background: transparent;
  color: var(--ink);
}

.hero__cta:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.hero__footnotes {
  display: flex;
  gap: 36px;
  margin-top: 18px;
}

@media (max-width: 768px) {
  .hero__ctas { flex-direction: column; width: min(320px, 80vw); }
  .hero__footnotes { gap: 16px; flex-wrap: wrap; justify-content: center; }
}
</style>
