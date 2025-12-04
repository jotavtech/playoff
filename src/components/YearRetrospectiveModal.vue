<template>
  <div class="retro-overlay" @click.self="closeRetrospective">
    <div class="retro-container">
      <!-- Navigation Dots -->
      <div class="navigation-dots">
        <div
          v-for="(slide, index) in totalSlides"
          :key="index"
          class="dot"
          :class="{ active: currentSlide === index }"
          @click="goToSlide(index)"
        ></div>
      </div>

      <!-- Close Button -->
      <button class="retro-close" @click="closeRetrospective">
        <i class="fas fa-times"></i>
      </button>

      <!-- Slides -->
      <transition-group name="slide" mode="out-in">
        <!-- Slide 1: Intro -->
        <div v-if="currentSlide === 0" key="intro" class="retro-slide intro-slide">
          <div class="glitch-container">
            <h1 class="retro-year glitch" data-text="2025">2025</h1>
          </div>
          <h2 class="retro-subtitle fade-in-up">SEU ANO EM MÚSICAS</h2>
          <div class="vinyl-animation">
            <div class="vinyl-disc"></div>
          </div>
          <p class="retro-stats fade-in-up-delay">
            {{ stats.totalMinutes.toLocaleString() }} minutos ouvidos
          </p>
          <button class="next-btn pulse" @click="nextSlide">
            VAMOS LÁ <i class="fas fa-arrow-right"></i>
          </button>
        </div>

        <!-- Slide 2: Top 5 Songs -->
        <div v-if="currentSlide === 1" key="topsongs" class="retro-slide songs-slide">
          <h2 class="slide-title">SUAS TOP 5</h2>
          <p class="slide-subtitle">As músicas que você mais escutou em 2025</p>

          <div class="songs-podium">
            <div
              v-for="(song, index) in topSongs.slice(0, 5)"
              :key="song.id"
              class="podium-item"
              :class="`rank-${index + 1}`"
              :style="{ animationDelay: `${index * 0.1}s` }"
            >
              <div class="rank-badge">#{{ index + 1 }}</div>
              <div class="song-cover-wrap">
                <img :src="song.albumCover" :alt="song.title" class="song-cover" />
                <div class="play-overlay">
                  <i class="fas fa-play"></i>
                </div>
              </div>
              <div class="song-details">
                <h3 class="song-name">{{ song.title }}</h3>
                <p class="song-artist">{{ song.artist }}</p>
                <p class="song-plays">{{ song.playCount || song.votes }} plays</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Slide 3: Top Artists -->
        <div v-if="currentSlide === 2" key="artists" class="retro-slide artists-slide">
          <h2 class="slide-title">SEUS ARTISTAS</h2>
          <p class="slide-subtitle">Os artistas que dominaram seu ano</p>

          <div class="artists-grid">
            <div
              v-for="(artist, index) in topArtists.slice(0, 8)"
              :key="artist.name"
              class="artist-card"
              :style="{ animationDelay: `${index * 0.05}s` }"
            >
              <div class="artist-rank">{{ index + 1 }}</div>
              <div class="artist-avatar">
                <img v-if="artist.image" :src="artist.image" :alt="artist.name" />
                <div v-else class="artist-initials">{{ getInitials(artist.name) }}</div>
              </div>
              <h3 class="artist-name">{{ artist.name }}</h3>
              <p class="artist-count">{{ artist.count }} músicas</p>
            </div>
          </div>
        </div>

        <!-- Slide 4: Genres -->
        <div v-if="currentSlide === 3" key="genres" class="retro-slide genres-slide">
          <h2 class="slide-title">SEUS GÊNEROS</h2>
          <p class="slide-subtitle">O que define seu som</p>

          <div class="genres-bars">
            <div
              v-for="(genre, index) in topGenres"
              :key="genre.name"
              class="genre-bar-wrap"
              :style="{ animationDelay: `${index * 0.1}s` }"
            >
              <div class="genre-info">
                <span class="genre-name">{{ genre.name }}</span>
                <span class="genre-percent">{{ genre.percentage }}%</span>
              </div>
              <div class="genre-bar">
                <div
                  class="genre-fill"
                  :style="{ width: genre.percentage + '%', animationDelay: `${index * 0.1 + 0.3}s` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Slide 5: Time Stats -->
        <div v-if="currentSlide === 4" key="timestats" class="retro-slide time-slide">
          <h2 class="slide-title">SEU RITMO</h2>
          <p class="slide-subtitle">Quando você mais ouviu música</p>

          <div class="time-grid">
            <div class="time-stat">
              <div class="time-icon">
                <i class="fas fa-sun"></i>
              </div>
              <h3>Horário Favorito</h3>
              <p class="time-value">{{ stats.favoriteTime }}</p>
            </div>

            <div class="time-stat">
              <div class="time-icon">
                <i class="fas fa-calendar-day"></i>
              </div>
              <h3>Dia da Semana</h3>
              <p class="time-value">{{ stats.favoriteDay }}</p>
            </div>

            <div class="time-stat">
              <div class="time-icon">
                <i class="fas fa-fire"></i>
              </div>
              <h3>Streak Máximo</h3>
              <p class="time-value">{{ stats.maxStreak }} dias</p>
            </div>

            <div class="time-stat">
              <div class="time-icon">
                <i class="fas fa-bolt"></i>
              </div>
              <h3>Total de Plays</h3>
              <p class="time-value">{{ stats.totalPlays.toLocaleString() }}</p>
            </div>
          </div>
        </div>

        <!-- Slide 6: Mood Analysis -->
        <div v-if="currentSlide === 5" key="mood" class="retro-slide mood-slide">
          <h2 class="slide-title">SEU MOOD</h2>
          <p class="slide-subtitle">A energia das suas músicas</p>

          <div class="mood-chart">
            <svg viewBox="0 0 300 300" class="radar-chart">
              <polygon
                :points="moodPolygonPoints"
                class="mood-polygon"
              />
              <circle cx="150" cy="150" r="120" class="radar-circle" />
              <circle cx="150" cy="150" r="80" class="radar-circle" />
              <circle cx="150" cy="150" r="40" class="radar-circle" />
              <line x1="150" y1="150" x2="150" y2="30" class="radar-line" />
              <line x1="150" y1="150" x2="254" y2="202" class="radar-line" />
              <line x1="150" y1="150" x2="46" y2="202" class="radar-line" />
            </svg>
          </div>

          <div class="mood-labels">
            <div class="mood-label">
              <span class="mood-emoji">⚡</span>
              <span>Energia: {{ stats.energy }}%</span>
            </div>
            <div class="mood-label">
              <span class="mood-emoji">😊</span>
              <span>Positividade: {{ stats.valence }}%</span>
            </div>
            <div class="mood-label">
              <span class="mood-emoji">🎸</span>
              <span>Dançabilidade: {{ stats.danceability }}%</span>
            </div>
          </div>
        </div>

        <!-- Slide 7: Final Stats -->
        <div v-if="currentSlide === 6" key="final" class="retro-slide final-slide">
          <h2 class="slide-title">VOCÊ EM 2025</h2>

          <div class="final-stats-grid">
            <div class="final-stat-card">
              <div class="stat-number">{{ topSongs.length }}</div>
              <div class="stat-label">Músicas Únicas</div>
            </div>
            <div class="final-stat-card">
              <div class="stat-number">{{ topArtists.length }}</div>
              <div class="stat-label">Artistas</div>
            </div>
            <div class="final-stat-card">
              <div class="stat-number">{{ Math.round(stats.totalMinutes / 60) }}</div>
              <div class="stat-label">Horas</div>
            </div>
            <div class="final-stat-card">
              <div class="stat-number">{{ topGenres.length }}</div>
              <div class="stat-label">Gêneros</div>
            </div>
          </div>

          <div class="share-section">
            <h3>Compartilhe sua retrospectiva</h3>
            <button class="share-btn" @click="shareRetrospective">
              <i class="fas fa-share-alt"></i> COMPARTILHAR
            </button>
            <button class="download-btn" @click="downloadRetrospective">
              <i class="fas fa-download"></i> BAIXAR
            </button>
          </div>
        </div>
      </transition-group>

      <!-- Navigation Buttons -->
      <div class="nav-buttons">
        <button
          v-if="currentSlide > 0"
          class="nav-btn prev-btn"
          @click="prevSlide"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
        <button
          v-if="currentSlide < totalSlides - 1"
          class="nav-btn next-btn"
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

