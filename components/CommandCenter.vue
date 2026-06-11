<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'
import type { CommandAction, MonochromeTheme, VisualPreset } from '~/types/cinematic'

const cinematic = useCinematicStore()
const music = useMusicVisualStore()

const query = ref('')
const activeIndex = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)

const THEMES: MonochromeTheme[] = [
  'deep-black', 'oled-black', 'cinema-contrast', 'ink-system',
  'monochrome-glass', 'pure-white', 'editorial-white', 'frost-chrome'
]

const PRESETS: VisualPreset[] = [
  'cinema', 'oled-wallpaper', 'editorial', 'chrome-lab', 'minimal-player', 'room-stage', 'focus'
]

const actions = computed<CommandAction[]>(() => [
  {
    id: 'search-music',
    label: 'Search music',
    hint: 'PHASE 2 — Spotify',
    group: 'music',
    disabled: true,
    run: () => {}
  },
  {
    id: 'simulate-signal',
    label: music.currentTrack ? 'Stop simulated signal' : 'Simulate signal',
    hint: 'demo da cena reativa',
    group: 'music',
    run: () => { music.currentTrack ? music.clearTrack() : music.startSimulation() }
  },
  {
    id: 'create-room',
    label: 'Create room',
    hint: 'PHASE 3 — realtime',
    group: 'room',
    disabled: true,
    run: () => {}
  },
  {
    id: 'cinema-view',
    label: cinematic.cinemaView ? 'Exit Cinema View' : 'Enter Cinema View',
    shortcut: 'C',
    group: 'visual',
    run: () => cinematic.toggleCinemaView()
  },
  {
    id: 'oled-mode',
    label: cinematic.wallpaperMode ? 'Exit OLED Wallpaper Mode' : 'Enter OLED Wallpaper Mode',
    shortcut: 'W',
    group: 'visual',
    run: () => cinematic.toggleWallpaperMode()
  },
  ...PRESETS.map(preset => ({
    id: `preset-${preset}`,
    label: `Preset: ${preset}`,
    group: 'visual' as const,
    run: () => cinematic.setPreset(preset)
  })),
  ...THEMES.map(theme => ({
    id: `theme-${theme}`,
    label: `Theme: ${theme}`,
    group: 'visual' as const,
    run: () => cinematic.setTheme(theme)
  })),
  {
    id: 'motion-up',
    label: 'Motion intensity +',
    group: 'visual',
    run: () => cinematic.setMotionIntensity(cinematic.motionIntensity + 0.1)
  },
  {
    id: 'motion-down',
    label: 'Motion intensity −',
    group: 'visual',
    run: () => cinematic.setMotionIntensity(cinematic.motionIntensity - 0.1)
  },
  {
    id: 'diagnostics',
    label: cinematic.diagnosticsOpen ? 'Hide system diagnostics' : 'Show system diagnostics',
    shortcut: '⌘⇧D',
    group: 'system',
    run: () => cinematic.toggleDiagnostics()
  }
])

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return actions.value
  return actions.value.filter(a => a.label.toLowerCase().includes(q) || a.group.includes(q))
})

watch(filtered, () => { activeIndex.value = 0 })

watch(() => cinematic.commandCenterOpen, async (open) => {
  if (open) {
    query.value = ''
    activeIndex.value = 0
    await nextTick()
    inputEl.value?.focus()
  }
})

function runAction (action: CommandAction) {
  if (action.disabled) return
  action.run()
  cinematic.toggleCommandCenter()
}

function onKeydown (e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = Math.min(filtered.value.length - 1, activeIndex.value + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(0, activeIndex.value - 1)
  } else if (e.key === 'Enter') {
    const action = filtered.value[activeIndex.value]
    if (action) runAction(action)
  }
}
</script>

<template>
  <Transition name="command">
    <div
      v-if="cinematic.commandCenterOpen"
      class="command"
      role="dialog"
      aria-label="Command Center"
      @click.self="cinematic.toggleCommandCenter()"
    >
      <div class="command__panel">
        <div class="command__head">
          <span class="microtext">PLAYOFF COMMAND</span>
          <span class="microtext">ESC CLOSE</span>
        </div>

        <input
          ref="inputEl"
          v-model="query"
          class="command__input"
          type="text"
          placeholder="Type a command…"
          spellcheck="false"
          @keydown="onKeydown"
        >

        <ul class="command__list" role="listbox">
          <li
            v-for="(action, i) in filtered"
            :key="action.id"
            class="command__item"
            :class="{
              'command__item--active': i === activeIndex,
              'command__item--disabled': action.disabled
            }"
            role="option"
            :aria-selected="i === activeIndex"
            @click="runAction(action)"
            @mousemove="activeIndex = i"
          >
            <span class="command__label">{{ action.label }}</span>
            <span v-if="action.hint" class="command__hint microtext">{{ action.hint }}</span>
            <span v-else-if="action.shortcut" class="command__hint microtext">{{ action.shortcut }}</span>
            <span class="command__group microtext">{{ action.group }}</span>
          </li>
          <li v-if="filtered.length === 0" class="command__empty microtext">
            NO SIGNAL MATCHES
          </li>
        </ul>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.command {
  position: absolute;
  inset: 0;
  z-index: var(--layer-10-command);
  display: grid;
  place-items: start center;
  padding-top: max(14vh, calc(var(--cinema-bar-top-height) + 40px));
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
}

.command__panel {
  width: min(620px, calc(100vw - 32px));
  max-height: 60dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg-soft);
  border: 1px solid var(--glass-border);
  box-shadow: 0 40px 120px rgba(0, 0, 0, 0.6);
}

.command__head {
  display: flex;
  justify-content: space-between;
  padding: 14px 18px 0;
}

.command__input {
  margin: 12px 18px;
  padding: 14px 16px;
  background: var(--glass);
  border: 1px solid var(--glass-border);
  outline: none;
  font-family: var(--font-mono);
  font-size: 14px;
  letter-spacing: 0.06em;
}

.command__input:focus {
  border-color: var(--ink-dim);
}

.command__list {
  list-style: none;
  overflow-y: auto;
  padding-bottom: 8px;
}

.command__item {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 12px 18px;
  cursor: pointer;
  border-left: 2px solid transparent;
}

.command__item--active {
  background: var(--glass);
  border-left-color: var(--ink);
}

.command__item--disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.command__label {
  font-size: 14px;
  font-weight: 500;
}

.command__hint {
  letter-spacing: 0.14em;
}

.command__group {
  margin-left: auto;
}

.command__empty {
  padding: 18px;
  text-align: center;
}

/* entrada como camada cinematográfica, não popup comum */
.command-enter-active { transition: opacity var(--t-fast) linear; }
.command-enter-active .command__panel { transition: transform var(--t-scene) var(--ease-scene), opacity var(--t-scene) var(--ease-scene); }
.command-leave-active { transition: opacity var(--t-fast) linear; }
.command-enter-from { opacity: 0; }
.command-enter-from .command__panel { transform: translateY(-14px) scale(0.99); opacity: 0; }
.command-leave-to { opacity: 0; }
</style>
