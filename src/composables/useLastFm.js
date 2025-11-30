// ========================================
// PlayOff - Last.fm Composable
// Integração com Last.fm para scrobbling, charts e recomendações
// ========================================

import { ref, computed } from 'vue'

// Estado global do Last.fm
const lastfmUser = ref(localStorage.getItem('lastfm_user') || null)
const lastfmSessionKey = ref(localStorage.getItem('lastfm_session_key') || null)
const isConnected = computed(() => !!lastfmSessionKey.value)

// Cache para evitar chamadas repetidas
const chartsCache = ref({
  topTracks: null,
  topArtists: null,
  lastFetch: null
})

// Estado de loading
const isLoading = ref(false)

export function useLastFm() {
  
  // ============= AUTHENTICATION =============
  
  // Processa callback do Last.fm (chamado no App.vue)
  const processCallback = () => {
    const params = new URLSearchParams(window.location.search)
    const user = params.get('lastfm_user')
    const key = params.get('lastfm_key')
    
    if (user && key) {
      lastfmUser.value = user
      lastfmSessionKey.value = key
      localStorage.setItem('lastfm_user', user)
      localStorage.setItem('lastfm_session_key', key)
      
      // Limpa URL
      window.history.replaceState({}, '', '/')
      
      console.log('🎵 Last.fm conectado:', user)
      return true
    }
    return false
  }

  // Inicia conexão com Last.fm
  const connect = async () => {
    try {
      const response = await fetch('/auth/lastfm/connect')
      const data = await response.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error('Erro ao conectar Last.fm:', error)
    }
  }

  // Desconecta Last.fm
  const disconnect = () => {
    lastfmUser.value = null
    lastfmSessionKey.value = null
    localStorage.removeItem('lastfm_user')
    localStorage.removeItem('lastfm_session_key')
    console.log('🎵 Last.fm desconectado')
  }

  // ============= SCROBBLING =============

  // Atualiza "Now Playing"
  const updateNowPlaying = async (track) => {
    if (!isConnected.value || !track) return

    try {
      await fetch('/auth/lastfm/nowplaying', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionKey: lastfmSessionKey.value,
          artist: track.artist,
          track: track.title || track.name,
          album: track.album,
          duration: track.duration_ms || track.duration
        })
      })
      console.log('🎵 Last.fm: Now Playing atualizado')
    } catch (error) {
      console.error('Erro ao atualizar Now Playing:', error)
    }
  }

  // Scrobble (registra que ouviu a música)
  const scrobble = async (track) => {
    if (!isConnected.value || !track) return

    try {
      const response = await fetch('/auth/lastfm/scrobble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionKey: lastfmSessionKey.value,
          artist: track.artist,
          track: track.title || track.name,
          album: track.album,
          duration: track.duration_ms || track.duration
        })
      })
      
      if (response.ok) {
        console.log('🎵 Last.fm: Scrobbled!', track.title || track.name)
      }
    } catch (error) {
      console.error('Erro ao scrobblar:', error)
    }
  }

  // ============= CHARTS =============

  // Top músicas globais
  const getTopTracks = async (limit = 20) => {
    // Usa cache se disponível e recente (5 min)
    if (chartsCache.value.topTracks && 
        chartsCache.value.lastFetch && 
        Date.now() - chartsCache.value.lastFetch < 300000) {
      return chartsCache.value.topTracks
    }

    isLoading.value = true
    try {
      const response = await fetch(`/auth/lastfm/charts/tracks?limit=${limit}`)
      const data = await response.json()
      chartsCache.value.topTracks = data
      chartsCache.value.lastFetch = Date.now()
      return data
    } catch (error) {
      console.error('Erro ao buscar top tracks:', error)
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Top artistas globais
  const getTopArtists = async (limit = 20) => {
    if (chartsCache.value.topArtists && 
        chartsCache.value.lastFetch && 
        Date.now() - chartsCache.value.lastFetch < 300000) {
      return chartsCache.value.topArtists
    }

    isLoading.value = true
    try {
      const response = await fetch(`/auth/lastfm/charts/artists?limit=${limit}`)
      const data = await response.json()
      chartsCache.value.topArtists = data
      return data
    } catch (error) {
      console.error('Erro ao buscar top artistas:', error)
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Top por gênero
  const getTopByGenre = async (genre, limit = 20) => {
    isLoading.value = true
    try {
      const response = await fetch(`/auth/lastfm/charts/tag/${encodeURIComponent(genre)}?limit=${limit}`)
      return await response.json()
    } catch (error) {
      console.error('Erro ao buscar por gênero:', error)
      return []
    } finally {
      isLoading.value = false
    }
  }

  // ============= RECOMMENDATIONS =============

  // Artistas similares
  const getSimilarArtists = async (artist, limit = 10) => {
    try {
      const response = await fetch(`/auth/lastfm/similar/artists/${encodeURIComponent(artist)}?limit=${limit}`)
      return await response.json()
    } catch (error) {
      console.error('Erro ao buscar artistas similares:', error)
      return []
    }
  }

  // Músicas similares
  const getSimilarTracks = async (artist, track, limit = 10) => {
    try {
      const response = await fetch(`/auth/lastfm/similar/tracks?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&limit=${limit}`)
      return await response.json()
    } catch (error) {
      console.error('Erro ao buscar músicas similares:', error)
      return []
    }
  }

  // Recomendações personalizadas (requer Last.fm conectado)
  const getRecommendations = async (limit = 20) => {
    if (!lastfmUser.value) return []

    isLoading.value = true
    try {
      const response = await fetch(`/auth/lastfm/user/${lastfmUser.value}/recommendations?limit=${limit}`)
      return await response.json()
    } catch (error) {
      console.error('Erro ao buscar recomendações:', error)
      return []
    } finally {
      isLoading.value = false
    }
  }

  // ============= USER DATA =============

  // Info do usuário Last.fm
  const getUserInfo = async (username = null) => {
    const user = username || lastfmUser.value
    if (!user) return null

    try {
      const response = await fetch(`/auth/lastfm/user/${user}`)
      return await response.json()
    } catch (error) {
      console.error('Erro ao buscar info do usuário:', error)
      return null
    }
  }

  // Top músicas do usuário
  const getUserTopTracks = async (period = '7day', limit = 10, username = null) => {
    const user = username || lastfmUser.value
    if (!user) return []

    try {
      const response = await fetch(`/auth/lastfm/user/${user}/top/tracks?period=${period}&limit=${limit}`)
      return await response.json()
    } catch (error) {
      console.error('Erro ao buscar top tracks do usuário:', error)
      return []
    }
  }

  // Top artistas do usuário
  const getUserTopArtists = async (period = '7day', limit = 10, username = null) => {
    const user = username || lastfmUser.value
    if (!user) return []

    try {
      const response = await fetch(`/auth/lastfm/user/${user}/top/artists?period=${period}&limit=${limit}`)
      return await response.json()
    } catch (error) {
      console.error('Erro ao buscar top artistas do usuário:', error)
      return []
    }
  }

  // Músicas recentes do usuário
  const getUserRecentTracks = async (limit = 20, username = null) => {
    const user = username || lastfmUser.value
    if (!user) return []

    try {
      const response = await fetch(`/auth/lastfm/user/${user}/recent?limit=${limit}`)
      return await response.json()
    } catch (error) {
      console.error('Erro ao buscar músicas recentes:', error)
      return []
    }
  }

  // ============= SEARCH =============

  // Buscar músicas
  const searchTracks = async (query, limit = 20) => {
    if (!query) return []

    isLoading.value = true
    try {
      const response = await fetch(`/auth/lastfm/search/tracks?q=${encodeURIComponent(query)}&limit=${limit}`)
      return await response.json()
    } catch (error) {
      console.error('Erro na busca:', error)
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Buscar artistas
  const searchArtists = async (query, limit = 20) => {
    if (!query) return []

    try {
      const response = await fetch(`/auth/lastfm/search/artists?q=${encodeURIComponent(query)}&limit=${limit}`)
      return await response.json()
    } catch (error) {
      console.error('Erro na busca:', error)
      return []
    }
  }

  // Info de uma música
  const getTrackInfo = async (artist, track) => {
    try {
      const url = `/auth/lastfm/track/info?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`
      const response = await fetch(url + (lastfmUser.value ? `&username=${lastfmUser.value}` : ''))
      return await response.json()
    } catch (error) {
      console.error('Erro ao buscar info da música:', error)
      return null
    }
  }

  // Top tracks de um artista
  const getArtistTopTracks = async (artist, limit = 10) => {
    try {
      const response = await fetch(`/auth/lastfm/artist/${encodeURIComponent(artist)}/top?limit=${limit}`)
      return await response.json()
    } catch (error) {
      console.error('Erro ao buscar top do artista:', error)
      return []
    }
  }

  return {
    // Estado
    lastfmUser,
    lastfmSessionKey,
    isConnected,
    isLoading,
    
    // Auth
    processCallback,
    connect,
    disconnect,
    
    // Scrobbling
    updateNowPlaying,
    scrobble,
    
    // Charts
    getTopTracks,
    getTopArtists,
    getTopByGenre,
    
    // Recommendations
    getSimilarArtists,
    getSimilarTracks,
    getRecommendations,
    
    // User Data
    getUserInfo,
    getUserTopTracks,
    getUserTopArtists,
    getUserRecentTracks,
    
    // Search
    searchTracks,
    searchArtists,
    getTrackInfo,
    getArtistTopTracks
  }
}
