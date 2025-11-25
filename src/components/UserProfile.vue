<template>
  <div class="profile-overlay" @click.self="$emit('close')">
    <div class="profile-modal">
      <button class="close-btn" @click="$emit('close')">
        <i class="fas fa-times"></i>
      </button>

      <!-- Cabeçalho do Perfil -->
      <div class="profile-header">
        <div class="profile-image-container">
          <img 
            :src="user?.profile_image || '/default-avatar.png'" 
            :alt="user?.display_name"
            class="profile-image"
          />
          <div class="spotify-badge">
            <i class="fab fa-spotify"></i>
          </div>
        </div>
        
        <div class="profile-info">
          <h2 class="profile-name">{{ user?.display_name || 'Usuário' }}</h2>
          <p class="profile-email">{{ user?.email }}</p>
          <span class="profile-country" v-if="user?.country">
            <i class="fas fa-map-marker-alt"></i>
            {{ user?.country }}
          </span>
        </div>
      </div>

      <!-- Estatísticas -->
      <div class="profile-stats" v-if="user?.stats">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-play-circle"></i>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ user.stats.total_plays || 0 }}</span>
            <span class="stat-label">Reproduções</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-music"></i>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ user.stats.unique_songs || 0 }}</span>
            <span class="stat-label">Músicas</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-clock"></i>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ formatTime(user.stats.total_listening_time) }}</span>
            <span class="stat-label">Tempo Ouvindo</span>
          </div>
        </div>
      </div>

      <!-- Top Músicas -->
      <div class="top-songs-section" v-if="topSongs.length > 0">
        <h3 class="section-title">
          <i class="fas fa-fire"></i>
          Suas Top Músicas
        </h3>

        <div class="top-songs-list">
          <div 
            v-for="(song, index) in topSongs.slice(0, 5)" 
            :key="song.id"
            class="top-song-item"
            @click="$emit('play-song', song)"
          >
            <span class="song-rank" :class="getRankClass(index)">
              {{ index + 1 }}
            </span>

            <img 
              :src="song.album_cover || '/default-album.jpg'" 
              :alt="song.title"
              class="song-cover"
            />

            <div class="song-info">
              <span class="song-title">{{ song.title }}</span>
              <span class="song-artist">{{ song.artist }}</span>
            </div>

            <div class="song-plays">
              <span class="play-count">{{ song.play_count }}x</span>
              <i class="fas fa-headphones"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Músicas Adicionadas -->
      <div class="added-songs-section" v-if="addedSongs.length > 0">
        <h3 class="section-title">
          <i class="fas fa-plus-circle"></i>
          Adicionadas por Você
        </h3>

        <div class="top-songs-list">
          <div 
            v-for="song in addedSongs" 
            :key="song.id"
            class="top-song-item"
            @click="$emit('play-song', song)"
          >
            <img 
              :src="song.album_cover || '/default-album.jpg'" 
              :alt="song.title"
              class="song-cover"
            />

            <div class="song-info">
              <span class="song-title">{{ song.title }}</span>
              <span class="song-artist">{{ song.artist }}</span>
            </div>

            <div class="song-plays">
              <i class="fas fa-play"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Histórico Recente -->
      <div class="history-section" v-if="history.length > 0">
        <h3 class="section-title">
          <i class="fas fa-history"></i>
          Ouvidas Recentemente
        </h3>

        <div class="history-list">
          <div 
            v-for="item in history.slice(0, 5)" 
            :key="item.id"
            class="history-item"
          >
            <img 
              :src="item.album_cover || '/default-album.jpg'" 
              :alt="item.title"
              class="history-cover"
            />

            <div class="history-info">
              <span class="history-title">{{ item.title }}</span>
              <span class="history-artist">{{ item.artist }}</span>
            </div>

            <span class="history-time">
              {{ formatRelativeTime(item.played_at) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Botão de Logout -->
      <button class="logout-btn" @click="handleLogout">
        <i class="fas fa-sign-out-alt"></i>
        Sair da Conta
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  user: Object
})

const emit = defineEmits(['close', 'logout', 'play-song'])

const topSongs = ref([])
const addedSongs = ref([])
const history = ref([])
const isLoading = ref(false)

// Formata tempo em horas e minutos
const formatTime = (ms) => {
  if (!ms) return '0min'
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) {
    return `${hours}h ${minutes}min`
  }
  return `${minutes}min`
}

// Formata tempo relativo
const formatRelativeTime = (dateStr) => {
  if (!dateStr) return ''
  
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Agora'
  if (diffMins < 60) return `${diffMins}min atrás`
  if (diffHours < 24) return `${diffHours}h atrás`
  if (diffDays < 7) return `${diffDays}d atrás`
  
  return date.toLocaleDateString('pt-BR')
}

// Classe do ranking
const getRankClass = (index) => {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return ''
}

// Logout
const handleLogout = () => {
  emit('logout')
  emit('close')
}

// Detecta a porta correta da API
const getApiUrl = () => {
  return '' // Usa caminho relativo para aproveitar proxy do Vite
}

