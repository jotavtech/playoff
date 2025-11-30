<template>
  <div class="discovery-section">
    <div class="discovery-header">
      <h2 class="discovery-title">
        <i class="fas fa-fire"></i>
        DESCOBRIR
      </h2>
      <div class="discovery-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          <i :class="tab.icon"></i>
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Carregando...</span>
    </div>

    <!-- Top Global -->
    <div v-else-if="activeTab === 'global'" class="tracks-grid">
      <div 
        v-for="(track, index) in topTracks" 
        :key="index"
        class="track-card"
      >
        <div class="track-rank">{{ index + 1 }}</div>
        <div class="track-image" @click="playTrack(track)">
          <img 
            :src="track.image || defaultImage" 
            :alt="track.name"
            @error="handleImageError"
          />
          <div class="play-overlay">
            <i class="fas fa-play"></i>
          </div>
        </div>
        <div class="track-info">
          <h4 class="track-name">{{ track.name }}</h4>
          <p class="track-artist">{{ track.artist }}</p>
          <div class="track-actions">
            <span class="track-plays">
              <i class="fas fa-headphones"></i>
              {{ formatNumber(track.playcount) }}
            </span>
            <button class="add-queue-btn" @click.stop="addToQueue(track)" title="Adicionar à fila">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Por Gênero -->
    <div v-else-if="activeTab === 'genres'" class="genres-section">
      <div class="genre-chips">
        <button 
          v-for="genre in genres" 
          :key="genre"
          :class="['genre-chip', { active: selectedGenre === genre }]"
          @click="selectGenre(genre)"
        >
          {{ genre }}
        </button>
      </div>
      <div class="tracks-grid">
        <div 
          v-for="(track, index) in genreTracks" 
          :key="index"
          class="track-card"
        >
          <div class="track-rank">{{ index + 1 }}</div>
          <div class="track-image" @click="playTrack(track)">
            <img 
              :src="track.image || defaultImage" 
              :alt="track.name"
              @error="handleImageError"
            />
            <div class="play-overlay">
              <i class="fas fa-play"></i>
            </div>
          </div>
          <div class="track-info">
            <h4 class="track-name">{{ track.name }}</h4>
            <p class="track-artist">{{ track.artist }}</p>
            <button class="add-queue-btn" @click.stop="addToQueue(track)" title="Adicionar à fila">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Recomendações -->
    <div v-else-if="activeTab === 'recommendations'" class="recommendations-section">
      <div v-if="!isConnected" class="connect-prompt">
        <i class="fas fa-lastfm"></i>
        <h3>Conecte seu Last.fm</h3>
        <p>Receba recomendações personalizadas baseadas no que você ouve</p>
        <button class="connect-btn" @click="connectLastFm">
          <i class="fas fa-plug"></i>
          Conectar Last.fm
        </button>
      </div>
      <div v-else class="tracks-grid">
        <div 
          v-for="(track, index) in recommendations" 
          :key="index"
          class="track-card recommendation"
        >
          <div class="track-image" @click="playTrack(track)">
            <img 
              :src="track.image || defaultImage" 
              :alt="track.name"
              @error="handleImageError"
            />
            <div class="play-overlay">
              <i class="fas fa-play"></i>
            </div>
          </div>
          <div class="track-info">
            <h4 class="track-name">{{ track.name }}</h4>
            <p class="track-artist">{{ track.artist }}</p>
            <div class="track-actions">
              <span v-if="track.reason" class="track-reason">{{ track.reason }}</span>
              <button class="add-queue-btn" @click.stop="addToQueue(track)" title="Adicionar à fila">
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Similares (quando uma música está tocando) -->
    <div v-else-if="activeTab === 'similar'" class="similar-section">
      <div v-if="!currentTrack" class="empty-state">
        <i class="fas fa-music"></i>
        <p>Toque uma música para ver similares</p>
      </div>
      <div v-else class="tracks-grid">
        <div 
          v-for="(track, index) in similarTracks" 
          :key="index"
          class="track-card"
        >
          <div class="track-image" @click="playTrack(track)">
            <img 
              :src="track.image || defaultImage" 
              :alt="track.name"
              @error="handleImageError"
            />
            <div class="play-overlay">
              <i class="fas fa-play"></i>
            </div>
          </div>
          <div class="track-info">
            <h4 class="track-name">{{ track.name }}</h4>
            <p class="track-artist">{{ track.artist }}</p>
            <div class="track-actions">
              <div class="match-bar">
                <div class="match-fill" :style="{ width: (track.match * 100) + '%' }"></div>
              </div>
              <button class="add-queue-btn" @click.stop="addToQueue(track)" title="Adicionar à fila">
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useLastFm } from '../composables/useLastFm'

const props = defineProps({
  currentTrack: Object
})

const emit = defineEmits(['play', 'add-to-queue'])

const { 
  isConnected, 
  isLoading,
  connect: connectLastFm,
  getTopTracks, 
  getTopByGenre,
  getRecommendations,
  getSimilarTracks
} = useLastFm()

const defaultImage = '/default-album.jpg'

const tabs = [
  { id: 'global', label: 'Top Global', icon: 'fas fa-globe' },
  { id: 'genres', label: 'Por Gênero', icon: 'fas fa-tags' },
  { id: 'recommendations', label: 'Para Você', icon: 'fas fa-magic' },
  { id: 'similar', label: 'Similares', icon: 'fas fa-random' }
]

const genres = ['rock', 'pop', 'hip-hop', 'electronic', 'indie', 'metal', 'jazz', 'r&b', 'latin', 'k-pop']

const activeTab = ref('global')
const selectedGenre = ref('rock')
const topTracks = ref([])
const genreTracks = ref([])
const recommendations = ref([])
const similarTracks = ref([])

