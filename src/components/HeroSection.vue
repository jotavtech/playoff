<template>
  <div class="hero-section">
    <!-- Logo PlayOff - Acima do Card -->
    <div class="playoff-logo-header">
      <img 
        src="https://res.cloudinary.com/dzwfuzxxw/image/upload/v1764087001/playoff_2_yvagtx.png" 
        alt="PlayOff Music Logo" 
        class="playoff-logo"
        :style="logoAccentStyle"
      />
    </div>

    <!-- Container para Player e Vinil -->
    <div class="player-vinyl-container">
      <!-- Seção Principal do Player -->
      <div class="player-card">
        <!-- Informações da Música Atual -->
        <div class="track-info">
          <h1 v-if="currentTrack" class="track-title">{{ currentTrack.title }}</h1>
          <h1 v-else class="track-title">PlayOff Music</h1>
          
          <p v-if="currentTrack" class="track-artist">{{ currentTrack.artist }}</p>
          <p v-else class="track-artist">Sistema de Votação Musical</p>
          
          <p v-if="currentTrack" class="track-album">
            <span v-if="currentTrack.isExternalDevice" class="external-device-badge" title="Tocando no Spotify (Celular/PC)">
              <i class="fas fa-mobile-alt"></i> Remoto
            </span>
            {{ currentTrack.album }}
          </p>
          <p v-else class="track-album">Vote na sua música favorita!</p>
        </div>

        <!-- Controles de Reprodução -->
        <div class="player-controls">
          <button 
            class="control-btn prev-btn" 
            @click="$emit('previous-track')"
            title="Música Anterior"
          >
            <i class="fas fa-step-backward"></i>
          </button>
          
          <button 
            class="control-btn play-pause-btn" 
            @click="$emit('toggle-playback')"
            :title="isPlaying ? 'Pausar' : 'Reproduzir'"
          >
            <i v-if="!isPlaying" class="fas fa-play"></i>
            <i v-else class="fas fa-pause"></i>
          </button>
          
          <button 
            class="control-btn next-btn" 
            @click="$emit('next-track')"
            title="Próxima Música"
          >
            <i class="fas fa-step-forward"></i>
          </button>

          <button 
            class="control-btn lyrics-hero-btn" 
            @click="$emit('toggle-lyrics')"
            title="Letra"
          >
            <span class="kanji-icon">水</span>
          </button>

          <button 
            v-if="currentTrack"
            class="control-btn like-btn" 
            :class="{ liked: isLiked }"
            @click="$emit('toggle-like', currentTrack)"
            :title="isLiked ? 'Descurtir' : 'Curtir'"
          >
            <i :class="isLiked ? 'fas fa-heart' : 'far fa-heart'"></i>
          </button>
        </div>

        <!-- Barra de Progresso Interativa -->
        <div class="progress-section">
          <span class="time-display">{{ formatTime(position) }}</span>
          <div 
            class="progress-bar" 
            ref="progressBarRef"
            @mousedown="startSeek"
            @touchstart.prevent="startSeek"
          >
            <div 
              class="progress-fill" 
              :style="{ width: progressPercentage + '%' }"
            ></div>
            <div 
              class="progress-thumb"
              :style="{ left: progressPercentage + '%' }"
            ></div>
          </div>
          <span class="time-display">{{ formatTime(duration) }}</span>
        </div>
      </div>

      <!-- Disco de Vinil Animado -->
      <div class="vinyl-container" :class="{ 'new-track-animation': isNewTrackAnimating }">
        <div 
          class="vinyl-disc" 
          :class="{ playing: isPlaying, 'pulse-glow': isNewTrackAnimating }"
        >
          <div class="vinyl-center">
            <img 
              v-if="currentTrack?.albumCover && currentTrack.albumCover !== 'https://via.placeholder.com/300x300/333/fff?text=♪'" 
              :src="currentTrack.albumCover" 
              :alt="`${currentTrack.title} - Capa do Álbum`"
              :key="currentTrack.albumCover"
              class="album-cover"
              loading="eager"
              decoding="async"
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
  </div>
