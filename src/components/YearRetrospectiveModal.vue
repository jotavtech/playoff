<template>
  <div class="retro-overlay" @click.self="closeRetrospective">
    <!-- Loading State - ROCK STYLE -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-guitar">
        <i class="fas fa-guitar"></i>
      </div>
      <div class="loading-flames">
        <span class="flame">🔥</span>
        <span class="flame">🔥</span>
        <span class="flame">🔥</span>
      </div>
      <p class="loading-text">PREPARANDO O SHOW...</p>
      <div class="loading-bar">
        <div class="loading-fill"></div>
      </div>
      <p class="loading-subtext">Buscando suas músicas do Spotify</p>
    </div>

    <!-- Main Content -->
    <div v-else class="retro-container" :class="{ 'shake': isShaking }">
      <!-- Punk Decorations -->
      <div class="punk-tape top-left"></div>
      <div class="punk-tape top-right"></div>
      <div class="punk-tape bottom-left"></div>
      <div class="punk-tape bottom-right"></div>
      
      <!-- Navigation Dots (Punk Style) -->
      <div class="navigation-dots">
        <div
          v-for="(slide, index) in totalSlides"
          :key="index"
          class="dot"
          :class="{ active: currentSlide === index }"
          @click="goToSlide(index)"
        >
          <span v-if="currentSlide === index">×</span>
        </div>
      </div>

      <!-- Close Button (X Punk) -->
      <button class="retro-close" @click="closeRetrospective">
        <span class="close-x">×</span>
      </button>

      <!-- Slides -->
      <transition name="punk-slide" mode="out-in">
        <!-- Slide 1: Intro BRUTAL -->
        <div v-if="currentSlide === 0" key="slide-0" class="retro-slide intro-slide">
          <!-- Sparks Animation -->
          <div class="sparks-container">
            <span class="spark" v-for="n in 12" :key="n" :style="{ '--delay': n * 0.2 + 's', '--x': (Math.random() * 100) + '%' }">✦</span>
          </div>
          
          <div class="glitch-container">
            <h1 class="retro-year glitch" data-text="2025">2025</h1>
            <div class="year-scratch"></div>
            <div class="fire-effect">🔥</div>
          </div>
          <h2 class="retro-subtitle">
            <span class="strike">SEU ANO</span> EM <span class="highlight">ROCK</span>
          </h2>
          <div class="skull-divider">
            <i class="fas fa-guitar"></i>
            <span class="divider-line"></span>
            <i class="fas fa-fire-alt"></i>
            <span class="divider-line"></span>
            <i class="fas fa-guitar"></i>
          </div>
          <div class="intro-stats">
            <div class="big-stat">
              <span class="stat-value">{{ formatNumber(stats.totalMinutes) }}</span>
              <span class="stat-label">MINUTOS DE CAOS</span>
            </div>
            <p class="stat-comparison" v-if="stats.totalMinutes > 0">
              Isso é mais que {{ Math.floor(stats.totalMinutes / 60 / 24) }} dias sem parar
            </p>
          </div>
          <button class="next-btn punk-btn" @click="nextSlide">
            <span>BORA</span>
            <i class="fas fa-arrow-right"></i>
          </button>
        </div>

        <!-- Slide 2: Top 5 Songs - RANKING BRUTAL -->
        <div v-else-if="currentSlide === 1" key="slide-1" class="retro-slide songs-slide">
          <h2 class="slide-title punk-title">
            <span class="title-icon">🔥</span>
            TOP 5 HINOS
          </h2>
          <p class="slide-subtitle">As músicas que você destruiu o repeat</p>

          <div class="songs-list-punk">
            <div
              v-for="(song, index) in topSongs.slice(0, 5)"
              :key="song.id"
              class="song-item-punk"
              :class="`rank-${index + 1}`"
              :style="{ animationDelay: `${index * 0.15}s` }"
            >
              <div class="rank-number" :class="{ 'gold': index === 0, 'silver': index === 1, 'bronze': index === 2 }">
                {{ index + 1 }}
              </div>
              <div class="song-cover-punk">
                <img :src="song.albumCover" :alt="song.title" />
                <div class="cover-overlay">
                  <i class="fas fa-play"></i>
                </div>
              </div>
              <div class="song-info-punk">
                <h3 class="song-title">{{ song.title }}</h3>
                <p class="song-artist">{{ song.artist }}</p>
              </div>
              <div class="song-stats-punk">
                <span class="play-count">~{{ song.playCount }} plays</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Slide 3: Top Artists - SEUS ÍDOLOS -->
        <div v-else-if="currentSlide === 2" key="slide-2" class="retro-slide artists-slide">
          <h2 class="slide-title punk-title">
            <span class="title-icon">⚡</span>
            SEUS ÍDOLOS
          </h2>
          <p class="slide-subtitle">Os artistas que dominaram seu ano</p>

          <!-- Top 1 Artist Feature -->
          <div v-if="topArtists.length > 0" class="top-artist-feature">
            <div class="feature-badge">#1 ARTISTA</div>
            <div class="feature-avatar">
              <img v-if="topArtists[0].image" :src="topArtists[0].image" :alt="topArtists[0].name" />
              <div v-else class="avatar-fallback">{{ getInitials(topArtists[0].name) }}</div>
            </div>
            <h3 class="feature-name">{{ topArtists[0].name }}</h3>
            <p class="feature-count">{{ topArtists[0].count }} músicas no seu top</p>
          </div>

          <div class="artists-grid-punk">
            <div
              v-for="(artist, index) in topArtists.slice(1, 6)"
              :key="artist.name"
              class="artist-card-punk"
              :style="{ animationDelay: `${index * 0.1}s` }"
            >
              <div class="artist-rank-badge">{{ index + 2 }}</div>
              <div class="artist-avatar-punk">
                <img v-if="artist.image" :src="artist.image" :alt="artist.name" />
                <div v-else class="avatar-initials">{{ getInitials(artist.name) }}</div>
              </div>
              <h4 class="artist-name-punk">{{ artist.name }}</h4>
              <span class="artist-count-punk">{{ artist.count }} tracks</span>
            </div>
          </div>
        </div>

        <!-- Slide 4: Genres - SUA IDENTIDADE SONORA -->
        <div v-else-if="currentSlide === 3" key="slide-3" class="retro-slide genres-slide">
          <h2 class="slide-title punk-title">
            <span class="title-icon">🎸</span>
            SUA IDENTIDADE
          </h2>
          <p class="slide-subtitle">Os gêneros que definem você</p>

          <div class="genres-container-punk">
            <div
              v-for="(genre, index) in topGenres.slice(0, 5)"
              :key="genre.name"
              class="genre-item-punk"
              :style="{ animationDelay: `${index * 0.12}s` }"
            >
              <div class="genre-header">
                <span class="genre-rank">#{{ index + 1 }}</span>
                <span class="genre-name-punk">{{ genre.name }}</span>
                <span class="genre-percent-punk">{{ genre.percentage }}%</span>
              </div>
              <div class="genre-bar-punk">
                <div 
                  class="genre-fill-punk" 
                  :style="{ width: genre.percentage + '%' }"
                  :class="getGenreClass(index)"
                ></div>
              </div>
            </div>
          </div>

          <div class="genre-personality" v-if="topGenres.length > 0">
            <div class="personality-badge">
              <i class="fas fa-fingerprint"></i>
              <span>{{ getPersonalityType() }}</span>
            </div>
          </div>
        </div>

        <!-- Slide 5: Audio Features - SEU DNA MUSICAL -->
        <div v-else-if="currentSlide === 4" key="slide-4" class="retro-slide dna-slide">
          <h2 class="slide-title punk-title">
            <span class="title-icon">🧬</span>
            SEU DNA MUSICAL
          </h2>
          <p class="slide-subtitle">A análise das suas músicas</p>

          <div class="dna-grid">
            <div class="dna-stat" :class="{ 'high': stats.energy > 70 }">
              <div class="dna-icon">⚡</div>
              <div class="dna-bar-container">
                <div class="dna-bar" :style="{ height: stats.energy + '%' }"></div>
              </div>
              <div class="dna-value">{{ stats.energy }}%</div>
              <div class="dna-label">ENERGIA</div>
              <div class="dna-desc">{{ getEnergyDesc() }}</div>
            </div>

            <div class="dna-stat" :class="{ 'high': stats.valence > 50 }">
              <div class="dna-icon">{{ stats.valence > 50 ? '😈' : '🖤' }}</div>
              <div class="dna-bar-container">
                <div class="dna-bar valence" :style="{ height: stats.valence + '%' }"></div>
              </div>
              <div class="dna-value">{{ stats.valence }}%</div>
              <div class="dna-label">MOOD</div>
              <div class="dna-desc">{{ getValenceDesc() }}</div>
            </div>

            <div class="dna-stat" :class="{ 'high': stats.danceability > 60 }">
              <div class="dna-icon">🕺</div>
              <div class="dna-bar-container">
                <div class="dna-bar dance" :style="{ height: stats.danceability + '%' }"></div>
              </div>
              <div class="dna-value">{{ stats.danceability }}%</div>
              <div class="dna-label">DANÇA</div>
              <div class="dna-desc">{{ getDanceDesc() }}</div>
            </div>

            <div class="dna-stat" :class="{ 'high': stats.acousticness > 40 }">
              <div class="dna-icon">🎸</div>
              <div class="dna-bar-container">
                <div class="dna-bar acoustic" :style="{ height: stats.acousticness + '%' }"></div>
              </div>
              <div class="dna-value">{{ stats.acousticness }}%</div>
              <div class="dna-label">ACÚSTICO</div>
              <div class="dna-desc">{{ getAcousticDesc() }}</div>
            </div>

            <div class="dna-stat" :class="{ 'high': stats.instrumentalness > 30 }">
              <div class="dna-icon">🎹</div>
              <div class="dna-bar-container">
                <div class="dna-bar instrumental" :style="{ height: stats.instrumentalness + '%' }"></div>
              </div>
              <div class="dna-value">{{ stats.instrumentalness }}%</div>
              <div class="dna-label">INSTRUMENTAL</div>
              <div class="dna-desc">{{ getInstrumentalDesc() }}</div>
            </div>

            <div class="dna-stat" :class="{ 'high': stats.loudness > -8 }">
              <div class="dna-icon">📢</div>
              <div class="dna-bar-container">
                <div class="dna-bar loud" :style="{ height: getLoudnessPercent() + '%' }"></div>
              </div>
              <div class="dna-value">{{ stats.loudness?.toFixed(1) || 0 }}dB</div>
              <div class="dna-label">VOLUME</div>
              <div class="dna-desc">{{ getLoudnessDesc() }}</div>
            </div>
          </div>

          <div class="tempo-section">
            <div class="tempo-badge">
              <span class="tempo-icon">🥁</span>
              <span class="tempo-value">{{ Math.round(stats.tempo || 120) }} BPM</span>
              <span class="tempo-label">MÉDIA</span>
            </div>
          </div>
        </div>

        <!-- Slide 6: Recently Played / Listening Habits -->
        <div v-else-if="currentSlide === 5" key="slide-5" class="retro-slide habits-slide">
          <h2 class="slide-title punk-title">
            <span class="title-icon">📅</span>
            SEUS HÁBITOS
          </h2>
          <p class="slide-subtitle">Quando você mais ouviu música</p>

          <div class="habits-grid">
            <div class="habit-card">
              <div class="habit-icon"><i class="fas fa-moon"></i></div>
              <div class="habit-value">{{ stats.favoriteTime }}</div>
              <div class="habit-label">Horário Favorito</div>
            </div>
            <div class="habit-card">
              <div class="habit-icon"><i class="fas fa-calendar-alt"></i></div>
              <div class="habit-value">{{ stats.favoriteDay }}</div>
              <div class="habit-label">Dia Favorito</div>
            </div>
            <div class="habit-card">
              <div class="habit-icon"><i class="fas fa-fire-alt"></i></div>
              <div class="habit-value">{{ stats.totalPlays }}</div>
              <div class="habit-label">Total de Plays</div>
            </div>
            <div class="habit-card">
              <div class="habit-icon"><i class="fas fa-clock"></i></div>
              <div class="habit-value">{{ Math.round(stats.avgDuration / 1000 / 60) || 3 }}min</div>
              <div class="habit-label">Duração Média</div>
            </div>
          </div>

          <!-- Recent Tracks -->
          <div class="recent-section" v-if="recentTracks.length > 0">
            <h3 class="recent-title">ÚLTIMAS OUVIDAS</h3>
            <div class="recent-tracks">
              <div 
                v-for="track in recentTracks.slice(0, 5)" 
                :key="track.id" 
                class="recent-track"
              >
                <img :src="track.albumCover" :alt="track.title" class="recent-cover" />
                <div class="recent-info">
                  <span class="recent-name">{{ track.title }}</span>
                  <span class="recent-artist">{{ track.artist }}</span>
                </div>
                <span class="recent-time">{{ track.playedAt }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Slide 7: Final - RESUMO BRUTAL -->
        <div v-else-if="currentSlide === 6" key="slide-6" class="retro-slide final-slide">
          <div class="final-header">
            <h2 class="final-title">SEU 2025</h2>
            <p class="final-subtitle">EM NÚMEROS</p>
          </div>

          <div class="final-stats-brutal">
            <div class="brutal-stat">
              <span class="brutal-number">{{ topSongs.length }}</span>
              <span class="brutal-label">MÚSICAS</span>
            </div>
            <div class="brutal-divider">×</div>
            <div class="brutal-stat">
              <span class="brutal-number">{{ topArtists.length }}</span>
              <span class="brutal-label">ARTISTAS</span>
            </div>
            <div class="brutal-divider">×</div>
            <div class="brutal-stat">
              <span class="brutal-number">{{ Math.round(stats.totalMinutes / 60) }}</span>
              <span class="brutal-label">HORAS</span>
            </div>
            <div class="brutal-divider">×</div>
            <div class="brutal-stat">
              <span class="brutal-number">{{ topGenres.length }}</span>
              <span class="brutal-label">GÊNEROS</span>
            </div>
          </div>

          <div class="listener-type">
            <div class="type-badge">
              <span class="type-icon">{{ getListenerEmoji() }}</span>
              <span class="type-name">{{ getListenerType() }}</span>
            </div>
            <p class="type-desc">{{ getListenerDesc() }}</p>
          </div>

          <div class="share-section-punk">
            <button class="punk-btn share-btn" @click="shareRetrospective">
              <i class="fas fa-share-alt"></i>
              <span>COMPARTILHAR</span>
            </button>
            <button class="punk-btn download-btn" @click="downloadRetrospective">
              <i class="fas fa-download"></i>
              <span>BAIXAR</span>
            </button>
          </div>

          <div class="credits">
            <p>FEITO COM 🖤 NO PLAYOFF</p>
          </div>
        </div>
      </transition>

      <!-- Navigation Buttons (Punk Style) -->
      <div class="nav-buttons-punk">
        <button
          v-if="currentSlide > 0"
          class="nav-btn-punk prev"
          @click="prevSlide"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
        <div class="slide-counter">{{ currentSlide + 1 }}/{{ totalSlides }}</div>
        <button
          v-if="currentSlide < totalSlides - 1"
          class="nav-btn-punk next"
          @click="nextSlide"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const emit = defineEmits(['close'])

const currentSlide = ref(0)
const totalSlides = 7
const isLoading = ref(true)
const isShaking = ref(false)

const topSongs = ref([])
const topArtists = ref([])
const topGenres = ref([])
const recentTracks = ref([])
const stats = ref({
  totalMinutes: 0,
  totalPlays: 0,
  favoriteTime: 'Noite',
  favoriteDay: 'Sábado',
  maxStreak: 0,
  energy: 0,
  valence: 0,
  danceability: 0,
  acousticness: 0,
  instrumentalness: 0,
  loudness: -10,
  tempo: 120,
  avgDuration: 200000
})

// Formatação de números grandes
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toLocaleString()
}

