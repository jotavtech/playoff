<template>
  <div class="hero-section">
    <!-- PlayOff Logo Image -->
    <img 
      src="https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748884319/playoff_lds4yw.png" 
      alt="PlayOff" 
      class="playoff-logo"
    />
    
    <!-- Left Side - Player Controls Card -->
    <div 
      class="player-card" 
      :class="{ 'white-album': isWhiteAlbum }"
    >
      <div class="player-info">
        <h2>{{ currentTrack?.title || 'Nenhuma música tocando' }}</h2>
        <p>{{ currentTrack?.artist || 'Selecione uma música' }}</p>
        
        <div class="progress-container">
          <span>{{ formatTime(position) }}</span>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: progressPercentage + '%' }"
            ></div>
          </div>
          <span>{{ formatTime(duration) }}</span>
        </div>
        
        <div class="player-controls">
          <button 
            class="control-btn" 
            @click="$emit('previous-track')"
            title="Anterior"
          >
            <i class="fas fa-step-backward"></i>
          </button>
          
          <button 
            class="control-btn play-pause" 
            @click="$emit('toggle-playback')"
            :title="isPlaying ? 'Pausar' : 'Tocar'"
          >
            <i v-if="!isPlaying" class="fas fa-play"></i>
            <i v-else class="fas fa-pause"></i>
          </button>
          
          <button 
            class="control-btn" 
            @click="$emit('next-track')"
            title="Próxima"
          >
            <i class="fas fa-step-forward"></i>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Right Side - Vinyl Disc (positioned at corner) -->
    <div class="vinyl-container">
      <div 
        class="vinyl-disc" 
        :class="{ playing: isPlaying }"
      >
        <div class="vinyl-center">
          <img 
            v-if="currentTrack?.albumCover && currentTrack.albumCover !== 'https://via.placeholder.com/300x300/333/fff?text=♪'" 
            :src="currentTrack.albumCover" 
            :alt="`${currentTrack.title} - Album Cover`"
            :key="currentTrack.albumCover"
            class="album-cover"
            @load="onImageLoad"
            @error="onImageError"
            crossorigin="anonymous"
          />
          <div 
            v-else 
            class="placeholder-text"
            :title="currentTrack ? `Buscando capa para: ${currentTrack.title}` : 'Nenhuma música selecionada'"
          >
            ♪
          </div>
        </div>
        <div class="vinyl-grooves"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue'
import { useCloudinaryAudio } from '../composables/useCloudinaryAudio'

// Props
const props = defineProps({
  currentTrack: Object,
  isPlaying: Boolean,
  position: Number,
  duration: Number,
  formatTime: Function
})

// Emits
defineEmits(['toggle-playback', 'previous-track', 'next-track'])

// Computed
const progressPercentage = computed(() => {
  if (!props.duration || props.duration === 0) return 0
  return (props.position / props.duration) * 100
})

// Import the brightness detection function
const { detectImageBrightness } = useCloudinaryAudio()

// Reactive variable to track if the current album is white/light
const isWhiteAlbum = ref(false)

// Methods for image debugging
const onImageLoad = (event) => {
  console.log('✅ HERO: Capa do álbum carregada no disco:', props.currentTrack?.albumCover)
  console.log('🖼️ HERO: Dimensões da imagem carregada:', event.target.naturalWidth, 'x', event.target.naturalHeight)
  console.log('🎯 HERO: Elemento img:', event.target)
  console.log('📊 HERO: Track atual completa:', props.currentTrack)
  
  // Analyze the image brightness after it loads
  if (props.currentTrack?.albumCover) {
    detectImageBrightness(props.currentTrack.albumCover).then(isLight => {
      console.log(`🎨 HERO: Capa é clara/branca: ${isLight}`)
      isWhiteAlbum.value = isLight
    })
  }
}

const onImageError = (e) => {
  console.error('❌ HERO: Erro ao carregar capa do álbum:', e.target.src)
  console.error('❌ HERO: Erro detalhes:', e)
  console.error('📊 HERO: Track atual quando erro:', props.currentTrack)
  isWhiteAlbum.value = false
}

// Watch for track changes
watch(() => props.currentTrack, async (newTrack, oldTrack) => {
  console.log('🔄 HERO: Track mudou!')
  console.log('📊 HERO: Track anterior:', oldTrack)
  console.log('📊 HERO: Track nova:', newTrack)
  
  if (newTrack?.albumCover && newTrack.albumCover !== oldTrack?.albumCover) {
    console.log('🎨 HERO: Nova capa detectada, analisando cor...')
    
    try {
      const isLight = await detectImageBrightness(newTrack.albumCover)
      console.log(`🎨 HERO: Resultado da análise - Capa é clara: ${isLight}`)
      isWhiteAlbum.value = isLight
    } catch (error) {
      console.error('❌ HERO: Erro ao analisar cor da capa:', error)
      isWhiteAlbum.value = false
    }
  } else {
    isWhiteAlbum.value = false
  }
}, { deep: true, immediate: true })
</script>

<style scoped>
.hero-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(1px);
}

.album-cover {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
  border-radius: 50%;
  display: block;
  position: relative;
  z-index: 5;
}

.placeholder-text {
  color: #ffffff;
  text-align: center;
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  opacity: 0.7;
  font-weight: bold;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .hero-section {
    flex-direction: column;
    gap: 2rem;
    text-align: center;
    min-height: auto;
    padding: 2rem;
  }

  .player-card {
    flex: none;
    width: 100%;
    max-width: 500px;
  }

  .vinyl-container {
    width: 800px;
    height: 800px;
  }

  .vinyl-disc {
    width: 800px;
    height: 800px;
  }

  .vinyl-center {
    width: 200px;
    height: 200px;
  }
}

@media (max-width: 768px) {
  .hero-section {
    padding: 1rem;
    gap: 1.5rem;
  }

  .vinyl-container {
    width: 600px;
    height: 600px;
  }

  .vinyl-disc {
    width: 600px;
    height: 600px;
  }

  .vinyl-center {
    width: 150px;
    height: 150px;
  }

  .placeholder-text {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .hero-section {
    padding: 1rem 0.5rem;
  }

  .vinyl-container {
    width: 400px;
    height: 400px;
  }

  .vinyl-disc {
    width: 400px;
    height: 400px;
  }

  .vinyl-center {
    width: 100px;
    height: 100px;
  }

  .placeholder-text {
    font-size: 1rem;
  }
}
</style> 