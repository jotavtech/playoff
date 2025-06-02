<template>
  <div class="search-section">
    <h2><i class="fas fa-search"></i> Buscar e Adicionar Músicas</h2>
    
    <!-- Search Input -->
    <div class="search-container">
      <div class="search-input-group">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Digite: Artista - Nome da Música (ex: The Beatles - Hey Jude)"
          class="search-input"
          @keypress.enter="handleSearch"
          :disabled="isSearching"
        />
        <button
          class="search-btn"
          @click="handleSearch"
          :disabled="isSearching || !searchQuery.trim()"
        >
          <i v-if="!isSearching" class="fas fa-search"></i>
          <i v-else class="fas fa-spinner fa-spin"></i>
          {{ isSearching ? 'Buscando...' : 'Buscar' }}
        </button>
      </div>
    </div>

    <!-- Search Progress -->
    <div v-if="searchProgress.length > 0" class="search-progress">
      <h3>Progresso da Busca</h3>
      <div class="progress-steps">
        <div 
          v-for="step in searchProgress" 
          :key="step.id"
          class="progress-step"
          :class="step.status"
        >
          <i v-if="step.status === 'completed'" class="fas fa-check-circle"></i>
          <i v-else-if="step.status === 'error'" class="fas fa-times-circle"></i>
          <i v-else-if="step.status === 'loading'" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-clock"></i>
          <span>{{ step.message }}</span>
        </div>
      </div>
    </div>

    <!-- Search Results -->
    <div v-if="searchResults.length > 0" class="search-results">
      <h3>Resultados da Busca</h3>
      <div class="results-container">
        <div 
          v-for="result in searchResults" 
          :key="result.id"
          class="result-item"
        >
          <div class="result-info">
            <img 
              :src="result.albumCover" 
              :alt="`${result.title} - Album Cover`"
              class="result-cover"
              loading="lazy"
            />
            <div class="result-details">
              <div class="result-title">{{ result.title }}</div>
              <div class="result-artist">{{ result.artist }}</div>
              <div class="result-album">{{ result.album }}</div>
              <div v-if="result.duration" class="result-duration">
                Duração: {{ formatDuration(result.duration) }}
              </div>
            </div>
          </div>
          <div class="result-actions">
            <button
              class="add-btn"
              @click="uploadToCloudinaryAndAddToVoting(result)"
              :disabled="result.isUploading || result.isAdded"
            >
              <i v-if="result.isUploading" class="fas fa-spinner fa-spin"></i>
              <i v-else-if="result.isAdded" class="fas fa-check"></i>
              <i v-else class="fas fa-cloud-upload-alt"></i>
              {{ result.isUploading ? 'Enviando...' : result.isAdded ? 'Adicionada' : 'Adicionar' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Progress -->
    <div v-if="uploadProgress" class="upload-progress">
      <h3>Enviando para Cloudinary</h3>
      <div class="progress-bar-container">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: uploadProgress.percentage + '%' }"
          ></div>
        </div>
        <span class="progress-text">{{ uploadProgress.percentage }}%</span>
      </div>
      <p class="upload-status">{{ uploadProgress.message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useCloudinaryAudio } from '../composables/useCloudinaryAudio'

// Reactive state
const searchQuery = ref('')
const isSearching = ref(false)
const searchResults = ref([])
const searchProgress = ref([])
const uploadProgress = ref(null)

// Emits
const emit = defineEmits(['song-added'])

// Composables
const { authenticateSpotify, searchSpotifyTrack } = useCloudinaryAudio()

// Methods
const handleSearch = async () => {
  if (!searchQuery.value.trim()) return
  
  isSearching.value = true
  searchResults.value = []
  searchProgress.value = []
  
  try {
    // Parse search query (expect format: "Artist - Song")
    const parts = searchQuery.value.split(' - ')
    let artist, title
    
    if (parts.length >= 2) {
      artist = parts[0].trim()
      title = parts.slice(1).join(' - ').trim()
    } else {
      // If no " - " found, try to search as a general query
      const words = searchQuery.value.trim().split(' ')
      if (words.length >= 2) {
        artist = words[0]
        title = words.slice(1).join(' ')
      } else {
        throw new Error('Formato inválido. Use: Artista - Nome da Música')
      }
    }

    addProgressStep('Autenticando com Spotify...', 'loading')
    
    // Authenticate with Spotify
    const token = await authenticateSpotify()
    if (!token) {
      throw new Error('Falha na autenticação do Spotify')
    }
    
    updateProgressStep(0, 'Spotify autenticado!', 'completed')
    addProgressStep('Buscando músicas...', 'loading')

    // Search for tracks
    const results = await searchSpotifyTracks(artist, title)
    
    if (results.length === 0) {
      updateProgressStep(1, 'Nenhuma música encontrada', 'error')
      throw new Error('Nenhuma música encontrada para esta busca')
    }

    updateProgressStep(1, `${results.length} música(s) encontrada(s)!`, 'completed')
    searchResults.value = results

  } catch (error) {
    console.error('❌ Erro na busca:', error)
    addProgressStep(error.message, 'error')
  } finally {
    isSearching.value = false
  }
}

const searchSpotifyTracks = async (artist, title) => {
  try {
    const token = await authenticateSpotify()
    if (!token) throw new Error('Token Spotify não disponível')

    // Clean and encode search query
    const cleanArtist = artist.replace(/[^\w\s]/gi, '').trim()
    const cleanTitle = title.replace(/[^\w\s]/gi, '').trim()
    const query = encodeURIComponent(`track:"${cleanTitle}" artist:"${cleanArtist}"`)
    const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=5`

    console.log(`🔍 Buscando no Spotify: ${cleanArtist} - ${cleanTitle}`)

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error(`Erro na busca Spotify: ${response.status}`)
    }

    const data = await response.json()

    if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
      return data.tracks.items.map(track => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        albumCover: track.album.images[0]?.url || '',
        spotifyUrl: track.external_urls?.spotify || '',
        duration: track.duration_ms,
        popularity: track.popularity,
        previewUrl: track.preview_url,
        releaseDate: track.album.release_date,
        isUploading: false,
        isAdded: false
      }))
    }

    return []
  } catch (error) {
    console.error('❌ Erro na busca Spotify:', error)
    throw error
  }
}

const uploadToCloudinaryAndAddToVoting = async (track) => {
  try {
    track.isUploading = true
    uploadProgress.value = {
      percentage: 0,
      message: 'Iniciando adição da música...'
    }

    uploadProgress.value = {
      percentage: 30,
      message: 'Verificando disponibilidade...'
    }

    // For demo purposes, we'll use a placeholder URL or the preview URL if available
    let audioUrl = track.previewUrl || 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748879303/sample_audio_preview.mp3'
    
    // In a real implementation, you would:
    // 1. Search for the song on YouTube Music API
    // 2. Use a service like youtube-dl to get the audio stream
    // 3. Upload to Cloudinary
    // For now, we'll add the song with metadata and a placeholder/preview URL

    uploadProgress.value = {
      percentage: 60,
      message: 'Preparando dados da música...'
    }

    // Create song object for voting
    const newSong = {
      id: `spotify-${track.id}`,
      title: track.title,
      artist: track.artist,
      album: track.album,
      audioUrl: audioUrl,
      albumCover: track.albumCover,
      votes: 0,
      spotifyUrl: track.spotifyUrl,
      cloudinaryId: null, // To be filled when actual audio is uploaded
      duration: track.duration,
      popularity: track.popularity,
      releaseDate: track.releaseDate
    }

    uploadProgress.value = {
      percentage: 80,
      message: 'Adicionando à lista de votação...'
    }

    // Add to backend
    const response = await fetch('/api/songs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newSong)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Falha ao adicionar música ao sistema')
    }

    const result = await response.json()

    uploadProgress.value = {
      percentage: 100,
      message: 'Música adicionada com sucesso!'
    }

    track.isAdded = true
    emit('song-added', result.song)

    // Show info about audio limitation
    if (!track.previewUrl) {
      setTimeout(() => {
        uploadProgress.value = {
          percentage: 100,
          message: 'Música adicionada! Nota: Áudio de placeholder usado - substitua posteriormente por arquivo real.'
        }
      }, 1000)
    }

    // Clear progress after 3 seconds
    setTimeout(() => {
      uploadProgress.value = null
    }, 3000)

  } catch (error) {
    console.error('❌ Erro ao adicionar música:', error)
    uploadProgress.value = {
      percentage: 0,
      message: `Erro: ${error.message}`
    }
    
    setTimeout(() => {
      uploadProgress.value = null
    }, 3000)
  } finally {
    track.isUploading = false
  }
}

const downloadAudioFromUrl = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Falha ao fazer download do áudio')
  }
  return await response.blob()
}

const addProgressStep = (message, status = 'pending') => {
  searchProgress.value.push({
    id: Date.now(),
    message,
    status
  })
}

const updateProgressStep = (index, message, status) => {
  if (searchProgress.value[index]) {
    searchProgress.value[index].message = message
    searchProgress.value[index].status = status
  }
}

const formatDuration = (ms) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Initialize on mount
onMounted(() => {
  console.log('🔍 SearchSection component mounted')
})
</script>

<style scoped>
.search-section {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 25px;
  padding: 2rem;
  margin: 2rem;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
}

.search-section h2 {
  color: #ffffff;
  margin-bottom: 1.5rem;
  font-size: 1.8rem;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 2px;
  background: linear-gradient(45deg, #00d4ff, #0099cc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.search-container {
  margin-bottom: 2rem;
}

.search-input-group {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 15px;
  color: #ffffff;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.search-input:focus {
  border-color: #00d4ff;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
}

.search-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-btn {
  padding: 1rem 2rem;
  background: linear-gradient(45deg, #00d4ff, #0099cc);
  border: none;
  border-radius: 15px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.search-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 212, 255, 0.4);
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-progress {
  margin-bottom: 2rem;
}

.search-progress h3 {
  color: #ffffff;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.progress-steps {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-step {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #ffffff;
  transition: all 0.3s ease;
}

.progress-step.completed {
  background: rgba(46, 204, 113, 0.2);
  border-left: 4px solid #2ecc71;
}

.progress-step.error {
  background: rgba(231, 76, 60, 0.2);
  border-left: 4px solid #e74c3c;
}

.progress-step.loading {
  background: rgba(52, 152, 219, 0.2);
  border-left: 4px solid #3498db;
}

.search-results {
  margin-bottom: 2rem;
}

.search-results h3 {
  color: #ffffff;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.results-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.result-item:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.result-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.result-cover {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.result-details {
  flex: 1;
}

.result-title {
  font-size: 1.1rem;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 0.3rem;
}

.result-artist {
  font-size: 0.9rem;
  color: #cccccc;
  margin-bottom: 0.2rem;
}

.result-album {
  font-size: 0.8rem;
  color: #aaaaaa;
  font-style: italic;
  margin-bottom: 0.2rem;
}

.result-duration {
  font-size: 0.8rem;
  color: #888888;
}

.result-actions {
  display: flex;
  gap: 0.5rem;
}

.add-btn {
  padding: 0.8rem 1.5rem;
  background: linear-gradient(45deg, #2ecc71, #27ae60);
  border: none;
  border-radius: 10px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.add-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(46, 204, 113, 0.4);
}

.add-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.upload-progress {
  padding: 1.5rem;
  background: rgba(52, 152, 219, 0.1);
  border-radius: 15px;
  border: 1px solid rgba(52, 152, 219, 0.3);
}

.upload-progress h3 {
  color: #ffffff;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(45deg, #3498db, #2980b9);
  transition: width 0.3s ease;
}

.progress-text {
  color: #ffffff;
  font-weight: 600;
  min-width: 40px;
  text-align: right;
}

.upload-status {
  color: #ffffff;
  margin: 0;
  font-size: 0.9rem;
}

/* Responsive */
@media (max-width: 768px) {
  .search-input-group {
    flex-direction: column;
  }
  
  .result-item {
    flex-direction: column;
    align-items: stretch;
  }
  
  .result-info {
    flex-direction: column;
    text-align: center;
  }
}
</style> 