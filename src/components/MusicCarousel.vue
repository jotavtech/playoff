<template>
  <div class="music-carousel">
    <div class="carousel-header">
      <h2 class="carousel-title">
        <i class="fas fa-compact-disc"></i>
        Biblioteca Musical
      </h2>
      <div class="carousel-controls">
        <button 
          @click="scrollCarousel(-1)" 
          class="carousel-btn prev"
          :disabled="currentIndex === 0"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="carousel-indicator">
          {{ currentIndex + 1 }} / {{ songs.length }}
        </span>
        <button 
          @click="scrollCarousel(1)" 
          class="carousel-btn next"
          :disabled="currentIndex >= songs.length - itemsPerView"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>

    <div class="carousel-container" ref="carouselContainer">
      <div 
        class="carousel-track" 
        :style="{ transform: `translateX(-${currentIndex * cardWidth}px)` }"
        ref="carouselTrack"
      >
        <div 
          v-for="song in songs" 
          :key="song.id"
          class="music-card"
          :class="{ 
            'playing': currentTrack?.id === song.id,
            'highest-voted': song === highestVotedSong
          }"
        >
          <!-- Album Cover -->
          <div class="album-cover">
            <div class="image-container">
              <img 
                :src="song.albumCover || '/default-album.jpg'" 
                :alt="`${song.title} - ${song.artist}`"
                @error="handleImageError"
                @load="handleImageLoad"
                loading="lazy"
                class="album-image"
                :data-song-id="song.id"
              />
              <div class="loading-overlay" v-if="!imageLoaded[song.id]">
                <i class="fas fa-spinner fa-spin"></i>
              </div>
            </div>
            <div class="play-overlay" v-if="currentTrack?.id === song.id && isPlaying">
              <i class="fas fa-play"></i>
              <span class="play-text">Tocando</span>
            </div>
            <div class="votes-badge" v-if="song.votes > 0">
              <i class="fas fa-heart"></i>
              {{ song.votes }}
            </div>
            <!-- Highest voted crown -->
            <div class="crown-badge" v-if="song === highestVotedSong && song.votes > 0">
              <i class="fas fa-crown"></i>
            </div>
          </div>

          <!-- Song Info -->
          <div class="song-info">
            <h3 class="song-title">{{ song.title }}</h3>
            <p class="song-artist">{{ song.artist }}</p>
            <p class="song-album">{{ song.album || 'Album Desconhecido' }}</p>
            <p class="song-year">{{ song.year || getRandomYear() }}</p>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <button 
              @click="handleVote(song.id)"
              class="vote-btn"
              :class="{ 'voted': hasVoted(song.id) }"
            >
              <i class="fas fa-heart"></i>
              <span>Votar</span>
            </button>

            <button 
              @click="handleSuperVote(song)"
              class="super-vote-btn"
              :class="{ 'playing': currentTrack?.id === song.id }"
            >
              <i class="fas fa-bolt"></i>
              <span>Super Voto</span>
            </button>
          </div>

          <!-- Playing Indicator -->
          <div class="playing-indicator" v-if="currentTrack?.id === song.id">
            <div class="equalizer">
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Touch Controls -->
    <div class="mobile-controls" v-if="isMobile">
      <div class="swipe-hint">
        <i class="fas fa-hand-paper"></i>
        Deslize para navegar
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

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
  }
})

// Emits
const emit = defineEmits(['vote-for-song', 'super-vote', 'play-song'])

// Refs
const carouselContainer = ref(null)
const carouselTrack = ref(null)
const currentIndex = ref(0)
const cardWidth = ref(320) // Default card width
const itemsPerView = ref(3) // Default items per view
const isMobile = ref(false)
const votedSongs = ref(new Set())
const imageLoaded = ref({})

// Computed
const highestVotedSong = computed(() => {
  if (!props.songs.length) return null
  return props.songs.reduce((highest, song) => 
    song.votes > (highest?.votes || 0) ? song : highest
  )
})

// Methods
const scrollCarousel = (direction) => {
  const maxIndex = Math.max(0, props.songs.length - itemsPerView.value)
  
  if (direction === 1 && currentIndex.value < maxIndex) {
    currentIndex.value++
  } else if (direction === -1 && currentIndex.value > 0) {
    currentIndex.value--
  }
}

const handleVote = (songId) => {
  emit('vote-for-song', songId)
  votedSongs.value.add(songId)
}

const handleSuperVote = (song) => {
  // Super vote: Emite evento especial para voto + reprodução imediata
  emit('super-vote', song)
  votedSongs.value.add(song.id)
}

const hasVoted = (songId) => {
  return votedSongs.value.has(songId)
}

