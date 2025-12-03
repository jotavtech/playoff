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
  const isBuffering = ref(false)
  const pendingTrack = ref(null) // Track being loaded but not yet reported by SDK
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
      
      // Se tínhamos um track pendente (update otimista) e agora a música mudou no SDK
      // Podemos limpar o pendente
      if (pendingTrack.value) {
          // Verifica se a track do state é a que esperávamos
          if (state.track_window?.current_track?.id === pendingTrack.value.id) {
              pendingTrack.value = null
              isBuffering.value = false
          }
      }
      
      // Detecta buffering (paused mas com loading implícito ou transição)
      // O SDK não expõe 'loading' diretamente no state object padrão, mas podemos inferir
      // Se pausado e posição é 0 e track mudou, geralmente é loading

      // Detecção de fim de música (heurística para Spotify SDK)
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
  // Aceita URI string ou objeto de track completo para update otimista
  const playTrack = async (trackOrUri) => {
    const spotifyUri = typeof trackOrUri === 'string' ? trackOrUri : trackOrUri.spotifyUrl || trackOrUri.uri
    const trackData = typeof trackOrUri === 'object' ? trackOrUri : null

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
      console.log('🔍 Garantindo dispositivo ativo antes de tocar...')
      
      // Define estado de buffering para evitar conflitos de UI
      isBuffering.value = true
      
      // Se temos dados da track, fazemos update otimista IMEDIATO
      if (trackData) {
          console.log('⚡ Update Otimista: Atualizando UI imediatamente...')
          
          // Normaliza dados da track
          const optimisticTrack = {
            id: trackData.id,
            name: trackData.title || trackData.name,
            artist: trackData.artist,
            album: trackData.album || trackData.albumName,
            albumCover: trackData.albumCover,
            uri: spotifyUri,
            duration_ms: trackData.duration_ms || trackData.duration || 0
          }
          
          currentTrack.value = optimisticTrack
          pendingTrack.value = optimisticTrack
          position.value = 0
          duration.value = optimisticTrack.duration_ms
          isPaused.value = false // Assumimos que vai tocar
      }

      // PRIORIDADE ABSOLUTA: Web Player do PlayOff (som sai no navegador, não no celular)
      
      // Aguarda Web Player ficar pronto (até 5 segundos)
      if (!isReady.value || !deviceId.value) {
        console.log('⏳ Aguardando Web Player do navegador ficar pronto...')
        
        let waitAttempts = 0
        while ((!isReady.value || !deviceId.value) && waitAttempts < 50) {
          await new Promise(r => setTimeout(r, 100))
          waitAttempts++
        }
      }
      
      if (!isReady.value || !deviceId.value) {
        console.error('❌ Web Player não está pronto')
        error.value = 'Player do navegador não conectou. Recarregue a página.'
        isBuffering.value = false
        return false
      }
      
      console.log('🎧 Web Player pronto! Transferindo playback para o navegador...')
      
      // FORÇA transferência para o Web Player (tira do celular/desktop)
      await transferPlayback(false)
      await new Promise(r => setTimeout(r, 500))
      
      const targetDeviceId = deviceId.value
      console.log(`🎯 Device alvo (Web Player): ${targetDeviceId}`)

      const apiUrl = `https://api.spotify.com/v1/me/player/play?device_id=${targetDeviceId}`
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
        
        // IMPORTANTE: Resetar posição imediatamente ao iniciar nova música
        position.value = 0
        isPaused.value = false
        console.log('⏱️ Posição resetada para 0ms')
        
        // Se tínhamos dados otimistas, reforçamos
        if (pendingTrack.value) {
           duration.value = pendingTrack.value.duration_ms
        }
        
        // Agenda sync remoto para confirmar estado em breve
        setTimeout(() => syncRemoteState(), 1000)
        
        error.value = null
        // Mantém buffering true por mais tempo para evitar conflitos com sync remoto
        setTimeout(() => { 
          isBuffering.value = false
          pendingTrack.value = null
        }, 3000)
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
      isBuffering.value = false

      if (errorStatus === 404 && (errorReason === 'NO_ACTIVE_DEVICE' || errorMessage.includes('No active device'))) {
        console.warn('⚠️ Spotify retornou NO_ACTIVE_DEVICE (404)')
        // Tenta reconectar o Web Player automaticamente
        if (player.value) {
          console.log('🔄 Tentando reconectar Web Player...')
          await player.value.connect()
          await new Promise(r => setTimeout(r, 1000))
          
          if (isReady.value && deviceId.value) {
            // Tenta tocar novamente
            console.log('🔄 Tentando tocar novamente após reconexão...')
            await transferPlayback()
            await new Promise(r => setTimeout(r, 500))
            
            const retryResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId.value}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ uris: [spotifyUri] })
            })
            
            if (retryResponse.status === 204 || retryResponse.ok) {
              console.log('✅ Reprodução iniciada após reconexão!')
              error.value = null
              setTimeout(() => { isBuffering.value = false; pendingTrack.value = null }, 3000)
              return true
            }
          }
        }
        
        error.value = 'Aguarde o player conectar e tente novamente.'
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
      isBuffering.value = false
      return false
    }
  }

  // Helper para chamadas de API com reconexão automática
  const callSpotifyApi = async (endpoint, method = 'POST', body = null, retryCount = 0) => {
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
      if (response.status === 404 && retryCount < 2) {
        console.warn(`⚠️ Dispositivo inativo, tentando reconectar... (tentativa ${retryCount + 1})`)
        
        // Tenta reconectar o player
        const reconnected = await ensureDeviceActive()
        
        if (reconnected) {
          // Espera um pouco e tenta novamente
          await new Promise(r => setTimeout(r, 500))
          return await callSpotifyApi(endpoint, method, body, retryCount + 1)
        }
      }
      
      if (response.status === 404) {
        const errorData = await response.json().catch(() => ({}))
        console.warn(`⚠️ Comando ${endpoint} falhou após tentativas:`, errorData)
        error.value = 'Dispositivo Spotify desconectado. Clique em alguma música para reconectar.'
        return false
      }
      
      return false
    } catch (err) {
      console.error(`❌ Erro na API Spotify (${endpoint}):`, err)
      return false
    }
  }
  
  // Garante que há um dispositivo ativo
  const ensureDeviceActive = async () => {
    const accessToken = localStorage.getItem('spotify_access_token')
    if (!accessToken) return false
    
    try {
      // 1. Verifica se o Web Player está pronto
      if (isReady.value && deviceId.value) {
        console.log('🔌 Ativando Web Player como dispositivo...')
        const transferred = await transferPlayback()
        if (transferred) {
          console.log('✅ Web Player ativado!')
          return true
        }
      }
      
      // 2. Tenta reconectar o player se não estiver pronto
      if (!isReady.value && player.value) {
        console.log('🔄 Reconectando Web Player...')
        await player.value.connect()
        
        // Espera o player ficar pronto
        let attempts = 0
        while (!isReady.value && attempts < 30) {
          await new Promise(r => setTimeout(r, 100))
          attempts++
        }
        
        if (isReady.value && deviceId.value) {
          console.log('✅ Web Player reconectado!')
          await transferPlayback()
          return true
        }
      }
      
      // 3. Verifica se há outro dispositivo ativo
      const devices = await getDevices()
      const activeDevice = devices.find(d => d.is_active)
      
      if (activeDevice) {
        console.log(`✅ Dispositivo ativo encontrado: ${activeDevice.name}`)
        return true
      }
      
      // 4. Se tem dispositivo disponível, ativa o primeiro
      if (devices.length > 0) {
        const targetDevice = devices.find(d => d.id === deviceId.value) || devices[0]
        console.log(`🎯 Ativando dispositivo: ${targetDevice.name}`)
        
        const response = await fetch('https://api.spotify.com/v1/me/player', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            device_ids: [targetDevice.id],
            play: false
          })
        })
        
        if (response.status === 204 || response.ok) {
          await new Promise(r => setTimeout(r, 300))
          return true
        }
      }
      
      console.warn('❌ Nenhum dispositivo disponível para ativar')
      return false
    } catch (err) {
      console.error('❌ Erro ao garantir dispositivo ativo:', err)
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

  // Transfere reprodução para este dispositivo (Web Player do PlayOff)
  // Isso TIRA o som do celular/desktop e coloca no navegador
  const transferPlayback = async (startPlaying = false) => {
    if (!deviceId.value) {
      console.warn('⚠️ Não é possível transferir - deviceId não disponível')
      return false
    }

    const accessToken = localStorage.getItem('spotify_access_token')
    if (!accessToken) return false

    try {
      console.log(`🔄 Transferindo playback para Web Player (play: ${startPlaying})...`)
      
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [deviceId.value],
          play: startPlaying // Se true, começa a tocar imediatamente no navegador
        })
      })

      if (response.status === 204 || response.ok) {
        console.log('✅ Playback transferido para Web Player do PlayOff!')
        return true
      }
      
      console.warn('⚠️ Falha ao transferir playback:', response.status)
      return false
    } catch (err) {
      console.error('❌ Erro ao transferir playback:', err)
      return false
    }
  }

  // Sincroniza estado com API remota (para quando toca no celular)
  // IMPORTANTE: Só sincroniza se não houver transição em andamento
  const syncRemoteState = async () => {
    // Se estamos em buffering (transição de música), NÃO sincroniza para evitar conflitos
    if (isBuffering.value || pendingTrack.value) {
      console.log('⏳ Sync remoto ignorado - transição em andamento')
      return
    }
    
    const state = await getCurrentState()
    
    if (!state || !state.item) {
      return
    }

    // Se o dispositivo ativo for O NOSSO (Web Player), deixamos o SDK lidar via eventos
    if (deviceId.value && state.device && state.device.id === deviceId.value) {
      return
    }

    const track = state.item
    
    // Só atualiza se a música for DIFERENTE da atual (evita sobrescrever transições)
    if (currentTrack.value && currentTrack.value.id === track.id) {
      // Mesma música - só atualiza posição se diferença for significativa (>2s)
      const posDiff = Math.abs(position.value - state.progress_ms)
      if (posDiff > 2000) {
        position.value = state.progress_ms
        lastStateTime = Date.now()
      }
      isPaused.value = !state.is_playing
      return
    }

    // Música diferente detectada remotamente
    console.log(`🔄 Sync Remoto: ${track.name} em ${state.device?.name}`)

    currentTrack.value = {
      id: track.id,
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      albumCover: track.album.images[0]?.url,
      uri: track.uri,
      duration_ms: track.duration_ms
    }

    isPaused.value = !state.is_playing
    position.value = state.progress_ms
    duration.value = track.duration_ms
    lastStateTime = Date.now()
    
    previousState = {
      paused: !state.is_playing,
      position: state.progress_ms,
      duration: track.duration_ms
    }

    if (state.is_playing && !progressInterval) {
      startProgressInterval()
    } else if (!state.is_playing && progressInterval) {
      stopProgressInterval()
    }
  }

  // Inicia sincronização remota (polling) - intervalo maior para evitar sobrecarga
  const startRemoteSync = () => {
    if (remoteSyncInterval) clearInterval(remoteSyncInterval)
    
    console.log('📡 Iniciando sincronização remota com Spotify (Polling a cada 5s)...')
    // Executa após delay inicial para não conflitar com inicialização
    setTimeout(() => syncRemoteState(), 2000)
    
    // Polling a cada 5 segundos (reduzido para evitar instabilidade)
    remoteSyncInterval = setInterval(syncRemoteState, 5000)
  }

  // Para sincronização remota
  const stopRemoteSync = () => {
    if (remoteSyncInterval) {
      clearInterval(remoteSyncInterval)
      remoteSyncInterval = null
      console.log('🛑 Parando sincronização remota')
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
    isBuffering,
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
    ensureDeviceActive,
    getCurrentState,
    startRemoteSync,
    stopRemoteSync
  }
}
