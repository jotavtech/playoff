<template>
  <div class="hero-section">
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
/* Estilos do componente HeroSection */
.hero-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2rem;
  min-height: 400px;
  gap: 3rem;
}

/* Responsividade para dispositivos móveis */
@media (max-width: 768px) {
  .hero-section {
    flex-direction: column;
    text-align: center;
    gap: 2rem;
  }
}

/* Estilos para capas claras - melhor contraste */
.vinyl-center.white-album .placeholder-text {
  color: #333;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}
</style> 