// Descrições baseadas nos valores
const getEnergyDesc = () => {
  if (stats.value.energy > 80) return 'EXPLOSIVO'
  if (stats.value.energy > 60) return 'INTENSO'
  if (stats.value.energy > 40) return 'MODERADO'
  return 'CHILL'
}

const getValenceDesc = () => {
  if (stats.value.valence > 70) return 'FELIZ'
  if (stats.value.valence > 50) return 'POSITIVO'
  if (stats.value.valence > 30) return 'MELANCÓLICO'
  return 'SOMBRIO'
}

const getDanceDesc = () => {
  if (stats.value.danceability > 70) return 'DANÇANTE'
  if (stats.value.danceability > 50) return 'GROOVY'
  if (stats.value.danceability > 30) return 'RITMADO'
  return 'CONTEMPLATIVO'
}

const getAcousticDesc = () => {
  if (stats.value.acousticness > 60) return 'ORGÂNICO'
  if (stats.value.acousticness > 30) return 'MISTO'
  return 'ELETRÔNICO'
}

const getInstrumentalDesc = () => {
  if (stats.value.instrumentalness > 50) return 'SEM VOCAL'
  if (stats.value.instrumentalness > 20) return 'HÍBRIDO'
  return 'VOCAL'
}

const getLoudnessPercent = () => {
  // Loudness vai de -60 a 0, convertemos para 0-100
  const normalized = ((stats.value.loudness || -10) + 60) / 60 * 100
  return Math.min(100, Math.max(0, normalized))
}

