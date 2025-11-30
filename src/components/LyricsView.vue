<template>
  <div class="lyrics-view" :class="{ 'split-mode': viewMode === 'both' }">
    <!-- Controles no topo -->
    <div class="view-controls">
      <button class="close-btn" @click="$emit('close')" title="Fechar">
        <i class="fas fa-times"></i>
      </button>
      
      <div class="mode-toggle">
        <button 
          :class="['mode-btn', { active: viewMode === 'lyrics' }]"
          @click="viewMode = 'lyrics'"
          title="Apenas Letras"
        >
          <i class="fas fa-align-left"></i>
          <span class="mode-label">Letras</span>
        </button>
        <button 
          :class="['mode-btn', { active: viewMode === 'both' }]"
          @click="viewMode = 'both'"
          title="Letras + Clipe"
        >
          <i class="fas fa-columns"></i>
          <span class="mode-label">Ambos</span>
        </button>
        <button 
          :class="['mode-btn', { active: viewMode === 'video' }]"
          @click="viewMode = 'video'"
          title="Apenas Clipe"
        >
          <i class="fab fa-youtube"></i>
          <span class="mode-label">Clipe</span>
        </button>
      </div>
    </div>

    <!-- Container Principal -->
    <div class="content-wrapper">
      <!-- Seção de Letras -->
      <div 
        v-show="viewMode === 'lyrics' || viewMode === 'both'" 
        class="lyrics-section"
        :class="{ 'half-width': viewMode === 'both' }"
      >
        <div class="lyrics-container" ref="lyricsContainer" @scroll.passive="handleScroll">
          <div v-if="isLoading" class="loading-state">
            <i class="fas fa-bolt fa-spin" :style="{ color: dominantColor || '#fff' }"></i>
            <p>Sintonizando frequência...</p>
          </div>
          
          <div v-else-if="error" class="error-state">
            <i class="fas fa-skull-crossbones"></i>
            <p>Letra não encontrada</p>
            <p class="error-detail">{{ error }}</p>
          </div>
          
          <div v-else-if="lyrics && lyrics.length > 0" class="lyrics-lines">
            <div 
              v-for="(line, index) in lyrics" 
              :key="index"
              class="lyric-wrapper"
              :class="{ 
                'active-wrapper': index === currentLineIndex,
                'past-wrapper': index < currentLineIndex,
                'future-wrapper': index > currentLineIndex
              }"
            >
              <img 
                v-if="shouldShowDecor(index, 'left')"
                :src="getLineDecoration(index)"
                class="tribal-decor left"
                :style="getDecorStyle(index)"
                alt=""
              />
              
              <div class="line-content">
                <p 
                  class="lyric-line"
                  :class="{ 
                    'active': index === currentLineIndex,
                    'long-text': isLongLine(line.text)
                  }"
                  :style="getLineStyle(index)"
                  @click="seekTo(line.time)"
                >
                  {{ line.text }}
                </p>
                
                <div v-if="index === currentLineIndex" class="sing-timer">
                  <div 
                    class="timer-bar" 
                    :style="{ 
                      backgroundColor: dominantColor || '#fff',
                      animationDuration: `${getLineDuration(index)}s`
                    }"
                  ></div>
                </div>
              </div>

              <img 
                v-if="shouldShowDecor(index, 'right')"
                :src="getLineDecoration(index)"
                class="tribal-decor right"
                :style="getDecorStyle(index)"
                alt=""
              />
            </div>
          </div>
          
          <div v-else class="empty-state">
            <p>INSTRUMENTAL</p>
          </div>
        </div>
      </div>

      <!-- Seção de Vídeo -->
      <div 
        v-show="viewMode === 'video' || viewMode === 'both'" 
        class="video-section"
        :class="{ 'half-width': viewMode === 'both' }"
      >
        <div v-if="isLoadingVideo" class="video-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Buscando clipe...</p>
        </div>
        
        <div v-else-if="videoError" class="video-error">
          <i class="fab fa-youtube"></i>
          <p>Clipe não encontrado</p>
          <button class="retry-btn" @click="searchVideo">
            <i class="fas fa-redo"></i> Tentar novamente
          </button>
        </div>
        
        <div v-else-if="videoId" class="video-container">
          <iframe
            :src="`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            class="youtube-player"
          ></iframe>
        </div>
        
        <div v-else class="video-placeholder">
          <i class="fab fa-youtube"></i>
          <p>Clique em "Clipe" para buscar o videoclipe</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick, computed } from 'vue'

