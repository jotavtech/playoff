<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useSpotifyPlayer } from '~/composables/useSpotifyPlayer'
import { useLyrics } from '~/composables/useLyrics'

/**
 * Karaoke Mode (SPEC 04) — overlay fullscreen. Letra grande e legível,
 * sincronizada quando há provedor (SPEC 05); fallback honesto quando não há
 * ("LYRICS SIGNAL LOCKED" + Visual Mode). ESC/back/sair sempre disponíveis
 * (integrado à pilha da SPEC 09). Não promete instrumental (isso é SPEC 06).
 */
const cinematic = useCinematicStore()
const music = useMusicVisualStore()
const { togglePlay } = useSpotifyPlayer()
const { lines, available, activeIndex, status, message } = useLyrics()

// ─── Tamanho de fonte (persistido) ──────────────────────────────────────────
const FONT_KEY = 'playoff:karaoke-font'
const fontScale = ref(1)
function loadFont () {
  if (!import.meta.client) return
  const raw = Number(localStorage.getItem(FONT_KEY))
  if (raw >= 0.6 && raw <= 1.8) fontScale.value = raw
}
function bumpFont (delta: number) {
  fontScale.value = Math.min(1.8, Math.max(0.6, Number((fontScale.value + delta).toFixed(2))))
  if (import.meta.client) {
    try { localStorage.setItem(FONT_KEY, String(fontScale.value)) } catch { /* noop */ }
  }
}

// ─── Janela de letras em volta da linha ativa ───────────────────────────────
const RADIUS = 2
const lyricWindow = computed(() => {
  if (!available.value) return []
  const center = Math.max(0, activeIndex.value)
  const out: { text: string; active: boolean; key: number }[] = []
  for (let k = center - RADIUS; k <= center + RADIUS; k++) {
    const line = lines.value[k]
    if (line) out.push({ text: line.text, active: k === activeIndex.value, key: k })
  }
  return out
})

const fallbackHeading = computed(() => (status.value === 'loading' ? 'TUNING LYRICS…' : 'LYRICS SIGNAL LOCKED'))

// ─── Fullscreen (opcional) ──────────────────────────────────────────────────
const isFs = ref(false)
function syncFs () { isFs.value = !!(import.meta.client && document.fullscreenElement) }
async function toggleFullscreen () {
  if (!import.meta.client) return
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch { /* fullscreen pode ser bloqueado — segue sem ele */ }
}

function exitKaraoke () {
  if (import.meta.client && document.fullscreenElement) document.exitFullscreen().catch(() => {})
  cinematic.setKaraoke(false)
}

onMounted(() => {
  loadFont()
  syncFs()
  if (import.meta.client) document.addEventListener('fullscreenchange', syncFs)
  onBeforeUnmount(() => {
    if (import.meta.client) document.removeEventListener('fullscreenchange', syncFs)
  })
})
</script>

<template>
  <Transition name="kara">
    <section
      v-if="cinematic.karaokeMode"
      class="kara"
      :style="{ '--kara-scale': fontScale }"
      role="dialog"
      aria-label="Karaoke mode"
    >
      <header class="kara__bar">
        <p class="kara__brand microtext microtext--bright">KARAOKE MODE</p>
        <p class="kara__time microtext">{{ music.timecode }}</p>
        <button class="kara__exit microtext" type="button" aria-label="Exit karaoke" @click="exitKaraoke">
          EXIT
        </button>
      </header>

      <div class="kara__stage">
        <!-- Letra sincronizada (há provedor + linhas) -->
        <div v-if="available && lyricWindow.length" class="kara__lyrics">
          <Transition name="kara-line" mode="out-in">
            <div :key="activeIndex" class="kara__lines">
              <p
                v-for="l in lyricWindow"
                :key="l.key"
                class="kara__line"
                :class="{ 'kara__line--active': l.active }"
              >{{ l.text }}</p>
            </div>
          </Transition>
        </div>

        <!-- Fallback honesto: sem letra → Visual Mode (canta de ouvido) -->
        <div v-else class="kara__fallback">
          <p class="kara__locked microtext microtext--bright">{{ fallbackHeading }}</p>
          <h2 class="kara__track">{{ music.currentTrack?.title ?? 'AWAITING SIGNAL' }}</h2>
          <p v-if="music.currentTrack" class="kara__artist microtext">{{ music.currentTrack.artist }}</p>
          <p class="kara__msg microtext">{{ message }}</p>
          <p class="kara__msg kara__msg--dim microtext">Visual mode: sing along by ear while the signal plays.</p>
        </div>
      </div>

      <footer class="kara__controls">
        <button class="kara__btn" type="button" aria-label="Smaller text" @click="bumpFont(-0.1)">A−</button>
        <button class="kara__btn" type="button" aria-label="Bigger text" @click="bumpFont(0.1)">A+</button>
        <button class="kara__btn kara__btn--play" type="button" :aria-label="music.isPlaying ? 'Pause' : 'Play'" @click="togglePlay()">
          {{ music.isPlaying ? '❚❚' : '▶' }}
        </button>
        <button class="kara__btn" type="button" aria-label="Equalizer" @click="cinematic.toggleEqPanel()">EQ</button>
        <button class="kara__btn kara__btn--fs" type="button" :aria-label="isFs ? 'Exit fullscreen' : 'Fullscreen'" @click="toggleFullscreen">
          {{ isFs ? '⤡' : '⤢' }}
        </button>
      </footer>
    </section>
  </Transition>