const getLoudnessDesc = () => {
  if (stats.value.loudness > -5) return 'ENSURDECEDOR'
  if (stats.value.loudness > -10) return 'ALTO'
  if (stats.value.loudness > -15) return 'MÉDIO'
  return 'SUAVE'
}

const getGenreClass = (index) => {
  const classes = ['fire', 'electric', 'neon', 'punk', 'dark']
  return classes[index] || 'default'
}

const getPersonalityType = () => {
  const topGenre = topGenres.value[0]?.name?.toLowerCase() || ''
  if (topGenre.includes('rock') || topGenre.includes('metal')) return 'REBELDE'
  if (topGenre.includes('indie') || topGenre.includes('alternative')) return 'ALTERNATIVO'
  if (topGenre.includes('pop')) return 'MAINSTREAM REBEL'
  if (topGenre.includes('hip') || topGenre.includes('rap')) return 'STREET'
  if (topGenre.includes('electronic') || topGenre.includes('edm')) return 'SINTÉTICO'
  return 'ECLÉTICO'
}

const getListenerType = () => {
  const energy = stats.value.energy
  const valence = stats.value.valence
  
  if (energy > 70 && valence < 40) return 'PUNK RAIZ'
  if (energy > 70 && valence > 60) return 'PARTY ANIMAL'
  if (energy < 40 && valence < 40) return 'ALMA SOMBRIA'
  if (energy < 40 && valence > 60) return 'DREAMER'
  if (energy > 50 && valence > 40 && valence < 60) return 'EQUILIBRADO'
  return 'CAMALEÃO MUSICAL'
}

const getListenerEmoji = () => {
  const type = getListenerType()
  const emojis = {
    'PUNK RAIZ': '🤘',
    'PARTY ANIMAL': '🎉',
    'ALMA SOMBRIA': '🖤',
    'DREAMER': '✨',
    'EQUILIBRADO': '⚖️',
    'CAMALEÃO MUSICAL': '🦎'
  }
  return emojis[type] || '🎵'
}