const props = defineProps({
  lyrics: {
    type: Array,
    default: () => []
  },
  track: {
    type: Object,
    default: null
  },
  currentLineIndex: {
    type: Number,
    default: -1
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  dominantColor: {
    type: String,
    default: '#ff6b6b'
  }
})

const emit = defineEmits(['close', 'seek'])

// Estado
const viewMode = ref('lyrics') // 'lyrics' | 'video' | 'both'
const videoId = ref(null)
const isLoadingVideo = ref(false)
const videoError = ref(false)
const lyricsContainer = ref(null)

// Busca vídeo no YouTube
const searchVideo = async () => {
  if (!props.track) return
  
  isLoadingVideo.value = true
  videoError.value = false
  
  try {
    const query = `${props.track.title || props.track.name} ${props.track.artist} official video`
    const response = await fetch(`/auth/youtube/search?q=${encodeURIComponent(query)}&limit=1`)
    
    if (response.ok) {
      const results = await response.json()
      if (results && results.length > 0) {
        videoId.value = results[0].id
      } else {
        videoError.value = true
      }
    } else {
      videoError.value = true
    }
  } catch (error) {
    console.error('Erro ao buscar vídeo:', error)
    videoError.value = true
  } finally {
    isLoadingVideo.value = false
  }
}

// Watch viewMode para buscar vídeo quando necessário
watch(viewMode, (newMode) => {
  if ((newMode === 'video' || newMode === 'both') && !videoId.value && !isLoadingVideo.value) {
    searchVideo()
  }
})

// Watch track para resetar vídeo quando trocar música
watch(() => props.track, () => {
  videoId.value = null
  videoError.value = false
  if (viewMode.value === 'video' || viewMode.value === 'both') {
    searchVideo()
  }
})

// Imagens tribais
const tribalDecorations = [
  'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1764354409/e043da0489879c615d5063b55c5ab0c7-removebg-preview_aroulq.png',
  'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1764354409/f71e42405ccc0d760e397cf03b0cf5b7-removebg-preview_lazpjg.png',
  'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1764354409/61931ac719e6d079156620b1c94535cb-removebg-preview_b1jeta.png',
  'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1764354409/6603a562e7b182e052f6923d5a3966a3-removebg-preview_pnqo4g.png'
]

const isChorusLine = (index) => {
  if (!props.lyrics || props.lyrics.length === 0) return false
  const line = props.lyrics[index].text.toLowerCase().trim()
  if (line.length < 5) return false
  const count = props.lyrics.filter(l => l.text.toLowerCase().trim() === line).length
  return count >= 3
}

const shouldShowDecor = (index, side) => {
  if (index !== props.currentLineIndex) return false
  if (!isChorusLine(index)) return false
  if (index % 2 === 0) {
    return side === 'left'
  } else {
    return side === 'right'
  }
}

const getLineDecoration = (index) => {
  const decorIndex = index % tribalDecorations.length
  return tribalDecorations[decorIndex]
}

const getDecorStyle = (index) => {
  const color = props.dominantColor || '#ffffff'
  return {
    filter: `drop-shadow(0 0 15px ${color})`
  }
}

const isLongLine = (text) => {
  return text && text.length > 40
}

const getLineStyle = (index) => {
  const color = props.dominantColor || '#ffffff'
  
  if (index === props.currentLineIndex) {
    return {
      color: '#fff',
      textShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
      borderColor: color
    }
  }
  return {}
}

const getLineDuration = (index) => {
  if (!props.lyrics || index < 0 || index >= props.lyrics.length) return 0
  
  if (index < props.lyrics.length - 1) {
    const current = props.lyrics[index]
    const next = props.lyrics[index + 1]
    
    if (current && next && typeof current.time === 'number' && typeof next.time === 'number') {
      const duration = next.time - current.time
      return Math.max(duration, 1)
    }
  }
  return 4
}

const seekTo = (time) => {
  emit('seek', time)
}

const handleScroll = () => {}

const scrollToActiveLine = () => {
  const container = lyricsContainer.value
  if (!container) return

  const wrappers = container.children[0]?.children
  if (!wrappers) return

  const targetElement = wrappers[props.currentLineIndex]

  if (targetElement) {
    const containerHeight = container.clientHeight
    const elementTop = targetElement.offsetTop
    const elementHeight = targetElement.clientHeight
    
    const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2)
    
    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    })
  }
}

