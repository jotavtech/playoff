import { useAuthStore } from '~/stores/auth'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useCinematicStore } from '~/stores/cinematic'
import { inferMood } from '~/composables/useMoodMapper'
import { extractPalette } from '~/composables/usePaletteExtractor'
import type { SpotifyPlayerState, SpotifyTrack } from '~/types/spotify'
import type { CurrentTrack } from '~/types/cinematic'

declare global {
  interface Window {
    Spotify: {
      Player: new (opts: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume: number
      }) => SpotifySDKPlayer
    }
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

interface SpotifySDKPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  addListener(event: 'ready', cb: (data: { device_id: string }) => void): void
  addListener(event: 'not_ready', cb: (data: { device_id: string }) => void): void
  addListener(event: 'player_state_changed', cb: (state: SpotifyPlayerState | null) => void): void
  addListener(event: 'initialization_error', cb: (e: { message: string }) => void): void
  addListener(event: 'authentication_error', cb: (e: { message: string }) => void): void
  addListener(event: 'account_error', cb: (e: { message: string }) => void): void
  getCurrentState(): Promise<SpotifyPlayerState | null>
  pause(): Promise<void>
  resume(): Promise<void>
  togglePlay(): Promise<void>
  seek(ms: number): Promise<void>
  setVolume(v: number): Promise<void>
}

let sdkPlayer: SpotifySDKPlayer | null = null
let sdkReady = false
let progressInterval: ReturnType<typeof setInterval> | null = null

// Elemento de áudio para o fallback de 30s (non-premium / sem preview)
let previewAudio: HTMLAudioElement | null = null

function stopPreview () {
  if (previewAudio) {
    previewAudio.pause()
    previewAudio.src = ''
    previewAudio = null
  }
}

