// ========================================
// PlayOff - Spotify Web Playback SDK
// Controla reprodução de músicas do Spotify
// ========================================

import { ref, onMounted, onUnmounted } from 'vue'

export function useSpotifyPlayer() {
  const player = ref(null)
  const deviceId = ref(null)
  const isReady = ref(false)
  const isConnecting = ref(false)
  const currentTrack = ref(null)
  const isPaused = ref(true)
  const position = ref(0)
  const duration = ref(0)
  const volume = ref(0.7)
  const error = ref(null)
  const trackEndedCallback = ref(null) // Callback para notificar fim da música

  let progressInterval = null
  let previousState = null // Para detecção de mudanças de estado

  // Inicializa o Spotify Web Playback SDK
  const initializePlayer = (accessToken, onTrackEnded) => {
    if (onTrackEnded) trackEndedCallback.value = onTrackEnded
    
    if (!accessToken) {
      console.warn('⚠️ Access token não fornecido')
      return
    }

    if (!window.Spotify) {
      console.warn('⚠️ Spotify SDK não carregado, aguardando...')
      
      // Espera o SDK carregar
      window.onSpotifyWebPlaybackSDKReady = () => {
        createPlayer(accessToken)
      }
      return
    }

    createPlayer(accessToken)
  }

  // Cria instância do player
  const createPlayer = (accessToken) => {
    if (player.value) {
      console.log('🎵 Player já existe, reconectando...')
      player.value.disconnect()
    }

    isConnecting.value = true
    error.value = null

    console.log('🎵 Criando Spotify Web Player...')

    player.value = new window.Spotify.Player({
      name: '🎵 PlayOff Web Player',
      getOAuthToken: cb => { cb(accessToken) },
      volume: volume.value
    })

    // Event Listeners

    // Player pronto
    player.value.addListener('ready', ({ device_id }) => {
      console.log('✅ Spotify Player pronto! Device ID:', device_id)
      deviceId.value = device_id
      isReady.value = true
      isConnecting.value = false
    })

    // Player não pronto
    player.value.addListener('not_ready', ({ device_id }) => {
      console.log('⚠️ Device offline:', device_id)
      isReady.value = false
    })

    // Erros
    player.value.addListener('initialization_error', ({ message }) => {
      console.error('❌ Erro de inicialização:', message)
      error.value = `Erro de inicialização: ${message}`
      isConnecting.value = false
    })

    player.value.addListener('authentication_error', ({ message }) => {
      console.error('❌ Erro de autenticação:', message)
      error.value = `Erro de autenticação: ${message}`
      isConnecting.value = false
    })

    player.value.addListener('account_error', ({ message }) => {
      console.error('❌ Erro de conta (precisa Spotify Premium):', message)
      error.value = 'Spotify Premium necessário para reprodução'
      isConnecting.value = false
    })

    player.value.addListener('playback_error', ({ message }) => {
      console.error('❌ Erro de playback:', message)
      error.value = `Erro de playback: ${message}`
    })

    // Estado da reprodução alterado
    player.value.addListener('player_state_changed', (state) => {
      if (!state) {
        currentTrack.value = null
        return
      }

      // Detecção de fim de música (heurística para Spotify SDK)
      // Se estava tocando (previousState.paused === false)
      // E agora pausou (state.paused === true)
      // E posição resetou para 0 (state.position === 0)
      // E não é buffering (state.loading === false - não exposto mas inferido)
      if (previousState && !previousState.paused && state.paused && state.position === 0) {
         console.log('🏁 Spotify Track Ended Detected')
         if (trackEndedCallback.value) trackEndedCallback.value()
      }

      previousState = state

      // Atualiza informações da track atual
      const track = state.track_window.current_track
      currentTrack.value = {
        id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        albumCover: track.album.images[0]?.url,
        uri: track.uri
      }

      isPaused.value = state.paused
      position.value = state.position
      duration.value = state.duration

      // Atualiza progresso se estiver tocando
      if (!state.paused && !progressInterval) {
        startProgressInterval()
      } else if (state.paused && progressInterval) {
        stopProgressInterval()
      }
    })

    // Conecta o player
    player.value.connect().then(success => {
      if (success) {
        console.log('✅ Conectado ao Spotify Web Playback!')
      } else {
        console.error('❌ Falha ao conectar')
        error.value = 'Falha ao conectar ao Spotify'
        isConnecting.value = false
      }
    })
  }

  // Inicia intervalo de atualização de progresso
  const startProgressInterval = () => {
    stopProgressInterval()
    progressInterval = setInterval(() => {
      if (!isPaused.value) {
        position.value += 1000
      }
    }, 1000)
  }

  // Para intervalo de progresso
  const stopProgressInterval = () => {
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }
  }

  // Toca uma música específica
  const playTrack = async (spotifyUri) => {
    if (!deviceId.value) {
      console.warn('⚠️ Device não está pronto')
      error.value = 'Player não está pronto'
      return false
    }

    const accessToken = localStorage.getItem('spotify_access_token')
    if (!accessToken) {
      error.value = 'Não autenticado'
      return false
    }

    try {
      console.log('▶️ Tocando:', spotifyUri)

      const response = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${deviceId.value}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ uris: [spotifyUri] })
        }
      )

      if (response.status === 204 || response.ok) {
        console.log('✅ Reprodução iniciada')
        return true
      }

      // Erro específico
      const errorData = await response.json().catch(() => null)
      const errorMessage = errorData?.error?.message || 'Erro desconhecido'
      
      // Tratamento específico para "no list was loaded" ou device not active
      if (errorMessage.includes('no list was loaded') || errorMessage.includes('Device not found')) {
         console.warn('⚠️ Tentando ativar device e retry...', errorMessage)
         // Tenta transferir playback para cá primeiro
         await transferPlayback()
         // Retry após curto delay
         return new Promise(resolve => {
           setTimeout(async () => {
              try {
                const retryResponse = await fetch(
                  `https://api.spotify.com/v1/me/player/play?device_id=${deviceId.value}`,
                  {
                    method: 'PUT',
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ uris: [spotifyUri] })
                  }
                )
                resolve(retryResponse.status === 204 || retryResponse.ok)
              } catch (e) {
                resolve(false)
              }
           }, 500)
         })
      }

      throw new Error(errorMessage)
    } catch (err) {
      console.error('❌ Erro ao tocar:', err)
      error.value = err.message
      return false
    }
  }

  // Play/Pause toggle
  const togglePlay = async () => {
    if (!player.value) return false

    try {
      await player.value.togglePlay()
      return true
    } catch (err) {
      console.error('❌ Erro ao toggle play:', err)
      return false
    }
  }

  // Pausa
  const pause = async () => {
    if (!player.value) return false

    try {
      await player.value.pause()
      return true
    } catch (err) {
      console.error('❌ Erro ao pausar:', err)
      return false
    }
  }

  // Resume
  const resume = async () => {
    if (!player.value) return false

    try {
      await player.value.resume()
      return true
    } catch (err) {
      console.error('❌ Erro ao resumir:', err)
      return false
    }
  }

  // Próxima música
  const nextTrack = async () => {
    if (!player.value) return false

    try {
      await player.value.nextTrack()
      return true
    } catch (err) {
      console.error('❌ Erro ao pular:', err)
      return false
    }
  }

  // Música anterior
  const previousTrack = async () => {
    if (!player.value) return false

    try {
      await player.value.previousTrack()
      return true
    } catch (err) {
      console.error('❌ Erro ao voltar:', err)
      return false
    }
  }

  // Seek (pular para posição)
  const seek = async (positionMs) => {
    if (!player.value) return false

    try {
      await player.value.seek(positionMs)
      position.value = positionMs
      return true
    } catch (err) {
      console.error('❌ Erro ao seek:', err)
      return false
    }
  }

  // Ajusta volume
  const setVolume = async (volumePercent) => {
    if (!player.value) return false

    try {
      volume.value = volumePercent
      await player.value.setVolume(volumePercent)
      return true
    } catch (err) {
      console.error('❌ Erro ao ajustar volume:', err)
      return false
    }
  }

  // Desconecta o player
  const disconnect = () => {
    stopProgressInterval()
    
    if (player.value) {
      player.value.disconnect()
      player.value = null
    }

    deviceId.value = null
    isReady.value = false
    currentTrack.value = null
    console.log('👋 Spotify Player desconectado')
  }

  // Busca dispositivos disponíveis
  const getDevices = async () => {
    const accessToken = localStorage.getItem('spotify_access_token')
    if (!accessToken) return []

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })

      if (response.ok) {
        const data = await response.json()
        return data.devices || []
      }

      return []
    } catch (err) {
      console.error('❌ Erro ao buscar dispositivos:', err)
      return []
    }
  }

  // Transfere reprodução para este dispositivo
  const transferPlayback = async () => {
    if (!deviceId.value) return false

    const accessToken = localStorage.getItem('spotify_access_token')
    if (!accessToken) return false

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [deviceId.value],
          play: false
        })
      })

      return response.status === 204 || response.ok
    } catch (err) {
      console.error('❌ Erro ao transferir playback:', err)
      return false
    }
  }

  // Busca o estado atual de reprodução (sync com outros dispositivos)
  const getCurrentState = async (token = null) => {
    const accessToken = token || localStorage.getItem('spotify_access_token')
    if (!accessToken) return null

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })

      if (response.status === 204) {
        return null // Nada tocando
      }

      if (response.status === 401) {
        // Token expirado ou inválido
        return { error: 401 }
      }

      if (response.ok) {
        return await response.json()
      }

      return null
    } catch (err) {
      console.error('❌ Erro ao buscar estado atual:', err)
      return null
    }
  }

  // Cleanup ao desmontar
  onUnmounted(() => {
    disconnect()
  })

  return {
    player,
    deviceId,
    isReady,
    isConnecting,
    currentTrack,
    isPaused,
    position,
    duration,
    volume,
    error,
    initializePlayer,
    playTrack,
    togglePlay,
    pause,
    resume,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
    disconnect,
    getDevices,
    transferPlayback,
    getCurrentState
  }
}
