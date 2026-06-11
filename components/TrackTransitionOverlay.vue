<script setup lang="ts">
import { useMusicVisualStore } from '~/stores/musicVisual'

const music = useMusicVisualStore()

/*
 * Track Transition Mode (PRD §5.2.6) — a tela muda como corte de cena.
 * As barras já expandem via barsState 'transitioning'; este overlay
 * cobre o miolo com o corte e o afterimage do título antigo.
 */
</script>

<template>
  <Transition name="cut">
    <div v-if="music.transitioning" class="cut" aria-hidden="true">
      <p class="cut__afterimage">{{ music.currentTrack?.title ?? '' }}</p>
      <p class="cut__label microtext">SIGNAL SHIFTING</p>
    </div>
  </Transition>
</template>

<style scoped>
.cut {
  position: absolute;
  inset: 0;
  z-index: var(--layer-11-transition);
  display: grid;
  place-items: center;
  background: var(--bar);
}

.cut__afterimage {
  position: absolute;
  font-size: clamp(40px, 7vw, 110px);
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--ink-faint);
  filter: blur(2px);
  animation: afterimage var(--t-cut) var(--ease-cut) forwards;
}

@keyframes afterimage {
  from { opacity: 0.5; transform: scale(1); }
  to   { opacity: 0; transform: scale(1.06) translateY(-2%); filter: blur(8px); }
}

.cut__label {
  letter-spacing: 0.4em;
  animation: label-pulse 0.9s ease-in-out infinite alternate;
}

@keyframes label-pulse {
  from { opacity: 0.4; }
  to   { opacity: 1; }
}

.cut-enter-active { transition: opacity 200ms var(--ease-cut); }
.cut-leave-active { transition: opacity 500ms var(--ease-scene); }
.cut-enter-from, .cut-leave-to { opacity: 0; }
</style>
