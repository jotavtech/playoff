// ========================================
// PlayOff - Authentication Composable
// Gerencia autenticação com Spotify OAuth
// ========================================

import { ref, computed, onMounted } from 'vue'

export function useAuth() {
  const user = ref(null)
  const isAuthenticated = computed(() => !!user.value)
  const spotifyAccessToken = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const likedSongIds = ref(new Set()) // IDs das músicas curtidas

  // URL base da API - usa caminho relativo para aproveitar proxy do Vite
  const API_URL = ''

  // Função helper para gerar headers de autenticação
  const getAuthHeaders = (includeContentType = false) => {
    const headers = {
      'Authorization': `Bearer ${localStorage.getItem('spotify_id')}`,
      'X-Spotify-Token': localStorage.getItem('spotify_access_token') || ''
    }
    if (includeContentType) {
      headers['Content-Type'] = 'application/json'
    }
    return headers
  }

  // Verifica se usuário está logado (via URL params após callback)
  const checkAuth = () => {
    const params = new URLSearchParams(window.location.search)
    const spotifyId = params.get('spotify_id')
    const accessToken = params.get('access_token')
    const authError = params.get('error')

    if (authError) {
      error.value = authError
      window.history.replaceState({}, '', '/')
      return
    }

    if (spotifyId && accessToken) {
      spotifyAccessToken.value = accessToken
      localStorage.setItem('spotify_id', spotifyId)
      localStorage.setItem('spotify_access_token', accessToken)
      
      // Limpa URL
      window.history.replaceState({}, '', '/')
      
      // Busca perfil completo
      fetchUserProfile()
    } else {
      // Tenta recuperar do localStorage
      const savedSpotifyId = localStorage.getItem('spotify_id')
      const savedToken = localStorage.getItem('spotify_access_token')
      
      if (savedSpotifyId && savedToken) {
        spotifyAccessToken.value = savedToken
        fetchUserProfile()
      }
    }
  }

  // Busca perfil do usuário - SEMPRE busca direto do Spotify para garantir dados corretos
  const fetchUserProfile = async () => {
    isLoading.value = true
    error.value = null

    const spotifyId = localStorage.getItem('spotify_id')
    const savedToken = localStorage.getItem('spotify_access_token')

    // Sempre busca direto do Spotify API para ter dados atualizados
    if (savedToken) {
      console.log('🎵 Buscando perfil do Spotify API...')
      await fetchProfileFromSpotify(savedToken, spotifyId)
    } else {
      console.error('❌ Sem token para buscar perfil')
      // Fallback mínimo
      if (spotifyId) {
        user.value = {
          spotify_id: spotifyId,
          display_name: spotifyId,
          profile_image: null
        }
      }
    }
    
    isLoading.value = false
  }

  // Fallback: busca perfil diretamente da API do Spotify
  const fetchProfileFromSpotify = async (token, spotifyId) => {
    if (!token) {
      console.error('❌ Sem token para buscar perfil do Spotify')
      return
    }

    try {
      console.log('🎵 Buscando perfil diretamente do Spotify API...')
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const profile = await response.json()
        user.value = {
          spotify_id: profile.id,
          display_name: profile.display_name,
          email: profile.email,
          profile_image: profile.images?.[0]?.url || null,
          country: profile.country
        }
        console.log('✅ Perfil carregado do Spotify:', user.value.display_name)
      } else {
        console.error('❌ Falha ao buscar perfil do Spotify:', response.status)
        // Último recurso: cria usuário mínimo com spotify_id
        if (spotifyId) {
          user.value = {
            spotify_id: spotifyId,
            display_name: spotifyId,
            profile_image: null
          }
          console.log('⚠️ Usando perfil mínimo com spotify_id')
        }
      }
    } catch (err) {
      console.error('❌ Erro ao buscar perfil do Spotify:', err)
      // Último recurso
      if (spotifyId) {
        user.value = {
          spotify_id: spotifyId,
          display_name: spotifyId,
          profile_image: null
        }
        console.log('⚠️ Usando perfil mínimo com spotify_id')
      }
    }
  }

  // Renova access token
  const refreshToken = async () => {
    const spotifyId = localStorage.getItem('spotify_id')
    
    if (!spotifyId) return false

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotify_id: spotifyId })
      })

      if (response.ok) {
        const data = await response.json()
        spotifyAccessToken.value = data.access_token
        localStorage.setItem('spotify_access_token', data.access_token)
        console.log('🔄 Token renovado com sucesso')
        return true
      }

      return false
    } catch (err) {
      console.error('❌ Erro ao renovar token:', err)
      return false
    }
  }

  // Inicia processo de login
  const login = async () => {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_URL}/auth/login`)
      const data = await response.json()
      
      // Salva state no localStorage para validação
      localStorage.setItem('spotify_auth_state', data.state)
      
      // Redireciona para página de autenticação do Spotify
      window.location.href = data.authUrl
    } catch (err) {
      console.error('❌ Erro ao iniciar login:', err)
      error.value = 'Erro ao conectar com Spotify'
      isLoading.value = false
    }
  }

  // Logout
  const logout = () => {
    user.value = null
    spotifyAccessToken.value = null
    localStorage.removeItem('spotify_id')
    localStorage.removeItem('spotify_access_token')
    localStorage.removeItem('spotify_auth_state')
    console.log('👋 Usuário deslogado')
  }

  // Busca top músicas do usuário
  const getUserTopSongs = async (limit = 20) => {
    if (!isAuthenticated.value) return []

    try {
      const response = await fetch(`${API_URL}/auth/me/top-songs?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('spotify_id')}`
        }
      })

      if (response.ok) {
        return await response.json()
      }

      return []
    } catch (err) {
      console.error('❌ Erro ao buscar top músicas:', err)
      return []
    }
  }

  // Busca histórico de reprodução
  const getUserHistory = async (limit = 50) => {
    if (!isAuthenticated.value) return []

    try {
      const response = await fetch(`${API_URL}/auth/me/history?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('spotify_id')}`
        }
      })

      if (response.ok) {
        return await response.json()
      }

      return []
    } catch (err) {
      console.error('❌ Erro ao buscar histórico:', err)
      return []
    }
  }

  // Registra uma reprodução
  const registerPlay = async (songData) => {
    if (!isAuthenticated.value) return false

    try {
      const response = await fetch(`${API_URL}/auth/play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('spotify_id')}`
        },
        body: JSON.stringify({
          spotify_id: songData.spotifyId,
          duration_ms: songData.duration,
          completed: songData.completed,
          source: 'playoff'
        })
      })

      return response.ok
    } catch (err) {
      console.error('❌ Erro ao registrar reprodução:', err)
      return false
    }
  }

  // ============= LIKED SONGS =============

  // Carrega IDs das músicas curtidas
  const loadLikedSongIds = async () => {
    if (!isAuthenticated.value) return

    try {
      const response = await fetch(`${API_URL}/auth/me/liked/ids`, {
        headers: getAuthHeaders()
      })

      if (response.ok) {
        const ids = await response.json()
        likedSongIds.value = new Set(ids)
        console.log(`❤️ Carregadas ${ids.length} músicas curtidas`)
      }
    } catch (err) {
      console.error('❌ Erro ao carregar músicas curtidas:', err)
    }
  }

  // Busca músicas curtidas completas
  const getLikedSongs = async (limit = 100) => {
    if (!isAuthenticated.value) return []

    try {
      const response = await fetch(`${API_URL}/auth/me/liked?limit=${limit}`, {
        headers: getAuthHeaders()
      })

      if (response.ok) {
        return await response.json()
      }

      return []
    } catch (err) {
      console.error('❌ Erro ao buscar músicas curtidas:', err)
      return []
    }
  }

  // Verifica se uma música está curtida
  const isLiked = (spotifyTrackId) => {
    return likedSongIds.value.has(spotifyTrackId)
  }

  // Curtir uma música
  const likeSong = async (songData) => {
    if (!isAuthenticated.value) return false

    try {
      const response = await fetch(`${API_URL}/auth/me/like`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          spotify_track_id: songData.id || songData.spotify_track_id,
          title: songData.title || songData.name,
          artist: songData.artist || songData.artists?.[0]?.name,
          album: songData.album || songData.album?.name,
          album_cover: songData.albumCover || songData.album_cover || songData.album?.images?.[0]?.url,
          spotify_url: songData.spotifyUrl || songData.spotify_url || songData.external_urls?.spotify,
          duration_ms: songData.duration_ms || songData.duration
        })
      })

      if (response.ok) {
        const trackId = songData.id || songData.spotify_track_id
        // Cria novo Set para garantir reatividade
        const newSet = new Set(likedSongIds.value)
        newSet.add(trackId)
        likedSongIds.value = newSet
        console.log(`❤️ Curtiu: ${songData.title || songData.name}`)
        return true
      }

      return false
    } catch (err) {
      console.error('❌ Erro ao curtir música:', err)
      return false
    }
  }

  // Descurtir uma música
  const unlikeSong = async (spotifyTrackId) => {
    if (!isAuthenticated.value) return false

    try {
      const response = await fetch(`${API_URL}/auth/me/like/${encodeURIComponent(spotifyTrackId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (response.ok) {
        // Cria novo Set para garantir reatividade
        const newSet = new Set(likedSongIds.value)
        newSet.delete(spotifyTrackId)
        likedSongIds.value = newSet
        console.log(`💔 Descurtiu: ${spotifyTrackId}`)
        return true
      }

      return false
    } catch (err) {
      console.error('❌ Erro ao descurtir música:', err)
      return false
    }
  }

  // Toggle like/unlike
  const toggleLike = async (songData) => {
    const trackId = songData.id || songData.spotify_track_id
    if (isLiked(trackId)) {
      return await unlikeSong(trackId)
    } else {
      return await likeSong(songData)
    }
  }

  // Inicializa verificação de autenticação
  onMounted(() => {
    checkAuth()
  })

  return {
    user,
    isAuthenticated,
    spotifyAccessToken,
    isLoading,
    error,
    likedSongIds,
    login,
    logout,
    checkAuth,
    refreshToken,
    fetchUserProfile,
    getUserTopSongs,
    getUserHistory,
    registerPlay,
    // Liked songs
    loadLikedSongIds,
    getLikedSongs,
    isLiked,
    likeSong,
    unlikeSong,
    toggleLike
  }
}
