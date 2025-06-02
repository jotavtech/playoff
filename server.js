const express = require('express');
const cors = require('cors');
const path = require('path');

// Importação do fetch para versões do Node.js que não possuem suporte nativo
// Isso garante compatibilidade com APIs externas independente da versão do Node
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// ============= IMPLEMENTAÇÃO DO PADRÃO OBSERVER =============
// O padrão Observer é uma solução elegante que desenvolvi para este projeto
// Ele permite que diferentes componentes do sistema sejam notificados automaticamente
// quando algo importante acontece, como um novo voto ou mudança na música mais votada
// 
// Principais vantagens desta arquitetura:
// 1. Desacoplamento: Os componentes não precisam conhecer uns aos outros diretamente
// 2. Escalabilidade: Posso adicionar novos observadores sem modificar código existente  
// 3. Manutenibilidade: Cada classe tem uma responsabilidade específica e bem definida
// 4. Reatividade: O sistema reage automaticamente a mudanças de estado

// Interface Observer - Define o contrato que todos os observadores devem seguir
// Esta é a base do padrão Observer, garantindo que todos os observadores
// implementem o método update() que será chamado quando houver notificações
class Observer {
  update(data) {
    throw new Error('Método update do Observer deve ser implementado');
  }
}

// Classe Subject (Observable) - Gerencia a lista de observadores
// Esta classe é o núcleo do padrão Observer. Ela mantém uma lista de observadores
// e notifica todos eles quando algo importante acontece. É como um sistema de
// broadcasting onde o Subject é a estação de rádio e os Observers são os receptores
class Subject {
  constructor() {
    // Array que armazena todos os observadores registrados
    // Cada observador aqui será notificado quando notify() for chamado
    this.observers = [];
  }

  // Método para registrar um novo observador no sistema
  // Verifico se o objeto realmente implementa a interface Observer
  // para evitar erros em tempo de execução
  subscribe(observer) {
    if (observer instanceof Observer) {
      this.observers.push(observer);
      console.log(`👀 Observador registrado: ${observer.constructor.name}`);
    } else {
      throw new Error('Observador deve implementar a interface Observer');
    }
  }

  // Método para remover um observador da lista
  // Útil para cleanup e otimização de memória
  unsubscribe(observer) {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
      console.log(`👋 Observador removido: ${observer.constructor.name}`);
    }
  }

  // Método central do padrão - notifica todos os observadores
  // Este é o método mais importante, pois é ele que propaga as mudanças
  // por todo o sistema. Cada observador recebe os mesmos dados
  notify(data) {
    console.log(`🔔 Notificando ${this.observers.length} observadores com dados:`, data);
    this.observers.forEach(observer => {
      try {
        // Chamo o método update de cada observador com os dados
        // O try/catch garante que se um observador falhar, os outros continuem funcionando
        observer.update(data);
      } catch (error) {
        console.error(`❌ Erro ao notificar observador ${observer.constructor.name}:`, error);
      }
    });
  }
}

// VoteManager - Subject que gerencia votação e notifica observadores
// Esta é a classe mais importante do sistema. Ela herda de Subject e é responsável
// por gerenciar todos os votos e notificar os observadores sobre mudanças.
// É aqui que toda a lógica de votação acontece, incluindo:
// - Processamento de votos individuais e super votos
// - Determinação da música mais votada
// - Notificação automática quando há mudanças significativas
class VoteManager extends Subject {
  constructor() {
    super();
    // Armazeno a música atualmente mais votada para comparação
    // Isso me permite detectar quando há mudança de liderança
    this.currentHighestVoted = null;
  }