</template>

<script setup>
import { computed, watch, ref, onMounted, onUnmounted } from 'vue'
import { useCloudinaryAudio } from '../composables/useCloudinaryAudio'

// ============= ANIMAÇÃO DE NOVA MÚSICA =============
const isNewTrackAnimating = ref(false)

// Escuta evento de nova música para disparar animação
const handleNewTrackEvent = () => {
  console.log('🎨 HeroSection: Animação de nova música recebida!')
  isNewTrackAnimating.value = true
  
  // Remove a classe após a animação terminar (1.5s)
  setTimeout(() => {
    isNewTrackAnimating.value = false
  }, 1500)
}

onMounted(() => {
  window.addEventListener('new-track-playing', handleNewTrackEvent)
})

onUnmounted(() => {
  window.removeEventListener('new-track-playing', handleNewTrackEvent)
})

// ============= PROPS E EMITS =============
// Props recebidas do componente pai (App.vue)
const props = defineProps({
  currentTrack: Object,     // Música sendo reproduzida atualmente
  isPlaying: Boolean,       // Status de reprodução
  position: Number,         // Posição atual em ms
  duration: Number,         // Duração total em ms
  formatTime: Function,     // Função para formatar tempo
  dominantColor: {
    type: Array,
    default: () => [255, 107, 107]
  },
  isLiked: Boolean          // Se a música atual está curtida
})

// Eventos emitidos para o componente pai
const emit = defineEmits(['toggle-playback', 'previous-track', 'next-track', 'seek', 'toggle-lyrics', 'toggle-like'])

// ============= SEEK FUNCTIONALITY =============
const progressBarRef = ref(null)
const isSeeking = ref(false)

// Calcula posição do seek baseado no clique/toque
const calculateSeekPosition = (event) => {
  if (!progressBarRef.value || !props.duration) return null
  
  const rect = progressBarRef.value.getBoundingClientRect()
  const clientX = event.touches ? event.touches[0].clientX : event.clientX
  const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  return Math.round(percentage * props.duration)
}

// Inicia o seek (clique ou toque)
const startSeek = (event) => {
  isSeeking.value = true
  const position = calculateSeekPosition(event)
  if (position !== null) {
    emit('seek', position)
  }
  
  // Adiciona listeners para drag
  if (event.type === 'mousedown') {
    document.addEventListener('mousemove', onSeekMove)
    document.addEventListener('mouseup', stopSeek)
  } else {
    document.addEventListener('touchmove', onSeekMove, { passive: false })
    document.addEventListener('touchend', stopSeek)
  }
}

// Durante o drag
const onSeekMove = (event) => {
  if (!isSeeking.value) return
  event.preventDefault()
  const position = calculateSeekPosition(event)
  if (position !== null) {
    emit('seek', position)
  }
}

// Finaliza o seek
const stopSeek = () => {
  isSeeking.value = false
  document.removeEventListener('mousemove', onSeekMove)
  document.removeEventListener('mouseup', stopSeek)
  document.removeEventListener('touchmove', onSeekMove)
  document.removeEventListener('touchend', stopSeek)
}

// Handler legado de Seek (para input range se usado)
const handleSeek = (event) => {
  emit('seek', Number(event.target.value))
}

// ============= COMPUTED PROPERTIES =============
// Calcula porcentagem de progresso para barra visual
const progressPercentage = computed(() => {
  if (!props.duration || props.duration === 0) return 0
  return (props.position / props.duration) * 100
})

// Estilo dinâmico da logo baseado na cor dominante da música atual
const logoAccentStyle = computed(() => {
  const color = Array.isArray(props.dominantColor) && props.dominantColor.length === 3
    ? props.dominantColor
    : [255, 107, 107]

  const [r, g, b] = color
  const baseGlow = `drop-shadow(0 0 18px rgba(${r}, ${g}, ${b}, 0.65)) drop-shadow(0 8px 20px rgba(${r}, ${g}, ${b}, 0.35))`
  const hoverGlow = `drop-shadow(0 0 25px rgba(${r}, ${g}, ${b}, 0.85)) drop-shadow(0 12px 30px rgba(${r}, ${g}, ${b}, 0.45))`

  return {
    '--logo-glow': baseGlow,
    '--logo-glow-hover': hoverGlow
  }
})

