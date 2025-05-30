// PlayOff Music Voting App - JavaScript Vanilla com Spotify Real
class PlayOffApp {
    constructor() {
        // State
        this.currentSong = {
            title: 'Waiting for You',
            artist: 'Deftones',
            albumCover: 'https://i.scdn.co/image/ab67616d0000b273481ac9fb5a93e7e6cfb99815',
            isPlaying: false,
            duration: 227,
            currentTime: 0,
            uri: null
        };
        
        this.votingSongs = [];
        this.chatMessages = [
            {
                id: 1,
                username: 'PlayOff',
                message: 'Bem-vindos ao PlayOff! 🎵',
                timestamp: Date.now() - 60000
            },
            {
                id: 2,
                username: 'RockFan',
                message: 'Música incrível! 🤘',
                timestamp: Date.now() - 30000
            }
        ];
        
        this.spotifyConnected = false;
        this.progressUpdateInterval = null;
        
        // Initialize app
        this.init();
    }
    
    async init() {
        this.bindEvents();
        this.loadLocalData();
        this.updateUI();
        this.startProgressUpdates();
        this.startAutomaticMessages();
        
        // Check if Spotify is already connected
        if (window.spotifyHelper && window.spotifyHelper.getToken()) {
            this.spotifyConnected = true;
            this.updateSpotifyUI();
            await this.loadPlayoffPlaylist();
        }
    }
    
