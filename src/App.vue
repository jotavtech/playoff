<template>
  <div class="app">
    <!-- Elementos de Fundo -->
    <div class="background-overlay"></div>
    <div class="dynamic-background" :class="{ active: currentTrack }"></div>
    
    <!-- Banner de Aviso Spotify Premium -->
    <!-- Removido temporariamente pois está mostrando falso positivo para usuário Premium -->
    <div 
      v-if="false" 
      class="spotify-premium-banner"
    >
      <div class="banner-content">
        <i class="fas fa-exclamation-triangle"></i>
        <div class="banner-text">
          <strong>🚨 Spotify Premium Necessário</strong>
          <p>Música completa requer assinatura Premium. Atualmente apenas preview 30s disponível (botão 🎧)</p>
        </div>
        <a href="https://www.spotify.com/br/premium/" target="_blank" class="premium-link">
          Assinar Premium
        </a>
      </div>
    </div>
    
    <!-- Sistema de Notificações -->
    <NotificationContainer :notifications="notifications" />
    
    <!-- Botão de Login/Perfil -->
    <div class="user-section">
      <!-- Botão de Reconexão Player (aparece se player não estiver pronto ou tiver erro) -->
      <button 
        v-if="isAuthenticated && (!spotifyPlayerReady || spotifyError)" 
        class="reconnect-btn" 
        @click="initSpotifyPlayer(handleNextTrack)" 
        title="Reconectar Player"
      >
        <i class="fas fa-plug"></i>
      </button>

      <button class="queue-toggle-btn" @click="showQueueModal = true" title="Ver Fila">
        <i class="fas fa-list-ul"></i>
        <span v-if="queue.length > 0" class="queue-badge">{{ queue.length }}</span>
      </button>

      <button class="retrospective-btn" @click="showRetrospective = true" title="Resumo da Semana">
        <i class="fas fa-compact-disc"></i>
      </button>

      <button class="about-btn" @click="showAbout = true" title="Sobre o Dev">
        <i class="fas fa-fingerprint"></i>
      </button>

      <button v-if="!isAuthenticated" @click="showLoginModal = true" class="login-btn">
        <i class="fab fa-spotify"></i>
        <span>Entrar</span>
      </button>
      <button v-else @click="showProfileModal = true" class="profile-btn">
        <img :src="user?.profile_image || '/default-avatar.png'" :alt="user?.display_name" class="user-avatar" />
        <span class="user-name">{{ user?.display_name }}</span>
      </button>
    </div>

    <!-- Modais -->
    <LoginModal :showModal="showLoginModal" @close="showLoginModal = false" />
    <QueueModal v-if="showQueueModal" @close="showQueueModal = false" />
    <RetrospectiveModal 
      v-if="showRetrospective" 
      :songs="combinedSongs" 
      @close="showRetrospective = false" 
    />
    <AboutView 
      v-if="showAbout" 
      @close="showAbout = false" 
    />
    <UserProfile 
      v-if="showProfileModal" 
      :user="user" 
      @close="showProfileModal = false" 
      @logout="handleLogout"
      @play-song="handlePlaySong"
    />
    
    <div class="container">
      <!-- Conteúdo Principal -->
      <div class="main-content">
        <!-- Seção Hero com Player de Música -->
        <HeroSection 
          :current-track="currentTrack"
          :is-playing="isPlaying"
          :position="currentTime"
          :duration="totalDuration"
          :dominant-color="logoAccentColor"
          :format-time="formatTime"
          @toggle-playback="handleTogglePlayback"
          @previous-track="handlePreviousTrack"
          @next-track="handleNextTrack"
          @toggle-lyrics="handleToggleLyrics"
        />

        <!-- Busca de Músicas via Spotify -->
        <SpotifySearch 
          @add-song="handleAddSpotifySong" 
          @add-to-queue="handleAddToQueue"
        />

        <!-- Carrossel de Músicas para Votação -->
        <MusicCarousel 
          :songs="combinedSongs"
          :current-track="currentTrack"
          :is-playing="isPlaying"
          :is-lyrics-visible="showLyrics"
          @vote-for-song="handleVoteAndPlay"
          @super-vote="handleSuperVote"
          @play-song="handlePlaySong"
          @play-preview="handlePlayPreview"
          @add-to-queue="handleAddToQueue"
          @toggle-lyrics="handleToggleLyrics"
        />

        <!-- Letras da música -->
        <LyricsView 
          v-if="showLyrics"
          :lyrics="lyricsLines"
          :track="currentTrack"
          :current-line-index="currentLineIndex"
          :is-loading="isLoadingLyrics"
          :error="errorLyrics"
          :dominant-color="currentDominantColor"
          @close="showLyrics = false"
          @seek="handleSeek"
        />

        <!-- Footer Punk -->
        <TheFooter @open-about="showAbout = true" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useCloudinaryAudio } from './composables/useCloudinaryAudio'
import { usePlayOffApp } from './composables/usePlayOffApp'
import { useAuth } from './composables/useAuth'
import { useSpotifyPlayer } from './composables/useSpotifyPlayer'
import { useLyrics } from './composables/useLyrics'
import HeroSection from './components/HeroSection.vue'
import MusicCarousel from './components/MusicCarousel.vue'
import NotificationContainer from './components/NotificationContainer.vue'
import SpotifySearch from './components/SpotifySearch.vue'
import LoginModal from './components/LoginModal.vue'
import UserProfile from './components/UserProfile.vue'
import TheFooter from './components/TheFooter.vue'
import QueueModal from './components/QueueModal.vue'
import LyricsView from './components/LyricsView.vue'
import RetrospectiveModal from './components/RetrospectiveModal.vue'
import AboutView from './views/AboutView.vue'

// ============= CONFIGURAÇÃO DA API =============
// Usando URL relativa para aproveitar o proxy do Vite
// Isso evita problemas de CORS e portas
const API_URL = ''

// ============= COMPOSABLES E ESTADO =============
// Utilizo composables para separar responsabilidades e manter código organizado
// useCloudinaryAudio: gerencia reprodução de áudio e integração com APIs de música
// usePlayOffApp: gerencia estado da aplicação, votação e sincronização com backend

const {
  currentTrack,        // Música sendo reproduzida atualmente
  isPlaying: isAudioPlaying, // Status de reprodução HTML5
  position: audioPosition,   // Posição HTML5
  duration: audioDuration,   // Duração HTML5
  initializePlayer,   // Inicializar sistema de áudio
  playSong,          // Reproduzir uma música específica
  togglePlayback: toggleAudioPlayback,    // Alternar play/pause HTML5
  previousTrack,     // Ir para música anterior
  nextTrack,         // Ir para próxima música
  formatTime,        // Formatar tempo (ms para mm:ss)
  updateSongsList,   // Atualizar lista para navegação
  setTrack,          // Definir track sem tocar (para Spotify SDK)
  addToQueue,        // Adicionar à fila
  queue,             // Fila de reprodução
  searchAlbumCover   // Buscar capa e metadados (incluindo Spotify URL)
} = useCloudinaryAudio()

