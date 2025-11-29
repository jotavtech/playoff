<template>
  <div class="spotify-search">
    <div class="search-header">
      <h3 class="search-title">Buscar Músicas</h3>
    </div>
    
    <div class="search-box">
      <input 
        v-model="searchQuery"
        @keyup.enter="searchSpotify"
        @focus="showMyPlaylists = !searched"
        type="text"
        placeholder="Buscar músicas ou playlists..."
        class="search-input"
      />
      <button @click="searchSpotify" class="search-btn" :disabled="isSearching">
        <i v-if="isSearching" class="fas fa-spinner fa-spin"></i>
        <i v-else class="fas fa-search"></i>
      </button>
    </div>

    <!-- Minhas Playlists (quando logado e não pesquisando) -->
    <div class="my-playlists" v-if="showMyPlaylists && isUserLoggedIn && !searched && !selectedPlaylist">
      <div class="my-playlists-header">
        <h4><i class="fas fa-headphones"></i> Minhas Playlists</h4>
        <button class="refresh-btn" @click="loadUserPlaylists" :disabled="isLoadingUserPlaylists">
          <i :class="isLoadingUserPlaylists ? 'fas fa-spinner fa-spin' : 'fas fa-sync-alt'"></i>
        </button>
      </div>
      
      <div class="playlists-grid" v-if="userPlaylists.length > 0">
        <div 
          v-for="playlist in userPlaylists" 
          :key="playlist.id"
          class="playlist-card"
          @click="openPlaylist(playlist)"
        >
          <img :src="playlist.image" :alt="playlist.name" class="playlist-card-cover" loading="lazy" />
          <div class="playlist-card-info">
            <span class="playlist-card-name">{{ playlist.name }}</span>
            <span class="playlist-card-tracks">{{ playlist.totalTracks }} músicas</span>
          </div>
        </div>
      </div>
      
      <div class="loading-playlists" v-else-if="isLoadingUserPlaylists">
        <i class="fas fa-spinner fa-spin"></i>
        Carregando suas playlists...
      </div>
      
      <div class="no-playlists" v-else-if="!isLoadingUserPlaylists">
        <p>Nenhuma playlist encontrada</p>
        <small>Faça login com Spotify Premium para ver suas playlists</small>
      </div>
    </div>

    <!-- Botão Voltar e Tabs de Resultados -->
    <div class="search-results-header" v-if="searched && (searchResults.length > 0 || playlistResults.length > 0)">
      <button class="back-to-playlists-btn" @click="clearSearch" title="Voltar para Minhas Playlists">
        <i class="fas fa-arrow-left"></i>
        <span>Minhas Playlists</span>
      </button>
    </div>
    
    <div class="search-tabs" v-if="searched && (searchResults.length > 0 || playlistResults.length > 0)">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'tracks' }"
        @click="activeTab = 'tracks'"
      >
        <i class="fas fa-music"></i>
        Músicas
        <span class="tab-count" v-if="searchResults.length">{{ searchResults.length }}</span>
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'playlists' }"
        @click="activeTab = 'playlists'"
      >
        <i class="fas fa-list"></i>
        Playlists
        <span class="tab-count" v-if="playlistResults.length">{{ playlistResults.length }}</span>
      </button>
    </div>

    <!-- Search Results - Tracks -->
    <div class="search-results" v-if="activeTab === 'tracks' && searchResults.length > 0">
      <div 
        v-for="track in searchResults" 
        :key="track.id"
        class="result-item"
        @click="addSong(track)"
      >
        <img :src="track.albumCover" :alt="track.name" class="result-cover" loading="lazy" decoding="async" />
        <div class="result-info">
          <span class="result-name">{{ track.name }}</span>
          <span class="result-artist">{{ track.artist }}</span>
        </div>
        <div class="result-actions">
          <button @click.stop="$emit('add-to-queue', track)" class="queue-btn" title="Adicionar à Fila">
            <i class="fas fa-list-ul"></i>
          </button>
          <button @click.stop="addSong(track)" class="add-btn" title="Adicionar à Votação">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Search Results - Playlists -->
    <div class="search-results" v-if="activeTab === 'playlists' && playlistResults.length > 0 && !selectedPlaylist">
      <div 
        v-for="playlist in playlistResults" 
        :key="playlist.id"
        class="result-item playlist-item"
        @click="openPlaylist(playlist)"
      >
        <img :src="playlist.image" :alt="playlist.name" class="result-cover playlist-cover" loading="lazy" />
        <div class="result-info">
          <span class="result-name">{{ playlist.name }}</span>
          <span class="result-artist">
            <i class="fas fa-user"></i> {{ playlist.owner }}
            <span class="playlist-tracks">• {{ playlist.totalTracks }} músicas</span>
          </span>
        </div>
        <div class="result-actions">
          <button class="view-btn" title="Ver Playlist">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Playlist Details View -->
    <div class="playlist-details" v-if="selectedPlaylist">
      <div class="playlist-header">
        <button class="back-btn" @click="closePlaylist">
          <i class="fas fa-arrow-left"></i>
        </button>
        <img :src="selectedPlaylist.image" class="playlist-cover-large" />
        <div class="playlist-info">
          <h3 class="playlist-title">{{ selectedPlaylist.name }}</h3>
          <p class="playlist-meta">
            <span>{{ selectedPlaylist.owner }}</span>
            <span>{{ playlistTracks.length }} músicas</span>
          </p>
        </div>
      </div>

      <!-- Playlist Actions -->
      <div class="playlist-actions">
        <button class="action-btn add-all-btn" @click="addAllToQueue" :disabled="isLoadingTracks">
          <i class="fas fa-play"></i>
          Adicionar Todas à Fila
        </button>
      </div>

      <!-- Playlist Tracks -->
      <div class="playlist-tracks-list" v-if="!isLoadingTracks">
        <div 
          v-for="(track, index) in playlistTracks" 
          :key="track.id"
          class="track-item"
        >
          <span class="track-number">{{ index + 1 }}</span>
          <img :src="track.albumCover" :alt="track.name" class="track-cover" loading="lazy" />
          <div class="track-info">
            <span class="track-name">{{ track.name }}</span>
            <span class="track-artist">{{ track.artist }}</span>
          </div>
          <div class="track-actions">
            <button @click="$emit('add-to-queue', track)" class="queue-btn" title="Adicionar à Fila">
              <i class="fas fa-list-ul"></i>
            </button>
            <button @click="addSong(track)" class="add-btn" title="Tocar Agora">
              <i class="fas fa-play"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="loading-tracks" v-else>
        <i class="fas fa-spinner fa-spin"></i>
        Carregando músicas...
      </div>
    </div>

    <div class="no-results" v-if="searched && searchResults.length === 0 && playlistResults.length === 0 && !selectedPlaylist">
      Nenhum resultado encontrado
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const emit = defineEmits(['add-song', 'add-to-queue', 'add-playlist-to-queue'])

