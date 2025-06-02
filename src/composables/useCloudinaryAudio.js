import { ref, reactive } from 'vue'

export function useCloudinaryAudio() {
  // Configuration
  const cloudName = 'dzwfuzxxw'
  const apiKey = '888348989441951'
  const apiSecret = 'SoIbMkMvEBoth_Xbt0I8Ew96JuY'
  const lastFmApiKey = 'b25b959554ed76058ac220b7b2e0a026'
  const lastFmBaseUrl = 'https://ws.audioscrobbler.com/2.0/'
  
  // Spotify API Configuration
  const spotifyClientId = '1fd9e79e2e074a33b258c30747f74e6b'
  const spotifyClientSecret = '3bc40e26370c43818ec3612d25fcbf96'
  const spotifyBaseUrl = 'https://api.spotify.com/v1'
  
  // Reactive state
  const currentTrack = ref(null)
  const isPlaying = ref(false)
  const position = ref(0)
  const duration = ref(0)
  const playlist = ref([])
  const audioPlayer = ref(null)
  const spotifyToken = ref(null)
  const spotifyTokenExpiry = ref(null)
  const currentSongsList = ref([]) // Lista de músicas para navegação
  
  // Initialize ColorThief for better color extraction
  let colorThief = null
  
  // Spotify Authentication - Client Credentials Flow
  const authenticateSpotify = async () => {
    try {
      // Check if token is still valid
      if (spotifyToken.value && spotifyTokenExpiry.value > Date.now()) {
        return spotifyToken.value
      }
      
      console.log('🎵 Autenticando com Spotify...')
      
      const credentials = btoa(`${spotifyClientId}:${spotifyClientSecret}`)
      
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
        throw new Error(`Spotify auth failed: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      spotifyToken.value = data.access_token
      spotifyTokenExpiry.value = Date.now() + (data.expires_in * 1000) - 60000 // 1 minute buffer
      
      console.log('✅ Spotify autenticado com sucesso!')
      console.log(`⏰ Token expira em: ${new Date(spotifyTokenExpiry.value).toLocaleTimeString()}`)
      return spotifyToken.value
      
    } catch (error) {
      console.error('❌ Erro na autenticação Spotify:', error)
      console.warn('⚠️ Continuando com APIs de fallback (Last.fm, MusicBrainz)')
      return null
    }
  }
  
  // Search for track on Spotify
  const searchSpotifyTrack = async (artist, track) => {
    try {
      const token = await authenticateSpotify()
      if (!token) {
        console.log('⚠️ Token Spotify não disponível, usando fallback')
        return null
      }
      
      // Clean and encode search query
      const cleanArtist = artist.replace(/[^\w\s]/gi, '').trim()
      const cleanTrack = track.replace(/[^\w\s]/gi, '').trim()
      const query = encodeURIComponent(`track:"${cleanTrack}" artist:"${cleanArtist}"`)
      const url = `${spotifyBaseUrl}/search?q=${query}&type=track&limit=3`
      
      console.log(`🔍 Buscando no Spotify: ${cleanArtist} - ${cleanTrack}`)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.warn(`⚠️ Spotify search failed: ${response.status} - ${errorText}`)
        return null
      }
      
      const data = await response.json()
      
      if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
        // Try to find the best match
        let bestMatch = data.tracks.items[0]
        
        // Look for exact or close match
        for (const spotifyTrack of data.tracks.items) {
          const trackNameMatch = spotifyTrack.name.toLowerCase().includes(cleanTrack.toLowerCase())
          const artistNameMatch = spotifyTrack.artists.some(a => 
            a.name.toLowerCase().includes(cleanArtist.toLowerCase())
          )
          
          if (trackNameMatch && artistNameMatch) {
            bestMatch = spotifyTrack
            break
          }
        }
        
        const album = bestMatch.album
        
        if (album.images && album.images.length > 0) {
          // Get the highest quality image (first in array is typically 640x640)
          const albumCover = album.images[0].url
          console.log(`✅ Capa encontrada via Spotify: ${albumCover}`)
          console.log(`🎯 Match encontrado: "${bestMatch.name}" por ${bestMatch.artists[0]?.name}`)
          
          return {
            albumCover: albumCover,
            albumName: album.name,
            artist: bestMatch.artists[0]?.name || artist,
            trackName: bestMatch.name,
            spotifyUrl: bestMatch.external_urls?.spotify,
            releaseDate: album.release_date,
            popularity: bestMatch.popularity,
            albumType: album.album_type,
            totalTracks: album.total_tracks
          }
        }
      }
      
      console.log('❌ Nenhuma capa encontrada no Spotify para esta busca')
      return null
      
    } catch (error) {
      console.error('❌ Erro na busca Spotify:', error)
      console.warn('⚠️ Continuando com APIs de fallback')
      return null
    }
  }
  
  // Initialize audio player
  const initializePlayer = () => {
    console.log('🎵 Inicializando Cloudinary Audio Player...')
    
    audioPlayer.value = new Audio()
    audioPlayer.value.preload = 'auto'
    audioPlayer.value.volume = 0
    audioPlayer.value.crossOrigin = 'anonymous'
    
    setupAudioEvents()
    initializeColorThief()
    
    // Initialize Spotify authentication
    authenticateSpotify()
    
    // Apply black theme by default (no music playing)
    initializeTheme()
    
    console.log('✅ Cloudinary Audio Player inicializado!')
    return Promise.resolve(true)
  }
  
  // Initialize ColorThief library
  const initializeColorThief = () => {
    try {
      // Load ColorThief from CDN if not already loaded
      if (typeof ColorThief === 'undefined') {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/color-thief/2.3.0/color-thief.umd.js'
        script.onload = () => {
          colorThief = new ColorThief()
          console.log('🎨 ColorThief carregado!')
        }
        document.head.appendChild(script)
      } else {
        colorThief = new ColorThief()
        console.log('🎨 ColorThief já disponível!')
      }
    } catch (error) {
      console.warn('⚠️ ColorThief não disponível, usando detecção manual de cor')
    }
  }
  
  // Setup audio event listeners with gradual volume increase
  const setupAudioEvents = () => {
    if (!audioPlayer.value) return
    
    audioPlayer.value.addEventListener('loadedmetadata', () => {
      duration.value = audioPlayer.value.duration * 1000
      console.log(`📊 Duração da música: ${formatTime(duration.value)}`)
    })
    
    audioPlayer.value.addEventListener('timeupdate', () => {
      position.value = audioPlayer.value.currentTime * 1000
    })
    
    audioPlayer.value.addEventListener('play', () => {
      isPlaying.value = true
      console.log('▶️ Música iniciada')
      // Gradual volume increase
      gradualVolumeIncrease()
    })
    
    audioPlayer.value.addEventListener('pause', () => {
      isPlaying.value = false
      console.log('⏸️ Música pausada')
    })
    
    audioPlayer.value.addEventListener('ended', () => {
      isPlaying.value = false
      console.log('⏹️ Música finalizada')
      // Automaticamente ir para a próxima música
      if (currentSongsList.value && currentSongsList.value.length > 0) {
        console.log('🔄 Tentando ir para próxima música automaticamente...')
        nextTrack(currentSongsList.value)
      }
    })
    
    audioPlayer.value.addEventListener('error', (e) => {
      console.error('❌ Erro no player de áudio:', e)
      console.error('❌ URL que causou erro:', audioPlayer.value.src)
      isPlaying.value = false
    })
    
    audioPlayer.value.addEventListener('loadstart', () => {
      console.log('📡 Carregando música...')
    })
    
    audioPlayer.value.addEventListener('canplay', () => {
      console.log('✅ Música pronta para tocar')
    })
  }
  
  // Gradual volume increase for smooth audio experience
  const gradualVolumeIncrease = () => {
    const targetVolume = 0.7
    const fadeTime = 2000 // 2 seconds
    const steps = 50
    const stepTime = fadeTime / steps
    const volumeStep = targetVolume / steps
    
    let currentStep = 0
    
    const fadeInterval = setInterval(() => {
      if (currentStep >= steps || !isPlaying.value) {
        clearInterval(fadeInterval)
        audioPlayer.value.volume = targetVolume
        return
      }
      
      audioPlayer.value.volume = volumeStep * currentStep
      currentStep++
    }, stepTime)
  }
  
  // Enhanced album cover search with Spotify as primary source
  const searchAlbumCover = async (artist, track) => {
    try {
      console.log(`🔍 Buscando capa para: ${artist} - ${track}`)
      
      // Try Spotify first (highest quality and most reliable)
      const spotifyInfo = await searchSpotifyTrack(artist, track)
      if (spotifyInfo) return spotifyInfo
      
      // Try Last.fm track info as fallback
      const trackInfo = await fetchLastFmTrackInfo(artist, track)
      if (trackInfo) return trackInfo
      
      // Try Last.fm artist top albums as fallback
      const artistInfo = await fetchLastFmArtistTopAlbum(artist)
      if (artistInfo) return artistInfo
      
      // Try MusicBrainz + Cover Art Archive as last resort
      const musicBrainzInfo = await fetchMusicBrainzCover(artist, track)
      if (musicBrainzInfo) return musicBrainzInfo
      
      return null
    } catch (error) {
      console.error('❌ Erro ao buscar capa:', error)
      return null
    }
  }
  
  // Fetch track info from Last.fm
  const fetchLastFmTrackInfo = async (artist, track) => {
    try {
      const url = `${lastFmBaseUrl}?method=track.getinfo&api_key=${lastFmApiKey}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.track && data.track.album && data.track.album.image) {
        const images = data.track.album.image
        const largestImage = images[images.length - 1]
        
        if (largestImage && largestImage['#text']) {
          console.log(`✅ Capa encontrada via Last.fm track para ${artist} - ${track}`)
          return {
            albumCover: largestImage['#text'],
            albumName: data.track.album.title || 'Unknown Album'
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('❌ Erro Last.fm track:', error)
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
  
  // Extract dominant color from album cover using ColorThief
  const extractDominantColor = async (imageUrl) => {
    return new Promise((resolve) => {
      if (!colorThief) {
        resolve(null)
        return
      }
      
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          const dominantColor = colorThief.getColor(img)
          const palette = colorThief.getPalette(img, 5)
          
          console.log(`🎨 Cor dominante extraída: rgb(${dominantColor.join(', ')})`)
          
          resolve({
            dominant: dominantColor,
            palette: palette,
            theme: getThemeFromRGB(dominantColor[0], dominantColor[1], dominantColor[2])
          })
        } catch (error) {
          console.error('❌ Erro ao extrair cor:', error)
          resolve(null)
        }
      }
      
      img.onerror = () => resolve(null)
      img.src = imageUrl
    })
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
      
      // Always search for Spotify album cover for better quality
      console.log('🔍 Sempre buscando capa do álbum via Spotify para melhor qualidade...')
      const albumInfo = await searchAlbumCover(songData.artist, songData.title)
      
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
      
      // Set the audio source to the Cloudinary URL
      audioPlayer.value.src = songData.audioUrl
      
      // Load and play
      await audioPlayer.value.load()
      await audioPlayer.value.play()
      
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
  
  // Next track - vai para a próxima música na lista
  const nextTrack = async (songsList = []) => {
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
  
  return {
    // State
    currentTrack,
    isPlaying,
    position,
    duration,
    playlist,
    
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
    detectImageBrightness,
    initializeTheme,
    updateSongsList
  }
} 