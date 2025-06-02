const express = require('express');
const cors = require('cors');
const path = require('path');

// Import fetch for Node.js versions that don't have it natively
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// ============= OBSERVER PATTERN IMPLEMENTATION =============

// Observer interface
class Observer {
  update(data) {
    throw new Error('Observer update method must be implemented');
  }
}

// Subject class (Observable)
class Subject {
  constructor() {
    this.observers = [];
  }

  subscribe(observer) {
    if (observer instanceof Observer) {
      this.observers.push(observer);
      console.log(`👀 Observer registered: ${observer.constructor.name}`);
    } else {
      throw new Error('Observer must implement Observer interface');
    }
  }

  unsubscribe(observer) {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
      console.log(`👋 Observer unregistered: ${observer.constructor.name}`);
    }
  }

  notify(data) {
    console.log(`🔔 Notifying ${this.observers.length} observers with data:`, data);
    this.observers.forEach(observer => {
      try {
        observer.update(data);
      } catch (error) {
        console.error(`❌ Error notifying observer ${observer.constructor.name}:`, error);
      }
    });
  }
}

// VoteManager - Subject that manages voting and notifies observers
class VoteManager extends Subject {
  constructor() {
    super();
    this.currentHighestVoted = null;
  }

  processVote(songId, newVoteCount) {
    console.log(`🗳️ VoteManager: Processing vote for song ${songId} with ${newVoteCount} votes`);
    
    // Find the song and update
    const song = songs.find(s => s.id === songId);
    if (song) {
      song.votes = newVoteCount;
      console.log(`🗳️ Vote registered for "${song.title}" - Total: ${song.votes} votes`);
      
      // Check if highest voted song changed
      const newHighestVoted = this.getHighestVotedSong();
      const hasChanged = !this.currentHighestVoted || 
                        this.currentHighestVoted.id !== newHighestVoted?.id;
      
      if (hasChanged && newHighestVoted) {
        this.currentHighestVoted = newHighestVoted;
        console.log(`👑 New highest voted song: "${newHighestVoted.title}" by ${newHighestVoted.artist} (${newHighestVoted.votes} votes)`);
        
        // Notify all observers about the vote change
        this.notify({
          type: 'VOTE_CHANGE',
          songId: songId,
          newVotes: newVoteCount,
          highestVoted: newHighestVoted,
          allSongs: this.getAllSongsSorted()
        });
      } else {
        // Just notify about the vote update
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

  getHighestVotedSong() {
    if (songs.length === 0) return null;
    return [...songs].sort((a, b) => b.votes - a.votes)[0];
  }

  getAllSongsSorted() {
    return [...songs].sort((a, b) => b.votes - a.votes);
  }

  addSong(newSong) {
    songs.push(newSong);
    console.log(`🎵 VoteManager: New song added: "${newSong.title}" by ${newSong.artist}`);
    
    // Notify observers about new song
    this.notify({
      type: 'SONG_ADDED',
      song: newSong,
      allSongs: this.getAllSongsSorted()
    });
  }
}

// MusicPlayer - Observer that reacts to vote changes
class MusicPlayer extends Observer {
  constructor() {
    super();
    this.currentPlaying = null;
    this.isPlaying = false;
  }

  update(data) {
    console.log(`🎵 MusicPlayer: Received update:`, data.type);
    
    switch (data.type) {
      case 'VOTE_CHANGE':
        this.handleVoteChange(data.highestVoted);
        break;
      case 'VOTE_UPDATE':
        this.handleVoteUpdate(data);
        break;
      case 'SONG_ADDED':
        this.handleSongAdded(data.song);
        break;
    }
  }

  handleVoteChange(newHighestVoted) {
    if (newHighestVoted && (!this.currentPlaying || this.currentPlaying.id !== newHighestVoted.id)) {
      console.log(`🎵 MusicPlayer: Switching to new highest voted song: "${newHighestVoted.title}"`);
      this.playTrack(newHighestVoted);
    }
  }

  handleVoteUpdate(data) {
    console.log(`🎵 MusicPlayer: Vote updated for song, current highest still: "${data.highestVoted?.title}"`);
  }

  handleSongAdded(song) {
    console.log(`🎵 MusicPlayer: New song available: "${song.title}" by ${song.artist}`);
  }

  playTrack(song) {
    this.currentPlaying = song;
    this.isPlaying = true;
    console.log(`▶️ MusicPlayer: Now playing "${song.title}" by ${song.artist}`);
    console.log(`🔗 Audio URL: ${song.audioUrl}`);
    
    // Simulate playing (in real implementation, this would control actual audio playback)
    setTimeout(() => {
      console.log(`⏸️ MusicPlayer: Finished playing "${song.title}"`);
      this.isPlaying = false;
    }, 3000); // Simulate 3 second preview
  }

  getCurrentPlaying() {
    return {
      song: this.currentPlaying,
      isPlaying: this.isPlaying
    };
  }
}

// UIObserver - Observer that reacts to changes and updates UI state
class UIObserver extends Observer {
  constructor() {
    super();
    this.uiState = {
      songs: [],
      highestVoted: null,
      lastUpdate: null
    };
  }

  update(data) {
    console.log(`🖥️ UIObserver: Received update:`, data.type);
    
    this.uiState.lastUpdate = new Date().toISOString();
    
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

  handleVoteChange(data) {
    this.uiState.songs = data.allSongs;
    this.uiState.highestVoted = data.highestVoted;
    console.log(`🖥️ UIObserver: UI updated - new highest voted: "${data.highestVoted.title}"`);
    console.log(`📊 UIObserver: Vote leaderboard updated`);
  }

  handleVoteUpdate(data) {
    this.uiState.songs = data.allSongs;
    console.log(`🖥️ UIObserver: UI updated - vote count changed for song ID: ${data.songId}`);
  }

  handleSongAdded(data) {
    this.uiState.songs = data.allSongs;
    console.log(`🖥️ UIObserver: UI updated - new song added: "${data.song.title}"`);
  }

  getUIState() {
    return this.uiState;
  }
}

// ============= INITIALIZE OBSERVER PATTERN =============

// Create instances
const voteManager = new VoteManager();
const musicPlayer = new MusicPlayer();
const uiObserver = new UIObserver();

// Subscribe observers to the vote manager
voteManager.subscribe(musicPlayer);
voteManager.subscribe(uiObserver);

// ============= EXPRESS APP SETUP =============

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// Maximum number of songs allowed in voting
const MAX_SONGS = 12;

// In-memory data storage (replace with database in production)
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

// Utility function to maintain max songs limit
const maintainSongsLimit = () => {
  if (songs.length > MAX_SONGS) {
    // Sort by votes (ascending) then by addedAt (oldest first)
    const sortedByPriority = [...songs].sort((a, b) => {
      if (a.votes !== b.votes) {
        return a.votes - b.votes; // Lower votes first
      }
      return new Date(a.addedAt) - new Date(b.addedAt); // Older first
    });

    // Remove the least voted/oldest songs to maintain limit
    const songsToRemove = sortedByPriority.slice(0, songs.length - MAX_SONGS);
    
    songsToRemove.forEach(songToRemove => {
      const index = songs.findIndex(s => s.id === songToRemove.id);
      if (index > -1) {
        songs.splice(index, 1);
        console.log(`🗑️ Removed song "${songToRemove.title}" (${songToRemove.votes} votes) to maintain ${MAX_SONGS} song limit`);
      }
    });
  }
};

// Get current highest voted song
const getHighestVotedSong = () => {
  if (songs.length === 0) return null;
  return [...songs].sort((a, b) => b.votes - a.votes)[0];
};

// API Routes

// Get songs (sorted by votes, highest first)
app.get('/api/songs', (req, res) => {
  try {
    console.log('📡 GET /api/songs - Enviando lista de músicas');
    const sortedSongs = voteManager.getAllSongsSorted();
    const highestVoted = voteManager.getHighestVotedSong();
    const uiState = uiObserver.getUIState();
    const playerState = musicPlayer.getCurrentPlaying();
    
    res.json({ 
      songs: sortedSongs,
      highestVoted: highestVoted,
      totalSongs: songs.length,
      maxSongs: MAX_SONGS,
      currentPlaying: playerState,
      uiState: uiState,
      success: true 
    });
  } catch (error) {
    console.error('❌ Erro ao buscar músicas:', error);
    res.status(500).json({ error: 'Erro interno do servidor', success: false });
  }
});

// Vote for song
app.post('/api/vote', (req, res) => {
  try {
    const { songId, votes } = req.body;
    
    if (!songId) {
      return res.status(400).json({ error: 'ID da música é obrigatório', success: false });
    }
    
    const song = songs.find(s => s.id === songId);
    if (!song) {
      return res.status(404).json({ error: 'Música não encontrada', success: false });
    }
    
    // Use VoteManager to process the vote (Observer pattern)
    const newVoteCount = (song.votes || 0) + 1;
    voteManager.processVote(songId, newVoteCount);
    
    const highestVoted = voteManager.getHighestVotedSong();
    const playerState = musicPlayer.getCurrentPlaying();
    
    res.json({ 
      song: song,
      highestVoted: highestVoted,
      currentPlaying: playerState,
      message: `Voto registrado para "${song.title}"!`,
      success: true 
    });
  } catch (error) {
    console.error('❌ Erro ao registrar voto:', error);
    res.status(500).json({ error: 'Erro interno do servidor', success: false });
  }
});

// Super vote for song - adds multiple votes to surpass current highest
app.post('/api/super-vote', (req, res) => {
  try {
    const { songId, totalVotes, votesAdded } = req.body;
    
    if (!songId) {
      return res.status(400).json({ error: 'ID da música é obrigatório', success: false });
    }
    
    const song = songs.find(s => s.id === songId);
    if (!song) {
      return res.status(404).json({ error: 'Música não encontrada', success: false });
    }
    
    console.log(`⚡ Super voto recebido para "${song.title}" - adicionando ${votesAdded} votos`);
    
    // Use VoteManager to process the super vote
    voteManager.processVote(songId, totalVotes);
    
    const highestVoted = voteManager.getHighestVotedSong();
    const playerState = musicPlayer.getCurrentPlaying();
    
    res.json({ 
      song: song,
      highestVoted: highestVoted,
      currentPlaying: playerState,
      votesAdded: votesAdded,
      message: `⚡ Super Voto! "${song.title}" agora tem ${song.votes} votos!`,
      success: true 
    });
  } catch (error) {
    console.error('❌ Erro ao registrar super voto:', error);
    res.status(500).json({ error: 'Erro interno do servidor', success: false });
  }
});

// Get current player state
app.get('/api/player', (req, res) => {
  try {
    const playerState = musicPlayer.getCurrentPlaying();
    const highestVoted = voteManager.getHighestVotedSong();
    
    res.json({
      currentPlaying: playerState,
      highestVoted: highestVoted,
      success: true
    });
  } catch (error) {
    console.error('❌ Erro ao buscar estado do player:', error);
    res.status(500).json({ error: 'Erro interno do servidor', success: false });
  }
});

// Get chat messages
app.get('/api/chat', (req, res) => {
  try {
    console.log('💬 GET /api/chat - Enviando mensagens do chat');
    res.json({ 
      messages: chatMessages.slice(-20), // Return last 20 messages
      success: true 
    });
  } catch (error) {
    console.error('❌ Erro ao buscar chat:', error);
    res.status(500).json({ error: 'Erro interno do servidor', success: false });
  }
});

// Send chat message
app.post('/api/chat', async (req, res) => {
  try {
    const { user, message, timestamp } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Mensagem é obrigatória', success: false });
    }
    
    const newMessage = {
      user: user || 'Anônimo',
      message: message.trim(),
      timestamp: timestamp || new Date().toISOString()
    };
    
    chatMessages.push(newMessage);
    
    // Keep only last 100 messages
    if (chatMessages.length > 100) {
      chatMessages = chatMessages.slice(-100);
    }
    
    console.log(`💬 Nova mensagem de ${newMessage.user}: ${newMessage.message}`);
    
    // Detect music commands in chat
    const musicCommand = detectMusicCommand(message.trim());
    if (musicCommand) {
      console.log(`🎵 Comando de música detectado: ${musicCommand.artist} - ${musicCommand.title}`);
      
      // Add bot response immediately
      chatMessages.push({
        user: 'DJ Bot',
        message: `🔍 Processando "${musicCommand.artist} - ${musicCommand.title}"...`,
        timestamp: new Date().toISOString()
      });
      
      // Execute music search immediately
      searchAndAddMusicFromChat(musicCommand.artist, musicCommand.title, newMessage.user);
    } else {
      // Auto-detect music mentions and add responses
      if (message.toLowerCase().includes('música') || message.toLowerCase().includes('som') || 
          message.toLowerCase().includes('tocar') || message.toLowerCase().includes('add')) {
        setTimeout(() => {
          chatMessages.push({
            user: 'DJ Bot',
            message: '🎵 Para adicionar uma música, digite: "add Artista - Música" (ex: "add The Beatles - Hey Jude") 🎶',
            timestamp: new Date().toISOString()
          });
        }, 1000);
      }
    }
    
    res.json({ 
      message: newMessage,
      success: true 
    });
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor', success: false });
  }
});

// Function to detect music commands in chat messages
function detectMusicCommand(message) {
  const lowerMessage = message.toLowerCase();
  
  // Patterns to detect music commands
  const patterns = [
    /^(?:add|adicionar|música|music|tocar|play)\s+(.+?)\s*-\s*(.+)$/i,
    /^(.+?)\s*-\s*(.+?)\s*(?:add|adicionar|música|music|tocar|play)$/i,
    /^(?:buscar|search)\s+(.+?)\s*-\s*(.+)$/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[2]) {
      return {
        artist: match[1].trim(),
        title: match[2].trim()
      };
    }
  }
  
  return null;
}

// Function to search Spotify and add music from chat command
async function searchAndAddMusicFromChat(artist, title, requestedBy) {
  try {
    console.log(`🔍 Processando comando: ${artist} - ${title}`);
    
    // Search for album cover first
    console.log(`🎨 Buscando capa do álbum para: ${artist} - ${title}`);
    let albumCover = await searchAlbumCover(artist, null, title);
    
    // Fallback to placeholder if no cover found
    if (!albumCover) {
      albumCover = generatePlaceholderCover(artist, title);
    }
    
    // Create placeholder song immediately
    console.log(`📝 Criando música: ${artist} - ${title}`);
    const newSong = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title,
      artist: artist,
      album: 'Adicionada via Chat',
      audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748879303/sample_audio_preview.mp3',
      albumCover: albumCover,
      year: new Date().getFullYear(),
      votes: 0,
      addedAt: new Date().toISOString(),
      spotifyUrl: null,
      cloudinaryId: null,
      duration: 180000, // 3 minutes default
      popularity: 50,
      releaseDate: new Date().getFullYear(),
      addedBy: requestedBy || 'Chat'
    };
    
    // Check if song already exists
    const existingSong = songs.find(s => 
      s.title.toLowerCase() === newSong.title.toLowerCase() && 
      s.artist.toLowerCase() === newSong.artist.toLowerCase()
    );
    
    if (existingSong) {
      chatMessages.push({
        user: 'DJ Bot',
        message: `❌ "${newSong.title}" por ${newSong.artist} já está na lista de votação!`,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Use VoteManager to add new song (Observer pattern)
    voteManager.addSong(newSong);
    
    // Maintain songs limit
    maintainSongsLimit();
    
    console.log(`🎵 Música adicionada via chat: ${newSong.title} - ${newSong.artist} (solicitada por ${requestedBy})`);
    
    // Add success message to chat
    const coverMessage = albumCover && !albumCover.includes('placeholder') ? '🎨 Com capa do álbum!' : '🖼️ Com capa gerada!';
    chatMessages.push({
      user: 'DJ Bot',
      message: `✅ "${newSong.title}" por ${newSong.artist} foi adicionada à votação! 🎵 ${coverMessage} Solicitada por ${requestedBy}`,
      timestamp: new Date().toISOString()
    });
    
    // Add vote reminder
    setTimeout(() => {
      chatMessages.push({
        user: 'DJ Bot',
        message: `🗳️ Não se esqueçam de votar! A música mais votada toca automaticamente! 📊`,
        timestamp: new Date().toISOString()
      });
    }, 2000);
    
  } catch (error) {
    console.error('❌ Erro ao processar música via chat:', error);
    
    // Add error message to chat
    chatMessages.push({
      user: 'DJ Bot',
      message: `❌ Erro ao processar "${artist} - ${title}". Tente novamente! 🔍`,
      timestamp: new Date().toISOString()
    });
  }
}

// Function to generate placeholder album cover
function generatePlaceholderCover(artist, title) {
  const colors = [
    'ff6b6b', 'feca57', '48dbfb', 'ff9ff3', '54a0ff',
    '5f27cd', '00d2d3', 'ff9f43', 'ee5a6f', '0abde3'
  ];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const encodedArtist = encodeURIComponent(artist.slice(0, 15));
  const encodedTitle = encodeURIComponent(title.slice(0, 15));
  
  return `https://via.placeholder.com/300x300/${randomColor}/ffffff?text=${encodedArtist}+-+${encodedTitle}`;
}

// Function to search for album cover using Last.fm API or MusicBrainz
async function searchAlbumCover(artist, album, title) {
  try {
    console.log(`🔍 Buscando capa para: ${artist} - ${album || title}`);
    
    // Enhanced fallback covers database
    const fallbackCovers = {
      'nirvana nevermind': 'https://upload.wikimedia.org/wikipedia/en/b/b7/NirvanaNevermindalbumcover.jpg',
      'nirvana in utero': 'https://upload.wikimedia.org/wikipedia/en/5/50/In_Utero.png',
      'nirvana smells like teen spirit': 'https://upload.wikimedia.org/wikipedia/en/b/b7/NirvanaNevermindalbumcover.jpg',
      'linkin park hybrid theory': 'https://upload.wikimedia.org/wikipedia/en/1/1c/Linkin_Park_Hybrid_Theory_Album_Cover.jpg',
      'linkin park meteora': 'https://upload.wikimedia.org/wikipedia/en/0/03/LinkinParkMeteora.jpg',
      'linkin park in the end': 'https://upload.wikimedia.org/wikipedia/en/1/1c/Linkin_Park_Hybrid_Theory_Album_Cover.jpg',
      'audioslave': 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/Audioslave-2002-capa-album-min_iicsnx.webp',
      'deftones white pony': 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897364/Deftones-WhitePony_af94d8a7-be8b-41ea-8f62-8a6410ace2d2_vbfqyq.webp',
      'deftones around the fur': 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/3e6814b457a9087e0c46d5a949de2766_ik37wx.webp',
      'deftones change': 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897364/Deftones-WhitePony_af94d8a7-be8b-41ea-8f62-8a6410ace2d2_vbfqyq.webp',
      'deftones my own summer': 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/3e6814b457a9087e0c46d5a949de2766_ik37wx.webp',
      'queens of the stone age': 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/61bu-cKoykL_nihmew.webp',
      'soundgarden badmotorfinger': 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897364/71rRNAnVW6L_cpn09c.webp',
      'soundgarden superunknown': 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/soundgarden-superunknown_rvcxuo.webp',
      'soundgarden black hole sun': 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/soundgarden-superunknown_rvcxuo.webp',
      'soundgarden outshined': 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897364/71rRNAnVW6L_cpn09c.webp',
      'gorillaz demon days': 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/2025-06-02_17-48_adhnkt.png',
      'red hot chili peppers californication': 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897364/304b3f84-9c1f-4620-bd1d-60d6d63ff7fc_fgs0hh.webp',
      'queens of the stone age lullabies to paralyze': 'https://upload.wikimedia.org/wikipedia/en/a/a6/Qotsa_lullabies.jpg',
      'radiohead ok computer': 'https://upload.wikimedia.org/wikipedia/en/b/ba/Radioheadokcomputer.png',
      'radiohead the bends': 'https://upload.wikimedia.org/wikipedia/en/8/8b/Radiohead.thebends.albumart.jpg',
      'radiohead creep': 'https://upload.wikimedia.org/wikipedia/en/f/f2/Radiohead_-_Pablo_Honey.png'
    };
    
    // Check fallback database first for faster response
    const searchKey = `${artist.toLowerCase()} ${(album || title).toLowerCase()}`;
    for (const [key, cover] of Object.entries(fallbackCovers)) {
      if (searchKey.includes(key) || key.includes(artist.toLowerCase())) {
        console.log(`✅ Capa encontrada no fallback: ${cover}`);
        return cover;
      }
    }
    
    // Try iTunes API first (usually more reliable)
    try {
      const iTunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + (album || title))}&media=music&entity=album&limit=3`;
      const response = await fetch(iTunesUrl);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Try to find exact match first
        let bestMatch = data.results.find(result => 
          result.artistName.toLowerCase().includes(artist.toLowerCase()) &&
          (result.collectionName.toLowerCase().includes((album || title).toLowerCase()) ||
           result.trackName?.toLowerCase().includes(title.toLowerCase()))
        );
        
        // Fallback to first result if no exact match
        if (!bestMatch) {
          bestMatch = data.results[0];
        }
        
        if (bestMatch && bestMatch.artworkUrl100) {
          // Get higher resolution image (600x600)
          const highResArtwork = bestMatch.artworkUrl100.replace('100x100bb', '600x600bb');
          console.log(`✅ Capa encontrada no iTunes: ${highResArtwork}`);
          return highResArtwork;
        }
      }
    } catch (iTunesError) {
      console.log(`⚠️ iTunes API error: ${iTunesError.message}`);
    }
    
    // Try Last.fm API as backup
    const lastfmApiKey = process.env.LASTFM_API_KEY || '174b9ac26b27f5081fbe07c4c1a25b89'; // Free demo key
    
    if (lastfmApiKey && lastfmApiKey !== 'demo_key') {
      try {
        const searchQuery = album || title;
        const lastfmUrl = `http://ws.audioscrobbler.com/2.0/?method=album.getinfo&api_key=${lastfmApiKey}&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(searchQuery)}&format=json`;
        
        const response = await fetch(lastfmUrl);
        const data = await response.json();
        
        if (data.album && data.album.image) {
          // Get the largest image available
          const images = data.album.image;
          const largeImage = images.find(img => img.size === 'extralarge') || 
                           images.find(img => img.size === 'large') || 
                           images[images.length - 1];
          
          if (largeImage && largeImage['#text']) {
            console.log(`✅ Capa encontrada no Last.fm: ${largeImage['#text']}`);
            return largeImage['#text'];
          }
        }
      } catch (lastfmError) {
        console.log(`⚠️ Last.fm API error: ${lastfmError.message}`);
      }
    }
    
    console.log(`⚠️ Nenhuma capa encontrada para: ${artist} - ${album || title}`);
    return null;
    
  } catch (error) {
    console.error(`❌ Erro ao buscar capa do álbum: ${error.message}`);
    return null;
  }
}

// API endpoint to update album covers for existing songs
app.post('/api/update-covers', async (req, res) => {
  try {
    console.log('🎨 Iniciando atualização das capas de álbuns...');
    let updatedCount = 0;
    
    for (const song of songs) {
      if (!song.albumCover || song.albumCover.includes('placeholder') || song.albumCover.includes('via.placeholder')) {
        console.log(`🔍 Atualizando capa para: ${song.artist} - ${song.title}`);
        
        const newCover = await searchAlbumCover(song.artist, song.album, song.title);
        if (newCover && newCover !== song.albumCover) {
          song.albumCover = newCover;
          updatedCount++;
          console.log(`✅ Capa atualizada para: ${song.title} - ${newCover}`);
        }
      }
    }
    
    console.log(`🎨 Atualização concluída: ${updatedCount} capas atualizadas`);
    res.json({ 
      success: true, 
      message: `${updatedCount} capas de álbuns foram atualizadas`,
      updatedCount 
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar capas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao atualizar capas',
      message: error.message 
    });
  }
});

// Update existing songs with proper album covers
songs.forEach(song => {
  if (song.albumCover && song.albumCover.includes('placeholder')) {
    if (song.artist.toLowerCase().includes('nirvana') && song.title.toLowerCase().includes('smells like teen spirit')) {
      song.albumCover = 'https://upload.wikimedia.org/wikipedia/en/b/b7/NirvanaNevermindalbumcover.jpg';
      console.log(`✅ Capa atualizada para: ${song.title} - ${song.albumCover}`);
    } else if (song.artist.toLowerCase().includes('linkin park') && song.title.toLowerCase().includes('in the end')) {
      song.albumCover = 'https://upload.wikimedia.org/wikipedia/en/1/1c/Linkin_Park_Hybrid_Theory_Album_Cover.jpg';
      console.log(`✅ Capa atualizada para: ${song.title} - ${song.albumCover}`);
    }
  }
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`📀 Loaded ${songs.length} songs with Cloudinary URLs`);
  console.log(`🎵 PlayOff Music Voting App`);
  console.log(`📱 Frontend: http://localhost:${PORT}/`);
  console.log(`🎧 Backend with Observer Pattern active!`);
  console.log(`👀 Observers registered: ${voteManager.observers.length}`);
  console.log(`   - ${musicPlayer.constructor.name}: Manages music playback`);
  console.log(`   - ${uiObserver.constructor.name}: Manages UI state updates`);
  console.log(`🗳️ Vote Manager: Ready to receive votes`);
  console.log(`🎵 Music Player: Ready to play tracks`);
  console.log(`💬 Chat Manager: Ready for conversations`);
  
  // Initialize VoteManager with current highest voted song
  const initialHighestVoted = voteManager.getHighestVotedSong();
  if (initialHighestVoted) {
    voteManager.currentHighestVoted = initialHighestVoted;
    console.log(`👑 Initial highest voted song: "${initialHighestVoted.title}" by ${initialHighestVoted.artist} (${initialHighestVoted.votes} votes)`);
    // Trigger initial music player setup
    musicPlayer.playTrack(initialHighestVoted);
  }
  
  console.log(`🚀 Ready to rock!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
  });
});