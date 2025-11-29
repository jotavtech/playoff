<template>
  <div class="music-carousel">
    <!-- Title positioned at top left of first cover -->
    <div class="carousel-header">
      <div class="title-container">
        <h2 class="carousel-title">Biblioteca Musical</h2>
      </div>
    </div>

    <!-- Navigation Arrows -->
    <button class="nav-arrow nav-prev" @click="prevPage" :disabled="currentPage === 0">
      <i class="fas fa-chevron-left"></i>
    </button>
    <button class="nav-arrow nav-next" @click="nextPage" :disabled="currentPage >= maxPages">
      <i class="fas fa-chevron-right"></i>
    </button>

    <!-- Giant Diagonal Covers Container -->
    <div class="covers-container" ref="coversContainer" :class="{ 'lyrics-mode': isLyricsVisible }">
      <div 
        v-for="(song, index) in displayedSongs" 
        :key="song.id"
        class="cover-panel"
        :class="{ 
          'playing': currentTrack?.id === song.id,
          'panel-first': index === 0,
          'panel-last': index === displayedSongs.length - 1
        }"
        :style="getPanelStyle(song.id)"
        @click="handleSuperVote(song)"
      >
        <img 
          :src="getAlbumCover(song)" 
          :alt="song.title"
          class="cover-image"
          loading="lazy"
          decoding="async"
          @load="onImageLoad($event, song)"
          @error="handleImageError($event, song)"
          crossorigin="anonymous"
        />
        
        <!-- Overlay with info -->
        <div class="cover-overlay">
          <div class="cover-info">
            <h3 class="cover-title">{{ song.title }}</h3>
            <p class="cover-artist">{{ song.artist }}</p>
            <div class="cover-votes" v-if="song.votes > 0">
              <i class="fas fa-heart"></i> {{ song.votes }}
            </div>
          </div>
          
          <!-- Vote buttons -->
          <div class="cover-actions">
            <button @click.stop="handleVote(song)" class="vote-btn" :class="{ voted: hasVoted(song.id) }" title="Votar">
              <i class="fas fa-thumbs-up"></i>
            </button>
            <button 
              @click.stop="handleToggleLike(song)" 
              class="like-btn" 
              :class="{ liked: checkIfLiked(song) }" 
              :title="checkIfLiked(song) ? 'Descurtir' : 'Curtir'"
            >
              <i :class="checkIfLiked(song) ? 'fas fa-heart' : 'far fa-heart'"></i>
            </button>
            <button @click.stop="$emit('add-to-queue', song)" class="queue-btn" title="Adicionar à Fila">
              <i class="fas fa-list-ul"></i>
            </button>
            <button @click.stop="$emit('play-preview', song)" class="preview-btn" title="Preview (30s)">
              <i class="fas fa-headphones"></i>
            </button>
            <button @click.stop="handleSuperVote(song)" class="super-btn" title="Super Voto">
              <i class="fas fa-bolt"></i>
            </button>
            <button @click.stop="$emit('toggle-lyrics', song)" class="lyrics-btn" title="Letra">
              <span class="kanji-icon">水</span>
            </button>
          </div>
        </div>

        <!-- Lyrics Mode Play/Pause Button -->
        <button 
          v-if="isLyricsVisible && currentTrack?.id === song.id" 
          class="lyrics-play-btn" 
          @click.stop="$emit('play-song', song)"
          title="Pausar/Reproduzir"
        >
          <i class="fas" :class="isPlaying ? 'fa-pause' : 'fa-play'"></i>
        </button>

        <!-- Playing badge -->
        <div class="playing-badge" v-if="currentTrack?.id === song.id && isPlaying">
          <span>TOCANDO</span>
        </div>
      </div>
    </div>

    <!-- Page indicator -->
    <div class="page-indicator">
      {{ currentPage + 1 }} / {{ maxPages + 1 }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCloudinaryAudio } from '../composables/useCloudinaryAudio'

const { extractDominantColor } = useCloudinaryAudio()

