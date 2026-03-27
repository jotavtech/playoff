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
  let previousState = null // Para detecção de mudanças de estado
  let lastStateTime = 0 // Timestamp de quando recebemos o estado do Spotify
  let lastPlayCommand = null // Track do último comando de play para evitar duplicatas
  let lastPlayTime = 0 // Timestamp do último play para debounce

  // Inicializa o Spotify Web Playback SDK
  const initializePlayer = (onTrackEnded) => {
    if (onTrackEnded) trackEndedCallback.value = onTrackEnded
    
    console.log('🚀 Iniciando setup do Spotify Player...')

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
      getOAuthToken: async cb => { 
        // Fix #5: Proactive token refresh — verifica expiração antes de retornar
        let token = localStorage.getItem('spotify_access_token')
        const tokenExpiry = localStorage.getItem('spotify_token_expiry')
        
        // Se o token expira em menos de 5 minutos, tenta renovar proativamente
        if (tokenExpiry && Date.now() > (parseInt(tokenExpiry, 10) - 300000)) {
          console.log('🔄 Token próximo de expirar, renovando proativamente...')
          try {
            const response = await fetch('/auth/spotify/refresh', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('spotify_id')}`,
                'X-Spotify-Token': token || ''
              }
            })
            if (response.ok) {
              const data = await response.json()
              if (data.access_token) {
                token = data.access_token
                localStorage.setItem('spotify_access_token', token)
                if (data.expires_in) {
                  localStorage.setItem('spotify_token_expiry', String(Date.now() + data.expires_in * 1000))
                }
                console.log('✅ Token renovado proativamente com sucesso')
              }
            }
          } catch (e) {
            console.warn('⚠️ Falha no refresh proativo, usando token atual:', e.message)
          }
        }
        
        if (token) {
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
    // Fix #2: Marca isReady IMEDIATAMENTE — o SDK já garante que o device existe
    // A confirmação do device no servidor roda em background sem bloquear
    player.value.addListener('ready', ({ device_id }) => {
      console.log('✅ SPOTIFY PLAYER READY! Device ID:', device_id)
      
      deviceId.value = device_id
      isConnecting.value = false
      isReady.value = true
      
      // Confirmação de device e transferência rodam em background (não bloqueiam)
      const confirmDeviceInBackground = async () => {
        try {
          // Tenta transferir o playback automaticamente
          const transferred = await transferPlayback()
          console.log(`📡 Transferência de playback: ${transferred ? 'OK' : 'Falhou (normal se não há música tocando)'}`)
          
          // Confirma device na API em background (até 3 tentativas rápidas)
          for (let i = 1; i <= 3; i++) {
            await new Promise(r => setTimeout(r, 1000))
            const devices = await getDevices()
            const ourDevice = devices.find(d => d.id === device_id)
            if (ourDevice) {
              console.log(`✅ Device confirmado em background: ${ourDevice.name}`)
              return
            }
          }
          console.warn('⚠️ Device não confirmado na API após 3s (player continua funcional)')
        } catch (e) {
          console.warn('⚠️ Erro na confirmação em background:', e.message)
        }
      }
      confirmDeviceInBackground()
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

      // Detecção de fim de música (heurística melhorada para Spotify SDK)
      // Verifica se: estava tocando -> parou -> posição próxima ao fim OU zero (loop)
      if (previousState && !previousState.paused && state.paused) {
        const nearEnd = state.position >= (state.duration - 1000) // Dentro de 1 segundo do fim
        const atStart = state.position === 0

        if (nearEnd || atStart) {
          console.log('🏁 Spotify Track Ended Detected')
          console.log(`   Posição final: ${Math.floor(state.position / 1000)}s / ${Math.floor(state.duration / 1000)}s`)
          if (trackEndedCallback.value) {
            trackEndedCallback.value()
          }
        }
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
        console.log('✅ Conectado ao Spotify Web Playback! Aguardando evento ready...')
      } else {
        console.error('❌ Falha ao conectar ao Spotify')
        error.value = 'Falha ao conectar ao Spotify. Verifique sua conexão.'
        isConnecting.value = false
      }
    }).catch(err => {
      console.error('❌ Erro ao conectar:', err)
      error.value = 'Erro ao conectar ao Spotify'
      isConnecting.value = false
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
    let spotifyUri = typeof trackOrUri === 'string' ? trackOrUri : trackOrUri.spotifyUrl || trackOrUri.uri
    const trackData = typeof trackOrUri === 'object' ? trackOrUri : null
    
    // Converte URL do Spotify para URI se necessário
    // https://open.spotify.com/track/ID -> spotify:track:ID
    if (spotifyUri && spotifyUri.includes('open.spotify.com/track/')) {
      const trackId = spotifyUri.split('/track/')[1]?.split('?')[0]
      if (trackId) {
        spotifyUri = `spotify:track:${trackId}`
        console.log(`🔄 Convertido URL para URI: ${spotifyUri}`)
      }
    }

    // DEBOUNCE: Evita múltiplas chamadas para a mesma música em curto período
    const now = Date.now()
    if (lastPlayCommand === spotifyUri && (now - lastPlayTime) < 2000) {
      console.log('⏸️ DEBOUNCE: Ignorando comando de play duplicado')
      console.log(`   Última chamada: ${now - lastPlayTime}ms atrás`)
      console.log(`   URI: ${spotifyUri}`)
      return false
    }

    lastPlayCommand = spotifyUri
    lastPlayTime = now

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
      
      // Fix #2: Aguarda Web Player ficar pronto (até 2 segundos — reduzido de 5s)
      if (!isReady.value || !deviceId.value) {
        console.log('⏳ Aguardando Web Player do navegador ficar pronto...')
        
        let waitAttempts = 0
        while ((!isReady.value || !deviceId.value) && waitAttempts < 20) {
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
      
      console.log('🎧 Web Player pronto! Preparando para tocar...')
      
      const targetDeviceId = deviceId.value
      console.log(`🎯 Device alvo (Web Player): ${targetDeviceId}`)

      // Fix #2: Verifica device com retries rápidos (max 3s em vez de 15s)
      const PLAYER_NAME = 'PlayOff Music Player 🎵'
      let devices = await getDevices()
      let ourDevice = devices.find(d => d.id === targetDeviceId) || devices.find(d => d.name === PLAYER_NAME)
      
      // Se device não encontrado, retries rápidos (3x, 1s cada = max 3s)
      if (!ourDevice) {
        console.log('⏳ Device não encontrado, retries rápidos...')
        for (let attempt = 1; attempt <= 3; attempt++) {
          await new Promise(r => setTimeout(r, 1000))
          devices = await getDevices()
          ourDevice = devices.find(d => d.id === targetDeviceId) || devices.find(d => d.name === PLAYER_NAME)
          if (ourDevice) break
        }
      }
      
      if (!ourDevice) {
        console.error('❌ Device não registrado no Spotify')
        error.value = 'Spotify Premium necessário para reprodução completa'
        isBuffering.value = false
        return false
      }
      
      // Se achou por nome mas com ID diferente, atualiza o deviceId
      if (ourDevice.id !== targetDeviceId) {
        console.log(`🔄 Device ID atualizado: ${targetDeviceId} → ${ourDevice.id}`)
        deviceId.value = ourDevice.id
      }
      
      console.log(`✅ Device confirmado: ${ourDevice.name} (${ourDevice.type})`)

      // Função helper para tentar tocar (usa deviceId.value que pode ter sido atualizado)
      const tryPlay = async () => {
        const activeDeviceId = deviceId.value
        const apiUrl = `https://api.spotify.com/v1/me/player/play?device_id=${activeDeviceId}`
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

        return response
      }

      // Tenta tocar
      let response = await tryPlay()
      
      // Se ainda falhar com 404, tenta transferir playback e tocar novamente
      if (response.status === 404) {
        console.log('⚠️ Erro 404 mesmo com device confirmado, tentando transferir playback...')
        await transferPlayback(false)
        await new Promise(r => setTimeout(r, 1000))
        response = await tryPlay()
      }

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
        
        error.value = null
        // Limpa buffering após delay inteligente (1s + tempo que já passou desde o comando)
        const bufferingDelay = Math.max(500, 1000 - (Date.now() - now))
        setTimeout(() => {
          if (isBuffering.value) {
            console.log('✅ Buffering finalizado após delay')
            isBuffering.value = false
            pendingTrack.value = null
          }
        }, bufferingDelay)
        return true
      }

      console.log('')
      console.log('❌ API RETORNOU ERRO APÓS RETRIES!')
      
      // Tenta ler o erro (pode já ter sido consumido nos retries)
      let errorData = null
      try {
        errorData = await response.json()
      } catch {
        errorData = { error: { message: 'Device not found', status: 404 } }
      }
      
      console.log('   Dados do erro:', JSON.stringify(errorData, null, 2))

      const errorMessage = errorData?.error?.message || 'Erro desconhecido'
      const errorStatus = errorData?.error?.status || response.status

      console.log(`   Mensagem: ${errorMessage}`)
      console.log(`   Status: ${errorStatus}`)

      // NÃO desconecta o player - apenas reporta o erro
      // O player continua conectado para próximas tentativas
      isBuffering.value = false
      
      // Se é erro de device, não marca como erro fatal
      if (errorStatus === 404 && errorMessage.includes('Device')) {
        console.log('⚠️ Device ainda não registrado - player continua conectado')
        error.value = 'Aguarde alguns segundos e tente novamente'
        return false
      }

      error.value = errorMessage
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
    if (!accessToken) {
      console.warn('⚠️ getDevices: Sem token de acesso')
      return []
    }

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })

      if (response.ok) {
        const data = await response.json()
        const devices = data.devices || []
        if (devices.length > 0) {
          console.log(`📱 Devices encontrados: ${devices.map(d => `${d.name} (${d.type}${d.is_active ? ', ATIVO' : ''})`).join(', ')}`)
        }
        return devices
      }
      
      if (response.status === 401) {
        console.error('❌ getDevices: Token expirado ou inválido')
      } else {
        console.warn(`⚠️ getDevices: Resposta ${response.status}`)
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

  // Não há mais polling - o SDK envia eventos diretamente
  // Mantemos apenas as funções de compatibilidade vazias
  const startRemoteSync = () => {
    console.log('📡 Usando apenas eventos do SDK - sem polling')
  }

  const stopRemoteSync = () => {
    console.log('📡 Sync via eventos do SDK')
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
