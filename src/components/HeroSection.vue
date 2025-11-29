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
/* ============= ESTILOS DA LOGO PLAYOFF ============= */
.playoff-logo-header {
  text-align: center;
  margin-bottom: 3rem;
  padding-bottom: 0; /* Removendo padding já que não há mais linha */
  width: 100%;
}

.playoff-logo {
  height: 140px;
  width: auto;
  border-radius: 16px;
  transition: all 0.3s ease;
  filter: var(--logo-glow, drop-shadow(0 10px 25px rgba(0, 0, 0, 0.35)));
}

.playoff-logo:hover {
  transform: scale(1.05);
  filter: var(--logo-glow-hover, drop-shadow(0 14px 30px rgba(0, 0, 0, 0.45)));
}

/* Responsividade da logo */
@media (max-width: 768px) {
  .playoff-logo {
    height: 110px;
  }
  
  .playoff-logo-header {
    margin-bottom: 2.5rem;
    padding-bottom: 0;
  }
}

@media (max-width: 480px) {
  .playoff-logo {
    height: 95px;
  }
  
  .playoff-logo-header {
    margin-bottom: 2rem;
    padding-bottom: 0;
  }
}

/* ============= ESTILOS PRINCIPAIS DO HERO SECTION ============= */
/* Estilos do componente HeroSection */
.hero-section {
  display: flex;
  flex-direction: column; /* Mudando para coluna para logo ficar acima */
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

/* Estilos específicos para o player card */
.player-card {
  width: 100%;
  max-width: 550px;
  z-index: 10;
  position: relative;
  padding: 2.5rem;
  padding-top: 2rem;
  background: rgba(0, 0, 0, 0.85); /* Darker, solid fallback */
  border: 2px solid #fff;
  transform: skewX(-3deg);
  box-shadow: 8px 8px 0 rgba(255, 107, 107, 0.8);
}

@media (min-width: 769px) {
  .player-card {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
  }
}

.player-card > * {
  transform: skewX(3deg); /* Contra-inclinação para o conteúdo */
}

.track-info {
  margin-bottom: 2.5rem;
  margin-top: 0;
  text-align: center;
}

.track-title {
  font-family: 'Space Grotesk', sans-serif !important;
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #fff;
  letter-spacing: -0.02em;
  text-transform: none;
}

.track-artist {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.4rem;
  font-weight: 500;
  color: #ff6b6b;
  margin-bottom: 0.3rem;
}

.track-album {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.1rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 2rem;
}

.player-controls {
  display: flex;
  gap: 2rem;
  justify-content: center;
  margin-bottom: 2.5rem;
  align-items: center;
}

.control-btn {
  width: 65px;
  height: 65px;
  border-radius: 0;
  border: 3px solid #fff;
  background: transparent;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
}

.control-btn:hover {
  background: #ff6b6b;
  border-color: #ff6b6b;
  transform: translate(-2px, -2px);
  box-shadow: 2px 2px 0 #fff;
}

.play-pause-btn {
  width: 100px;
  height: 100px;
  background: rgba(0, 0, 0, 0.5);
  border: 4px solid #fff;
  font-size: 2.5rem;
  transform: skewX(-5deg);
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
  background: var(--accent-rgb);
  border-color: var(--accent-rgb);
  transform: skewX(-5deg) translate(-3px, -3px);
  box-shadow: 3px 3px 0 #fff;
  transition: all var(--color-transition);
}

.lyrics-hero-btn {
  font-family: 'Noto Sans JP', sans-serif;
  background: var(--accent-rgb);
  border-color: var(--accent-rgb);
  transition: all var(--color-transition);
}

.lyrics-hero-btn:hover {
  background: #fff;
  color: var(--accent-rgb);
  box-shadow: 2px 2px 0 var(--accent-rgb);
}

.kanji-icon {
  font-weight: bold;
  line-height: 1;
  font-size: 1.8rem;
}

/* Botão de Curtir */
.like-btn {
  background: transparent;
  border-color: var(--accent-medium);
  color: var(--accent-light);
  transition: all 0.3s ease, border-color var(--color-transition), color var(--color-transition);
}

.like-btn:hover {
  background: var(--accent-subtle);
  border-color: var(--accent-rgb);
  color: var(--accent-rgb);
  transform: scale(1.1);
}

.like-btn.liked {
  background: var(--accent-rgb);
  border-color: var(--accent-rgb);
  color: #fff;
  animation: heartPulse 0.4s ease;
}

.like-btn.liked:hover {
  background: var(--accent-dark-rgb);
  border-color: var(--accent-dark-rgb);
  box-shadow: 0 0 15px var(--glow-color);
}

@keyframes heartPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  position: relative;
  cursor: pointer;
  transition: height 0.15s ease;
}