// Props
const props = defineProps({
  songs: {
    type: Array,
    default: () => []
  },
  currentTrack: {
    type: Object,
    default: null
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  isLyricsVisible: {
    type: Boolean,
    default: false
  },
  // Função para verificar se música está curtida
  isLikedFn: {
    type: Function,
    default: () => false
  }
})

// Emits
const emit = defineEmits(['vote-for-song', 'super-vote', 'play-song', 'play-preview', 'add-to-queue', 'toggle-lyrics', 'toggle-like'])

// Verifica se a música está curtida
const checkIfLiked = (song) => {
  const songId = song.id || song.spotify_id
  return props.isLikedFn(songId)
}

// Handler para toggle like
const handleToggleLike = (song) => {
  emit('toggle-like', song)
}

// Refs
const coversContainer = ref(null)
const currentPage = ref(0)
const votedSongs = ref(new Set())
const coverColors = ref({}) // Armazena cores extraídas por ID da música

// Computed - Pagination: 4 songs per page for better display
const songsPerPage = 4

const maxPages = computed(() => {
  return Math.max(0, Math.ceil(props.songs.length / songsPerPage) - 1)
})

const displayedSongs = computed(() => {
  const start = currentPage.value * songsPerPage
  return props.songs.slice(start, start + songsPerPage)
})

// Helper to get album cover with fallback
const getAlbumCover = (song) => {
  if (!song.albumCover || song.albumCover === '' || song.albumCover === 'undefined') {
    return '/default-album.jpg'
  }
  return song.albumCover
}

// Color Extraction
const onImageLoad = async (event, song) => {
  try {
    // Extrai cor dominante da imagem carregada
    const result = await extractDominantColor(event.target.src)
    if (result && result.dominantColor) {
      const { r, g, b } = result.dominantColor
      coverColors.value[song.id] = `rgb(${r}, ${g}, ${b})`
    }
  } catch (e) {
    console.warn('Falha ao extrair cor:', e)
  }
}

const getPanelStyle = (songId) => {
  const color = coverColors.value[songId] || 'rgba(255, 255, 255, 0.5)'
  return {
    '--panel-color': color
  }
}

// Navigation methods
const nextPage = () => {
  if (currentPage.value < maxPages.value) {
    currentPage.value++
  }
}

const prevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--
  }
}

// Methods
const handleVote = (song) => {
  emit('vote-for-song', song)
  votedSongs.value.add(song.id)
}

const handleSuperVote = (song) => {
  emit('super-vote', song)
  votedSongs.value.add(song.id)
}

const hasVoted = (songId) => {
  return votedSongs.value.has(songId)
}

const handleImageError = async (event, song) => {
  console.warn(`⚠️ Erro ao carregar capa para "${song?.title || 'desconhecido'}":`, event.target.src)
  
  // Tenta buscar do Spotify antes de usar fallback
  if (!event.target.dataset.spotifyAttempted) {
    event.target.dataset.spotifyAttempted = 'true'
    
    try {
      const userToken = localStorage.getItem('spotify_access_token')
      if (userToken && song?.artist && song?.title) {
        console.log(`🔍 Tentando buscar capa do Spotify para ${song.title}...`)
        
        const cleanArtist = song.artist.replace(/[^\w\s]/gi, '').trim()
        const cleanTrack = song.title.replace(/[^\w\s]/gi, '').trim()
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
            // Atualiza o objeto da música também
            if (song) {
              song.albumCover = spotifyCover
            }
            return
          }
        }
      }
    } catch (err) {
      console.warn('Erro ao buscar capa do Spotify:', err)
    }
  }
  
  // Fallback para imagem padrão
  if (!event.target.src.includes('default-album.jpg')) {
    event.target.src = '/default-album.jpg'
  }
}

