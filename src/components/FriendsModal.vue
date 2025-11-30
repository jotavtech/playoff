<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="friends-overlay" @click.self="$emit('close')">
        <div class="friends-modal">
          <!-- Header -->
          <div class="modal-header">
            <h2 class="modal-title">
              <i class="fas fa-users"></i>
              AMIGOS
            </h2>
            <button class="close-btn" @click="$emit('close')">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Tabs -->
          <div class="tabs">
            <button 
              class="tab" 
              :class="{ active: activeTab === 'friends' }"
              @click="activeTab = 'friends'"
            >
              <i class="fas fa-user-friends"></i>
              Amigos
              <span class="badge" v-if="friendsCount > 0">{{ friendsCount }}</span>
            </button>
            <button 
              class="tab" 
              :class="{ active: activeTab === 'search' }"
              @click="activeTab = 'search'"
            >
              <i class="fas fa-search"></i>
              Buscar
            </button>
            <button 
              class="tab" 
              :class="{ active: activeTab === 'pending' }"
              @click="activeTab = 'pending'"
            >
              <i class="fas fa-clock"></i>
              Pedidos
              <span class="badge pending" v-if="pendingCount > 0">{{ pendingCount }}</span>
            </button>
          </div>

          <!-- Content -->
          <div class="modal-content">
            <!-- Tab: Lista de Amigos -->
            <div v-if="activeTab === 'friends'" class="tab-content">
              <div v-if="isLoading" class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                Carregando...
              </div>
              
              <div v-else-if="friends.length === 0" class="empty-state">
                <i class="fas fa-user-slash"></i>
                <p>Você ainda não tem amigos</p>
                <button class="action-btn" @click="activeTab = 'search'">
                  <i class="fas fa-search"></i>
                  Buscar pessoas
                </button>
              </div>
              
              <div v-else class="friends-list">
                <div 
                  v-for="friend in friends" 
                  :key="friend.id" 
                  class="friend-card"
                  @click="showFriendActivity(friend)"
                >
                  <img 
                    :src="friend.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.display_name)}&background=6366f1&color=fff&bold=true&size=64`" 
                    :alt="friend.display_name"
                    class="friend-avatar"
                    @error="handleImageError($event, friend.display_name)"
                  >
                  <div class="friend-info">
                    <h3 class="friend-name">{{ friend.display_name }}</h3>
                    <p class="friend-stats">
                      <i class="fas fa-play"></i> {{ friend.total_plays || 0 }} plays
                    </p>
                    <p class="friend-last-song" v-if="friend.last_liked">
                      <i class="fas fa-heart"></i> {{ friend.last_liked.title }}
                    </p>
                  </div>
                  <button 
                    class="remove-btn" 
                    @click.stop="handleRemoveFriend(friend)"
                    title="Remover amigo"
                  >
                    <i class="fas fa-user-minus"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Tab: Buscar Usuários -->
            <div v-if="activeTab === 'search'" class="tab-content">
              <div class="search-box">
                <i class="fas fa-search"></i>
                <input 
                  type="text" 
                  v-model="searchQuery"
                  placeholder="Buscar por nome..."
                  @input="debouncedSearch"
                >
              </div>

              <div v-if="isLoading" class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                Buscando...
              </div>

              <div v-else-if="searchQuery.length < 2" class="hint">
                <i class="fas fa-info-circle"></i>
                Digite pelo menos 2 caracteres para buscar
              </div>

              <div v-else-if="searchResults.length === 0 && searchQuery.length >= 2" class="empty-state">
                <i class="fas fa-user-slash"></i>
                <p>Nenhum usuário encontrado</p>
              </div>

              <div v-else class="search-results">
                <div 
                  v-for="user in searchResults" 
                  :key="user.id" 
                  class="user-card"
                >
                  <img 
                    :src="user.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name)}&background=6366f1&color=fff&bold=true&size=64`" 
                    :alt="user.display_name"
                    class="user-avatar"
                    @error="handleImageError($event, user.display_name)"
                  >
                  <div class="user-info">
                    <h3 class="user-name">{{ user.display_name }}</h3>
                    <p class="user-status" :class="user.friendship_status">
                      <template v-if="user.friendship_status === 'accepted'">
                        <i class="fas fa-check-circle"></i> Amigos
                      </template>
                      <template v-else-if="user.friendship_status === 'pending'">
                        <i class="fas fa-clock"></i> Pendente
                      </template>
                    </p>
                  </div>
                  <button 
                    v-if="!user.friendship_status"
                    class="add-btn"
                    @click="handleAddFriend(user)"
                    :disabled="isLoading"
                  >
                    <i class="fas fa-user-plus"></i>
                    Adicionar
                  </button>
                  <span v-else-if="user.friendship_status === 'accepted'" class="status-badge friends">
                    <i class="fas fa-check"></i>
                  </span>
                  <span v-else-if="user.friendship_status === 'pending'" class="status-badge pending">
                    <i class="fas fa-hourglass-half"></i>
                  </span>
                </div>
              </div>
            </div>

            <!-- Tab: Pedidos Pendentes -->
            <div v-if="activeTab === 'pending'" class="tab-content">
              <div v-if="isLoading" class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                Carregando...
              </div>

              <div v-else-if="pendingRequests.length === 0" class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>Nenhum pedido pendente</p>
              </div>

              <div v-else class="pending-list">
                <div 
                  v-for="request in pendingRequests" 
                  :key="request.id" 
                  class="request-card"
                >
                  <img 
                    :src="request.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.display_name)}&background=6366f1&color=fff&bold=true&size=64`" 
                    :alt="request.display_name"
                    class="request-avatar"
                    @error="handleImageError($event, request.display_name)"
                  >
                  <div class="request-info">
                    <h3 class="request-name">{{ request.display_name }}</h3>
                    <p class="request-time">
                      <i class="fas fa-clock"></i>
                      {{ formatDate(request.requested_at) }}
                    </p>
                  </div>
                  <div class="request-actions">
                    <button 
                      class="accept-btn"
                      @click="handleAcceptRequest(request)"
                      :disabled="isLoading"
                    >
                      <i class="fas fa-check"></i>
                    </button>
                    <button 
                      class="reject-btn"
                      @click="handleRejectRequest(request)"
                      :disabled="isLoading"
                    >
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Friend Activity Modal -->
          <Transition name="slide">
            <div v-if="selectedFriend" class="activity-panel">
              <div class="activity-header">
                <button class="back-btn" @click="selectedFriend = null">
                  <i class="fas fa-arrow-left"></i>
                </button>
                <img 
                  :src="selectedFriend.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedFriend.display_name)}&background=6366f1&color=fff&bold=true&size=64`" 
                  class="activity-avatar"
                  @error="handleImageError($event, selectedFriend.display_name)"
                >
                <h3>{{ selectedFriend.display_name }}</h3>
              </div>

              <div class="activity-content">
                <div v-if="friendActivity">
                  <!-- Stats -->
                  <div class="activity-stats">
                    <div class="stat">
                      <i class="fas fa-play"></i>
                      <span>{{ friendActivity.stats.total_plays || 0 }}</span>
                      <small>plays</small>
                    </div>
                    <div class="stat">
                      <i class="fas fa-heart"></i>
                      <span>{{ friendActivity.stats.total_likes || 0 }}</span>
                      <small>curtidas</small>
                    </div>
                    <div class="stat">
                      <i class="fas fa-music"></i>
                      <span>{{ friendActivity.stats.unique_songs || 0 }}</span>
                      <small>músicas</small>
                    </div>
                  </div>

                  <!-- Recent Plays -->
                  <div class="activity-section" v-if="friendActivity.recentPlays?.length">
                    <h4><i class="fas fa-history"></i> Ouvindo recentemente</h4>
                    <div class="activity-list">
                      <div 
                        v-for="(play, index) in friendActivity.recentPlays" 
                        :key="index"
                        class="activity-item"
                      >
                        <img :src="play.album_cover || '/default-album.jpg'" class="activity-cover">
                        <div class="activity-info">
                          <span class="activity-title">{{ play.title }}</span>
                          <span class="activity-artist">{{ play.artist }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Liked Songs -->
                  <div class="activity-section" v-if="friendActivity.likedSongs?.length">
                    <h4><i class="fas fa-heart"></i> Músicas curtidas</h4>
                    <div class="activity-list">
                      <div 
                        v-for="(song, index) in friendActivity.likedSongs" 
                        :key="index"
                        class="activity-item"
                      >
                        <img :src="song.album_cover || '/default-album.jpg'" class="activity-cover">
                        <div class="activity-info">
                          <span class="activity-title">{{ song.title }}</span>
                          <span class="activity-artist">{{ song.artist }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else class="loading">
                  <i class="fas fa-spinner fa-spin"></i>
                  Carregando atividade...
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useFriends } from '../composables/useFriends'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'notification'])