  // Método principal para processar votos - coração do sistema de votação
  // Este método é chamado sempre que alguém vota, seja voto simples ou super voto
  // Ele atualiza a contagem, verifica mudanças e notifica todos os observadores
  processVote(songId, newVoteCount) {
    console.log(`🗳️ VoteManager: Processando voto para música ${songId} com ${newVoteCount} votos`);
    
    // Encontro a música na lista e atualizo seus votos
    // Uso find() porque é mais eficiente para arrays pequenos
    const song = songs.find(s => s.id === songId);
    if (song) {
      song.votes = newVoteCount;
      console.log(`🗳️ Voto registrado para "${song.title}" - Total: ${song.votes} votos`);
      
      // Verifico se houve mudança na música mais votada
      // Esta é uma parte crítica pois determina se devo notificar sobre mudança de liderança
      const newHighestVoted = this.getHighestVotedSong();
      const hasChanged = !this.currentHighestVoted || 
                        this.currentHighestVoted.id !== newHighestVoted?.id;
      
      if (hasChanged && newHighestVoted) {
        // Nova música assumiu a liderança!
        this.currentHighestVoted = newHighestVoted;
        console.log(`👑 Nova música mais votada: "${newHighestVoted.title}" por ${newHighestVoted.artist} (${newHighestVoted.votes} votos)`);
        
        // Notifico todos os observadores sobre a mudança de liderança
        // Passo dados completos para que cada observador possa reagir adequadamente
        this.notify({
          type: 'VOTE_CHANGE',
          songId: songId,
          newVotes: newVoteCount,
          highestVoted: newHighestVoted,
          allSongs: this.getAllSongsSorted()
        });
      } else {
        // Apenas atualizo a contagem sem mudança de liderança
        // Mesmo assim notifico para manter a UI atualizada
        this.notify({
          type: 'VOTE_UPDATE',
          songId: songId,
          newVotes: newVoteCount,
          highestVoted: this.currentHighestVoted,
          allSongs: this.getAllSongsSorted()
        });
      }
    }
  }

  // Método utilitário para encontrar a música mais votada
  // Uso sort() para ordenar por votos e retorno o primeiro elemento
  // Se não houver músicas, retorno null para evitar erros
  getHighestVotedSong() {
    if (songs.length === 0) return null;
    return [...songs].sort((a, b) => b.votes - a.votes)[0];
  }

  // Método para obter todas as músicas ordenadas por votos
  // Uso spread operator [...songs] para criar uma nova array e não modificar a original
  // Isso é importante para evitar efeitos colaterais indesejados
  getAllSongsSorted() {
    return [...songs].sort((a, b) => b.votes - a.votes);
  }

  // Método para adicionar novas músicas ao sistema
  // Além de adicionar à lista, notifico todos os observadores
  // para que possam reagir à nova música (ex: atualizar UI)
  addSong(newSong) {
    songs.push(newSong);
    console.log(`🎵 VoteManager: Nova música adicionada: "${newSong.title}" por ${newSong.artist}`);
    
    // Notifico observadores sobre a nova música
    this.notify({
      type: 'SONG_ADDED',
      song: newSong,
      allSongs: this.getAllSongsSorted()
    });
  }
}

// MusicPlayer - Observador que reage a mudanças de votos
// Esta classe implementa a interface Observer e é responsável por gerenciar
// a reprodução automática de músicas baseada nos votos. É um exemplo perfeito
// de como o padrão Observer desacopla responsabilidades:
// - O VoteManager não precisa saber sobre reprodução de música
// - O MusicPlayer não precisa saber sobre lógica de votação
// - Ambos funcionam independentemente mas colaboram através do padrão Observer
class MusicPlayer extends Observer {
  constructor() {
    super();
    // Estado atual do player de música
    this.currentPlaying = null;  // Música sendo reproduzida atualmente
    this.isPlaying = false;      // Status de reprodução
  }

  // Método update obrigatório da interface Observer
  // É chamado automaticamente sempre que o VoteManager notifica mudanças
  // Analiso o tipo de evento e delego para o método apropriado
  update(data) {
    console.log(`🎵 MusicPlayer: Recebeu atualização:`, data.type);
    
    // Switch para tratar diferentes tipos de eventos
    // Isso me permite reagir de forma específica a cada situação
    switch (data.type) {
      case 'VOTE_CHANGE':
        // Mudança de liderança - possivelmente trocar música
        this.handleVoteChange(data.highestVoted);
        break;
      case 'VOTE_UPDATE':
        // Atualização de votos sem mudança de liderança
        this.handleVoteUpdate(data);
        break;
      case 'SONG_ADDED':
        // Nova música adicionada ao sistema
        this.handleSongAdded(data.song);
        break;
    }
  }

