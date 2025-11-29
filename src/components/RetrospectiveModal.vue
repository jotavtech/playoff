<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div 
      class="modal-content" 
      :class="{ 'closing': isClosing }"
      ref="modalContent"
    >
      <!-- Botão Fechar -->
      <button class="close-btn" @click="handleClose">
        <i class="fas fa-times"></i>
      </button>

      <!-- O CARD PARA EXPORTAR -->
      <div id="retro-card" class="retro-card">
        <!-- Efeito Granulado Overlay -->
        <div class="noise-overlay"></div>
        
        <!-- Header -->
        <div class="retro-header">
          <h1 class="retro-title">RESUMO DA SEMANA</h1>
          <img 
            src="https://res.cloudinary.com/dzwfuzxxw/image/upload/v1764087001/playoff_2_yvagtx.png" 
            alt="PlayOff" 
            class="retro-logo"
          />
        </div>

        <div class="retro-body">
          <div class="tape-strip"></div>
          
          <h2 class="section-title">
            <span v-if="isLoading">CARREGANDO...</span>
            <span v-else class="title-spaced">
              MINHAS <span class="spacer"></span> MÚSICAS <span class="spacer"></span> DA <span class="spacer"></span> SEMANA
            </span>
          </h2>
          
          <!-- Loading Spinner -->
          <div v-if="isLoading" class="loading-container">
            <div class="spinner"></div>
          </div>

          <!-- Lista de Músicas -->
          <div v-else class="songs-list">
            <div 
              v-for="(song, index) in topSongs" 
              :key="song.id" 
              class="song-row"
            >
              <span class="rank-number">#{{ index + 1 }}</span>
              
              <div class="song-cover-container">
                <img 
                  :src="song.albumCover" 
                  class="song-cover" 
                  crossorigin="anonymous"
                />
                <div class="glitch-effect"></div>
              </div>
              
              <div class="song-info">
                <span class="song-title">{{ song.title }}</span>
                <span class="song-artist">{{ song.artist }}</span>
              </div>

              <div class="song-stats" v-if="song.votes > 0">
                <i class="fas fa-heart"></i> {{ song.votes }}
              </div>
            </div>
          </div>

          <!-- Rodapé do Card -->
          <div class="card-footer">
            <div class="barcode">
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar thin"></div>
              <div class="bar"></div>
              <div class="bar thin"></div>
              <div class="bar"></div>
            </div>
            <div class="footer-info">
              <span class="source-tag" v-if="!isLoading">
                DADOS: {{ sourceUsed === 'spotify' ? 'SPOTIFY' : 'PLAYOFF VOTOS' }}
              </span>
              <span class="date-tag">{{ currentDate }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Botões de Ação (Fora do print) -->
      <div class="action-buttons">
        <button class="export-btn" @click="handleExport" :disabled="isLoading">
          <i class="fas fa-download"></i> SALVAR FICHA
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, onUnmounted } from 'vue'
import { useRetrospective } from '../composables/useRetrospective'

