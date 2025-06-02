<template>
  <div class="app">
    <!-- Background Elements -->
    <div class="background-overlay"></div>
    <div class="dynamic-background" :class="{ active: currentTrack }"></div>
    
    <!-- Notifications -->
    <NotificationContainer :notifications="notifications" />
    
    <div class="container">
      <!-- Main Content -->
      <div class="main-content">
        <!-- Hero Section -->
        <HeroSection 
          :current-track="currentTrack"
          :is-playing="isPlaying"
          :position="position"
          :duration="duration"
          :format-time="formatTime"
          @toggle-playback="togglePlayback"
          @previous-track="handlePreviousTrack"
          @next-track="handleNextTrack"
        />

        <!-- Music Carousel -->
        <MusicCarousel 
          :songs="sortedSongs"
          :current-track="currentTrack"
          :is-playing="isPlaying"
          @vote-for-song="handleVoteAndPlay"
          @super-vote="handleSuperVote"
          @play-song="handlePlaySong"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { useCloudinaryAudio } from './composables/useCloudinaryAudio'
import { usePlayOffApp } from './composables/usePlayOffApp'
import HeroSection from './components/HeroSection.vue'
import MusicCarousel from './components/MusicCarousel.vue'
import NotificationContainer from './components/NotificationContainer.vue'

// Composables
const {
  currentTrack,
  isPlaying,
  position,
  duration,
  initializePlayer,
  playSong,
  togglePlayback,
  previousTrack,
  nextTrack,
  formatTime,
  updateSongsList
} = useCloudinaryAudio()

const {
  songs,
  sortedSongs,
  notifications,
  voteForSong,
  superVote,
  showNotification,
  initializeData,
  startUpdateLoops,
  refreshSongs
} = usePlayOffApp()

// Check and auto-play highest voted song
const checkAndPlayHighestVoted = async () => {
  if (sortedSongs.value.length === 0) return
  
  const highestVoted = sortedSongs.value[0]
  
  // Only auto-play if it's different from current track and has votes
  if (highestVoted.votes > 0 && (!currentTrack.value || currentTrack.value.id !== highestVoted.id)) {
    console.log(`🏆 Auto-playing highest voted song: ${highestVoted.title} (${highestVoted.votes} votes)`)
    await handlePlaySong(highestVoted)
  }
}

// Handle vote and play
const handleVoteAndPlay = async (songId) => {
  const votedSong = await voteForSong(songId)
  if (votedSong) {
    // Check if this song should now auto-play as highest voted
    setTimeout(() => checkAndPlayHighestVoted(), 500) // Small delay to ensure vote is processed
  }
}

// Handle super vote (vote + immediate play)
const handleSuperVote = async (song) => {
  try {
    console.log('⚡ Super voto para:', song.title)
    
    // Super vote for the song (pass current track for reference)
    await superVote(song.id, currentTrack.value)
    
    // Then play immediately
    await handlePlaySong(song)
    
    showNotification(`⚡ Super Voto! Tocando: ${song.title}`, 'success')
  } catch (error) {
    console.error('❌ Erro no super voto:', error)
    showNotification('Erro no super voto', 'error')
  }
}

// Handle play song
const handlePlaySong = async (song) => {
  try {
    console.log('🎵 App.vue: handlePlaySong chamado para:', song.title, 'por', song.artist)
    console.log('🎨 App.vue: Capa antes do playSong:', song.albumCover)
    
    await playSong(song)
    
    console.log('🎵 App.vue: playSong concluído')
    console.log('🎨 App.vue: Capa depois do playSong:', song.albumCover)
    console.log('📊 App.vue: currentTrack atual:', currentTrack.value)
    
    showNotification(`🎵 Tocando: ${song.title}`, 'success')
  } catch (error) {
    console.error('❌ Erro ao tocar música:', error)
    showNotification('Erro ao reproduzir música', 'error')
  }
}

