<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useAuthStore } from '~/stores/auth'
import { useSpotifySearch } from '~/composables/useSpotifySearch'
import { useSpotifyPlayer } from '~/composables/useSpotifyPlayer'
import { useAuth } from '~/composables/useAuth'
import type { CommandAction, MonochromeTheme, VisualPreset } from '~/types/cinematic'
import type { SpotifyTrack } from '~/types/spotify'

const cinematic = useCinematicStore()
const music = useMusicVisualStore()
const auth = useAuthStore()
const { results: searchResults, loading: searching, searchDebounced, clear: clearSearch } = useSpotifySearch()
const { playTrack } = useSpotifyPlayer()
const { login, logout } = useAuth()

const query = ref('')
const activeIndex = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)

// Modo: 'commands' quando a query não parece uma busca de música; 'search' caso contrário
const mode = computed(() => {
  const q = query.value.trim()
  if (!q) return 'commands'
  // Comandos começam com '>' ou são palavras-chave de sistema
  if (q.startsWith('>') || SYSTEM_CMDS.some(c => c.label.toLowerCase().startsWith(q.toLowerCase()))) return 'commands'
  return auth.isAuthenticated ? 'search' : 'commands'
})

// ─── Ações de sistema ────────────────────────────────────────────────────
const THEMES: MonochromeTheme[] = [
  'deep-black', 'oled-black', 'cinema-contrast', 'ink-system',
  'monochrome-glass', 'pure-white', 'editorial-white', 'frost-chrome'
]

const PRESETS: VisualPreset[] = [
  'cinema', 'oled-wallpaper', 'editorial', 'chrome-lab', 'minimal-player', 'room-stage', 'focus'
]

const SYSTEM_CMDS = computed<CommandAction[]>(() => [
  auth.isAuthenticated
    ? {
        id: 'logout', label: `Logout (${auth.user?.display_name ?? 'user'})`,
        group: 'system', run: logout
      }
    : {
        id: 'login', label: 'Login with Spotify',
        hint: 'Spotify Premium para full playback', group: 'system', run: login
      },
  {
    id: 'simulate-signal',
    label: music.currentTrack ? 'Stop simulated signal' : 'Simulate signal',
    hint: 'demo da cena reativa',
    group: 'music',
    run: () => { music.currentTrack ? music.clearTrack() : music.startSimulation() }
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

const filteredCmds = computed(() => {
  const q = query.value.trim().replace(/^>/, '').toLowerCase()
  if (!q) return SYSTEM_CMDS.value
  return SYSTEM_CMDS.value.filter(a =>
    a.label.toLowerCase().includes(q) || a.group.includes(q)
  )
})

// ─── Busca de músicas ─────────────────────────────────────────────────────
watch(query, (q) => {
  if (mode.value === 'search') {
    searchDebounced(q)
    activeIndex.value = 0
  } else {
    clearSearch()
  }
})

const trackCount = computed(() => searchResults.value.length)
const listLength = computed(() =>
  mode.value === 'search' ? trackCount.value : filteredCmds.value.length
)
watch(listLength, () => { activeIndex.value = 0 })

watch(() => cinematic.commandCenterOpen, async (open) => {
  if (open) {
    query.value = ''
    activeIndex.value = 0
    clearSearch()
    await nextTick()
    inputEl.value?.focus()
  }
})

// ─── Selecionar item ──────────────────────────────────────────────────────
function selectTrack (track: SpotifyTrack) {
  playTrack(track)
  cinematic.toggleCommandCenter()
}

function runCmd (action: CommandAction) {
  if (action.disabled) return
  action.run()
  cinematic.toggleCommandCenter()
}

function onKeydown (e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = Math.min(listLength.value - 1, activeIndex.value + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(0, activeIndex.value - 1)
  } else if (e.key === 'Enter') {
    if (mode.value === 'search') {
      const track = searchResults.value[activeIndex.value]
      if (track) selectTrack(track)
    } else {
      const cmd = filteredCmds.value[activeIndex.value]
      if (cmd) runCmd(cmd)
    }
  }
}

// Capa da faixa ativa
function coverOf (track: SpotifyTrack) {
  return track.album.images.find(i => i.height >= 64)?.url ?? track.album.images[0]?.url ?? null
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
        <!-- Header -->
        <div class="command__head">
          <span class="microtext">
            PLAYOFF COMMAND
            <span v-if="auth.isAuthenticated" class="command__auth microtext--bright">
              · {{ auth.user?.display_name ?? 'LOGGED IN' }}
              <span v-if="auth.isPremium"> · PREMIUM</span>
            </span>
          </span>
          <span class="microtext">ESC CLOSE</span>
        </div>

        <!-- Input -->
        <div class="command__input-row">
          <span class="command__prompt microtext">
            {{ mode === 'search' ? '♫' : '>' }}
          </span>
          <input
            ref="inputEl"
            v-model="query"
            class="command__input"
            type="text"
            :placeholder="auth.isAuthenticated ? 'Search music or type a command (>)…' : 'Type a command or > for actions…'"
            spellcheck="false"
            autocomplete="off"
            @keydown="onKeydown"
          >
          <span v-if="searching" class="command__spin microtext">…</span>
        </div>

        <!-- Resultados de busca -->
        <ul v-if="mode === 'search'" class="command__list" role="listbox">
          <li
            v-for="(track, i) in searchResults"
            :key="track.id"
            class="command__item command__item--track"
            :class="{ 'command__item--active': i === activeIndex }"
            role="option"
            :aria-selected="i === activeIndex"
            @click="selectTrack(track)"
            @mousemove="activeIndex = i"
          >
            <img
              v-if="coverOf(track)"
              :src="coverOf(track)!"
              class="command__cover"
              loading="lazy"
              alt=""
            >
            <div v-else class="command__cover command__cover--empty" />

            <div class="command__track-info">
              <span class="command__label">{{ track.name }}</span>
              <span class="command__hint microtext">{{ track.artists.map(a => a.name).join(', ') }} — {{ track.album.name }}</span>
            </div>

            <span class="command__pill microtext">
              {{ track.preview_url ? 'PREVIEW' : auth.isPremium ? 'FULL' : 'VISUAL' }}
            </span>
          </li>

          <li v-if="!searching && searchResults.length === 0 && query.trim()" class="command__empty microtext">
            NO SIGNAL MATCHES — "{{ query }}"
          </li>

          <li v-if="!auth.isAuthenticated" class="command__auth-cta">
            <button class="command__login-btn microtext" @click="login()">
              LOGIN WITH SPOTIFY TO SEARCH
            </button>
          </li>
        </ul>

        <!-- Comandos de sistema -->
        <ul v-else class="command__list" role="listbox">
          <li
            v-for="(action, i) in filteredCmds"
            :key="action.id"
            class="command__item"
            :class="{
              'command__item--active': i === activeIndex,
              'command__item--disabled': action.disabled
            }"
            role="option"
            :aria-selected="i === activeIndex"
            @click="runCmd(action)"
            @mousemove="activeIndex = i"
          >
            <span class="command__label">{{ action.label }}</span>
            <span v-if="action.hint" class="command__hint microtext">{{ action.hint }}</span>
            <span v-else-if="action.shortcut" class="command__hint microtext">{{ action.shortcut }}</span>
            <span class="command__group microtext">{{ action.group }}</span>
          </li>

          <li v-if="filteredCmds.length === 0" class="command__empty microtext">
            NO SIGNAL MATCHES
          </li>
        </ul>

        <!-- Footer hint -->
        <div class="command__footer microtext">
          <span>↑↓ NAVIGATE</span>
          <span>↵ SELECT</span>
          <span v-if="auth.isAuthenticated">TYPE TO SEARCH · &gt; FOR COMMANDS</span>
          <span v-else>LOGIN WITH SPOTIFY TO SEARCH MUSIC</span>
        </div>
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
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
}

.command__panel {
  width: min(660px, calc(100vw - 32px));
  max-height: 70dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg-soft);
  border: 1px solid var(--glass-border);
  box-shadow: 0 48px 140px rgba(0, 0, 0, 0.65);
}

.command__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px 0;
}