const props = defineProps({
  songs: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['close'])

const isClosing = ref(false)
const modalContent = ref(null)

// Usando o composable passando a ref das músicas
// Como props.songs é reativo, precisamos passar uma ref ou computed
const songsRef = computed(() => props.songs)
const { 
  weeklyTopSongs, 
  downloadCard, 
  fetchWeeklyData, 
  isLoading, 
  sourceUsed 
} = useRetrospective(songsRef)

const topSongs = weeklyTopSongs

const currentDate = computed(() => {
  return new Date().toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
})

const handleExport = async () => {
  await downloadCard('retro-card')
}

// Animação de Fechamento Spider-Verse
const handleClose = () => {
  isClosing.value = true
  setTimeout(() => {
    emit('close')
  }, 400) // Tempo da animação
}

// Fechar ao rolar para baixo (apenas se sair da ficha)
const handleScroll = (e) => {
  const card = document.getElementById('retro-card')
  if (!card) return

  const rect = card.getBoundingClientRect()
  
  // Só fecha se o fundo do card estiver subindo perto do topo da tela (card saindo de vista)
  // Isso garante que o usuário possa rolar todo o conteúdo sem fechar acidentalmente
  if (rect.bottom < 200) {
    handleClose()
  }
}

onMounted(() => {
  fetchWeeklyData()
  
  // Adiciona listener de scroll no overlay
  const overlay = document.querySelector('.modal-overlay')
  if (overlay) {
    overlay.addEventListener('scroll', handleScroll)
  }
})

onUnmounted(() => {
  const overlay = document.querySelector('.modal-overlay')
  if (overlay) {
    overlay.removeEventListener('scroll', handleScroll)
  }
})
</script>

<style scoped>
/* ... estilos mantidos ... */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9); /* Darker solid fallback */
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: flex-start; /* Permite rolagem natural */
  padding: 4rem 20px;
  padding-bottom: 80vh; /* Espaço extra para permitir rolar a ficha "para fora" */
  overflow-y: auto; /* Habilita rolagem se o conteúdo for grande */
}

@media (min-width: 769px) {
  .modal-overlay {
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
  }
}

.modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  transform: scale(0.9);
  animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  margin: auto; /* Centraliza horizontalmente e verticalmente se couber */
}

/* ANIMAÇÃO SPIDER-VERSE CLOSING */
.modal-content.closing {
  animation: glitchClose 0.4s forwards ease-in;
}

@keyframes glitchClose {
  0% {
    transform: scale(0.9);
    filter: none;
  }
  20% {
    transform: scale(0.95) skewX(-10deg);
    filter: url(#noiseFilter);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  }
  40% {
    transform: scale(0.8) skewX(10deg);
    clip-path: polygon(10% 0, 90% 0, 100% 100%, 0 100%);
    filter: hue-rotate(90deg);
  }
  60% {
    transform: scale(0.6) translate(20px, -20px);
    opacity: 0.8;
    clip-path: polygon(0 20%, 100% 0, 80% 100%, 20% 80%);
  }
  100% {
    transform: scale(0);
    opacity: 0;
    filter: hue-rotate(180deg) blur(10px);
  }
}

/* O CARD PRINCIPAL */
.retro-card {
  width: 500px;
  min-height: 850px;
  background: #050505;
  border: 4px solid #ff6b6b;
  border-radius: 0; /* Canto reto hardcore */
  position: relative;
  overflow: hidden;
  padding: 2.5rem;
  box-shadow: 
    10px 10px 0 #ff6b6b,
    0 0 100px rgba(255, 107, 107, 0.15);
  display: flex;
  flex-direction: column;
  transform: rotate(-1deg); /* Leve inclinação geral */
}

/* Efeito Granulado */
.noise-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.05; /* Reduced opacity */
  pointer-events: none;
  /* Removed heavy SVG filter for mobile/performance default */
  background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAA5OTkAAABMTExERERmZmazs7O/v79b/uLzAAAACHRSTlMAMwA1MzMzM7O0s1EAAABWSURBVDjLxZNBCgAgDMT8/3O9CgqC4CU9iMcS2G1RM7u0/iBO5CBO5CBO5CBO5CBO5CBO5CBO5CBO5CBO5CBO5CBO5CBO5CBO5CBO5CBO5CBO5CBO5CBO5M1uF9FGFK612s4AAAAASUVORK5CYII='); /* Simple noise pattern */
  z-index: 1;
  mix-blend-mode: overlay;
}

@media (min-width: 769px) {
  .noise-overlay {
    opacity: 0.12;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  }
}

.retro-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2.5rem;
  z-index: 2;
  position: relative;
  border-bottom: 4px solid #fff;
  padding-bottom: 1rem;
}

