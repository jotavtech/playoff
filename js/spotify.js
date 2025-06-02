// Cloudinary Audio Player Integration
class CloudinaryAudioHelper {
    constructor() {
        this.cloudName = 'dzwfuzxxw';
        this.apiKey = '888348989441951';
        this.apiSecret = 'SoIbMkMvEBoth_Xbt0I8Ew96JuY';
        this.audioPlayer = null;
        this.currentTrack = null;
        this.isPlaying = false;
        this.position = 0;
        this.duration = 0;
        this.playlist = [];
        // Last.fm API for album covers
        this.lastFmApiKey = 'b25b959554ed76058ac220b7b2e0a026';
        this.lastFmBaseUrl = 'https://ws.audioscrobbler.com/2.0/';
    }

    // Initialize audio player
    initializePlayer() {
        console.log('🎵 Inicializando Cloudinary Audio Player...');
        
        // Create audio element
        this.audioPlayer = document.createElement('audio');
        this.audioPlayer.preload = 'auto';
        this.audioPlayer.volume = 0.8;
        this.audioPlayer.crossOrigin = 'anonymous';
        
        // Add event listeners
        this.setupAudioEvents();
        
        console.log('✅ Cloudinary Audio Player inicializado!');
        return Promise.resolve(true);
    }

    setupAudioEvents() {
        this.audioPlayer.addEventListener('loadedmetadata', () => {
            this.duration = this.audioPlayer.duration * 1000; // Convert to ms
            this.updateUI();
            console.log(`📊 Duração da música: ${this.formatTime(this.duration)}`);
        });

        this.audioPlayer.addEventListener('timeupdate', () => {
            this.position = this.audioPlayer.currentTime * 1000; // Convert to ms
            this.updateProgress();
        });

        this.audioPlayer.addEventListener('play', () => {
            this.isPlaying = true;
            this.updateUI();
            console.log('▶️ Música iniciada');
        });

        this.audioPlayer.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updateUI();
            console.log('⏸️ Música pausada');
        });

        this.audioPlayer.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updateUI();
            console.log('⏹️ Música finalizada');
            this.nextTrack();
        });

        this.audioPlayer.addEventListener('error', (e) => {
            console.error('❌ Erro no player de áudio:', e);
            console.error('❌ URL que causou erro:', this.audioPlayer.src);
            this.isPlaying = false;
            this.updateUI();
        });

        this.audioPlayer.addEventListener('loadstart', () => {
            console.log('📡 Carregando música...');
        });

        this.audioPlayer.addEventListener('canplay', () => {
            console.log('✅ Música pronta para tocar');
        });
    }

    // Main function called by app.js - Play song
    async playSong(songData) {
        try {
            console.log(`🎵 playSong chamado para: ${songData.title} - ${songData.artist}`);
            console.log(`📡 URL da música: ${songData.audioUrl}`);
            
            this.currentTrack = songData;
            
            // Try to fetch album cover if not available or is placeholder
            if (!songData.albumCover || songData.albumCover.includes('placeholder') || songData.albumCover.includes('via.placeholder')) {
                console.log('🔍 Buscando capa do álbum via API...');
                const albumInfo = await this.searchAlbumCover(songData.artist, songData.title);
                if (albumInfo) {
                    songData.albumCover = albumInfo.albumCover;
                    if (albumInfo.albumName) {
                        songData.album = albumInfo.albumName;
                    }
                    console.log(`✅ Capa atualizada: ${songData.albumCover}`);
                }
            }
            
            // Set the audio source to the Cloudinary URL
            this.audioPlayer.src = songData.audioUrl;
            
            // Load and play
            await this.audioPlayer.load();
            await this.audioPlayer.play();
            
            this.updateUI();
            
            // Update background with album cover
            this.updateDynamicBackground(songData.albumCover);
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao tocar música:', error);
            throw error;
        }
    }

    // Play track from Cloudinary URL (legacy support)
    async playTrack(trackUrl, trackData) {
        return this.playSong({
            ...trackData,
            audioUrl: trackUrl
        });
    }

    // Toggle play/pause
    async togglePlayback() {
        try {
            if (this.audioPlayer.paused) {
                await this.audioPlayer.play();
                console.log('▶️ Reprodução retomada');
            } else {
                this.audioPlayer.pause();
                console.log('⏸️ Reprodução pausada');
            }
            return true;
        } catch (error) {
            console.error('❌ Erro ao alternar playback:', error);
            return false;
        }
    }

    // Previous track
    async previousTrack() {
        console.log('⏮️ Voltando ao início da música');
        this.audioPlayer.currentTime = 0;
        return true;
    }

    // Next track
    async nextTrack() {
        console.log('⏭️ Parando música atual');
        this.audioPlayer.pause();
        this.audioPlayer.currentTime = 0;
        return true;
    }

    // Update UI elements
    updateUI() {
        if (this.currentTrack) {
            // Update song info
            const titleElement = document.getElementById('songTitle');
            const artistElement = document.getElementById('artistName');
            const albumCoverElement = document.getElementById('albumImage');

            if (titleElement) titleElement.textContent = this.currentTrack.title;
            if (artistElement) artistElement.textContent = this.currentTrack.artist;
            if (albumCoverElement && this.currentTrack.albumCover) {
                albumCoverElement.src = this.currentTrack.albumCover;
            }

            // Update play/pause button
            this.updatePlayPauseButton();
            
            // Update vinyl animation
            this.updateVinylAnimation();
        }
    }

    updatePlayPauseButton() {
        const playIcon = document.getElementById('playIcon');
        const pauseIcon = document.getElementById('pauseIcon');
        
        if (playIcon && pauseIcon) {
            if (this.isPlaying) {
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'block';
            } else {
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
            }
        }
    }

    updateVinylAnimation() {
        const vinylDisc = document.getElementById('vinylDisc');
        if (vinylDisc) {
            if (this.isPlaying) {
                vinylDisc.style.animationPlayState = 'running';
                vinylDisc.classList.add('playing');
            } else {
                vinylDisc.style.animationPlayState = 'paused';
                vinylDisc.classList.remove('playing');
            }
        }
    }

    updateProgress() {
        const currentTimeElement = document.getElementById('currentTime');
        const totalTimeElement = document.getElementById('totalTime');
        const progressFillElement = document.getElementById('progressFill');

        if (currentTimeElement) {
            currentTimeElement.textContent = this.formatTime(this.position);
        }

        if (totalTimeElement) {
            totalTimeElement.textContent = this.formatTime(this.duration);
        }

        if (progressFillElement && this.duration > 0) {
            const percentage = (this.position / this.duration) * 100;
            progressFillElement.style.width = `${percentage}%`;
        }
    }

    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Generate Cloudinary audio URL
    generateAudioUrl(publicId, options = {}) {
        const baseUrl = `https://res.cloudinary.com/${this.cloudName}`;
        const resourceType = options.resourceType || 'video'; // For audio files
        const format = options.format || 'mp3';
        
        return `${baseUrl}/${resourceType}/upload/${publicId}.${format}`;
    }

    // Add track to playlist
    addTrack(trackData) {
        const track = {
            id: trackData.id || Date.now(),
            title: trackData.title || 'Música Sem Nome',
            artist: trackData.artist || 'Artista Desconhecido',
            albumCover: trackData.albumCover || 'https://via.placeholder.com/300x300/333/fff?text=♪',
            audioUrl: trackData.audioUrl || trackData.cloudinaryUrl,
            cloudinaryId: trackData.cloudinaryId || null,
            votes: trackData.votes || 0
        };

        this.playlist.push(track);
        console.log(`📀 Música adicionada à playlist: ${track.title}`);
        return track;
    }

    // Get demo playlist with placeholder data
    getPlayoffPlaylist() {
        return [
            {
                id: 'demo_1',
                title: 'Rock Anthem',
                artist: 'Demo Band',
                albumCover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
                audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Demo audio
                cloudinaryId: 'sample_audio_1',
                votes: Math.floor(Math.random() * 15) + 1
            },
            {
                id: 'demo_2',
                title: 'Electronic Vibes',
                artist: 'Synth Master',
                albumCover: 'https://images.unsplash.com/photo-1571974599782-87624638275c?w=400',
                audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Demo audio
                cloudinaryId: 'sample_audio_2',
                votes: Math.floor(Math.random() * 15) + 1
            },
            {
                id: 'demo_3',
                title: 'Jazz Fusion',
                artist: 'Cool Cats',
                albumCover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400',
                audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Demo audio
                cloudinaryId: 'sample_audio_3',
                votes: Math.floor(Math.random() * 15) + 1
            }
        ];
    }

    // Search tracks (placeholder - can be enhanced with Cloudinary API)
    async searchTracks(query, limit = 10) {
        console.log(`🔍 Buscando por: ${query}`);
        // For now, return empty results since we're using predefined songs
        return [];
    }

    // Format track for consistency
    formatTrack(track) {
        return {
            id: track.id,
            title: track.title,
            artist: track.artist,
            albumCover: track.albumCover,
            audioUrl: track.audioUrl,
            cloudinaryId: track.cloudinaryId,
            duration: track.duration || 0,
            votes: track.votes || 0
        };
    }

    // Get current playback state
    getCurrentPlayback() {
        return {
            track: this.currentTrack,
            isPlaying: this.isPlaying,
            position: this.position,
            duration: this.duration
        };
    }

    // Clean up
    destroy() {
        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer.src = '';
            this.audioPlayer = null;
        }
    }

    // Fetch album cover from Last.fm API
    async fetchAlbumCover(artist, album) {
        try {
            const url = `${this.lastFmBaseUrl}?method=album.getinfo&api_key=${this.lastFmApiKey}&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}&format=json`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.album && data.album.image && data.album.image.length > 0) {
                // Get the largest image (last in array)
                const largestImage = data.album.image[data.album.image.length - 1];
                if (largestImage['#text']) {
                    console.log(`🎨 Capa encontrada via Last.fm para ${artist} - ${album}`);
                    return largestImage['#text'];
                }
            }
            
            console.log(`❌ Capa não encontrada para ${artist} - ${album}`);
            return null;
        } catch (error) {
            console.error('❌ Erro ao buscar capa do álbum:', error);
            return null;
        }
    }

    // Search for album cover using artist and track name
    async searchAlbumCover(artist, track) {
        try {
            // First try to get track info which includes album
            const trackUrl = `${this.lastFmBaseUrl}?method=track.getinfo&api_key=${this.lastFmApiKey}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`;
            
            const trackResponse = await fetch(trackUrl);
            const trackData = await trackResponse.json();
            
            if (trackData.track && trackData.track.album) {
                const albumName = trackData.track.album.title;
                const albumCover = await this.fetchAlbumCover(artist, albumName);
                if (albumCover) {
                    return {
                        albumCover: albumCover,
                        albumName: albumName
                    };
                }
            }
            
            // If no album found, try searching by artist
            const artistUrl = `${this.lastFmBaseUrl}?method=artist.gettopalbums&api_key=${this.lastFmApiKey}&artist=${encodeURIComponent(artist)}&format=json&limit=1`;
            
            const artistResponse = await fetch(artistUrl);
            const artistData = await artistResponse.json();
            
            if (artistData.topalbums && artistData.topalbums.album && artistData.topalbums.album.length > 0) {
                const firstAlbum = artistData.topalbums.album[0];
                if (firstAlbum.image && firstAlbum.image.length > 0) {
                    const largestImage = firstAlbum.image[firstAlbum.image.length - 1];
                    if (largestImage['#text']) {
                        console.log(`🎨 Capa do top álbum encontrada para ${artist}`);
                        return {
                            albumCover: largestImage['#text'],
                            albumName: firstAlbum.name
                        };
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Erro ao buscar capa:', error);
            return null;
        }
    }

    // Update dynamic background based on album cover
    updateDynamicBackground(albumCoverUrl) {
        if (!albumCoverUrl) return;
        
        console.log(`🎨 Atualizando fundo dinâmico com: ${albumCoverUrl}`);
        
        // Create or update dynamic background
        let dynamicBackground = document.querySelector('.dynamic-background');
        if (!dynamicBackground) {
            dynamicBackground = document.createElement('div');
            dynamicBackground.className = 'dynamic-background';
            document.body.insertBefore(dynamicBackground, document.body.firstChild);
        }
        
        // Set background image with transition effect
        dynamicBackground.style.backgroundImage = `url(${albumCoverUrl})`;
        dynamicBackground.style.opacity = '0.5';
        dynamicBackground.classList.add('active');
        
        // Also update vinyl center
        const vinylCenter = document.querySelector('.vinyl-center');
        if (vinylCenter) {
            vinylCenter.style.backgroundImage = `url('${albumCoverUrl}')`;
            vinylCenter.style.backgroundSize = 'cover';
            vinylCenter.style.backgroundPosition = 'center';
            vinylCenter.style.backgroundRepeat = 'no-repeat';
        }
    }
}

// Initialize Cloudinary Helper
window.spotifyHelper = new CloudinaryAudioHelper(); // Keep same name for compatibility

// Auto-initialize player when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎵 Inicializando Cloudinary Audio Helper...');
    
    // Initialize player
    window.spotifyHelper.initializePlayer()
        .then(() => {
            console.log('✅ Cloudinary Audio Helper pronto!');
        })
        .catch(error => {
            console.error('❌ Erro ao inicializar player:', error);
        });
}); 