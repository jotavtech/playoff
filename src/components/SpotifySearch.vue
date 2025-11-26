<template>
  <div class="spotify-search">
    <div class="search-header">
      <h3 class="search-title">Buscar Músicas</h3>
    </div>
    
    <div class="search-box">
      <input 
        v-model="searchQuery"
        @keyup.enter="searchSpotify"
        type="text"
        placeholder="Buscar artista ou música..."
        class="search-input"
      />
      <button @click="searchSpotify" class="search-btn" :disabled="isSearching">
        <i v-if="isSearching" class="fas fa-spinner fa-spin"></i>
        <i v-else class="fas fa-search"></i>
      </button>
    </div>

    <!-- Search Results -->
    <div class="search-results" v-if="searchResults.length > 0">
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

    <div class="no-results" v-if="searched && searchResults.length === 0">
      Nenhum resultado encontrado
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['add-song', 'add-to-queue'])

const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const searched = ref(false)

// Spotify Auth
const spotifyClientId = '1fd9e79e2e074a33b258c30747f74e6b'
const spotifyClientSecret = '3bc40e26370c43818ec3612d25fcbf96'
let spotifyToken = null

const getSpotifyToken = async () => {
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

const searchSpotify = async () => {
  if (!searchQuery.value.trim()) return
  
  isSearching.value = true
  searched.value = true
  
  try {
    const token = await getSpotifyToken()
    const query = encodeURIComponent(searchQuery.value)
    
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=track&limit=6&market=BR`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )
    
    const data = await response.json()
    
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
  } catch (error) {
    console.error('Erro na busca:', error)
  } finally {
    isSearching.value = false
  }
}

const addSong = (track) => {
  emit('add-song', track)
  searchResults.value = []
  searchQuery.value = ''
  searched.value = false
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
  border: 3px solid #fff;
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
</style>