const handleImageLoad = (event) => {
  // Extract song ID from image alt attribute or data attribute
  const songId = event.target.dataset.songId
  
  if (songId) {
    imageLoaded.value = { ...imageLoaded.value, [songId]: true }
  }
}

const handleImageError = (event) => {
  console.log('⚠️ Erro ao carregar imagem:', event.target.src)
  // Try fallback URL or use default
  if (!event.target.src.includes('default-album.jpg')) {
    event.target.src = '/default-album.jpg'
  }
}

const getRandomYear = () => {
  const currentYear = new Date().getFullYear()
  return Math.floor(Math.random() * (currentYear - 1950) + 1950)
}

// Debounced update function to prevent excessive re-renders
let updateTimeout = null
const debouncedUpdateCarouselDimensions = () => {
  if (updateTimeout) clearTimeout(updateTimeout)
  updateTimeout = setTimeout(updateCarouselDimensions, 150)
}

const updateCarouselDimensions = () => {
  if (!carouselContainer.value) return
  
  const containerWidth = carouselContainer.value.offsetWidth
  const oldIsMobile = isMobile.value
  const oldItemsPerView = itemsPerView.value
  
  isMobile.value = window.innerWidth <= 768
  
  if (isMobile.value) {
    cardWidth.value = Math.min(containerWidth - 40, 300) // Full width minus padding, max 300px
    itemsPerView.value = 1
  } else if (containerWidth <= 1024) {
    cardWidth.value = 300
    itemsPerView.value = Math.max(2, Math.floor(containerWidth / 340))
  } else {
    cardWidth.value = 320
    itemsPerView.value = Math.max(3, Math.floor(containerWidth / 340))
  }
  
  // Reset carousel position if layout changed significantly
  if (oldIsMobile !== isMobile.value || oldItemsPerView !== itemsPerView.value) {
    currentIndex.value = 0
  }
}

// Touch/Swipe handling for mobile
let startX = 0
let currentX = 0
let isDragging = false

const handleTouchStart = (e) => {
  startX = e.touches[0].clientX
  isDragging = true
}

const handleTouchMove = (e) => {
  if (!isDragging) return
  currentX = e.touches[0].clientX
}

const handleTouchEnd = () => {
  if (!isDragging) return
  
  const diff = startX - currentX
  const threshold = 50
  
  if (Math.abs(diff) > threshold) {
    if (diff > 0) {
      scrollCarousel(1) // Swipe left - next
    } else {
      scrollCarousel(-1) // Swipe right - previous
    }
  }
  
  isDragging = false
}

// Watch for songs changes to reset carousel
watch(() => props.songs, () => {
  currentIndex.value = 0
}, { deep: true })

// Lifecycle
onMounted(() => {
  updateCarouselDimensions()
  window.addEventListener('resize', debouncedUpdateCarouselDimensions)
  
  // Add touch event listeners for mobile
  if (carouselContainer.value) {
    carouselContainer.value.addEventListener('touchstart', handleTouchStart)
    carouselContainer.value.addEventListener('touchmove', handleTouchMove)
    carouselContainer.value.addEventListener('touchend', handleTouchEnd)
  }
  
  // Initialize image loaded state for existing songs
  props.songs.forEach(song => {
    if (!imageLoaded.value[song.id]) {
      imageLoaded.value[song.id] = false
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedUpdateCarouselDimensions)
  
  if (carouselContainer.value) {
    carouselContainer.value.removeEventListener('touchstart', handleTouchStart)
    carouselContainer.value.removeEventListener('touchmove', handleTouchMove)
    carouselContainer.value.removeEventListener('touchend', handleTouchEnd)
  }
  
  // Clear timeout
  if (updateTimeout) {
    clearTimeout(updateTimeout)
  }
})
</script>

<style scoped>
.music-carousel {
  width: 100%;
  max-width: 1400px;
  margin: 4rem auto 0;
  padding: 1.5rem 1rem 2rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 20px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  position: relative;
}

/* Linha divisória sutil acima do carrossel */
.music-carousel::before {
  content: '';
  position: absolute;
  top: -3rem;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 107, 107, 0.5), transparent);
  border-radius: 1px;
}

.carousel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 0 1rem;
}

