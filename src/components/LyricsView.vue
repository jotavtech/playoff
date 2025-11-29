<template>
  <div class="lyrics-view" @click.self="$emit('close')">
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
          <!-- Decoração Tribal (Alternada e apenas em refrões) -->
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
            
            <!-- Timer de Canto (Barra de Progresso) -->
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
    
    <button class="close-lyrics-radical" @click="$emit('close')">
      <span class="x-stroke"></span>
      <span class="x-stroke"></span>
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'

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
    default: '#ff6b6b' // Fallback color
  }
})

const emit = defineEmits(['close', 'seek'])
const lyricsContainer = ref(null)

// Debugging
watch(() => props.currentLineIndex, (newVal) => {
  console.log('LyricsView: currentLineIndex updated:', newVal)
})

watch(() => props.lyrics, (newVal) => {
  console.log('LyricsView: lyrics received:', newVal?.length || 0, 'lines')
})

watch(() => props.track, (newVal) => {
  console.log('LyricsView: track updated:', newVal)
})

// Imagens tribais fornecidas
const tribalDecorations = [
  'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1764354409/e043da0489879c615d5063b55c5ab0c7-removebg-preview_aroulq.png',
  'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1764354409/f71e42405ccc0d760e397cf03b0cf5b7-removebg-preview_lazpjg.png',
  'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1764354409/61931ac719e6d079156620b1c94535cb-removebg-preview_b1jeta.png',
  'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1764354409/6603a562e7b182e052f6923d5a3966a3-removebg-preview_pnqo4g.png'
]

// Heurística simples para detectar refrão (repetição de texto)
const isChorusLine = (index) => {
  if (!props.lyrics || props.lyrics.length === 0) return false
  const line = props.lyrics[index].text.toLowerCase().trim()
  if (line.length < 5) return false // Ignora linhas muito curtas

  // Conta quantas vezes essa linha aparece na música
  const count = props.lyrics.filter(l => l.text.toLowerCase().trim() === line).length
  return count >= 3 // Se aparecer 3 ou mais vezes, provável refrão
}

// Lógica para mostrar decoração (Alternada e condicional)
const shouldShowDecor = (index, side) => {
  // Só mostra se for linha ativa E for refrão
  if (index !== props.currentLineIndex) return false
  if (!isChorusLine(index)) return false

  // Alterna o lado baseado no índice (par = esquerda, impar = direita)
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

// Heurística para reduzir tamanho da fonte em linhas longas
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
      return Math.max(duration, 1) // Mínimo de 1s
    }
  }
  return 4 // Duração padrão
}

const seekTo = (time) => {
  emit('seek', time)
}

const handleScroll = () => {
  // Optional: Add logic if needed, but keeping it passive helps performance
}

const scrollToActiveLine = () => {
  const container = lyricsContainer.value
  if (!container) return

  // Cache selectors if possible or use ID-based lookup for speed
  // For now, we optimize by not querying if we don't need to
  const wrappers = container.children[0]?.children // Accessing direct children of .lyrics-lines
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
/* ... Estilos do container mantidos ... */
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
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.98); /* Darker background, less alpha */
  /* Removed backdrop-filter for performance */
}

@supports (backdrop-filter: blur(10px)) {
  @media (min-width: 769px) {
    .lyrics-view {
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(10px);
    }
  }
}

.lyrics-container {
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  perspective: 1000px;
  mask-image: linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%);
}

.lyrics-lines {
  display: flex;
  flex-direction: column;
  align-items: flex-end; 
  gap: 1rem;
  width: 100%;
  max-width: 1600px;
  padding: 50vh 10%; 
}

.lyric-wrapper {
  display: flex;
  align-items: center;
  justify-content: flex-end; 
  gap: 30px;
  width: 100%;
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease; /* Optimized transition properties */
  transform-origin: right center;
  opacity: 0.3;
  /* Default (Desktop) Transforms */
  transform: translateX(50px) scale(0.8) rotateY(-10deg);
  will-change: transform, opacity; /* Hint for browser */
}

/* Wrapper do conteúdo da linha (texto + timer) */
.line-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: fit-content;
}

/* Timer de Canto */
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
  /* animation-duration definida inline */
  animation-name: timer-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  box-shadow: 0 0 10px currentColor;
}

