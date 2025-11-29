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
  let remoteSyncInterval = null // Intervalo para polling remoto
  let previousState = null // Para detecção de mudanças de estado
  let lastStateTime = 0 // Timestamp de quando recebemos o estado do Spotify

  // Inicializa o Spotify Web Playback SDK
  const initializePlayer = (onTrackEnded) => {
    if (onTrackEnded) trackEndedCallback.value = onTrackEnded
    
    console.log('🚀 Iniciando setup do Spotify Player...')
    
    // Inicia sincronização remota imediatamente se já tiver token
    if (localStorage.getItem('spotify_access_token')) {
      startRemoteSync()
    }

    // Função auxiliar para tentar criar o player
    const tryCreatePlayer = () => {
      if (window.Spotify) {
        createPlayer()
        return true
      }
      return false
    }

    // Função auxiliar para injetar o script do SDK
    const injectSdkScript = () => {
      if (document.getElementById('spotify-player-script')) {
        // Se já existe, mas callback não foi chamado, tenta chamar
        if (window.Spotify) {
          window.onSpotifyWebPlaybackSDKReady()
        }
        return
      }

      const script = document.createElement('script')
      script.id = 'spotify-player-script'
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.async = true
      document.body.appendChild(script)
      console.log('📦 Injetando script do Spotify SDK...')
    }

    // Tenta criar imediatamente se SDK já carregou
    if (tryCreatePlayer()) {
      return
    }

    console.log('⏳ Aguardando Spotify SDK carregar...')

    // Configura callback para quando o SDK carregar
    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log('📦 Spotify SDK carregou via callback!')
      tryCreatePlayer()
    }

    // Injeta o script agora que o callback está pronto
    injectSdkScript()

    // Fallback: polling caso o callback já tenha sido chamado antes
    let attempts = 0
    const maxAttempts = 50 // 5 segundos
    const pollInterval = setInterval(() => {
      attempts++
      if (tryCreatePlayer()) {
        clearInterval(pollInterval)
        console.log(`✅ Spotify SDK encontrado após ${attempts * 100}ms`)
      } else if (attempts >= maxAttempts) {
        clearInterval(pollInterval)
        console.error('❌ Timeout aguardando Spotify SDK')
        error.value = 'Spotify SDK não carregou. Recarregue a página.'
      }
    }, 100)
  }

  // Cria instância do player
  const createPlayer = () => {
    if (player.value) {
      console.log('🎵 Player já existe, reconectando...')
      player.value.disconnect()
    }

    isConnecting.value = true
    error.value = null

    console.log('🎵 Criando Spotify Web Player...')

    player.value = new window.Spotify.Player({
      name: 'PlayOff Music Player 🎵',
      getOAuthToken: cb => { 
        // Sempre pega o token mais recente do localStorage
        const token = localStorage.getItem('spotify_access_token')
        if (token) {
          console.log('🔐 Spotify pediu token: fornecendo token atual')
          cb(token)
        } else {
          console.error('❌ Spotify pediu token mas não há token no storage')
          cb('')
        }
      },
      volume: volume.value
    })

    // Event Listeners

    // Player pronto
    player.value.addListener('ready', ({ device_id }) => {
      console.log('✅ Spotify Player pronto! Device ID:', device_id)
      deviceId.value = device_id
      isReady.value = true
      isConnecting.value = false
      // Tenta transferir o playback automaticamente assim que estiver pronto
      transferPlayback()
    })

    // Player não pronto
    player.value.addListener('not_ready', ({ device_id }) => {
      console.log('⚠️ Device offline:', device_id)
      isReady.value = false
      isConnecting.value = true // Tenta reconectar
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
      console.error('❌ Erro de conta:', message)
      if (message.includes('Premium')) {
         error.value = 'Spotify Premium necessário para reprodução'
      } else {
         // Tenta reconectar se for outro erro de conta
         console.log('🔄 Tentando reconectar após erro de conta...')
         setTimeout(() => player.value.connect(), 1000)
      }
      isConnecting.value = false
    })

    player.value.addListener('playback_error', ({ message }) => {
      console.error('❌ Erro de playback:', message)
      // Não define erro global para não travar UI
      console.log('🔄 Tentando recuperar de erro de playback...')
    })

    // Estado da reprodução alterado
    player.value.addListener('player_state_changed', (state) => {
      if (!state) {
        currentTrack.value = null
        return
      }

      // Marca o tempo exato que recebemos este estado
      lastStateTime = Date.now()

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
    // Atualiza a cada 100ms para fluidez visual (letras/barra)
    // Mas calcula baseado no tempo real (delta) para precisão
    progressInterval = setInterval(() => {
      if (!isPaused.value && lastStateTime > 0) {
        // Posição estimada = Posição relatada pelo SDK + Tempo decorrido desde o relato
        // Limitado pela duração total para não passar do fim
        const elapsed = Date.now() - lastStateTime
        if (previousState) {
           const estimated = previousState.position + elapsed
           position.value = Math.min(estimated, duration.value)
        }
      }
    }, 100)
  }

  // Para intervalo de progresso
  const stopProgressInterval = () => {
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }
  }

  // Toca uma música específica (track Spotify)
  const playTrack = async (spotifyUri) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎵 useSpotifyPlayer.playTrack() CHAMADO')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`   URI: ${spotifyUri}`)
    console.log(`   Device ID local (Web Playback): ${deviceId.value || '❌ NENHUM'}`)

    const accessToken = localStorage.getItem('spotify_access_token')
    console.log(`   Token: ${accessToken ? `${accessToken.substring(0, 20)}... (OK)` : '❌ AUSENTE'}`)

    if (!accessToken) {
      console.error('❌ ERRO: Token de acesso não encontrado!')
      error.value = 'Não autenticado'
      return false
    }

    try {
      console.log('')
      console.log('🔍 Buscando dispositivos Spotify disponíveis...')
      const devices = await getDevices()
      console.log(`   Devices encontrados: ${devices.length}`)
      devices.forEach(d => {
        console.log(`   - ${d.name} | id=${d.id} | active=${d.is_active} | type=${d.type}`)
      })

      if (!devices || devices.length === 0) {
        console.error('❌ Nenhum dispositivo Spotify disponível para este usuário.')
        error.value = 'Nenhum dispositivo Spotify ativo. Abra o Spotify no celular/desktop ou Web Player e tente novamente.'
        return false
      }

      // Prioridade de escolha do device alvo:
      // 1) Dispositivo atualmente ativo no Spotify (celular/desktop/etc)
      // 2) Web Playback SDK deste app, se estiver presente na lista
      // 3) Primeiro device da lista (fallback)
      let targetDevice = devices.find(d => d.is_active) || null

      if (!targetDevice && deviceId.value) {
        const webDevice = devices.find(d => d.id === deviceId.value)
        if (webDevice) {
          console.log('🎧 Nenhum device ativo, mas Web Playback está disponível na lista. Tentando ativá-lo...')
          await transferPlayback()
          // Pequeno delay para o Spotify propagar mudança de device ativo
          await new Promise(r => setTimeout(r, 500))
          targetDevice = webDevice
        }
      }

      if (!targetDevice) {
        targetDevice = devices[0]
        console.log(`🎯 Usando primeiro device da lista como alvo: ${targetDevice.name} (${targetDevice.id})`)
      } else {
        console.log(`🎯 Device alvo escolhido: ${targetDevice.name} (${targetDevice.id})`)        
      }

      const apiUrl = `https://api.spotify.com/v1/me/player/play?device_id=${targetDevice.id}`
      console.log('')
      console.log('📡 CHAMANDO API DO SPOTIFY:')
      console.log(`   URL: ${apiUrl}`)
      console.log(`   Method: PUT`)
      console.log(`   Body: { uris: ["${spotifyUri}"] }`)

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: [spotifyUri] })
      })

      console.log('')
      console.log('📥 RESPOSTA DA API:')
      console.log(`   Status: ${response.status} ${response.statusText}`)
      console.log(`   OK: ${response.ok}`)

      if (response.status === 204 || response.ok) {
        console.log('✅✅✅ API RETORNOU SUCESSO! ✅✅✅')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        error.value = null
        return true
      }

      console.log('')
      console.log('❌ API RETORNOU ERRO!')
      const errorData = await response.json().catch(() => null)
      console.log('   Dados do erro:', JSON.stringify(errorData, null, 2))

      const errorMessage = errorData?.error?.message || 'Erro desconhecido'
      const errorReason = errorData?.error?.reason || 'unknown'
      const errorStatus = errorData?.error?.status || response.status

      console.log(`   Mensagem: ${errorMessage}`)
      console.log(`   Razão: ${errorReason}`)
      console.log(`   Status: ${errorStatus}`)

      // Atualiza erro global para que o frontend saiba que o player falhou
      error.value = errorMessage

      if (errorStatus === 404 && (errorReason === 'NO_ACTIVE_DEVICE' || errorMessage.includes('No active device'))) {
        console.warn('⚠️ Spotify retornou NO_ACTIVE_DEVICE (404)')
        console.warn('   Nenhum dispositivo ativo para receber o comando de play.')
        error.value = 'Nenhum dispositivo Spotify ativo. Abra o Spotify no celular/desktop, dê play em qualquer música e tente novamente.'
        return false
      }

      throw new Error(errorMessage)
    } catch (err) {
      console.error('')
      console.error('❌❌❌ EXCEÇÃO AO TOCAR MÚSICA ❌❌❌')
      console.error(`   Erro: ${err.message}`)
      console.error(`   Stack: ${err.stack}`)
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      error.value = err.message
      return false
    }
  }

  // Helper para chamadas de API
  const callSpotifyApi = async (endpoint, method = 'POST', body = null) => {
    const accessToken = localStorage.getItem('spotify_access_token')
    if (!accessToken) return false

    try {
      const options = {
        method,
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
      if (body) {
        options.headers['Content-Type'] = 'application/json'
        options.body = JSON.stringify(body)
      }

      const response = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, options)

      if (response.status === 204 || response.ok) return true
      
      // Tratamento específico para 404 (No Active Device)
      if (response.status === 404) {
        // Verifica se é realmente erro de device ou apenas rota não encontrada (improvável na API oficial)
        const errorData = await response.json().catch(() => ({}))
        console.warn(`⚠️ Comando ${endpoint} falhou:`, errorData)
        
        if (endpoint === '' && method === 'PUT') {
           // Transfer playback falhou
           console.warn('⚠️ Falha ao transferir playback - provável device inativo ou ID inválido')
        } else {
           console.warn(`⚠️ Comando ${endpoint} falhou: Nenhum dispositivo ativo`)
           error.value = 'Nenhum dispositivo Spotify ativo. Dê play no celular/desktop primeiro.'
        }
        return false
      }
      
      return false
    } catch (err) {
      console.error(`❌ Erro na API Spotify (${endpoint}):`, err)
      return false
    }
  }

  // Play/Pause toggle via API (funciona remoto)
  const togglePlay = async () => {
    if (isPaused.value) {
      return await callSpotifyApi('play', 'PUT')
    } else {
      return await callSpotifyApi('pause', 'PUT')
    }
  }

  // Pausa via API
  const pause = async () => {
    return await callSpotifyApi('pause', 'PUT')
  }

  // Resume via API
  const resume = async () => {
    return await callSpotifyApi('play', 'PUT')
  }

  // Próxima música via API
  const nextTrack = async () => {
    return await callSpotifyApi('next', 'POST')
  }

  // Música anterior via API
  const previousTrack = async () => {
    return await callSpotifyApi('previous', 'POST')
  }
  
  // Seek via API
  const seek = async (position_ms) => {
    return await callSpotifyApi(`seek?position_ms=${Math.floor(position_ms)}`, 'PUT')
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

  // Sincroniza estado com API remota (para quando toca no celular)
  const syncRemoteState = async () => {
    const state = await getCurrentState()
    
    if (!state || !state.item) {
      // Se não tem nada tocando remotamente e não estamos tocando localmente
      // Poderíamos limpar, mas melhor manter a última música visível
      return
    }

    // Se o dispositivo ativo for O NOSSO (Web Player), deixamos o SDK lidar via eventos
    // para evitar conflitos e loops de atualização
    if (deviceId.value && state.device && state.device.id === deviceId.value) {
      return
    }

    // Atualiza estado baseado no remoto
    const track = state.item
    
    // Verifica se a música mudou para logar
    if (!currentTrack.value || currentTrack.value.id !== track.id) {
      console.log(`🔄 Sync Remoto: Detectada nova música tocando em ${state.device?.name}: ${track.name}`)
    }

    currentTrack.value = {
      id: track.id,
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      albumCover: track.album.images[0]?.url,
      uri: track.uri,
      duration_ms: track.duration_ms // Importante para letras/progresso
    }

    isPaused.value = !state.is_playing
    position.value = state.progress_ms
    duration.value = track.duration_ms
    lastStateTime = Date.now()
    
    // Precisamos simular o previousState do SDK para o progressInterval funcionar
    previousState = {
      paused: !state.is_playing,
      position: state.progress_ms,
      duration: track.duration_ms
    }

    // Gerencia o intervalo de progresso visual
    if (state.is_playing && !progressInterval) {
      startProgressInterval()
    } else if (!state.is_playing && progressInterval) {
      stopProgressInterval()
    }
  }

  // Inicia sincronização remota (polling)
  const startRemoteSync = () => {
    if (remoteSyncInterval) clearInterval(remoteSyncInterval)
    
    console.log('📡 Iniciando sincronização remota com Spotify (Polling a cada 2s)...')
    // Executa imediatamente
    syncRemoteState()
    
    // E depois a cada 2 segundos (tempo real o suficiente sem explodir rate limit)
    remoteSyncInterval = setInterval(syncRemoteState, 2000)
  }

  // Para sincronização remota
  const stopRemoteSync = () => {
    if (remoteSyncInterval) {
      clearInterval(remoteSyncInterval)
      remoteSyncInterval = null
      console.log('bs Parando sincronização remota')
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
    stopRemoteSync()
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
    getCurrentState,
    startRemoteSync,
    stopRemoteSync
  }
}
