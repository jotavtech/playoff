<template>
  <div class="music-carousel">
    <!-- Title positioned at top left of first cover -->
    <div class="carousel-header">
      <div class="title-container">
        <h2 class="carousel-title">Biblioteca Musical</h2>
      </div>
    </div>

    <!-- Navigation Arrows -->
    <button class="nav-arrow nav-prev" @click="prevPage" :disabled="currentPage === 0">
      <i class="fas fa-chevron-left"></i>
    </button>
    <button class="nav-arrow nav-next" @click="nextPage" :disabled="currentPage >= maxPages">
      <i class="fas fa-chevron-right"></i>
    </button>

    <!-- Giant Diagonal Covers Container -->
    <div class="covers-container" ref="coversContainer" :class="{ 'lyrics-mode': isLyricsVisible }">
      <div 
        v-for="(song, index) in displayedSongs" 
        :key="song.id"
        class="cover-panel"
        :class="{ 
          'playing': currentTrack?.id === song.id,
          'panel-first': index === 0,
          'panel-last': index === displayedSongs.length - 1
        }"
        :style="getPanelStyle(song.id)"
        @click="handleSuperVote(song)"
      >
        <img 
          :src="getAlbumCover(song)" 
          :alt="song.title"
          class="cover-image"
          loading="lazy"
          decoding="async"
          @load="onImageLoad($event, song)"
          @error="handleImageError($event, song)"
          crossorigin="anonymous"
        />
        
        <!-- Overlay with info -->
        <div class="cover-overlay">
          <div class="cover-info">
            <h3 class="cover-title">{{ song.title }}</h3>
            <p class="cover-artist">{{ song.artist }}</p>
            <div class="cover-votes" v-if="song.votes > 0">
              <i class="fas fa-heart"></i> {{ song.votes }}
            </div>
          </div>
          
          <!-- Vote buttons -->
          <div class="cover-actions">
            <button @click.stop="handleVote(song.id)" class="vote-btn" :class="{ voted: hasVoted(song.id) }" title="Votar">
              <i class="fas fa-heart"></i>
            </button>
            <button @click.stop="$emit('add-to-queue', song)" class="queue-btn" title="Adicionar à Fila">
              <i class="fas fa-list-ul"></i>
            </button>
            <button @click.stop="$emit('play-preview', song)" class="preview-btn" title="Preview (30s)">
              <i class="fas fa-headphones"></i>
            </button>
            <button @click.stop="handleSuperVote(song)" class="super-btn" title="Super Voto">
              <i class="fas fa-bolt"></i>
            </button>
            <button @click.stop="$emit('toggle-lyrics', song)" class="lyrics-btn" title="Letra">
              <span class="kanji-icon">水</span>
            </button>
          </div>
        </div>

        <!-- Lyrics Mode Play/Pause Button -->
        <button 
          v-if="isLyricsVisible && currentTrack?.id === song.id" 
          class="lyrics-play-btn" 
          @click.stop="$emit('play-song', song)"
          title="Pausar/Reproduzir"
        >
          <i class="fas" :class="isPlaying ? 'fa-pause' : 'fa-play'"></i>
        </button>

        <!-- Playing badge -->
        <div class="playing-badge" v-if="currentTrack?.id === song.id && isPlaying">
          <span>TOCANDO</span>
        </div>
      </div>
    </div>

    <!-- Page indicator -->
    <div class="page-indicator">
      {{ currentPage + 1 }} / {{ maxPages + 1 }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCloudinaryAudio } from '../composables/useCloudinaryAudio'

const { extractDominantColor } = useCloudinaryAudio()