// Watch for songs list LENGTH changes to reset page (not deep changes like albumCover updates)
// Só reseta quando a quantidade de músicas muda, não quando propriedades internas mudam
watch(() => props.songs.length, (newLength, oldLength) => {
  // Só reseta se a lista cresceu significativamente ou diminuiu
  if (newLength !== oldLength) {
    // Se adicionou muitas músicas novas, volta para o início
    if (newLength > oldLength + 3) {
      currentPage.value = 0
    }
    // Se a página atual ficou inválida (removeram músicas), ajusta
    const maxPage = Math.max(0, Math.ceil(newLength / songsPerPage) - 1)
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage
    }
  }
})
</script>

<style scoped>
/* ============= GIANT DIAGONAL COVERS - PUNK 2000s ============= */

.music-carousel {
  width: 100%;
  margin: 0;
  padding: 0;
  position: relative;
  overflow: hidden;
}

/* Title positioned at top left corner */
.carousel-header {
  position: absolute;
  top: 2rem;
  left: 3rem;
  z-index: 100;
  text-align: left;
}

.title-container {
  display: inline-block;
  background: rgba(0, 0, 0, 0.9); /* Solid fallback */
  padding: 0.8rem 2rem;
  transform: skewX(-8deg);
  border: 3px solid rgba(255, 255, 255, 0.8);
  box-shadow: 
    4px 4px 0 rgba(255, 107, 107, 0.8); /* Removed heavy blur shadow */
}

@supports (backdrop-filter: blur(15px)) {
  @media (min-width: 769px) {
    .title-container {
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(15px);
      box-shadow: 
        4px 4px 0 rgba(255, 107, 107, 0.8),
        0 0 30px rgba(0, 0, 0, 0.6);
    }
  }
}

.carousel-title {
  font-family: 'Cingire', sans-serif;
  color: #fff;
  font-size: 2.5rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin: 0;
  transform: skewX(8deg);
  text-shadow: 3px 3px 0 var(--accent-rgb), 0 0 20px var(--glow-color);
  transition: text-shadow var(--color-transition);
}

/* Navigation Arrows */
.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  width: 70px;
  height: 70px;
  background: rgba(0, 0, 0, 0.8); /* Darker, no blur default */
  border: 3px solid #fff;
  color: #fff;
  font-size: 2rem;
  cursor: pointer;
  transition: transform 0.2s, background-color 0.2s; /* Optimized transitions */
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (min-width: 769px) {
  .nav-arrow {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
  }
}

.nav-prev { left: 2rem; }
.nav-next { right: 2rem; }

.nav-arrow:hover:not(:disabled) {
  background: var(--accent-rgb);
  border-color: var(--accent-rgb);
  transform: translateY(-50%) scale(1.1);
  transition: all 0.2s, background var(--color-transition), border-color var(--color-transition);
}

.nav-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Giant Covers Container */
.covers-container {
  display: flex;
  width: 100%;
  height: 70vh;
  min-height: 500px;
  position: relative;
  padding-left: 2rem;
  padding-right: 2rem;
}

/* Each Cover Panel - GIANT & DIAGONAL */
.cover-panel {
  flex: 1;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  /* Smoother transition curve */
  transition: flex 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  transform: skewX(-5deg);
  margin: 0 -10px;
  min-width: 0;
  /* will-change: flex; Removed to save memory */
  contain: layout style;
  
  /* Borda Punk Animada - Simplified */
  border: 4px solid var(--panel-color);
  box-shadow: 0 0 5px var(--panel-color); /* Reduced shadow */
}

/* Only animate border on desktop if performance allows */
@media (min-width: 769px) {
  .cover-panel {
     animation: borderPulse 3s infinite alternate;
     box-shadow: 0 0 15px var(--panel-color);
  }
}

@keyframes borderPulse {
  0% { 
    box-shadow: 0 0 10px var(--panel-color); 
    border-color: var(--panel-color);
  }
  50% { 
    box-shadow: 0 0 30px var(--panel-color), inset 0 0 20px var(--panel-color); 
    border-color: #fff; 
  }
  100% { 
    box-shadow: 0 0 10px var(--panel-color); 
    border-color: var(--panel-color);
  }
}

.cover-panel.panel-first {
  margin-left: 0;
}