// ============= INTEGRAÇÃO COM SISTEMA DE CORES =============
// Importo função de detecção de brilho para ajustar contraste
const { detectImageBrightness } = useCloudinaryAudio()

// Estado reativo para controlar se a capa atual é clara/escura
const isWhiteAlbum = ref(false)

// ============= HANDLERS DE EVENTOS DE IMAGEM =============

// Função chamada quando capa do álbum carrega com sucesso
// Analisa brilho da imagem para ajustar contraste dos elementos sobrepostos
const onImageLoad = async (event) => {
  try {
    // Verifica se o evento e target são válidos
    if (!event?.target?.src) {
      console.warn('⚠️ onImageLoad: evento inválido')
      return
    }
    
    console.log('🎨 HeroSection: Capa carregada, analisando brilho...')
    
    // Analiso brilho da imagem carregada
    const brightness = await detectImageBrightness(event.target.src)
    
    // Determino se é uma capa clara (precisa de texto escuro)
    isWhiteAlbum.value = brightness > 0.7 // Threshold de 70% para considerar "clara"
    
    console.log(`💡 Brilho detectado: ${brightness.toFixed(2)} - Capa ${isWhiteAlbum.value ? 'clara' : 'escura'}`)
    
    // Aplico classe CSS baseada no brilho para ajustar contraste
    // Usa optional chaining para evitar erro se elemento não existir
    const vinylCenter = event.target?.closest?.('.vinyl-center')
    if (vinylCenter) {
      if (isWhiteAlbum.value) {
        vinylCenter.classList.add('white-album')
      } else {
        vinylCenter.classList.remove('white-album')
      }
    }
    
  } catch (error) {
    // Silencia o erro - não é crítico
    console.log('⚠️ Análise de brilho ignorada:', error.message)
    isWhiteAlbum.value = false
  }
}

// Função chamada quando há erro no carregamento da capa
// Implementa fallback gracioso com busca no Spotify
const onImageError = async (event) => {
  console.warn('⚠️ Erro ao carregar capa do álbum:', event.target.src)
  
  // Tenta buscar do Spotify antes de usar fallback
  if (!event.target.dataset.spotifyAttempted && props.currentTrack) {
    event.target.dataset.spotifyAttempted = 'true'
    
    try {
      const userToken = localStorage.getItem('spotify_access_token')
      if (userToken && props.currentTrack.artist && props.currentTrack.title) {
        console.log(`🔍 Buscando capa do Spotify para ${props.currentTrack.title}...`)
        
        const cleanArtist = props.currentTrack.artist.replace(/[^\w\s]/gi, '').trim()
        const cleanTrack = props.currentTrack.title.replace(/[^\w\s]/gi, '').trim()
        const query = encodeURIComponent(`track:"${cleanTrack}" artist:"${cleanArtist}"`)
        const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1&market=BR`
        
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${userToken}` }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.tracks?.items?.[0]?.album?.images?.[0]?.url) {
            const spotifyCover = data.tracks.items[0].album.images[0].url
            console.log(`✅ Capa encontrada no Spotify: ${spotifyCover}`)
            event.target.src = spotifyCover
            return
          }
        }
      }
    } catch (err) {
      console.warn('Erro ao buscar capa do Spotify:', err)
    }
  }
  
  // Tento URL de fallback se não for a padrão
  if (!event.target.src.includes('default-album.jpg')) {
    console.log('🔄 Tentando imagem de fallback...')
    event.target.src = '/default-album.jpg'
  } else {
    console.log('❌ Fallback também falhou - mantendo placeholder')
    // Se até o fallback falhar, escondo a imagem e mostro placeholder
    event.target.style.display = 'none'
  }
  
  // Reseto estado de brilho para padrão
  isWhiteAlbum.value = false
}

// ============= WATCHERS REATIVOS =============

