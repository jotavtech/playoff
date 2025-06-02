<template>
  <div class="hero-section">
    <!-- Logo PlayOff - Acima do Card -->
    <div class="playoff-logo-header">
      <img 
        src="https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748884319/playoff_lds4yw.png" 
        alt="PlayOff Music Logo" 
        class="playoff-logo"
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
          
          <p v-if="currentTrack" class="track-album">{{ currentTrack.album }}</p>
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
        </div>

        <!-- Barra de Progresso -->
        <div class="progress-section">
          <span class="time-display">{{ formatTime(position) }}</span>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: progressPercentage + '%' }"
            ></div>
          </div>
          <span class="time-display">{{ formatTime(duration) }}</span>
        </div>
      </div>

      <!-- Disco de Vinil Animado -->
      <div class="vinyl-container">
        <div 
          class="vinyl-disc" 
          :class="{ playing: isPlaying }"
        >
          <div class="vinyl-center">
            <img 
              v-if="currentTrack?.albumCover && currentTrack.albumCover !== 'https://via.placeholder.com/300x300/333/fff?text=♪'" 
              :src="currentTrack.albumCover" 
              :alt="`${currentTrack.title} - Capa do Álbum`"
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
  </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue'
import { useCloudinaryAudio } from '../composables/useCloudinaryAudio'

// ============= PROPS E EMITS =============
// Props recebidas do componente pai (App.vue)
const props = defineProps({
  currentTrack: Object,     // Música sendo reproduzida atualmente
  isPlaying: Boolean,       // Status de reprodução
  position: Number,         // Posição atual em ms
  duration: Number,         // Duração total em ms
  formatTime: Function      // Função para formatar tempo
})

// Eventos emitidos para o componente pai
defineEmits(['toggle-playback', 'previous-track', 'next-track'])

// ============= COMPUTED PROPERTIES =============
// Calcula porcentagem de progresso para barra visual
const progressPercentage = computed(() => {
  if (!props.duration || props.duration === 0) return 0
  return (props.position / props.duration) * 100
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
    console.log('🎨 HeroSection: Capa carregada, analisando brilho...')
    
    // Analiso brilho da imagem carregada
    const brightness = await detectImageBrightness(event.target.src)
    
    // Determino se é uma capa clara (precisa de texto escuro)
    isWhiteAlbum.value = brightness > 0.7 // Threshold de 70% para considerar "clara"
    
    console.log(`💡 Brilho detectado: ${brightness.toFixed(2)} - Capa ${isWhiteAlbum.value ? 'clara' : 'escura'}`)
    
    // Aplico classe CSS baseada no brilho para ajustar contraste
    const vinylCenter = event.target.closest('.vinyl-center')
    if (vinylCenter) {
      if (isWhiteAlbum.value) {
        vinylCenter.classList.add('white-album')
        console.log('🎨 Aplicando estilo para capa clara')
      } else {
        vinylCenter.classList.remove('white-album')
        console.log('🎨 Aplicando estilo para capa escura')
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao analisar brilho da capa:', error)
    // Em caso de erro, assumo capa escura (mais seguro)
    isWhiteAlbum.value = false
  }
}

// Função chamada quando há erro no carregamento da capa
// Implementa fallback gracioso para manter funcionalidade
const onImageError = (event) => {
  console.warn('⚠️ Erro ao carregar capa do álbum:', event.target.src)
  
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
  height: 80px;
  width: auto;
  border-radius: 10px;
  transition: all 0.3s ease;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.playoff-logo:hover {
  transform: scale(1.1) rotate(2deg);
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4));
}

/* Responsividade da logo */
@media (max-width: 768px) {
  .playoff-logo {
    height: 65px;
  }
  
  .playoff-logo-header {
    margin-bottom: 2.5rem;
    padding-bottom: 0;
  }
}

@media (max-width: 480px) {
  .playoff-logo {
    height: 55px;
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
  margin-bottom: 8rem;
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
  max-width: 400px;
  z-index: 10;
  position: relative;
  padding-top: 0; /* Removendo padding extra já que logo está fora */
}

.track-info {
  margin-bottom: 2rem;
  margin-top: 1.5rem; /* Adicionando espaço acima das informações da música */
}

.track-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #fff;
}

.track-artist {
  font-size: 1.2rem;
  color: #ff6b6b;
  margin-bottom: 0.3rem;
}

.track-album {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 1.5rem;
}

.player-controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
}

.control-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover {
  background: rgba(255, 107, 107, 0.3);
  transform: scale(1.1);
}

.play-pause-btn {
  width: 60px;
  height: 60px;
  background: linear-gradient(45deg, #ff6b6b, #feca57);
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
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff6b6b, #feca57);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.time-display {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  min-width: 45px;
}

.vinyl-container {
  position: relative;
  flex-shrink: 0;
  z-index: 5;
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
  }
  
  .play-pause-btn {
    width: 55px;
    height: 55px;
  }
}

/* Estilos para capas claras - melhor contraste */
.vinyl-center.white-album .placeholder-text {
  color: #333;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}
</style> 