// Props
const props = defineProps({
  songs: {
    type: Array,
    default: () => []
  },
  currentTrack: {
    type: Object,
    default: null
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  isLyricsVisible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['vote-for-song', 'super-vote', 'play-song', 'play-preview', 'add-to-queue', 'toggle-lyrics'])

// Refs
const coversContainer = ref(null)
const currentPage = ref(0)
const votedSongs = ref(new Set())
const coverColors = ref({}) // Armazena cores extraídas por ID da música

// Computed - Pagination: 4 songs per page for better display
const songsPerPage = 4

const maxPages = computed(() => {
  return Math.max(0, Math.ceil(props.songs.length / songsPerPage) - 1)
})

const displayedSongs = computed(() => {
  const start = currentPage.value * songsPerPage
  return props.songs.slice(start, start + songsPerPage)
})

// Helper to get album cover with fallback
const getAlbumCover = (song) => {
  if (!song.albumCover || song.albumCover === '' || song.albumCover === 'undefined') {
    return '/default-album.jpg'
  }
  return song.albumCover
}

// Color Extraction
const onImageLoad = async (event, song) => {
  try {
    // Extrai cor dominante da imagem carregada
    const result = await extractDominantColor(event.target.src)
    if (result && result.dominantColor) {
      const { r, g, b } = result.dominantColor
      coverColors.value[song.id] = `rgb(${r}, ${g}, ${b})`
    }
  } catch (e) {
    console.warn('Falha ao extrair cor:', e)
  }
}

const getPanelStyle = (songId) => {
  const color = coverColors.value[songId] || 'rgba(255, 255, 255, 0.5)'
  return {
    '--panel-color': color
  }
}

// Navigation methods
const nextPage = () => {
  if (currentPage.value < maxPages.value) {
    currentPage.value++
  }
}

const prevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--
  }
}

// Methods
const handleVote = (songId) => {
  emit('vote-for-song', songId)
  votedSongs.value.add(songId)
}

const handleSuperVote = (song) => {
  emit('super-vote', song)
  votedSongs.value.add(song.id)
}

const hasVoted = (songId) => {
  return votedSongs.value.has(songId)
}

const handleImageError = (event, song) => {
  console.warn(`⚠️ Erro ao carregar capa para "${song?.title || 'desconhecido'}":`, event.target.src)
  if (!event.target.src.includes('default-album.jpg')) {
    event.target.src = '/default-album.jpg'
  }
}

// Watch for songs changes to reset page
watch(() => props.songs, () => {
  currentPage.value = 0
}, { deep: true })
</script>

<style scoped>
/* ============= GIANT DIAGONAL COVERS - PUNK 2000s ============= */

.music-carousel {
  width: 100%;
  margin: 0;
  padding: 0;
  position: relative;
  overflow: hidden;
}

/* Title positioned at top left corner */
.carousel-header {
  position: absolute;
  top: 2rem;
  left: 3rem;
  z-index: 100;
  text-align: left;
}

.title-container {
  display: inline-block;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  padding: 0.8rem 2rem;
  transform: skewX(-8deg);
  border: 3px solid rgba(255, 255, 255, 0.8);
  box-shadow: 
    4px 4px 0 rgba(255, 107, 107, 0.8),
    0 0 30px rgba(0, 0, 0, 0.6);
}

.carousel-title {
  font-family: 'Cingire', sans-serif;
  color: #fff;
  font-size: 2.5rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin: 0;
  transform: skewX(8deg);
  text-shadow: 3px 3px 0 #ff6b6b, 0 0 20px rgba(255, 107, 107, 0.5);
}

/* Navigation Arrows */
.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  width: 70px;
  height: 70px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  border: 3px solid #fff;
  color: #fff;
  font-size: 2rem;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-prev { left: 2rem; }
.nav-next { right: 2rem; }

.nav-arrow:hover:not(:disabled) {
  background: #ff6b6b;
  border-color: #ff6b6b;
  transform: translateY(-50%) scale(1.1);
}

.nav-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Giant Covers Container */
.covers-container {
  display: flex;
  width: 100%;
  height: 70vh;
  min-height: 500px;
  position: relative;
  padding-left: 2rem;
  padding-right: 2rem;
}