export function useSpotifyPlayer () {
  const auth = useAuthStore()
  const music = useMusicVisualStore()
  const cinematic = useCinematicStore()

  // ─── Carrega o SDK lazily ────────────────────────────────────────────────
  function loadSDK (): Promise<void> {
    if (sdkReady || !import.meta.client) return Promise.resolve()
    return new Promise((resolve) => {
      window.onSpotifyWebPlaybackSDKReady = () => {
        sdkReady = true
        resolve()
      }
      if (document.querySelector('script[src*="spotify-player"]')) {
        // já carregado, mas o callback pode já ter disparado
        if ((window as any).Spotify) { sdkReady = true; resolve() }
        return
      }
      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.async = true
      document.head.appendChild(script)
    })
  }

  // ─── Inicializa o player ─────────────────────────────────────────────────
  async function initPlayer () {
    if (!auth.isPremium || !import.meta.client) return

    await loadSDK()
    if (sdkPlayer) return

    sdkPlayer = new window.Spotify.Player({
      name: 'PLAYOFF CHROME ENGINE',
      volume: 0.8,
      getOAuthToken: async (cb) => {
        const token = await auth.ensureFreshToken()
        if (token) cb(token)
      }
    })

    sdkPlayer.addListener('ready', ({ device_id }) => {
      auth.setDeviceId(device_id)
      transferPlayback(device_id)
    })

    sdkPlayer.addListener('not_ready', () => {
      auth.setDeviceId(null as any)
    })

    sdkPlayer.addListener('player_state_changed', onStateChange)

    sdkPlayer.addListener('account_error', () => {
      // Conta não é Premium — cai pro fallback de preview
    })

    sdkPlayer.connect()
    startProgressPoll()
  }

  // ─── Estado do player → MusicVisualStore ────────────────────────────────
  let lastTrackId: string | null = null

  function onStateChange (state: SpotifyPlayerState | null) {
    if (!state) return

    const sdkTrack = state.track_window.current_track
    const trackChanged = sdkTrack.id !== lastTrackId

    if (trackChanged) {
      lastTrackId = sdkTrack.id
      const coverUrl = sdkTrack.album.images[0]?.url ?? null

      const track: CurrentTrack = {
        id: sdkTrack.id,
        title: sdkTrack.name,
        artist: sdkTrack.artists.map(a => a.name).join(', '),
        album: sdkTrack.album.name,
        coverUrl,
        durationMs: state.duration
      }

      // Atualiza palette e mood antes do corte de cena
      if (coverUrl) {
        extractPalette(coverUrl).then(palette => {
          music.palette = palette
          // Aplica ajustes de mood à cena
          const fakeTrack = {
            id: track.id, name: track.title, artists: [{ name: track.artist }],
            popularity: 50, uri: '', duration_ms: track.durationMs,
            preview_url: null, album: { id: '', name: track.album, images: [], release_date: '' }
          }
          music.currentMood = inferMood(fakeTrack, palette.luminance)
        })
      }

      music.setTrack(track)
    }

    if (state.paused && music.isPlaying) {
      music.isPlaying = false
      cinematic.setBarsState('paused')
    } else if (!state.paused && !music.isPlaying) {
      music.isPlaying = true
      cinematic.setBarsState('playing')
    }

    music.progressMs = state.position
  }

  // ─── Poll de progresso (o SDK não emite eventos contínuos de posição) ───
  function startProgressPoll () {
    if (progressInterval) return
    progressInterval = setInterval(async () => {
      if (!sdkPlayer || !music.isPlaying) return
      const state = await sdkPlayer.getCurrentState()
      if (state) music.progressMs = state.position
    }, 900)
  }

  // ─── Transfere a reprodução para o dispositivo SDK ───────────────────────
  async function transferPlayback (deviceId: string) {
    const token = await auth.ensureFreshToken()
    if (!token) return
    await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_ids: [deviceId], play: false })
    }).catch(() => { /* falha silenciosa — dispositivo pode não estar pronto */ })
  }

  // ─── Toca uma faixa ──────────────────────────────────────────────────────
  async function playTrack (track: SpotifyTrack) {
    stopPreview()

    if (auth.isPremium && auth.deviceId) {
      const token = await auth.ensureFreshToken()
      if (!token) return

      // Corte de cena visual enquanto inicia o fetch
      const currentTrack: CurrentTrack = {
        id: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        coverUrl: track.album.images[0]?.url ?? null,
        durationMs: track.duration_ms
      }
      await music.setTrack(currentTrack)

      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${auth.deviceId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [track.uri] })
      }).catch(() => { /* ignora — corte de cena já aconteceu */ })

      return
    }

    // Fallback: preview de 30s via HTML5 audio
    if (track.preview_url) {
      const currentTrack: CurrentTrack = {
        id: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        coverUrl: track.album.images[0]?.url ?? null,
        durationMs: track.duration_ms
      }
      await music.setTrack(currentTrack)

      previewAudio = new Audio(track.preview_url)
      previewAudio.volume = 0.8
      previewAudio.onended = () => music.pause()
      previewAudio.play().catch(() => { /* autoplay bloqueado */ })

      // Progresso do preview (30s) atualizado a cada 500ms
      const start = Date.now()
      const tick = setInterval(() => {
        if (!music.isPlaying) { clearInterval(tick); return }
        music.progressMs = Date.now() - start
      }, 500)

      return
    }

    // Sem preview e sem Premium: visual-only (cena reage, sem áudio)
    const currentTrack: CurrentTrack = {
      id: track.id,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      coverUrl: track.album.images[0]?.url ?? null,
      durationMs: track.duration_ms
    }
    await music.setTrack(currentTrack)
  }

  // ─── Controles ───────────────────────────────────────────────────────────
  async function togglePlay () {
    if (previewAudio) {
      if (previewAudio.paused) { previewAudio.play(); music.play() }
      else { previewAudio.pause(); music.pause() }
      return
    }
    if (sdkPlayer) await sdkPlayer.togglePlay()
    else music.togglePlay()
  }

  async function seek (ms: number) {
    if (sdkPlayer) await sdkPlayer.seek(ms)
    else if (previewAudio) previewAudio.currentTime = ms / 1000
    music.progressMs = ms
  }

  function destroy () {
    stopPreview()
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null }
    sdkPlayer?.disconnect()
    sdkPlayer = null
    sdkReady = false
    lastTrackId = null
  }

  return { initPlayer, playTrack, togglePlay, seek, destroy }
}