const formatNumber = (num) => {
  if (!num) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const handleImageError = (e) => {
  e.target.src = defaultImage
}

const playTrack = (track) => {
  emit('play', {
    name: track.name,
    artist: track.artist,
    title: track.name,
    source: 'lastfm'
  })
}

const addToQueue = (track) => {
  emit('add-to-queue', {
    name: track.name,
    artist: track.artist,
    title: track.name,
    source: 'lastfm'
  })
}

const loadTopTracks = async () => {
  topTracks.value = await getTopTracks(20)
}

const selectGenre = async (genre) => {
  selectedGenre.value = genre
  genreTracks.value = await getTopByGenre(genre, 20)
}

const loadRecommendations = async () => {
  if (isConnected.value) {
    recommendations.value = await getRecommendations(20)
  }
}

const loadSimilar = async () => {
  if (props.currentTrack) {
    similarTracks.value = await getSimilarTracks(
      props.currentTrack.artist,
      props.currentTrack.title || props.currentTrack.name,
      20
    )
  }
}

// Watch tab changes
watch(activeTab, async (tab) => {
  if (tab === 'global' && !topTracks.value.length) {
    await loadTopTracks()
  } else if (tab === 'genres' && !genreTracks.value.length) {
    await selectGenre(selectedGenre.value)
  } else if (tab === 'recommendations') {
    await loadRecommendations()
  } else if (tab === 'similar') {
    await loadSimilar()
  }
})

// Watch current track for similar
watch(() => props.currentTrack, () => {
  if (activeTab.value === 'similar') {
    loadSimilar()
  }
})

onMounted(() => {
  loadTopTracks()
})
</script>

<style scoped>
.discovery-section {
  padding: 2rem;
  background: rgba(0, 0, 0, 0.5);
  border-top: 2px solid #ff6b6b;
}

.discovery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.discovery-title {
  font-family: 'Snuggle Punk', 'Impact', sans-serif;
  font-size: 1.8rem;
  color: #fff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.discovery-title i {
  color: #ff6b6b;
}

.discovery-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 0.6rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid transparent;
  color: rgba(255, 255, 255, 0.7);
  font-family: 'Cingire', sans-serif;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.tab-btn:hover {
  background: rgba(255, 107, 107, 0.2);
  color: #fff;
}

.tab-btn.active {
  background: #ff6b6b;
  color: #000;
  border-color: #ff6b6b;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.7);
  font-family: 'Cingire', sans-serif;
}

.loading-state i {
  font-size: 1.5rem;
  color: #ff6b6b;
}

.tracks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.track-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s;
}

.track-card:hover {
  background: rgba(255, 107, 107, 0.1);
  border-color: #ff6b6b;
  transform: translateX(5px);
}

.track-rank {
  font-family: 'Snuggle Punk', sans-serif;
  font-size: 1.5rem;
  color: #ff6b6b;
  min-width: 30px;
  text-align: center;
}

.track-image {
  width: 60px;
  height: 60px;
  position: relative;
  flex-shrink: 0;
}

.track-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.track-card:hover .play-overlay {
  opacity: 1;
}

.play-overlay i {
  color: #ff6b6b;
  font-size: 1.5rem;
}

.track-info {
  flex: 1;
  min-width: 0;
}

.track-name {
  font-family: 'Cingire', sans-serif;
  font-size: 1rem;
  color: #fff;
  margin: 0 0 0.2rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-plays {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.3rem;
}

.track-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.3rem;
  gap: 0.5rem;
}

.add-queue-btn {
  width: 28px;
  height: 28px;
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid #ff6b6b;
  color: #ff6b6b;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  flex-shrink: 0;
}

.add-queue-btn:hover {
  background: #ff6b6b;
  color: #000;
  transform: scale(1.1);
}

.add-queue-btn i {
  font-size: 0.7rem;
}

.track-reason {
  font-size: 0.75rem;
  color: #ff6b6b;
  font-style: italic;
  margin-top: 0.3rem;
  display: block;
}

.genre-chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.genre-chip {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-family: 'Cingire', sans-serif;
  font-size: 0.85rem;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
}

.genre-chip:hover {
  background: rgba(255, 107, 107, 0.2);
}

.genre-chip.active {
  background: #ff6b6b;
  color: #000;
  border-color: #ff6b6b;
}

.connect-prompt {
  text-align: center;
  padding: 3rem;
}

.connect-prompt i {
  font-size: 4rem;
  color: #ff6b6b;
  margin-bottom: 1rem;
}

.connect-prompt h3 {
  font-family: 'Cingire', sans-serif;
  font-size: 1.5rem;
  color: #fff;
  margin: 0 0 0.5rem 0;
}

.connect-prompt p {
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 1.5rem 0;
}

.connect-btn {
  padding: 1rem 2rem;
  background: #d51007;
  border: none;
  color: #fff;
  font-family: 'Cingire', sans-serif;
  font-size: 1rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
}

.connect-btn:hover {
  background: #ff6b6b;
  transform: translate(-3px, -3px);
  box-shadow: 3px 3px 0 #d51007;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.5);
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.match-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  margin-top: 0.5rem;
  border-radius: 2px;
  overflow: hidden;
}

.match-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff6b6b, #ffc107);
  border-radius: 2px;
}

@media (max-width: 768px) {
  .discovery-section {
    padding: 1rem;
  }

  .discovery-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .discovery-tabs {
    width: 100%;
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 0.5rem;
  }

  .tab-btn {
    white-space: nowrap;
  }

  .tracks-grid {
    grid-template-columns: 1fr;
  }
}
</style>
