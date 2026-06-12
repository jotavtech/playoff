import { defineStore } from 'pinia'
import type {
  CinematicMode,
  CinematicBarsState,
  CinematicBarsVisualState,
  MonochromeTheme,
  VisualPreset,
  PerformanceTier
} from '~/types/cinematic'

interface PresetProfile {
  theme: MonochromeTheme
  mode: CinematicMode
  motionIntensity: number
  depthIntensity: number
  microtextDensity: number
}

const PRESET_PROFILES: Record<VisualPreset, PresetProfile> = {
  'cinema':         { theme: 'cinema-contrast',  mode: 'hero',          motionIntensity: 0.9,  depthIntensity: 1,    microtextDensity: 0.8 },
  'oled-wallpaper': { theme: 'oled-black',       mode: 'oled-wallpaper', motionIntensity: 0.6, depthIntensity: 0.9,  microtextDensity: 0.4 },
  'editorial':      { theme: 'editorial-white',  mode: 'hero',          motionIntensity: 0.5,  depthIntensity: 0.7,  microtextDensity: 1 },
  'chrome-lab':     { theme: 'monochrome-glass', mode: 'hero',          motionIntensity: 1,    depthIntensity: 1,    microtextDensity: 0.9 },
  'minimal-player': { theme: 'deep-black',       mode: 'focus',         motionIntensity: 0.4,  depthIntensity: 0.5,  microtextDensity: 0.2 },
  'room-stage':     { theme: 'cinema-contrast',  mode: 'room-live',     motionIntensity: 0.85, depthIntensity: 1,    microtextDensity: 0.7 },
  'focus':          { theme: 'deep-black',       mode: 'focus',         motionIntensity: 0.35, depthIntensity: 0.6,  microtextDensity: 0.3 }
}

/** Perfil base das barras por estado (PRD §5.3.4). Valores em px / 0..1. */
const BARS_BY_STATE: Record<CinematicBarsState, CinematicBarsVisualState> = {
  'idle':          { topHeight: 48,  bottomHeight: 64,  opacity: 0.92, edgeBlur: 10, innerLineOpacity: 0.18, innerLineScale: 0.4,  vibration: 0,    metadataOpacity: 0.55, depthShadow: 0.35, chromaticNoise: 0 },
  'searching':     { topHeight: 56,  bottomHeight: 72,  opacity: 0.96, edgeBlur: 14, innerLineOpacity: 0.42, innerLineScale: 0.7,  vibration: 0.15, metadataOpacity: 0.7,  depthShadow: 0.45, chromaticNoise: 0.1 },
  'loading-track': { topHeight: 64,  bottomHeight: 84,  opacity: 1,    edgeBlur: 16, innerLineOpacity: 0.5,  innerLineScale: 0.85, vibration: 0.25, metadataOpacity: 0.4,  depthShadow: 0.5,  chromaticNoise: 0.2 },
  'playing':       { topHeight: 72,  bottomHeight: 96,  opacity: 1,    edgeBlur: 18, innerLineOpacity: 0.38, innerLineScale: 1,    vibration: 0.1,  metadataOpacity: 0.85, depthShadow: 0.55, chromaticNoise: 0.08 },
  'paused':        { topHeight: 72,  bottomHeight: 96,  opacity: 1,    edgeBlur: 12, innerLineOpacity: 0.22, innerLineScale: 1,    vibration: 0,    metadataOpacity: 0.85, depthShadow: 0.5,  chromaticNoise: 0 },
  'transitioning': { topHeight: 120, bottomHeight: 140, opacity: 1,    edgeBlur: 26, innerLineOpacity: 0.1,  innerLineScale: 0.2,  vibration: 0.4,  metadataOpacity: 0,    depthShadow: 0.75, chromaticNoise: 0.4 },
  'voting':        { topHeight: 84,  bottomHeight: 108, opacity: 1,    edgeBlur: 20, innerLineOpacity: 0.6,  innerLineScale: 1.1,  vibration: 0.35, metadataOpacity: 0.9,  depthShadow: 0.6,  chromaticNoise: 0.25 },
  'winner':        { topHeight: 96,  bottomHeight: 116, opacity: 1,    edgeBlur: 22, innerLineOpacity: 0.8,  innerLineScale: 1.2,  vibration: 0.2,  metadataOpacity: 1,    depthShadow: 0.65, chromaticNoise: 0.15 },
  'room-live':     { topHeight: 76,  bottomHeight: 100, opacity: 1,    edgeBlur: 18, innerLineOpacity: 0.45, innerLineScale: 1,    vibration: 0.18, metadataOpacity: 0.9,  depthShadow: 0.55, chromaticNoise: 0.12 },
  'error':         { topHeight: 60,  bottomHeight: 76,  opacity: 0.95, edgeBlur: 8,  innerLineOpacity: 0.7,  innerLineScale: 0.5,  vibration: 0.5,  metadataOpacity: 1,    depthShadow: 0.4,  chromaticNoise: 0.3 },
  'wallpaper':     { topHeight: 110, bottomHeight: 130, opacity: 1,    edgeBlur: 24, innerLineOpacity: 0.3,  innerLineScale: 1,    vibration: 0.06, metadataOpacity: 0.7,  depthShadow: 0.7,  chromaticNoise: 0.05 }
}