const topSongs = ref([])
const topArtists = ref([])
const topGenres = ref([])
const stats = ref({
  totalMinutes: 0,
  totalPlays: 0,
  favoriteTime: 'Noite',
  favoriteDay: 'Sábado',
  maxStreak: 14,
  energy: 75,
  valence: 65,
  danceability: 80
})

const moodPolygonPoints = computed(() => {
  const centerX = 150
  const centerY = 150
  const radius = 100

  const energy = (stats.value.energy / 100) * radius
  const valence = (stats.value.valence / 100) * radius
  const dance = (stats.value.danceability / 100) * radius

  return `
    ${centerX},${centerY - energy}
    ${centerX + valence * 0.866},${centerY + valence * 0.5}
    ${centerX - dance * 0.866},${centerY + dance * 0.5}
  `
})

const nextSlide = () => {
  if (currentSlide.value < totalSlides - 1) {
    currentSlide.value++
  }
}

const prevSlide = () => {
  if (currentSlide.value > 0) {
    currentSlide.value--
  }
}

const goToSlide = (index) => {
  currentSlide.value = index
}

const closeRetrospective = () => {
  emit('close')
}

const getInitials = (name) => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

const shareRetrospective = () => {
  // Implementar compartilhamento
  console.log('Compartilhando retrospectiva...')
}

