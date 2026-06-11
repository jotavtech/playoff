import { defineStore } from 'pinia'
import type {
  CurrentTrack, MusicMood, MonochromeMusicPalette, VisualScene,
  ChromaticPalette, VinylState, VinylVariant, AudioAnalysisFrame, MoodPoint
} from '~/types/cinematic'
import { useCinematicStore } from '~/stores/cinematic'
import { moodToSceneAdjustments } from '~/composables/useMoodMapper'

const DEFAULT_CHROMATIC: ChromaticPalette = {
  accent: 'rgb(200, 202, 206)',
  glow: 'rgba(200, 202, 206, 0.2)',
  bgTint: 'rgba(200, 202, 206, 0.04)',
  dominant: 'rgb(140, 140, 144)',
  luminance: 0.5,
  saturation: 0,
  temperature: 'neutral'
}

/** Variante de vinil por humor (PRD Radiola §7.2). */
const VINYL_VARIANT_BY_MOOD: Record<MusicMood, VinylVariant> = {
  nocturnal: 'noir',
  cold: 'noir',
  soft: 'minimal',
  minimal: 'minimal',
  bright: 'bright',
  luxury: 'bright',
  heavy: 'heavy',
  dramatic: 'heavy',
  fast: 'standard',
  'chaotic-controlled': 'standard'
}

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
    /** Chromatic Engine (PRD Radiola §4): a cor da música que assombra a cena. */
    chromatic: { ...DEFAULT_CHROMATIC } as ChromaticPalette,
    progressMs: 0,
    isPlaying: false,
    scene: 'landing' as VisualScene,
    transitioning: false,
    /** BPM Reactor (PRD Radiola §6). 0 = desconhecido → comportamento neutro. */
    bpm: 0,
    /** Pulso do beat detector — true por ~80ms a cada batida (PRD Radiola §5.6). */
    beatActive: false,
    /** Quadro atual do Audio Visualizer (PRD Radiola §5). */
    audioFrame: null as AudioAnalysisFrame | null,
    /** Linha do tempo de humor da sessão (PRD Radiola §10.2). */
    moodHistory: [] as MoodPoint[],
    /** Nonce de flip do disco — incrementa a cada virada (PRD Radiola §7.1). */
    discFlipNonce: 0,
    _simTimer: null as ReturnType<typeof setInterval> | null,
    _beatTimer: null as ReturnType<typeof setTimeout> | null
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
    },

    /** Estado de rotação do Disco Radiola (PRD Radiola §3.2). */
    vinylState (state): VinylState {
      if (state.transitioning) return 'transitioning'
      const bars = useCinematicStore().barsState
      if (bars === 'winner') return 'winner'
      if (bars === 'voting') return 'tension'
      if (bars === 'loading-track') return 'loading'
      if (!state.currentTrack) return 'idle'
      return state.isPlaying ? 'playing' : 'paused'
    },

    /** Variante de cor do vinil pelo humor atual (PRD Radiola §7.2). */
    vinylVariant (state): VinylVariant {
      return VINYL_VARIANT_BY_MOOD[state.currentMood] ?? 'standard'
    },

    /**
     * RPM do disco em função do BPM (PRD Radiola §6.2).
     * BPM 0 (desconhecido) → 33rpm neutro de toca-discos.
     */
    discRpm (state): number {
      const bpm = state.bpm
      if (!bpm) return 33
      if (bpm < 80) return 28
      if (bpm < 120) return 33
      if (bpm < 150) return 38
      return 45
    },

    /** Duração de uma rotação em segundos — alimenta animation-duration. */
    discRotationSec (): number {
      return 60 / this.discRpm
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
      // BPM reseta — será reavaliado pelo beat detector da nova faixa
      this.bpm = 0
      cinematic.setMode('track-transition')
      cinematic.setBarsState('transitioning')
      await new Promise(resolve => setTimeout(resolve, cinematic.reducedMotion ? 150 : 1200))
      this.currentTrack = track
      this.progressMs = 0
      this.transitioning = false
      this.recordMood(track)
      cinematic.setMode(cinematic.immersive ? 'oled-wallpaper' : 'hero')
      this.play()
    },

    /** Chromatic Engine (PRD Radiola §4) — recebe a paleta extraída da capa. */
    setChromatic (palette: ChromaticPalette) {
      this.chromatic = palette
    },

    /** BPM Reactor (PRD Radiola §6) — define o BPM detectado/estimado. */
    setBpm (bpm: number) {
      if (bpm > 0 && bpm < 300) this.bpm = Math.round(bpm)
    },

    /** Beat detector (PRD Radiola §5.6) — pulso de ~80ms a cada batida. */
    pulseBeat () {
      this.beatActive = true
      if (this._beatTimer) clearTimeout(this._beatTimer)
      this._beatTimer = setTimeout(() => { this.beatActive = false }, 80)
    },

    /** Audio Visualizer (PRD Radiola §5) — quadro de frequências atual. */
    setAudioFrame (frame: AudioAnalysisFrame | null) {
      this.audioFrame = frame
    },

    /** Vinyl Flip (PRD Radiola §7.1) — dispara a virada 3D do disco. */
    triggerFlip () {
      this.discFlipNonce++
    },

    /** Mood Timeline (PRD Radiola §10.2) — registra a faixa na linha do tempo. */
    recordMood (track: CurrentTrack) {
      const energy = this.bpm ? Math.min(1, this.bpm / 180) : 0.5
      this.moodHistory.push({
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        mood: this.currentMood,
        accent: this.chromatic.accent,
        energy,
        at: Date.now()
      })
      // Mantém a sessão enxuta — últimas 40 faixas
      if (this.moodHistory.length > 40) this.moodHistory.shift()
    },

    clearTrack () {
      this.stopSimulation()
      this.currentTrack = null
      this.isPlaying = false
      this.progressMs = 0
      this.bpm = 0
      this.audioFrame = null
      this.chromatic = { ...DEFAULT_CHROMATIC }
      const cinematic = useCinematicStore()
      cinematic.setBarsState('idle')
      cinematic.setMode('ambient-idle')
    },

    /** Sinal simulado para demonstrar a cena reativa antes da Fase 2 (Spotify real). */
    startSimulation () {
      this.stopSimulation()
      this.currentMood = 'nocturnal'
      // Cor fria de teste para o disco e as barras ganharem vida sem capa real
      this.setChromatic({
        accent: 'rgb(120, 150, 210)',
        glow: 'rgba(120, 150, 210, 0.28)',
        bgTint: 'rgba(120, 150, 210, 0.05)',
        dominant: 'rgb(60, 72, 110)',
        luminance: 0.32,
        saturation: 0.55,
        temperature: 'cool'
      })
      this.setBpm(96)
      this.setTrack({
        id: 'sim-001',
        title: 'CHROME REQUIEM',
        artist: 'PLAYOFF SYSTEM',
        album: 'INTERNAL SIGNAL TEST',
        coverUrl: null,
        durationMs: 3 * 60 * 1000 + 24 * 1000
      })
      this._simTimer = setInterval(() => {
        if (!this.isPlaying || !this.currentTrack) return
        this.progressMs += 1000
        if (this.progressMs >= this.currentTrack.durationMs) {
          this.progressMs = 0
        }
        // Beat simulado a ~96 BPM (a cada ~625ms) — só visual, sem áudio
        this.pulseBeat()
      }, 1000)
    },

    stopSimulation () {
      if (this._simTimer) {
        clearInterval(this._simTimer)
        this._simTimer = null
      }
      if (this._beatTimer) {
        clearTimeout(this._beatTimer)
        this._beatTimer = null
      }
    }
  }
})