@keyframes timer-progress {
  from { width: 0%; }
  to { width: 100%; }
}

/* Futuro */
.future-wrapper {
  opacity: 0.3;
  transform: translateX(100px) scale(0.8) rotateY(-20deg);
}

/* Passado */
.past-wrapper {
  opacity: 0.1;
  transform: translateX(200px) scale(0.7) rotateY(-30deg);
  filter: blur(2px);
}

/* Ativo */
.active-wrapper {
  opacity: 1;
  transform: translateX(0) scale(1.1) rotateY(0deg);
  z-index: 10;
  filter: none;
  justify-content: center; 
  margin: 2rem 0;
}

/* Tribal */
.tribal-decor {
  height: 180px; 
  width: auto;
  opacity: 0.8;
  transition: all 0.6s ease;
  pointer-events: none;
}

.tribal-decor.left {
  transform: translateX(20px);
}

.tribal-decor.right {
  transform: translateX(-20px) scaleX(-1);
}

/* Texto */
.lyric-line {
  font-family: 'Impact', 'Cingire', sans-serif;
  font-size: 3.5rem;
  text-transform: uppercase;
  font-style: italic;
  color: rgba(255, 255, 255, 0.5);
  text-align: right;
  cursor: pointer;
  transition: all 0.4s;
  white-space: normal; /* Permite quebra de linha */
  word-wrap: break-word; /* Quebra palavras longas */
  max-width: 90%; /* Limite de segurança */
  background: rgba(255, 255, 255, 0.03);
  padding: 1rem 2rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.lyric-line.long-text {
  font-size: 2.5rem; /* Fonte menor para textos longos */
  max-width: 95%;
}

.lyric-line:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

/* Estilo Ativo Sobrescreve - Borda Itálica e Grossa */
.active-wrapper .lyric-line {
  font-size: 5rem;
  background: rgba(0, 0, 0, 0.6);
  text-align: center;
  /* Simplificado para mobile */
  box-shadow: none;
  border-bottom: 4px solid currentColor;
  transform: none; /* Remove skew/transform on active line mobile/perf */
  padding-bottom: 0.2rem;
}

.active-wrapper .lyric-line.long-text {
  font-size: 3.2rem; /* Fonte reduzida na ativa se for longa */
}

/* Botão Fechar e outros mantidos */
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

.close-lyrics-radical {
  position: fixed;
  top: 2rem;
  left: 2rem;
  width: 60px;
  height: 60px;
  background: transparent;
  border: 3px solid #fff;
  cursor: pointer;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: skewX(-10deg);
  transition: all 0.3s;
}

.close-lyrics-radical .x-stroke {
  position: absolute;
  width: 40px;
  height: 4px;
  background-color: #fff;
}

.close-lyrics-radical .x-stroke:first-child { transform: rotate(45deg); }
.close-lyrics-radical .x-stroke:last-child { transform: rotate(-45deg); }

.close-lyrics-radical:hover {
  background: #fff;
  border-color: var(--accent-rgb);
  transform: skewX(-10deg) scale(1.1) rotate(5deg);
}
.close-lyrics-radical:hover .x-stroke { background-color: var(--accent-rgb); }

@media (max-width: 768px) {
  .lyric-line { 
    font-size: 1.8rem; 
    text-shadow: none !important; /* Remove text shadow on mobile */
  }
  .active-wrapper .lyric-line { 
    font-size: 2.4rem; /* Slightly smaller */
    box-shadow: none !important;
    transform: none !important;
    border-bottom-width: 4px !important;
  }
  .tribal-decor { height: 60px; opacity: 0.5; } /* Smaller images */
  
  .lyric-wrapper { 
    transform: none !important; 
    opacity: 1 !important; 
    justify-content: center; 
    transition: opacity 0.3s ease; /* Simpler transition */
  }
  
  .lyrics-lines { 
    align-items: center; 
    padding: 50vh 1rem; 
    gap: 1.5rem; /* More space */
  }
  
  .future-wrapper, .past-wrapper { 
    opacity: 0.4 !important; 
    filter: none !important; 
    transform: scale(0.95) !important; /* Simple scale instead of 3D */
  }
  
  /* Disable heavy animations */
  .timer-bar {
    box-shadow: none !important;
  }
}
</style>
