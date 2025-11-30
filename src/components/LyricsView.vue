<template>
  <div 
    class="lyrics-view" 
    :class="{ 'video-active': showVideo && videoId }"
    :style="{ '--accent-color': dominantColor || '#ff6b6b' }"
  >
    <!-- Vídeo de Fundo -->
    <div v-if="showVideo && videoId" class="video-background">
      <div id="youtube-player" ref="playerContainer"></div>
      <div class="video-overlay"></div>
    </div>

    <!-- Botão fechar no topo -->
    <button class="close-btn" @click="handleClose" title="Fechar">
      <i class="fas fa-times"></i>
    </button>

    <!-- Indicador de fonte de áudio -->
    <div v-if="showVideo && videoId" class="audio-source">
      <i class="fab fa-youtube"></i>
      <span>Áudio do Clipe</span>
    </div>

    <!-- Controles no centro inferior -->
    <div class="bottom-controls">
      <div class="mode-toggle">
        <button 
          :class="['mode-btn', { active: !showVideo }]"
          @click="toggleVideo(false)"
          title="Apenas Letras"
        >
          <i class="fas fa-align-left"></i>
          <span class="mode-label">Letras</span>
        </button>
        <button 
          :class="['mode-btn', { active: showVideo }]"
          @click="toggleVideo(true)"
          title="Letras + Clipe"
        >
          <i class="fab fa-youtube"></i>
          <span class="mode-label">Clipe</span>
        </button>
      </div>
    </div>

    <!-- Container de Letras -->
    <div class="lyrics-container" ref="lyricsContainer">
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
            'active-wrapper': index === activeLineIndex,
            'past-wrapper': index < activeLineIndex,
            'future-wrapper': index > activeLineIndex
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
                'active': index === activeLineIndex,
                'long-text': isLongLine(line.text)
              }"
              :style="getLineStyle(index)"
              @click="seekToLine(line.time)"
            >
              {{ line.text }}
            </p>
            
            <div v-if="index === activeLineIndex" class="sing-timer">
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

    <!-- Loading do vídeo -->
    <div v-if="isLoadingVideo" class="video-loading-overlay">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Buscando clipe...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'

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

const emit = defineEmits(['close', 'seek', 'pauseSpotify', 'resumeSpotify'])

// Estado
const showVideo = ref(false)
const videoId = ref(null)
const isLoadingVideo = ref(false)
const lyricsContainer = ref(null)
const playerContainer = ref(null)

// YouTube Player
let youtubePlayer = null
let syncInterval = null
const videoCurrentTime = ref(0)

// Linha ativa - usa do vídeo quando disponível, senão usa a prop
const activeLineIndex = computed(() => {
  if (showVideo.value && videoId.value && youtubePlayer) {
    return calculateLineIndex(videoCurrentTime.value)
  }
  return props.currentLineIndex
})

// Calcula índice da linha baseado no tempo
const calculateLineIndex = (timeInSeconds) => {
  if (!props.lyrics || props.lyrics.length === 0) return -1
  
  for (let i = props.lyrics.length - 1; i >= 0; i--) {
    if (props.lyrics[i].time <= timeInSeconds) {
      return i
    }
  }
  return -1
}

// Toggle vídeo
const toggleVideo = async (enable) => {
  showVideo.value = enable
  
  if (enable) {
    emit('pauseSpotify') // Pausa o Spotify
    if (!videoId.value) {
      await searchVideo()
    } else {
      // Se já tem vídeo, recria o player
      await nextTick()
      initYouTubePlayer()
    }
  } else {
    // Desativa vídeo
    destroyYouTubePlayer()
    emit('resumeSpotify') // Retoma o Spotify
  }
}

// Busca vídeo no YouTube
const searchVideo = async () => {
  if (!props.track) return
  
  isLoadingVideo.value = true
  
  try {
    const query = `${props.track.title || props.track.name} ${props.track.artist} official video`
    const response = await fetch(`/auth/youtube/search?q=${encodeURIComponent(query)}&limit=1`)
    
    if (response.ok) {
      const results = await response.json()
      if (results && results.length > 0) {
        videoId.value = results[0].id
        await nextTick()
        initYouTubePlayer()
      }
    }
  } catch (error) {
    console.error('Erro ao buscar vídeo:', error)
  } finally {
    isLoadingVideo.value = false
  }
}