.cover-panel.panel-last {
  margin-right: 0;
}

.cover-panel:hover {
  /* Reduced growth factor for smoother feel */
  flex: 1.25;
  z-index: 10;
  /* Slight scale for emphasis without breaking layout */
  transform: skewX(-5deg) scale(1.02);
}

.cover-panel.playing {
  flex: 1.3;
  z-index: 5;
}

/* Cover Image - Full size */
.cover-image {
  width: 140%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transform: skewX(5deg) scale(1.1);
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  filter: contrast(1.05) saturate(1.1);
  margin-left: -20%;
  will-change: transform;
}

.cover-panel:hover .cover-image {
  /* More subtle zoom */
  transform: skewX(5deg) scale(1.12);
  filter: contrast(1.1) saturate(1.2);
}

/* Overlay - always show info */
.cover-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4rem 2rem 2rem;
  background: linear-gradient(transparent, rgba(0,0,0,0.95));
  transform: skewX(5deg);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  opacity: 1;
  transition: opacity 0.3s;
}

.cover-panel:hover .cover-overlay {
  opacity: 1;
}

.cover-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding-left: 1rem;
}

.cover-title {
  font-family: 'Cingire', 'Impact', sans-serif;
  color: #fff;
  font-size: 1.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0;
  text-shadow: 2px 2px 0 #000;
  word-wrap: break-word;
  overflow-wrap: break-word;
  line-height: 1.2;
}

.cover-artist {
  font-family: 'Inter', sans-serif;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  margin: 0;
  text-shadow: 1px 1px 0 #000;
}

.cover-votes {
  font-family: 'Cingire', sans-serif;
  color: var(--accent-rgb);
  font-size: 1.2rem;
  transition: color var(--color-transition);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
  padding: 0.4rem 0.8rem;
  width: fit-content;
  border: 1px solid rgba(255,255,255,0.2);
  margin-top: 0.3rem;
}

/* Cover Action Buttons */
.cover-actions {
  display: flex;
  gap: 1rem;
  padding-left: 1rem;
  opacity: 0;
  transition: opacity 0.3s;
}

.cover-panel:hover .cover-actions {
  opacity: 1;
}

.vote-btn, .super-btn {
  width: 50px;
  height: 50px;
  background: transparent;
  border: 3px solid #fff;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vote-btn:hover, .vote-btn.voted {
  background: var(--accent-rgb);
  border-color: var(--accent-rgb);
  transform: translate(-2px, -2px);
  box-shadow: 2px 2px 0 #fff;
  transition: all 0.2s, background var(--color-transition), border-color var(--color-transition);
}

/* Botão de Curtir - Sincronizado com o player */
.like-btn {
  width: 50px;
  height: 50px;
  background: transparent;
  border: 3px solid var(--accent-medium);
  color: var(--accent-light);
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s, border-color var(--color-transition), color var(--color-transition);
  display: flex;
  align-items: center;
  justify-content: center;
}

.like-btn:hover {
  background: var(--accent-subtle);
  border-color: var(--accent-rgb);
  color: var(--accent-rgb);
  transform: translate(-2px, -2px);
  box-shadow: 2px 2px 0 #fff;
}

.like-btn.liked {
  background: var(--accent-rgb);
  border-color: var(--accent-rgb);
  color: #fff;
  animation: likeHeartPulse 0.4s ease;
}

.like-btn.liked:hover {
  background: var(--accent-dark-rgb);
  border-color: var(--accent-dark-rgb);
  box-shadow: 0 0 15px var(--glow-color);
}

@keyframes likeHeartPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.queue-btn {
  width: 50px;
  height: 50px;
  background: transparent;
  border: 3px solid #fff;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.queue-btn:hover {
  background: #1DB954;
  border-color: #1DB954;
  transform: translate(-2px, -2px);
  box-shadow: 2px 2px 0 #fff;
}

.preview-btn {
  width: 50px;
  height: 50px;
  background: transparent;
  border: 3px solid #fff;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-btn:hover {
  background: #9b59b6;
  border-color: #9b59b6;
  transform: translate(-2px, -2px);
  box-shadow: 2px 2px 0 #fff;
}

