import { ref } from 'vue'

const lyrics = ref([])
const plainLyrics = ref('')
const isLoadingLyrics = ref(false)
const errorLyrics = ref(null)
const currentLineIndex = ref(-1)

export function useLyrics() {
  
  const fetchLyrics = async (trackName, artistName, durationMs) => {
    if (!trackName || !artistName) return

    isLoadingLyrics.value = true
    errorLyrics.value = null
    lyrics.value = []
    plainLyrics.value = ''
    currentLineIndex.value = -1

    try {
      // Clean up names for better search results (remove (Remix), Feat., etc if needed)
      // specific to Lrclib optimization
      const cleanTrack = trackName.replace(/\(.*\)/g, '').trim()
      
      // First try strict match
      const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artistName)}&track_name=${encodeURIComponent(cleanTrack)}&duration=${durationMs / 1000}`
      
      let response = await fetch(url)
      let data

      if (!response.ok) {
        if (response.status === 404) {
            // Fallback: Try search API
            console.log('Lyrics strictly not found, trying search fallback...')
            const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(artistName + ' ' + cleanTrack)}`
            const searchResponse = await fetch(searchUrl)
            
            if (!searchResponse.ok) {
                throw new Error('Lyrics not found')
            }

            const searchData = await searchResponse.json()
            
            // Find best match based on duration
            if (Array.isArray(searchData) && searchData.length > 0) {
                const targetDuration = durationMs / 1000
                // Sort by duration difference to find closest match
                searchData.sort((a, b) => Math.abs(a.duration - targetDuration) - Math.abs(b.duration - targetDuration))
                data = searchData[0]
                console.log('Found lyrics via search fallback:', data.trackName)
            } else {
                throw new Error('Lyrics not found')
            }
        } else {
            throw new Error('Failed to fetch lyrics')
        }
      } else {
         data = await response.json()
      }
      
      if (data.syncedLyrics) {
        lyrics.value = parseLRC(data.syncedLyrics)
      } else if (data.plainLyrics) {
        plainLyrics.value = data.plainLyrics
        // Convert plain lyrics to array for display consistency
        lyrics.value = data.plainLyrics.split('\n').map(line => ({
          time: 0,
          text: line
        }))
      } else {
        throw new Error('No lyrics found')
      }

    } catch (e) {
      console.warn('Lyrics fetch error:', e)
      errorLyrics.value = e.message
    } finally {
      isLoadingLyrics.value = false
    }
  }

  const parseLRC = (lrc) => {
    const lines = lrc.split('\n')
    const result = []
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/

    lines.forEach(line => {
      const match = timeRegex.exec(line)
      if (match) {
        const minutes = parseInt(match[1])
        const seconds = parseInt(match[2])
        const milliseconds = parseInt(match[3].padEnd(3, '0'))
        const time = minutes * 60 + seconds + milliseconds / 1000
        const text = line.replace(timeRegex, '').trim()
        
        if (text) {
            result.push({ time, text })
        }
      }
    })

    return result
  }

  // Update active line based on current time
  const updateCurrentLine = (currentTime) => {
    if (!lyrics.value.length) return
    
    // Validação de segurança
    if (typeof currentTime !== 'number' || isNaN(currentTime)) {
        // console.warn('updateCurrentLine: currentTime inválido', currentTime)
        return
    }

    // Pequeno offset para antecipar visualmente a troca (0.3s)
    // Isso compensa o tempo de scroll e a percepção humana
    const syncTime = currentTime + 0.3

    // Find the last line that has started
    let index = -1
    for (let i = 0; i < lyrics.value.length; i++) {
      if (syncTime >= lyrics.value[i].time) {
        index = i
      } else {
        break
      }
    }
    
    // Debug esporádico (a cada 10s de música aprox)
    if (Math.floor(currentTime) % 10 === 0 && Math.random() < 0.1) {
        console.log(`Lyrics Sync: Time=${currentTime.toFixed(2)}s, Index=${index}/${lyrics.value.length}`)
    }
    
    // Apenas atualiza se mudou para evitar trigger desnecessário de watchers
    if (index !== -1 && currentLineIndex.value !== index) {
        currentLineIndex.value = index
        // console.log(`Line changed to ${index}: ${lyrics.value[index].text}`)
    }
  }

  return {
    lyrics,
    plainLyrics,
    isLoadingLyrics,
    errorLyrics,
    currentLineIndex,
    fetchLyrics,
    updateCurrentLine
  }
}