/* Each Cover Panel - GIANT & DIAGONAL */
.cover-panel {
  flex: 1;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s ease;
  transform: skewX(-5deg);
  margin: 0 -10px;
  min-width: 0;
  will-change: flex;
  contain: layout style;
  
  /* Borda Punk Animada */
  border: 4px solid var(--panel-color);
  box-shadow: 0 0 15px var(--panel-color);
  animation: borderPulse 3s infinite alternate;
}

@keyframes borderPulse {
  0% { 
    box-shadow: 0 0 10px var(--panel-color); 
    border-color: var(--panel-color);
  }
  50% { 
    box-shadow: 0 0 30px var(--panel-color), inset 0 0 20px var(--panel-color); 
    border-color: #fff; 
  }
  100% { 
    box-shadow: 0 0 10px var(--panel-color); 
    border-color: var(--panel-color);
  }
}

.cover-panel.panel-first {
  margin-left: 0;
}

.cover-panel.panel-last {
  margin-right: 0;
}

.cover-panel:hover {
  flex: 1.4;
  z-index: 10;
}

.cover-panel.playing {
  flex: 1.3;
  z-index: 5;
}

/* Cover Image - Full size */
.cover-image {
  width: 140%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transform: skewX(5deg) scale(1.1);
  transition: transform 0.4s ease;
  filter: contrast(1.05) saturate(1.1);
  margin-left: -20%;
  will-change: transform;
}

.cover-panel:hover .cover-image {
  transform: skewX(5deg) scale(1.15);
  filter: contrast(1.1) saturate(1.2);
}

/* Overlay - always show info */
.cover-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4rem 2rem 2rem;
  background: linear-gradient(transparent, rgba(0,0,0,0.95));
  transform: skewX(5deg);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  opacity: 1;
  transition: opacity 0.3s;
}

.cover-panel:hover .cover-overlay {
  opacity: 1;
}

.cover-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding-left: 1rem;
}

.cover-title {
  font-family: 'Cingire', 'Impact', sans-serif;
  color: #fff;
  font-size: 1.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0;
  text-shadow: 2px 2px 0 #000;
  word-wrap: break-word;
  overflow-wrap: break-word;
  line-height: 1.2;
}

.cover-artist {
  font-family: 'Inter', sans-serif;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  margin: 0;
  text-shadow: 1px 1px 0 #000;
}

.cover-votes {
  font-family: 'Cingire', sans-serif;
  color: #ff6b6b;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
  padding: 0.4rem 0.8rem;
  width: fit-content;
  border: 1px solid rgba(255,255,255,0.2);
  margin-top: 0.3rem;
}

/* Cover Action Buttons */
.cover-actions {
  display: flex;
  gap: 1rem;
  padding-left: 1rem;
  opacity: 0;
  transition: opacity 0.3s;
}

.cover-panel:hover .cover-actions {
  opacity: 1;
}

.vote-btn, .super-btn {
  width: 50px;
  height: 50px;
  background: transparent;
  border: 3px solid #fff;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vote-btn:hover, .vote-btn.voted {
  background: #ff6b6b;
  border-color: #ff6b6b;
  transform: translate(-2px, -2px);
  box-shadow: 2px 2px 0 #fff;
}

.queue-btn {
  width: 50px;
  height: 50px;
  background: transparent;
  border: 3px solid #fff;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.queue-btn:hover {
  background: #1DB954;
  border-color: #1DB954;
  transform: translate(-2px, -2px);
  box-shadow: 2px 2px 0 #fff;
}

.preview-btn {
  width: 50px;
  height: 50px;
  background: transparent;
  border: 3px solid #fff;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-btn:hover {
  background: #9b59b6;
  border-color: #9b59b6;
  transform: translate(-2px, -2px);
  box-shadow: 2px 2px 0 #fff;
}

