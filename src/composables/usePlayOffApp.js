import { ref, computed, onMounted } from 'vue'

export function usePlayOffApp() {
  // State
  const songs = ref([])
  const isOnline = ref(true)
  const notifications = ref([])
  
  // API base URL
  const apiBaseUrl = '/api'
  
  // Computed
  const sortedSongs = computed(() => {
    return [...songs.value].sort((a, b) => b.votes - a.votes)
  })
  
  // Load songs from backend
  const loadSongsFromBackend = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/songs`)
      if (response.ok) {
        const data = await response.json()
        songs.value = data.songs || []
        console.log('✅ Músicas carregadas do backend')
        return true
      }
    } catch (error) {
      console.log('Backend offline, usando dados demo')
      throw error
    }
  }
  
  // Load demo data
  const loadDemoData = () => {
    songs.value = [
      {
        id: 'audioslave-cochise',
        title: 'Cochise',
        artist: 'Audioslave',
        audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748878548/Audioslave_-_Cochise_HD_YymwGlbqzIc_lz8zjk.mp3',
        albumCover: 'https://upload.wikimedia.org/wikipedia/en/b/b8/Audioslave_-_Audioslave.jpg',
        album: 'Audioslave',
        votes: 5
      },
      {
        id: 'deftones-change',
        title: 'Change (In the House of Flies)',
        artist: 'Deftones',
        audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748879300/Deftones_-_Change_In_The_House_Of_Flies_oSDNIINcK08_ejs6hn.mp3',
        albumCover: 'https://upload.wikimedia.org/wikipedia/en/6/68/Deftones_-_White_Pony.jpg',
        album: 'White Pony',
        votes: 8
      },
      {
        id: 'qotsa-bronze',
        title: 'The Bronze',
        artist: 'Queens of the Stone Age',
        audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748879302/Queens_Of_The_Stone_Age_The_Bronze_P3kM58n2ceE_x9m9kx.mp3',
        albumCover: 'https://upload.wikimedia.org/wikipedia/en/5/5d/Queens_of_the_Stone_Age_%28Queens_of_the_Stone_Age_album_-_cover_art%29.jpg',
        album: 'Queens of the Stone Age',
        votes: 3
      },
      {
        id: 'deftones-my-own-summer',
        title: 'My Own Summer (Shove It)',
        artist: 'Deftones',
        audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748879303/Deftones_-_My_Own_Summer_vLjOwAPzt4o_xdemns.mp3',
        albumCover: 'https://upload.wikimedia.org/wikipedia/en/a/a3/Deftones_-_Around_the_Fur.jpg',
        album: 'Around the Fur',
        votes: 6
      }
    ]
    
    console.log('📀 Loaded sample songs with album covers')
  }
  
  // Submit vote to backend
  const submitVoteToBackend = async (songId, votes) => {
    if (!isOnline.value) return
    
    try {
      const response = await fetch(`${apiBaseUrl}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songId: songId,
          votes: votes
        }),
      })
      
      if (response.ok) {
        console.log('✅ Voto enviado para o backend')
        return true
      }
    } catch (error) {
      console.error('❌ Erro ao enviar voto:', error)
      return false
    }
  }
  
  // Vote for song
  const voteForSong = async (songId) => {
    try {
      console.log(`🗳️ Votando na música ID: ${songId}`)
      
      const song = songs.value.find(s => s.id === songId)
      if (!song) {
        console.error('❌ Música não encontrada:', songId)
        return null
      }
      
      // Increment votes locally
      song.votes = (song.votes || 0) + 1
      
      // Submit vote to backend
      await submitVoteToBackend(songId, song.votes)
      
      showNotification(`🗳️ Votou em "${song.title}"!`, 'success')
      
      return song
    } catch (error) {
      console.error('❌ Erro ao votar:', error)
      showNotification('Erro ao votar na música', 'error')
      return null
    }
  }
  
  // Super vote for song - adds enough votes to surpass current highest
  const superVote = async (songId, currentPlayingSong = null) => {
    try {
      console.log(`⚡ Super voto na música ID: ${songId}`)
      
      const song = songs.value.find(s => s.id === songId)
      if (!song) {
        console.error('❌ Música não encontrada:', songId)
        return null
      }
      
      // Find the highest voted song (excluding the song we're super voting)
      let highestVotes = 0
      
      // If there's a current playing song, use its votes as reference
      if (currentPlayingSong && currentPlayingSong.id !== songId) {
        highestVotes = currentPlayingSong.votes || 0
      } else {
        // Otherwise, find the highest voted song
        const otherSongs = songs.value.filter(s => s.id !== songId)
        if (otherSongs.length > 0) {
          highestVotes = Math.max(...otherSongs.map(s => s.votes || 0))
        }
      }
      
      // Calculate votes needed to surpass the highest (at least 1 more vote)
      const votesNeeded = Math.max(1, (highestVotes + 1) - (song.votes || 0))
      
      console.log(`⚡ Super voto: Música atual tem ${song.votes || 0} votos`)
      console.log(`⚡ Super voto: Maior número de votos atual: ${highestVotes}`)
      console.log(`⚡ Super voto: Adicionando ${votesNeeded} votos`)
      
      // Update votes locally
      song.votes = (song.votes || 0) + votesNeeded
      
      // Submit super vote to backend
      await submitSuperVoteToBackend(songId, song.votes, votesNeeded)
      
      showNotification(`⚡ Super Voto! "${song.title}" agora tem ${song.votes} votos!`, 'success')
      
      return song
    } catch (error) {
      console.error('❌ Erro no super voto:', error)
      showNotification('Erro no super voto', 'error')
      return null
    }
  }
  
  // Submit super vote to backend
  const submitSuperVoteToBackend = async (songId, totalVotes, votesAdded) => {
    if (!isOnline.value) return
    
    try {
      const response = await fetch(`${apiBaseUrl}/super-vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songId: songId,
          totalVotes: totalVotes,
          votesAdded: votesAdded
        }),
      })
      
      if (response.ok) {
        console.log('✅ Super voto enviado para o backend')
        return true
      }
    } catch (error) {
      console.error('❌ Erro ao enviar super voto:', error)
      return false
    }
  }
  
  // Show notification
  const showNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type
    }
    
    notifications.value.push(notification)
    
    // Remove after 3 seconds
    setTimeout(() => {
      const index = notifications.value.findIndex(n => n.id === notification.id)
      if (index > -1) {
        notifications.value.splice(index, 1)
      }
    }, 3000)
    
    console.log(`📢 ${type.toUpperCase()}: ${message}`)
  }

  // Initialize app data
  const initializeData = async () => {
    try {
      await loadSongsFromBackend()
      isOnline.value = true
    } catch (error) {
      console.log('🔌 Backend não disponível, usando dados demo')
      loadDemoData()
      isOnline.value = false
    }
  }
  
  // Start update loops (reduced frequency)
  const startUpdateLoops = () => {
    // Update songs every 15 seconds (was 5)
    setInterval(async () => {
      if (isOnline.value) {
        try {
          await refreshSongs()
        } catch (error) {
          console.log('Erro ao atualizar músicas')
        }
      }
    }, 15000)
  }
  
  // Add debounced update for songs
  let songsUpdateTimeout = null
  const debouncedUpdateSongs = () => {
    if (songsUpdateTimeout) clearTimeout(songsUpdateTimeout)
    songsUpdateTimeout = setTimeout(async () => {
      try {
        await refreshSongs()
      } catch (error) {
        console.log('Erro na atualização debounced das músicas')
      }
    }, 1000)
  }
  
  // Refresh songs from backend
  const refreshSongs = async () => {
    if (!isOnline.value) return
    
    try {
      const response = await fetch(`${apiBaseUrl}/songs`)
      if (response.ok) {
        const data = await response.json()
        const newSongs = data.songs || []
        
        // Only update if songs have actually changed
        const songsChanged = JSON.stringify(songs.value) !== JSON.stringify(newSongs)
        if (songsChanged) {
          songs.value = newSongs
          console.log('🔄 Músicas atualizadas')
        }
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar músicas:', error)
      isOnline.value = false
    }
  }
  
  return {
    songs,
    sortedSongs,
    notifications,
    isOnline,
    voteForSong,
    superVote,
    showNotification,
    initializeData,
    startUpdateLoops,
    refreshSongs
  }
} 