const {
  friends,
  pendingRequests,
  searchResults,
  isLoading,
  friendsCount,
  pendingCount,
  searchUsers,
  loadFriends,
  loadPendingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  getFriendActivity
} = useFriends()

// Estado local
const activeTab = ref('friends')
const searchQuery = ref('')
const selectedFriend = ref(null)
const friendActivity = ref(null)

// Debounce para busca
let searchTimeout = null
const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    searchUsers(searchQuery.value)
  }, 300)
}

// Carrega dados ao abrir
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await loadFriends()
    await loadPendingRequests()
  }
})

// Handlers
const handleAddFriend = async (user) => {
  const result = await sendFriendRequest(user.id)
  if (result.success) {
    emit('notification', { message: result.message, type: 'success' })
  } else {
    emit('notification', { message: result.message, type: 'warning' })
  }
}

const handleAcceptRequest = async (request) => {
  const result = await acceptFriendRequest(request.id)
  if (result.success) {
    emit('notification', { message: `Agora você e ${request.display_name} são amigos!`, type: 'success' })
  }
}

const handleRejectRequest = async (request) => {
  await removeFriend(request.id)
  emit('notification', { message: 'Pedido recusado', type: 'info' })
}

const handleRemoveFriend = async (friend) => {
  if (confirm(`Remover ${friend.display_name} dos amigos?`)) {
    await removeFriend(friend.id)
    emit('notification', { message: 'Amigo removido', type: 'info' })
  }
}