const getListenerDesc = () => {
  const type = getListenerType()
  const descs = {
    'PUNK RAIZ': 'Você curte som pesado e letras que questionam tudo. Energia alta, mood sombrio.',
    'PARTY ANIMAL': 'Sua playlist é pura adrenalina positiva. Nasceu pra agitar!',
    'ALMA SOMBRIA': 'Músicas introspectivas e melancólicas são seu refúgio. Profundo demais.',
    'DREAMER': 'Som suave mas otimista. Você vive no seu próprio mundo musical.',
    'EQUILIBRADO': 'Você transita entre todos os moods. Versátil e consciente.',
    'CAMALEÃO MUSICAL': 'Impossível te definir. Você é todos os gêneros ao mesmo tempo.'
  }
  return descs[type] || 'Seu gosto musical é único!'
}

const nextSlide = () => {
  if (currentSlide.value < totalSlides - 1) {
    triggerShake()
    currentSlide.value++
  }
}

const prevSlide = () => {
  if (currentSlide.value > 0) {
    triggerShake()
    currentSlide.value--
  }
}

const goToSlide = (index) => {
  triggerShake()
  currentSlide.value = index
}

const triggerShake = () => {
  isShaking.value = true
  setTimeout(() => isShaking.value = false, 200)
}

const closeRetrospective = () => {
  emit('close')
}

const getInitials = (name) => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

const shareRetrospective = async () => {
  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Minha Retrospectiva 2025 - PlayOff',
        text: `Ouvi ${formatNumber(stats.value.totalMinutes)} minutos de música em 2025! Meu artista #1 foi ${topArtists.value[0]?.name || 'desconhecido'}. Confira sua retrospectiva no PlayOff!`,
        url: window.location.href
      })
    } else {
      // Fallback: copiar para clipboard
      const text = `🎵 Minha Retrospectiva 2025 - PlayOff\n\n` +
        `⏱️ ${formatNumber(stats.value.totalMinutes)} minutos ouvidos\n` +
        `🎤 Artista #1: ${topArtists.value[0]?.name || 'N/A'}\n` +
        `🎸 Música #1: ${topSongs.value[0]?.title || 'N/A'}\n` +
        `🔥 Tipo: ${getListenerType()}\n\n` +
        `Confira sua retrospectiva no PlayOff!`
      
      await navigator.clipboard.writeText(text)
      alert('Copiado para a área de transferência!')
    }
  } catch (err) {
    console.error('Erro ao compartilhar:', err)
  }
}