  // Lida com mudanças de liderança nas votações
  // Se uma nova música assumiu a liderança, automaticamente troco para ela
  // Esta é a funcionalidade que torna o sistema verdadeiramente reativo
  handleVoteChange(newHighestVoted) {
    if (newHighestVoted && (!this.currentPlaying || this.currentPlaying.id !== newHighestVoted.id)) {
      console.log(`🎵 MusicPlayer: Mudando para nova música mais votada: "${newHighestVoted.title}"`);
      this.playTrack(newHighestVoted);
    }
  }

  // Lida com atualizações de votos sem mudança de liderança
  // Apenas logo a informação para debug, mas não mudo a música atual
  handleVoteUpdate(data) {
    console.log(`🎵 MusicPlayer: Votos atualizados para música, líder atual ainda é: "${data.highestVoted?.title}"`);
  }

  // Lida com adição de novas músicas
  // Por enquanto apenas logo, mas poderia implementar lógica adicional
  // como adicionar à playlist ou verificar se deve tocar imediatamente
  handleSongAdded(song) {
    console.log(`🎵 MusicPlayer: Nova música disponível: "${song.title}" por ${song.artist}`);
  }

  // Método para reproduzir uma música específica
  // Em uma implementação real, isso controlaria um player de áudio
  // Por enquanto simulo a reprodução com logs e timeout
  playTrack(song) {
    this.currentPlaying = song;
    this.isPlaying = true;
    console.log(`▶️ MusicPlayer: Tocando agora "${song.title}" por ${song.artist}`);
    console.log(`🔗 URL do áudio: ${song.audioUrl}`);
    
    // Simulo reprodução (em implementação real, controlaria reprodução de áudio real)
    // O timeout simula o fim da música após 3 segundos para demo
    setTimeout(() => {
      console.log(`⏸️ MusicPlayer: Terminou de tocar "${song.title}"`);
      this.isPlaying = false;
    }, 3000); // Simulo preview de 3 segundos
  }

  // Método para obter estado atual do player
  // Útil para APIs que precisam informar sobre o que está tocando
  getCurrentPlaying() {
    return {
      song: this.currentPlaying,
      isPlaying: this.isPlaying
    };
  }
}

// UIObserver - Observador que reage a mudanças e atualiza estado da interface
// Esta classe é responsável por manter o estado da interface usuário sincronizado
// com as mudanças no sistema. É outro exemplo do poder do padrão Observer:
// - A UI se atualiza automaticamente sem polling
// - Não preciso acoplar lógica de UI com lógica de negócio
// - O estado da UI é sempre consistent com o estado do sistema
class UIObserver extends Observer {
  constructor() {
    super();
    // Estado da interface do usuário
    // Mantenho uma cópia local dos dados para responder rapidamente às consultas
    this.uiState = {
      songs: [],           // Lista de músicas ordenada
      highestVoted: null,  // Música mais votada atual
      lastUpdate: null     // Timestamp da última atualização
    };
  }

  // Método update obrigatório da interface Observer
  // Atualizo o timestamp e delego para métodos específicos baseado no tipo de evento
  update(data) {
    console.log(`🖥️ UIObserver: Recebeu atualização:`, data.type);
    
    // Marco quando foi a última atualização para debugging e cache
    this.uiState.lastUpdate = new Date().toISOString();
    
    // Delego para métodos específicos baseado no tipo de evento
    switch (data.type) {
      case 'VOTE_CHANGE':
        this.handleVoteChange(data);
        break;
      case 'VOTE_UPDATE':
        this.handleVoteUpdate(data);
        break;
      case 'SONG_ADDED':
        this.handleSongAdded(data);
        break;
    }
  }

