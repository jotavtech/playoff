<template>
  <div class="app">
    <!-- Elementos de Fundo -->
    <div class="background-overlay"></div>
    <div class="dynamic-background" :class="{ active: currentTrack }"></div>
    
    <!-- Sistema de Notificações -->
    <NotificationContainer :notifications="notifications" />
    
    <!-- Botão de Login/Perfil -->
    <div class="user-section">
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
        />

        <!-- Busca de Músicas via Spotify -->
        <SpotifySearch @add-song="handleAddSpotifySong" />

        <!-- Carrossel de Músicas para Votação -->
        <MusicCarousel 
          :songs="sortedSongs"
          :current-track="currentTrack"
          :is-playing="isPlaying"
          @vote-for-song="handleVoteAndPlay"
          @super-vote="handleSuperVote"
          @play-song="handlePlaySong"
        />

        <!-- Footer Punk -->
        <TheFooter />
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
import HeroSection from './components/HeroSection.vue'
import MusicCarousel from './components/MusicCarousel.vue'
import NotificationContainer from './components/NotificationContainer.vue'
import SpotifySearch from './components/SpotifySearch.vue'
import LoginModal from './components/LoginModal.vue'
import UserProfile from './components/UserProfile.vue'
import TheFooter from './components/TheFooter.vue'

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
  setTrack           // Definir track sem tocar (para Spotify SDK)
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
  getCurrentState // Importa função de sync
} = useSpotifyPlayer()

// ============= COMPUTED TIME & STATE =============
// Unifica estado dos dois players (HTML5 e Spotify)