.super-btn {
  background: #ffd700;
  border-color: #ffd700;
  color: #000;
}

.super-btn:hover {
  background: #fff;
  transform: translate(-2px, -2px);
  box-shadow: 2px 2px 0 #ffd700;
}

.lyrics-btn {
  width: 50px;
  height: 50px;
  background: #ff6b6b;
  border: 3px solid #ff6b6b;
  color: #fff;
  font-size: 1.4rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Noto Sans JP', sans-serif; /* Ensure font supports Kanji if possible, or fallback */
}

.lyrics-btn:hover {
  background: #fff;
  color: #ff6b6b;
  transform: translate(-2px, -2px);
  box-shadow: 2px 2px 0 #ff6b6b;
}

.lyrics-play-btn {
  position: absolute;
  right: -30px; /* Protrude from the card */
  top: 50%;
  transform: translateY(-50%);
  width: 70px;
  height: 70px;
  background: #ff6b6b;
  border: 4px solid #fff;
  border-radius: 50%;
  color: #fff;
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  box-shadow: 4px 4px 0 rgba(0,0,0,0.5);
  transition: all 0.2s;
}

.lyrics-play-btn:hover {
  transform: translateY(-50%) scale(1.1);
  background: #fff;
  color: #ff6b6b;
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.8);
}

.kanji-icon {
  font-weight: bold;
  line-height: 1;
}

/* Lyrics Mode - Shrink Effect */
.covers-container.lyrics-mode .cover-panel {
  transform: skewX(-5deg) scale(0.7) translateY(10%) !important;
  opacity: 0.4;
  filter: grayscale(0.8);
}

.covers-container.lyrics-mode .cover-panel.playing {
  transform: skewX(-5deg) scale(0.75) translateY(10%) !important;
  opacity: 1; /* Keep playing song visible */
  filter: none;
  z-index: 20;
}

/* Playing Badge - Blurred */
.playing-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) skewX(5deg);
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  padding: 1rem 2rem;
  border: 3px solid #fff;
  z-index: 20;
  animation: badgePulse 2s infinite;
}

.playing-badge span {
  font-family: 'Cingire', 'Impact', sans-serif;
  color: #fff;
  font-size: 1.5rem;
  letter-spacing: 0.3em;
}

@keyframes badgePulse {
  0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.3); }
  50% { box-shadow: 0 0 40px rgba(255,255,255,0.6); }
}

/* Page Indicator */
.page-indicator {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Cingire', sans-serif;
  color: #fff;
  font-size: 1.2rem;
  letter-spacing: 0.2em;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(10px);
  padding: 0.5rem 1.5rem;
  border: 2px solid #fff;
  z-index: 100;
}

/* Mobile */
@media (max-width: 768px) {
  .covers-container {
    flex-direction: column;
    height: auto;
    padding-left: 0;
    padding-right: 0;
  }
  
  .carousel-header {
    left: 1rem;
    top: 1rem;
  }
  
  .title-container {
    padding: 0.5rem 1.2rem;
  }
  
  .carousel-title {
    font-size: 1.6rem;
  }
  
  .cover-panel {
    transform: skewY(-3deg);
    margin: -15px 0;
    height: 250px;
  }
  
  .cover-panel.panel-first { margin-top: 0; }
  .cover-panel.panel-last { margin-bottom: 0; }
  
  .cover-image {
    transform: skewY(3deg) scale(1.2);
    width: 100%;
    margin-left: 0;
  }
  
  .cover-overlay {
    transform: skewY(3deg);
  }
  
  .cover-info {
    padding-left: 0.5rem;
  }
  
  .playing-badge {
    transform: translate(-50%, -50%) skewY(3deg);
  }
  
  .nav-arrow {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
  }
  
  .nav-prev { left: 1rem; }
  .nav-next { right: 1rem; }
  
  .cover-title {
    font-size: 1.3rem;
  }
}
</style> 