/**
 * Tipos Spotify para a Fase 2.
 * Cobre Search API, Player State e User Profile.
 */

export interface SpotifyArtist {
  id: string
  name: string
  genres?: string[]
  images?: { url: string; height: number; width: number }[]
}

export interface SpotifyAlbum {
  id: string
  name: string
  images: { url: string; height: number; width: number }[]
  release_date: string
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: SpotifyArtist[]
  album: SpotifyAlbum
  duration_ms: number
  preview_url: string | null
  popularity: number
  uri: string
  is_playable?: boolean
}

export interface SpotifySearchResult {
  tracks: {
    items: SpotifyTrack[]
    total: number
  }
}

export interface SpotifyUser {
  id: string
  display_name: string | null
  email: string
  images: { url: string }[]
  product: 'premium' | 'free' | 'open'
  country: string
}

export interface SpotifyPlayerState {
  track_window: {
    current_track: {
      id: string
      name: string
      artists: { name: string }[]
      album: { name: string; images: { url: string }[] }
      duration_ms: number
      preview_url?: string | null
      uri: string
    }
    next_tracks: { id: string; name: string; artists: { name: string }[] }[]
  }
  position: number
  duration: number
  paused: boolean
  timestamp: number
}

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}
