import { ref, reactive } from 'vue'

// Composable avançado para integração com APIs de música e reprodução de áudio
// Este composable é o coração do sistema de reprodução, integrando:
// - Cloudinary para streaming de áudio de alta qualidade  
// - Spotify API para metadados e capas de álbum em alta resolução
// - Last.fm como API de fallback para informações musicais
// - ColorThief para extração dinâmica de cores das capas
// - Sistema de temas dinâmicos baseado nas cores extraídas
// ============= ESTADO REATIVO DO PLAYER (SINGLETON) =============
// Movido para fora da função para garantir estado compartilhado entre componentes

const currentTrack = ref(null)         // Música sendo reproduzida atualmente
const isPlaying = ref(false)           // Estado de reprodução (true/false)
const position = ref(0)                // Posição atual em millisegundos
const duration = ref(0)                // Duração total em millisegundos
const playlist = ref([])               // Lista de reprodução
const queue = ref([])                  // Fila de prioridade
const audioPlayer = ref(null)          // Referência do elemento de áudio HTML5
const spotifyToken = ref(null)         // Token de autenticação Spotify
const spotifyTokenExpiry = ref(null)   // Timestamp de expiração do token
const currentSongsList = ref([])       // Lista atual de músicas para navegação
let colorThief = null                  // Instância do ColorThief

