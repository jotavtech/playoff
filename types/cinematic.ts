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
