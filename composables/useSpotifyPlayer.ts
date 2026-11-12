import { useAuthStore } from '~/stores/auth'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { usePlayerStore } from '~/stores/player'
import { useAudioAnalyser } from '~/composables/useAudioAnalyser'
import type { SpotifyPlayerState, SpotifyTrack } from '~/types/spotify'
import type { CurrentTrack } from '~/types/cinematic'

declare global {
  interface Window {
    Spotify?: { Player: new (options: {
      name: string
      volume: number
      getOAuthToken: (cb: (token: string) => void) => void
    }) => SpotifySDKPlayer }
    onSpotifyWebPlaybackSDKReady: () => void
  }
}
interface SpotifySDKPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  addListener(event: 'ready' | 'not_ready', cb: (data: { device_id: string }) => void): void
  addListener(event: 'player_state_changed', cb: (state: SpotifyPlayerState | null) => void): void
  addListener(event: 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error' | 'autoplay_failed', cb: () => void): void
  getCurrentState(): Promise<SpotifyPlayerState | null>
  activateElement(): Promise<void>
  togglePlay(): Promise<void>
  pause(): Promise<void>
  seek(ms: number): Promise<void>
  setVolume(v: number): Promise<void>
}

let sdkPlayer: SpotifySDKPlayer | null = null
let sdkLoad: Promise<void> | null = null
let sdkInit: Promise<void> | null = null
let poll: ReturnType<typeof setInterval> | null = null
let raf = 0
let audio: HTMLAudioElement | null = null
let audioUrl: string | null = null
let generation = 0
let command = 0
let pendingSpotifyTrack: string | null = null
let clock = { position: 0, at: 0 }
let lastPaint = 0
const ROOT = 'https://api.spotify.com/v1/me/player'

function loadSDK () {
  if (window.Spotify?.Player) return Promise.resolve()
  if (sdkLoad) return sdkLoad
  sdkLoad = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    const timer = setTimeout(() => finish(false), 9000)
    function finish (ok: boolean) {
      clearTimeout(timer)
      script.onerror = null
      if (ok) resolve()
      else { script.remove(); reject(new Error('SDK unavailable')) }
    }
    window.onSpotifyWebPlaybackSDKReady = () => finish(Boolean(window.Spotify?.Player))
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    script.onerror = () => finish(false)
    document.head.appendChild(script)
  }).finally(() => { sdkLoad = null })
  return sdkLoad
}

