import { ref, computed, onMounted } from 'vue'

// Composable principal da aplicação PlayOff
// Este composable centraliza toda a lógica de estado e operações relacionadas
// ao sistema de votação e gerenciamento de músicas. Desenvolvido com Vue 3
// Composition API para máxima reatividade e performance
export function usePlayOffApp() {
  // ============= ESTADO REATIVO =============
  // Gerencio todo o estado da aplicação de forma reativa usando ref()
  // Isso garante que a interface seja atualizada automaticamente quando os dados mudam
  
  const songs = ref([])              // Lista principal de músicas
  const isOnline = ref(true)         // Status de conexão com o backend
  const notifications = ref([])      // Sistema de notificações em tempo real
  
  // ============= CONFIGURAÇÃO DA API =============
  // URL base para comunicação com o backend
  // Em produção, isso seria configurado via variáveis de ambiente
  const apiBaseUrl = '/api'
  
  // ============= COMPUTED PROPERTIES =============
  // Computed que sempre retorna as músicas ordenadas por votos
  // É reativo, então qualquer mudança nos votos recalcula automaticamente a ordenação
  const sortedSongs = computed(() => {
    return [...songs.value].sort((a, b) => b.votes - a.votes)
  })
  
  // ============= FUNÇÕES DE COMUNICAÇÃO COM BACKEND =============
  
  // Função principal para carregar músicas do servidor
  // Implemento tratamento de erro robusto para lidar com backend offline
  // Esta função é chamada na inicialização e periodicamente para sincronização
  const loadSongsFromBackend = async () => {
    try {
      console.log('📡 Tentando carregar músicas do backend...')
      const response = await fetch(`${apiBaseUrl}/songs`)
      
      if (response.ok) {
        const data = await response.json()
        songs.value = data.songs || []
        console.log(`✅ ${songs.value.length} músicas carregadas do backend com sucesso`)
        return true
      } else {
        throw new Error(`Resposta HTTP ${response.status}`)
      }
    } catch (error) {
      console.log('🔌 Backend offline ou inacessível, falhando graciosamente:', error.message)
      throw error
    }
  }
  
  // Função para carregar dados de demonstração quando o backend não está disponível
  // Isso garante que a aplicação continue funcionando mesmo sem conectividade
  // Os dados demo são representativos e permitem testar todas as funcionalidades
  const loadDemoData = () => {
    console.log('📀 Carregando dados demo para funcionamento offline...')
    
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
    
    console.log(`📀 ${songs.value.length} músicas demo carregadas para desenvolvimento/teste`)
  }
  
  // ============= SISTEMA DE VOTAÇÃO =============
  
  // Função para enviar voto ao backend
  // Implemento verificação de conectividade para evitar erros quando offline
  // Esta função é chamada após atualizar o estado local para responsividade
  const submitVoteToBackend = async (songId, votes) => {
    if (!isOnline.value) {
      console.log('⚠️ Offline: Voto salvo apenas localmente')
      return false
    }
    
    try {
      console.log(`📤 Enviando voto para backend: música ${songId}, total ${votes} votos`)
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
        console.log('✅ Voto sincronizado com backend com sucesso')
        return true
      } else {
        throw new Error(`Erro HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('❌ Falha ao sincronizar voto com backend:', error)
      // Marco como offline para futuras operações
      isOnline.value = false
      return false
    }
  }
  
  // Função principal para votar em uma música
  // Implemento otimistic UI updates - atualizo a interface imediatamente
  // e depois sincronizo com o servidor. Isso proporciona experiência mais fluida
  const voteForSong = async (songId) => {
    try {
      console.log(`🗳️ Processando voto para música ID: ${songId}`)
      
      // Encontro a música na lista local
      const song = songs.value.find(s => s.id === songId)
      if (!song) {
        console.error('❌ Música não encontrada na lista local:', songId)
        showNotification('Música não encontrada', 'error')
        return null
      }
      
      // Atualizo votos localmente primeiro (otimistic update)
      const oldVotes = song.votes || 0
      song.votes = oldVotes + 1
      console.log(`📊 Votos atualizados localmente: ${oldVotes} → ${song.votes}`)
      
      // Tento sincronizar com backend em background
      await submitVoteToBackend(songId, song.votes)
      
      // Feedback positivo para o usuário
      showNotification(`🗳️ Voto registrado para "${song.title}"!`, 'success')
      
      return song
    } catch (error) {
      console.error('❌ Erro crítico na votação:', error)
      showNotification('Erro inesperado ao votar', 'error')
      return null
    }
  }
  
  // ============= SISTEMA DE SUPER VOTO =============
  
  // Função avançada de super voto que garante liderança imediata
  // Esta é uma funcionalidade premium que calcula dinamicamente quantos votos
  // são necessários para que a música escolhida assuma a primeira posição
  const superVote = async (songId, currentPlayingSong = null) => {
    try {
      console.log(`⚡ Iniciando super voto para música ID: ${songId}`)
      
      // Encontro a música alvo
      const song = songs.value.find(s => s.id === songId)
      if (!song) {
        console.error('❌ Música para super voto não encontrada:', songId)
        showNotification('Música não encontrada', 'error')
        return null
      }
      
      // Cálculo inteligente dos votos necessários para liderança
      let highestVotes = 0
      
      // Se há uma música tocando atualmente, uso seus votos como referência
      if (currentPlayingSong && currentPlayingSong.id !== songId) {
        highestVotes = currentPlayingSong.votes || 0
        console.log(`📊 Usando música atual como referência: ${highestVotes} votos`)
      } else {
        // Caso contrário, encontro a música com mais votos (excluindo a alvo)
        const otherSongs = songs.value.filter(s => s.id !== songId)
        if (otherSongs.length > 0) {
          highestVotes = Math.max(...otherSongs.map(s => s.votes || 0))
          console.log(`📊 Maior número de votos encontrado: ${highestVotes}`)
        }
      }
      
      // Calculo votos necessários (pelo menos 1 voto a mais que o líder)
      const currentVotes = song.votes || 0
      const votesNeeded = Math.max(1, (highestVotes + 1) - currentVotes)
      
      console.log(`⚡ Análise do super voto:`)
      console.log(`   - Música "${song.title}" tem atualmente: ${currentVotes} votos`)
      console.log(`   - Líder atual tem: ${highestVotes} votos`)
      console.log(`   - Votos necessários para liderança: ${votesNeeded}`)
      
      // Atualizo votos localmente (otimistic update)
      song.votes = currentVotes + votesNeeded
      console.log(`📊 Super voto concluído: ${currentVotes} → ${song.votes} votos`)
      
      // Sincronizo com backend
      await submitSuperVoteToBackend(songId, song.votes, votesNeeded)
      
      // Feedback especial para super voto
      showNotification(
        `⚡ Super Voto executado! "${song.title}" agora lidera com ${song.votes} votos!`, 
        'success'
      )
      
      return song
    } catch (error) {
      console.error('❌ Erro crítico no super voto:', error)
      showNotification('Erro inesperado no super voto', 'error')
      return null
    }
  }
  
  // Função específica para sincronizar super votos com o backend
  // O super voto requer endpoint diferente pois envia informações adicionais
  // sobre quantos votos foram adicionados de uma vez
  const submitSuperVoteToBackend = async (songId, totalVotes, votesAdded) => {
    if (!isOnline.value) {
      console.log('⚠️ Offline: Super voto salvo apenas localmente')
      return false
    }
    
    try {
      console.log(`📤 Sincronizando super voto: ${votesAdded} votos adicionados (total: ${totalVotes})`)
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
        console.log('✅ Super voto sincronizado com backend com sucesso')
        return true
      } else {
        throw new Error(`Erro HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('❌ Falha ao sincronizar super voto:', error)
      isOnline.value = false
      return false
    }
  }
  
  // ============= SISTEMA DE NOTIFICAÇÕES =============
  
  // Sistema de notificações em tempo real com auto-dismiss
  // Implemento diferentes tipos de notificação (success, error, warning, info)
  // com remoção automática para não sobrecarregar a interface
  const showNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now() + Math.random(), // ID único para cada notificação
      message,
      type,
      timestamp: new Date().toISOString()
    }
    
    // Adiciono à lista de notificações ativas
    notifications.value.push(notification)
    
    // Auto-remoção após 3 segundos para manter interface limpa
    setTimeout(() => {
      const index = notifications.value.findIndex(n => n.id === notification.id)
      if (index > -1) {
        notifications.value.splice(index, 1)
        console.log(`🗑️ Notificação removida automaticamente: ${message}`)
      }
    }, 3000)
    
    // Log para debugging
    console.log(`📢 NOTIFICAÇÃO [${type.toUpperCase()}]: ${message}`)
  }

  // ============= INICIALIZAÇÃO E SINCRONIZAÇÃO =============
  
  // Função principal de inicialização da aplicação
  // Tenta conectar com backend primeiro, fallback para dados demo se falhar
  // Esta estratégia garante que a aplicação sempre funcione
  const initializeData = async () => {
    console.log('🚀 Inicializando sistema PlayOff...')
    
    try {
      // Tentativa principal: carregar do backend
      await loadSongsFromBackend()
      isOnline.value = true
      console.log('✅ Inicialização online concluída com sucesso')
    } catch (error) {
      console.log('🔌 Backend não disponível durante inicialização, modo offline ativado')
      loadDemoData()
      isOnline.value = false
      
      // Mostro notificação informativa sobre modo offline
      showNotification('Modo offline: usando dados de demonstração', 'warning')
    }
  }
  
  // Sistema de atualização periódica com frequência reduzida
  // Implemento polling inteligente para manter dados sincronizados
  // Frequência reduzida (15s) para economizar recursos e reduzir carga no servidor
  const startUpdateLoops = () => {
    console.log('🔄 Iniciando loops de atualização automática (intervalo: 15s)')
    
    // Atualização periódica das músicas
    setInterval(async () => {
      if (isOnline.value) {
        try {
          await refreshSongs()
        } catch (error) {
          console.log('⚠️ Erro durante atualização automática:', error.message)
          // Não marco como offline aqui para evitar false negatives
        }
      }
    }, 15000) // 15 segundos - reduzido de 5s para melhor performance
  }
  
  // ============= DEBOUNCING E OTIMIZAÇÃO =============
  
  // Implemento debouncing para atualizações de músicas
  // Isso previne múltiplas chamadas desnecessárias em rápida sucessão
  // Especialmente útil quando múltiplos usuários votam simultaneamente
  let songsUpdateTimeout = null
  
  const debouncedUpdateSongs = () => {
    // Cancelo timeout anterior se existir
    if (songsUpdateTimeout) {
      clearTimeout(songsUpdateTimeout)
    }
    
    // Agendo nova atualização com delay
    songsUpdateTimeout = setTimeout(async () => {
      try {
        console.log('🔄 Executando atualização debounced...')
        await refreshSongs()
      } catch (error) {
        console.log('⚠️ Erro na atualização debounced:', error.message)
      }
    }, 1000) // 1 segundo de delay
  }
  
  // Função para atualizar músicas do backend de forma inteligente
  // Implemento comparação de conteúdo para evitar re-renders desnecessários
  // Só atualizo o estado se os dados realmente mudaram
  const refreshSongs = async () => {
    if (!isOnline.value) {
      console.log('⚠️ Tentativa de refresh offline - ignorando')
      return
    }
    
    try {
      console.log('🔄 Atualizando lista de músicas...')
      const response = await fetch(`${apiBaseUrl}/songs`)
      
      if (response.ok) {
        const data = await response.json()
        const newSongs = data.songs || []
        
        // Comparação inteligente: só atualizo se dados mudaram
        const songsChanged = JSON.stringify(songs.value) !== JSON.stringify(newSongs)
        
        if (songsChanged) {
          const previousCount = songs.value.length
          songs.value = newSongs
          
          console.log(`🔄 Lista atualizada: ${previousCount} → ${newSongs.length} músicas`)
          
          // Log das mudanças para debugging
          if (newSongs.length > previousCount) {
            console.log(`➕ ${newSongs.length - previousCount} nova(s) música(s) adicionada(s)`)
          } else if (newSongs.length < previousCount) {
            console.log(`➖ ${previousCount - newSongs.length} música(s) removida(s)`)
          } else {
            console.log('📊 Votos atualizados (mesmo número de músicas)')
          }
        } else {
          // Dados idênticos - não preciso atualizar
          console.log('✓ Lista já está atualizada (sem mudanças)')
        }
      } else {
        throw new Error(`Resposta HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar músicas:', error)
      // Marco como offline para pausar futuras tentativas automáticas
      isOnline.value = false
      showNotification('Conexão perdida - modo offline ativado', 'warning')
    }
  }
  
  // ============= INTERFACE PÚBLICA DO COMPOSABLE =============
  // Retorno apenas o que é necessário para os componentes
  // Isso mantém a API limpa e previne uso indevido de funções internas
  return {
    // Estado reativo
    songs,                    // Lista de músicas
    sortedSongs,             // Músicas ordenadas por votos  
    notifications,           // Sistema de notificações
    isOnline,               // Status de conectividade
    
    // Ações principais
    voteForSong,            // Votar em música
    superVote,              // Super voto (liderança garantida)
    showNotification,       // Mostrar notificação
    
    // Inicialização e sincronização
    initializeData,         // Inicializar aplicação
    startUpdateLoops,       // Iniciar atualizações automáticas
    refreshSongs            // Atualizar músicas manualmente
  }
} 