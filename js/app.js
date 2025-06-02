// PlayOff Music Voting App with Cloudinary Integration
class PlayOffApp {
    constructor() {
        this.songs = [];
        this.chatMessages = [];
        this.currentSong = null;
        this.audioHelper = window.spotifyHelper; // Using Cloudinary helper
        this.isOnline = true;
        
        this.initializeApp();
    }

    async initializeApp() {
        console.log('🎵 Inicializando PlayOff App...');
        
        try {
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize audio helper
            await this.audioHelper.initializePlayer();
            
            // Load initial data
            await this.loadInitialData();
            
            // Start update loops
            this.startUpdateLoops();
            
            console.log('✅ PlayOff App inicializado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao inicializar app:', error);
            this.handleOfflineMode();
        }
    }

    setupEventListeners() {
        // Search functionality
        const searchButton = document.getElementById('searchButton');
        const searchInput = document.getElementById('searchInput');
        
        if (searchButton) {
            searchButton.addEventListener('click', () => this.handleSearch());
        }
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            });
        }

        // Manual song addition
        const addManualSong = document.getElementById('addManualSong');
        if (addManualSong) {
            addManualSong.addEventListener('click', () => this.handleManualSongAdd());
        }

        // Player controls
        const playPauseButton = document.getElementById('playPauseButton');
        const prevButton = document.getElementById('prevButton');
        const nextButton = document.getElementById('nextButton');

        if (playPauseButton) {
            playPauseButton.addEventListener('click', () => this.togglePlayback());
        }
        
        if (prevButton) {
            prevButton.addEventListener('click', () => this.previousTrack());
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => this.nextTrack());
        }

        // Chat functionality
        const sendChatButton = document.getElementById('sendChatButton');
        const chatInput = document.getElementById('chatInput');

        if (sendChatButton) {
            sendChatButton.addEventListener('click', () => this.sendChatMessage());
        }

        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            });
        }

        // Modal controls
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeSearchModal());
        }
    }

    async handleSearch() {
        const searchInput = document.getElementById('searchInput');
        const query = searchInput?.value?.trim();
        
        if (!query) {
            this.showNotification('Digite algo para buscar!', 'warning');
            return;
        }

        try {
            console.log(`🔍 Buscando: ${query}`);
            const results = await this.audioHelper.searchTracks(query);
            this.displaySearchResults(results);
        } catch (error) {
            console.error('❌ Erro na busca:', error);
            this.showNotification('Erro ao buscar músicas', 'error');
        }
    }

    displaySearchResults(results) {
        const searchModal = document.getElementById('searchModal');
        const searchResults = document.getElementById('searchResults');
        
        if (!searchModal || !searchResults) return;

        searchResults.innerHTML = '';
        
        if (results.length === 0) {
            searchResults.innerHTML = '<p class="no-results">Nenhuma música encontrada</p>';
        } else {
            results.forEach(track => {
                const trackElement = this.createSearchResultElement(track);
                searchResults.appendChild(trackElement);
            });
        }
        
        searchModal.style.display = 'flex';
    }

    createSearchResultElement(track) {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        
        div.innerHTML = `
            <div class="track-info">
                <img src="${track.albumCover}" alt="Album Cover" class="track-cover">
                <div class="track-details">
                    <h4>${track.title}</h4>
                    <p>${track.artist}</p>
                </div>
            </div>
            <button class="add-track-btn" data-track='${JSON.stringify(track)}'>
                <i class="fas fa-plus"></i> Adicionar
            </button>
        `;

        const addButton = div.querySelector('.add-track-btn');
        addButton.addEventListener('click', () => {
            this.addSongToVoting(track);
            this.closeSearchModal();
        });

        return div;
    }

    handleManualSongAdd() {
        const titleInput = document.getElementById('manualTitle');
        const artistInput = document.getElementById('manualArtist');
        const audioUrlInput = document.getElementById('manualAudioUrl');
        const albumCoverInput = document.getElementById('manualAlbumCover');

        const title = titleInput?.value?.trim();
        const artist = artistInput?.value?.trim();
        const audioUrl = audioUrlInput?.value?.trim();
        const albumCover = albumCoverInput?.value?.trim();

        if (!title || !artist || !audioUrl) {
            this.showNotification('Preencha todos os campos obrigatórios!', 'warning');
            return;
        }

        const track = {
            id: Date.now(),
            title: title,
            artist: artist,
            audioUrl: audioUrl,
            albumCover: albumCover || 'https://via.placeholder.com/300x300/333/fff?text=♪',
            votes: 0
        };

        this.addSongToVoting(track);

        // Clear form
        if (titleInput) titleInput.value = '';
        if (artistInput) artistInput.value = '';
        if (audioUrlInput) audioUrlInput.value = '';
        if (albumCoverInput) albumCoverInput.value = '';

        this.showNotification('Música adicionada com sucesso!', 'success');
    }

    addSongToVoting(track) {
        // Add to local songs array
        this.songs.push(track);
        
        // Add to audio helper playlist
        this.audioHelper.addTrack(track);
        
        // Update display
        this.updateSongsDisplay();
        
        // Try to send to backend if online
        this.submitVoteToBackend(track.id, 0); // Initialize with 0 votes
    }

    closeSearchModal() {
        const searchModal = document.getElementById('searchModal');
        if (searchModal) {
            searchModal.style.display = 'none';
        }
    }

    async loadInitialData() {
        try {
            // Try to load from backend first
            await this.loadSongsFromBackend();
            await this.loadChatFromBackend();
        } catch (error) {
            console.log('Backend não disponível, carregando dados demo...');
            this.loadDemoData();
        }
    }

    async loadSongsFromBackend() {
        try {
            const response = await fetch('http://localhost:3000/api/songs');
            if (response.ok) {
                const data = await response.json();
                this.songs = data.songs || [];
                this.updateSongsDisplay();
                console.log('✅ Músicas carregadas do backend');
            }
        } catch (error) {
            console.log('Backend offline, usando dados demo');
            throw error;
        }
    }

    async loadChatFromBackend() {
        try {
            const response = await fetch('http://localhost:3000/api/chat');
            if (response.ok) {
                const data = await response.json();
                this.chatMessages = data.messages || [];
                this.updateChatDisplay();
                console.log('✅ Chat carregado do backend');
            }
        } catch (error) {
            console.log('Chat backend offline');
            throw error;
        }
    }

    loadDemoData() {
        // Sample data with the songs provided by the user
        this.songs = [
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
        ];
        
        console.log('📀 Loaded sample songs with album covers');
        this.updateSongsDisplay();
    }

    updateSongsDisplay() {
        const songsContainer = document.getElementById('songsContainer');
        if (!songsContainer) return;

        // Sort songs by votes (descending)
        const sortedSongs = [...this.songs].sort((a, b) => b.votes - a.votes);

        songsContainer.innerHTML = '';
        
        sortedSongs.forEach((song, index) => {
            const songElement = this.createSongElement(song, index + 1);
            songsContainer.appendChild(songElement);
        });
    }

    createSongElement(song, rank) {
        const div = document.createElement('div');
        div.className = 'song-item';
        
        div.innerHTML = `
            <div class="song-rank">#${rank}</div>
            <div class="song-info">
                <img src="${song.albumCover}" alt="Album Cover" class="song-cover" loading="lazy">
                <div class="song-details">
                    <div class="song-title">${song.title}</div>
                    <div class="song-artist">${song.artist}</div>
                    <div class="song-album">from "${song.album}"</div>
                </div>
            </div>
            <div class="song-stats">
                <span class="song-votes">${song.votes} votes</span>
            </div>
            <div class="song-actions">
                <button class="play-btn" onclick="app.playSong(${JSON.stringify(song).replace(/"/g, '&quot;')})">
                    <i class="fas fa-play"></i>
                </button>
                <button class="vote-btn" onclick="app.voteForSong('${song.id}')">
                    <i class="fas fa-heart"></i> Vote
                </button>
            </div>
        `;

        return div;
    }

    async voteForSong(songId) {
        try {
            console.log(`🗳️ Votando na música ID: ${songId}`);
            
            const song = this.songs.find(s => s.id === songId);
            if (!song) {
                console.error('❌ Música não encontrada:', songId);
                return;
            }

            // Increment votes locally
            song.votes = (song.votes || 0) + 1;
            
            // Update display immediately
            this.updateSongsDisplay();
            
            // Submit vote to backend
            await this.submitVoteToBackend(songId, song.votes);
            
            // Play the voted song immediately
            await this.playSong(song);
            
            this.showNotification(`🗳️ Votou em "${song.title}"! Música iniciada!`, 'success');
            
        } catch (error) {
            console.error('❌ Erro ao votar:', error);
            this.showNotification('Erro ao votar na música', 'error');
        }
    }

    async submitVoteToBackend(songId, votes) {
        if (!this.isOnline) return;

        try {
            const response = await fetch('http://localhost:3000/api/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    songId: songId,
                    votes: votes
                }),
            });

            if (response.ok) {
                console.log('✅ Voto enviado para o backend');
            }
        } catch (error) {
            console.error('❌ Erro ao enviar voto:', error);
        }
    }

    async playSong(song) {
        try {
            console.log(`🎵 Tocando: ${song.title} - ${song.artist}`);
            console.log(`📡 URL da música: ${song.audioUrl}`);
            
            // Update current song
            this.currentSong = song;
            
            // Play through audio helper using the playSong method (which now includes cover search)
            await this.audioHelper.playSong(song);
            
            // Update vinyl display with album cover
            this.updateVinylDisplay(song);
            
            // Detect and apply theme based on album cover
            if (song.albumCover) {
                const theme = await this.detectThemeFromAlbumCover(song.albumCover);
                this.applyTheme(theme);
            }
            
            // Show notification
            this.showNotification(`🎵 Tocando: ${song.title}`, 'success');
            
        } catch (error) {
            console.error('❌ Erro ao tocar música:', error);
            this.showNotification('Erro ao reproduzir música', 'error');
        }
    }

    updateVinylDisplay(song) {
        // Update vinyl center with album cover
        const vinylCenter = document.querySelector('.vinyl-center');
        if (vinylCenter && song.albumCover) {
            vinylCenter.style.backgroundImage = `url('${song.albumCover}')`;
            vinylCenter.style.backgroundSize = 'cover';
            vinylCenter.style.backgroundPosition = 'center';
            vinylCenter.style.backgroundRepeat = 'no-repeat';
            vinylCenter.style.borderRadius = '50%';
        }
        
        // Update now playing info
        const nowPlaying = document.querySelector('.now-playing');
        if (nowPlaying) {
            nowPlaying.innerHTML = `
                <div class="current-song-info">
                    <div class="current-song-title">${song.title}</div>
                    <div class="current-song-artist">${song.artist}</div>
                    <div class="current-song-album">from "${song.album}"</div>
                </div>
            `;
        }

        // Update play button states
        const playButtons = document.querySelectorAll('.play-btn');
        playButtons.forEach(btn => {
            btn.innerHTML = '<i class="fas fa-play"></i>';
            btn.classList.remove('playing');
        });

        // Highlight current playing button
        const currentButton = document.querySelector(`[onclick*="'${song.id}'"]`);
        if (currentButton && currentButton.classList.contains('play-btn')) {
            currentButton.innerHTML = '<i class="fas fa-pause"></i>';
            currentButton.classList.add('playing');
        }
    }

    async togglePlayback() {
        try {
            await this.audioHelper.togglePlayback();
        } catch (error) {
            console.error('❌ Erro ao alternar playback:', error);
        }
    }

    async previousTrack() {
        try {
            await this.audioHelper.previousTrack();
        } catch (error) {
            console.error('❌ Erro ao ir para música anterior:', error);
        }
    }

    async nextTrack() {
        try {
            await this.audioHelper.nextTrack();
        } catch (error) {
            console.error('❌ Erro ao ir para próxima música:', error);
        }
    }

    async sendChatMessage() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput?.value?.trim();
        
        if (!message) return;

        const chatMessage = {
            user: 'Você',
            message: message,
            timestamp: new Date().toISOString()
        };

        // Add to local messages
        this.chatMessages.push(chatMessage);
        this.updateChatDisplay();

        // Clear input
        chatInput.value = '';

        // Try to send to backend
        if (this.isOnline) {
            try {
                await fetch('http://localhost:3000/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(chatMessage),
                });
            } catch (error) {
                console.error('❌ Erro ao enviar mensagem:', error);
            }
        }
    }

    updateChatDisplay() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        chatMessages.innerHTML = '';

        this.chatMessages.slice(-10).forEach(msg => { // Show last 10 messages
            const messageElement = document.createElement('div');
            messageElement.className = 'chat-message';
            
            const timestamp = new Date(msg.timestamp).toLocaleTimeString();
            
            messageElement.innerHTML = `
                <div class="message-header">
                    <span class="message-user">${msg.user}</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <div class="message-content">${msg.message}</div>
            `;
            
            chatMessages.appendChild(messageElement);
        });

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    startUpdateLoops() {
        // Update chat every 3 seconds
        setInterval(() => {
            if (this.isOnline) {
                this.loadChatFromBackend().catch(() => {});
            }
        }, 3000);

        // Update songs every 5 seconds
        setInterval(() => {
            if (this.isOnline) {
                this.loadSongsFromBackend().catch(() => {});
            }
        }, 5000);
    }

    handleOfflineMode() {
        this.isOnline = false;
        this.loadDemoData();
        this.showNotification('Modo offline - Funcionalidade limitada', 'warning');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Add to page
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);

        console.log(`📢 ${type.toUpperCase()}: ${message}`);
    }

    // Add color detection function
    detectThemeFromAlbumCover(imageUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    ctx.drawImage(img, 0, 0);
                    
                    // Sample colors from multiple points
                    const samplePoints = [
                        [canvas.width * 0.25, canvas.height * 0.25],
                        [canvas.width * 0.75, canvas.height * 0.25],
                        [canvas.width * 0.25, canvas.height * 0.75],
                        [canvas.width * 0.75, canvas.height * 0.75],
                        [canvas.width * 0.5, canvas.height * 0.5]
                    ];
                    
                    let totalR = 0, totalG = 0, totalB = 0;
                    
                    samplePoints.forEach(([x, y]) => {
                        const pixelData = ctx.getImageData(x, y, 1, 1).data;
                        totalR += pixelData[0];
                        totalG += pixelData[1];
                        totalB += pixelData[2];
                    });
                    
                    const avgR = totalR / samplePoints.length;
                    const avgG = totalG / samplePoints.length;
                    const avgB = totalB / samplePoints.length;
                    
                    // Determine theme based on dominant colors
                    const theme = this.getThemeFromRGB(avgR, avgG, avgB);
                    resolve(theme);
                    
                } catch (error) {
                    console.error('Erro ao analisar cores:', error);
                    resolve('neutral');
                }
            };
            
            img.onerror = () => {
                console.error('Erro ao carregar imagem para análise de cor');
                resolve('neutral');
            };
            
            img.src = imageUrl;
        });
    }

    getThemeFromRGB(r, g, b) {
        const saturation = Math.max(r, g, b) - Math.min(r, g, b);
        const brightness = (r + g + b) / 3;
        
        // High saturation = vibrant
        if (saturation > 100) {
            return 'vibrant';
        }
        
        // Determine if warm or cool based on color temperature
        if (r > g && r > b) {
            return 'warm'; // Red dominant
        } else if (b > r && b > g) {
            return 'cool'; // Blue dominant
        } else if (brightness < 100) {
            return 'neutral'; // Dark/neutral
        }
        
        return 'neutral';
    }

    applyTheme(theme) {
        const body = document.body;
        const playerCard = document.querySelector('.player-card');
        const playerTitle = document.querySelector('.player-info h2');
        
        // Remove existing theme classes
        const themes = ['theme-warm', 'theme-cool', 'theme-vibrant', 'theme-neutral'];
        themes.forEach(t => {
            body.classList.remove(t);
            if (playerCard) playerCard.classList.remove(t);
            if (playerTitle) playerTitle.classList.remove(t);
        });
        
        // Apply new theme
        const themeClass = `theme-${theme}`;
        body.classList.add(themeClass);
        if (playerCard) playerCard.classList.add(themeClass);
        if (playerTitle) playerTitle.classList.add(themeClass);
        
        console.log(`🎨 Tema aplicado: ${theme}`);
    }
}

// Initialize the application
let app;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing PlayOff Application...');
    app = new PlayOffApp();
    
    // Make app globally available for onclick handlers
    window.app = app;
});