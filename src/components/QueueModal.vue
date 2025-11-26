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
.modal-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: #121212;
  width: 90%;
  max-width: 500px;
  max-height: 85vh;
  border: 2px solid #fff;
  display: flex;
  flex-direction: column;
  transform: skewX(-2deg);
  box-shadow: 8px 8px 0 rgba(255, 107, 107, 0.5);
  position: relative;
  margin: auto;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #1a1a1a;
}

.modal-title {
  font-family: 'Cingire', sans-serif;
  color: #fff;
  font-size: 1.5rem;
  margin: 0;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.close-btn {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #ff6b6b;
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
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 0.5rem;
  border: 1px solid transparent;
  transition: all 0.2s;
  cursor: grab;
}

.queue-item:active {
  cursor: grabbing;
}

.queue-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #ff6b6b;
}

.queue-item.drag-over {
  border-top: 2px solid #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
}

.drag-handle {
  color: #666;
  margin-right: 1rem;
  cursor: grab;
  display: flex;
  align-items: center;
}

.drag-handle:hover {
  color: #fff;
}

.song-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  overflow: hidden;
}

.song-number {
  font-family: 'Cingire', sans-serif;
  color: #ff6b6b;
  font-size: 1.2rem;
  width: 20px;
}

.song-cover {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border: 1px solid #fff;
}

.text-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.song-title {
  color: #fff;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  color: #aaa;
  font-size: 0.9rem;
}

.remove-btn {
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 0.5rem;
  transition: color 0.2s;
}

.remove-btn:hover {
  color: #ff6b6b;
}

.empty-queue {
  padding: 3rem;
  text-align: center;
  color: #666;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.empty-queue i {
  font-size: 3rem;
}
</style>