// Observo mudanças na música atual para resetar estado de análise
watch(() => props.currentTrack, (newTrack, oldTrack) => {
  if (newTrack?.id !== oldTrack?.id) {
    console.log('🔄 HeroSection: Nova música detectada, resetando análise de brilho')
    isWhiteAlbum.value = false // Reset para estado padrão
  }
}, { deep: true })
</script>

<style scoped>
/* ============= ESTILOS DA LOGO PLAYOFF - Persona 5 ============= */
.playoff-logo-header {
  text-align: center;
  margin-bottom: 2.5rem;
  padding-bottom: 0;
  width: 100%;
}

.playoff-logo {
  height: 140px;
  width: auto;
  border-radius: 0;
  transition: all 0.2s ease;
  filter: var(--logo-glow, 
    drop-shadow(4px 4px 0 rgba(255,255,255,0.9))
    drop-shadow(0 0 20px rgba(var(--accent-color), 0.4))
  );
}

.playoff-logo:hover {
  transform: scale(1.05) skewX(-2deg);
  filter: var(--logo-glow-hover, 
    drop-shadow(6px 6px 0 rgba(255,255,255,1))
    drop-shadow(0 0 30px rgba(var(--accent-color), 0.6))
  );
}

/* Responsividade da logo */
@media (max-width: 768px) {
  .playoff-logo {
    height: 110px;
  }
  
  .playoff-logo-header {
    margin-bottom: 2rem;
    padding-bottom: 0;
  }
}

@media (max-width: 480px) {
  .playoff-logo {
    height: 95px;
  }
  
  .playoff-logo-header {
    margin-bottom: 1.5rem;
    padding-bottom: 0;
  }
}

/* ============= ESTILOS PRINCIPAIS DO HERO SECTION - Persona 5 ============= */
.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  min-height: 100vh;
  gap: 2rem;
  margin-bottom: 2rem;
  width: 100%;
  position: relative;
  overflow: visible;
}

/* Container para player e vinil */
.player-vinyl-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 3rem;
}

