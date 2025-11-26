<template>
  <div class="lyrics-view" @click.self="$emit('close')">
    <div class="lyrics-container" ref="lyricsContainer">
      <div v-if="isLoading" class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Procurando letra...</p>
      </div>
      
      <div v-else-if="error" class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
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
        <p>Nenhuma letra disponível</p>
      </div>
    </div>
    
    <!-- Close button for mobile or easy access -->
    <button class="close-lyrics" @click="$emit('close')">
      <i class="fas fa-times"></i>
    </button>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'

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
    default: '#ffffff'
  }
})

const emit = defineEmits(['close', 'seek'])
const lyricsContainer = ref(null)

const getLineStyle = (index) => {
  if (index === props.currentLineIndex) {
    return {
      color: props.dominantColor || '#ff6b6b',
      textShadow: `2px 2px 0 #000`
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
  z-index: 15; /* Behind playing card (20) but above others */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.6); /* Darken background slightly */
}

.lyrics-container {
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: auto;
  mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
}

/* Hide scrollbar */
.lyrics-container::-webkit-scrollbar {
  width: 0;
  background: transparent;
}

.lyrics-lines {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 1200px; /* Wider container */
  padding: 50vh 0; /* Allow scrolling to very top/bottom */
}

.lyric-line {
  font-family: 'Cingire', 'Impact', sans-serif;
  font-size: 2.5rem; /* Larger base size */
  color: rgba(255, 255, 255, 0.3); /* Faint when inactive */
  text-align: center;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
  padding: 0.5rem 1rem;
  border: 1px solid transparent;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 900;
  -webkit-text-stroke: 1px rgba(255,255,255,0.1);
}

.lyric-line:hover {
  color: #fff;
  transform: scale(1.1);
  text-shadow: 0 0 20px currentColor;
}

.lyric-line.active {
  font-size: 5rem; /* Huge active line */
  opacity: 1;
  transform: scale(1.05);
  -webkit-text-stroke: 3px #000; /* Thick border */
  text-shadow: 
    4px 4px 0 #000,
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000,
    0 0 30px currentColor; /* Glow */
  background: transparent;
  border: none;
  box-shadow: none;
  line-height: 1.1;
  z-index: 10;
}

.lyric-line.past {
  opacity: 0.2;
  filter: blur(1px);
}

.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #fff;
  font-family: 'Cingire', sans-serif;
  font-size: 1.5rem;
  text-shadow: 2px 2px 0 #000;
}

.loading-state i, .error-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #ff6b6b;
}

.error-detail {
  font-size: 1rem;
  opacity: 0.7;
  font-family: sans-serif;
}

.close-lyrics {
  position: absolute;
  top: 2rem;
  right: 2rem;
  background: transparent;
  border: 2px solid #fff;
  color: #fff;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-lyrics:hover {
  background: #ff6b6b;
  border-color: #ff6b6b;
  transform: rotate(90deg);
}

@media (max-width: 768px) {
  .lyric-line {
    font-size: 1.5rem;
  }
  .lyric-line.active {
    font-size: 2rem;
  }
}
</style>