const downloadRetrospective = () => {
  // Implementar download
  console.log('Baixando retrospectiva...')
}

const fetchYearData = async () => {
  const token = localStorage.getItem('spotify_access_token')

  if (token) {
    try {
      // Busca top tracks do ano
      const tracksRes = await fetch('https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (tracksRes.ok) {
        const tracksData = await tracksRes.json()
        topSongs.value = tracksData.items.map((track, index) => ({
          id: track.id,
          title: track.name,
          artist: track.artists.map(a => a.name).join(', '),
          albumCover: track.album.images[0]?.url,
          playCount: Math.floor((50 - index) * 10 + Math.random() * 50)
        }))

        // Extrai artistas
        const artistsMap = {}
        tracksData.items.forEach(track => {
          track.artists.forEach(artist => {
            if (!artistsMap[artist.name]) {
              artistsMap[artist.name] = { name: artist.name, count: 0, image: null }
            }
            artistsMap[artist.name].count++
          })
        })

        topArtists.value = Object.values(artistsMap)
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)

        // Gêneros mock (Spotify não retorna gêneros de tracks facilmente)
        topGenres.value = [
          { name: 'Rock Alternativo', percentage: 35 },
          { name: 'Indie', percentage: 25 },
          { name: 'Grunge', percentage: 20 },
          { name: 'Post-Punk', percentage: 15 },
          { name: 'Alternative Metal', percentage: 5 }
        ]

        // Stats
        stats.value.totalMinutes = topSongs.value.length * 3.5 * 100 // Estimativa
        stats.value.totalPlays = topSongs.value.reduce((sum, s) => sum + s.playCount, 0)
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err)
    }
  }
}

onMounted(() => {
  fetchYearData()
})
</script>