.progress-bar:hover {
  height: 10px;
}

.progress-bar:hover .progress-thumb {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-rgb), var(--accent-secondary-rgb));
  border-radius: 3px;
  transition: background var(--color-transition);
  pointer-events: none;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  transform: translateX(-50%) translateY(-50%) scale(0);
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

.progress-bar:active .progress-thumb {
  transform: translateX(-50%) translateY(-50%) scale(1.2);
  opacity: 1;
}

.time-display {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  min-width: 45px;
  user-select: none;
}

.vinyl-container {
  position: relative;
  flex-shrink: 0;
  z-index: 5;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  /* Ajuste para laptops */
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
    width: 450px; /* Reduzido de 500+ */
    padding: 2rem;
  }
  
  .track-title {
    font-size: 2.2rem !important;
  }
  
  .vinyl-container {
    transform: scale(0.75);
    margin-left: -40px;
  }
}

@media (max-width: 1200px) {
  .vinyl-container {
    display: none; /* Esconde disco em telas menores que 1200px */
  }
  
  .hero-content {
    justify-content: center;
  }
}

/* ============= ANIMAÇÃO DE NOVA MÚSICA ============= */
.vinyl-container.new-track-animation {
  animation: vinylBounceIn 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.vinyl-disc.pulse-glow {
  animation: discPulseGlow 1.5s ease-out;
}

/* Borda do disco com cor dinâmica */
.vinyl-disc {
  border-color: var(--accent-soft) !important;
  transition: border-color var(--color-transition);
}

@keyframes vinylBounceIn {
  0% {
    transform: scale(0.8) rotate(-10deg);
    opacity: 0.7;
  }
  30% {
    transform: scale(1.15) rotate(5deg);
    opacity: 1;
  }
  50% {
    transform: scale(0.95) rotate(-3deg);
  }
  70% {
    transform: scale(1.05) rotate(2deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

@keyframes discPulseGlow {
  0% {
    box-shadow: 
      0 0 0 0 var(--accent-light),
      0 0 30px var(--glow-color);
    filter: brightness(1.3);
  }
  25% {
    box-shadow: 
      0 0 40px 20px var(--accent-medium),
      0 0 80px 40px var(--accent-soft);
    filter: brightness(1.5);
  }
  50% {
    box-shadow: 
      0 0 60px 30px var(--glow-color),
      0 0 100px 50px var(--accent-subtle);
    filter: brightness(1.4) saturate(1.2);
  }
  75% {
    box-shadow: 
      0 0 30px 15px var(--accent-soft),
      0 0 60px 30px var(--accent-subtle);
    filter: brightness(1.2);
  }
  100% {
    box-shadow: none;
    filter: brightness(1);
  }
}

/* Responsividade para dispositivos móveis */
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
  }
  
  .vinyl-container {
    order: 1;
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
    width: 45px;
    height: 45px;
    font-size: 1rem;
  }
  
  .play-pause-btn {
    width: 55px;
    height: 55px;
    font-size: 1.2rem;
  }
}

/* Estilos para capas claras - melhor contraste */
.vinyl-center.white-album .placeholder-text {
  color: #333;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}

.external-device-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(29, 185, 84, 0.2);
  border: 1px solid #1DB954;
  color: #1DB954;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
  margin-right: 0.5rem;
  vertical-align: middle;
  animation: pulse-green 2s infinite;
}

@keyframes pulse-green {
  0% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0.4); }
  70% { box-shadow: 0 0 0 5px rgba(29, 185, 84, 0); }
  100% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0); }
}
</style> 