.carousel-title {
  color: #fff;
  font-size: 1.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.carousel-title i {
  color: #ff6b6b;
  animation: spin 4s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.carousel-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.carousel-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.carousel-btn:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.carousel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.carousel-indicator {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  min-width: 80px;
  text-align: center;
}

.carousel-container {
  overflow: hidden;
  position: relative;
  border-radius: 15px;
}

.carousel-track {
  display: flex;
  gap: 1.5rem;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 1rem;
}

.music-card {
  flex: 0 0 300px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
  border-radius: 20px;
  padding: 1.5rem;
  position: relative;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.music-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 50% 50%, rgba(255, 107, 107, 0.1), transparent 60%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.music-card:hover::before {
  opacity: 1;
}

.music-card:hover {
  transform: translateY(-10px) scale(1.02);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 107, 107, 0.3);
}

.music-card.playing {
  border-color: #ff6b6b;
  box-shadow: 0 0 30px rgba(255, 107, 107, 0.4);
}

.music-card.highest-voted {
  border-color: #ffd700;
  box-shadow: 0 0 25px rgba(255, 215, 0, 0.3);
}

.album-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 15px;
  overflow: hidden;
  margin-bottom: 1rem;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.image-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  overflow: hidden;
}

.album-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.loading-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.5rem;
  z-index: 2;
}

.music-card:hover .album-image {
  transform: scale(1.05);
}

.play-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 107, 107, 0.95);
  color: #fff;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  backdrop-filter: blur(15px);
  animation: pulse 2s infinite;
  box-shadow: 0 4px 20px rgba(255, 107, 107, 0.4);
}

.play-text {
  font-size: 0.7rem;
  font-weight: 600;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.crown-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #333;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(255, 215, 0, 0.5);
  animation: crownPulse 3s ease-in-out infinite;
}

@keyframes crownPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.1); }
}

.votes-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 107, 107, 0.9);
  color: #fff;
  padding: 0.3rem 0.6rem;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  backdrop-filter: blur(10px);
}

.song-info {
  margin-bottom: 1.5rem;
}

.song-title {
  color: #fff;
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.song-artist {
  color: #ff6b6b;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.3rem 0;
}

.song-album {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  margin: 0 0 0.3rem 0;
}

.song-year {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
  margin: 0;
}

.action-buttons {
  display: flex;
  gap: 0.8rem;
}

.vote-btn, .super-vote-btn {
  flex: 1;
  padding: 0.8rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  backdrop-filter: blur(10px);
}

.vote-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.vote-btn:hover {
  background: rgba(255, 107, 107, 0.2);
  border-color: rgba(255, 107, 107, 0.3);
  transform: translateY(-2px);
}

.vote-btn.voted {
  background: rgba(255, 107, 107, 0.3);
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.super-vote-btn {
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #333;
  border: 1px solid #ffd700;
}

.super-vote-btn:hover {
  background: linear-gradient(135deg, #ffed4e, #fff);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
}

.super-vote-btn.playing {
  background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
  color: #fff;
  border-color: #ff6b6b;
}

.playing-indicator {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
}

.equalizer {
  display: flex;
  gap: 2px;
  align-items: end;
  height: 20px;
}

.equalizer .bar {
  width: 3px;
  background: #ff6b6b;
  border-radius: 2px;
  animation: equalizer 1s ease-in-out infinite;
}

.equalizer .bar:nth-child(1) { animation-delay: 0s; }
.equalizer .bar:nth-child(2) { animation-delay: 0.2s; }
.equalizer .bar:nth-child(3) { animation-delay: 0.4s; }
.equalizer .bar:nth-child(4) { animation-delay: 0.6s; }

@keyframes equalizer {
  0%, 100% { height: 5px; }
  50% { height: 20px; }
}

.mobile-controls {
  text-align: center;
  margin-top: 1rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
}

.swipe-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .music-carousel {
    margin-top: 1rem; /* Reduzindo de 6rem para 3rem */
    padding: 1rem 0.5rem 1rem; /* Reduzindo padding superior */
  }
  
  .carousel-header {
    flex-direction: column;
    gap: 0.8rem; /* Reduzindo de 1rem para 0.8rem */
    margin-bottom: 1rem; /* Reduzindo de 1rem para 1rem */
  }
  
  .carousel-title {
    font-size: 1.3rem; /* Reduzindo de 1.5rem para 1.3rem */
  }
  
  .music-card {
    flex: 0 0 calc(100vw - 3rem);
    margin: 0;
  }
  
  .carousel-track {
    gap: 1rem;
    padding: 0.5rem;
  }
  
  .carousel-controls {
    display: none;
  }
}

@media (max-width: 480px) {
  .music-carousel {
    margin-top: 2rem; /* Reduzindo de 4rem para 2rem */
    padding: 1rem 0.5rem 1rem; /* Reduzindo padding */
  }
  
  .carousel-header {
    margin-bottom: 0.8rem; /* Reduzindo margin-bottom */
  }
  
  .carousel-title {
    font-size: 1.2rem; /* Reduzindo ainda mais em mobile */
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .vote-btn, .super-vote-btn {
    padding: 0.6rem;
    font-size: 0.9rem;
  }
}
</style> 