<style scoped>
.retro-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a0a2e 100%);
  z-index: 10000;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.retro-container {
  width: 100%;
  max-width: 900px;
  height: 100vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Navigation Dots */
.navigation-dots {
  position: fixed;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 100;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
}

.dot.active {
  background: #fff;
  transform: scale(1.3);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
}

/* Close Button */
.retro-close {
  position: fixed;
  top: 30px;
  right: 30px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 100;
}

.retro-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

/* Slides */
.retro-slide {
  width: 100%;
  max-width: 800px;
  padding: 40px;
  text-align: center;
  color: white;
}

/* Slide Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(100px) scale(0.8);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-100px) scale(0.8);
}

/* Intro Slide */
.intro-slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
}

.glitch-container {
  perspective: 1000px;
}

.retro-year {
  font-size: 120px;
  font-weight: 900;
  background: linear-gradient(45deg, #ff006e, #8338ec, #3a86ff, #06ffa5);
  background-size: 300% 300%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-shift 3s ease infinite, float 3s ease-in-out infinite;
  margin: 0;
  text-shadow: 0 0 80px rgba(131, 56, 236, 0.5);
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(2deg); }
}

.retro-subtitle {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: 8px;
  margin: 20px 0;
  opacity: 0;
  animation: fade-in-up 0.8s ease 0.3s forwards;
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-up-delay {
  opacity: 0;
  animation: fade-in-up 0.8s ease 0.6s forwards;
}

/* Vinyl Animation */
.vinyl-animation {
  margin: 40px 0;
  perspective: 1000px;
}

.vinyl-disc {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #1a1a1a 0%, #000 60%);
  position: relative;
  animation: spin 3s linear infinite;
  box-shadow:
    0 0 0 15px #0a0a0a,
    0 0 0 16px #333,
    0 20px 40px rgba(0, 0, 0, 0.6);
  margin: 0 auto;
}

.vinyl-disc::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #8338ec;
  box-shadow: 0 0 20px rgba(131, 56, 236, 0.6);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.retro-stats {
  font-size: 24px;
  color: #06ffa5;
  font-weight: 600;
  margin: 30px 0;
}

.next-btn {
  padding: 18px 40px;
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #ff006e, #8338ec);
  border: none;
  border-radius: 50px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 40px;
  animation: pulse 2s ease-in-out infinite;
  letter-spacing: 2px;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 0, 110, 0.7);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 15px rgba(255, 0, 110, 0);
  }
}

.next-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 10px 30px rgba(255, 0, 110, 0.4);
}

/* Songs Slide */
.slide-title {
  font-size: 48px;
  font-weight: 900;
  margin-bottom: 10px;
  letter-spacing: 4px;
  background: linear-gradient(45deg, #ff006e, #8338ec);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.slide-subtitle {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 50px;
}

.songs-podium {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 10px;
}

.podium-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  animation: slide-in-right 0.6s ease forwards;
  opacity: 0;
}

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.podium-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(-5px);
}

.rank-badge {
  font-size: 32px;
  font-weight: 900;
  min-width: 60px;
  color: #06ffa5;
}

.song-cover-wrap {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
}

.song-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(131, 56, 236, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  font-size: 24px;
}

.podium-item:hover .play-overlay {
  opacity: 1;
}

.song-details {
  flex: 1;
  text-align: left;
}

.song-name {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 5px 0;
}

.song-artist {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 5px 0;
}

.song-plays {
  font-size: 14px;
  color: #06ffa5;
  font-weight: 600;
}

/* Artists Slide */
.artists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 10px;
}

.artist-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  animation: pop-in 0.5s ease forwards;
  opacity: 0;
  position: relative;
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.artist-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-5px);
}

.artist-rank {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 14px;
  font-weight: 700;
  color: #06ffa5;
}

.artist-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin: 0 auto 15px;
  overflow: hidden;
  background: linear-gradient(135deg, #ff006e, #8338ec);
  display: flex;
  align-items: center;
  justify-content: center;
}