const {
  songs,              // Lista de músicas (estado bruto)
  sortedSongs,        // Músicas ordenadas por votos (computed)
  notifications,      // Lista de notificações ativas
  voteForSong,       // Função para votar em música
  superVote,         // Função para super voto
  showNotification,  // Mostrar notificação ao usuário
  initializeData,    // Carregar dados iniciais
  startUpdateLoops,  // Iniciar sincronização automática
  refreshSongs       // Atualizar músicas manualmente
} = usePlayOffApp()

// ============= AUTENTICAÇÃO SPOTIFY =============
const {
  user,               // Usuário autenticado
  isAuthenticated,    // Se está logado
  spotifyAccessToken, // Token de acesso do Spotify
  logout,             // Função de logout
  registerPlay,       // Registrar reprodução
  refreshToken        // Função para renovar token
} = useAuth()

// ============= SPOTIFY WEB PLAYER =============
const {
  deviceId,           // ID do dispositivo Spotify Web Player
  isReady: spotifyPlayerReady, // Se o player está pronto
  playTrack: playSpotifyTrack, // Tocar música no Spotify
  initializePlayer: initSpotifyPlayer, // Inicializar player
  position: spotifyPosition,
  duration: spotifyDuration,
  isPaused: isSpotifyPaused,
  togglePlay: toggleSpotifyPlayback,
  pause: pauseSpotify,
  resume: resumeSpotify,
  getCurrentState, // Importa função de sync
  seek: spotifySeek,
  error: spotifyError,
  currentTrack: spotifyCurrentTrack // Track do Spotify (local ou remoto)
} = useSpotifyPlayer()

// ============= SYNC REMOTO (CELULAR → WEB) =============
// Observa mudanças na track do Spotify (vindas do celular ou outro device)
// e atualiza a UI principal para refletir o que está tocando
watch(spotifyCurrentTrack, (newSpotifyTrack) => {
  if (!newSpotifyTrack) return

  // Se a música atual da UI já é a mesma do Spotify, não faz nada (evita loop)
  if (currentTrack.value && (
      currentTrack.value.id === newSpotifyTrack.id || 
      currentTrack.value.spotifyUrl?.includes(newSpotifyTrack.id)
  )) {
    return
  }

  // Se estamos tocando preview (HTML5) ativamente, ignoramos sync remoto
  // para não interromper a experiência local
  if (isAudioPlaying.value) return

  console.log('🔄 App.vue: Sincronizando com Spotify Remoto:', newSpotifyTrack.name)

  // Converte track do Spotify para formato do App
  const mappedTrack = {
    id: newSpotifyTrack.id,
    title: newSpotifyTrack.name,
    artist: newSpotifyTrack.artist,
    album: newSpotifyTrack.album,
    albumCover: newSpotifyTrack.albumCover,
    spotifyUrl: newSpotifyTrack.uri, // URI para play
    duration_ms: newSpotifyTrack.duration_ms,
    duration: newSpotifyTrack.duration_ms, // Compatibilidade
    audioUrl: null // Não tem audio HTML5
  }

  // Atualiza a track principal da UI
  setTrack(mappedTrack)
  
  // Se lyrics estiver aberta, busca nova letra
  if (showLyrics.value) {
    fetchLyrics(mappedTrack.title, mappedTrack.artist, mappedTrack.duration_ms)
  }
})


// ============= LETRAS DA MÚSICA =============
const { 
  lyrics: lyricsLines, 
  currentLineIndex, 
  isLoadingLyrics, 
  errorLyrics, 
  fetchLyrics, 
  updateCurrentLine 
} = useLyrics()

// ============= COMPUTED TIME & STATE =============
// Unifica estado dos dois players (HTML5 e Spotify)

// ============= COMPUTED LISTS =============
// Combina lista de votação com a fila de reprodução para exibição
const combinedSongs = computed(() => {
  const list = []
  const ids = new Set()

  // 1. Current Track (se existir)
  if (currentTrack.value) {
    list.push(currentTrack.value)
    ids.add(currentTrack.value.id)
  }

  // 2. Queue (Fila de prioridade)
  if (queue.value && queue.value.length > 0) {
    queue.value.forEach(song => {
      if (!ids.has(song.id)) {
        list.push(song)
        ids.add(song.id)
      }
    })
  }

  // 3. Vote List (Restante da lista ordenada)
  if (sortedSongs.value && sortedSongs.value.length > 0) {
    sortedSongs.value.forEach(song => {
      if (!ids.has(song.id)) {
        list.push(song)
        ids.add(song.id)
      }
    })
  }

  return list
})

const isSpotifyActive = computed(() => {
  // Se o HTML5 estiver tocando, prioriza ele (modo preview)
  if (isAudioPlaying.value) return false
  
  // Se tem URL do Spotify e está autenticado, considera modo Spotify ativo
  // (Mesmo que seja reprodução remota em outro dispositivo)
  return currentTrack.value?.spotifyUrl && isAuthenticated.value
})

const currentTime = computed(() => {
  return isSpotifyActive.value ? spotifyPosition.value : audioPosition.value
})

const totalDuration = computed(() => {
  return isSpotifyActive.value ? spotifyDuration.value : audioDuration.value
})

const isPlaying = computed(() => {
  return isSpotifyActive.value ? !isSpotifyPaused.value : isAudioPlaying.value
})

const currentDominantColor = computed(() => {
  if (logoAccentColor.value && logoAccentColor.value.length === 3) {
    const [r, g, b] = logoAccentColor.value
    return `rgb(${r}, ${g}, ${b})`
  }
  return '#ff6b6b'
})

// ============= ESTADO DA UI =============
const showLoginModal = ref(false)
const showProfileModal = ref(false)
const showQueueModal = ref(false)
const showRetrospective = ref(false)
const showAbout = ref(false)
const showLyrics = ref(false)
const logoAccentColor = ref([255, 107, 107]) // RGB Array default
const lastLocalInteraction = ref(0) // Timestamp da última interação local
const userHasInteracted = ref(false) // Track if user has clicked on the page
const isPlayingPreview = ref(false) // Track if currently playing a preview (30s)
const sdkInitAttempted = ref(false) // Track if SDK initialization was attempted

// Aguarda 5 segundos antes de mostrar banner (dá tempo do SDK carregar)
setTimeout(() => {
  sdkInitAttempted.value = true
}, 5000)

// Lyrics Handlers
const handleToggleLyrics = () => {
  showLyrics.value = !showLyrics.value
  if (showLyrics.value && currentTrack.value) {
    fetchLyrics(currentTrack.value.title, currentTrack.value.artist, currentTrack.value.duration)
  }
}

