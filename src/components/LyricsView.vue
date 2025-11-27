<template>
  <div class="lyrics-view" @click.self="$emit('close')">
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
        <p 
          v-for="(line, index) in lyrics" 
          :key="index"
          class="lyric-line"
          :class="{ 'active': index === currentLineIndex, 'past': index < currentLineIndex }"
          :style="getLineStyle(index)"
          @click="seekTo(line.time)"
        >
          {{ line.text }}
        </p>
      </div>
      
      <div v-else class="empty-state">
        <p>INSTRUMENTAL</p>
      </div>
    </div>
    
    <button class="close-lyrics-radical" @click="$emit('close')">
      <span class="x-stroke"></span>
      <span class="x-stroke"></span>
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  lyrics: {
    type: Array,
    default: () => []
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
    default: '#ff6b6b' // Fallback color
  }
})

const emit = defineEmits(['close', 'seek'])
const lyricsContainer = ref(null)

const getLineStyle = (index) => {
  // A cor vem do prop dominantColor
  const color = props.dominantColor || '#ffffff'
  
  if (index === props.currentLineIndex) {
    return {
      '--glow-color': color,
      borderColor: color
    }
  }
  return {}
}

const seekTo = (time) => {
  emit('seek', time)
}

// Auto-scroll to active line
watch(() => props.currentLineIndex, (newIndex) => {
  if (newIndex >= 0) {
    scrollToActiveLine()
  }
})

const scrollToActiveLine = () => {
  const activeEl = document.querySelector('.lyric-line.active')
  if (activeEl) {
    activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

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
  z-index: 15;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.85); /* Fundo mais escuro para ressaltar o neon */
  backdrop-filter: blur(8px);
}

.lyrics-container {
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  /* O segredo do alinhamento: tudo começa alinhado à direita (futuro/passado) */
  align-items: flex-end; 
  mask-image: linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%);
}

.lyrics-container::-webkit-scrollbar {
  width: 0;
  background: transparent;
}

.lyrics-lines {
  display: flex;
  flex-direction: column;
  /* Alinha itens filhos à direita por padrão */
  align-items: flex-end; 
  gap: 1.5rem;
  width: 100%;
  max-width: 1400px;
  padding: 50vh 0;
}

.lyric-line {
  font-family: 'Impact', 'Cingire', sans-serif; /* Fonte pesada */
  font-size: 3rem;
  text-transform: uppercase;
  font-style: italic; /* Speed/Rock feel */
  color: rgba(255, 255, 255, 0.15); /* Bem apagado quando não ativo */
  text-align: right;
  cursor: pointer;
  padding: 0.5rem 2rem;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform: skewX(-10deg); /* Inclinação agressiva */
  /* Borda transparente por padrão */
  border-right: 5px solid transparent; 
  width: fit-content;
  max-width: 80%;
}

.lyric-line:hover {
  color: #fff;
  opacity: 0.8;
  transform: skewX(-10deg) translateX(-20px);
}

/* === ESTILO DA LINHA ATIVA (O SHOW) === */
.lyric-line.active {
  /* Centraliza a linha ativa! */
  align-self: center; 
  text-align: center;
  
  font-size: 5.5rem; /* Gigante */
  color: #fff;
  opacity: 1;
  
  /* Remove skew ou mantém, dependendo do gosto. Manter skew dá velocidade */
  transform: skewX(-10deg) scale(1.1);
  
  /* Borda brilhante na esquerda e direita para destacar */
  border-right: 5px solid var(--glow-color);
  border-left: 5px solid var(--glow-color);
  padding: 1rem 3rem;
  background: rgba(255, 255, 255, 0.02);
  
  /* O Efeito Chris Cornell: Neon + Raio */
  text-shadow: 
    3px 3px 0px #000,
    -1px -1px 0 #000,  
    0 0 20px var(--glow-color),
    0 0 40px var(--glow-color),
    0 0 80px var(--glow-color);
    
  animation: electric-pulse 0.15s infinite alternate;
  z-index: 10;
}

/* Linhas passadas ficam à direita, mas um pouco mais longe */
.lyric-line.past {
  opacity: 0.1;
  filter: blur(2px);
  transform: skewX(-10deg) translateX(20px); /* Empurra mais pra direita */
}

/* Animação de Eletricidade/Flicker */
@keyframes electric-pulse {
  0% {
    text-shadow: 
      3px 3px 0 #000,
      0 0 20px var(--glow-color),
      0 0 40px var(--glow-color);
    opacity: 0.95;
  }
  100% {
    text-shadow: 
      3px 3px 0 #000,
      0 0 25px var(--glow-color),
      0 0 50px var(--glow-color),
      0 0 100px #fff; /* Flash branco no centro do neon */
    opacity: 1;
  }
}

.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #fff;
  font-family: 'Impact', sans-serif;
  font-size: 2rem;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.loading-state i, .error-state i {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  /* Cor será injetada via style */
}

/* === BOTÃO FECHAR RADICAL === */
.close-lyrics-radical {
  position: fixed;
  top: 2rem;
  left: 2rem;
  width: 60px;
  height: 60px;
  background: transparent;
  border: 3px solid #fff;
  cursor: pointer;
  z-index: 100; /* Acima de tudo */
  display: flex;
  align-items: center;
  justify-content: center;
  transform: skewX(-10deg);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 5px 5px 0 rgba(0,0,0,0.5);
}

.close-lyrics-radical .x-stroke {
  position: absolute;
  width: 40px;
  height: 4px;
  background-color: #fff;
  transition: all 0.3s;
}

.close-lyrics-radical .x-stroke:first-child {
  transform: rotate(45deg);
}

.close-lyrics-radical .x-stroke:last-child {
  transform: rotate(-45deg);
}

.close-lyrics-radical:hover {
  background: #fff;
  border-color: #ff0000; /* Vermelho sangue */
  transform: skewX(-10deg) scale(1.1) rotate(5deg);
  box-shadow: 0 0 20px #ff0000, 0 0 40px #ff0000;
}

.close-lyrics-radical:hover .x-stroke {
  background-color: #ff0000;
}

/* Ao clicar (efeito de pressão) */
.close-lyrics-radical:active {
  transform: skewX(-10deg) scale(0.95);
  box-shadow: 0 0 10px #ff0000;
}

@media (max-width: 768px) {
  .lyric-line {
    font-size: 1.8rem;
  }
  .lyric-line.active {
    font-size: 2.5rem;
    padding: 0.5rem 1rem;
  }
  .close-lyrics-radical {
    top: 1rem;
    left: 1rem;
    width: 50px;
    height: 50px;
  }
  .close-lyrics-radical .x-stroke {
    width: 30px;
  }
}
</style>