const searchQuery = ref('')
const searchResults = ref([])
const playlistResults = ref([])
const isSearching = ref(false)
const searched = ref(false)
const activeTab = ref('tracks')
const showMyPlaylists = ref(true)

// Playlist state
const selectedPlaylist = ref(null)
const playlistTracks = ref([])
const isLoadingTracks = ref(false)

// User playlists state
const userPlaylists = ref([])
const isLoadingUserPlaylists = ref(false)

// Spotify Auth - para busca pública
const spotifyClientId = '1fd9e79e2e074a33b258c30747f74e6b'
const spotifyClientSecret = '3bc40e26370c43818ec3612d25fcbf96'
let spotifyToken = null

// Verifica se usuário está logado
const isUserLoggedIn = computed(() => {
  return !!localStorage.getItem('spotify_access_token')
})

// Token do usuário logado
const getUserToken = () => {
  return localStorage.getItem('spotify_access_token')
}

const getSpotifyToken = async () => {
  // Se usuário está logado, usa o token dele
  const userToken = getUserToken()
  if (userToken) return userToken
  
  // Senão, usa client credentials
  if (spotifyToken) return spotifyToken
  
  const credentials = btoa(`${spotifyClientId}:${spotifyClientSecret}`)
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })
  
  const data = await response.json()
  spotifyToken = data.access_token
  return spotifyToken
}

