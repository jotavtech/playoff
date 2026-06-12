<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useEqualizerPresets } from '~/composables/useEqualizerPresets'

/**
 * Equalizer Presets (SPEC 07) — painel selecionável. Honesto: só "morde" o
 * áudio no preview de 30s; no full playback (DRM) o preset fica salvo.
 */
const cinematic = useCinematicStore()
const music = useMusicVisualStore()
const { presets, activeKey, apply, init, isAffectingAudio } = useEqualizerPresets()

onMounted(init)

const affecting = computed(() => music.isPlaying && isAffectingAudio())
</script>

<template>
  <Transition name="eqp">
    <aside v-if="cinematic.eqPanelOpen" class="eqp" role="dialog" aria-label="Equalizer presets">
      <header class="eqp__head">
        <p class="microtext microtext--bright">EQUALIZER</p>
        <button
          class="eqp__close"
          type="button"
          aria-label="Close equalizer"
          @click="cinematic.toggleEqPanel()"
        >✕</button>
      </header>

      <p class="eqp__status microtext" :class="{ 'eqp__status--live': affecting }">
        {{ affecting ? '● ACTIVE ON PREVIEW' : 'PRESET SAVED' }}
      </p>

      <ul class="eqp__list">
        <li v-for="p in presets" :key="p.key">
          <button
            class="eqp__preset microtext"
            type="button"
            :class="{ 'eqp__preset--active': p.key === activeKey }"
            @click="apply(p.key)"
          >
            <span>{{ p.label }}</span>
            <span v-if="p.key === activeKey" aria-hidden="true">●</span>
          </button>
        </li>
      </ul>

      <p class="eqp__note microtext">
        O equalizador atua no preview de 30s. A reprodução completa do Spotify é protegida
        (DRM) e não pode ser equalizada no navegador — o preset fica salvo e entra no próximo preview.
      </p>
    </aside>
  </Transition>
</template>

<style scoped>
.eqp {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 80;
  width: min(340px, calc(100vw - 36px));
  max-height: min(78vh, 620px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--glass, rgba(8, 8, 10, 0.86));
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.16));
  backdrop-filter: blur(16px);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
}

.eqp__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.eqp__close {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  color: var(--ink-dim);
  border: 1px solid transparent;
  font-size: 14px;
  transition: color var(--t-fast) linear, border-color var(--t-fast) linear;
}

.eqp__close:hover {
  color: var(--ink);
  border-color: var(--glass-border);
}

.eqp__status {
  letter-spacing: 0.18em;
  color: var(--ink-faint);
}

.eqp__status--live {
  color: #39ff9c;
}

.eqp__list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  overflow-y: auto;
}

.eqp__preset {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--ink-dim, rgba(255, 255, 255, 0.22));
  color: var(--ink, #f2f2f2);
  letter-spacing: 0.1em;
  text-align: left;
  transition: background var(--t-fast) linear, color var(--t-fast) linear, border-color var(--t-fast) linear;
}

.eqp__preset:hover {
  border-color: rgba(57, 255, 156, 0.5);
  background: rgba(57, 255, 156, 0.08);
}

.eqp__preset--active {
  background: var(--ink, #f2f2f2);
  color: var(--bg, #050505);
  border-color: var(--ink, #f2f2f2);
}

.eqp__note {
  color: var(--ink-faint);
  letter-spacing: 0.02em;
  line-height: 1.45;
}

.eqp-enter-active { transition: opacity var(--t-fast) linear, transform 0.28s var(--ease-scene); }
.eqp-leave-active { transition: opacity var(--t-fast) linear, transform 0.2s var(--ease-cut); }
.eqp-enter-from, .eqp-leave-to { opacity: 0; transform: translateY(12px); }

@media (max-width: 520px) {
  .eqp {
    left: 12px;
    right: 12px;
    width: auto;
  }
}
</style>