  // Lida com mudanças de liderança nas votações
  handleVoteChange(data) {
    this.uiState.songs = data.allSongs;
    this.uiState.highestVoted = data.highestVoted;
    console.log(`🖥️ UIObserver: UI atualizado - nova música mais votada: "${data.highestVoted.title}"`);
    console.log(`📊 UIObserver: Placar de votos atualizado`);
  }

  // Lida com atualizações de votos sem mudança de liderança
  handleVoteUpdate(data) {
    this.uiState.songs = data.allSongs;
    console.log(`🖥️ UIObserver: UI atualizado - votos atualizados para música ID: ${data.songId}`);
  }

  // Lida com adição de novas músicas
  handleSongAdded(data) {
    this.uiState.songs = data.allSongs;
    console.log(`🖥️ UIObserver: UI atualizado - nova música adicionada: "${data.song.title}"`);
  }

  // Método para obter estado atual da interface
  getUIState() {
    return this.uiState;
  }
}

// ============= INICIALIZAÇÃO DO PADRÃO OBSERVER =============

// Cria instâncias
const voteManager = new VoteManager();
const musicPlayer = new MusicPlayer();
const uiObserver = new UIObserver();

// Inscreve observadores no vote manager
voteManager.subscribe(musicPlayer);
voteManager.subscribe(uiObserver);

// ============= EXPRESS APP SETUP =============

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// Número máximo de músicas permitidas na votação
const MAX_SONGS = 12;