// Inicializa YouTube Player
const initYouTubePlayer = () => {
  if (!videoId.value) return
  
  // Carrega a API do YouTube se não estiver carregada
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

// Cria o player do YouTube
const createPlayer = () => {
  if (youtubePlayer) {
    youtubePlayer.destroy()
  }
  
  youtubePlayer = new window.YT.Player('youtube-player', {
    videoId: videoId.value,
    playerVars: {
      autoplay: 1,
      controls: 1,
      modestbranding: 1,
      rel: 0,
      showinfo: 0
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  })
}

// Player pronto
const onPlayerReady = () => {
  console.log('🎬 YouTube Player pronto')
  startTimeSync()
}

// Mudança de estado do player
const onPlayerStateChange = (event) => {
  // YT.PlayerState: PLAYING = 1, PAUSED = 2, ENDED = 0
  if (event.data === 1) {
    startTimeSync()
  } else {
    stopTimeSync()
  }
}

// Sincronização de tempo
const startTimeSync = () => {
  stopTimeSync()
  syncInterval = setInterval(() => {
    if (youtubePlayer && youtubePlayer.getCurrentTime) {
      videoCurrentTime.value = youtubePlayer.getCurrentTime()
    }
  }, 100) // Atualiza a cada 100ms para sincronização precisa
}

const stopTimeSync = () => {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

// Destroi o player
const destroyYouTubePlayer = () => {
  stopTimeSync()
  if (youtubePlayer) {
    youtubePlayer.destroy()
    youtubePlayer = null
  }
}

// Seek para uma linha específica
const seekToLine = (time) => {
  if (showVideo.value && youtubePlayer && youtubePlayer.seekTo) {
    youtubePlayer.seekTo(time, true)
  } else {
    emit('seek', time)
  }
}

// Fecha o modal
const handleClose = () => {
  if (showVideo.value) {
    destroyYouTubePlayer()
    emit('resumeSpotify')
  }
  emit('close')
}

// Watch track para resetar vídeo quando trocar música
watch(() => props.track, () => {
  videoId.value = null
  destroyYouTubePlayer()
  if (showVideo.value) {
    searchVideo()
  }
})

// Cleanup
onUnmounted(() => {
  destroyYouTubePlayer()
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
  if (index !== activeLineIndex.value) return false
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
  
  if (index === activeLineIndex.value) {
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

const scrollToActiveLine = () => {
  const container = lyricsContainer.value
  if (!container) return

  const wrapper = container.querySelector('.lyrics-lines')
  if (!wrapper) return

  const targetElement = wrapper.children[activeLineIndex.value]

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

watch(activeLineIndex, (newIndex) => {
  if (newIndex >= 0) {
    nextTick(() => {
      scrollToActiveLine()
    })
  }
})

onMounted(() => {
  if (activeLineIndex.value >= 0) {
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
  overflow: hidden;
}

/* Vídeo de Fundo */
.video-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.video-background iframe,
.video-background #youtube-player {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: auto;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.video-active {
  background: transparent;
}

/* Controles */
.close-btn {
  position: fixed;
  top: 1.5rem;
  left: 1.5rem;
  width: 50px;
  height: 50px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid var(--accent-color, #ff6b6b);
  color: var(--accent-color, #ff6b6b);
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  z-index: 100;
}

.close-btn:hover {
  background: var(--accent-color, #ff6b6b);
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
  background: rgba(255, 0, 0, 0.3);
  border: 1px solid #ff0000;
  color: #fff;
  font-family: 'Cingire', sans-serif;
  font-size: 0.85rem;
  z-index: 100;
}

.audio-source i {
  color: #ff0000;
}

/* Controles no centro inferior */
.bottom-controls {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
}

.mode-toggle {
  display: flex;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.8);
  padding: 0.5rem;
  border: 2px solid var(--accent-color, #ff6b6b);
  border-radius: 50px;
  backdrop-filter: blur(10px);
}

.mode-btn {
  padding: 0.8rem 1.5rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Cingire', sans-serif;
  font-size: 1rem;
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
  background: var(--accent-color, #ff6b6b);
  color: #000;
}

/* Container de Letras */
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
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
}

.lyrics-lines {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 1200px;
  padding: 40vh 5%;
}

.lyric-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  width: 100%;
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  opacity: 0.4;
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
  background: rgba(255,255,255,0.2);
  margin-top: 5px;
  border-radius: 2px;
  overflow: hidden;
}

.timer-bar {
  height: 100%;
  width: 0%;
  background: var(--accent-color, #ff6b6b);
  animation-name: timer-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  box-shadow: 0 0 10px var(--accent-color, #ff6b6b);
}

@keyframes timer-progress {
  from { width: 0%; }
  to { width: 100%; }
}

.future-wrapper {
  opacity: 0.3;
  transform: scale(0.8) translateY(10px);
}

.past-wrapper {
  opacity: 0.2;
  transform: scale(0.75) translateY(-10px);
  filter: blur(1px);
}

.active-wrapper {
  opacity: 1;
  transform: scale(1);
  z-index: 10;
  filter: none;
  margin: 1.5rem 0;
}

.tribal-decor {
  height: 100px;
  width: auto;
  opacity: 0.8;
  transition: all 0.6s ease;
  pointer-events: none;
}

.tribal-decor.left {
  transform: translateX(10px);
}

.tribal-decor.right {
  transform: translateX(-10px) scaleX(-1);
}

.lyric-line {
  font-family: 'Impact', 'Cingire', sans-serif;
  font-size: 2.5rem;
  text-transform: uppercase;
  font-style: italic;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  cursor: pointer;
  transition: all 0.4s;
  white-space: normal;
  word-wrap: break-word;
  max-width: 90%;
  background: rgba(0, 0, 0, 0.5);
  padding: 0.8rem 1.5rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
}

.lyric-line.long-text {
  font-size: 1.8rem;
}

.lyric-line:hover {
  color: #fff;
  background: rgba(0, 0, 0, 0.7);
}

.active-wrapper .lyric-line {
  font-size: 3.5rem;
  background: rgba(0, 0, 0, 0.7);
  border-bottom: 4px solid var(--accent-color, #ff6b6b);
  color: #fff;
  text-shadow: 0 0 20px var(--accent-color, #ff6b6b), 0 0 40px var(--accent-color, #ff6b6b);
  padding-bottom: 0.3rem;
}

.active-wrapper .lyric-line.long-text {
  font-size: 2.2rem;
}

/* Loading do vídeo */
.video-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  z-index: 200;
  color: #fff;
  font-family: 'Cingire', sans-serif;
}

.video-loading-overlay i {
  font-size: 3rem;
  color: #ff6b6b;
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
  z-index: 10;
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

  .audio-source {
    display: none;
  }

  .lyric-line {
    font-size: 1.5rem;
  }

  .active-wrapper .lyric-line {
    font-size: 2rem;
  }

  .tribal-decor {
    height: 50px;
    opacity: 0.5;
  }

  .lyrics-lines {
    padding: 35vh 1rem;
  }
}
</style>