// Carrega dados do usuário
onMounted(async () => {
  isLoading.value = true
  const API_URL = getApiUrl()

  try {
    // Busca top músicas
    const topResponse = await fetch(`${API_URL}/auth/me/top-songs?limit=10`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('spotify_id')}`
      }
    })
    
    if (topResponse.ok) {
      topSongs.value = await topResponse.json()
    }

    // Busca músicas adicionadas
    const addedResponse = await fetch(`${API_URL}/auth/me/added-songs`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('spotify_id')}`
      }
    })
    
    if (addedResponse.ok) {
      addedSongs.value = await addedResponse.json()
    }

    // Busca histórico
    const historyResponse = await fetch(`${API_URL}/auth/me/history?limit=10`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('spotify_id')}`
      }
    })
    
    if (historyResponse.ok) {
      history.value = await historyResponse.json()
    }
  } catch (error) {
    console.error('Erro ao carregar dados do perfil:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.profile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.profile-modal {
  background: rgba(0, 0, 0, 0.9);
  border: 4px solid #fff;
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  transform: skewX(-1deg);
  box-shadow: 
    8px 8px 0 #ff6b6b,
    0 0 40px rgba(255, 107, 107, 0.5);
  animation: slideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.profile-modal > * {
  transform: skewX(1deg);
}

@keyframes slideIn {
  from {
    transform: skewX(-1deg) translateY(-30px);
    opacity: 0;
  }
  to {
    transform: skewX(-1deg) translateY(0);
    opacity: 1;
  }
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: 2px solid #fff;
  color: #fff;
  width: 40px;
  height: 40px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
}

.close-btn:hover {
  background: #ff6b6b;
  border-color: #ff6b6b;
  transform: skewX(1deg) rotate(90deg);
}

/* Profile Header */
.profile-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.profile-image-container {
  position: relative;
}

.profile-image {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 4px solid #1DB954;
  object-fit: cover;
}

.spotify-badge {
  position: absolute;
  bottom: -5px;
  right: -5px;
  width: 30px;
  height: 30px;
  background: #1DB954;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1rem;
  border: 2px solid #000;
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-family: 'Snuggle Punk', 'Impact', sans-serif;
  font-size: 2rem;
  color: #fff;
  margin: 0 0 0.3rem 0;
  text-shadow: 2px 2px 0 #ff6b6b;
}

.profile-email {
  font-family: 'Inter', sans-serif;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  margin: 0 0 0.5rem 0;
}

.profile-country {
  font-family: 'Cingire', sans-serif;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

/* Stats */
.profile-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: #ff6b6b;
  transform: translateY(-2px);
}

.stat-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 107, 107, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff6b6b;
  font-size: 1.2rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-family: 'Cingire', sans-serif;
  font-size: 1.5rem;
  color: #fff;
  letter-spacing: 0.05em;
}

.stat-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* Sections */
.section-title {
  font-family: 'Cingire', sans-serif;
  font-size: 1.2rem;
  color: #fff;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  letter-spacing: 0.1em;
}

.section-title i {
  color: #ff6b6b;
}

/* Top Songs */
.top-songs-section,
.added-songs-section {
  margin-bottom: 2rem;
}

.top-songs-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.top-song-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.top-song-item:hover {
  background: rgba(255, 107, 107, 0.1);
  border-color: #ff6b6b;
  transform: translateX(5px);
}

.song-rank {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Cingire', sans-serif;
  font-size: 1rem;
  font-weight: bold;
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.song-rank.rank-gold {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
}

.song-rank.rank-silver {
  background: linear-gradient(135deg, #C0C0C0, #A8A8A8);
  color: #000;
}

.song-rank.rank-bronze {
  background: linear-gradient(135deg, #CD7F32, #B87333);
  color: #fff;
}

.song-cover {
  width: 45px;
  height: 45px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.song-info {
  flex: 1;
  min-width: 0;
}

.song-title {
  display: block;
  font-family: 'Cingire', sans-serif;
  color: #fff;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.05em;
}

.song-artist {
  display: block;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-plays {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #ff6b6b;
  font-family: 'Cingire', sans-serif;
  font-size: 0.9rem;
}

/* History */
.history-section {
  margin-bottom: 2rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.6rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.history-cover {
  width: 35px;
  height: 35px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-title {
  display: block;
  color: #fff;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-artist {
  display: block;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-time {
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.75rem;
  white-space: nowrap;
}

/* Logout Button */
.logout-btn {
  width: 100%;
  padding: 1rem;
  background: transparent;
  border: 2px solid #ff6b6b;
  color: #ff6b6b;
  font-family: 'Cingire', sans-serif;
  font-size: 1rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.logout-btn:hover {
  background: #ff6b6b;
  color: #000;
  transform: translate(-2px, -2px);
  box-shadow: 2px 2px 0 #fff;
}

/* Scrollbar */
.profile-modal::-webkit-scrollbar {
  width: 6px;
}

.profile-modal::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.profile-modal::-webkit-scrollbar-thumb {
  background: #ff6b6b;
}

/* Responsive */
@media (max-width: 600px) {
  .profile-modal {
    padding: 1.5rem;
    max-height: 85vh;
  }

  .profile-header {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .profile-image {
    width: 80px;
    height: 80px;
  }

  .profile-name {
    font-size: 1.5rem;
  }

  .profile-stats {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .stat-card {
    padding: 0.8rem;
  }
}
</style>
