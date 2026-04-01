<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Fila de Reprodução</h2>
        <button class="close-btn" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="queue-list" v-if="queue.length > 0">
        <div 
          v-for="(song, index) in queue" 
          :key="song.id" 
          class="queue-item"
          draggable="true"
          @dragstart="dragStart(index, $event)"
          @dragover.prevent="dragOver(index)"
          @drop="drop(index)"
          :class="{ 'dragging': draggedIndex === index, 'drag-over': dragOverIndex === index }"
        >
          <div class="drag-handle">
            <i class="fas fa-bars"></i>
          </div>
          <div class="song-info">
            <span class="song-number">{{ index + 1 }}</span>
            <img :src="song.albumCover" class="song-cover" />
            <div class="text-info">
              <span class="song-title">{{ song.title }}</span>
              <span class="song-artist">{{ song.artist }}</span>
            </div>
          </div>
          <button class="remove-btn" @click="removeFromQueue(index)">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>

      <div class="empty-queue" v-else>
        <i class="fas fa-music"></i>
        <p>A fila está vazia</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCloudinaryAudio } from '../composables/useCloudinaryAudio'

const { queue } = useCloudinaryAudio()
const draggedIndex = ref(null)
const dragOverIndex = ref(null)

const removeFromQueue = (index) => {
  queue.value.splice(index, 1)
}

const dragStart = (index, event) => {
  draggedIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  // Pequeno delay para não esconder o elemento enquanto arrasta (visual)
  setTimeout(() => {
    event.target.style.opacity = '0.5'
  }, 0)
}

const dragOver = (index) => {
  // Apenas marca onde vai cair
  dragOverIndex.value = index
}

const drop = (index) => {
  const draggedItemIndex = draggedIndex.value
  const targetIndex = index
  
  if (draggedItemIndex !== null && draggedItemIndex !== targetIndex) {
    // Remove o item da posição original e insere na nova
    const itemToMove = queue.value[draggedItemIndex]
    queue.value.splice(draggedItemIndex, 1)
    queue.value.splice(targetIndex, 0, itemToMove)
  }
  
  // Limpa estados
  draggedIndex.value = null
  dragOverIndex.value = null
  
  // Reseta opacidade (via seletor geral pois ref não é elemento DOM direto aqui facilmente)
  const items = document.querySelectorAll('.queue-item')
  items.forEach(item => item.style.opacity = '1')
}

defineEmits(['close'])
</script>

<style scoped>
/* ============= QUEUE MODAL - Persona 5 Angular ============= */
.modal-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: var(--p5-black, #0a0a0a);
  width: 90%;
  max-width: 500px;
  max-height: 85vh;
  border: 3px solid var(--p5-white, #fff);
  display: flex;
  flex-direction: column;
  transform: skewX(-2deg);
  box-shadow: 8px 8px 0 var(--accent-rgb, #ff6b6b), 0 0 40px var(--glow-color, rgba(255, 107, 107, 0.3));
  position: relative;
  margin: auto;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 3px solid rgba(255, 255, 255, 0.15);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, rgba(var(--accent-color, 255, 107, 107), 0.1), transparent);
}

.modal-title {
  font-family: 'Cingire', 'Space Grotesk', sans-serif;
  color: var(--p5-white, #fff);
  font-size: 1.5rem;
  margin: 0;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-shadow: 2px 2px 0 rgba(var(--accent-color, 255, 107, 107), 0.3);
}

.close-btn {
  width: 40px;
  height: 40px;
  background: transparent;
  border: 2px solid var(--p5-white, #fff);
  color: var(--p5-white, #fff);
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: var(--accent-rgb, #ff6b6b);
  border-color: var(--accent-rgb, #ff6b6b);
  transform: rotate(90deg);
}

.queue-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.queue-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem;
  background: rgba(255, 255, 255, 0.03);
  margin-bottom: 0.5rem;
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-left: 3px solid transparent;
  transition: all 0.15s ease;
  cursor: grab;
}

.queue-item:active {
  cursor: grabbing;
}

.queue-item:hover {
  background: rgba(var(--accent-color, 255, 107, 107), 0.08);
  border-left-color: var(--accent-rgb, #ff6b6b);
  transform: translateX(4px);
}

.queue-item.drag-over {
  border-top: 3px solid var(--accent-rgb, #ff6b6b);
  background: rgba(var(--accent-color, 255, 107, 107), 0.1);
}

.drag-handle {
  color: rgba(255, 255, 255, 0.3);
  margin-right: 1rem;
  cursor: grab;
  display: flex;
  align-items: center;
}

.drag-handle:hover {
  color: var(--p5-white, #fff);
}

.song-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  overflow: hidden;
}

.song-number {
  font-family: 'Cingire', 'Space Grotesk', sans-serif;
  color: var(--accent-rgb, #ff6b6b);
  font-size: 1.2rem;
  font-weight: 900;
  width: 20px;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.5);
}

.song-cover {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.text-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.song-title {
  color: var(--p5-white, #fff);
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.9rem;
}

.song-artist {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.remove-btn {
  width: 32px;
  height: 32px;
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.remove-btn:hover {
  background: #ff4444;
  border-color: #ff4444;
  color: var(--p5-white, #fff);
  transform: translate(-1px, -1px);
  box-shadow: 2px 2px 0 var(--p5-white, #fff);
}

.empty-queue {
  padding: 3rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  font-family: 'Space Grotesk', sans-serif;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.empty-queue i {
  font-size: 3rem;
  color: var(--accent-rgb, #ff6b6b);
}

/* Scrollbar */
.queue-list::-webkit-scrollbar {
  width: 6px;
}

.queue-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
}

.queue-list::-webkit-scrollbar-thumb {
  background: var(--accent-rgb, #ff6b6b);
  border-radius: 0;
}
</style>