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
      
      const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artistName)}&track_name=${encodeURIComponent(cleanTrack)}&duration=${durationMs / 1000}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Lyrics not found')
        }
        throw new Error('Failed to fetch lyrics')
      }

      const data = await response.json()
      
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

    // Find the last line that has started
    let index = -1
    for (let i = 0; i < lyrics.value.length; i++) {
      if (currentTime >= lyrics.value[i].time) {
        index = i
      } else {
        break
      }
    }
    
    if (index !== -1) {
        currentLineIndex.value = index
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
