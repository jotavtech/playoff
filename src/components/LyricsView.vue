<template>
  <div 
    class="lyrics-view" 
    :class="{ 
      'video-active': viewMode !== 'lyrics' && videoId,
      'split-mode': viewMode === 'both'
    }"
    :style="{ '--accent-color': dominantColor || '#ff6b6b' }"
  >
    <!-- Video de Fundo (modo clipe ou ambos) -->
    <div v-if="viewMode !== 'lyrics' && videoId" class="video-background">
      <div id="youtube-player" ref="playerContainer"></div>
      <div class="video-overlay" :class="{ 'dark-overlay': viewMode === 'both' }"></div>
    </div>

    <!-- Botao fechar -->
    <button class="close-btn" @click="handleClose" title="Fechar">
      <i class="fas fa-times"></i>
    </button>

    <!-- Indicador de audio -->
    <div v-if="viewMode !== 'lyrics' && videoId" class="audio-source">
      <i class="fab fa-youtube"></i>
      <span>Audio do Clipe</span>
    </div>

    <!-- Container de Letras -->
    <div v-if="viewMode !== 'video'" class="lyrics-container" ref="lyricsContainer">
      <div v-if="isLoading" class="loading-state">
        <i class="fas fa-bolt fa-spin" :style="{ color: dominantColor || '#fff' }"></i>
        <p>Sintonizando frequencia...</p>
      </div>
      
      <div v-else-if="error" class="error-state">
        <i class="fas fa-skull-crossbones"></i>
        <p>Letra nao encontrada</p>
      </div>
      
      <div v-else-if="lyrics && lyrics.length > 0" class="lyrics-lines">
        <div 
          v-for="(line, index) in lyrics" 
          :key="index"
          class="lyric-wrapper"
          :class="{ 
            'active-wrapper': index === displayLineIndex,
            'past-wrapper': index < displayLineIndex,
            'future-wrapper': index > displayLineIndex
          }"
        >
          <div class="line-content">
            <p 
              class="lyric-line"
              :class="{ 
                'active': index === displayLineIndex,
                'long-text': line.text && line.text.length > 40
              }"
              :style="index === displayLineIndex ? activeLineStyle : {}"
              @click="seekToLine(line.time)"
            >
              {{ line.text }}
            </p>
            
            <div v-if="index === displayLineIndex" class="sing-timer">
              <div 
                class="timer-bar" 
                :style="{ animationDuration: `${getLineDuration(index)}s` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="empty-state">
        <p>INSTRUMENTAL</p>
      </div>
    </div>

    <!-- Modo so video -->
    <div v-if="viewMode === 'video' && !videoId" class="video-placeholder">
      <div v-if="isLoadingVideo" class="loading-video">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Buscando clipe...</p>
      </div>
      <div v-else-if="videoError" class="video-error">
        <i class="fab fa-youtube"></i>
        <p>Clipe nao encontrado</p>
        <button class="retry-btn" @click="searchVideo">
          <i class="fas fa-redo"></i> Tentar novamente
        </button>
      </div>
    </div>

    <!-- Controles no centro inferior -->
    <div class="bottom-controls">
      <div class="mode-toggle">
        <button 
          :class="['mode-btn', { active: viewMode === 'lyrics' }]"
          @click="setViewMode('lyrics')"
          title="Apenas Letras"
        >
          <i class="fas fa-align-left"></i>
          <span class="mode-label">Letras</span>
        </button>
        <button 
          :class="['mode-btn', { active: viewMode === 'both' }]"
          @click="setViewMode('both')"
          title="Letras + Clipe"
        >
          <i class="fas fa-columns"></i>
          <span class="mode-label">Ambos</span>
        </button>
        <button 
          :class="['mode-btn', { active: viewMode === 'video' }]"
          @click="setViewMode('video')"
          title="Apenas Clipe"
        >
          <i class="fab fa-youtube"></i>
          <span class="mode-label">Clipe</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'

const props = defineProps({
  lyrics: { type: Array, default: () => [] },
  track: { type: Object, default: null },
  currentLineIndex: { type: Number, default: -1 },
  isLoading: { type: Boolean, default: false },
  error: { type: String, default: null },
  dominantColor: { type: String, default: '#ff6b6b' }
})

const emit = defineEmits(['close', 'seek', 'pauseSpotify', 'resumeSpotify'])

// Estado
const viewMode = ref('lyrics') // 'lyrics' | 'both' | 'video'
const videoId = ref(null)
const isLoadingVideo = ref(false)
const videoError = ref(false)
const lyricsContainer = ref(null)

// YouTube Player
let youtubePlayer = null
let syncInterval = null
const videoCurrentTime = ref(0)
const isUsingVideoSync = ref(false)

// Indice da linha a exibir - usa video se estiver no modo video/both, senao usa Spotify
const displayLineIndex = computed(() => {
  if (isUsingVideoSync.value && youtubePlayer) {
    return calculateLineIndex(videoCurrentTime.value)
  }
  return props.currentLineIndex
})