const handleSeek = async (timeSeconds) => {
  lastLocalInteraction.value = Date.now()
  const ms = timeSeconds * 1000
  if (isSpotifyActive.value) {
    await spotifySeek(ms)
  } else {
    seek(ms)
  }
}

// Sync lyrics with position
watch(() => currentTime.value, (newPos) => {
  if (showLyrics.value) {
    updateCurrentLine(newPos / 1000)
  }
})

// Fetch lyrics on track change if lyrics mode is active
watch(currentTrack, (newTrack) => {
  if (showLyrics.value && newTrack) {
    fetchLyrics(newTrack.title, newTrack.artist, newTrack.duration)
  }
})

// ============= LÓGICA DE AUTO-REPRODUÇÃO =============
// Sistema inteligente que automaticamente reproduz a música mais votada
// quando há mudanças na liderança. Isso torna a experiência mais dinâmica
// e recompensa imediatamente a música que está ganhando mais votos

const checkAndPlayHighestVoted = async () => {
  // Verifico se o usuário já interagiu (necessário para auto-play no browser)
  if (!userHasInteracted.value) {
    console.log('⏸️ Auto-reprodução bloqueada - aguardando interação do usuário')
    return
  }
  
  // Verifico se há músicas disponíveis
  if (sortedSongs.value.length === 0) {
    console.log('📭 Nenhuma música disponível para auto-reprodução')
    return
  }
  
  // Se já estiver tocando algo, não interrompe! (Correção para evitar trocas indesejadas)
  if (isPlaying.value) {
    console.log('⏸️ Música já está tocando - auto-reprodução cancelada para não interromper')
    return
  }
  
  // Obtenho a música mais votada (primeira na lista ordenada)
  const highestVoted = sortedSongs.value[0]
  
  // Só reproduzo automaticamente se:
  // 1. A música tem pelo menos 1 voto (evita tocar músicas sem engajamento)
  // 2. É diferente da música atual (evita reiniciar a mesma música)
  const shouldAutoPlay = highestVoted.votes > 0 && 
                         (!currentTrack.value || currentTrack.value.id !== highestVoted.id)
  
  if (shouldAutoPlay) {
    console.log(`🏆 Auto-reproduzindo música líder: "${highestVoted.title}" (${highestVoted.votes} votos)`)
    // Música líder também só toca se tiver Spotify, não cai para preview
    await handlePlaySong(highestVoted)
  } else {
    console.log(`⏸️ Auto-reprodução não necessária - música já é a atual ou sem votos`)
  }
}

// ============= HANDLERS DE EVENTOS =============
// Funções que lidam com interações do usuário e coordenam ações entre composables

// Handler para voto simples + verificação de auto-reprodução
// Esta função demonstra como coordeno diferentes sistemas: votação e reprodução
const handleVoteAndPlay = async (songId) => {
  userHasInteracted.value = true
  console.log(`🗳️ App.vue: Processando voto para música ID: ${songId}`)
  
  // Executo o voto através do composable
  const votedSong = await voteForSong(songId)
  
  if (votedSong) {
    console.log(`✅ Voto registrado para "${votedSong.title}" - nova contagem: ${votedSong.votes}`)
    
    // Aguardo um momento para que o voto seja processado e a lista reordenada
    // Então verifico se esta música agora deve ser auto-reproduzida
    setTimeout(() => {
      console.log('🔄 Verificando se nova música deve ser auto-reproduzida...')
      checkAndPlayHighestVoted()
    }, 500) // Delay de 500ms para garantir processamento do voto
  } else {
    console.log('❌ Falha no voto - não verificando auto-reprodução')
  }
}

// Handler para super voto (voto + reprodução imediata garantida)
// O super voto tenta sempre tocar a música completa via Spotify
const handleSuperVote = async (song) => {
  try {
    console.log(`⚡ App.vue: Processando super voto para "${song.title}"`)
    
    // Executo o super voto passando a música atual como referência
    // Isso permite calcular quantos votos são necessários para assumir liderança
    const superVotedSong = await superVote(song.id, currentTrack.value)
    
    if (superVotedSong) {
      console.log(`⚡ Super voto executado: "${superVotedSong.title}" agora tem ${superVotedSong.votes} votos`)
      
      // Reproduzo imediatamente (característica do super voto)
      const played = await handlePlaySong(song)
      
      if (played) {
        // Feedback específico para super voto
        showNotification(`⚡ Super Voto! Tocando imediatamente: ${song.title}`, 'success')
      } else {
        // Falha técnica no Spotify - Tenta fallback para preview
        console.warn('⚠️ Spotify falhou no Super Voto - Tentando fallback para preview...')
        
        const previewPlayed = await handlePlayPreview(song)
        
        if (previewPlayed) {
          showNotification(`⚡ Super Voto! Tocando preview (Spotify indisponível)`, 'warning')
        } else {
          // Falha total
          console.error('🚨 SUPER VOTO FALHOU - Erro ao conectar com o Spotify Web Player e sem preview')
          console.log('📋 Detalhes:')
          console.log('   - Super Voto executado ✅')
          console.log('   - Tentou tocar via Spotify SDK ❌')
          console.log('   - Tentou tocar preview ❌')
          
          showNotification(
            `⚡ Super Voto executado! Mas não foi possível tocar a música. Verifique sua conexão com o Spotify.`,
            'warning'
          )
        }
      }
    }
  } catch (error) {
    console.error('❌ App.vue: Erro crítico no super voto:', error)
    showNotification('Erro no super voto - tente novamente', 'error')
  }
}