// Armazenamento de dados em memória (substituir por banco de dados em produção)
let songs = [
  {
    id: 'audioslave-cochise',
    title: 'Cochise',
    artist: 'Audioslave',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748878548/Audioslave_-_Cochise_HD_YymwGlbqzIc_lz8zjk.mp3',
    albumCover: 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/Audioslave-2002-capa-album-min_iicsnx.webp',
    album: 'Audioslave',
    year: 2002,
    votes: 5,
    addedAt: new Date('2024-01-01').toISOString()
  },
  {
    id: 'deftones-change',
    title: 'Change (In the House of Flies)',
    artist: 'Deftones',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748879300/Deftones_-_Change_In_The_House_Of_Flies_oSDNIINcK08_ejs6hn.mp3',
    albumCover: 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897364/Deftones-WhitePony_af94d8a7-be8b-41ea-8f62-8a6410ace2d2_vbfqyq.webp',
    album: 'White Pony',
    year: 2000,
    votes: 8,
    addedAt: new Date('2024-01-02').toISOString()
  },
  {
    id: 'qotsa-bronze',
    title: 'The Bronze',
    artist: 'Queens of the Stone Age',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748879302/Queens_Of_The_Stone_Age_The_Bronze_P3kM58n2ceE_x9m9kx.mp3',
    albumCover: 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/61bu-cKoykL_nihmew.webp',
    album: 'Queens of the Stone Age',
    year: 1998,
    votes: 3,
    addedAt: new Date('2024-01-03').toISOString()
  },
  {
    id: 'deftones-my-own-summer',
    title: 'My Own Summer (Shove It)',
    artist: 'Deftones',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748879303/Deftones_-_My_Own_Summer_vLjOwAPzt4o_xdemns.mp3',
    albumCover: 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/3e6814b457a9087e0c46d5a949de2766_ik37wx.webp',
    album: 'Around the Fur',
    year: 1997,
    votes: 6,
    addedAt: new Date('2024-01-04').toISOString()
  },
  {
    id: 'soundgarden-outshined',
    title: 'Outshined',
    artist: 'Soundgarden',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748879304/Soundgarden_-_Outshined_Studio_Version_uLZBhlTXHuo_cfqaw1.mp3',
    albumCover: 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897364/71rRNAnVW6L_cpn09c.webp',
    album: 'Badmotorfinger',
    year: 1991,
    votes: 2,
    addedAt: new Date('2024-01-05').toISOString()
  },
  {
    id: 'qotsa-avon',
    title: 'Avon',
    artist: 'Queens of the Stone Age',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748893838/Queens_of_the_Stone_Age_-_Avon_Official_Audio_aimHMr-Ee4o_ay6jsw.mp3',
    albumCover: 'https://upload.wikimedia.org/wikipedia/en/a/a6/Qotsa_lullabies.jpg',
    album: 'Lullabies to Paralyze',
    year: 2005,
    votes: 4,
    addedAt: new Date('2024-01-06').toISOString()
  },
  {
    id: 'qotsa-if-only',
    title: 'If Only',
    artist: 'Queens of the Stone Age',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748893839/Queens_of_the_Stone_Age_-_If_Only_Official_Audio_1HqTh0nd9GE_rojfrl.mp3',
    albumCover: 'https://upload.wikimedia.org/wikipedia/en/a/a6/Qotsa_lullabies.jpg',
    album: 'Lullabies to Paralyze',
    year: 2005,
    votes: 1,
    addedAt: new Date('2024-01-07').toISOString()
  },
  {
    id: 'gorillaz-feel-good-inc',
    title: 'Feel Good Inc.',
    artist: 'Gorillaz',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748893840/Gorillaz_-_Feel_Good_Inc_Lyrics_IbpOfzrNjTY_cwzxnh.mp3',
    albumCover: 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/2025-06-02_17-48_adhnkt.png',
    album: 'Demon Days',
    year: 2005,
    votes: 7,
    addedAt: new Date('2024-01-08').toISOString()
  },
  {
    id: 'rhcp-around-the-world',
    title: 'Around The World',
    artist: 'Red Hot Chili Peppers',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748893841/Red_Hot_Chili_Peppers_-_Around_The_World_Official_Music_Video_HD_UPGRADE_a9eNQZbjpJk_d2oido.mp3',
    albumCover: 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897364/304b3f84-9c1f-4620-bd1d-60d6d63ff7fc_fgs0hh.webp',
    album: 'Californication',
    year: 1999,
    votes: 9,
    addedAt: new Date('2024-01-09').toISOString()
  },
  {
    id: 'gorillaz-dare',
    title: 'DARE',
    artist: 'Gorillaz',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748893841/DARE_rIq6i4-8Nww_hfwl3r.mp3',
    albumCover: 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/2025-06-02_17-48_adhnkt.png',
    album: 'Demon Days',
    year: 2005,
    votes: 3,
    addedAt: new Date('2024-01-10').toISOString()
  },
  {
    id: 'soundgarden-black-hole-sun',
    title: 'Black Hole Sun',
    artist: 'Soundgarden',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748893842/Soundgarden_-_Black_Hole_Sun_HQ_Y6Kz6aXsBSs_lvcs9q.mp3',
    albumCover: 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/soundgarden-superunknown_rvcxuo.webp',
    album: 'Superunknown',
    year: 1994,
    votes: 6,
    addedAt: new Date('2024-01-11').toISOString()
  }
];

let chatMessages = [
  {
    user: 'Sistema',
    message: 'Bem-vindos ao PlayOff! Vote nas suas músicas favoritas! 🎵',
    timestamp: new Date().toISOString()
  }
];

// Função utilitária para manter o limite máximo de músicas no sistema
// Este controle é importante para evitar que a lista cresça indefinidamente
// e para manter a performance da aplicação. Quando o limite é excedido,
// removo as músicas mais antigas (por data de adição) mantendo as mais recentes
const maintainSongsLimit = () => {
  if (songs.length > MAX_SONGS) {
    // Ordeno por data de adição (mais antigas primeiro) e removo o excesso
    // Uso toISOString() para garantir comparação correta de datas
    songs.sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt));
    const removedSongs = songs.splice(0, songs.length - MAX_SONGS);
    
    console.log(`🧹 Limite de ${MAX_SONGS} músicas atingido. Removendo ${removedSongs.length} música(s) mais antiga(s):`);
    removedSongs.forEach(song => {
      console.log(`   - Removida: "${song.title}" por ${song.artist} (adicionada em ${song.addedAt})`);
    });
  }
};

