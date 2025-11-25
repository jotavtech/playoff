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

  // URL base da API - usa caminho relativo para aproveitar proxy do Vite
  const API_URL = ''

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

  // Busca perfil do usuário
  const fetchUserProfile = async () => {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('spotify_id')}`
        }
      })
      
      if (response.ok) {
        user.value = await response.json()
        console.log('👤 Perfil do usuário carregado:', user.value.display_name)
      } else if (response.status === 401) {
        // Token expirado, tenta renovar
        const refreshed = await refreshToken()
        if (refreshed) {
          await fetchUserProfile()
        } else {
          logout()
        }
      }
    } catch (err) {
      console.error('❌ Erro ao buscar perfil:', err)
      error.value = 'Erro ao carregar perfil'
    } finally {
      isLoading.value = false
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
    login,
    logout,
    checkAuth,
    refreshToken,
    fetchUserProfile,
    getUserTopSongs,
    getUserHistory,
    registerPlay
  }
}