// Carrega playlists do usuário logado
const loadUserPlaylists = async () => {
  const userToken = getUserToken()
  if (!userToken) return
  
  isLoadingUserPlaylists.value = true
  
  try {
    // Busca playlists do usuário (inclui as criadas pelo Spotify para ele)
    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { 'Authorization': `Bearer ${userToken}` }
    })
    
    if (response.ok) {
      const data = await response.json()
      userPlaylists.value = data.items
        .filter(p => p !== null)
        .map(playlist => ({
          id: playlist.id,
          name: playlist.name,
          owner: playlist.owner?.display_name || 'Spotify',
          image: playlist.images?.[0]?.url || '/default-album.jpg',
          totalTracks: playlist.tracks?.total || 0,
          spotifyUrl: playlist.external_urls?.spotify,
          isOwner: playlist.owner?.id === localStorage.getItem('spotify_id')
        }))
    }
  } catch (error) {
    console.error('Erro ao carregar playlists:', error)
  } finally {
    isLoadingUserPlaylists.value = false
  }
}

// Carrega playlists ao montar se logado
onMounted(() => {
  if (isUserLoggedIn.value) {
    loadUserPlaylists()
  }
})

// Recarrega quando usuário logar
watch(isUserLoggedIn, (loggedIn) => {
  if (loggedIn) {
    loadUserPlaylists()
  } else {
    userPlaylists.value = []
  }
})

const searchSpotify = async () => {
  if (!searchQuery.value.trim()) return
  
  isSearching.value = true
  searched.value = true
  selectedPlaylist.value = null
  playlistTracks.value = []
  
  try {
    const token = await getSpotifyToken()
    const query = encodeURIComponent(searchQuery.value)
    
    // Busca músicas E playlists simultaneamente
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=track,playlist&limit=6&market=BR`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )
    
    const data = await response.json()
    
    // Processar músicas
    if (data.tracks?.items) {
      searchResults.value = data.tracks.items.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0]?.name || 'Unknown',
        album: track.album.name,
        albumCover: track.album.images[0]?.url || '',
        previewUrl: track.preview_url,
        spotifyUrl: track.external_urls?.spotify,
        duration: track.duration_ms
      }))
    }
    
    // Processar playlists
    if (data.playlists?.items) {
      playlistResults.value = data.playlists.items
        .filter(p => p !== null)
        .map(playlist => ({
          id: playlist.id,
          name: playlist.name,
          owner: playlist.owner?.display_name || 'Spotify',
          image: playlist.images?.[0]?.url || '/default-album.jpg',
          totalTracks: playlist.tracks?.total || 0,
          spotifyUrl: playlist.external_urls?.spotify
        }))
    }
    
    // Auto-seleciona tab com resultados
    if (searchResults.value.length === 0 && playlistResults.value.length > 0) {
      activeTab.value = 'playlists'
    } else {
      activeTab.value = 'tracks'
    }
    
  } catch (error) {
    console.error('Erro na busca:', error)
  } finally {
    isSearching.value = false
  }
}

// Abrir playlist e carregar músicas
const openPlaylist = async (playlist) => {
  selectedPlaylist.value = playlist
  isLoadingTracks.value = true
  playlistTracks.value = []
  
  try {
    const token = await getSpotifyToken()
    
    // Busca as músicas da playlist (até 100)
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?market=BR&limit=50`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )
    
    const data = await response.json()
    
    if (data.items) {
      playlistTracks.value = data.items
        .filter(item => item.track !== null)
        .map(item => ({
          id: item.track.id,
          name: item.track.name,
          artist: item.track.artists?.[0]?.name || 'Unknown',
          album: item.track.album?.name || '',
          albumCover: item.track.album?.images?.[0]?.url || '/default-album.jpg',
          previewUrl: item.track.preview_url,
          spotifyUrl: item.track.external_urls?.spotify,
          duration: item.track.duration_ms
        }))
    }
  } catch (error) {
    console.error('Erro ao carregar playlist:', error)
  } finally {
    isLoadingTracks.value = false
  }
}

