// ========================================
// PlayOff - Friends System Composable
// Gerenciamento de amigos e atividades sociais
// ========================================

import { ref, computed } from 'vue'

// Estado compartilhado entre componentes
const friends = ref([])
const pendingRequests = ref([])
const searchResults = ref([])
const isLoading = ref(false)
const error = ref(null)

// URL base da API
const API_URL = ''

export function useFriends() {
  
  // ============= HELPERS =============
  
  const getAuthHeaders = () => {
    const spotifyId = localStorage.getItem('spotify_id')
    const spotifyToken = localStorage.getItem('spotify_access_token')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${spotifyId}`,
      'X-Spotify-Token': spotifyToken
    }
  }
  
  // ============= BUSCA DE USUÁRIOS =============
  
  // Busca usuários por nome
  const searchUsers = async (query) => {
    if (!query || query.length < 2) {
      searchResults.value = []
      return []
    }
    
    isLoading.value = true
    error.value = null
    
    try {
      const response = await fetch(`${API_URL}/auth/users/search?q=${encodeURIComponent(query)}`, {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const users = await response.json()
        searchResults.value = users
        return users
      } else {
        throw new Error('Erro ao buscar usuários')
      }
    } catch (err) {
      console.error('❌ Erro ao buscar usuários:', err)
      error.value = err.message
      return []
    } finally {
      isLoading.value = false
    }
  }
  
  // ============= LISTA DE AMIGOS =============
  
  // Carrega lista de amigos
  const loadFriends = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await fetch(`${API_URL}/auth/me/friends`, {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        friends.value = await response.json()
        return friends.value
      } else {
        throw new Error('Erro ao carregar amigos')
      }
    } catch (err) {
      console.error('❌ Erro ao carregar amigos:', err)
      error.value = err.message
      return []
    } finally {
      isLoading.value = false
    }
  }
  
  // Carrega pedidos pendentes
  const loadPendingRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me/friends/pending`, {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        pendingRequests.value = await response.json()
        return pendingRequests.value
      }
    } catch (err) {
      console.error('❌ Erro ao carregar pedidos:', err)
    }
    return []
  }
  
  // ============= AÇÕES DE AMIZADE =============
  
  // Envia pedido de amizade
  const sendFriendRequest = async (friendId) => {
    isLoading.value = true
    
    try {
      const response = await fetch(`${API_URL}/auth/me/friends/request`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ friendId })
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // Atualiza o status na lista de busca
        const user = searchResults.value.find(u => u.id === friendId)
        if (user) {
          user.friendship_status = result.status
        }
        
        return result
      } else {
        const err = await response.json()
        throw new Error(err.error || 'Erro ao enviar pedido')
      }
    } catch (err) {
      console.error('❌ Erro ao enviar pedido:', err)
      error.value = err.message
      return { success: false, message: err.message }
    } finally {
      isLoading.value = false
    }
  }
  
  // Aceita pedido de amizade
  const acceptFriendRequest = async (friendId) => {
    isLoading.value = true
    
    try {
      const response = await fetch(`${API_URL}/auth/me/friends/accept`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ friendId })
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // Remove da lista de pendentes
        pendingRequests.value = pendingRequests.value.filter(r => r.id !== friendId)
        
        // Recarrega lista de amigos
        await loadFriends()
        
        return result
      } else {
        throw new Error('Erro ao aceitar pedido')
      }
    } catch (err) {
      console.error('❌ Erro ao aceitar pedido:', err)
      error.value = err.message
      return { success: false, message: err.message }
    } finally {
      isLoading.value = false
    }
  }
  
  // Remove amigo ou recusa pedido
  const removeFriend = async (friendId) => {
    isLoading.value = true
    
    try {
      const response = await fetch(`${API_URL}/auth/me/friends/${friendId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        // Remove das listas locais
        friends.value = friends.value.filter(f => f.id !== friendId)
        pendingRequests.value = pendingRequests.value.filter(r => r.id !== friendId)
        
        // Atualiza status na busca
        const user = searchResults.value.find(u => u.id === friendId)
        if (user) {
          user.friendship_status = null
        }
        
        return { success: true }
      } else {
        throw new Error('Erro ao remover amigo')
      }
    } catch (err) {
      console.error('❌ Erro ao remover amigo:', err)
      error.value = err.message
      return { success: false }
    } finally {
      isLoading.value = false
    }
  }
  
  // ============= ATIVIDADE DE AMIGO =============
  
  // Busca atividade de um amigo
  const getFriendActivity = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/auth/users/${userId}/activity`, {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        return await response.json()
      } else {
        throw new Error('Erro ao buscar atividade')
      }
    } catch (err) {
      console.error('❌ Erro ao buscar atividade:', err)
      return null
    }
  }
  
  // Verifica status de amizade com usuário
  const checkFriendshipStatus = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/auth/me/friends/status/${userId}`, {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.status
      }
    } catch (err) {
      console.error('❌ Erro ao verificar status:', err)
    }
    return 'none'
  }
  
  // ============= COMPUTED =============
  
  const friendsCount = computed(() => friends.value.length)
  const pendingCount = computed(() => pendingRequests.value.length)
  const hasPendingRequests = computed(() => pendingRequests.value.length > 0)
  
  // ============= RETURN =============
  
  return {
    // Estado
    friends,
    pendingRequests,
    searchResults,
    isLoading,
    error,
    
    // Computed
    friendsCount,
    pendingCount,
    hasPendingRequests,
    
    // Métodos
    searchUsers,
    loadFriends,
    loadPendingRequests,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
    getFriendActivity,
    checkFriendshipStatus
  }
}