export function useCloudinaryAudio() {
  // ============= CONFIGURAÇÕES DAS APIS =============
  // Credenciais e endpoints para integração com serviços externos
  // Em produção, essas informações seriam armazenadas em variáveis de ambiente
  
  // Configuração Cloudinary - Plataforma de mídia para streaming de áudio
  const cloudName = 'dzwfuzxxw'
  const apiKey = '888348989441951'
  const apiSecret = 'SoIbMkMvEBoth_Xbt0I8Ew96JuY'
  
  // Configuração Last.fm - API de fallback para metadados musicais
  const lastFmApiKey = 'b25b959554ed76058ac220b7b2e0a026'
  const lastFmBaseUrl = 'https://ws.audioscrobbler.com/2.0/'
  
  // Configuração Spotify Web API - Fonte principal para metadados e capas
  const spotifyClientId = '1fd9e79e2e074a33b258c30747f74e6b'
  const spotifyClientSecret = '3bc40e26370c43818ec3612d25fcbf96'
  const spotifyBaseUrl = 'https://api.spotify.com/v1'
  
  // ============= INICIALIZAÇÃO DE BIBLIOTECAS EXTERNAS =============
  
  // Inicializo ColorThief para extração avançada de cores
  
  // ============= AUTENTICAÇÃO SPOTIFY =============
  
  // Sistema de autenticação OAuth com Spotify usando Client Credentials Flow
  // Este método permite acesso a dados públicos sem necessidade de login do usuário
  // Implemento cache de token e renovação automática para eficiência
  const authenticateSpotify = async () => {
    try {
      // Verifico se já tenho um token válido em cache
      if (spotifyToken.value && spotifyTokenExpiry.value > Date.now()) {
        console.log('✅ Token Spotify em cache ainda válido')
        return spotifyToken.value
      }
      
      console.log('🎵 Iniciando autenticação com Spotify API...')
      console.log('🔐 Usando Client Credentials Flow para acesso a dados públicos')
      
      // Codifico credenciais em Base64 conforme especificação OAuth
      const credentials = btoa(`${spotifyClientId}:${spotifyClientSecret}`)
      
      // Requisição de token seguindo padrão OAuth 2.0
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Falha na autenticação Spotify: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      
      // Armazeno token com margem de segurança para renovação
      spotifyToken.value = data.access_token
      spotifyTokenExpiry.value = Date.now() + (data.expires_in * 1000) - 60000 // 1 minuto de buffer
      
      console.log('✅ Spotify autenticado com sucesso!')
      console.log(`⏰ Token válido até: ${new Date(spotifyTokenExpiry.value).toLocaleTimeString()}`)
      console.log(`🔑 Tipo de acesso: ${data.token_type}`)
      
      return spotifyToken.value
      
    } catch (error) {
      console.error('❌ Erro crítico na autenticação Spotify:', error)
      console.warn('⚠️ Fallback ativado: usando Last.fm e MusicBrainz como alternativas')
      return null
    }
  }
  
  // ============= BUSCA DE METADADOS MUSICAIS =============
  
  // Função principal para buscar informações de músicas via Spotify
  // Implemento busca inteligente com matching de similaridade para melhor precisão
  // Esta função é prioritária devido à qualidade superior dos dados do Spotify
  const searchSpotifyTrack = async (artist, track) => {
    try {
      // Obtenho token de autenticação (renovado automaticamente se necessário)
      const token = await authenticateSpotify()
      if (!token) {
        console.log('⚠️ Token Spotify indisponível, ativando APIs de fallback')
        return null
      }
      
      // Limpo e sanitizo a query de busca para melhor precisão
      // Removo caracteres especiais que podem interferir na busca
      const cleanArtist = artist.replace(/[^\w\s]/gi, '').trim()
      const cleanTrack = track.replace(/[^\w\s]/gi, '').trim()
      
      // Construo query otimizada usando campos específicos do Spotify
      const query = encodeURIComponent(`track:"${cleanTrack}" artist:"${cleanArtist}"`)
      const url = `${spotifyBaseUrl}/search?q=${query}&type=track&limit=5&market=BR`
      
      console.log(`🔍 Buscando via Spotify API: "${cleanArtist}" - "${cleanTrack}"`)
      console.log(`🌐 URL da busca: ${url}`)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.warn(`⚠️ Falha na busca Spotify: ${response.status} - ${errorText}`)
        return null
      }
      
      const data = await response.json()
      
      if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
        console.log(`📊 Encontrados ${data.tracks.items.length} resultados no Spotify`)
        
        // Implemento algoritmo de matching inteligente para encontrar melhor resultado
        let bestMatch = data.tracks.items[0] // Fallback para primeiro resultado
        let bestScore = 0
        
        // Analiso cada resultado para encontrar o melhor match
        for (const spotifyTrack of data.tracks.items) {
          let score = 0
          
          // Scoring baseado em similaridade de nomes
          const trackNameMatch = spotifyTrack.name.toLowerCase().includes(cleanTrack.toLowerCase())
          const artistNameMatch = spotifyTrack.artists.some(a => 
            a.name.toLowerCase().includes(cleanArtist.toLowerCase())
          )
          
          if (trackNameMatch) score += 50
          if (artistNameMatch) score += 50
          
          // Bonus para matches exatos
          if (spotifyTrack.name.toLowerCase() === cleanTrack.toLowerCase()) score += 30
          if (spotifyTrack.artists.some(a => a.name.toLowerCase() === cleanArtist.toLowerCase())) score += 30
          
          // Bonus para popularidade (spotify ranking)
          score += spotifyTrack.popularity * 0.1
          
          // Bonus para preview disponível (importante para fallback HTML5)
          if (spotifyTrack.preview_url) score += 40
          
          console.log(`🎯 Candidato: "${spotifyTrack.name}" por ${spotifyTrack.artists[0]?.name} - Score: ${score}`)
          
          if (score > bestScore) {
            bestScore = score
            bestMatch = spotifyTrack
          }
        }
        
        const album = bestMatch.album
        
        // Verifico se o álbum tem capas disponíveis
        if (album.images && album.images.length > 0) {
          // Obtenho a maior resolução disponível (primeira imagem é tipicamente 640x640)
          const albumCover = album.images[0].url
          
          console.log(`✅ Match final selecionado: "${bestMatch.name}" por ${bestMatch.artists[0]?.name} (Score: ${bestScore})`)
          console.log(`🎨 Capa encontrada em alta resolução: ${albumCover}`)
          console.log(`📀 Álbum: "${album.name}" (${album.release_date})`)
          console.log(`📊 Popularidade Spotify: ${bestMatch.popularity}/100`)
          
          // Retorno objeto completo com todos os metadados disponíveis
          return {
            albumCover: albumCover,
            albumName: album.name,
            artist: bestMatch.artists[0]?.name || artist,
            trackName: bestMatch.name,
            spotifyUrl: bestMatch.external_urls?.spotify,
            releaseDate: album.release_date,
            popularity: bestMatch.popularity,
            albumType: album.album_type,
            totalTracks: album.total_tracks,
            explicit: bestMatch.explicit,
            durationMs: bestMatch.duration_ms,
            previewUrl: bestMatch.preview_url
          }
        }
      }
      
      console.log('❌ Nenhum resultado válido encontrado no Spotify para esta busca')
      return null
      
    } catch (error) {
      console.error('❌ Erro crítico na busca Spotify:', error)
      console.warn('⚠️ Ativando sistema de fallback (Last.fm + MusicBrainz)')
      return null
    }
  }
  
  // ============= INICIALIZAÇÃO DO SISTEMA DE ÁUDIO =============
  
  // Função principal para inicializar todos os componentes do sistema de áudio
  // Configura player HTML5, eventos, bibliotecas externas e autenticação
  const initializePlayer = () => {
    console.log('🎵 Inicializando sistema avançado de reprodução de áudio...')
    
    // Crio e configuro elemento de áudio HTML5 com settings otimizados
    audioPlayer.value = new Audio()
    audioPlayer.value.preload = 'auto'        // Pré-carrega metadados automaticamente
    audioPlayer.value.volume = 0.7            // Volume padrão (70%)
    audioPlayer.value.crossOrigin = 'anonymous' // Permite análise de pixels para cores
    audioPlayer.value.muted = false           // Garante que não está muted
    
    console.log(`🔊 Player criado com volume inicial: ${audioPlayer.value.volume}`)
    
    // Configuro listeners de eventos para monitoramento do playback
    setupAudioEvents()
    
    // Inicializo biblioteca de extração de cores
    initializeColorThief()
    
    // Inicio autenticação em background com Spotify
    authenticateSpotify().then(() => {
      console.log('🔐 Sistema de autenticação Spotify inicializado')
    })
    
    // Aplico tema padrão (preto) quando nenhuma música está tocando
    initializeTheme()
    
    console.log('✅ Sistema de áudio inicializado com sucesso!')
    console.log('🎯 Recursos disponíveis:')
    console.log('   - Player HTML5 com cross-origin habilitado')
    console.log('   - Autenticação automática com Spotify')
    console.log('   - Extração dinâmica de cores de capas')
    console.log('   - Sistema de temas baseado em cores')
    console.log('   - Controles avançados de playback')
    
    return Promise.resolve(true)
  }
  
  // Inicialização da biblioteca ColorThief para análise de cores
  // Esta biblioteca permite extrair paletas de cores de imagens para criar temas dinâmicos
  const initializeColorThief = () => {
    try {
      // Verifico se ColorThief já está disponível globalmente
      if (typeof ColorThief === 'undefined') {
        console.log('🎨 Carregando biblioteca ColorThief via CDN...')
        
        // Carrego dinamicamente via CDN para não aumentar bundle size
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/color-thief/2.3.0/color-thief.umd.js'
        script.onload = () => {
          colorThief = new ColorThief()
          console.log('✅ ColorThief carregado e inicializado!')
          console.log('🎨 Capacidades disponíveis: extração de cor dominante e paletas completas')
        }
        script.onerror = () => {
          console.warn('⚠️ Falha ao carregar ColorThief, usando fallback manual de detecção')
        }
        document.head.appendChild(script)
      } else {
        colorThief = new ColorThief()
        console.log('✅ ColorThief já disponível - inicializado!')
      }
    } catch (error) {
      console.warn('⚠️ ColorThief não disponível, sistema de cores funcionará com capacidades limitadas:', error)
    }
  }
  
  // ============= CONFIGURAÇÃO DE EVENTOS DE ÁUDIO =============
  
  // Configura todos os event listeners para o elemento de áudio HTML5
  // Estes eventos permitem monitorar estado, progresso e responder a mudanças de playback
  const setupAudioEvents = () => {
    if (!audioPlayer.value) {
      console.error('❌ Player de áudio não inicializado - não é possível configurar eventos')
      return
    }
    
    console.log('🔧 Configurando event listeners do player de áudio...')
    
    // Evento quando metadados da música são carregados (duração, etc.)
    audioPlayer.value.addEventListener('loadedmetadata', () => {
      duration.value = audioPlayer.value.duration * 1000 // Converto para ms
      console.log(`📊 Metadados carregados - Duração: ${formatTime(duration.value)}`)
      console.log(`🎵 Título: ${currentTrack.value?.title || 'Desconhecido'}`)
      console.log(`👤 Artista: ${currentTrack.value?.artist || 'Desconhecido'}`)
    })
    
    // Evento de atualização de tempo durante reprodução
    audioPlayer.value.addEventListener('timeupdate', () => {
      position.value = audioPlayer.value.currentTime * 1000 // Converto para ms
      // Log apenas a cada 10 segundos para não spam do console
      if (Math.floor(audioPlayer.value.currentTime) % 10 === 0) {
        //console.log(`⏱️ Progresso: ${formatTime(position.value)} / ${formatTime(duration.value)}`)
      }
    })
    
    // Evento quando reprodução inicia
    audioPlayer.value.addEventListener('play', () => {
      isPlaying.value = true
      console.log(`▶️ Reprodução iniciada: "${currentTrack.value?.title || 'Música desconhecida'}"`)
      
      // Garante que o volume está correto (não precisa mais de fade-in complexo)
      if (audioPlayer.value.volume < 0.5) {
        audioPlayer.value.volume = 0.7
        console.log(`🔊 Volume ajustado para 70%`)
      }
    })
    
    // Evento quando reprodução é pausada
    audioPlayer.value.addEventListener('pause', () => {
      isPlaying.value = false
      console.log(`⏸️ Reprodução pausada: "${currentTrack.value?.title || 'Música desconhecida'}"`)
    })
    
    // Evento quando música termina
    audioPlayer.value.addEventListener('ended', () => {
      isPlaying.value = false
      console.log(`⏹️ Música finalizada: "${currentTrack.value?.title || 'Música desconhecida'}"`)
      
      // Dispara evento para App.vue controlar a navegação (importante para suportar Spotify/HTML5 híbrido)
      window.dispatchEvent(new CustomEvent('audio-ended'))
    })
    
    // Evento de erro no carregamento/reprodução
    audioPlayer.value.addEventListener('error', (e) => {
      isPlaying.value = false
      console.error('❌ Erro crítico no player de áudio:', e)
      console.error('🔗 URL que causou problema:', audioPlayer.value.src)
      console.error('📋 Detalhes do erro:', {
        code: audioPlayer.value.error?.code,
        message: audioPlayer.value.error?.message,
        networkState: audioPlayer.value.networkState,
        readyState: audioPlayer.value.readyState
      })
    })
    
    // Eventos informativos para debugging
    audioPlayer.value.addEventListener('loadstart', () => {
      console.log('📡 Iniciando carregamento da música...')
    })
    
    audioPlayer.value.addEventListener('canplay', () => {
      console.log('✅ Música carregada e pronta para reprodução')
    })
    
    audioPlayer.value.addEventListener('waiting', () => {
      console.log('⏳ Aguardando dados (buffering)...')
    })
    
    audioPlayer.value.addEventListener('canplaythrough', () => {
      console.log('🚀 Música totalmente carregada (pode reproduzir sem interrupções)')
    })
    
    console.log('✅ Event listeners configurados com sucesso!')
  }
  
  // Sistema de fade-in gradual do volume para experiência suave
  // Implemento transição suave de 0% para 70% de volume em 2 segundos
  // Isso evita o susto do volume alto repentino e melhora a experiência do usuário
  const gradualVolumeIncrease = () => {
    const targetVolume = 0.7      // Volume alvo (70% - confortável para ouvir)
    const fadeTime = 2000         // Duração do fade-in (2 segundos)
    const steps = 50              // Número de passos para transição suave
    const stepTime = fadeTime / steps      // Tempo entre cada passo
    const volumeStep = targetVolume / steps // Incremento de volume por passo
    
    let currentStep = 0
    
    console.log(`🔊 Iniciando fade-in suave: 0% → ${targetVolume * 100}% em ${fadeTime}ms`)
    
    const fadeInterval = setInterval(() => {
      // Paro o fade se a música parou ou chegou no final
      if (currentStep >= steps || !isPlaying.value) {
        clearInterval(fadeInterval)
        audioPlayer.value.volume = targetVolume
        console.log(`✅ Fade-in concluído - volume final: ${Math.round(targetVolume * 100)}%`)
        return
      }
      
      // Incremento gradual do volume
      audioPlayer.value.volume = volumeStep * currentStep
      currentStep++
    }, stepTime)
  }
  
  // ============= BUSCA AVANÇADA DE CAPAS DE ÁLBUM =============
  
  // iTunes Search API Fallback
  // Excelente fonte para previews de áudio e capas de alta qualidade
  const searchItunesPreview = async (artist, track) => {
    try {
      console.log(`🍎 Buscando preview no iTunes: "${artist}" - "${track}"`)
      const query = encodeURIComponent(`${artist} ${track}`)
      const url = `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=1`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('iTunes API error')
      
      const data = await response.json()
      
      if (data.resultCount > 0) {
        const item = data.results[0]
        console.log(`✅ iTunes encontrou: ${item.trackName}`)
        return {
            previewUrl: item.previewUrl,
            albumCover: item.artworkUrl100.replace('100x100', '600x600'), // Get larger image
            albumName: item.collectionName,
            trackName: item.trackName,
            artist: item.artistName,
            releaseDate: item.releaseDate,
            genre: item.primaryGenreName
        }
      }
      return null
    } catch (e) {
      console.warn('⚠️ iTunes search failed:', e)
      return null
    }
  }

  // Sistema em cascata para buscar capas com múltiplas APIs como fallback
  // Prioridade: Spotify > iTunes > Last.fm > MusicBrainz + Cover Art Archive
  // Esta estratégia garante que sempre encontremos uma capa, mesmo que básica
  const searchAlbumCover = async (artist, track) => {
    try {
      console.log(`🔍 Iniciando busca em cascata de capa para: "${artist}" - "${track}"`)
      
      // Tentativa 1: Spotify (melhor qualidade e confiabilidade)
      console.log('1️⃣ Tentando Spotify API (fonte principal)...')
      const spotifyInfo = await searchSpotifyTrack(artist, track)
      if (spotifyInfo && spotifyInfo.albumCover) {
        console.log('✅ Sucesso via Spotify - usando resultado de alta qualidade')
        return spotifyInfo
      }

      // Tentativa 2: iTunes (Fallback com áudio preview)
      console.log('2️⃣ Tentando iTunes API (fallback com áudio)...')
      const itunesInfo = await searchItunesPreview(artist, track)
      if (itunesInfo && itunesInfo.albumCover) {
        console.log('✅ Sucesso via iTunes')
        return itunesInfo
      }
      
      // Tentativa 3: Last.fm informações de track específico
      console.log('3️⃣ Tentando Last.fm track info (fallback 2)...')
      const trackInfo = await fetchLastFmTrackInfo(artist, track)
      if (trackInfo && trackInfo.albumCover) {
        console.log('✅ Sucesso via Last.fm track info')
        return trackInfo
      }
      
      // Tentativa 3: Last.fm álbuns mais populares do artista
      console.log('3️⃣ Tentando Last.fm artist top albums (fallback 2)...')
      const artistInfo = await fetchLastFmArtistTopAlbum(artist)
      if (artistInfo && artistInfo.albumCover) {
        console.log('✅ Sucesso via Last.fm artist albums')
        return artistInfo
      }
      
      // Tentativa 4: MusicBrainz + Cover Art Archive (último recurso)
      console.log('4️⃣ Tentando MusicBrainz + Cover Art Archive (último recurso)...')
      const musicBrainzInfo = await fetchMusicBrainzCover(artist, track)
      if (musicBrainzInfo && musicBrainzInfo.albumCover) {
        console.log('✅ Sucesso via MusicBrainz')
        return musicBrainzInfo
      }
      
      console.log('❌ Todas as tentativas falharam - nenhuma capa encontrada')
      return null
    } catch (error) {
      console.error('❌ Erro crítico durante busca de capa:', error)
      return null
    }
  }
  
  // API Last.fm - Busca informações específicas de uma música
  // Fallback confiável quando Spotify falha, com boa cobertura de metadados
  const fetchLastFmTrackInfo = async (artist, track) => {
    try {
      console.log(`🎵 Consultando Last.fm para track: "${artist}" - "${track}"`)
      
      const url = `${lastFmBaseUrl}?method=track.getinfo&api_key=${lastFmApiKey}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Last.fm track API retornou ${response.status}`)
      }
      
      const data = await response.json()
      
      // Verifico se temos dados válidos de álbum com imagens
      if (data.track && data.track.album && data.track.album.image) {
        const images = data.track.album.image
        
        // Last.fm retorna array de tamanhos: small, medium, large, extralarge
        // Escolho a maior disponível
        const largestImage = images[images.length - 1]
        
        if (largestImage && largestImage['#text'] && largestImage['#text'].trim() !== '') {
          console.log(`✅ Capa encontrada via Last.fm track API`)
          console.log(`📸 URL: ${largestImage['#text']}`)
          console.log(`📀 Álbum: ${data.track.album.title || 'Álbum Desconhecido'}`)
          
          return {
            albumCover: largestImage['#text'],
            albumName: data.track.album.title || 'Álbum Desconhecido',
            artist: data.track.artist.name || artist,
            trackName: data.track.name || track,
            lastFmUrl: data.track.url
          }
        }
      }
      
      console.log('⚠️ Last.fm track não retornou imagens válidas')
      return null
    } catch (error) {
      console.error('❌ Erro na consulta Last.fm track:', error)
      return null
    }
  }
  
  // Fetch artist top album from Last.fm
  const fetchLastFmArtistTopAlbum = async (artist) => {
    try {
      const url = `${lastFmBaseUrl}?method=artist.gettopalbums&api_key=${lastFmApiKey}&artist=${encodeURIComponent(artist)}&format=json&limit=1`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.topalbums && data.topalbums.album && data.topalbums.album.length > 0) {
        const album = data.topalbums.album[0]
        if (album.image && album.image.length > 0) {
          const largestImage = album.image[album.image.length - 1]
          if (largestImage['#text']) {
            console.log(`✅ Capa do top álbum encontrada para ${artist}`)
            return {
              albumCover: largestImage['#text'],
              albumName: album.name
            }
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('❌ Erro Last.fm artist:', error)
      return null
    }
  }
  
  // Fetch cover from MusicBrainz + Cover Art Archive
  const fetchMusicBrainzCover = async (artist, track) => {
    try {
      // Search for release on MusicBrainz
      const searchUrl = `https://musicbrainz.org/ws/2/release/?query=artist:"${encodeURIComponent(artist)}" AND recording:"${encodeURIComponent(track)}"&fmt=json&limit=1`
      
      const response = await fetch(searchUrl)
      const data = await response.json()
      
      if (data.releases && data.releases.length > 0) {
        const release = data.releases[0]
        const mbid = release.id
        
        // Get cover art from Cover Art Archive
        const coverUrl = `https://coverartarchive.org/release/${mbid}/front`
        
        // Check if cover exists
        const coverResponse = await fetch(coverUrl, { method: 'HEAD' })
        if (coverResponse.ok) {
          console.log(`✅ Capa encontrada via MusicBrainz para ${artist} - ${track}`)
          return {
            albumCover: coverUrl,
            albumName: release.title || 'Unknown Album'
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('❌ Erro MusicBrainz:', error)
      return null
    }
  }
  
  // ============= EXTRAÇÃO E ANÁLISE DE CORES =============
  
  // Sistema avançado de extração de cores com análise de brilho e determinação de tema
  // Esta função é fundamental para o sistema de temas dinâmicos da aplicação
  const extractDominantColor = async (imageUrl) => {
    return new Promise((resolve) => {
      console.log(`🎨 Iniciando análise de cores para: ${imageUrl}`)
      
      // Crio elemento de imagem temporário para análise
      const img = new Image()
      img.crossOrigin = 'anonymous' // Necessário para análise de pixels
      
      img.onload = () => {
        try {
          let dominantColor = null
          let palette = []
          let brightness = 0.5 // Default médio
          
          // Tentativa 1: Usar ColorThief se disponível (mais preciso)
          if (colorThief) {
            console.log('🎨 Usando ColorThief para análise avançada...')
            
            try {
              // Extraio cor dominante
              const dominantRGB = colorThief.getColor(img)
              dominantColor = {
                r: dominantRGB[0],
                g: dominantRGB[1], 
                b: dominantRGB[2]
              }
              
              // Extraio paleta completa (5 cores principais)
              const paletteRGB = colorThief.getPalette(img, 5)
              palette = paletteRGB.map(color => ({
                r: color[0],
                g: color[1],
                b: color[2]
              }))
              
              console.log(`🎯 Cor dominante via ColorThief: rgb(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b})`)
              console.log(`🌈 Paleta extraída: ${palette.length} cores`)
              
            } catch (colorThiefError) {
              console.warn('⚠️ ColorThief falhou, usando análise manual:', colorThiefError)
              dominantColor = manualColorExtraction(img)
            }
          } else {
            // Fallback: análise manual quando ColorThief não está disponível
            console.log('🎨 Usando análise manual de cores (fallback)...')
            dominantColor = manualColorExtraction(img)
          }
          
          if (dominantColor) {
            // Calculo brilho da cor dominante usando fórmula de luminância
            brightness = calculateBrightness(dominantColor.r, dominantColor.g, dominantColor.b)
            
            // Determino tema baseado nas características da cor
            const theme = getThemeFromRGB(dominantColor.r, dominantColor.g, dominantColor.b)
            
            console.log(`💡 Brilho calculado: ${brightness.toFixed(2)} (0=escuro, 1=claro)`)
            console.log(`🎨 Tema determinado: ${theme}`)
            
            // Disparo evento customizado para outros componentes reagirem
            const colorEvent = new CustomEvent('albumColorExtracted', {
              detail: {
                dominant: [dominantColor.r, dominantColor.g, dominantColor.b],
                palette: palette.map(c => [c.r, c.g, c.b]),
                theme: theme,
                brightness: brightness,
                albumCover: imageUrl
              }
            })
            window.dispatchEvent(colorEvent)
            
            resolve({
              dominantColor,
              palette,
              theme,
              brightness
            })
          } else {
            console.log('❌ Não foi possível extrair cores - usando tema padrão')
            resolve(null)
          }
          
        } catch (error) {
          console.error('❌ Erro durante análise de cores:', error)
          resolve(null)
        }
      }
      
      img.onerror = () => {
        console.error('❌ Erro ao carregar imagem para análise de cores:', imageUrl)
        resolve(null)
      }
      
      // Inicio carregamento da imagem
      img.src = imageUrl
    })
  }
  
  // Análise manual de cores quando ColorThief não está disponível
  // Uso amostragem de canvas para extrair cor média da imagem
  const manualColorExtraction = (img) => {
    try {
      // Crio canvas temporário para análise de pixels
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      // Redimensiono para análise mais rápida (mantém proporção)
      const size = 50
      canvas.width = size
      canvas.height = size
      
      // Desenho imagem redimensionada no canvas
      ctx.drawImage(img, 0, 0, size, size)
      
      // Extraio dados de pixels
      const imageData = ctx.getImageData(0, 0, size, size)
      const data = imageData.data
      
      let r = 0, g = 0, b = 0
      let totalPixels = 0
      
      // Calculo média de todas as cores (ignorando pixels muito escuros/claros)
      for (let i = 0; i < data.length; i += 4) {
        const pixelR = data[i]
        const pixelG = data[i + 1]
        const pixelB = data[i + 2]
        const alpha = data[i + 3]
        
        // Ignoro pixels transparentes e muito extremos
        if (alpha > 128) {
          const brightness = (pixelR + pixelG + pixelB) / 3
          if (brightness > 20 && brightness < 235) { // Filtro extremos
            r += pixelR
            g += pixelG
            b += pixelB
            totalPixels++
          }
        }
      }
      
      if (totalPixels > 0) {
        return {
          r: Math.round(r / totalPixels),
          g: Math.round(g / totalPixels),
          b: Math.round(b / totalPixels)
        }
      }
      
      return null
    } catch (error) {
      console.error('❌ Erro na análise manual de cores:', error)
      return null
    }
  }
  
  // Calcula brilho usando fórmula de luminância perceptual
  // Esta fórmula considera que o olho humano é mais sensível ao verde
  const calculateBrightness = (r, g, b) => {
    // Fórmula padrão de luminância: 0.299*R + 0.587*G + 0.114*B
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255
  }
  
  // Determine theme from RGB values
  const getThemeFromRGB = (r, g, b) => {
    const saturation = Math.max(r, g, b) - Math.min(r, g, b)
    const brightness = (r + g + b) / 3
    
    if (saturation > 80) return 'vibrant'
    if (r > g && r > b && r > 120) return 'warm'
    if (b > r && b > g && b > 100) return 'cool'
    if (brightness < 80) return 'neutral'
    return 'neutral'
  }
  
  // Play song with enhanced album cover and color detection
  const playSong = async (songData) => {
    try {
      console.log(`🎵 playSong chamado para: ${songData.title} - ${songData.artist}`)
      console.log(`📡 URL da música: ${songData.audioUrl}`)
      console.log(`🎨 Capa atual: ${songData.albumCover}`)
      
      currentTrack.value = songData
      
      // Always search for Spotify album cover and preview URL for better quality
      console.log('🔍 Buscando informações do Spotify...')
      const albumInfo = await searchAlbumCover(songData.artist, songData.title)
      
      // Se não tem audioUrl mas o Spotify retornou previewUrl, usa ele
      if ((!songData.audioUrl || songData.audioUrl === '') && albumInfo?.previewUrl) {
        console.log(`🎵 Usando preview URL do Spotify: ${albumInfo.previewUrl}`)
        songData.audioUrl = albumInfo.previewUrl
      }
      
      if (albumInfo) {
        // Update track data with Spotify information
        const oldCover = songData.albumCover
        songData.albumCover = albumInfo.albumCover
        
        console.log(`✅ Capa do Spotify encontrada!`)
        console.log(`📸 Capa anterior: ${oldCover}`)
        console.log(`🎨 Nova capa Spotify: ${songData.albumCover}`)
        
        if (albumInfo.albumName) {
          songData.album = albumInfo.albumName
        }
        
        // Add Spotify-specific data if available
        if (albumInfo.spotifyUrl) {
          songData.spotifyUrl = albumInfo.spotifyUrl
          console.log(`🎵 Link Spotify: ${albumInfo.spotifyUrl}`)
        }
        if (albumInfo.releaseDate) {
          songData.releaseDate = albumInfo.releaseDate
          console.log(`📅 Data de lançamento: ${albumInfo.releaseDate}`)
        }
        if (albumInfo.popularity) {
          songData.popularity = albumInfo.popularity
          console.log(`📊 Popularidade Spotify: ${albumInfo.popularity}%`)
        }
        
        console.log(`📀 Álbum: ${songData.album}`)
        
        // Force update currentTrack to trigger Vue reactivity
        currentTrack.value = { ...songData }
        console.log(`🔄 currentTrack atualizado com nova capa:`, currentTrack.value.albumCover)
        
      } else {
        console.log('⚠️ Nenhuma capa encontrada via Spotify, mantendo capa original')
        console.log('🎨 Usando capa existente:', songData.albumCover)
        // Still force update to ensure reactivity
        currentTrack.value = { ...songData }
      }
      
      // Fallback final: Se ainda não tem áudio, tenta buscar explicitamente no iTunes
      // Isso cobre casos onde o Spotify achou a capa mas não tem preview
      if (!songData.audioUrl || songData.audioUrl === '') {
        console.log('🔍 Tentando fallback final de áudio no iTunes...')
        const itunesInfo = await searchItunesPreview(songData.artist, songData.title)
        if (itunesInfo && itunesInfo.previewUrl) {
          console.log(`🎵 Preview de áudio encontrado no iTunes: ${itunesInfo.previewUrl}`)
          songData.audioUrl = itunesInfo.previewUrl
          // Se ainda estiver sem capa decente, usa a do iTunes
          if (!songData.albumCover || songData.albumCover.includes('default-album')) {
             songData.albumCover = itunesInfo.albumCover
             currentTrack.value = { ...songData }
          }
        }
      }

      // Verifica se há URL de áudio disponível
      if (!songData.audioUrl || songData.audioUrl === '') {
        console.warn('⚠️ Nenhuma URL de áudio disponível para esta música')
        console.log('ℹ️ A música foi adicionada mas não pode ser reproduzida sem áudio')
        // Ainda atualiza o currentTrack para mostrar a capa
        currentTrack.value = { ...songData }
        isPlaying.value = false
        return false
      }
      
      // Set the audio source
      console.log(`📡 Carregando áudio: ${songData.audioUrl}`)
      audioPlayer.value.src = songData.audioUrl
      
      // Verificações de debug do player
      console.log(`🔊 Estado do player antes de tocar:`)
      console.log(`   - Volume: ${audioPlayer.value.volume}`)
      console.log(`   - Muted: ${audioPlayer.value.muted}`)
      console.log(`   - ReadyState: ${audioPlayer.value.readyState}`)
      
      // Garante que volume está OK e não está muted
      if (audioPlayer.value.volume === 0) {
        console.log('⚠️ Volume estava em 0, ajustando para 0.7')
        audioPlayer.value.volume = 0.7
      }
      if (audioPlayer.value.muted) {
        console.log('⚠️ Áudio estava muted, desmutando')
        audioPlayer.value.muted = false
      }
      
      // Load and play
      console.log('⏳ Carregando áudio...')
      
      // Aguarda o carregamento com timeout de 10s
      const loadPromise = audioPlayer.value.load()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout ao carregar áudio')), 10000)
      )
      
      try {
        await Promise.race([loadPromise, timeoutPromise])
        console.log('✅ Áudio carregado!')
      } catch (error) {
        console.warn('⚠️ Timeout/erro no load, tentando play() mesmo assim:', error.message)
      }
      
      // Verifica se tem alguma fonte válida
      if (!audioPlayer.value.src || audioPlayer.value.src === '') {
        throw new Error('Nenhuma fonte de áudio definida')
      }
      
      console.log('▶️ Tentando reproduzir...')
      console.log(`🔗 Source: ${audioPlayer.value.src}`)
      
      await audioPlayer.value.play()
      
      console.log('✅ Reprodução iniciada com sucesso!')
      console.log(`🔊 Volume final: ${audioPlayer.value.volume}`)
      console.log(`🔇 Muted: ${audioPlayer.value.muted}`)
      console.log(`🎵 Tocando: ${currentTrack.value?.title}`)
      console.log(`👤 Artista: ${currentTrack.value?.artist}`)
      console.log(`⏱️ Duração: ${formatTime(audioPlayer.value.duration * 1000)}`)
      
      // Update dynamic background and extract colors
      console.log(`🎨 Iniciando atualização do fundo dinâmico...`)
      await updateDynamicBackground(currentTrack.value.albumCover)
      console.log(`✅ Fundo dinâmico atualizado`)
      
      return true
    } catch (error) {
      console.error('❌ Erro ao tocar música:', error)
      throw error
    }
  }
  
  // Update dynamic background with enhanced color extraction
  const updateDynamicBackground = async (albumCoverUrl) => {
    if (!albumCoverUrl) return
    
    console.log(`🎨 Atualizando fundo dinâmico com: ${albumCoverUrl}`)
    
    let dynamicBackground = document.querySelector('.dynamic-background')
    if (!dynamicBackground) {
      dynamicBackground = document.createElement('div')
      dynamicBackground.className = 'dynamic-background'
      document.body.insertBefore(dynamicBackground, document.body.firstChild)
    }
    
    dynamicBackground.style.backgroundImage = `url(${albumCoverUrl})`
    dynamicBackground.classList.add('active')
    
    // Extract colors and apply theme
    const colorInfo = await extractDominantColor(albumCoverUrl)
    if (colorInfo) {
      applyDynamicTheme(colorInfo.theme)
      
      // Dispatch custom event with color information
      window.dispatchEvent(new CustomEvent('albumColorExtracted', {
        detail: colorInfo
      }))
    }
  }
  
  // Apply dynamic theme based on color analysis or default black theme
  const applyDynamicTheme = (theme = null) => {
    const body = document.body
    const themes = ['theme-warm', 'theme-cool', 'theme-vibrant', 'theme-neutral', 'theme-black']
    
    // Remove all existing theme classes
    themes.forEach(t => body.classList.remove(t))
    
    // If no track is playing or no theme provided, apply black theme
    if (!currentTrack.value || !theme) {
      body.classList.add('theme-black')
      console.log('🎨 Tema aplicado: black (sem música tocando)')
      return
    }
    
    // Apply the specific theme based on album colors
    body.classList.add(`theme-${theme}`)
    console.log(`🎨 Tema aplicado: ${theme}`)
  }
  
  // Initialize with black theme
  const initializeTheme = () => {
    applyDynamicTheme()
  }
  
  // Toggle play/pause
  const togglePlayback = async () => {
    try {
      // Verifica se há uma música carregada com URL válida
      if (!audioPlayer.value.src || audioPlayer.value.src === '' || audioPlayer.value.src === window.location.href) {
        console.warn('⚠️ Nenhuma música carregada para reproduzir')
        
        // Tenta tocar a primeira música da lista se disponível
        if (currentSongsList.value && currentSongsList.value.length > 0) {
          console.log('🎵 Tentando reproduzir primeira música da lista...')
          await playSong(currentSongsList.value[0])
          return true
        }
        return false
      }
      
      if (audioPlayer.value.paused) {
        await audioPlayer.value.play()
        console.log('▶️ Reprodução retomada')
      } else {
        audioPlayer.value.pause()
        console.log('⏸️ Reprodução pausada')
      }
      return true
    } catch (error) {
      console.error('❌ Erro ao alternar playback:', error)
      // Se o erro é de fonte não suportada, limpa o estado
      if (error.name === 'NotSupportedError') {
        console.warn('⚠️ Fonte de áudio não suportada ou indisponível')
        isPlaying.value = false
      }
      return false
    }
  }
  
  // Previous track - vai para a música anterior na lista
  const previousTrack = async (songsList = []) => {
    if (!currentTrack.value || !songsList || songsList.length === 0) {
      console.log('⏮️ Voltando ao início da música (sem lista disponível)')
      audioPlayer.value.currentTime = 0
      return true
    }
    
    const currentIndex = songsList.findIndex(song => song.id === currentTrack.value.id)
    
    if (currentIndex === -1) {
      console.log('⏮️ Música atual não encontrada na lista, voltando ao início')
      audioPlayer.value.currentTime = 0
      return true
    }
    
    // Se estiver na primeira música, volta ao início da música atual
    if (currentIndex === 0) {
      console.log('⏮️ Primeira música da lista, voltando ao início')
      audioPlayer.value.currentTime = 0
      return true
    }
    
    // Vai para a música anterior
    const previousSong = songsList[currentIndex - 1]
    console.log(`⏮️ Indo para música anterior: ${previousSong.title} - ${previousSong.artist}`)
    
    try {
      await playSong(previousSong)
      return true
    } catch (error) {
      console.error('❌ Erro ao tocar música anterior:', error)
      return false
    }
  }
  
  // Adiciona música à fila de prioridade
  const addToQueue = (song) => {
    // Evita duplicatas consecutivas na fila
    const lastInQueue = queue.value[queue.value.length - 1]
    if (lastInQueue && lastInQueue.id === song.id) {
      console.log('⚠️ Música já é a última da fila')
      return false
    }
    
    queue.value.push(song)
    console.log(`📥 Adicionada à fila: ${song.title}`)
    return true
  }

  // Next track - vai para a próxima música na lista (prioriza fila)
  const nextTrack = async (songsList = []) => {
    // 1. Prioridade: Fila manual
    if (queue.value.length > 0) {
      const nextSong = queue.value.shift() // Remove primeira da fila
      console.log(`⏭️ Tocando próxima da fila: ${nextSong.title}`)
      try {
        await playSong(nextSong)
        return true
      } catch (error) {
        console.error('❌ Erro ao tocar música da fila:', error)
        // Se falhar, tenta a próxima (recursivo ou cai pro fallback)
      }
    }

    if (!currentTrack.value || !songsList || songsList.length === 0) {
      console.log('⏭️ Parando música atual (sem lista disponível)')
      audioPlayer.value.pause()
      audioPlayer.value.currentTime = 0
      return true
    }
    
    const currentIndex = songsList.findIndex(song => song.id === currentTrack.value.id)
    
    if (currentIndex === -1) {
      console.log('⏭️ Música atual não encontrada na lista, tocando primeira música')
      const firstSong = songsList[0]
      try {
        await playSong(firstSong)
        return true
      } catch (error) {
        console.error('❌ Erro ao tocar primeira música:', error)
        return false
      }
    }
    
    // Se estiver na última música, para a reprodução
    if (currentIndex === songsList.length - 1) {
      console.log('⏭️ Última música da lista, parando reprodução')
      audioPlayer.value.pause()
      audioPlayer.value.currentTime = 0
      return true
    }
    
    // Vai para a próxima música
    const nextSong = songsList[currentIndex + 1]
    console.log(`⏭️ Indo para próxima música: ${nextSong.title} - ${nextSong.artist}`)
    
    try {
      await playSong(nextSong)
      return true
    } catch (error) {
      console.error('❌ Erro ao tocar próxima música:', error)
      return false
    }
  }
  
  // Format time
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  
  // Add track to playlist
  const addTrack = (trackData) => {
    const track = {
      id: trackData.id || Date.now(),
      title: trackData.title || 'Música Sem Nome',
      artist: trackData.artist || 'Artista Desconhecido',
      albumCover: trackData.albumCover || 'https://via.placeholder.com/300x300/333/fff?text=♪',
      audioUrl: trackData.audioUrl || trackData.cloudinaryUrl,
      cloudinaryId: trackData.cloudinaryId || null,
      votes: trackData.votes || 0
    }

    playlist.value.push(track)
    console.log(`📀 Música adicionada à playlist: ${track.title}`)
    return track
  }
  
  // Get current playback state
  const getCurrentPlayback = () => {
    return {
      track: currentTrack.value,
      isPlaying: isPlaying.value,
      position: position.value,
      duration: duration.value
    }
  }
  
  // Function to detect if image is predominantly white/light
  const detectImageBrightness = (imageSrc) => {
    return new Promise((resolve) => {
      if (!imageSrc || imageSrc.includes('placeholder')) {
        resolve(false)
        return
      }

      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data
          
          let r = 0, g = 0, b = 0
          let pixelCount = 0
          
          // Sample every 10th pixel for performance
          for (let i = 0; i < data.length; i += 40) {
            r += data[i]
            g += data[i + 1]
            b += data[i + 2]
            pixelCount++
          }
          
          // Calculate average RGB values
          r = Math.floor(r / pixelCount)
          g = Math.floor(g / pixelCount)
          b = Math.floor(b / pixelCount)
          
          // Calculate brightness (0-255)
          const brightness = (r + g + b) / 3
          
          // Also check if it's very light (close to white)
          const isVeryLight = r > 200 && g > 200 && b > 200
          
          console.log(`🎨 Análise da capa: RGB(${r}, ${g}, ${b}) | Brilho: ${brightness} | Muito clara: ${isVeryLight}`)
          
          // Consider it white/light if brightness > 180 or very light
          resolve(brightness > 180 || isVeryLight)
          
        } catch (error) {
          console.error('❌ Erro ao analisar cor da capa:', error)
          resolve(false)
        }
      }
      
      img.onerror = () => {
        console.error('❌ Erro ao carregar imagem para análise de cor')
        resolve(false)
      }
      
      img.src = imageSrc
    })
  }
  
  // Function to update the current songs list for navigation
  const updateSongsList = (songsList) => {
    currentSongsList.value = songsList
    console.log(`📋 Lista de músicas atualizada: ${songsList.length} músicas`)
  }

  const setTrack = async (songData) => {
    try {
      console.log(`🎵 setTrack chamado para: ${songData.title}`)
      currentTrack.value = songData
      
      const albumInfo = await searchAlbumCover(songData.artist, songData.title)
      if (albumInfo) {
        songData.albumCover = albumInfo.albumCover
        currentTrack.value = { ...songData }
      }
      
      await updateDynamicBackground(currentTrack.value.albumCover)
      
      if (audioPlayer.value) {
        audioPlayer.value.pause()
        audioPlayer.value.currentTime = 0
      }
      
      isPlaying.value = true
      return true
    } catch (error) {
      console.error('Erro ao definir faixa:', error)
      return false
    }
  }

  // Seek para posição específica (ms)
  const seek = (positionMs) => {
    if (audioPlayer.value) {
      audioPlayer.value.currentTime = positionMs / 1000
      position.value = positionMs
    }
  }
  
  return {
    // State
    currentTrack,
    isPlaying,
    position,
    duration,
    playlist,
    audioPlayer,
    
    // Methods
    initializePlayer,
    playSong,
    togglePlayback,
    previousTrack,
    nextTrack,
    addTrack,
    getCurrentPlayback,
    formatTime,
    searchAlbumCover,
    extractDominantColor,
    applyDynamicTheme,
    updateSongsList,
    setTrack,
    seek,
    queue,
    addToQueue,
    detectImageBrightness: async (src) => { // Wrapper para compatibilidade
      return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          canvas.width = 1
          canvas.height = 1
          ctx.drawImage(img, 0, 0, 1, 1)
          const data = ctx.getImageData(0, 0, 1, 1).data
          const brightness = (0.299 * data[0] + 0.587 * data[1] + 0.114 * data[2]) / 255
          resolve(brightness)
        }
        img.onerror = () => resolve(0)
        img.src = src
      })
    }
  }
} 