const downloadRetrospective = async () => {
  // Usa html2canvas se disponível
  if (window.html2canvas) {
    try {
      const element = document.querySelector('.retro-container')
      const canvas = await window.html2canvas(element, {
        scale: 2,
        backgroundColor: '#0a0a0a',
        useCORS: true
      })
      
      const link = document.createElement('a')
      link.download = `PlayOff-Retrospectiva-2025.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Erro ao baixar:', err)
      alert('Erro ao gerar imagem. Tente tirar um print!')
    }
  } else {
    alert('Tire um print da tela para salvar sua retrospectiva!')
  }
}

const fetchYearData = async () => {
  const token = localStorage.getItem('spotify_access_token')
  isLoading.value = true

  if (!token) {
    console.warn('⚠️ Sem token do Spotify - usando dados mock')
    loadMockData()
    isLoading.value = false
    return
  }

  try {
    console.log('🎸 Buscando dados reais do Spotify...')
    
    // 1. Busca top tracks (long_term = último ano) - APENAS MÚSICAS REAIS
    const tracksRes = await fetch('https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=50', {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!tracksRes.ok) {
      console.error('❌ Erro ao buscar tracks:', tracksRes.status)
      throw new Error('Falha ao buscar tracks')
    }

    const tracksData = await tracksRes.json()
    console.log(`✅ ${tracksData.items.length} músicas encontradas`)
    
    // Mapeia tracks com dados REAIS do Spotify
    topSongs.value = tracksData.items.map((track, index) => ({
      id: track.id,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      albumCover: track.album.images[0]?.url || '/default-album.jpg',
      album: track.album.name,
      // Estimativa de plays baseada na posição (quanto mais alto, mais ouvido)
      playCount: Math.floor(Math.pow(50 - index, 1.5) * 3 + Math.random() * 20),
      duration_ms: track.duration_ms,
      popularity: track.popularity,
      spotifyUrl: track.external_urls?.spotify
    }))

    // 2. Busca top artists
    const artistsRes = await fetch('https://api.spotify.com/v1/me/top/artists?time_range=long_term&limit=20', {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (artistsRes.ok) {
      const artistsData = await artistsRes.json()
      topArtists.value = artistsData.items.map((artist, index) => ({
        id: artist.id,
        name: artist.name,
        image: artist.images[0]?.url,
        count: Math.floor((20 - index) * 5 + Math.random() * 10),
        genres: artist.genres || []
      }))

      // Extrai gêneros dos artistas
      const genresMap = {}
      artistsData.items.forEach((artist, idx) => {
        const weight = 20 - idx // Artistas mais ouvidos têm mais peso
        artist.genres?.forEach(genre => {
          if (!genresMap[genre]) genresMap[genre] = 0
          genresMap[genre] += weight
        })
      })

      // Converte para array e calcula percentuais
      const totalWeight = Object.values(genresMap).reduce((a, b) => a + b, 0)
      topGenres.value = Object.entries(genresMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, weight]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          percentage: Math.round((weight / totalWeight) * 100)
        }))
    }

    // 3. Busca audio features das top tracks para análise de DNA
    const trackIds = topSongs.value.slice(0, 50).map(t => t.id).join(',')
    if (trackIds) {
      const featuresRes = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (featuresRes.ok) {
        const featuresData = await featuresRes.json()
        const features = featuresData.audio_features.filter(f => f) // Remove nulls
        
        if (features.length > 0) {
          // Calcula médias
          const avg = (arr, key) => arr.reduce((sum, f) => sum + (f[key] || 0), 0) / arr.length
          
          stats.value.energy = Math.round(avg(features, 'energy') * 100)
          stats.value.valence = Math.round(avg(features, 'valence') * 100)
          stats.value.danceability = Math.round(avg(features, 'danceability') * 100)
          stats.value.acousticness = Math.round(avg(features, 'acousticness') * 100)
          stats.value.instrumentalness = Math.round(avg(features, 'instrumentalness') * 100)
          stats.value.loudness = avg(features, 'loudness')
          stats.value.tempo = avg(features, 'tempo')
        }
      }
    }

    // 4. Busca recently played
    const recentRes = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=20', {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (recentRes.ok) {
      const recentData = await recentRes.json()
      recentTracks.value = recentData.items.map(item => ({
        id: item.track.id,
        title: item.track.name,
        artist: item.track.artists.map(a => a.name).join(', '),
        albumCover: item.track.album.images[0]?.url,
        playedAt: formatPlayedAt(item.played_at)
      }))

      // Analisa horários de reprodução
      const hours = recentData.items.map(item => new Date(item.played_at).getHours())
      const hourCounts = {}
      hours.forEach(h => hourCounts[h] = (hourCounts[h] || 0) + 1)
      const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
      
      if (peakHour) {
        const h = parseInt(peakHour)
        if (h >= 6 && h < 12) stats.value.favoriteTime = 'Manhã'
        else if (h >= 12 && h < 18) stats.value.favoriteTime = 'Tarde'
        else if (h >= 18 && h < 22) stats.value.favoriteTime = 'Noite'
        else stats.value.favoriteTime = 'Madrugada'
      }

      // Analisa dias da semana
      const days = recentData.items.map(item => new Date(item.played_at).getDay())
      const dayCounts = {}
      days.forEach(d => dayCounts[d] = (dayCounts[d] || 0) + 1)
      const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
      stats.value.favoriteDay = dayNames[parseInt(peakDay)] || 'Sábado'
    }

    // Calcula estatísticas gerais
    stats.value.totalPlays = topSongs.value.reduce((sum, s) => sum + s.playCount, 0)
    stats.value.avgDuration = topSongs.value.reduce((sum, s) => sum + (s.duration_ms || 200000), 0) / topSongs.value.length
    stats.value.totalMinutes = Math.round(stats.value.totalPlays * (stats.value.avgDuration / 1000 / 60))

  } catch (err) {
    console.error('❌ Erro ao buscar dados do Spotify:', err)
    loadMockData()
  }

  isLoading.value = false
}

const formatPlayedAt = (dateStr) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`
  return `${Math.floor(diff / 86400000)}d atrás`
}

const loadMockData = () => {
  // Dados mock para quando não há token
  topSongs.value = [
    { id: '1', title: 'Smells Like Teen Spirit', artist: 'Nirvana', albumCover: 'https://i.scdn.co/image/ab67616d0000b273e175a19e530c898d167d39bf', playCount: 342 },
    { id: '2', title: 'Creep', artist: 'Radiohead', albumCover: 'https://i.scdn.co/image/ab67616d0000b2739293c743fa542094336c5e12', playCount: 287 },
    { id: '3', title: 'Paranoid Android', artist: 'Radiohead', albumCover: 'https://i.scdn.co/image/ab67616d0000b273c8b444df094279e70d0ed856', playCount: 256 },
    { id: '4', title: 'Lithium', artist: 'Nirvana', albumCover: 'https://i.scdn.co/image/ab67616d0000b273e175a19e530c898d167d39bf', playCount: 234 },
    { id: '5', title: 'Black Hole Sun', artist: 'Soundgarden', albumCover: 'https://i.scdn.co/image/ab67616d0000b2734e2e2e2e2e2e2e2e2e2e2e2e', playCount: 198 }
  ]
  
  topArtists.value = [
    { name: 'Nirvana', count: 45, image: null },
    { name: 'Radiohead', count: 38, image: null },
    { name: 'Soundgarden', count: 28, image: null },
    { name: 'Pearl Jam', count: 24, image: null },
    { name: 'Alice in Chains', count: 21, image: null }
  ]
  
  topGenres.value = [
    { name: 'Grunge', percentage: 35 },
    { name: 'Alternative Rock', percentage: 28 },
    { name: 'Rock', percentage: 20 },
    { name: 'Indie', percentage: 12 },
    { name: 'Post-Punk', percentage: 5 }
  ]
  
  stats.value = {
    totalMinutes: 12450,
    totalPlays: 1847,
    favoriteTime: 'Noite',
    favoriteDay: 'Sábado',
    maxStreak: 14,
    energy: 72,
    valence: 38,
    danceability: 45,
    acousticness: 25,
    instrumentalness: 15,
    loudness: -7.5,
    tempo: 128,
    avgDuration: 240000
  }
}

onMounted(() => {
  fetchYearData()
})
</script>

<style scoped>
/* ========================================
   PLAYOFF RETROSPECTIVA 2025 - PUNK STYLE
   ======================================== */

.retro-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #0a0a0a;
  background-image: 
    radial-gradient(ellipse at top, rgba(255, 0, 0, 0.1) 0%, transparent 50%),
    radial-gradient(ellipse at bottom, rgba(255, 51, 51, 0.05) 0%, transparent 50%),
    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px),
    repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px);
  z-index: 10000;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow-y: auto;
  overflow-x: hidden;
  animation: bg-pulse 4s ease-in-out infinite;
}

@keyframes bg-pulse {
  0%, 100% { 
    background-color: #0a0a0a;
  }
  50% { 
    background-color: #0d0808;
  }
}

.retro-overlay::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
  pointer-events: none;
  z-index: 0;
}

/* Loading State - ROCK STYLE */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: 100vh;
}

.loading-guitar {
  font-size: 80px;
  animation: guitar-rock 0.5s ease-in-out infinite alternate;
  color: #ff3333;
  text-shadow: 0 0 30px rgba(255, 51, 51, 0.8);
}

@keyframes guitar-rock {
  0% { transform: rotate(-15deg) scale(1); }
  100% { transform: rotate(15deg) scale(1.1); }
}

.loading-flames {
  display: flex;
  gap: 10px;
  font-size: 32px;
}

.loading-flames .flame {
  animation: flame-dance 0.3s ease-in-out infinite alternate;
}

.loading-flames .flame:nth-child(2) {
  animation-delay: 0.1s;
}

.loading-flames .flame:nth-child(3) {
  animation-delay: 0.2s;
}

@keyframes flame-dance {
  0% { transform: translateY(0) scale(1); }
  100% { transform: translateY(-10px) scale(1.2); }
}

.loading-text {
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 6px;
  color: #fff;
  text-transform: uppercase;
  text-shadow: 0 0 20px rgba(255, 51, 51, 0.5);
  animation: text-pulse 1s ease-in-out infinite;
}

@keyframes text-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.loading-subtext {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
  margin-top: -10px;
}