// Função auxiliar para obter a música mais votada
// Esta função é um wrapper conveniente que usa o VoteManager
// Mantenho para compatibilidade com código legado
const getHighestVotedSong = () => {
  return voteManager.getHighestVotedSong();
};

// ============= ROTAS DA API REST =============
// Implementei uma API RESTful completa para gerenciar o sistema de votação
// Cada rota tem tratamento de erro adequado e logging detalhado para debugging
// As respostas seguem um padrão consistente com status de sucesso/erro

// Rota para buscar todas as músicas (ordenadas por votos, maior primeiro)
// Esta é a rota mais importante do sistema pois fornece todos os dados necessários
// para a interface do usuário. Incluo informações do estado atual dos observadores
app.get('/api/songs', (req, res) => {
  try {
    console.log('📡 GET /api/songs - Enviando lista de músicas ordenada por votos');
    
    // Uso o VoteManager para obter músicas ordenadas (padrão Observer em ação)
    const sortedSongs = voteManager.getAllSongsSorted();
    const highestVoted = voteManager.getHighestVotedSong();
    
    // Obtenho estado dos observadores para debugging e monitoring
    const uiState = uiObserver.getUIState();
    const playerState = musicPlayer.getCurrentPlaying();
    
    // Resposta completa com todos os dados necessários para o frontend
    res.json({ 
      songs: sortedSongs,              // Lista ordenada por votos
      highestVoted: highestVoted,      // Música líder atual
      totalSongs: songs.length,        // Total de músicas no sistema
      maxSongs: MAX_SONGS,             // Limite máximo permitido
      currentPlaying: playerState,     // Estado do player de música
      uiState: uiState,                // Estado da interface
      success: true                    // Flag de sucesso
    });
    
    console.log(`✅ Enviadas ${sortedSongs.length} músicas. Líder: "${highestVoted?.title || 'Nenhuma'}" com ${highestVoted?.votes || 0} votos`);
  } catch (error) {
    console.error('❌ Erro ao buscar músicas:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao buscar músicas', 
      success: false 
    });
  }
});

// Rota para registrar um voto simples em uma música
// Esta rota utiliza o padrão Observer para notificar automaticamente
// todos os componentes interessados sobre o novo voto
app.post('/api/vote', (req, res) => {
  try {
    const { songId, votes } = req.body;
    
    // Validação de entrada - songId é obrigatório
    if (!songId) {
      console.log('❌ Tentativa de voto sem songId');
      return res.status(400).json({ 
        error: 'ID da música é obrigatório para votação', 
        success: false 
      });
    }
    
    // Verifico se a música existe no sistema
    const song = songs.find(s => s.id === songId);
    if (!song) {
      console.log(`❌ Tentativa de voto em música inexistente: ${songId}`);
      return res.status(404).json({ 
        error: 'Música não encontrada no sistema', 
        success: false 
      });
    }
    
    // Processo o voto usando o VoteManager (padrão Observer)
    // Isso automaticamente notificará todos os observadores registrados
    const newVoteCount = (song.votes || 0) + 1;
    console.log(`🗳️ Processando voto para "${song.title}" - novo total: ${newVoteCount}`);
    voteManager.processVote(songId, newVoteCount);
    
    // Obtenho estados atualizados após o voto
    const highestVoted = voteManager.getHighestVotedSong();
    const playerState = musicPlayer.getCurrentPlaying();
    
    // Resposta com informações completas sobre o resultado do voto
    res.json({ 
      song: song,                      // Música votada
      highestVoted: highestVoted,      // Nova música líder (se mudou)
      currentPlaying: playerState,     // Estado atual do player
      message: `Voto registrado para "${song.title}"! Total: ${song.votes} votos`,
      success: true 
    });
    
    console.log(`✅ Voto registrado com sucesso para "${song.title}" por ${song.artist}`);
  } catch (error) {
    console.error('❌ Erro ao registrar voto:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao processar voto', 
      success: false 
    });
  }
});