// Estilo da linha ativa
const activeLineStyle = computed(() => ({
  color: '#fff',
  textShadow: `0 0 20px ${props.dominantColor}, 0 0 40px ${props.dominantColor}`,
  borderColor: props.dominantColor
}))

// Calcula indice da linha baseado no tempo
const calculateLineIndex = (timeInSeconds) => {
  if (!props.lyrics || props.lyrics.length === 0) return -1
  for (let i = props.lyrics.length - 1; i >= 0; i--) {
    if (props.lyrics[i].time <= timeInSeconds) {
      return i
    }
  }
  return -1
}

// Muda modo de visualizacao
const setViewMode = async (mode) => {
  const previousMode = viewMode.value
  viewMode.value = mode
  
  if (mode === 'lyrics') {
    // Volta para modo letras - usa sincronizacao do Spotify
    isUsingVideoSync.value = false
    stopTimeSync()
    if (previousMode !== 'lyrics') {
      emit('resumeSpotify')
    }
  } else {
    // Modo video ou ambos - usa sincronizacao do video
    isUsingVideoSync.value = true
    if (previousMode === 'lyrics') {
      emit('pauseSpotify')
    }
    
    if (!videoId.value && !isLoadingVideo.value) {
      await searchVideo()
    } else if (videoId.value && !youtubePlayer) {
      await nextTick()
      initYouTubePlayer()
    }
  }
}

// Busca video no YouTube
const searchVideo = async () => {
  if (!props.track) return
  
  isLoadingVideo.value = true
  videoError.value = false
  
  try {
    const trackName = props.track.title || props.track.name || ''
    const artistName = props.track.artist || ''
    const query = `${trackName} ${artistName} official music video`
    
    console.log('Buscando video:', query)
    
    const response = await fetch(`/auth/youtube/search?q=${encodeURIComponent(query)}&limit=1`)
    
    if (response.ok) {
      const results = await response.json()
      console.log('Resultados YouTube:', results)
      
      if (results && results.length > 0 && results[0].id) {
        videoId.value = results[0].id
        await nextTick()
        initYouTubePlayer()
      } else {
        videoError.value = true
      }
    } else {
      console.error('Erro na busca:', response.status)
      videoError.value = true
    }
  } catch (error) {
    console.error('Erro ao buscar video:', error)
    videoError.value = true
  } finally {
    isLoadingVideo.value = false
  }
}

// Inicializa YouTube Player
const initYouTubePlayer = () => {
  if (!videoId.value) return
  
  if (!window.YT) {
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    
    window.onYouTubeIframeAPIReady = () => {
      createPlayer()
    }
  } else {
    createPlayer()
  }
}

const createPlayer = () => {
  if (youtubePlayer) {
    try { youtubePlayer.destroy() } catch (e) {}
  }
  
  const container = document.getElementById('youtube-player')
  if (!container) return
  
  youtubePlayer = new window.YT.Player('youtube-player', {
    videoId: videoId.value,
    playerVars: {
      autoplay: 1,
      controls: 1,
      modestbranding: 1,
      rel: 0
    },
    events: {
      onReady: () => {
        console.log('YouTube Player pronto')
        startTimeSync()
      },
      onStateChange: (event) => {
        if (event.data === 1) { // Playing
          startTimeSync()
        } else {
          stopTimeSync()
        }
      }
    }
  })
}

const startTimeSync = () => {
  stopTimeSync()
  syncInterval = setInterval(() => {
    if (youtubePlayer && typeof youtubePlayer.getCurrentTime === 'function') {
      try {
        videoCurrentTime.value = youtubePlayer.getCurrentTime()
      } catch (e) {}
    }
  }, 100)
}

