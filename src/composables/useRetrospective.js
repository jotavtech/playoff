import { ref, computed } from 'vue'

export function useRetrospective(allSongs) {
  const topSongsData = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const sourceUsed = ref('playoff') // 'spotify' ou 'playoff'

  // Mapeia tracks do Spotify para formato interno
  const mapSpotifyTrack = (track) => ({
    id: track.id,
    title: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    albumCover: track.album.images[0]?.url || '/default-album.jpg',
    votes: Math.floor(track.popularity / 10) // Simula "corações" baseado na popularidade (0-10)
  })

  const fetchWeeklyData = async () => {
    isLoading.value = true
    error.value = null
    topSongsData.value = []
    
    const token = localStorage.getItem('spotify_access_token')

    // Tenta buscar do Spotify se tiver token
    if (token) {
      try {
        console.log('📅 Buscando resumo semanal no Spotify (short_term)...')
        const response = await fetch('https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=7', {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.items && data.items.length > 0) {
            topSongsData.value = data.items.map(mapSpotifyTrack)
            sourceUsed.value = 'spotify'
            console.log('✅ Resumo semanal carregado do Spotify!')
            isLoading.value = false
            return
          }
        } else {
          console.warn('⚠️ Falha ao buscar top tracks do Spotify:', response.status)
        }
      } catch (e) {
        console.error('❌ Erro ao buscar dados do Spotify:', e)
      }
    }

    // Fallback: Usa dados do PlayOff (votos)
    console.log('🔄 Usando fallback: dados locais do PlayOff')
    if (allSongs.value && allSongs.value.length > 0) {
      topSongsData.value = [...allSongs.value]
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 7) // Top 7
      sourceUsed.value = 'playoff'
    } else {
      topSongsData.value = []
    }
    
    isLoading.value = false
  }

  // Simula "Descobertas" (músicas aleatórias ou menos votadas mas interessantes)
  const weeklyDiscoveries = computed(() => {
    if (!allSongs.value || allSongs.value.length < 8) return []
    // Pega músicas aleatórias que não estão no top 7
    const remaining = [...allSongs.value]
      .sort((a, b) => b.votes - a.votes)
      .slice(7)
    
    // Embaralha e pega 2
    return remaining.sort(() => 0.5 - Math.random()).slice(0, 2)
  })

  const downloadCard = async (elementId) => {
    if (!window.html2canvas) {
      console.error('html2canvas not loaded')
      return
    }

    const element = document.getElementById(elementId)
    if (!element) return

    try {
      // Cria o canvas com qualidade alta
      const canvas = await window.html2canvas(element, {
        scale: 2, // Retina display quality
        backgroundColor: '#050505', // Garante fundo preto
        logging: false,
        useCORS: true // Importante para imagens externas (capas)
      })

      // Download
      const link = document.createElement('a')
      link.download = `PlayOff-Resumo-Semana-${new Date().toISOString().slice(0,10)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Erro ao exportar ficha:', err)
    }
  }

  return {
    weeklyTopSongs: topSongsData,
    weeklyDiscoveries,
    fetchWeeklyData,
    isLoading,
    sourceUsed,
    downloadCard
  }
}