.loading-bar {
  width: 250px;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid rgba(255, 51, 51, 0.3);
}

.loading-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff0000, #ff3333, #ff6600, #ff3333, #ff0000);
  background-size: 200% 100%;
  animation: loading-fire 1s ease-in-out infinite;
}

@keyframes loading-fire {
  0% { width: 0%; background-position: 0% 50%; }
  50% { width: 100%; background-position: 100% 50%; }
  100% { width: 100%; background-position: 0% 50%; transform: translateX(100%); }
}

.retro-container {
  width: 100%;
  max-width: 900px;
  min-height: 100vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.retro-container.shake {
  animation: shake 0.2s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px) rotate(-1deg); }
  75% { transform: translateX(5px) rotate(1deg); }
}

/* Punk Tape Decorations */
.punk-tape {
  position: fixed;
  width: 120px;
  height: 30px;
  background: #ff3333;
  z-index: 101;
  opacity: 0.9;
}

.punk-tape.top-left {
  top: 20px;
  left: -20px;
  transform: rotate(-45deg);
}

.punk-tape.top-right {
  top: 20px;
  right: -20px;
  transform: rotate(45deg);
}

.punk-tape.bottom-left {
  bottom: 20px;
  left: -20px;
  transform: rotate(45deg);
}

.punk-tape.bottom-right {
  bottom: 20px;
  right: -20px;
  transform: rotate(-45deg);
}

/* Navigation Dots - Punk Style */
.navigation-dots {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
}

.dot {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #ff3333;
  font-weight: 900;
}

.dot.active {
  background: #ff3333;
  border-color: #ff3333;
  transform: rotate(45deg);
}

.dot.active span {
  transform: rotate(-45deg);
}

/* Close Button - X Punk */
.retro-close {
  position: fixed;
  top: 20px;
  right: 60px;
  width: 50px;
  height: 50px;
  background: transparent;
  border: 3px solid #ff3333;
  color: #ff3333;
  font-size: 32px;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 102;
  display: flex;
  align-items: center;
  justify-content: center;
}

.retro-close:hover {
  background: #ff3333;
  color: #000;
  transform: rotate(90deg);
}

.close-x {
  line-height: 1;
}

/* Slides */
.retro-slide {
  width: 100%;
  max-width: 800px;
  padding: 40px 20px;
  text-align: center;
  color: white;
}

/* ROCK Slide Transitions - More Aggressive! */
.punk-slide-enter-active {
  animation: slide-in-rock 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.punk-slide-leave-active {
  animation: slide-out-rock 0.4s cubic-bezier(0.55, 0.055, 0.675, 0.19);
}

@keyframes slide-in-rock {
  0% {
    opacity: 0;
    transform: translateX(100px) rotate(5deg) scale(0.8);
    filter: blur(10px);
  }
  50% {
    opacity: 0.8;
    transform: translateX(-20px) rotate(-2deg) scale(1.02);
    filter: blur(2px);
  }
  100% {
    opacity: 1;
    transform: translateX(0) rotate(0) scale(1);
    filter: blur(0);
  }
}

@keyframes slide-out-rock {
  0% {
    opacity: 1;
    transform: translateX(0) rotate(0) scale(1);
    filter: blur(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-100px) rotate(-5deg) scale(0.8);
    filter: blur(10px);
  }
}

/* ========== INTRO SLIDE - ROCK STYLE ========== */
.intro-slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  gap: 20px;
  position: relative;
}

/* Sparks Animation */
.sparks-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.spark {
  position: absolute;
  top: 20%;
  left: var(--x, 50%);
  font-size: 16px;
  color: #ff6600;
  animation: spark-fly 2s ease-out infinite;
  animation-delay: var(--delay, 0s);
  opacity: 0;
  text-shadow: 0 0 10px #ff3300, 0 0 20px #ff0000;
}

@keyframes spark-fly {
  0% {
    opacity: 0;
    transform: translateY(0) scale(0);
  }
  20% {
    opacity: 1;
    transform: translateY(-20px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-150px) translateX(calc(var(--x) - 50%)) scale(0.5) rotate(360deg);
  }
}

.glitch-container {
  position: relative;
}

.fire-effect {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 40px;
  animation: fire-float 0.5s ease-in-out infinite alternate;
  filter: drop-shadow(0 0 10px rgba(255, 102, 0, 0.8));
}

@keyframes fire-float {
  0% { transform: translateX(-50%) translateY(0) scale(1); }
  100% { transform: translateX(-50%) translateY(-10px) scale(1.1); }
}

.retro-subtitle .highlight {
  color: #ff3333;
  text-shadow: 0 0 20px rgba(255, 51, 51, 0.8);
  animation: highlight-pulse 1s ease-in-out infinite;
}

@keyframes highlight-pulse {
  0%, 100% { text-shadow: 0 0 20px rgba(255, 51, 51, 0.8); }
  50% { text-shadow: 0 0 40px rgba(255, 51, 51, 1), 0 0 60px rgba(255, 102, 0, 0.5); }
}

.retro-year {
  font-size: clamp(80px, 20vw, 150px);
  font-weight: 900;
  color: #fff;
  text-shadow: 
    4px 4px 0 #ff3333,
    -2px -2px 0 #00ffff,
    8px 8px 0 rgba(0,0,0,0.3);
  margin: 0;
  letter-spacing: -5px;
  animation: glitch-text 3s infinite;
}

@keyframes glitch-text {
  0%, 90%, 100% { transform: translate(0); }
  92% { transform: translate(-3px, 2px); }
  94% { transform: translate(3px, -2px); }
  96% { transform: translate(-2px, -1px); }
  98% { transform: translate(2px, 1px); }
}

.year-scratch {
  position: absolute;
  top: 50%;
  left: -10%;
  width: 120%;
  height: 4px;
  background: #ff3333;
  transform: rotate(-5deg);
  opacity: 0.8;
}

.retro-subtitle {
  font-size: clamp(18px, 4vw, 28px);
  font-weight: 700;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.9);
}

.retro-subtitle .strike {
  text-decoration: line-through;
  color: rgba(255,255,255,0.5);
}

.skull-divider {
  display: flex;
  align-items: center;
  gap: 15px;
  margin: 20px 0;
  color: #ff3333;
  font-size: 24px;
}

.divider-line {
  width: 60px;
  height: 2px;
  background: #ff3333;
}

.intro-stats {
  margin: 30px 0;
}