const closePlaylist = () => {
  selectedPlaylist.value = null
  playlistTracks.value = []
}

const addAllToQueue = () => {
  if (playlistTracks.value.length === 0) return
  
  // Emite todas as músicas para adicionar à fila
  playlistTracks.value.forEach((track, index) => {
    // Pequeno delay para não sobrecarregar
    setTimeout(() => {
      emit('add-to-queue', track)
    }, index * 100)
  })
  
  // Fecha a playlist após adicionar
  closePlaylist()
}

// Limpa a busca e volta para Minhas Playlists
const clearSearch = () => {
  searchResults.value = []
  playlistResults.value = []
  searchQuery.value = ''
  searched.value = false
  showMyPlaylists.value = true
}

const addSong = (track) => {
  emit('add-song', track)
  // Não fecha a busca quando está na playlist view
  if (!selectedPlaylist.value) {
    clearSearch()
  }
}
</script>

<style scoped>
.spotify-search {
  width: 100%;
  max-width: 600px;
  margin: 0 auto 2rem;
  padding: 1.5rem;
}

.search-header {
  text-align: center;
  margin-bottom: 1rem;
}

.search-title {
  font-family: 'Cingire', 'Impact', sans-serif;
  color: #fff;
  font-size: 1.8rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0;
  text-shadow: 2px 2px 0 #ff6b6b;
}

.search-box {
  display: flex;
  gap: 0;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.search-input {
  flex: 1;
  padding: 1rem 1.5rem;
  font-size: 1.1rem;
  font-family: 'Cingire', sans-serif;
  letter-spacing: 0.05em;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  color: #fff;
  outline: none;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.search-btn {
  padding: 1rem 1.5rem;
  background: #ff6b6b;
  border: none;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
}

.search-btn:hover:not(:disabled) {
  background: #fff;
  color: #000;
}

.search-results {
  margin-top: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.85);
}

.result-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: background 0.2s;
}

.result-item:hover {
  background: rgba(255, 107, 107, 0.2);
}

.result-item:last-child {
  border-bottom: none;
}

.result-cover {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border: 2px solid #fff;
}

.result-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.result-name {
  font-family: 'Cingire', sans-serif;
  color: #fff;
  font-size: 1rem;
  letter-spacing: 0.05em;
}

.result-artist {
  color: #ff6b6b;
  font-size: 0.85rem;
}

.result-actions {
  display: flex;
  gap: 0.5rem;
}

.add-btn, .queue-btn {
  width: 36px;
  height: 36px;
  background: transparent;
  border: 2px solid #fff;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.add-btn:hover {
  background: #1DB954;
  border-color: #1DB954;
}

.queue-btn:hover {
  background: #ff6b6b;
  border-color: #ff6b6b;
}

.no-results {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.5);
  font-family: 'Cingire', sans-serif;
  letter-spacing: 0.1em;
}