const SESSION_KEY = 'playoff:visual-session'

export const useCinematicStore = defineStore('cinematic', {
  state: () => ({
    mode: 'ambient-idle' as CinematicMode,
    preset: 'cinema' as VisualPreset,
    theme: 'deep-black' as MonochromeTheme,
    barsState: 'idle' as CinematicBarsState,
    wallpaperMode: false,
    cinemaView: false,
    motionIntensity: 0.8,
    depthIntensity: 1,
    microtextDensity: 0.8,
    performanceTier: 'high' as PerformanceTier,
    reducedMotion: false,
    smartIdle: false,
    /** Aura Mode (PRD Radiola §10.1): disco domina a tela após idle longo. */
    auraMode: false,
    commandCenterOpen: false,
    diagnosticsOpen: false,
    /** SPEC 04: modo karaoke fullscreen. */
    karaokeMode: false,
    /** SPEC 07: painel de presets de equalizador. */
    eqPanelOpen: false
  }),

  getters: {
    /** Estado visual final das barras: estado base × intensidade × tier × reduced-motion. */
    barsVisual (state): CinematicBarsVisualState {
      const base = BARS_BY_STATE[state.barsState]
      const motion = state.reducedMotion ? 0 : state.motionIntensity
      const tierScale = state.performanceTier === 'low' ? 0.5 : state.performanceTier === 'medium' ? 0.8 : 1
      return {
        ...base,
        edgeBlur: base.edgeBlur * tierScale * state.depthIntensity,
        innerLineOpacity: base.innerLineOpacity * (0.4 + 0.6 * motion),
        vibration: base.vibration * motion * tierScale,
        chromaticNoise: base.chromaticNoise * motion * tierScale,
        depthShadow: base.depthShadow * state.depthIntensity,
        metadataOpacity: base.metadataOpacity * (0.3 + 0.7 * state.microtextDensity)
      }
    },

    effectiveMotion (state): number {
      return state.reducedMotion ? 0 : state.motionIntensity
    },

    immersive (state): boolean {
      return state.wallpaperMode || state.cinemaView
    },

    /** SPEC 09: há algum overlay/modo imersivo aberto agora? */
    hasOpenOverlay (state): boolean {
      return state.auraMode || state.commandCenterOpen || state.diagnosticsOpen ||
        state.cinemaView || state.wallpaperMode || state.karaokeMode || state.eqPanelOpen
    }
  },

  actions: {
    setMode (mode: CinematicMode) {
      this.mode = mode
    },

    setTheme (theme: MonochromeTheme) {
      this.theme = theme
      if (import.meta.client) {
        document.documentElement.setAttribute('data-theme', theme)
      }
      this.persistSession()
    },

    setPreset (preset: VisualPreset) {
      this.preset = preset
      const p = PRESET_PROFILES[preset]
      this.motionIntensity = p.motionIntensity
      this.depthIntensity = p.depthIntensity
      this.microtextDensity = p.microtextDensity
      this.setTheme(p.theme)
      this.setMode(p.mode)
      this.wallpaperMode = preset === 'oled-wallpaper'
      this.persistSession()
    },

    setBarsState (barsState: CinematicBarsState) {
      this.barsState = barsState
    },

    setMotionIntensity (value: number) {
      this.motionIntensity = Math.min(1, Math.max(0, value))
      this.persistSession()
    },

    toggleCinemaView () {
      this.cinemaView = !this.cinemaView
      if (this.cinemaView) {
        this.wallpaperMode = false
        this.setMode('hero')
        if (this.barsState === 'idle') this.setBarsState('wallpaper')
      } else if (this.barsState === 'wallpaper') {
        this.setBarsState('idle')
        this.setMode('ambient-idle')
      }
    },

    toggleWallpaperMode () {
      this.wallpaperMode = !this.wallpaperMode
      if (this.wallpaperMode) {
        this.cinemaView = false
        this.setMode('oled-wallpaper')
        this.setTheme('oled-black')
        this.setBarsState('wallpaper')
      } else {
        this.setMode('ambient-idle')
        this.setBarsState('idle')
      }
    },

    exitImmersive () {
      this.cinemaView = false
      this.wallpaperMode = false
      this.setMode('ambient-idle')
      if (this.barsState === 'wallpaper') this.setBarsState('idle')
    },

    /** SPEC 09: fecha TODO overlay/modo aberto (usado pelo back do navegador). */
    closeAllOverlays () {
      if (this.eqPanelOpen) this.eqPanelOpen = false
      if (this.karaokeMode) this.karaokeMode = false
      if (this.commandCenterOpen) this.toggleCommandCenter()
      if (this.diagnosticsOpen) this.toggleDiagnostics()
      if (this.auraMode) this.setAuraMode(false)
      if (this.cinemaView || this.wallpaperMode) this.exitImmersive()
    },

    toggleCommandCenter () {
      this.commandCenterOpen = !this.commandCenterOpen
      this.setBarsState(this.commandCenterOpen ? 'searching' : (this.wallpaperMode || this.cinemaView ? 'wallpaper' : 'idle'))
    },

    toggleDiagnostics () {
      this.diagnosticsOpen = !this.diagnosticsOpen
    },

    /** SPEC 04: entra/sai do modo karaoke (overlay fullscreen). */
    toggleKaraoke () {
      this.karaokeMode = !this.karaokeMode
      if (this.karaokeMode) this.commandCenterOpen = false
    },

    setKaraoke (active: boolean) {
      this.karaokeMode = active
    },

    /** SPEC 07: abre/fecha o painel de presets de equalizador. */
    toggleEqPanel () {
      this.eqPanelOpen = !this.eqPanelOpen
    },

    setSmartIdle (idle: boolean) {
      this.smartIdle = idle
    },

    setAuraMode (active: boolean) {
      this.auraMode = active
    },

    setReducedMotion (value: boolean) {
      this.reducedMotion = value
    },

    setPerformanceTier (tier: PerformanceTier) {
      this.performanceTier = tier
    },

    /** Session Memory (PRD §5.11): lembra tema, preset e intensidades. */
    persistSession () {
      if (!import.meta.client) return
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          theme: this.theme,
          preset: this.preset,
          motionIntensity: this.motionIntensity,
          depthIntensity: this.depthIntensity
        }))
      } catch { /* storage indisponível não pode quebrar a cena */ }
    },

    restoreSession () {
      if (!import.meta.client) return
      try {
        const raw = localStorage.getItem(SESSION_KEY)
        if (!raw) return
        const saved = JSON.parse(raw)
        if (saved.theme) this.setTheme(saved.theme)
        if (typeof saved.motionIntensity === 'number') this.motionIntensity = saved.motionIntensity
        if (typeof saved.depthIntensity === 'number') this.depthIntensity = saved.depthIntensity
        if (saved.preset) this.preset = saved.preset
      } catch { /* sessão corrompida: segue com defaults */ }
    }
  }
})