watch(() => props.currentLineIndex, (newIndex) => {
  if (newIndex >= 0) {
    nextTick(() => {
      scrollToActiveLine()
    })
  }
})

onMounted(() => {
  if (props.currentLineIndex >= 0) {
    scrollToActiveLine()
  }
})
</script>

<style scoped>
.lyrics-view {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  z-index: 15;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.98);
}

/* Controles no topo */
.view-controls {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 100%);
}

.close-btn {
  width: 50px;
  height: 50px;
  background: rgba(255, 107, 107, 0.2);
  border: 2px solid #ff6b6b;
  color: #ff6b6b;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.close-btn:hover {
  background: #ff6b6b;
  color: #000;
  transform: rotate(90deg);
}

.mode-toggle {
  display: flex;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.5);
  padding: 0.5rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.mode-btn {
  padding: 0.8rem 1.2rem;
  background: transparent;
  border: 2px solid transparent;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Cingire', sans-serif;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
}

.mode-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.mode-btn.active {
  background: #ff6b6b;
  color: #000;
  border-color: #ff6b6b;
}

.mode-btn i {
  font-size: 1.1rem;
}

/* Container principal */
.content-wrapper {
  display: flex;
  width: 100%;
  height: 100%;
  padding-top: 80px;
}

/* Seções */
.lyrics-section,
.video-section {
  width: 100%;
  height: 100%;
  transition: width 0.4s ease;
}

.lyrics-section.half-width,
.video-section.half-width {
  width: 50%;
}

/* Lyrics Container */
.lyrics-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  perspective: 1000px;
  mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
}

.lyrics-lines {
  display: flex;
  flex-direction: column;
  align-items: flex-end; 
  gap: 1rem;
  width: 100%;
  max-width: 1200px;
  padding: 40vh 5%; 
}

.split-mode .lyrics-lines {
  align-items: center;
  padding: 40vh 2%;
}

.lyric-wrapper {
  display: flex;
  align-items: center;
  justify-content: flex-end; 
  gap: 20px;
  width: 100%;
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease;
  transform-origin: right center;
  opacity: 0.3;
  transform: translateX(50px) scale(0.8) rotateY(-10deg);
  will-change: transform, opacity;
}

.split-mode .lyric-wrapper {
  justify-content: center;
  transform: scale(0.85);
}

.line-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: fit-content;
}

.sing-timer {
  width: 100%;
  height: 4px;
  background: rgba(255,255,255,0.1);
  margin-top: 5px;
  border-radius: 2px;
  overflow: hidden;
}

.timer-bar {
  height: 100%;
  width: 0%;
  animation-name: timer-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  box-shadow: 0 0 10px currentColor;
}

@keyframes timer-progress {
  from { width: 0%; }
  to { width: 100%; }
}

.future-wrapper {
  opacity: 0.3;
  transform: translateX(100px) scale(0.8) rotateY(-20deg);
}

.past-wrapper {
  opacity: 0.1;
  transform: translateX(200px) scale(0.7) rotateY(-30deg);
  filter: blur(2px);
}

.active-wrapper {
  opacity: 1;
  transform: translateX(0) scale(1.1) rotateY(0deg);
  z-index: 10;
  filter: none;
  justify-content: center; 
  margin: 2rem 0;
}

.split-mode .active-wrapper {
  transform: scale(1);
}

.tribal-decor {
  height: 120px; 
  width: auto;
  opacity: 0.8;
  transition: all 0.6s ease;
  pointer-events: none;
}