.artist-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.artist-initials {
  font-size: 32px;
  font-weight: 900;
  color: white;
}

.artist-name {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 5px 0;
}

.artist-count {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

/* Genres Slide */
.genres-bars {
  max-width: 600px;
  margin: 0 auto;
}

.genre-bar-wrap {
  margin-bottom: 30px;
  animation: fade-in-up 0.6s ease forwards;
  opacity: 0;
}

.genre-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: 600;
}

.genre-name {
  color: white;
}

.genre-percent {
  color: #06ffa5;
}

.genre-bar {
  width: 100%;
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  overflow: hidden;
}

.genre-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff006e, #8338ec, #3a86ff);
  border-radius: 20px;
  animation: fill-bar 1s ease forwards;
  width: 0;
}

@keyframes fill-bar {
  to {
    width: var(--width);
  }
}

/* Time Slide */
.time-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 30px;
  margin-top: 40px;
}

.time-stat {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 40px 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: fade-in-up 0.6s ease forwards;
  opacity: 0;
}

.time-stat:nth-child(1) { animation-delay: 0.1s; }
.time-stat:nth-child(2) { animation-delay: 0.2s; }
.time-stat:nth-child(3) { animation-delay: 0.3s; }
.time-stat:nth-child(4) { animation-delay: 0.4s; }

.time-icon {
  font-size: 48px;
  margin-bottom: 20px;
  color: #8338ec;
}

.time-stat h3 {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin: 10px 0;
}

.time-value {
  font-size: 32px;
  font-weight: 900;
  color: #06ffa5;
  margin: 0;
}

/* Mood Slide */
.mood-chart {
  max-width: 400px;
  margin: 40px auto;
}

.radar-chart {
  width: 100%;
  height: auto;
}

.radar-circle {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 1;
}

.radar-line {
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 1;
}

.mood-polygon {
  fill: rgba(131, 56, 236, 0.3);
  stroke: #8338ec;
  stroke-width: 2;
  animation: draw-polygon 1s ease forwards;
}

@keyframes draw-polygon {
  from {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
  }
  to {
    stroke-dasharray: 1000;
    stroke-dashoffset: 0;
  }
}

.mood-labels {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 30px;
  flex-wrap: wrap;
}

.mood-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
}

.mood-emoji {
  font-size: 32px;
}

/* Final Slide */
.final-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30px;
  margin: 40px 0;
}

.final-stat-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 40px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: pop-in 0.6s ease forwards;
  opacity: 0;
}

.final-stat-card:nth-child(1) { animation-delay: 0.1s; }
.final-stat-card:nth-child(2) { animation-delay: 0.2s; }
.final-stat-card:nth-child(3) { animation-delay: 0.3s; }
.final-stat-card:nth-child(4) { animation-delay: 0.4s; }

.stat-number {
  font-size: 72px;
  font-weight: 900;
  background: linear-gradient(45deg, #ff006e, #8338ec);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.stat-label {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 10px;
}

.share-section {
  margin-top: 60px;
}

.share-section h3 {
  font-size: 24px;
  margin-bottom: 20px;
}

.share-btn,
.download-btn {
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 700;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 0 10px;
}

.share-btn {
  background: linear-gradient(135deg, #3a86ff, #06ffa5);
  color: white;
}

.download-btn {
  background: linear-gradient(135deg, #ff006e, #8338ec);
  color: white;
}

.share-btn:hover,
.download-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(131, 56, 236, 0.4);
}

/* Navigation Buttons */
.nav-buttons {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 20px;
  z-index: 100;
}

.nav-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .retro-year {
    font-size: 72px;
  }

  .retro-subtitle {
    font-size: 24px;
  }

  .slide-title {
    font-size: 36px;
  }

  .artists-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .final-stats-grid {
    grid-template-columns: 1fr;
  }

  .time-grid {
    grid-template-columns: 1fr;
  }
}
</style>