</template>

<style scoped>
.kara {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: #030303;
  --kara-scale: 1;
}

.kara__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px clamp(14px, 4vw, 32px);
  border-bottom: 1px solid var(--line, rgba(255, 255, 255, 0.1));
}

.kara__time { letter-spacing: 0.2em; color: var(--ink-dim); }

.kara__exit {
  min-height: 48px;
  padding: 12px 22px;
  border: 1px solid var(--ink-dim);
  background: var(--glass, rgba(0, 0, 0, 0.4));
  color: var(--ink);
  letter-spacing: 0.24em;
  transition: background var(--t-fast) linear, color var(--t-fast) linear;
}

.kara__exit:hover { background: var(--ink); color: var(--bg); }

.kara__stage {
  display: grid;
  place-items: center;
  padding: clamp(16px, 4vw, 40px);
  overflow: hidden;
  text-align: center;
}

.kara__lines {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 2.4vh, 26px);
  align-items: center;
}

.kara__line {
  font-family: var(--font-display);
  font-size: calc(clamp(18px, 3.4vw, 34px) * var(--kara-scale));
  line-height: 1.1;
  color: var(--ink-faint);
  letter-spacing: -0.01em;
  transition: color 0.3s var(--ease-scene), transform 0.3s var(--ease-scene);
}

.kara__line--active {
  font-size: calc(clamp(30px, 6.4vw, 72px) * var(--kara-scale));
  font-weight: 600;
  color: var(--ink);
  text-shadow: 0 0 30px var(--music-glow, transparent);
}

.kara__fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  max-width: 44ch;
}

.kara__locked { letter-spacing: 0.32em; color: #ffcf6a; }

.kara__track {
  font-family: var(--font-display);
  font-size: calc(clamp(30px, 6vw, 64px) * var(--kara-scale));
  font-weight: 600;
  line-height: 0.98;
  color: var(--ink);
}

.kara__artist { letter-spacing: 0.3em; color: var(--ink-dim); }

.kara__msg {
  color: var(--ink-faint);
  letter-spacing: 0.04em;
  line-height: 1.5;
}

.kara__msg--dim { opacity: 0.7; }

.kara__controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px clamp(14px, 4vw, 32px) clamp(20px, 4vh, 32px);
  border-top: 1px solid var(--line, rgba(255, 255, 255, 0.1));
  flex-wrap: wrap;
}

.kara__btn {
  min-width: 56px;
  min-height: 56px;
  padding: 0 18px;
  border: 1px solid var(--ink-dim);
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 16px;
  letter-spacing: 0.12em;
  transition: background var(--t-fast) linear, color var(--t-fast) linear, border-color var(--t-fast) linear;
}

.kara__btn:hover {
  border-color: rgba(57, 255, 156, 0.5);
  background: rgba(57, 255, 156, 0.08);
}

.kara__btn--play {
  min-width: 72px;
  border-color: var(--ink);
  background: var(--ink);
  color: var(--bg);
}

.kara__btn--play:hover {
  background: transparent;
  color: var(--ink);
}

.kara-enter-active { transition: opacity 0.4s var(--ease-scene); }
.kara-leave-active { transition: opacity 0.3s var(--ease-cut); }
.kara-enter-from, .kara-leave-to { opacity: 0; }

.kara-line-enter-active { transition: opacity 0.35s var(--ease-scene), transform 0.35s var(--ease-scene); }
.kara-line-leave-active { transition: opacity 0.18s var(--ease-cut); }
.kara-line-enter-from { opacity: 0; transform: translateY(10px); }
.kara-line-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .kara-enter-active, .kara-leave-active,
  .kara-line-enter-active, .kara-line-leave-active,
  .kara__line { transition: none; }
}

@media (max-width: 520px) {
  .kara__brand { font-size: 9px; }
  .kara__controls { gap: 8px; }
  .kara__btn { min-width: 52px; min-height: 52px; padding: 0 12px; }
}
</style>