// Handler principal para reprodução de músicas
// Centraliza toda a lógica de reprodução e logging detalhado para debugging
const handlePlaySong = async (song) => {
  lastLocalInteraction.value = Date.now()
  userHasInteracted.value = true
  isPlayingPreview.value = false // Playing full song, not preview

  try {
    console.log(`🎵 App.vue: Iniciando reprodução de "${song.title}" por ${song.artist}`)
    console.log('📋 Dados da música:', {
      id: song.id,
      title: song.title,
      artist: song.artist,
      spotifyUrl: song.spotifyUrl || '(não tem)',
      audioUrl: song.audioUrl ? '(tem preview)' : '(sem preview)'
    })
    console.log('🔐 Estado Spotify:', {
      isAuthenticated: isAuthenticated.value,
      spotifyPlayerReady: spotifyPlayerReady.value,
      hasToken: !!spotifyAccessToken.value,
      deviceId: deviceId.value || '(nenhum)'
    })

    // Log detalhado se player não está pronto
    if (!spotifyPlayerReady.value && isAuthenticated.value) {
      console.log('⏳ Spotify Player não está pronto ainda')
      console.log(`   - Device ID: ${deviceId.value || 'aguardando...'}`)
      console.log(`   - Token: ${spotifyAccessToken.value ? 'OK' : 'FALTANDO'}`)
    }

    // Tenta encontrar Spotify URL se não existir e estiver logado
    if (!song.spotifyUrl && isAuthenticated.value) {
      console.log('🔍 Buscando URL do Spotify para tocar versão completa...')
      try {
        const meta = await searchAlbumCover(song.artist, song.title)
        if (meta && meta.spotifyUrl) {
          console.log(`✅ Spotify URL encontrado: ${meta.spotifyUrl}`)
          song.spotifyUrl = meta.spotifyUrl
          // Atualiza também o objeto original na lista se possível para não buscar de novo
          const original = songs.value.find(s => s.id === song.id)
          if (original) original.spotifyUrl = meta.spotifyUrl
        } else {
          console.log('⚠️ Não foi possível encontrar URL do Spotify')
        }
      } catch (e) {
        console.warn('⚠️ Falha ao buscar metadados do Spotify:', e)
      }
    }

    // OPÇÃO 1: Tocar via Spotify SDK (se logado e tiver URL)
    if (song.spotifyUrl && isAuthenticated.value) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🟢 INICIANDO PLAYBACK VIA SPOTIFY WEB SDK')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`📋 Música: ${song.title} - ${song.artist}`)
      console.log(`🔗 Spotify URL: ${song.spotifyUrl}`)
      console.log('')
      console.log('🔍 VERIFICAÇÃO DE ESTADO:')
      console.log(`   ✓ isAuthenticated: ${isAuthenticated.value}`)
      console.log(`   ✓ spotifyPlayerReady: ${spotifyPlayerReady.value}`)
      console.log(`   ✓ hasToken: ${!!spotifyAccessToken.value}`)
      console.log(`   ✓ deviceId: ${deviceId.value || '❌ NENHUM'}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // Se o player não estiver pronto, espera um pouco
      if (!spotifyPlayerReady.value) {
        console.log('⏳ AGUARDANDO PLAYER FICAR PRONTO...')
        console.log('   Máximo: 10 segundos')
        // Tenta esperar até 10 segundos
        let attempts = 0
        while (!spotifyPlayerReady.value && attempts < 100) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++

          // Log a cada 2 segundos
          if (attempts % 20 === 0) {
            console.log(`   ⏱️ ${attempts / 10}s - Player: ${spotifyPlayerReady.value ? 'PRONTO' : 'aguardando'} | Device: ${deviceId.value || 'nenhum'}`)
          }
        }

        console.log('')
        if (!spotifyPlayerReady.value) {
          console.error('❌❌❌ TIMEOUT AGUARDANDO PLAYER (10s) ❌❌❌')
          console.error('Estado após timeout:')
          console.error(`   - spotifyPlayerReady: ${spotifyPlayerReady.value}`)
          console.error(`   - deviceId: ${deviceId.value || 'NENHUM'}`)
          console.error(`   - isAuthenticated: ${isAuthenticated.value}`)
          console.error(`   - Token presente: ${!!spotifyAccessToken.value}`)
          console.error('')
          console.error('💡 O Player não inicializou. Verifique:')
          console.error('   1. Se o Spotify Web Player/SDK carregou corretamente no navegador')
          console.error('   2. Mensagens de erro do SDK acima (rede / autenticação)')
          console.error('   3. Recarregue a página (F5) ou clique no botão 🔌 para tentar reconectar')
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          // Continua para tentar HTML5
        } else {
          console.log(`✅ PLAYER FICOU PRONTO após ${attempts * 100}ms`)
          console.log(`   Device ID: ${deviceId.value}`)
        }
      } else {
        console.log('✅ PLAYER JÁ ESTAVA PRONTO')
        console.log(`   Device ID: ${deviceId.value}`)
      }

      if (spotifyPlayerReady.value) {
        console.log('')
        console.log('🎵 PREPARANDO PLAYBACK...')
        // Extração robusta do ID do Spotify
        let spotifyId = ''
        if (song.spotifyUrl.includes('spotify:track:')) {
          spotifyId = song.spotifyUrl.split(':').pop()
          console.log('   Formato: URI (spotify:track:...)')
        } else {
          spotifyId = song.spotifyUrl.split('/').pop().split('?')[0]
          console.log('   Formato: URL (https://open.spotify.com/...)')
        }

        const spotifyUri = `spotify:track:${spotifyId}`
        console.log(`   Track ID: ${spotifyId}`)
        console.log(`   URI Final: ${spotifyUri}`)
        console.log('')
        console.log('▶️ CHAMANDO playSpotifyTrack()...')

        const success = await playSpotifyTrack(spotifyUri)

        console.log('')
        console.log('📊 RESULTADO DO PLAYBACK:')
        console.log(`   Status: ${success ? '✅ SUCESSO' : '❌ FALHOU'}`)

        if (success) {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          console.log('✅✅✅ SPOTIFY PLAYBACK INICIADO COM SUCESSO! ✅✅✅')
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          console.log(`   🎵 Música: ${song.title}`)
          console.log(`   👤 Artista: ${song.artist}`)
          console.log(`   🎧 Device: ${deviceId.value}`)
          console.log(`   ⏱️ Duração: ${song.duration_ms ? (song.duration_ms / 1000 / 60).toFixed(2) : '?'} min`)
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

          await setTrack(song)

          if (song.id) {
            // Tenta usar a duração da música se disponível, senão usa 0
            // Isso corrige o problema de não contar tempo no histórico
            const trackDuration = song.duration_ms || song.duration || 0

            await registerPlay({
              spotifyId: spotifyId,
              duration: trackDuration,
              completed: false
            })
          }

          showNotification(`🎵 Spotify: ${song.title}`, 'success')
          return true
        } else {
          console.error('❌ Falha ao tocar no Spotify SDK')
          showNotification('Falha ao tocar no Spotify', 'error')
        }
      }
    }

    // Se chegou aqui, Spotify SDK falhou ou não está disponível
    // NÃO toca preview automaticamente - usuário deve usar botão Preview

    if (song.spotifyUrl && isAuthenticated.value) {
      // Tentou Spotify mas falhou
      console.log('❌ Spotify SDK não disponível - NÃO atualizando UI')
      console.log('🚨 Diagnóstico:')
      console.log(`   - Player Ready: ${spotifyPlayerReady.value}`)
      console.log(`   - Device ID: ${deviceId.value || 'NENHUM'}`)
      console.log(`   - Token: ${spotifyAccessToken.value ? 'OK' : 'FALTANDO'}`)
      console.log('')

      if (!deviceId.value) {
        console.error('❌ PROBLEMA: Device ID não foi criado!')
        console.log('💡 Diagnóstico Avançado:')
        console.log('   - Verifique se você está logado no Spotify Web Player')
        console.log('   - Tentando reconectar automaticamente...')
        // Tenta reinicializar silenciosamente com callback de next track
        if (spotifyAccessToken.value) initSpotifyPlayer(handleNextTrack)
      }

      // Feedback mais suave
      showNotification(
        'Tentando conectar ao Spotify... Aguarde um momento e tente novamente.',
        'info'
      )
      // NÃO chama setTrack - não atualiza UI se não está tocando
      return false
    }

    if (song.spotifyUrl && !isAuthenticated.value) {
      // Música do Spotify mas usuário não está logado
      console.log('⚠️ Música do Spotify requer login - NÃO atualizando UI')
      showNotification(
        `Faça login no Spotify para ouvir "${song.title}". Ou use o botão Preview para 30s.`,
        'warning'
      )
      // NÃO chama setTrack - não atualiza UI se não está tocando
      return false
    }

    // Música sem Spotify URL - não tem como tocar
    console.log('❌ Sem fonte de áudio (nem Spotify nem preview)')
    showNotification(`Sem áudio disponível para "${song.title}"`, 'error')
    return false

  } catch (error) {
    console.error('❌ App.vue: Erro ao reproduzir música:', error)
    showNotification('Erro ao tentar tocar música', 'error')
    return false
  }
}

// Handler para tocar PREVIEW (30 segundos) da música
// Esta função é chamada apenas quando o usuário clica explicitamente no botão Preview
const handlePlayPreview = async (song) => {
  lastLocalInteraction.value = Date.now()
  userHasInteracted.value = true
  isPlayingPreview.value = true // Mark that we're in preview mode
  
  try {
    console.log(`🎧 App.vue: Tocando PREVIEW (30s) de "${song.title}" por ${song.artist}`)
    console.log(`📋 Preview - audioUrl: ${song.audioUrl ? '(tem)' : '(vai buscar)'}`)    
    console.log(`📋 Preview - albumCover: ${song.albumCover}`)    
    
    // Sempre usa o player HTML5 com preview
    const result = await playSong(song)
    
    if (result) {
      showNotification(`🎵 Preview (30s): ${song.title}`, 'info')
      return true
    } else {
      isPlayingPreview.value = false
      showNotification(`Sem preview disponível para "${song.title}"`, 'error')
      return false
    }
  } catch (error) {
    isPlayingPreview.value = false
    console.error('❌ Erro ao tocar preview:', error)
    showNotification('Erro ao tocar preview', 'error')
    return false
  }
}

// Handler especial para auto-play quando adiciona música
// Tenta Spotify mas cai automaticamente para preview se falhar
const handleAutoPlaySong = async (song) => {
  console.log(`🎵 Auto-play: tentando tocar "${song.title}"`)
  
  // Tenta tocar via Spotify SDK primeiro
  const spotifySuccess = await handlePlaySong(song)
  
  if (spotifySuccess) {
    console.log('✅ Auto-play via Spotify SDK bem-sucedido')
    return true
  }
  
  // Se Spotify falhou, cai automaticamente para preview
  console.log('⚠️ Spotify falhou, usando preview automaticamente...')
  await handlePlayPreview(song)
  return true
}

// Handler para adicionar música do Spotify
const handleAddSpotifySong = async (track) => {
  try {
    console.log(`🎵 Adicionando música do Spotify: ${track.name} - ${track.artist}`)
    
    // Prepara headers com autenticação opcional
    const headers = { 'Content-Type': 'application/json' }
    const spotifyId = localStorage.getItem('spotify_id')
    if (spotifyId) {
      headers['Authorization'] = `Bearer ${spotifyId}`
    }

    // Adiciona a música via API
    const response = await fetch(`${API_URL}/api/songs`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        title: track.name,
        artist: track.artist,
        album: track.album,
        albumCover: track.albumCover,
        audioUrl: track.previewUrl || '',
        spotifyUrl: track.spotifyUrl || '',
        duration_ms: track.duration,
        year: new Date().getFullYear()
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      showNotification(`✅ "${track.name}" adicionada à votação!`, 'success')
      await refreshSongs()
      
      // Auto-reproduz a música adicionada
      // Usa o objeto retornado pelo servidor para garantir que temos os dados corretos
      if (result.song) {
        console.log(`▶️ Auto-reproduzindo música adicionada: ${result.song.title}`)
        // Pequeno delay para garantir que o player esteja pronto para receber comandos
        setTimeout(() => {
          handleAutoPlaySong(result.song)
        }, 500)
      }
    } else {
      const error = await response.json()
      showNotification(error.error || 'Erro ao adicionar música', 'error')
    }
  } catch (error) {
    console.error('❌ Erro ao adicionar música:', error)
    showNotification('Erro ao adicionar música', 'error')
  }
}

// Handler para adicionar à fila
const handleAddToQueue = (song) => {
  try {
    const success = addToQueue(song)
    if (success) {
      showNotification(`📥 Adicionado à fila: ${song.title}`, 'success')
      // Abre o modal automaticamente para mostrar a fila
      showQueueModal.value = true
    } else {
      showNotification('Música já está na fila', 'warning')
      showQueueModal.value = true // Abre mesmo assim para mostrar
    }
  } catch (error) {
    console.error('❌ Erro ao adicionar à fila:', error)
    showNotification('Erro ao adicionar à fila', 'error')
  }
}

// ============= GERENCIAMENTO DE CORES DINÂMICAS =============
// Sistema que extrai cores das capas dos álbuns e aplica temas dinâmicos
// Isso cria uma experiência visual mais imersiva e personalizada

const handleAlbumColorExtracted = (event) => {
  try {
    console.log('🎨 App.vue: Evento de extração de cor recebido:', event.detail)
    
    // Extraio informações do evento personalizado
    const { 
      dominant,        // Cor dominante [r, g, b]
      palette,         // Paleta de cores [[r,g,b], ...]
      theme,          // Tema determinado (warm, cool, vibrant, neutral)
      brightness,     // Brilho da imagem (0-1)
      albumCover     // URL da capa analisada
    } = event.detail || {}
    
    // Aplico o tema extraído ao documento
    // Isso muda as cores de fundo, gradientes e elementos da interface
    if (theme) {
      const body = document.body
      const themes = ['theme-warm', 'theme-cool', 'theme-vibrant', 'theme-neutral', 'theme-black']
      
      // Removo temas anteriores
      themes.forEach(t => body.classList.remove(t))
      
      // Aplico novo tema
      body.classList.add(`theme-${theme}`)
      
      console.log(`🎨 Tema aplicado: ${theme}`)
      if (Array.isArray(dominant)) {
        console.log(`🌈 Cor dominante: rgb(${dominant.join(', ')})`)
      }
      if (typeof brightness === 'number') {
        console.log(`💡 Brilho detectado: ${brightness.toFixed(2)}`)
      }
    }

    if (Array.isArray(dominant) && dominant.length === 3) {
      logoAccentColor.value = dominant
    } else {
      logoAccentColor.value = [255, 107, 107]
    }
  } catch (error) {
    console.error('❌ Erro ao processar cores do álbum:', error)
    // Em caso de erro, mantenho tema padrão
    document.body.classList.add('theme-black')
    logoAccentColor.value = [255, 107, 107]
  }
}

// ============= WATCHERS REATIVOS =============
// Observadores que reagem a mudanças de estado e mantêm sincronização

// Inicializa o player do Spotify quando o usuário faz login ou o token muda
watch([() => spotifyAccessToken.value, () => isAuthenticated.value], ([newToken, isAuth]) => {
  if (newToken && isAuth && !spotifyPlayerReady.value) {
    console.log('🎧 Inicializando Spotify Web Player (Token e Auth detectados)...')
    // Passa handleNextTrack para garantir auto-play
    initSpotifyPlayer(handleNextTrack)
  }
}, { immediate: true })

// Observo mudanças na lista combinada (Queue + Voting) para atualizar navegação
// Isso garante que as funções "próxima/anterior" funcionem com a fila
watch(combinedSongs, (newSongs) => {
  if (newSongs && newSongs.length > 0) {
    // console.log(`🔄 App.vue: Atualizando lista de navegação com ${newSongs.length} músicas`)
    updateSongsList(newSongs)
  }
}, { deep: true, immediate: true }) // deep: true para mudanças internas, immediate: true para execução inicial

// ============= HANDLERS DE NAVEGAÇÃO =============
// Funções que permitem navegar entre músicas com tratamento de erro

const handleTogglePlayback = async () => {
  lastLocalInteraction.value = Date.now()
  userHasInteracted.value = true
  if (isSpotifyActive.value) {
    await toggleSpotifyPlayback()
  } else {
    toggleAudioPlayback()
  }
}

const handlePreviousTrack = async () => {
  try {
    console.log('⏮️ App.vue: Navegando para música anterior...')
    
    const list = combinedSongs.value
    if (!list || list.length === 0) return

    const currentIndex = list.findIndex(s => s.id === currentTrack.value?.id)
    let prevIndex = currentIndex - 1
    
    if (prevIndex < 0) prevIndex = list.length - 1 // Loop
    
    const prevSong = list[prevIndex]
    if (prevSong) {
      // Anterior pode usar preview se Spotify falhar (experiência contínua)
      await handleAutoPlaySong(prevSong)
      console.log(`✅ Navegação para anterior concluída: ${prevSong.title}`)
    }
  } catch (error) {
    console.error('❌ Erro ao navegar para música anterior:', error)
    showNotification('Erro ao navegar para música anterior', 'error')
  }
}

const handleNextTrack = async () => {
  try {
    console.log('⏭️ App.vue: Navegando para próxima música...')
    
    const list = combinedSongs.value
    if (!list || list.length === 0) return

    // Se a música atual não está na lista (ex: recém acabada e removida da fila?), fallback para primeiro
    const currentIndex = list.findIndex(s => s.id === currentTrack.value?.id)
    
    // Lógica para quando a música atual é a última da fila
    // Como a lista muda dinamicamente (fila é consumida), o próximo sempre será o índice 1 se o atual for 0?
    // Não necessariamente.
    
    let nextIndex = currentIndex + 1
    
    if (currentIndex === -1) {
       nextIndex = 0
    }
    
    if (nextIndex >= list.length) nextIndex = 0 // Loop
    
    const nextSong = list[nextIndex]
    
    // Se a próxima música for da fila, removemos ela da fila ao tocar?
    // Não, handlePlaySong vai definir currentTrack.
    // O watcher de combinedSongs vai re-computar.
    // Se nextSong estava na queue, ao virar currentTrack, ela sai da queue (visualmente) mas entra como current.
    // Porém, precisamos remover da `queue` ref manualmente se ela for consumida?
    // Sim, `handleNextTrack` consome a fila.
    
    // Verifico se a próxima música está na fila para removê-la
    // Mas `combinedSongs` é computed. Eu preciso modificar `queue`.
    const isNextInQueue = queue.value.some(q => q.id === nextSong.id)
    if (isNextInQueue) {
      console.log(`📥 Removendo "${nextSong.title}" da fila (sendo tocada)`)
      // Removemos da fila pois ela vai virar currentTrack
      // Encontra index na queue original
      const qIndex = queue.value.findIndex(q => q.id === nextSong.id)
      if (qIndex !== -1) queue.value.splice(qIndex, 1)
    }

    if (nextSong) {
      // Próxima música pode usar preview se Spotify falhar (experiência contínua)
      await handleAutoPlaySong(nextSong)
      console.log(`✅ Navegação para próxima concluída: ${nextSong.title}`)
    }
  } catch (error) {
    console.error('❌ Erro ao navegar para próxima música:', error)
    showNotification('Erro ao navegar para próxima música', 'error')
  }
}

// ============= HANDLER DE LOGOUT =============
const handleLogout = () => {
  logout()
  showProfileModal.value = false
  showNotification('👋 Até logo! Você foi desconectado.', 'info')
}

const lastSpotifySyncTime = ref(0) // Timestamp da última sync com a API
const lastSpotifySyncPosition = ref(0) // Posição recebida na última sync
let isRefreshingToken = false // Flag para evitar concorrência de refresh

// ============= SINCRONIZAÇÃO SPOTIFY EXTERNO =============
const startSpotifySync = () => {
  setInterval(async () => {
    // Se não estiver autenticado ou já estiver tentando renovar token, pula
    if (!isAuthenticated.value || isRefreshingToken) return

    // Passa token explicitamente para garantir uso do mais atual
    const state = await getCurrentState(spotifyAccessToken.value)
    
    if (state && state.error === 401) {
      console.log('🔄 Token expirado durante sync, tentando renovar...')
      
      isRefreshingToken = true
      try {
        const refreshed = await refreshToken()
        if (refreshed) {
           console.log('✅ Token renovado, sync retomará no próximo ciclo')
           // Se o player estava pronto, pode precisar reinicializar
           if (spotifyPlayerReady.value) {
             initSpotifyPlayer(handleNextTrack)
           }
        } else {
           console.warn('⚠️ Falha crítica ao renovar token - deslogando usuário')
           logout() // Força logout para parar o ciclo de erros
        }
      } catch (e) {
        console.error('Erro no refresh:', e)
      } finally {
        isRefreshingToken = false
      }
      return
    }
    
    if (state && state.item) {
      // Verifica se houve interação local recente (últimos 10s)
      // Isso previne que o estado antigo do Spotify (em outro device) sobrescreva nossa ação recente
      if (Date.now() - lastLocalInteraction.value < 10000) {
        return
      }

      // Verifica se o device ativo é o próprio Web Player do PlayOff
      const isLocalDevice = state.device && deviceId.value && state.device.id === deviceId.value
      
      // Se estiver tocando áudio HTML5 localmente, não deixa o Spotify externo atropelar
      if (isAudioPlaying.value) {
        return
      }

      // SEMPRE atualiza se estiver tocando no Spotify, independente do device
      // O usuário quer ver o que está tocando no celular
      if (state.is_playing || (state.item && !isLocalDevice)) {
        
        const track = {
          id: state.item.id,
          title: state.item.name,
          artist: state.item.artists.map(a => a.name).join(', '),
          album: state.item.album.name,
          albumCover: state.item.album.images[0]?.url,
          spotifyUrl: state.item.external_urls?.spotify,
          duration: state.item.duration_ms,
          votes: 0,
          isExternalDevice: !isLocalDevice
        }

        // Atualiza track atual apenas se mudou
        if (!currentTrack.value || currentTrack.value.id !== track.id) {
          console.log(`🔄 Sincronizando música do Spotify (${!isLocalDevice ? 'Celular/PC' : 'Web'}): ${track.title}`)
          await setTrack(track)
          
          // Registra no histórico se for música nova
          await registerPlay({
            spotifyId: track.id,
            duration: track.duration,
            completed: false
          })
        }
        
        // Sincroniza estado de pause/play
        isSpotifyPaused.value = !state.is_playing
        
        // ATUALIZAÇÃO PRECISA DO TEMPO
        // Salva o timestamp e a posição exata deste momento para interpolação
        lastSpotifySyncTime.value = Date.now()
        lastSpotifySyncPosition.value = state.progress_ms
        
        spotifyPosition.value = state.progress_ms
        spotifyDuration.value = state.item.duration_ms

        // Se for device externo, garantimos que o app saiba que está tocando
        if (!isLocalDevice && state.is_playing) {
           isSpotifyPaused.value = false
        }
      }
    }
  }, 1000) // Polling a cada 1s (mais rápido para responsividade)
}

// ============= INTERPOLAÇÃO LOCAL DE TEMPO =============
const startLocalInterpolation = () => {
  // Loop de alta frequência (60fps aprox) para suavidade total
  setInterval(() => {
    // Se Spotify está ativo e tocando (e temos dados de sync)
    if (isSpotifyActive.value && !isSpotifyPaused.value && lastSpotifySyncTime.value > 0) {
      
      // Calcula quanto tempo passou desde a última sync da API
      const delta = Date.now() - lastSpotifySyncTime.value
      
      // Nova posição é a posição original + o tempo decorrido
      // Isso garante sincronia perfeita sem "drift" acumulativo
      const newPos = lastSpotifySyncPosition.value + delta
      
      // Só atualiza se não passou da duração total
      if (spotifyDuration.value > 0 && newPos <= spotifyDuration.value) {
        spotifyPosition.value = newPos
      } else if (spotifyDuration.value > 0 && newPos > spotifyDuration.value) {
        spotifyPosition.value = spotifyDuration.value
      }
    }
  }, 30) // 33ms ~ 30fps para UI suave
}

// ============= CICLO DE VIDA DO COMPONENTE =============

// Inicialização quando o componente é montado
onMounted(async () => {
  console.log('🚀 App.vue: Iniciando aplicação PlayOff Vue...')
  
  try {
    // Sequência de inicialização ordenada
    console.log('🔧 1/4: Inicializando player de áudio...')
    await initializePlayer()
    
    // Tenta inicializar Spotify Player se autenticado
    const tryInitSpotify = () => {
      console.log('🔍 Verificando condições para Spotify Player...')
      console.log(`   - isAuthenticated: ${isAuthenticated.value}`)
      console.log(`   - spotifyAccessToken: ${spotifyAccessToken.value ? 'PRESENTE' : 'AUSENTE'}`)
      console.log(`   - spotifyPlayerReady: ${spotifyPlayerReady.value}`)
      console.log(`   - deviceId: ${deviceId.value || 'nenhum'}`)
      
      if (isAuthenticated.value && spotifyAccessToken.value && !spotifyPlayerReady.value) {
        console.log('✅ Condições OK - Inicializando Spotify Web Player...')
        
        // Verifica se SDK script está carregado
        if (typeof window.Spotify === 'undefined') {
          console.warn('⚠️ Spotify SDK script não detectado ainda! Player tentará conectar assim que carregar.')
        }
        
        initSpotifyPlayer(handleNextTrack)
        return true
      } else {
        if (!isAuthenticated.value) console.log('   ❌ Não autenticado')
        if (!spotifyAccessToken.value) console.log('   ❌ Token ausente')
        if (spotifyPlayerReady.value) console.log('   ℹ️ Player já está pronto')
      }
      return false
    }
    
    // Tenta agora
    console.log('🎯 Tentativa 1/4 de inicializar Spotify Player...')
    if (!tryInitSpotify()) {
      // Se não conseguiu, tenta de novo após 500ms (token pode não ter carregado ainda)
      setTimeout(() => {
        if (!spotifyPlayerReady.value) {
          console.log('🔄 Tentativa 2/4: Retry após 500ms...')
          tryInitSpotify()
        }
      }, 500)
      
      // E mais uma vez após 1.5s para garantir
      setTimeout(() => {
        if (!spotifyPlayerReady.value && isAuthenticated.value) {
          console.log('🔄 Tentativa 3/4: Retry após 1.5s...')
          tryInitSpotify()
        }
      }, 1500)
      
      // Tentativa final após 3s
      setTimeout(() => {
        if (!spotifyPlayerReady.value && isAuthenticated.value) {
          console.log('🔄 Tentativa 4/4 (FINAL): Retry após 3s...')
          const success = tryInitSpotify()
          
          if (!success && isAuthenticated.value) {
            console.error('❌ FALHA: Spotify Player não inicializou após 4 tentativas!')
            console.log('📋 Estado final:')
            console.log(`   - Auth: ${isAuthenticated.value}`)
            console.log(`   - Token: ${spotifyAccessToken.value ? 'OK' : 'FALTANDO'}`)
            console.log(`   - SDK: ${typeof window.Spotify !== 'undefined' ? 'Carregado' : 'NÃO carregado'}`)
            console.log(`   - Device: ${deviceId.value || 'NENHUM'}`)
            console.log('')
            console.log('💡 Se você tem Premium, tente:')
            console.log('   1. Recarregar a página (F5)')
            console.log('   2. Fazer logout e login novamente')
            console.log('   3. Limpar cache e cookies')
          }
        }
      }, 3000)
    }
    
    console.log('📦 2/4: Carregando dados da aplicação...')
    await initializeData()
    
    console.log('🔄 3/4: Iniciando loops de atualização...')
    startUpdateLoops()
    startSpotifySync()
    startLocalInterpolation()
    
    console.log('🎨 4/4: Configurando listeners de eventos...')
    // Escuto eventos de extração de cor das capas de álbum
    window.addEventListener('albumColorExtracted', handleAlbumColorExtracted)
    // Escuto evento de fim de música HTML5
    window.addEventListener('audio-ended', () => {
      console.log('🏁 App.vue: Áudio HTML5 acabou')
      
      // Se está tocando preview, NÃO avança automaticamente
      if (isPlayingPreview.value) {
        console.log('⏸️ Preview finalizado - NÃO avançando automaticamente')
        isPlayingPreview.value = false
        return
      }
      
      // Se for música completa, avança para próxima
      console.log('➡️ Indo para próxima música')
      handleNextTrack()
    })
    
    // Detecta qualquer clique na página para habilitar áudio
    const enableAudioOnInteraction = () => {
      if (!userHasInteracted.value) {
        userHasInteracted.value = true
        console.log('✅ Interação do usuário detectada - áudio habilitado')
      }
    }
    document.addEventListener('click', enableAudioOnInteraction)
    document.addEventListener('touchstart', enableAudioOnInteraction)
    
    console.log('✅ PlayOff Vue App inicializado com sucesso!')
    showNotification('🎵 PlayOff carregado! Clique em uma música para começar!', 'success')
    
    // Verifico se devo reproduzir alguma música automaticamente
    // Aguardo 2 segundos para garantir que tudo esteja carregado
    // (Só vai funcionar se o usuário já tiver interagido)
    setTimeout(() => {
      console.log('🎯 Verificando auto-reprodução inicial...')
      checkAndPlayHighestVoted()
    }, 2000)
    
  } catch (error) {
    console.error('❌ Erro crítico durante inicialização:', error)
    showNotification('Erro ao inicializar - algumas funcionalidades podem não funcionar', 'error')
  }
})

// Limpeza quando o componente é desmontado
onUnmounted(() => {
  console.log('🧹 App.vue: Limpando recursos...')
  
  // Removo event listeners para evitar memory leaks
  window.removeEventListener('albumColorExtracted', handleAlbumColorExtracted)
  window.removeEventListener('audio-ended', handleNextTrack)
  
  console.log('✅ Limpeza concluída')
})
</script>

<style scoped>
/* ============= ESTILOS PRINCIPAIS DA APLICAÇÃO ============= */
/* Estilos do componente principal */
.app {
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
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
  gap: 4rem; /* Default gap to ensure spacing above footer */
}

/* Media queries para responsividade */
@media (max-width: 768px) {
  .main-content {
    gap: 4rem;
  }
  
  .main-content > *:not(:last-child) {
    margin-bottom: 3rem;
  }
}

@media (max-width: 480px) {
  .main-content {
    gap: 3rem;
  }
  
  .main-content > *:not(:last-child) {
    margin-bottom: 2rem;
  }
}

/* ============= BOTÕES DE LOGIN/PERFIL ============= */
.user-section {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.queue-toggle-btn {
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid #fff;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s;
  transform: skewX(-5deg);
}

.queue-toggle-btn:hover {
  background: #fff;
  color: #000;
  transform: skewX(-5deg) translate(-2px, -2px);
  box-shadow: 2px 2px 0 #ff6b6b;
}

.reconnect-btn {
  width: 40px;
  height: 40px;
  background: rgba(255, 107, 107, 0.2);
  border: 2px solid #ff6b6b;
  color: #ff6b6b;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  transform: skewX(-5deg);
  animation: pulse-red 2s infinite;
}

.reconnect-btn:hover {
  background: #ff6b6b;
  color: #fff;
  transform: skewX(-5deg) scale(1.1);
}

@keyframes pulse-red {
  0% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(255, 107, 107, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0); }
}

.queue-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ff6b6b;
  color: #fff;
  font-size: 0.7rem;
  font-weight: bold;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #fff;
}

.login-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.2rem;
  background: #1DB954;
  border: 2px solid #1DB954;
  color: #fff;
  font-family: 'Cingire', sans-serif;
  font-size: 0.95rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  transform: skewX(-5deg);
}

.login-btn:hover {
  background: #fff;
  color: #1DB954;
  transform: skewX(-5deg) translate(-2px, -2px);
  box-shadow: 2px 2px 0 #1DB954;
}

.login-btn i {
  font-size: 1.2rem;
}

.profile-btn {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 1rem 0.5rem 0.5rem;
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  font-family: 'Cingire', sans-serif;
  font-size: 0.9rem;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.2s;
  transform: skewX(-3deg);
}

.profile-btn:hover {
  background: rgba(255, 107, 107, 0.2);
  border-color: #ff6b6b;
  transform: skewX(-3deg) translate(-2px, -2px);
  box-shadow: 2px 2px 0 #ff6b6b;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #1DB954;
  object-fit: cover;
}

.user-name {
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.retrospective-btn,
.about-btn {
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid #fff;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  transform: skewX(-5deg);
}

.retrospective-btn:hover,
.about-btn:hover {
  background: #fff;
  color: #000;
  transform: skewX(-5deg) translate(-2px, -2px);
  box-shadow: 2px 2px 0 #ff6b6b;
}

@media (max-width: 768px) {
  .user-section {
    top: 0.5rem;
    right: 0.5rem;
    gap: 0.5rem;
    flex-wrap: wrap;
    max-width: 50%;
    justify-content: flex-end;
  }
  
  .queue-toggle-btn,
  .retrospective-btn,
  .about-btn,
  .reconnect-btn {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }
  
  .login-btn {
    padding: 0.5rem 0.6rem;
    font-size: 0.85rem;
  }
  
  .login-btn span {
    display: none;
  }
  
  .profile-btn {
    padding: 0.4rem;
  }
  
  .user-name {
    display: none;
  }
  
  .user-avatar {
    width: 28px;
    height: 28px;
  }
}

/* Banner Spotify Premium */
.spotify-premium-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
  border-bottom: 3px solid #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  animation: slideDown 0.5s ease;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

.banner-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  justify-content: space-between;
  flex-wrap: wrap;
}

.banner-content i {
  font-size: 2rem;
  color: #fff;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.banner-text {
  flex: 1;
  min-width: 300px;
}

.banner-text strong {
  display: block;
  color: #fff;
  font-size: 1.2rem;
  font-family: 'Cingire', 'Impact', sans-serif;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 0.3rem;
}

.banner-text p {
  color: rgba(255, 255, 255, 0.95);
  font-size: 0.95rem;
  margin: 0;
}

.premium-link {
  background: #fff;
  color: #ff6b6b;
  padding: 0.8rem 1.5rem;
  border: 2px solid #fff;
  font-weight: bold;
  text-decoration: none;
  text-transform: uppercase;
  font-family: 'Cingire', sans-serif;
  letter-spacing: 0.05em;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.premium-link:hover {
  background: #1DB954;
  color: #fff;
  transform: translate(-2px, -2px);
  box-shadow: 3px 3px 0 #fff;
}

@media (max-width: 768px) {
  .banner-content {
    padding: 0.8rem 1rem;
    gap: 1rem;
  }
  
  .banner-content i {
    font-size: 1.5rem;
  }
  
  .banner-text strong {
    font-size: 1rem;
  }
  
  .banner-text p {
    font-size: 0.85rem;
  }
  
  .premium-link {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
  }
}
</style> 