const showFriendActivity = async (friend) => {
  selectedFriend.value = friend
  friendActivity.value = null
  friendActivity.value = await getFriendActivity(friend.id)
}

// Formatação de data
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return 'Agora'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`
  return date.toLocaleDateString('pt-BR')
}

// Handler para erro ao carregar imagem de perfil
const handleImageError = (event, displayName) => {
  console.warn('⚠️ Erro ao carregar imagem, usando avatar gerado')
  event.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'User')}&background=6366f1&color=fff&bold=true&size=64`
}
</script>

<style scoped>
.friends-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.friends-modal {
  background: #0a0a0a;
  border: 4px solid #fff;
  width: 100%;
  max-width: 500px;
  max-height: 85vh;
  overflow: hidden;
  position: relative;
  transform: skewX(-1deg);
  box-shadow: 8px 8px 0 var(--accent-rgb), 0 0 40px var(--glow-color);
  transition: box-shadow var(--color-transition);
}

.friends-modal > * {
  transform: skewX(1deg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 3px solid #fff;
  background: linear-gradient(135deg, rgba(var(--accent-color), 0.2), transparent);
}

.modal-title {
  font-family: 'Cingire', 'Impact', sans-serif;
  font-size: 1.8rem;
  color: #fff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.modal-title i {
  color: var(--accent-rgb);
  transition: color var(--color-transition);
}

.close-btn {
  width: 40px;
  height: 40px;
  background: transparent;
  border: 2px solid #fff;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--accent-rgb);
  border-color: var(--accent-rgb);
  transform: rotate(90deg);
}

/* Tabs */
.tabs {
  display: flex;
  border-bottom: 2px solid #333;
}

.tab {
  flex: 1;
  padding: 1rem;
  background: transparent;
  border: none;
  color: #888;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.tab:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.tab.active {
  color: var(--accent-rgb);
  border-bottom: 3px solid var(--accent-rgb);
  background: rgba(var(--accent-color), 0.1);
}

.badge {
  background: var(--accent-rgb);
  color: #000;
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-weight: bold;
}

.badge.pending {
  background: #ffd700;
  animation: pulse 2s infinite;
}

/* Content */
.modal-content {
  padding: 1rem;
  max-height: 50vh;
  overflow-y: auto;
}

.tab-content {
  min-height: 200px;
}

/* Loading & Empty States */
.loading, .empty-state, .hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #888;
  text-align: center;
  gap: 1rem;
}

.loading i, .empty-state i, .hint i {
  font-size: 2rem;
  color: var(--accent-rgb);
}

.action-btn {
  padding: 0.8rem 1.5rem;
  background: var(--accent-rgb);
  border: 2px solid var(--accent-rgb);
  color: #fff;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #fff;
  color: var(--accent-rgb);
}

/* Search */
.search-box {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid #333;
  margin-bottom: 1rem;
}

.search-box i {
  color: #888;
}

.search-box input {
  flex: 1;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1rem;
  outline: none;
}