    bindEvents() {
        // Music controls
        const playPauseBtn = document.getElementById('play-pause-btn');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousTrack());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextTrack());
        }
        
        // Search
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.searchMusic());
        }
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchMusic();
            });
        }
        
        // Chat
        const sendBtn = document.getElementById('send-btn');
        const chatInput = document.getElementById('chat-input');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendChatMessage());
        }
        
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendChatMessage();
            });
        }
        
        // Spotify
        const connectSpotifyBtn = document.getElementById('connect-spotify');
        const loadPlaylistBtn = document.getElementById('load-playoff-playlist');
        
        if (connectSpotifyBtn) {
            connectSpotifyBtn.addEventListener('click', () => this.connectSpotify());
        }
        
        if (loadPlaylistBtn) {
            loadPlaylistBtn.addEventListener('click', () => this.loadPlayoffPlaylist());
        }
    }
    
    async connectSpotify() {
        if (window.spotifyHelper) {
            try {
                const authUrl = window.spotifyHelper.generateAuthUrl();
                window.location.href = authUrl;
            } catch (error) {
                console.error('Error connecting to Spotify:', error);
                this.addChatMessage('System', 'Erro ao conectar com Spotify. Verifique sua conexão.');
            }
        }
    }
    
    updateSpotifyUI() {
        const connectionDiv = document.getElementById('spotify-connection');
        const controlsDiv = document.getElementById('spotify-controls');
        
        if (connectionDiv && controlsDiv) {
            if (this.spotifyConnected) {
                connectionDiv.style.display = 'none';
                controlsDiv.style.display = 'block';
            } else {
                connectionDiv.style.display = 'block';
                controlsDiv.style.display = 'none';
            }
        }
    }
    
    async loadPlayoffPlaylist() {
        if (!window.spotifyHelper) return;
        
        try {
            const playoffTracks = await window.spotifyHelper.getPlayoffPlaylist();
            this.votingSongs = playoffTracks;
            this.updateVotingSongsUI();
            this.addChatMessage('PlayOff', 'Playlist PlayOff carregada! 🎸');
        } catch (error) {
            console.error('Error loading playlist:', error);
            this.addChatMessage('System', 'Erro ao carregar playlist PlayOff.');
        }
    }
    
    async searchMusic() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput || !searchInput.value.trim()) return;
        
        const query = searchInput.value.trim();
        
        if (window.spotifyHelper && window.spotifyHelper.getToken()) {
            try {
                const tracks = await window.spotifyHelper.searchTracks(query, 10);
                const formattedTracks = tracks.map((track, index) => ({
                    id: `search_${index}`,
                    title: track.name,
                    artist: track.artists[0]?.name || 'Unknown Artist',
                    albumCover: track.album?.images?.[0]?.url || '',
                    uri: track.uri,
                    votes: Math.floor(Math.random() * 5) + 1
                }));
                
                this.votingSongs = formattedTracks;
                this.updateVotingSongsUI();
                this.addChatMessage('System', `Encontradas ${tracks.length} músicas para "${query}"`);
            } catch (error) {
                console.error('Error searching tracks:', error);
                this.addChatMessage('System', 'Erro na busca. Conecte-se ao Spotify primeiro.');
            }
        } else {
            // Fallback: simulate search with local data
            this.simulateSearch(query);
        }
        
        searchInput.value = '';
    }
    
    simulateSearch(query) {
        const localTracks = [
            { title: 'Hotel California', artist: 'Eagles', albumCover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
            { title: 'Stairway to Heaven', artist: 'Led Zeppelin', albumCover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
            { title: 'Bohemian Rhapsody', artist: 'Queen', albumCover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
            { title: 'Sweet Child O Mine', artist: 'Guns N Roses', albumCover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
            { title: 'Smells Like Teen Spirit', artist: 'Nirvana', albumCover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' }
        ];
        
        const searchResults = localTracks
            .filter(track => 
                track.title.toLowerCase().includes(query.toLowerCase()) ||
                track.artist.toLowerCase().includes(query.toLowerCase())
            )
            .map((track, index) => ({
                id: `local_${index}`,
                title: track.title,
                artist: track.artist,
                albumCover: track.albumCover,
                votes: Math.floor(Math.random() * 10) + 1,
                uri: null
            }));
        
        this.votingSongs = searchResults.length > 0 ? searchResults : localTracks.slice(0, 3).map((track, index) => ({
            id: `demo_${index}`,
            title: track.title,
            artist: track.artist,
            albumCover: track.albumCover,
            votes: Math.floor(Math.random() * 10) + 1,
            uri: null
        }));
        
        this.updateVotingSongsUI();
        this.addChatMessage('System', `Simulação: ${this.votingSongs.length} resultados para "${query}"`);
    }
    
    async togglePlayPause() {
        if (window.spotifyHelper && window.spotifyHelper.player) {
            try {
                const success = await window.spotifyHelper.togglePlayback();
                if (success) {
                    console.log('Playback toggled successfully');
                }
            } catch (error) {
                console.error('Error toggling playback:', error);
            }
        } else {
            // Fallback: simulate playback
            this.currentSong.isPlaying = !this.currentSong.isPlaying;
            this.updatePlayPauseButton();
            this.updateVinylAnimation();
        }
    }
    
    async previousTrack() {
        if (window.spotifyHelper && window.spotifyHelper.player) {
            try {
                await window.spotifyHelper.previousTrack();
            } catch (error) {
                console.error('Error going to previous track:', error);
            }
        }
    }
    
    async nextTrack() {
        if (window.spotifyHelper && window.spotifyHelper.player) {
            try {
                await window.spotifyHelper.nextTrack();
            } catch (error) {
                console.error('Error going to next track:', error);
            }
        }
    }
    
    async playSong(songUri) {
        if (window.spotifyHelper && window.spotifyHelper.player && songUri) {
            try {
                const success = await window.spotifyHelper.playTrack(songUri);
                if (success) {
                    this.addChatMessage('System', 'Música alterada com sucesso! 🎵');
                    
                    // Find and update current song
                    const song = this.votingSongs.find(s => s.uri === songUri);
                    if (song) {
                        this.currentSong = {
                            title: song.title,
                            artist: song.artist,
                            albumCover: song.albumCover,
                            uri: song.uri,
                            isPlaying: true
                        };
                    }
                }
            } catch (error) {
                console.error('Error playing song:', error);
                this.addChatMessage('System', 'Erro ao reproduzir música.');
            }
        } else {
            this.addChatMessage('System', 'Conecte-se ao Spotify para reproduzir músicas reais.');
        }
    }
    
    updatePlayPauseButton() {
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            const icon = playPauseBtn.querySelector('i');
            if (icon) {
                icon.className = this.currentSong.isPlaying ? 'fas fa-pause' : 'fas fa-play';
            }
        }
    }
    
    updateVinylAnimation() {
        const vinylDisc = document.getElementById('vinyl-disc');
        if (vinylDisc) {
            if (this.currentSong.isPlaying) {
                vinylDisc.style.animationPlayState = 'running';
            } else {
                vinylDisc.style.animationPlayState = 'paused';
            }
        }
    }
    
    updateVotingSongsUI() {
        const container = document.getElementById('voting-songs');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.votingSongs.forEach(song => {
            const songElement = document.createElement('div');
            songElement.className = 'song-item';
            songElement.innerHTML = `
                <div class="song-cover">
                    <img src="${song.albumCover}" alt="${song.title}" onerror="this.src='https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400'">
                </div>
                <div class="song-details">
                    <div class="song-name">${song.title}</div>
                    <div class="song-artist">${song.artist}</div>
                </div>
                <div class="song-votes">${song.votes}</div>
            `;
            
            songElement.addEventListener('click', () => {
                this.voteSong(song.id);
                if (song.uri) {
                    this.playSong(song.uri);
                }
            });
            
            container.appendChild(songElement);
        });
    }
    
    voteSong(songId) {
        const song = this.votingSongs.find(s => s.id === songId);
        if (song) {
            song.votes++;
            
            // Check if song reached threshold
            if (song.votes >= 15) {
                this.addChatMessage('System', `🎉 "${song.title}" atingiu 15 votos! Tocando agora!`);
                
                if (song.uri) {
                    this.playSong(song.uri);
                }
                
                // Reset votes
                song.votes = 1;
                
                // Add flip animation to vinyl
                const vinylDisc = document.getElementById('vinyl-disc');
                if (vinylDisc) {
                    vinylDisc.classList.add('flipping');
                    setTimeout(() => vinylDisc.classList.remove('flipping'), 1500);
                }
            }
            
            this.updateVotingSongsUI();
            this.saveLocalData();
        }
    }
    
    sendChatMessage() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput || !chatInput.value.trim()) return;
        
        const message = chatInput.value.trim();
        const username = 'Você';
        
        this.addChatMessage(username, message);
        
        // Check for special commands
        if (message.toLowerCase() === 'playoff') {
            setTimeout(() => {
                this.addChatMessage('PlayOff', '🎸 Comando PlayOff ativado! Rock on! 🤘');
                this.loadPlayoffPlaylist();
            }, 500);
        } else if (message.toLowerCase().includes('curtidas')) {
            setTimeout(() => {
                this.addChatMessage('Bot', '❤️ Obrigado pelas curtidas! Continue votando!');
            }, 800);
        }
        
        chatInput.value = '';
    }
    
    addChatMessage(username, message) {
        const newMessage = {
            id: Date.now(),
            username: username,
            message: message,
            timestamp: Date.now()
        };
        
        this.chatMessages.push(newMessage);
        
        // Keep only last 50 messages
        if (this.chatMessages.length > 50) {
            this.chatMessages = this.chatMessages.slice(-50);
        }
        
        this.updateChatUI();
        this.saveLocalData();
    }
    
    updateChatUI() {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Show last 10 messages
        const recentMessages = this.chatMessages.slice(-10);
        
        recentMessages.forEach(msg => {
            const messageElement = document.createElement('div');
            messageElement.className = 'chat-message fade-in';
            messageElement.innerHTML = `
                <div class="chat-username">${msg.username}</div>
                <div class="chat-text">${msg.message}</div>
            `;
            container.appendChild(messageElement);
        });
        
        // Auto scroll to bottom
        container.scrollTop = container.scrollHeight;
    }
    
    updateUI() {
        this.updateVotingSongsUI();
        this.updateChatUI();
        this.updateSpotifyUI();
        this.updatePlayPauseButton();
        this.updateVinylAnimation();
    }
    
    startProgressUpdates() {
        // Update progress every second
        this.progressUpdateInterval = setInterval(() => {
            if (window.spotifyHelper && window.spotifyHelper.position !== undefined) {
                // Spotify Web SDK handles progress updates automatically
                return;
            }
            
            // Fallback progress simulation
            if (this.currentSong.isPlaying) {
                this.currentSong.currentTime += 1;
                if (this.currentSong.currentTime >= this.currentSong.duration) {
                    this.currentSong.currentTime = 0;
                    this.currentSong.isPlaying = false;
                    this.updatePlayPauseButton();
                    this.updateVinylAnimation();
                }
                this.updateProgressBar();
            }
        }, 1000);
    }
    
    updateProgressBar() {
        const currentTimeElement = document.getElementById('current-time');
        const totalTimeElement = document.getElementById('total-time');
        const progressFillElement = document.getElementById('progress-fill');
        
        if (currentTimeElement) {
            currentTimeElement.textContent = this.formatTime(this.currentSong.currentTime);
        }
        
        if (totalTimeElement) {
            totalTimeElement.textContent = this.formatTime(this.currentSong.duration);
        }
        
        if (progressFillElement && this.currentSong.duration > 0) {
            const percentage = (this.currentSong.currentTime / this.currentSong.duration) * 100;
            progressFillElement.style.width = `${percentage}%`;
        }
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    startAutomaticMessages() {
        // Add automatic messages every 30 seconds
        setInterval(() => {
            const automaticMessages = [
                { username: 'MusicBot', message: '🎵 Vote na sua música favorita!' },
                { username: 'RockFan', message: 'Essa playlist está incrível! 🤘' },
                { username: 'DJ_PlayOff', message: '15 votos e a música toca! ⚡' },
                { username: 'MelodyLover', message: 'Adoro essa seleção musical! ❤️' },
                { username: 'VoteBot', message: '🗳️ Não esqueçam de votar pessoal!' }
            ];
            
            const randomMessage = automaticMessages[Math.floor(Math.random() * automaticMessages.length)];
            this.addChatMessage(randomMessage.username, randomMessage.message);
        }, 30000);
    }
    
    loadLocalData() {
        // Load data from localStorage if it exists
        const savedVotingSongs = localStorage.getItem('playoff_voting_songs');
        const savedChatMessages = localStorage.getItem('playoff_chat_messages');
        const savedCurrentSong = localStorage.getItem('playoff_current_song');
        
        if (savedVotingSongs) {
            try {
                this.votingSongs = JSON.parse(savedVotingSongs);
            } catch (e) {
                console.error('Error loading voting songs:', e);
            }
        }
        
        if (savedChatMessages) {
            try {
                this.chatMessages = JSON.parse(savedChatMessages);
            } catch (e) {
                console.error('Error loading chat messages:', e);
            }
        }
        
        if (savedCurrentSong) {
            try {
                this.currentSong = JSON.parse(savedCurrentSong);
            } catch (e) {
                console.error('Error loading current song:', e);
            }
        }
    }
    
    saveLocalData() {
        // Save data to localStorage
        try {
            localStorage.setItem('playoff_voting_songs', JSON.stringify(this.votingSongs));
            localStorage.setItem('playoff_chat_messages', JSON.stringify(this.chatMessages));
            localStorage.setItem('playoff_current_song', JSON.stringify(this.currentSong));
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎵 PlayOff Music Voting App - Iniciando...');
    window.playoffApp = new PlayOffApp();
    console.log('✅ PlayOff carregado com sucesso!');
}); 