.command__auth {
  margin-left: 8px;
}

.command__input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 18px;
  padding: 12px 16px;
  background: var(--glass);
  border: 1px solid var(--glass-border);
}

.command__input-row:focus-within {
  border-color: var(--ink-dim);
}

.command__prompt {
  font-size: 14px;
  color: var(--ink-dim);
  user-select: none;
  flex-shrink: 0;
}

.command__input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 14px;
  letter-spacing: 0.04em;
}

.command__spin {
  flex-shrink: 0;
  animation: spin-fade 0.6s ease infinite alternate;
}

@keyframes spin-fade { from { opacity: 0.3; } to { opacity: 1; } }

.command__list {
  list-style: none;
  overflow-y: auto;
  padding-bottom: 6px;
  flex: 1;
  min-height: 0;
}

.command__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: background var(--t-fast) linear;
}

.command__item--active {
  background: var(--glass);
  border-left-color: var(--ink);
}

.command__item--disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.command__item--track {
  gap: 14px;
}

.command__cover {
  width: 44px;
  height: 44px;
  object-fit: cover;
  flex-shrink: 0;
  filter: saturate(0) contrast(1.05);
}

.command__cover--empty {
  background: var(--glass);
  border: 1px solid var(--glass-border);
}

.command__track-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.command__track-info .command__hint {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command__pill {
  flex-shrink: 0;
  padding: 3px 8px;
  border: 1px solid var(--glass-border);
  letter-spacing: 0.18em;
  font-size: 9px;
}

.command__label {
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command__hint {
  letter-spacing: 0.12em;
  color: var(--ink-dim);
}

.command__group {
  margin-left: auto;
  flex-shrink: 0;
}

.command__empty {
  padding: 18px;
  text-align: center;
}

.command__auth-cta {
  padding: 12px 18px;
  display: flex;
  justify-content: center;
}

.command__login-btn {
  padding: 12px 24px;
  border: 1px solid var(--ink-dim);
  color: var(--ink);
  letter-spacing: 0.22em;
  transition: background var(--t-fast) linear, color var(--t-fast) linear;
}

.command__login-btn:hover {
  background: var(--ink);
  color: var(--bg);
}

.command__footer {
  display: flex;
  gap: 20px;
  padding: 10px 18px;
  border-top: 1px solid var(--glass-border);
}

/* Entrada como camada cinematográfica */
.command-enter-active { transition: opacity var(--t-fast) linear; }
.command-enter-active .command__panel { transition: transform var(--t-scene) var(--ease-scene), opacity var(--t-scene) var(--ease-scene); }
.command-leave-active { transition: opacity var(--t-fast) linear; }
.command-enter-from { opacity: 0; }
.command-enter-from .command__panel { transform: translateY(-14px) scale(0.99); opacity: 0; }
.command-leave-to { opacity: 0; }
</style>