export function useSpotifyPlayer () {
  const auth = useAuthStore()
  const music = useMusicVisualStore()
  const player = usePlayerStore()
  const analyser = useAudioAnalyser()

  function tick (now: number) {
    if (now - lastPaint >= 48) {
      lastPaint = now
      if (music.isPlaying) {
        if (audio) music.progressMs = audio.currentTime * 1000
        else if (music.currentTrack?.source === 'spotify') {
          music.progressMs = Math.min(music.currentTrack.durationMs, clock.position + Math.max(0, now - clock.at))
        }
      }
    }
    raf = requestAnimationFrame(tick)
  }
  function ensureClock () { if (!raf) raf = requestAnimationFrame(tick) }

  function onState (state: SpotifyPlayerState | null) {
    if (audio) return
    if (!state?.track_window.current_track?.id) {
      if (!pendingSpotifyTrack && music.currentTrack?.source === 'spotify') music.pause()
      return
    }
    const item = state.track_window.current_track
    if (pendingSpotifyTrack && pendingSpotifyTrack !== item.id) return
    player.playbackError = null
    if (music.currentTrack?.id !== item.id || music.currentTrack.source !== 'spotify') {
      const track: CurrentTrack = {
        id: item.id, title: item.name, artist: item.artists.map(a => a.name).join(', '),
        lyricsArtist: item.artists[0]?.name, album: item.album.name, coverUrl: item.album.images[0]?.url ?? null,
        durationMs: state.duration, source: 'spotify', spotifyUrl: 'https://open.spotify.com/track/' + item.id
      }
      void music.setTrack(track, { immediate: true, autoplay: false })
    }
    clock = { position: state.position, at: performance.now() }
    music.progressMs = state.position
    if (state.paused) music.pause()
    else music.play()
    ensureClock()
  }

  function initPlayer () {
    if (!import.meta.client || sdkPlayer) return Promise.resolve()
    if (sdkInit) return sdkInit
    const session = generation
    sdkInit = (async () => {
      try {
        await loadSDK()
        if (session !== generation || !auth.isAuthenticated || !window.Spotify) return
        const sdk = new window.Spotify.Player({
          name: 'Playoff', volume: player.muted ? 0 : player.volume,
          getOAuthToken: async (callback) => {
            const token = await auth.ensureFreshToken()
            if (token && sdkPlayer === sdk) callback(token)
          }
        })
        sdkPlayer = sdk
        const reset = (message: string) => {
          if (sdkPlayer !== sdk) return
          auth.setDeviceId(null)
          player.playbackError = message
          sdkPlayer = null
          if (poll) clearInterval(poll)
          poll = null
          sdk.disconnect()
        }
        sdk.addListener('ready', ({ device_id }) => {
          if (sdkPlayer !== sdk) return
          auth.setDeviceId(device_id)
          auth.isPremium = true
          player.playbackError = null
        })
        sdk.addListener('not_ready', () => {
          if (sdkPlayer !== sdk) return
          auth.setDeviceId(null)
          if (music.currentTrack?.source === 'spotify') music.pause()
        })
        sdk.addListener('player_state_changed', state => { if (sdkPlayer === sdk) onState(state) })
        sdk.addListener('account_error', () => {
          auth.isPremium = false
          reset('A reprodução no navegador requer Spotify Premium. Você ainda pode ouvir uma prévia.')
        })
        sdk.addListener('initialization_error', () => reset('Este navegador não conseguiu iniciar o player do Spotify.'))
        sdk.addListener('authentication_error', () => reset('O player do Spotify perdeu a conexão. Reconecte sua conta.'))
        sdk.addListener('playback_error', () => { player.playbackError = 'O Spotify não conseguiu reproduzir esta faixa.' })
        sdk.addListener('autoplay_failed', () => { player.playbackError = 'Toque em reproduzir para liberar o áudio no navegador.' })
        if (!await sdk.connect()) { reset('Não foi possível conectar o player do Spotify.'); return }
        if (sdkPlayer !== sdk) return
        let polling = false
        poll = setInterval(async () => {
          if (polling || audio || !auth.deviceId || document.hidden) return
          polling = true
          const previous = clock
          const revision = command
          try {
            const state = await sdk.getCurrentState()
            if (sdkPlayer === sdk && clock === previous && command === revision) onState(state)
          } catch { /* SDK will emit a connection event if the device is lost. */ }
          finally { polling = false }
        }, 1500)
      } catch {
        if (session === generation) {
          const failed = sdkPlayer
          sdkPlayer = null
          auth.setDeviceId(null)
          failed?.disconnect()
          player.playbackError = 'Não foi possível carregar o player do Spotify.'
        }
      }
    })().finally(() => { if (session === generation) sdkInit = null })
    return sdkInit
  }

  async function spotify (endpoint: string, method: string, data?: object) {
    const token = await auth.ensureFreshToken()
    if (!token) throw new Error('Reconecte sua conta do Spotify.')
    const send = (token: string) => fetch(ROOT + endpoint, {
      method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(8000)
    })
    let res = await send(token)
    if (res.status === 401 && await auth.refreshAccessToken() && auth.accessToken) res = await send(auth.accessToken)
    if (res.ok) return
    throw new Error(res.status === 403 ? 'O Spotify não autorizou a reprodução para esta conta ou faixa.'
      : res.status === 404 ? 'O dispositivo Spotify ainda não está disponível. Tente novamente.'
      : res.status === 429 ? 'O Spotify limitou as solicitações. Tente novamente em instantes.'
      : 'Não foi possível controlar o Spotify.')
  }

  function stopAudio () {
    if (audio) {
      const previous = audio
      audio = null
      previous.pause()
      previous.removeAttribute('src')
      analyser.detachElement()
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    audioUrl = null
  }

  function startAudio (url: string, source: 'local' | 'preview') {
    const el = new Audio()
    audio = el
    el.volume = player.muted ? 0 : player.volume
    el.onloadedmetadata = () => {
      if (audio === el && music.currentTrack && Number.isFinite(el.duration)) {
        music.currentTrack.durationMs = el.duration * 1000
      }
    }
    el.onplaying = () => { if (audio === el) { player.playbackError = null; music.play() } }
    el.onpause = el.onended = () => { if (audio === el) { music.progressMs = el.currentTime * 1000; music.pause() } }
    el.onerror = () => {
      if (audio !== el) return
      music.pause()
      player.playbackError = 'Não foi possível reproduzir este áudio.'
    }
    el.src = url
    if (source === 'local') analyser.attachElement(el)
    ensureClock()
    void el.play().catch(() => {
      if (audio === el && !el.error) player.playbackError = 'Toque em reproduzir para começar.'
    })
  }

  async function playTrack (item: SpotifyTrack) {
    const id = ++command
    pendingSpotifyTrack = null
    const sdk = sdkPlayer
    const device = auth.deviceId
    player.playbackError = null
    music.stopSimulation()
    stopAudio()
    const track: CurrentTrack = {
      id: item.id, title: item.name, artist: item.artists.map(a => a.name).join(', '),
      lyricsArtist: item.artists[0]?.name, album: item.album.name, coverUrl: item.album.images[0]?.url ?? null,
      durationMs: item.duration_ms, catalogDurationMs: item.duration_ms,
      spotifyUrl: 'https://open.spotify.com/track/' + item.id, source: 'spotify'
    }
    if (sdk && device) {
      pendingSpotifyTrack = track.id
      try {
        await sdk.activateElement()
        if (id !== command) return
        await spotify('/play?device_id=' + encodeURIComponent(device), 'PUT', { uris: [item.uri] })
        if (id !== command) return
        const state = await sdk.getCurrentState().catch(() => null)
        if (id === command) {
          if (state?.track_window.current_track.id === track.id) onState(state)
          else if (music.currentTrack?.id !== track.id) await music.setTrack(track, { immediate: true, autoplay: false })
        }
      } catch (e) {
        if (id === command) player.playbackError = e instanceof Error ? e.message : 'O Spotify não respondeu.'
      } finally {
        if (id === command) pendingSpotifyTrack = null
      }
      return
    }
    const preview = await $fetch<{ previewUrl: string | null }>('/api/preview', {
      query: { title: item.name, artist: item.artists[0]?.name ?? '' }, timeout: 6000
    }).then(result => result.previewUrl, () => null)
    if (id !== command) return
    await music.setTrack({ ...track, source: preview ? 'preview' : 'spotify', durationMs: preview ? 30_000 : track.durationMs }, { immediate: true, autoplay: false })
    if (id !== command) return
    if (preview) {
      startAudio(preview, 'preview')
      void sdkPlayer?.pause().catch(() => {})
    }
    else player.playbackError = 'Prévia indisponível. Abra a faixa no Spotify.'
  }

  function playLocal (file: File) {
    const id = ++command
    pendingSpotifyTrack = null
    stopAudio()
    music.stopSimulation()
    // Set the audio element first so late Spotify events cannot replace the track.
    audioUrl = URL.createObjectURL(file)
    const track: CurrentTrack = {
      id: 'local-' + id, title: file.name.replace(/\.[^.]+$/, ''), artist: 'Arquivo local',
      album: '', coverUrl: null, durationMs: 0, source: 'local'
    }
    music.localLyrics = []
    void music.setTrack(track, { immediate: true, autoplay: false })
    startAudio(audioUrl, 'local')
    void sdkPlayer?.pause().catch(() => {})
  }

  function playPreviewUrl (url: string) {
    command++
    pendingSpotifyTrack = null
    stopAudio()
    if (music.currentTrack) music.currentTrack.source = 'preview'
    startAudio(url, 'preview')
  }

  async function controls (action: () => Promise<void>) {
    try { await action(); player.playbackError = null }
    catch (e) { player.playbackError = e instanceof Error ? e.message : 'Não foi possível controlar a reprodução.' }
  }

  async function togglePlay () {
    if (audio) {
      const el = audio
      if (el.paused) {
        if (music.currentTrack?.source === 'local') analyser.attachElement(el)
        await controls(() => el.play())
      } else el.pause()
    } else if (music.currentTrack?.source === 'spotify') {
      if (sdkPlayer && auth.deviceId) await controls(async () => {
        const sdk = sdkPlayer!
        if (!music.isPlaying) await sdk.activateElement()
        await sdk.togglePlay()
      })
      else player.playbackError = 'Abra a faixa no Spotify para ouvir.'
    } else music.togglePlay()
  }

  async function seek (ms: number) {
    const current = music.currentTrack
    if (!current) return
    const target = Math.min(current.durationMs, Math.max(0, ms))
    if (audio) { audio.currentTime = target / 1000; music.progressMs = target }
    else if (current.source === 'spotify' && sdkPlayer && auth.deviceId) await controls(async () => {
      await sdkPlayer!.seek(target)
      if (music.currentTrack?.id !== current.id) return
      clock = { position: target, at: performance.now() }
      music.progressMs = target
    })
  }

  async function skipToNext () {
    if (music.currentTrack?.source === 'spotify' && auth.deviceId) {
      const device = auth.deviceId
      await controls(() => spotify('/next?device_id=' + encodeURIComponent(device), 'POST'))
    } else if (audio) { audio.pause(); audio.currentTime = 0; music.progressMs = 0 }
  }

  function syncVolume () {
    const volume = player.muted ? 0 : player.volume
    if (audio) audio.volume = volume
    if (sdkPlayer && auth.deviceId) void sdkPlayer.setVolume(volume).catch(() => {})
  }

  function destroy () {
    generation++
    command++
    pendingSpotifyTrack = null
    sdkInit = null
    stopAudio()
    if (poll) clearInterval(poll)
    poll = null
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    const previous = sdkPlayer
    sdkPlayer = null
    previous?.disconnect()
    auth.setDeviceId(null)
    player.playbackError = null
    music.clearTrack()
  }

  return { initPlayer, playTrack, playLocal, playPreviewUrl, togglePlay, seek, skipToNext, syncVolume, destroy }
}