// Listen for album color extraction events
const handleAlbumColorExtracted = (event) => {
  const colorInfo = event.detail
  console.log('🎨 Cores do álbum detectadas:', colorInfo)
  
  // You can add additional color-based UI changes here
  // For example, updating player card theme
  const playerCard = document.querySelector('.player-card')
  if (playerCard && colorInfo.theme) {
    const themes = ['theme-warm', 'theme-cool', 'theme-vibrant', 'theme-neutral']
    themes.forEach(t => playerCard.classList.remove(t))
    playerCard.classList.add(`theme-${colorInfo.theme}`)
  }
}

// Watch for track changes to update background and theme
watch(currentTrack, async (newTrack, oldTrack) => {
  console.log('🎵 APP: Track mudou!')
  console.log('📊 APP: Track anterior:', oldTrack?.title || 'nenhuma')
  console.log('📊 APP: Track atual:', newTrack?.title || 'nenhuma')
  
  if (newTrack && newTrack.albumCover) {
    console.log('🎨 APP: Aplicando background dinâmico...')
    await updateDynamicBackground(newTrack.albumCover)
    
    // Extract colors and apply theme
    try {
      const dominantColor = await extractDominantColor(newTrack.albumCover)
      if (dominantColor) {
        const theme = getThemeFromRGB(dominantColor.r, dominantColor.g, dominantColor.b)
        applyDynamicTheme(theme)
      }
    } catch (error) {
      console.error('❌ Erro ao extrair cor dominante:', error)
    }
  } else {
    console.log('🎨 APP: Nenhuma música tocando - aplicando tema preto')
    // Apply black theme when no music is playing
    applyDynamicTheme()
  }
}, { deep: true, immediate: true })

// Watch for vote changes to trigger auto-play
watch(sortedSongs, (newSongs, oldSongs) => {
  // Only trigger auto-play if songs list has changed and we have songs
  if (newSongs.length > 0 && newSongs !== oldSongs) {
    // Small delay to ensure the vote counting is complete
    setTimeout(() => checkAndPlayHighestVoted(), 1000)
  }
}, { deep: true })

// Watch for sorted songs changes to update player navigation
watch(sortedSongs, (newSongs) => {
  if (newSongs && newSongs.length > 0) {
    updateSongsList(newSongs)
  }
}, { deep: true, immediate: true })

// Handle previous track with songs list
const handlePreviousTrack = async () => {
  try {
    await previousTrack(sortedSongs.value)
  } catch (error) {
    console.error('❌ Erro ao ir para música anterior:', error)
    showNotification('Erro ao navegar para música anterior', 'error')
  }
}

// Handle next track with songs list
const handleNextTrack = async () => {
  try {
    await nextTrack(sortedSongs.value)
  } catch (error) {
    console.error('❌ Erro ao ir para próxima música:', error)
    showNotification('Erro ao navegar para próxima música', 'error')
  }
}

onMounted(async () => {
  console.log('🚀 Initializing PlayOff Vue Application...')
  
  try {
    await initializePlayer()
    await initializeData()
    startUpdateLoops()
    
    // Listen for color extraction events
    window.addEventListener('albumColorExtracted', handleAlbumColorExtracted)
    
    console.log('✅ PlayOff Vue App inicializado com sucesso!')
    
    // Check for initial auto-play
    setTimeout(() => checkAndPlayHighestVoted(), 2000)
    
  } catch (error) {
    console.error('❌ Erro ao inicializar app:', error)
    showNotification('Erro ao inicializar aplicação', 'error')
  }
})

onUnmounted(() => {
  // Clean up event listeners
  window.removeEventListener('albumColorExtracted', handleAlbumColorExtracted)
})
</script>

<style scoped>
.app {
  width: 100%;
  min-height: 100vh;
  position: relative;
}

.container {
  width: 100%;
  min-height: 100vh;
  position: relative;
  z-index: 2;
}

.main-content {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style> 