/* Player Card - Persona 5 Angular Panel */
.player-card {
  width: 100%;
  max-width: 550px;
  z-index: 10;
  position: relative;
  padding: 2.5rem;
  padding-top: 2rem;
  background: rgba(0, 0, 0, 0.92);
  border: 3px solid var(--p5-white, #fff);
  border-left: 6px solid var(--accent-rgb, #ff6b6b);
  transform: skewX(var(--p5-skew, -3deg));
  clip-path: polygon(0 0, 100% 0, 97% 100%, 0% 100%);
  box-shadow: 
    8px 8px 0 var(--accent-rgb, rgba(255, 107, 107, 0.8)),
    0 20px 60px rgba(0, 0, 0, 0.6);
  transition: box-shadow var(--color-transition), border-color 0.3s ease;
}

@media (min-width: 769px) {
  .player-card {
    background: rgba(5, 5, 10, 0.85);
    backdrop-filter: blur(20px) saturate(1.3);
  }
}

.player-card > * {
  transform: skewX(calc(var(--p5-skew, -3deg) * -1));
}

.track-info {
  margin-bottom: 2.5rem;
  margin-top: 0;
  text-align: left;
  padding-left: 0.5rem;
  border-left: 3px solid var(--accent-rgb, #ff6b6b);
}

.track-title {
  font-family: 'Cingire', 'Space Grotesk', sans-serif !important;
  font-size: 2.6rem;
  font-weight: 900;
  margin-bottom: 0.5rem;
  color: var(--p5-white, #fff);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  line-height: 1.05;
  text-shadow: 3px 3px 0 rgba(var(--accent-color, 255, 107, 107), 0.4);
}

.track-artist {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--accent-rgb, #ff6b6b);
  margin-bottom: 0.3rem;
  transition: color var(--color-transition);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.track-album {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.95rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 2rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.player-controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2.5rem;
  align-items: center;
}

.control-btn {
  width: 52px;
  height: 52px;
  border-radius: 0;
  border: 2px solid var(--p5-white, #fff);
  background: rgba(0, 0, 0, 0.6);
  color: var(--p5-white, #fff);
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  box-shadow: 3px 3px 0 rgba(var(--accent-color, 255, 107, 107), 0.3);
}

.control-btn:hover {
  background: var(--p5-white, #fff);
  color: var(--p5-black, #0a0a0a);
  border-color: var(--p5-white, #fff);
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 var(--accent-rgb, #ff6b6b);
}

.play-pause-btn {
  width: 80px;
  height: 80px;
  background: var(--accent-rgb, #ff6b6b);
  border: 3px solid var(--p5-white, #fff);
  font-size: 2rem;
  transform: skewX(-5deg);
  box-shadow: 5px 5px 0 var(--p5-white, #fff);
  transition: all 0.15s ease, background var(--color-transition);
}

@media (min-width: 769px) {
  .play-pause-btn {
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
}

.play-pause-btn i {
  transform: skewX(5deg);
}

.play-pause-btn:hover {
  background: var(--p5-white, #fff);
  color: var(--p5-black, #0a0a0a);
  border-color: var(--p5-white, #fff);
  transform: skewX(-5deg) translate(-3px, -3px);
  box-shadow: 7px 7px 0 var(--accent-rgb, #ff6b6b);
}

.lyrics-hero-btn {
  font-family: 'Noto Sans JP', sans-serif;
  background: var(--accent-rgb);
  border-color: var(--accent-rgb);
  transition: all var(--color-transition);
}

.lyrics-hero-btn:hover {
  background: var(--p5-white, #fff);
  color: var(--accent-rgb);
  box-shadow: 4px 4px 0 var(--accent-rgb);
}

.kanji-icon {
  font-weight: 900;
  line-height: 1;
  font-size: 1.8rem;
}

/* Botão de Curtir - Persona 5 */
.like-btn {
  background: transparent;
  border-color: var(--accent-medium);
  color: var(--accent-light);
  transition: all 0.15s ease, border-color var(--color-transition), color var(--color-transition);
}

.like-btn:hover {
  background: var(--accent-rgb);
  border-color: var(--accent-rgb);
  color: var(--p5-white, #fff);
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 var(--p5-white, #fff);
}

.like-btn.liked {
  background: var(--accent-rgb);
  border-color: var(--p5-white, #fff);
  color: var(--p5-white, #fff);
  animation: heartPulse 0.3s ease;
  box-shadow: 3px 3px 0 var(--p5-white, #fff);
}

.like-btn.liked:hover {
  background: var(--p5-white, #fff);
  color: var(--accent-rgb);
  border-color: var(--accent-rgb);
  box-shadow: 4px 4px 0 var(--accent-rgb);
}

@keyframes heartPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* Progress Section - Persona 5 Angular */
.progress-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-bar {
  flex: 1;
  height: 5px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 0;
  position: relative;
  cursor: pointer;
  transition: height 0.15s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.progress-bar:hover {
  height: 8px;
}

.progress-bar:hover .progress-thumb {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}

.progress-fill {
  height: 100%;
  background: var(--accent-rgb, #ff6b6b);
  border-radius: 0;
  transition: background var(--color-transition);
  pointer-events: none;
  box-shadow: 0 0 8px rgba(var(--accent-color, 255, 107, 107), 0.4);
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  background: var(--p5-white, #fff);
  border-radius: 0;
  transform: translateX(-50%) translateY(-50%) rotate(45deg) scale(0);
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
  box-shadow: 2px 2px 0 var(--accent-rgb, #ff6b6b);
  pointer-events: none;
}

.progress-bar:active .progress-thumb {
  transform: translateX(-50%) translateY(-50%) rotate(45deg) scale(1.2);
  opacity: 1;
}

.time-display {
  font-family: 'Space Grotesk', monospace;
  font-size: 0.85rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  min-width: 45px;
  user-select: none;
  letter-spacing: 1px;
}

/* Vinyl Container - Persona 5 */
.vinyl-container {
  position: relative;
  flex-shrink: 0;
  z-index: 5;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform: scale(0.9); 
  margin-left: -20px;
}

@media (min-width: 1500px) {
  .vinyl-container {
    transform: scale(1);
    margin-left: 0;
  }
}

@media (max-width: 1400px) {
  .hero-section {
    padding: 1rem;
    gap: 1rem;
    justify-content: center;
  }

  .player-card {
    width: 450px;
    padding: 2rem;
  }
  
  .track-title {
    font-size: 2rem !important;
  }
  
  .vinyl-container {
    transform: scale(0.75);
    margin-left: -40px;
  }
}

@media (max-width: 1200px) {
  .vinyl-container {
    display: none;
  }
  
  .hero-content {
    justify-content: center;
  }
}

/* ============= ANIMAÇÃO DE NOVA MÚSICA - Persona 5 ============= */
.vinyl-container.new-track-animation {
  animation: vinylBounceIn 1s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.vinyl-disc.pulse-glow {
  animation: discPulseGlow 1.2s ease-out;
}

/* Borda do disco com cor dinâmica */
.vinyl-disc {
  border-color: var(--accent-soft) !important;
  transition: border-color var(--color-transition);
}

@keyframes vinylBounceIn {
  0% {
    transform: scale(0.7) skewX(-10deg);
    opacity: 0;
  }
  40% {
    transform: scale(1.1) skewX(3deg);
    opacity: 1;
  }
  60% {
    transform: scale(0.95) skewX(-1deg);
  }
  100% {
    transform: scale(1) skewX(0deg);
  }
}

@keyframes discPulseGlow {
  0% {
    box-shadow: 
      0 0 0 0 var(--accent-light),
      0 0 20px var(--glow-color);
    filter: brightness(1.3) contrast(1.1);
  }
  30% {
    box-shadow: 
      0 0 40px 20px var(--accent-medium),
      0 0 80px 40px var(--accent-soft);
    filter: brightness(1.5) contrast(1.2);
  }
  60% {
    box-shadow: 
      0 0 20px 10px var(--accent-soft),
      0 0 40px 20px var(--accent-subtle);
    filter: brightness(1.2);
  }
  100% {
    box-shadow: none;
    filter: brightness(1);
  }
}

/* Responsividade - Persona 5 */
@media (max-width: 768px) {
  .hero-section {
    gap: 1.5rem;
    min-height: 80vh;
    margin-bottom: 6rem;
    padding: 2rem 1rem;
  }
  
  .player-vinyl-container {
    flex-direction: column;
    gap: 2rem;
  }
  
  .player-card {
    max-width: 100%;
    order: 2;
    clip-path: none;
    transform: none;
  }

  .player-card > * {
    transform: none;
  }
  
  .vinyl-container {
    order: 1;
  }

  .track-info {
    text-align: center;
    border-left: none;
    padding-left: 0;
    border-bottom: 3px solid var(--accent-rgb, #ff6b6b);
    padding-bottom: 1rem;
  }
}

@media (max-width: 480px) {
  .hero-section {
    min-height: 70vh;
    padding: 1.5rem;
    margin-bottom: 4rem;
    gap: 1rem;
  }
  
  .player-vinyl-container {
    gap: 1.5rem;
  }
  
  .track-title {
    font-size: 1.5rem;
  }
  
  .control-btn {
    width: 42px;
    height: 42px;
    font-size: 1rem;
  }
  
  .play-pause-btn {
    width: 55px;
    height: 55px;
    font-size: 1.2rem;
  }
}

/* Estilos para capas claras */
.vinyl-center.white-album .placeholder-text {
  color: #333;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}

/* External Device Badge - Persona 5 */
.external-device-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(29, 185, 84, 0.15);
  border: 2px solid #1DB954;
  color: #1DB954;
  padding: 0.15rem 0.6rem;
  border-radius: 0;
  font-size: 0.75rem;
  font-weight: 700;
  margin-right: 0.5rem;
  vertical-align: middle;
  text-transform: uppercase;
  letter-spacing: 1px;
}

@keyframes pulse-green {
  0% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0.4); }
  70% { box-shadow: 0 0 0 5px rgba(29, 185, 84, 0); }
  100% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0); }
}
</style>