.super-btn {
  background: #ffd700;
  border-color: #ffd700;
  color: #000;
}

.super-btn:hover {
  background: #fff;
  transform: translate(-2px, -2px);
  box-shadow: 2px 2px 0 #ffd700;
}

.lyrics-btn {
  width: 50px;
  height: 50px;
  background: var(--accent-rgb);
  border: 3px solid var(--accent-rgb);
  color: #fff;
  font-size: 1.4rem;
  cursor: pointer;
  transition: all 0.2s, background var(--color-transition), border-color var(--color-transition);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Noto Sans JP', sans-serif; /* Ensure font supports Kanji if possible, or fallback */
}

.lyrics-btn:hover {
  background: #fff;
  color: var(--accent-rgb);
  transform: translate(-2px, -2px);
  box-shadow: 2px 2px 0 var(--accent-rgb);
}

.lyrics-play-btn {
  position: absolute;
  right: -30px; /* Protrude from the card */
  top: 50%;
  transform: translateY(-50%);
  width: 70px;
  height: 70px;
  background: var(--accent-rgb);
  border: 4px solid #fff;
  transition: all 0.3s, background var(--color-transition);
  border-radius: 50%;
  color: #fff;
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  box-shadow: 4px 4px 0 rgba(0,0,0,0.5);
  transition: all 0.2s;
}

.lyrics-play-btn:hover {
  transform: translateY(-50%) scale(1.1);
  background: #fff;
  color: var(--accent-rgb);
  box-shadow: 0 0 20px var(--glow-color);
}

.kanji-icon {
  font-weight: bold;
  line-height: 1;
}

/* Lyrics Mode - Shrink Effect */
.covers-container.lyrics-mode .cover-panel {
  transform: skewX(-5deg) scale(0.7) translateY(10%) !important;
  opacity: 0.4;
  filter: grayscale(0.8);
}

.covers-container.lyrics-mode .cover-panel.playing {
  transform: skewX(-5deg) scale(0.75) translateY(10%) !important;
  opacity: 1; /* Keep playing song visible */
  filter: none;
  z-index: 20;
}

/* Playing Badge - Blurred */
.playing-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) skewX(5deg);
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  padding: 1rem 2rem;
  border: 3px solid #fff;
  z-index: 20;
  animation: badgePulse 2s infinite;
}

.playing-badge span {
  font-family: 'Cingire', 'Impact', sans-serif;
  color: #fff;
  font-size: 1.5rem;
  letter-spacing: 0.3em;
}

@keyframes badgePulse {
  0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.3); }
  50% { box-shadow: 0 0 40px rgba(255,255,255,0.6); }
}