// Rota para super voto - adiciona votos suficientes para assumir a liderança
// O super voto é uma funcionalidade especial que garante que a música escolhida
// ficará em primeiro lugar, adicionando votos suficientes para superar a líder atual
app.post('/api/super-vote', (req, res) => {
  try {
    const { songId, totalVotes, votesAdded } = req.body;
    
    // Validação de entrada
    if (!songId) {
      console.log('❌ Tentativa de super voto sem songId');
      return res.status(400).json({ 
        error: 'ID da música é obrigatório para super voto', 
        success: false 
      });
    }
    
    // Verifico se a música existe
    const song = songs.find(s => s.id === songId);
    if (!song) {
      console.log(`❌ Tentativa de super voto em música inexistente: ${songId}`);
      return res.status(404).json({ 
        error: 'Música não encontrada no sistema', 
        success: false 
      });
    }
    
    console.log(`⚡ Super voto recebido para "${song.title}" - adicionando ${votesAdded} votos (total: ${totalVotes})`);
    
    // Uso o VoteManager para processar o super voto
    // O padrão Observer garantirá que todos os componentes sejam notificados
    voteManager.processVote(songId, totalVotes);
    
    // Obtenho estados atualizados
    const highestVoted = voteManager.getHighestVotedSong();
    const playerState = musicPlayer.getCurrentPlaying();
    
    // Resposta detalhada sobre o super voto
    res.json({ 
      song: song,
      highestVoted: highestVoted,
      currentPlaying: playerState,
      votesAdded: votesAdded,
      message: `⚡ Super Voto executado! "${song.title}" agora tem ${song.votes} votos e está em 1º lugar!`,
      success: true 
    });
    
    console.log(`✅ Super voto processado com sucesso! "${song.title}" agora lidera com ${song.votes} votos`);
  } catch (error) {
    console.error('❌ Erro ao registrar super voto:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao processar super voto', 
      success: false 
    });
  }
});