.search-box input::placeholder {
  color: #666;
}

/* Cards */
.friend-card, .user-card, .request-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.friend-card:hover, .user-card:hover, .request-card:hover {
  background: rgba(var(--accent-color), 0.1);
  border-color: var(--accent-rgb);
  transform: translateX(5px);
}

.friend-avatar, .user-avatar, .request-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid var(--accent-rgb);
  object-fit: cover;
}

.friend-info, .user-info, .request-info {
  flex: 1;
  min-width: 0;
}

.friend-name, .user-name, .request-name {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  color: #fff;
  margin: 0 0 0.3rem 0;
  font-size: 1rem;
}

.friend-stats, .friend-last-song, .request-time {
  font-size: 0.8rem;
  color: #888;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.friend-last-song {
  color: var(--accent-rgb);
}

.user-status {
  font-size: 0.8rem;
  color: #888;
  margin: 0;
}

.user-status.accepted {
  color: #4CAF50;
}

.user-status.pending {
  color: #ffd700;
}

/* Buttons */
.add-btn {
  padding: 0.5rem 1rem;
  background: var(--accent-rgb);
  border: 2px solid var(--accent-rgb);
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s;
}

.add-btn:hover {
  background: #fff;
  color: var(--accent-rgb);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.remove-btn {
  width: 35px;
  height: 35px;
  background: transparent;
  border: 2px solid #666;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: #ff4444;
  border-color: #ff4444;
  color: #fff;
}

.status-badge {
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.status-badge.friends {
  background: #4CAF50;
  color: #fff;
}

.status-badge.pending {
  background: #ffd700;
  color: #000;
}

/* Request Actions */
.request-actions {
  display: flex;
  gap: 0.5rem;
}

.accept-btn, .reject-btn {
  width: 40px;
  height: 40px;
  border: 2px solid;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.accept-btn {
  background: transparent;
  border-color: #4CAF50;
  color: #4CAF50;
}

.accept-btn:hover {
  background: #4CAF50;
  color: #fff;
}

.reject-btn {
  background: transparent;
  border-color: #ff4444;
  color: #ff4444;
}

.reject-btn:hover {
  background: #ff4444;
  color: #fff;
}

/* Activity Panel */
.activity-panel {
  position: absolute;
  inset: 0;
  background: #0a0a0a;
  overflow-y: auto;
}

.activity-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 3px solid #fff;
  background: linear-gradient(135deg, rgba(var(--accent-color), 0.2), transparent);
}

.back-btn {
  width: 40px;
  height: 40px;
  background: transparent;
  border: 2px solid #fff;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--accent-rgb);
  border-color: var(--accent-rgb);
}

.activity-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 3px solid var(--accent-rgb);
}

.activity-header h3 {
  font-family: 'Cingire', sans-serif;
  color: #fff;
  margin: 0;
  font-size: 1.3rem;
}

.activity-content {
  padding: 1rem;
}

.activity-stats {
  display: flex;
  justify-content: space-around;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1.5rem;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.stat i {
  color: var(--accent-rgb);
  font-size: 1.2rem;
}

.stat span {
  font-family: 'Cingire', sans-serif;
  font-size: 1.5rem;
  color: #fff;
}

.stat small {
  color: #888;
  font-size: 0.75rem;
}

.activity-section {
  margin-bottom: 1.5rem;
}

.activity-section h4 {
  font-family: 'Inter', sans-serif;
  color: var(--accent-rgb);
  font-size: 0.9rem;
  margin: 0 0 0.8rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.activity-cover {
  width: 40px;
  height: 40px;
  object-fit: cover;
}

.activity-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.activity-title {
  color: #fff;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-artist {
  color: #888;
  font-size: 0.8rem;
}

/* Scrollbar */
.modal-content::-webkit-scrollbar,
.activity-panel::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track,
.activity-panel::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.modal-content::-webkit-scrollbar-thumb,
.activity-panel::-webkit-scrollbar-thumb {
  background: var(--accent-rgb);
}

/* Animations */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .friends-modal,
.modal-leave-to .friends-modal {
  transform: skewX(-1deg) translateY(-30px);
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Responsive */
@media (max-width: 500px) {
  .friends-modal {
    max-height: 90vh;
    transform: none;
  }
  
  .friends-modal > * {
    transform: none;
  }
  
  .tab {
    padding: 0.8rem 0.5rem;
    font-size: 0.85rem;
  }
  
  .tab i {
    display: none;
  }
}
</style>