.big-stat {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.big-stat .stat-value {
  font-size: clamp(48px, 12vw, 80px);
  font-weight: 900;
  color: #ff3333;
  line-height: 1;
}

.big-stat .stat-label {
  font-size: 14px;
  letter-spacing: 4px;
  color: rgba(255,255,255,0.6);
  text-transform: uppercase;
}

.stat-comparison {
  font-size: 14px;
  color: rgba(255,255,255,0.5);
  margin-top: 10px;
}

/* Punk Button */
.punk-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 2px;
  background: #ff3333;
  color: #000;
  border: 3px solid #ff3333;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.punk-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transition: left 0.4s ease;
}

.punk-btn:hover::before {
  left: 100%;
}

.punk-btn:hover {
  background: #000;
  color: #ff3333;
  transform: translate(-3px, -3px);
  box-shadow: 6px 6px 0 #ff3333;
}

/* ========== SLIDE TITLES ========== */
.slide-title {
  font-size: clamp(28px, 6vw, 42px);
  font-weight: 900;
  margin-bottom: 5px;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.punk-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.title-icon {
  font-size: 1.2em;
}

.slide-subtitle {
  font-size: 14px;
  color: rgba(255,255,255,0.5);
  margin-bottom: 30px;
  letter-spacing: 1px;
}

/* ========== SONGS SLIDE - ROCK STYLE ========== */
.songs-list-punk {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 10px;
}

.song-item-punk {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border-left: 4px solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: rock-slide-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
  opacity: 0;
  position: relative;
  overflow: hidden;
}

.song-item-punk::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 51, 51, 0.1), transparent);
  transition: left 0.5s ease;
}

.song-item-punk:hover::before {
  left: 100%;
}

@keyframes rock-slide-in {
  0% { 
    opacity: 0; 
    transform: translateX(-50px) rotate(-2deg) scale(0.9);
  }
  60% {
    opacity: 1;
    transform: translateX(10px) rotate(1deg) scale(1.02);
  }
  100% { 
    opacity: 1; 
    transform: translateX(0) rotate(0) scale(1);
  }
}

.song-item-punk:hover {
  background: rgba(255,51,51,0.15);
  border-left-color: #ff3333;
  transform: translateX(10px) scale(1.02);
  box-shadow: -5px 0 20px rgba(255, 51, 51, 0.3);
}

.song-item-punk.rank-1 { 
  border-left-color: #ffd700; 
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.1), transparent);
}
.song-item-punk.rank-2 { 
  border-left-color: #c0c0c0; 
  background: linear-gradient(90deg, rgba(192, 192, 192, 0.1), transparent);
}
.song-item-punk.rank-3 { 
  border-left-color: #cd7f32; 
  background: linear-gradient(90deg, rgba(205, 127, 50, 0.1), transparent);
}

.rank-number {
  font-size: 28px;
  font-weight: 900;
  min-width: 45px;
  color: rgba(255,255,255,0.3);
}

.rank-number.gold { color: #ffd700; }
.rank-number.silver { color: #c0c0c0; }
.rank-number.bronze { color: #cd7f32; }

.song-cover-punk {
  width: 60px;
  height: 60px;
  position: relative;
  flex-shrink: 0;
}

.song-cover-punk img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255,51,51,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  color: #000;
  font-size: 20px;
}

.song-item-punk:hover .cover-overlay {
  opacity: 1;
}

.song-info-punk {
  flex: 1;
  text-align: left;
  min-width: 0;
}

.song-info-punk .song-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-info-punk .song-artist {
  font-size: 13px;
  color: rgba(255,255,255,0.5);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-stats-punk {
  text-align: right;
}

.play-count {
  font-size: 12px;
  color: #ff3333;
  font-weight: 700;
}

/* ========== ARTISTS SLIDE ========== */
.top-artist-feature {
  background: linear-gradient(135deg, rgba(255,51,51,0.2), rgba(255,51,51,0.05));
  border: 2px solid #ff3333;
  padding: 30px;
  margin-bottom: 30px;
  position: relative;
}

.feature-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #ff3333;
  color: #000;
  padding: 4px 16px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 2px;
}

.feature-avatar {
  width: 120px;
  height: 120px;
  margin: 0 auto 15px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #ff3333;
}

.feature-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  background: #ff3333;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 900;
  color: #000;
}

.feature-name {
  font-size: 28px;
  font-weight: 900;
  margin: 0 0 5px 0;
}

.feature-count {
  font-size: 14px;
  color: rgba(255,255,255,0.5);
  margin: 0;
}

.artists-grid-punk {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 15px;
}

.artist-card-punk {
  background: rgba(255,255,255,0.03);
  padding: 20px 15px;
  position: relative;
  transition: all 0.2s ease;
  animation: pop-in 0.4s ease forwards;
  opacity: 0;
}

@keyframes pop-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.artist-card-punk:hover {
  background: rgba(255,255,255,0.08);
  transform: translateY(-5px);
}

.artist-rank-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 12px;
  font-weight: 900;
  color: rgba(255,255,255,0.3);
}

.artist-avatar-punk {
  width: 70px;
  height: 70px;
  margin: 0 auto 10px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255,255,255,0.1);
}

.artist-avatar-punk img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #ff3333, #ff6b6b);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 900;
  color: #000;
}

