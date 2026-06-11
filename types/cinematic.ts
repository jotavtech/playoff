/**
 * Contrato visual do PLAYOFF — tipos do CinematicModeSystem,
 * CinematicBarsEngine e MonochromeThemeSystem (PRD §5).
 */

export type CinematicMode =
  | 'hero'
  | 'oled-wallpaper'
  | 'focus'
  | 'room-live'
  | 'voting-tension'
  | 'track-transition'
  | 'ambient-idle'

export type CinematicBarsState =
  | 'idle'
  | 'searching'
  | 'loading-track'
  | 'playing'
  | 'paused'
  | 'transitioning'
  | 'voting'
  | 'winner'
  | 'room-live'
  | 'error'
  | 'wallpaper'

export interface CinematicBarsVisualState {
  topHeight: number
  bottomHeight: number
  opacity: number
  edgeBlur: number
  innerLineOpacity: number
  innerLineScale: number
  vibration: number
  metadataOpacity: number
  depthShadow: number
  chromaticNoise: number
}

export type MonochromeTheme =
  | 'pure-white'
  | 'editorial-white'
  | 'frost-chrome'
  | 'deep-black'
  | 'oled-black'
  | 'cinema-contrast'
  | 'monochrome-glass'
  | 'ink-system'

export type VisualPreset =
  | 'cinema'
  | 'oled-wallpaper'
  | 'editorial'
  | 'chrome-lab'
  | 'minimal-player'
  | 'room-stage'
  | 'focus'

export type MusicMood =
  | 'cold'
  | 'soft'
  | 'heavy'
  | 'fast'
  | 'nocturnal'
  | 'bright'
  | 'minimal'
  | 'dramatic'
  | 'luxury'
  | 'chaotic-controlled'

export type PerformanceTier = 'low' | 'medium' | 'high' | 'ultra'

export type QueueDramaEvent =
  | 'track-added'
  | 'vote-cast'
  | 'vote-removed'
  | 'leader-changed'
  | 'tie-detected'
  | 'winner-locked'
  | 'track-skipped'
  | 'queue-cleared'

export type VisualScene = 'landing' | 'player' | 'room' | 'queue' | 'profile'

/** Paleta monocromática derivada da capa — influencia atmosfera, nunca sequestra a identidade. */
export interface MonochromeMusicPalette {
  /** Luminância dominante da capa, 0 (preto) a 1 (branco). */
  luminance: number
  /** Acento cromático mínimo (reflexo no chrome / progress accent). */
  accent: string
  /** Contraste estimado da capa, 0 a 1. */
  contrast: number
}

/**
 * Paleta cromática rica do Chromatic Engine (PRD Radiola §4).
 * A cor da música assombra a cena — progress, halo do disco, barras —
 * mas o fundo continua preto/branco. Nunca vira tema colorido.
 */
export interface ChromaticPalette {
  /** Cor mais expressiva: progress bar, barras do visualizer, bordas. */
  accent: string
  /** Halo do disco — accent em ~25% de opacidade. */
  glow: string
  /** Tint atmosférico — accent em ~4% de opacidade. */
  bgTint: string
  /** Cor dominante média da capa. */
  dominant: string
  /** Luminância 0..1. */
  luminance: number
  /** Saturação máxima encontrada 0..1. */
  saturation: number
  /** Temperatura cromática. */
  temperature: 'warm' | 'cool' | 'neutral'
}

/** Estados de rotação do Disco Radiola (PRD Radiola §3.2). */
export type VinylState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'transitioning'
  | 'tension'
  | 'winner'

/** Variantes de cor do vinil por humor da música (PRD Radiola §7.2). */
export type VinylVariant = 'standard' | 'noir' | 'bright' | 'heavy' | 'minimal'

/** Quadro de análise de áudio do visualizer (PRD Radiola §5). */
export interface AudioAnalysisFrame {
  /** Energia normalizada 0..1 por banda de frequência (escala log). */
  bands: number[]
  /** Energia geral 0..1. */
  energy: number
  /** Energia de grave 0..1 — alimenta o beat detector. */
  bass: number
}

/** Ponto na linha do tempo de humor da sessão (PRD Radiola §10.2). */
export interface MoodPoint {
  trackId: string
  title: string
  artist: string
  mood: MusicMood
  accent: string
  energy: number
  at: number
}

export interface CurrentTrack {
  id: string
  title: string
  artist: string
  album: string
  coverUrl: string | null
  durationMs: number
}

export interface CommandAction {
  id: string
  label: string
  hint?: string
  shortcut?: string
  group: 'visual' | 'music' | 'room' | 'system'
  disabled?: boolean
  run: () => void
}