/* ============= MINHAS PLAYLISTS ============= */
.my-playlists {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.my-playlists-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.my-playlists-header h4 {
  font-family: 'Cingire', sans-serif;
  color: #1DB954;
  font-size: 1rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.refresh-btn {
  width: 32px;
  height: 32px;
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  border-color: #1DB954;
  color: #1DB954;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.playlists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.8rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.playlists-grid::-webkit-scrollbar {
  width: 4px;
}

.playlists-grid::-webkit-scrollbar-thumb {
  background: #1DB954;
  border-radius: 2px;
}

.playlist-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.playlist-card:hover {
  background: rgba(30, 215, 96, 0.15);
  border-color: #1DB954;
  transform: translateY(-2px);
}

.playlist-card-cover {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.playlist-card-info {
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.playlist-card-name {
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-card-tracks {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
}

.loading-playlists, .no-playlists {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  gap: 0.5rem;
}

.loading-playlists i {
  font-size: 1.5rem;
  color: #1DB954;
}

.no-playlists p {
  margin: 0;
}

.no-playlists small {
  font-size: 0.8rem;
  opacity: 0.7;
}

/* ============= SEARCH RESULTS HEADER ============= */
.search-results-header {
  margin-top: 1rem;
  display: flex;
  align-items: center;
}

.back-to-playlists-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: transparent;
  border: 2px solid #1DB954;
  color: #1DB954;
  font-family: 'Cingire', sans-serif;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.back-to-playlists-btn:hover {
  background: #1DB954;
  color: #fff;
}

.back-to-playlists-btn i {
  font-size: 0.85rem;
}

/* ============= TABS ============= */
.search-tabs {
  display: flex;
  margin-top: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-bottom: none;
  background: rgba(0, 0, 0, 0.5);
}

.tab-btn {
  flex: 1;
  padding: 0.8rem 1rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Cingire', sans-serif;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
}

.tab-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.tab-btn.active {
  color: #fff;
  background: rgba(255, 107, 107, 0.15);
  border-bottom: 3px solid #ff6b6b;
}

.tab-count {
  background: #ff6b6b;
  color: #fff;
  font-size: 0.75rem;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  font-family: 'Inter', sans-serif;
}

/* ============= PLAYLIST ITEMS ============= */
.playlist-item {
  background: rgba(30, 215, 96, 0.05);
}

.playlist-item:hover {
  background: rgba(30, 215, 96, 0.15);
}

.playlist-cover {
  border-radius: 4px;
}

.playlist-tracks {
  color: rgba(255, 255, 255, 0.5);
  margin-left: 0.3rem;
}

.view-btn {
  width: 36px;
  height: 36px;
  background: transparent;
  border: 2px solid #1DB954;
  color: #1DB954;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.view-btn:hover {
  background: #1DB954;
  color: #fff;
}

/* ============= PLAYLIST DETAILS ============= */
.playlist-details {
  margin-top: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.85);
  max-height: 60vh;
  overflow-y: auto;
}

.playlist-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(30, 215, 96, 0.2), transparent);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  width: 36px;
  height: 36px;
  background: transparent;
  border: 2px solid #fff;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.back-btn:hover {
  background: #fff;
  color: #000;
}

.playlist-cover-large {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  border: 2px solid #1DB954;
  flex-shrink: 0;
}

.playlist-info {
  flex: 1;
  min-width: 0;
}

.playlist-title {
  font-family: 'Cingire', sans-serif;
  color: #fff;
  font-size: 1.1rem;
  margin: 0 0 0.3rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-meta {
  display: flex;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  margin: 0;
}

/* ============= PLAYLIST ACTIONS ============= */
.playlist-actions {
  padding: 0.8rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.6rem 1.2rem;
  background: #1DB954;
  border: none;
  color: #fff;
  font-family: 'Cingire', sans-serif;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #1ed760;
  transform: translateY(-2px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* ============= PLAYLIST TRACKS LIST ============= */
.playlist-tracks-list {
  padding: 0;
}

.track-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s;
}

.track-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.track-number {
  width: 24px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
  text-align: center;
  flex-shrink: 0;
}

.track-cover {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 2px;
  flex-shrink: 0;
}

.track-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.track-name {
  color: #fff;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-actions {
  display: flex;
  gap: 0.3rem;
  flex-shrink: 0;
}

.track-actions .queue-btn,
.track-actions .add-btn {
  width: 32px;
  height: 32px;
  font-size: 0.85rem;
}

.loading-tracks {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Cingire', sans-serif;
}

.loading-tracks i {
  color: #1DB954;
  font-size: 1.5rem;
}

/* ============= SCROLLBAR ============= */
.playlist-details::-webkit-scrollbar {
  width: 6px;
}

.playlist-details::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.playlist-details::-webkit-scrollbar-thumb {
  background: #1DB954;
  border-radius: 3px;
}

/* ============= RESPONSIVE ============= */
@media (max-width: 500px) {
  .playlist-header {
    flex-wrap: wrap;
  }
  
  .playlist-cover-large {
    width: 50px;
    height: 50px;
  }
  
  .playlist-title {
    font-size: 1rem;
  }
  
  .track-number {
    display: none;
  }
  
  .track-cover {
    width: 36px;
    height: 36px;
  }
}
</style>