.artist-name-punk {
  font-size: 14px;
  font-weight: 700;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-count-punk {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
}

/* ========== GENRES SLIDE ========== */
.genres-container-punk {
  max-width: 500px;
  margin: 0 auto;
}

.genre-item-punk {
  margin-bottom: 20px;
  animation: slide-in 0.5s ease forwards;
  opacity: 0;
}

.genre-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.genre-rank {
  font-size: 12px;
  font-weight: 900;
  color: rgba(255,255,255,0.3);
  min-width: 25px;
}

.genre-name-punk {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
  text-transform: capitalize;
}

.genre-percent-punk {
  font-size: 14px;
  font-weight: 900;
  color: #ff3333;
}

.genre-bar-punk {
  height: 8px;
  background: rgba(255,255,255,0.1);
  overflow: hidden;
}

.genre-fill-punk {
  height: 100%;
  transition: width 1s ease;
}

.genre-fill-punk.fire { background: linear-gradient(90deg, #ff3333, #ff6b6b); }
.genre-fill-punk.electric { background: linear-gradient(90deg, #00ffff, #00cccc); }
.genre-fill-punk.neon { background: linear-gradient(90deg, #ff00ff, #cc00cc); }
.genre-fill-punk.punk { background: linear-gradient(90deg, #ffff00, #cccc00); }
.genre-fill-punk.dark { background: linear-gradient(90deg, #666, #999); }

.genre-personality {
  margin-top: 30px;
}

.personality-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: rgba(255,51,51,0.1);
  border: 2px solid #ff3333;
  font-size: 18px;
  font-weight: 900;
  color: #ff3333;
  letter-spacing: 2px;
}

/* ========== DNA SLIDE ========== */
.dna-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

@media (max-width: 600px) {
  .dna-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.dna-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 15px;
  background: rgba(255,255,255,0.03);
  transition: all 0.2s ease;
}

.dna-stat.high {
  background: rgba(255,51,51,0.1);
  border-bottom: 3px solid #ff3333;
}

.dna-icon {
  font-size: 28px;
}

.dna-bar-container {
  width: 30px;
  height: 80px;
  background: rgba(255,255,255,0.1);
  position: relative;
  overflow: hidden;
}

.dna-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(to top, #ff3333, #ff6b6b);
  transition: height 1s ease;
}

.dna-bar.valence { background: linear-gradient(to top, #ff00ff, #ff66ff); }
.dna-bar.dance { background: linear-gradient(to top, #00ffff, #66ffff); }
.dna-bar.acoustic { background: linear-gradient(to top, #00ff00, #66ff66); }
.dna-bar.instrumental { background: linear-gradient(to top, #ffff00, #ffff66); }
.dna-bar.loud { background: linear-gradient(to top, #ff6600, #ff9966); }

.dna-value {
  font-size: 18px;
  font-weight: 900;
  color: #fff;
}

.dna-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: rgba(255,255,255,0.5);
}

.dna-desc {
  font-size: 11px;
  color: #ff3333;
  font-weight: 700;
}

.tempo-section {
  margin-top: 20px;
}

.tempo-badge {
  display: inline-flex;
  align-items: center;
  gap: 15px;
  padding: 15px 30px;
  background: rgba(255,255,255,0.05);
  border: 2px solid rgba(255,255,255,0.1);
}

.tempo-icon {
  font-size: 32px;
}

.tempo-value {
  font-size: 32px;
  font-weight: 900;
  color: #ff3333;
}

.tempo-label {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  letter-spacing: 2px;
}

/* ========== HABITS SLIDE ========== */
.habits-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 30px;
}

.habit-card {
  background: rgba(255,255,255,0.03);
  padding: 25px 15px;
  transition: all 0.2s ease;
}

.habit-card:hover {
  background: rgba(255,255,255,0.08);
}

.habit-icon {
  font-size: 32px;
  color: #ff3333;
  margin-bottom: 10px;
}

.habit-value {
  font-size: 24px;
  font-weight: 900;
  color: #fff;
  margin-bottom: 5px;
}

.habit-label {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  letter-spacing: 1px;
}

.recent-section {
  margin-top: 20px;
  text-align: left;
}

.recent-title {
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 2px;
  color: rgba(255,255,255,0.5);
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.recent-tracks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recent-track {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: rgba(255,255,255,0.02);
  transition: background 0.2s;
}

.recent-track:hover {
  background: rgba(255,255,255,0.05);
}

.recent-cover {
  width: 40px;
  height: 40px;
  object-fit: cover;
  flex-shrink: 0;
}

.recent-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.recent-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-artist {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-time {
  font-size: 11px;
  color: rgba(255,255,255,0.3);
  flex-shrink: 0;
}

/* ========== FINAL SLIDE ========== */
.final-slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
}

.final-header {
  margin-bottom: 30px;
}

.final-title {
  font-size: clamp(48px, 12vw, 72px);
  font-weight: 900;
  color: #fff;
  margin: 0;
  text-shadow: 4px 4px 0 #ff3333;
}

.final-subtitle {
  font-size: 14px;
  letter-spacing: 8px;
  color: rgba(255,255,255,0.5);
  margin: 5px 0 0 0;
}

.final-stats-brutal {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 40px;
}

.brutal-stat {
  text-align: center;
}

.brutal-number {
  display: block;
  font-size: clamp(36px, 8vw, 56px);
  font-weight: 900;
  color: #ff3333;
  line-height: 1;
}

.brutal-label {
  display: block;
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(255,255,255,0.4);
  margin-top: 5px;
}

.brutal-divider {
  font-size: 24px;
  color: rgba(255,255,255,0.2);
  font-weight: 900;
}

.listener-type {
  margin-bottom: 40px;
  text-align: center;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 15px;
  padding: 20px 40px;
  background: linear-gradient(135deg, rgba(255,51,51,0.2), rgba(255,51,51,0.05));
  border: 3px solid #ff3333;
}

.type-icon {
  font-size: 40px;
}

.type-name {
  font-size: 24px;
  font-weight: 900;
  color: #ff3333;
  letter-spacing: 3px;
}

.type-desc {
  font-size: 14px;
  color: rgba(255,255,255,0.6);
  max-width: 400px;
  margin: 20px auto 0;
  line-height: 1.6;
}

.share-section-punk {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  justify-content: center;
}

.share-section-punk .share-btn {
  background: transparent;
  border-color: #00ffff;
  color: #00ffff;
}

.share-section-punk .share-btn:hover {
  background: #00ffff;
  color: #000;
}

.share-section-punk .download-btn {
  background: #ff3333;
  border-color: #ff3333;
  color: #000;
}

.credits {
  margin-top: 40px;
  font-size: 12px;
  color: rgba(255,255,255,0.3);
  letter-spacing: 2px;
}

/* ========== NAVIGATION ========== */
.nav-buttons-punk {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 20px;
  z-index: 100;
}

.nav-btn-punk {
  width: 50px;
  height: 50px;
  background: transparent;
  border: 2px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.5);
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn-punk:hover {
  border-color: #ff3333;
  color: #ff3333;
  transform: scale(1.1);
}

.slide-counter {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255,255,255,0.3);
  letter-spacing: 2px;
}

/* ========== MOBILE RESPONSIVE ========== */
@media (max-width: 768px) {
  .punk-tape {
    display: none;
  }
  
  .navigation-dots {
    right: 10px;
  }
  
  .retro-close {
    right: 10px;
    top: 10px;
    width: 40px;
    height: 40px;
    font-size: 24px;
  }
  
  .habits-grid {
    grid-template-columns: 1fr;
  }
  
  .final-stats-brutal {
    gap: 10px;
  }
  
  .brutal-divider {
    display: none;
  }
  
  .type-badge {
    padding: 15px 25px;
    flex-direction: column;
    gap: 10px;
  }
  
  .type-name {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .retro-slide {
    padding: 20px 15px;
  }
  
  .dna-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  
  .artists-grid-punk {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