const isSpotifyActive = computed(() => {
  return currentTrack.value?.spotifyUrl && isAuthenticated.value && spotifyPlayerReady.value
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

const handleTogglePlayback = () => {
  if (isSpotifyActive.value) {
    toggleSpotifyPlayback()
  } else {
    toggleAudioPlayback()
  }
}

// ============= ESTADO DA UI =============
const showLoginModal = ref(false)
const showProfileModal = ref(false)

// Cor atual utilizada para acentuar a logo (dinâmica conforme música)
const logoAccentColor = ref([255, 107, 107])

// Inicializa Spotify Player quando usuário está autenticado
watch(spotifyAccessToken, (token) => {
  if (token) {
    console.log('🎵 Inicializando Spotify Web Player...')
    initSpotifyPlayer(token)
  }
})

// ============= LÓGICA DE AUTO-REPRODUÇÃO =============
// Sistema inteligente que automaticamente reproduz a música mais votada
// quando há mudanças na liderança. Isso torna a experiência mais dinâmica
// e recompensa imediatamente a música que está ganhando mais votos

const checkAndPlayHighestVoted = async () => {
  // Verifico se há músicas disponíveis
  if (sortedSongs.value.length === 0) {
    console.log('📭 Nenhuma música disponível para auto-reprodução')
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
// O super voto é uma funcionalidade premium que garante reprodução imediata
const handleSuperVote = async (song) => {
  try {
    console.log(`⚡ App.vue: Processando super voto para "${song.title}"`)
    
    // Executo o super voto passando a música atual como referência
    // Isso permite calcular quantos votos são necessários para assumir liderança
    const superVotedSong = await superVote(song.id, currentTrack.value)
    
    if (superVotedSong) {
      console.log(`⚡ Super voto executado: "${superVotedSong.title}" agora tem ${superVotedSong.votes} votos`)
      
      // Reproduzo imediatamente (característica do super voto)
      await handlePlaySong(song)
      
      // Feedback específico para super voto
      showNotification(`⚡ Super Voto! Tocando imediatamente: ${song.title}`, 'success')
    }
  } catch (error) {
    console.error('❌ App.vue: Erro crítico no super voto:', error)
    showNotification('Erro no super voto - tente novamente', 'error')
  }
}

  // Handler principal para reprodução de músicas
  // Centraliza toda a lógica de reprodução e logging detalhado para debugging
  const handlePlaySong = async (song) => {
    try {
      console.log(`🎵 App.vue: Iniciando reprodução de "${song.title}" por ${song.artist}`)
      console.log(`📋 Dados:`, JSON.stringify(song, null, 2))
      console.log(`🔐 Auth: ${isAuthenticated.value}, Player Ready: ${spotifyPlayerReady.value}`)
      
      // OPÇÃO 1: Tocar via Spotify SDK (se logado)
      if (song.spotifyUrl && isAuthenticated.value) {
        console.log('🟢 Tentando tocar via Spotify Web Playback SDK')
        
        // Se o player não estiver pronto, espera um pouco
        if (!spotifyPlayerReady.value) {
           console.log('⏳ Player não está pronto, aguardando...')
           // Tenta esperar até 5 segundos
           let attempts = 0
           while (!spotifyPlayerReady.value && attempts < 50) {
             await new Promise(resolve => setTimeout(resolve, 100))
             attempts++
           }
           
           if (!spotifyPlayerReady.value) {
             console.warn('⚠️ Timeout aguardando player do Spotify')
             // Não retorna, tenta cair para outras opções ou erro
           }
        }

        if (spotifyPlayerReady.value) {
          const spotifyId = song.spotifyUrl.split('/').pop()
          const spotifyUri = `spotify:track:${spotifyId}`
          console.log(`🔗 URI: ${spotifyUri}`)
          
          const success = await playSpotifyTrack(spotifyUri)
          
          if (success) {
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
            
            showNotification(`Spotify: ${song.title}`, 'success')
            return
          } else {
            console.error('❌ Falha ao tocar no Spotify SDK')
            showNotification('Falha ao tocar no Spotify', 'error')
          }
        }
      }
      
      // OPÇÃO 2: Tocar via HTML5 (se tiver audioUrl válida ou tentar buscar preview)
      // playSong do useCloudinaryAudio tem capacidade de buscar previewUrl se audioUrl estiver faltando
      console.log(`🔵 Tentando reprodução via Player HTML5/Preview...`)
      try {
        const result = await playSong(song)
        if (result) {
          showNotification(`Preview: ${song.title}`, 'success')
          return
        }
      } catch (e) {
        console.log('⚠️ Falha na tentativa de reprodução HTML5:', e)
      }
      
      // OPÇÃO 3: Música do Spotify sem login - pedir para logar (apenas informativo)
      if (song.spotifyUrl && !isAuthenticated.value) {
        console.log('⚠️ Música do Spotify requer login')
        showNotification(`Faça login para ouvir a versão completa de "${song.title}"`, 'warning')
        await setTrack(song)
        return
      }
      
      // Nenhuma opção disponível
      console.log('❌ Nenhuma fonte de áudio disponível')
      showNotification(`Sem áudio disponível para "${song.title}"`, 'error')
      
    } catch (error) {
      console.error('❌ App.vue: Erro ao reproduzir música:', error)
      
      // Tratamento específico para erro de autoplay policy
      if (error.name === 'NotAllowedError' || error.message.includes('interact')) {
        showNotification('⚠️ Clique em Play para iniciar o áudio', 'warning')
        // Poderíamos mostrar um botão de play overlay aqui se quiséssemos
      } else {
        showNotification(`Erro: ${error.message}`, 'error')
      }
    }
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
      // Busca a música na lista atualizada
      const addedSong = sortedSongs.value.find(s => 
        s.title === track.name && s.artist === track.artist
      )
      if (addedSong) {
        console.log(`▶️ Auto-reproduzindo música adicionada: ${addedSong.title}`)
        await handlePlaySong(addedSong)
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
    } = event.detail
    
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
      console.log(`🌈 Cor dominante: rgb(${dominant.join(', ')})`)
      console.log(`💡 Brilho detectado: ${brightness.toFixed(2)}`)
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

// Observo mudanças na lista de músicas ordenadas para atualizar navegação do player
// Isso garante que as funções "próxima/anterior" funcionem com a lista atual
watch(sortedSongs, (newSongs) => {
  if (newSongs && newSongs.length > 0) {
    console.log(`🔄 App.vue: Atualizando lista de navegação com ${newSongs.length} músicas`)
    updateSongsList(newSongs)
  } else {
    console.log('📭 Lista de músicas vazia - navegação desabilitada')
  }
}, { deep: true, immediate: true }) // deep: true para mudanças internas, immediate: true para execução inicial

// ============= HANDLERS DE NAVEGAÇÃO =============
// Funções que permitem navegar entre músicas com tratamento de erro

const handlePreviousTrack = async () => {
  try {
    console.log('⏮️ App.vue: Navegando para música anterior...')
    
    const list = sortedSongs.value
    if (!list || list.length === 0) return

    const currentIndex = list.findIndex(s => s.id === currentTrack.value?.id)
    let prevIndex = currentIndex - 1
    
    if (prevIndex < 0) prevIndex = list.length - 1 // Loop
    
    const prevSong = list[prevIndex]
    if (prevSong) {
      await handlePlaySong(prevSong)
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
    
    const list = sortedSongs.value
    if (!list || list.length === 0) return

    const currentIndex = list.findIndex(s => s.id === currentTrack.value?.id)
    let nextIndex = currentIndex + 1
    
    if (nextIndex >= list.length) nextIndex = 0 // Loop
    
    const nextSong = list[nextIndex]
    if (nextSong) {
      await handlePlaySong(nextSong)
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

// ============= SINCRONIZAÇÃO SPOTIFY EXTERNO =============
const startSpotifySync = () => {
  setInterval(async () => {
    if (!isAuthenticated.value) return

    // Passa token explicitamente para garantir uso do mais atual
    const state = await getCurrentState(spotifyAccessToken.value)
    
    if (state && state.error === 401) {
      console.log('🔄 Token expirado durante sync, tentando renovar...')
      const refreshed = await refreshToken()
      if (refreshed) {
         console.log('✅ Token renovado, sync retomará no próximo ciclo')
      } else {
         // Se falhar renovação e estavamos logados, talvez devêssemos deslogar?
         // Por enquanto apenas loga
         console.warn('⚠️ Falha ao renovar token durante sync')
      }
      return
    }
    
    if (state && state.item) {
      // Verifica se estamos tocando algo diferente do app
      // Se o player local (SDK) estiver tocando, o estado já é gerenciado por ele
      // Mas se for outro device, precisamos atualizar a UI
      
      const isLocalDevice = state.device.id === deviceId.value
      if (isLocalDevice) return // Deixa o SDK gerenciar

      if (state.is_playing) {
        console.log('🎵 Detectado Spotify em outro device:', state.item.name)
        
        const track = {
          id: state.item.id,
          title: state.item.name,
          artist: state.item.artists.map(a => a.name).join(', '),
          album: state.item.album.name,
          albumCover: state.item.album.images[0]?.url,
          spotifyUrl: state.item.external_urls.spotify,
          duration: state.item.duration_ms,
          votes: 0 // Placeholder
        }

        // Atualiza track atual apenas se mudou
        if (!currentTrack.value || currentTrack.value.id !== track.id) {
          await setTrack(track)
          
          // Registra no histórico
          await registerPlay({
            spotifyId: track.id,
            duration: track.duration,
            completed: false
          })
        }
        
        // Sincroniza estado de pause/play
        isSpotifyPaused.value = !state.is_playing
        
        // Atualiza posição e duração para a barra de progresso
        spotifyPosition.value = state.progress_ms
        spotifyDuration.value = state.item.duration_ms

        // Força status de playing visualmente
        // Precisamos garantir que isSpotifyActive seja true
        // Como isSpotifyActive depende de spotifyPlayerReady e isAuthenticated,
        // e estamos logados, deve funcionar se tivermos spotifyUrl
      }
    }
  }, 5000) // Polling a cada 5s
}

// ============= CICLO DE VIDA DO COMPONENTE =============

// Inicialização quando o componente é montado
onMounted(async () => {
  console.log('🚀 App.vue: Iniciando aplicação PlayOff Vue...')
  
  try {
    // Sequência de inicialização ordenada
    console.log('🔧 1/4: Inicializando player de áudio...')
    await initializePlayer()
    
    console.log('📦 2/4: Carregando dados da aplicação...')
    await initializeData()
    
    console.log('🔄 3/4: Iniciando loops de atualização...')
    startUpdateLoops()
    startSpotifySync()
    
    console.log('🎨 4/4: Configurando listeners de eventos...')
    // Escuto eventos de extração de cor das capas de álbum
    window.addEventListener('albumColorExtracted', handleAlbumColorExtracted)
    
    console.log('✅ PlayOff Vue App inicializado com sucesso!')
    showNotification('🎵 PlayOff carregado! Comece a votar!', 'success')
    
    // Verifico se devo reproduzir alguma música automaticamente
    // Aguardo 2 segundos para garantir que tudo esteja carregado
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
  
  console.log('✅ Limpeza concluída')
})
</script>

<style scoped>
/* ============= ESTILOS PRINCIPAIS DA APLICAÇÃO ============= */
/* Estilos do componente principal */
.app {
  width: 100%;
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
  gap: 0;
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

@media (max-width: 768px) {
  .user-section {
    top: 0.5rem;
    right: 0.5rem;
  }
  
  .login-btn {
    padding: 0.6rem 0.8rem;
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
</style> 