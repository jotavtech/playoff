<template>
  <div class="app">
    <!-- Elementos de Fundo -->
    <div class="background-overlay"></div>
    <div class="dynamic-background" :class="{ active: currentTrack }"></div>
    
    <!-- Sistema de Notificações -->
    <NotificationContainer :notifications="notifications" />
    
    <div class="container">
      <!-- Conteúdo Principal -->
      <div class="main-content">
        <!-- Seção Hero com Player de Música -->
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

        <!-- Carrossel de Músicas para Votação -->
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

// ============= COMPOSABLES E ESTADO =============
// Utilizo composables para separar responsabilidades e manter código organizado
// useCloudinaryAudio: gerencia reprodução de áudio e integração com APIs de música
// usePlayOffApp: gerencia estado da aplicação, votação e sincronização com backend

const {
  currentTrack,        // Música sendo reproduzida atualmente
  isPlaying,          // Status de reprodução (true/false)
  position,           // Posição atual da música em ms
  duration,           // Duração total da música em ms
  initializePlayer,   // Inicializar sistema de áudio
  playSong,          // Reproduzir uma música específica
  togglePlayback,    // Alternar play/pause
  previousTrack,     // Ir para música anterior
  nextTrack,         // Ir para próxima música
  formatTime,        // Formatar tempo (ms para mm:ss)
  updateSongsList    // Atualizar lista para navegação
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
    console.log(`🎨 App.vue: Capa do álbum: ${song.albumCover}`)
    console.log(`📊 App.vue: Votos atuais: ${song.votes}`)
    
    // Chamo a função de reprodução do composable de áudio
    await playSong(song)
    
    console.log(`✅ App.vue: Reprodução iniciada com sucesso`)
    console.log(`📊 App.vue: Estado atual do player:`, {
      currentTrack: currentTrack.value?.title,
      isPlaying: isPlaying.value,
      albumCover: currentTrack.value?.albumCover
    })
    
    // Feedback para o usuário
    showNotification(`🎵 Reproduzindo: ${song.title}`, 'success')
  } catch (error) {
    console.error('❌ App.vue: Erro ao reproduzir música:', error)
    showNotification('Erro ao reproduzir música - verifique conexão', 'error')
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
  } catch (error) {
    console.error('❌ Erro ao processar cores do álbum:', error)
    // Em caso de erro, mantenho tema padrão
    document.body.classList.add('theme-black')
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
    await previousTrack(sortedSongs.value)
    console.log('✅ Navegação para anterior concluída')
  } catch (error) {
    console.error('❌ Erro ao navegar para música anterior:', error)
    showNotification('Erro ao navegar para música anterior', 'error')
  }
}

const handleNextTrack = async () => {
  try {
    console.log('⏭️ App.vue: Navegando para próxima música...')
    await nextTrack(sortedSongs.value)
    console.log('✅ Navegação para próxima concluída')
  } catch (error) {
    console.error('❌ Erro ao navegar para próxima música:', error)
    showNotification('Erro ao navegar para próxima música', 'error')
  }
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
/* Estilos do componente principal */
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