const stopTimeSync = () => {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

const destroyYouTubePlayer = () => {
  stopTimeSync()
  if (youtubePlayer) {
    try { youtubePlayer.destroy() } catch (e) {}
    youtubePlayer = null
  }
}

const seekToLine = (time) => {
  if (isUsingVideoSync.value && youtubePlayer && typeof youtubePlayer.seekTo === 'function') {
    youtubePlayer.seekTo(time, true)
  } else {
    emit('seek', time)
  }
}

const handleClose = () => {
  if (viewMode.value !== 'lyrics') {
    destroyYouTubePlayer()
    emit('resumeSpotify')
  }
  emit('close')
}

const getLineDuration = (index) => {
  if (!props.lyrics || index < 0 || index >= props.lyrics.length) return 4
  if (index < props.lyrics.length - 1) {
    const current = props.lyrics[index]
    const next = props.lyrics[index + 1]
    if (current && next && typeof current.time === 'number' && typeof next.time === 'number') {
      return Math.max(next.time - current.time, 1)
    }
  }
  return 4
}

const scrollToActiveLine = () => {
  const container = lyricsContainer.value
  if (!container) return
  
  const wrapper = container.querySelector('.lyrics-lines')
  if (!wrapper || !wrapper.children[displayLineIndex.value]) return
  
  const targetElement = wrapper.children[displayLineIndex.value]
  const containerHeight = container.clientHeight
  const elementTop = targetElement.offsetTop
  const elementHeight = targetElement.clientHeight
  
  container.scrollTo({
    top: elementTop - (containerHeight / 2) + (elementHeight / 2),
    behavior: 'smooth'
  })
}

// Watch track change
watch(() => props.track, () => {
  videoId.value = null
  videoError.value = false
  destroyYouTubePlayer()
  if (viewMode.value !== 'lyrics') {
    searchVideo()
  }
})

// Watch line index change
watch(displayLineIndex, (newIndex) => {
  if (newIndex >= 0 && viewMode.value !== 'video') {
    nextTick(() => scrollToActiveLine())
  }
})

onMounted(() => {
  if (displayLineIndex.value >= 0) {
    scrollToActiveLine()
  }
})

onUnmounted(() => {
  destroyYouTubePlayer()
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
  overflow: hidden;
}

.video-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.video-background iframe {
  width: 100%;
  height: 100%;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.video-overlay.dark-overlay {
  background: rgba(0, 0, 0, 0.6);
}

.video-active {
  background: transparent;
}

.close-btn {
  position: fixed;
  top: 1.5rem;
  left: 1.5rem;
  width: 50px;
  height: 50px;
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid var(--accent-color);
  color: var(--accent-color);
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  z-index: 100;
  border-radius: 50%;
}

.close-btn:hover {
  background: var(--accent-color);
  color: #000;
  transform: rotate(90deg);
}

.audio-source {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 0, 0, 0.4);
  border: 1px solid #ff0000;
  color: #fff;
  font-family: 'Cingire', sans-serif;
  font-size: 0.85rem;
  z-index: 100;
  border-radius: 20px;
}

.lyrics-container {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
}

.lyrics-lines {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 1000px;
  padding: 40vh 5%;
}

.lyric-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  transition: all 0.4s ease;
  opacity: 0.4;
  transform: scale(0.85);
}

.line-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.future-wrapper {
  opacity: 0.3;
  transform: scale(0.8);
}

.past-wrapper {
  opacity: 0.2;
  transform: scale(0.75);
}

.active-wrapper {
  opacity: 1;
  transform: scale(1);
  z-index: 10;
  margin: 1.5rem 0;
}

.lyric-line {
  font-family: 'Impact', sans-serif;
  font-size: 2.2rem;
  text-transform: uppercase;
  font-style: italic;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  padding: 0.8rem 1.5rem;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  border: 2px solid transparent;
}

.lyric-line.long-text {
  font-size: 1.6rem;
}

.lyric-line:hover {
  color: #fff;
}

.active-wrapper .lyric-line {
  font-size: 3rem;
  background: rgba(0, 0, 0, 0.7);
  border-bottom: 4px solid var(--accent-color);
}

.active-wrapper .lyric-line.long-text {
  font-size: 2rem;
}

.sing-timer {
  width: 100%;
  height: 4px;
  background: rgba(255,255,255,0.2);
  margin-top: 8px;
  border-radius: 2px;
  overflow: hidden;
}

.timer-bar {
  height: 100%;
  width: 0%;
  background: var(--accent-color);
  animation: timer-progress linear forwards;
  box-shadow: 0 0 10px var(--accent-color);
}

@keyframes timer-progress {
  from { width: 0%; }
  to { width: 100%; }
}

.bottom-controls {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
}

.mode-toggle {
  display: flex;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.85);
  padding: 0.5rem;
  border: 2px solid var(--accent-color);
  border-radius: 50px;
  backdrop-filter: blur(10px);
}

.mode-btn {
  padding: 0.8rem 1.2rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Cingire', sans-serif;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
  border-radius: 50px;
}

.mode-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.mode-btn.active {
  background: var(--accent-color);
  color: #000;
}

.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #fff;
  font-family: 'Impact', sans-serif;
  font-size: 1.5rem;
  z-index: 10;
}

.video-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #fff;
  z-index: 10;
}

.loading-video, .video-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-video i, .video-error i {
  font-size: 4rem;
  color: var(--accent-color);
}

.retry-btn {
  padding: 0.8rem 1.5rem;
  background: var(--accent-color);
  border: none;
  color: #000;
  font-family: 'Cingire', sans-serif;
  cursor: pointer;
  border-radius: 25px;
}

@media (max-width: 768px) {
  .close-btn {
    width: 40px;
    height: 40px;
    top: 1rem;
    left: 1rem;
  }

  .mode-label { display: none; }

  .mode-btn {
    padding: 0.6rem 1rem;
  }

  .lyric-line {
    font-size: 1.5rem;
  }

  .active-wrapper .lyric-line {
    font-size: 2rem;
  }

  .lyrics-lines {
    padding: 35vh 1rem;
  }

  .audio-source {
    display: none;
  }
}
</style>