// Rota para adicionar nova música ao sistema
// Esta rota permite que usuários adicionem músicas através da API
// Inclui validações e integração com APIs externas para obter metadados
app.post('/api/songs', async (req, res) => {
  try {
    const { title, artist, audioUrl, albumCover, album, year } = req.body;
    
    // Validações obrigatórias
    if (!title || !artist) {
      console.log('❌ Tentativa de adicionar música sem dados obrigatórios');
      return res.status(400).json({ 
        error: 'Título e artista são obrigatórios', 
        success: false 
      });
    }
    
    // Verifico se a música já existe para evitar duplicatas
    const existingSong = songs.find(s => 
      s.title.toLowerCase() === title.toLowerCase() && 
      s.artist.toLowerCase() === artist.toLowerCase()
    );
    
    if (existingSong) {
      console.log(`❌ Música já existe: "${title}" por ${artist}`);
      return res.status(409).json({ 
        error: `"${title}" por ${artist} já está na lista de votação`, 
        success: false 
      });
    }
    
    // Verifico o limite de músicas antes de adicionar
    if (songs.length >= MAX_SONGS) {
      console.log(`❌ Limite de ${MAX_SONGS} músicas atingido`);
      return res.status(400).json({ 
        error: `Limite máximo de ${MAX_SONGS} músicas atingido`, 
        success: false 
      });
    }
    
    console.log(`🎵 Adicionando nova música: "${title}" por ${artist}`);
    
    // Busco capa do álbum se não foi fornecida
    let finalAlbumCover = albumCover;
    if (!finalAlbumCover) {
      console.log(`🎨 Buscando capa do álbum para: ${artist} - ${title}`);
      finalAlbumCover = await searchAlbumCover(artist, album, title);
      
      // Se não encontrar, uso placeholder
      if (!finalAlbumCover) {
        finalAlbumCover = generatePlaceholderCover(artist, title);
        console.log(`🎨 Usando capa placeholder para "${title}"`);
      }
    }
    
    // Crio nova música com dados completos
    const newSong = {
      id: `song-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID único
      title: title.trim(),
      artist: artist.trim(),
      album: album || 'Álbum Desconhecido',
      audioUrl: audioUrl || 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748879303/sample_audio_preview.mp3',
      albumCover: finalAlbumCover,
      year: year || new Date().getFullYear(),
      votes: 0,                                    // Começa com zero votos
      addedAt: new Date().toISOString(),          // Timestamp de adição
      addedBy: 'API'                              // Fonte da adição
    };
    
    // Uso o VoteManager para adicionar (padrão Observer)
    voteManager.addSong(newSong);
    
    // Mantenho o limite de músicas
    maintainSongsLimit();
    
    console.log(`✅ Música adicionada com sucesso: "${newSong.title}" (ID: ${newSong.id})`);
    
    res.status(201).json({ 
      song: newSong,
      message: `"${newSong.title}" por ${newSong.artist} foi adicionada com sucesso!`,
      totalSongs: songs.length,
      success: true 
    });
    
  } catch (error) {
    console.error('❌ Erro ao adicionar música:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao adicionar música', 
      success: false 
    });
  }
});

// Rota para health check - verifica se o servidor está funcionando
// Útil para monitoring e debugging da aplicação
app.get('/api/health', (req, res) => {
  console.log('🔍 Health check requisitado');
  
  // Informações detalhadas sobre o estado do sistema
  const healthInfo = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    totalSongs: songs.length,
    maxSongs: MAX_SONGS,
    observersRegistered: voteManager.observers.length,
    highestVoted: voteManager.getHighestVotedSong(),
    playerStatus: musicPlayer.getCurrentPlaying(),
    uiState: uiObserver.getUIState(),
    memoryUsage: process.memoryUsage(),
    version: '3.1.0'
  };
  
  res.json(healthInfo);
  console.log('✅ Health check respondido - Sistema funcionando normalmente');
});

// Inicialização do servidor e configuração final
// Esta seção é responsável por inicializar todo o sistema e configurar
// o estado inicial da aplicação. É aqui que toda a arquitetura se junta
const server = app.listen(PORT, () => {
  console.log(`📀 Carregadas ${songs.length} músicas com URLs do Cloudinary`);
  console.log(`🎵 PlayOff Music Voting App - Sistema de Votação Musical`);
  console.log(`📱 Frontend: http://localhost:${PORT}/`);
  console.log(`🎧 Backend com Padrão Observer ativo!`);
  console.log(`👀 Observadores registrados: ${voteManager.observers.length}`);
  console.log(`   - ${musicPlayer.constructor.name}: Gerencia reprodução de música`);
  console.log(`   - ${uiObserver.constructor.name}: Gerencia atualizações de estado da UI`);
  console.log(`🗳️ Vote Manager: Pronto para receber votos`);
  console.log(`🎵 Music Player: Pronto para reproduzir músicas`);
  console.log(`💬 Sistema de Chat: Pronto para conversas`);
  
  // Inicializo o VoteManager com a música mais votada atual
  // Isso garante que o sistema comece com o estado correto
  // e que o player já saiba qual música deveria estar tocando
  const initialHighestVoted = voteManager.getHighestVotedSong();
  if (initialHighestVoted) {
    voteManager.currentHighestVoted = initialHighestVoted;
    console.log(`👑 Música inicial mais votada: "${initialHighestVoted.title}" por ${initialHighestVoted.artist} (${initialHighestVoted.votes} votos)`);
    
    // Aciono a configuração inicial do player de música
    // Isso faz com que a música mais votada comece a "tocar" automaticamente
    musicPlayer.playTrack(initialHighestVoted);
  }
  
  console.log(`🚀 Sistema pronto para funcionar! Que comecem as votações!`);
});

// Gerenciamento de desligamento gracioso do servidor
// Implemento um shutdown gracioso para garantir que todas as operações
// sejam finalizadas adequadamente antes de encerrar o processo
// Isso é especialmente importante em produção para evitar perda de dados
process.on('SIGTERM', () => {
  console.log('🛑 Servidor sendo desligado graciosamente...');
  server.close(() => {
    console.log('✅ Servidor fechado com sucesso');
    console.log('👋 Até mais! Obrigado por usar o PlayOff!');
  });
});