.split-mode .tribal-decor {
  height: 80px;
}

.tribal-decor.left {
  transform: translateX(20px);
}

.tribal-decor.right {
  transform: translateX(-20px) scaleX(-1);
}

.lyric-line {
  font-family: 'Impact', 'Cingire', sans-serif;
  font-size: 3rem;
  text-transform: uppercase;
  font-style: italic;
  color: rgba(255, 255, 255, 0.5);
  text-align: right;
  cursor: pointer;
  transition: all 0.4s;
  white-space: normal;
  word-wrap: break-word;
  max-width: 90%;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.8rem 1.5rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.split-mode .lyric-line {
  font-size: 2rem;
  text-align: center;
}

.lyric-line.long-text {
  font-size: 2rem;
  max-width: 95%;
}

.split-mode .lyric-line.long-text {
  font-size: 1.5rem;
}

.lyric-line:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.active-wrapper .lyric-line {
  font-size: 4rem;
  background: rgba(0, 0, 0, 0.6);
  text-align: center;
  box-shadow: none;
  border-bottom: 4px solid currentColor;
  transform: none;
  padding-bottom: 0.2rem;
}

.split-mode .active-wrapper .lyric-line {
  font-size: 2.5rem;
}

.active-wrapper .lyric-line.long-text {
  font-size: 2.8rem;
}

.split-mode .active-wrapper .lyric-line.long-text {
  font-size: 1.8rem;
}

/* Video Section */
.video-section {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  border-left: 2px solid rgba(255, 107, 107, 0.3);
}

.video-container {
  width: 100%;
  height: 100%;
  max-height: calc(100vh - 100px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.youtube-player {
  width: 100%;
  height: 100%;
  max-width: 100%;
  aspect-ratio: 16/9;
}

.video-loading,
.video-error,
.video-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Cingire', sans-serif;
  text-align: center;
  padding: 2rem;
}

.video-loading i,
.video-error i,
.video-placeholder i {
  font-size: 4rem;
  color: #ff6b6b;
}

.retry-btn {
  padding: 0.8rem 1.5rem;
  background: #ff6b6b;
  border: none;
  color: #000;
  font-family: 'Cingire', sans-serif;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
}

.retry-btn:hover {
  background: #fff;
  transform: scale(1.05);
}

/* States */
.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #fff;
  font-family: 'Impact', sans-serif;
  font-size: 2rem;
}

.error-detail {
  font-size: 1rem;
  color: rgba(255,255,255,0.5);
}

/* Mobile */
@media (max-width: 768px) {
  .view-controls {
    padding: 0.8rem 1rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .close-btn {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
  }

  .mode-toggle {
    padding: 0.3rem;
  }

  .mode-btn {
    padding: 0.5rem 0.8rem;
    font-size: 0.8rem;
  }

  .mode-label {
    display: none;
  }

  .content-wrapper {
    flex-direction: column;
    padding-top: 70px;
  }

  .lyrics-section.half-width,
  .video-section.half-width {
    width: 100%;
    height: 50%;
  }

  .video-section {
    border-left: none;
    border-top: 2px solid rgba(255, 107, 107, 0.3);
  }

  .lyric-line { 
    font-size: 1.5rem; 
    text-shadow: none !important;
  }

  .active-wrapper .lyric-line { 
    font-size: 2rem;
    box-shadow: none !important;
    transform: none !important;
    border-bottom-width: 3px !important;
  }

  .tribal-decor { 
    height: 50px; 
    opacity: 0.5; 
  }
  
  .lyric-wrapper { 
    transform: none !important; 
    opacity: 1 !important; 
    justify-content: center; 
    transition: opacity 0.3s ease;
  }
  
  .lyrics-lines { 
    align-items: center; 
    padding: 40vh 1rem; 
    gap: 1.5rem;
  }
  
  .future-wrapper, .past-wrapper { 
    opacity: 0.4 !important; 
    filter: none !important; 
    transform: scale(0.95) !important;
  }
  
  .timer-bar {
    box-shadow: none !important;
  }
}
</style>