.retro-title {
  font-family: 'Cingire', sans-serif;
  font-size: 4.5rem;
  color: #fff;
  line-height: 0.85;
  margin: 0;
  text-shadow: 4px 4px 0px #ff6b6b;
  transform: skewX(-5deg);
  width: 75%;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.retro-logo {
  width: 90px;
  height: auto;
  filter: drop-shadow(2px 2px 0 #ff6b6b);
  transform: rotate(5deg);
}

.tape-strip {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%) rotate(2deg);
  width: 150px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  /* backdrop-filter: blur(5px); Removed default blur */
  z-index: 5;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

@media (min-width: 769px) {
  .tape-strip {
    backdrop-filter: blur(5px);
  }
}

.section-title {
  font-family: 'Space Mono', monospace;
  color: #ff6b6b;
  font-size: 1rem;
  margin-bottom: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 3px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.5rem;
  border: 1px solid #333;
}

/* Correção de espaçamento para html2canvas */
.title-spaced {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.spacer {
  display: inline-block;
  width: 8px; /* Espaço forçado */
}

.songs-list {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  z-index: 2;
  position: relative;
}

.song-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.5rem;
  border: 1px solid transparent;
  transition: all 0.3s;
}

.song-row:hover {
  border-color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  transform: skewX(-2deg);
}

.rank-number {
  font-family: 'Cingire', sans-serif;
  font-size: 3rem;
  color: #fff;
  width: 50px;
  text-align: center;
  line-height: 1;
  text-shadow: 3px 3px 0 #ff6b6b;
  transform: rotate(-5deg);
}

.song-cover-container {
  width: 65px;
  height: 65px;
  position: relative;
  flex-shrink: 0;
  border: 2px solid #fff;
  box-shadow: 3px 3px 0 rgba(0,0,0,0.5);
}

.song-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: contrast(1.2) grayscale(0.2);
}

.song-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  padding-left: 0.5rem;
}

.song-title {
  font-family: 'Cingire', sans-serif; /* Fonte Hardcore */
  color: #fff;
  font-size: 1.8rem; /* Aumentado */
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 2px;
}

.song-artist {
  font-family: 'Space Mono', monospace;
  color: #ff6b6b;
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: bold;
}

.song-stats {
  font-family: 'Cingire', sans-serif;
  color: #fff;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 5px;
  background: #ff6b6b;
  padding: 2px 8px;
  transform: skewX(-10deg);
  border: 1px solid #fff;
  box-shadow: 2px 2px 0 rgba(0,0,0,0.5);
}

/* Footer / Barcode */
.card-footer {
  margin-top: auto;
  padding-top: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  opacity: 0.7;
}

.footer-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.barcode {
  display: flex;
  height: 30px;
  gap: 3px;
}

.bar {
  width: 4px;
  background: #fff;
}
.bar.thin { width: 2px; }

.date-tag {
  font-family: 'Space Mono', monospace;
  font-size: 0.7rem;
  color: #fff;
  letter-spacing: 1px;
}

.source-tag {
  font-family: 'Space Mono', monospace;
  font-size: 0.6rem;
  color: #ff6b6b;
  font-weight: bold;
}

/* Loading */
.loading-container {
  height: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 107, 107, 0.3);
  border-top-color: #ff6b6b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Botões */
.close-btn {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: #fff;
  font-size: 2rem;
  cursor: pointer;
}

.export-btn {
  background: #ff6b6b;
  color: #fff;
  border: none;
  padding: 1rem 2rem;
  border-radius: 30px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: bold;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  box-shadow: 0 5px 20px rgba(255, 107, 107, 0.4);
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-btn:hover:not(:disabled) {
  transform: scale(1.05);
  background: #fff;
  color: #ff6b6b;
}

@keyframes popIn {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(0.9); opacity: 1; }
}

/* Responsividade */
@media (max-width: 500px) {
  .retro-card {
    width: 100%;
    padding: 1.5rem;
    min-height: auto;
  }
  
  .retro-title {
    font-size: 2.5rem;
  }
}
</style>
