import { defineStore } from 'pinia'
import type { CurrentTrack, MusicMood, MonochromeMusicPalette, VisualScene } from '~/types/cinematic'
import { useCinematicStore } from '~/stores/cinematic'
import { moodToSceneAdjustments } from '~/composables/useMoodMapper'

/**
 * Estado musical que alimenta a cena. Na Fase 1 não há Spotify ainda —
 * a store expõe um sinal simulado (Command Center → "Simulate Signal")
 * para validar a reatividade das barras, do chrome e do hero.
 * Na Fase 2 o Web Playback SDK passa a alimentar exatamente esta store.
 */
export const useMusicVisualStore = defineStore('musicVisual', {
  state: () => ({
    currentTrack: null as CurrentTrack | null,
    currentMood: 'minimal' as MusicMood,
    palette: { luminance: 0.5, accent: '#9a9a9a', contrast: 0.5 } as MonochromeMusicPalette,
    progressMs: 0,
    isPlaying: false,
    scene: 'landing' as VisualScene,
    transitioning: false,
    _simTimer: null as ReturnType<typeof setInterval> | null
  }),

  getters: {
    progress (state): number {
      if (!state.currentTrack || state.currentTrack.durationMs === 0) return 0
      return Math.min(1, state.progressMs / state.currentTrack.durationMs)
    },

    timecode (state): string {
      const fmt = (ms: number) => {
        const s = Math.floor(ms / 1000)
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
      }
      if (!state.currentTrack) return '--:-- / --:--'
      return `${fmt(state.progressMs)} / ${fmt(state.currentTrack.durationMs)}`
    },

    statusLabel (state): string {
      if (state.transitioning) return 'SIGNAL SHIFTING'
      if (state.isPlaying) return 'SIGNAL LOCKED'
      if (state.currentTrack) return 'SIGNAL HELD'
      return 'AWAITING SIGNAL'
    },

    /** Ajustes de CSS variables derivados do mood atual (PRD §5.7.4). */
    moodAdjustments (state): Record<string, string> {
      return moodToSceneAdjustments(state.currentMood)
    }
  },

  actions: {
    play () {
      if (!this.currentTrack) return
      this.isPlaying = true
      useCinematicStore().setBarsState('playing')
    },

    pause () {
      this.isPlaying = false
      useCinematicStore().setBarsState('paused')
    },

    togglePlay () {
      this.isPlaying ? this.pause() : this.play()
    },

    /** Track Transition Mode (PRD §5.2.6): corte de cena de 900–1600ms. */
    async setTrack (track: CurrentTrack) {
      const cinematic = useCinematicStore()
      this.transitioning = true
      cinematic.setMode('track-transition')
      cinematic.setBarsState('transitioning')
      await new Promise(resolve => setTimeout(resolve, cinematic.reducedMotion ? 150 : 1200))
      this.currentTrack = track
      this.progressMs = 0
      this.transitioning = false
      cinematic.setMode(cinematic.immersive ? 'oled-wallpaper' : 'hero')
      this.play()
    },

    clearTrack () {
      this.stopSimulation()
      this.currentTrack = null
      this.isPlaying = false
      this.progressMs = 0
      const cinematic = useCinematicStore()
      cinematic.setBarsState('idle')
      cinematic.setMode('ambient-idle')
    },

    /** Sinal simulado para demonstrar a cena reativa antes da Fase 2 (Spotify real). */
    startSimulation () {
      this.stopSimulation()
      this.setTrack({
        id: 'sim-001',
        title: 'CHROME REQUIEM',
        artist: 'PLAYOFF SYSTEM',
        album: 'INTERNAL SIGNAL TEST',
        coverUrl: null,
        durationMs: 3 * 60 * 1000 + 24 * 1000
      })
      this.currentMood = 'nocturnal'
      this._simTimer = setInterval(() => {
        if (!this.isPlaying || !this.currentTrack) return
        this.progressMs += 1000
        if (this.progressMs >= this.currentTrack.durationMs) {
          this.progressMs = 0
        }
      }, 1000)
    },

    stopSimulation () {
      if (this._simTimer) {
        clearInterval(this._simTimer)
        this._simTimer = null
      }
    }
  }
})