/* Page Indicator */
.page-indicator {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Cingire', sans-serif;
  color: #fff;
  font-size: 1.2rem;
  letter-spacing: 0.2em;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(10px);
  padding: 0.5rem 1.5rem;
  border: 2px solid #fff;
  z-index: 100;
}

  /* Mobile Optimizations */
  @media (max-width: 768px) {
    .music-carousel {
      overflow: visible;
      padding: 0;
    }

    .carousel-header {
      position: absolute;
      top: 1rem;
      left: 1rem;
      padding: 0;
      margin-bottom: 0;
      z-index: 10;
    }

    .title-container {
      transform: skewX(-8deg);
      padding: 0.5rem 1rem;
      border-width: 2px;
      box-shadow: 2px 2px 0 rgba(255, 107, 107, 0.8);
    }

    .carousel-title {
      font-size: 1.5rem;
      transform: skewX(8deg);
    }

    .nav-arrow {
      display: flex; /* Show arrows on mobile */
      width: 50px;
      height: 50px;
      font-size: 1.5rem;
      top: 50%;
      transform: translateY(-50%);
      z-index: 100;
    }
    
    .nav-prev { left: 0.5rem; }
    .nav-next { right: 0.5rem; }

    .covers-container {
      flex-direction: column !important;
      height: auto !important;
      min-height: 600px !important; /* Ensure enough space for stacked cards */
      padding: 4rem 3.5rem 2rem !important; /* Space for header and arrows */
      gap: 15px !important; /* Aumentado gap para separar melhor */
    }

    .cover-panel {
      transform: skewX(-5deg) !important;
      margin: 0 !important; /* No negative margin, no overlap */
      height: 240px; /* Aumentado de 160px para 240px */
      min-height: 240px;
      border-width: 2px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5) !important;
      animation: none !important;
      flex: none !important;
      width: 100% !important;
      border-radius: 0; /* Sharper edges for punk feel */
      overflow: hidden;
      transition: transform 0.3s ease;
    }
    
    /* First and last adjustments */
    .cover-panel.panel-first { margin-top: 0 !important; }
    .cover-panel.panel-last { margin-bottom: 0 !important; }
    
    .cover-image {
      transform: skewX(5deg) scale(1.1) !important;
      width: 120%;
      height: 100%;
      margin-left: -10%;
      filter: contrast(1.05) saturate(1.1);
    }
    
    .cover-overlay {
      transform: skewX(5deg) !important;
      /* Gradiente mais forte para garantir leitura do texto */
      background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, transparent 100%);
      padding: 1rem;
      justify-content: flex-end;
      display: flex !important; /* Força display flex */
      opacity: 1 !important; /* Sempre visível no mobile */
    }

    .cover-info {
      padding-left: 0;
      margin-bottom: 0.5rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8); /* Sombra forte para contraste */
    }

    .cover-title {
      font-size: 1.4rem; /* Aumentado */
      letter-spacing: 0.05em;
      text-shadow: 2px 2px 0 #000;
      display: block !important; /* Garante visibilidade */
      white-space: normal; /* Permite quebra de linha */
    }

    .cover-artist {
      font-size: 1.1rem; /* Aumentado */
      text-shadow: 1px 1px 0 #000;
      color: rgba(255, 255, 255, 0.9);
      display: block !important;
    }

    .cover-votes {
      font-size: 0.9rem;
      padding: 0.2rem 0.5rem;
      margin-top: 0.2rem;
    }

    .cover-actions {
      opacity: 1; /* Always visible on mobile */
      padding-left: 0;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .vote-btn, .super-btn, .queue-btn, .preview-btn, .lyrics-btn {
      width: 36px;
      height: 36px;
      font-size: 0.9rem;
      border-width: 2px;
    }

    .playing-badge {
      transform: translate(-50%, -50%) skewX(5deg) !important;
      backdrop-filter: none !important;
      background: rgba(0,0,0,0.9);
      box-shadow: none !important;
      animation: none !important;
      padding: 0.4rem 0.8rem;
      border-width: 2px;
    }

    .playing-badge span {
      font-size: 0.9rem;
      letter-spacing: 0.15em;
    }

    /* Active/Playing state on mobile */
    .cover-panel.playing {
      transform: skewX(-5deg) scale(1.05) !important;
      z-index: 10;
      box-shadow: 0 0 15px var(--panel-color) !important;
      border-color: #fff !important;
      margin: 0 !important; /* Keep spacing consistent */
    }

    .page-indicator {
      display: none;
    }

    .lyrics-play-btn {
      right: 5px;
      width: 45px;
      height: 45px;
      font-size: 1.2rem;
      border-width: 3px;
    }

    /* Lyrics Mode Mobile */
    .covers-container.lyrics-mode .cover-panel {
      transform: skewX(-5deg) scale(0.95) !important;
      height: 80px;
      min-height: 80px;
      opacity: 0.3;
      filter: grayscale(1);
      margin: 0 !important;
    }

    .covers-container.lyrics-mode .cover-panel.playing {
      transform: skewX(-5deg) scale(1.05) !important;
      height: 140px;
      min-height: 140px;
      opacity: 1;
      filter: none;
      z-index: 20;
      margin: 0 !important;
    }
  }
</style> 