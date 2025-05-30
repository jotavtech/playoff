// Spotify Helper Functions with Web Playback SDK
class SpotifyHelper {
    constructor() {
        this.clientId = '1fd9e79e2e074a33b258c30747f74e6b';
        this.redirectUri = window.location.origin + '/callback';
        this.scopes = [
            'streaming',
            'user-read-email',
            'user-read-private',
            'user-read-playback-state',
            'user-modify-playback-state',
            'user-read-currently-playing',
            'user-library-read',
            'playlist-read-private',
            'playlist-read-collaborative',
            'user-top-read'
        ];
        this.player = null;
        this.deviceId = null;
        this.currentTrack = null;
        this.isPlaying = false;
        this.position = 0;
        this.duration = 0;
    }

    generateAuthUrl() {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.clientId,
            scope: this.scopes.join(' '),
            redirect_uri: this.redirectUri,
            state: this.generateRandomString(16),
            show_dialog: 'true'
        });

        return `https://accounts.spotify.com/authorize?${params.toString()}`;
    }

    generateRandomString(length) {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let text = '';
        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    async initializePlayer() {
        const token = this.getToken();
        if (!token) {
            console.error('No Spotify token available');
            return false;
        }

        return new Promise((resolve) => {
            if (window.Spotify) {
                this.setupPlayer(token, resolve);
            } else {
                window.onSpotifyWebPlaybackSDKReady = () => {
                    this.setupPlayer(token, resolve);
                };
            }
        });
    }

    setupPlayer(token, resolve) {
        this.player = new Spotify.Player({
            name: 'PlayOff Music Voting',
            getOAuthToken: cb => { cb(token); },
            volume: 0.8
        });

        // Error handling
        this.player.addListener('initialization_error', ({ message }) => {
            console.error('Failed to initialize:', message);
            resolve(false);
        });

        this.player.addListener('authentication_error', ({ message }) => {
            console.error('Failed to authenticate:', message);
            resolve(false);
        });

        this.player.addListener('account_error', ({ message }) => {
            console.error('Failed to validate Spotify account:', message);
            resolve(false);
        });

        this.player.addListener('playback_error', ({ message }) => {
            console.error('Failed to perform playback:', message);
        });

        // Playback status updates
        this.player.addListener('player_state_changed', (state) => {
            if (!state) return;

            this.currentTrack = state.track_window.current_track;
            this.isPlaying = !state.paused;
            this.position = state.position;
            this.duration = state.duration;

            // Update UI
            this.updateUI();
        });

        // Ready
        this.player.addListener('ready', ({ device_id }) => {
            console.log('Ready with Device ID', device_id);
            this.deviceId = device_id;
            resolve(true);
        });

        // Not Ready
        this.player.addListener('not_ready', ({ device_id }) => {
            console.log('Device ID has gone offline', device_id);
        });

        // Connect to the player!
        this.player.connect();
    }

    updateUI() {
        if (this.currentTrack) {
            // Update song info
            const titleElement = document.getElementById('current-song-title');
            const artistElement = document.getElementById('current-song-artist');
            const albumCoverElement = document.getElementById('album-cover');

            if (titleElement) titleElement.textContent = this.currentTrack.name;
            if (artistElement) artistElement.textContent = this.currentTrack.artists[0]?.name || 'Unknown Artist';
            if (albumCoverElement && this.currentTrack.album?.images?.[0]) {
                albumCoverElement.src = this.currentTrack.album.images[0].url;
            }

            // Update progress
            this.updateProgress();
            
            // Update play/pause button
            const playPauseBtn = document.getElementById('play-pause-btn');
            if (playPauseBtn) {
                const icon = playPauseBtn.querySelector('i');
                if (icon) {
                    icon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
                }
            }

            // Update vinyl animation
            const vinylDisc = document.getElementById('vinyl-disc');
            if (vinylDisc) {
                if (this.isPlaying) {
                    vinylDisc.style.animationPlayState = 'running';
                } else {
                    vinylDisc.style.animationPlayState = 'paused';
                }
            }
        }
    }

    updateProgress() {
        const currentTimeElement = document.getElementById('current-time');
        const totalTimeElement = document.getElementById('total-time');
        const progressFillElement = document.getElementById('progress-fill');

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
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    handleCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
            console.error('Spotify auth error:', error);
            return null;
        }

        if (code && state) {
            return { code, state };
        }

        return null;
    }

    async exchangeCodeForToken(code) {
        try {
            // Exchange code for token using client credentials flow
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: this.redirectUri,
                    client_id: this.clientId,
                    client_secret: 'your_client_secret_here' // You need to add your client secret
                })
            });

            const data = await response.json();
            
            if (data.access_token) {
                return data.access_token;
            }
        } catch (error) {
            console.error('Error exchanging code for token:', error);
        }

        return null;
    }

    saveToken(token) {
        localStorage.setItem('spotify_access_token', token);
        localStorage.setItem('spotify_token_timestamp', Date.now().toString());
    }

    getToken() {
        const token = localStorage.getItem('spotify_access_token');
        const timestamp = localStorage.getItem('spotify_token_timestamp');
        
        if (!token || !timestamp) {
            return null;
        }

        // Check if token is older than 1 hour (3600000 ms)
        const now = Date.now();
        const tokenAge = now - parseInt(timestamp);
        
        if (tokenAge > 3600000) {
            this.clearToken();
            return null;
        }

        return token;
    }

    clearToken() {
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_token_timestamp');
    }

    async searchTracks(query, limit = 20) {
        const token = this.getToken();
        if (!token) {
            throw new Error('No valid Spotify token');
        }

        try {
            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            return data.tracks.items;
        } catch (error) {
            console.error('Error searching tracks:', error);
            throw error;
        }
    }

    async playTrack(trackUri) {
        if (!this.player || !this.deviceId) {
            console.error('Player not initialized');
            return false;
        }

        const token = this.getToken();
        if (!token) {
            throw new Error('No valid Spotify token');
        }

        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    uris: [trackUri]
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Error playing track:', error);
            throw error;
        }
    }

    async togglePlayback() {
        if (!this.player) {
            console.error('Player not initialized');
            return false;
        }

        try {
            await this.player.togglePlay();
            return true;
        } catch (error) {
            console.error('Error toggling playback:', error);
            return false;
        }
    }

    async previousTrack() {
        if (!this.player) {
            console.error('Player not initialized');
            return false;
        }

        try {
            await this.player.previousTrack();
            return true;
        } catch (error) {
            console.error('Error going to previous track:', error);
            return false;
        }
    }

    async nextTrack() {
        if (!this.player) {
            console.error('Player not initialized');
            return false;
        }

        try {
            await this.player.nextTrack();
            return true;
        } catch (error) {
            console.error('Error going to next track:', error);
            return false;
        }
    }

    async getCurrentPlayback() {
        if (!this.player) {
            console.error('Player not initialized');
            return null;
        }

        try {
            const state = await this.player.getCurrentState();
            return state;
        } catch (error) {
            console.error('Error getting current playback:', error);
            return null;
        }
    }

    formatTrack(track) {
        return {
            id: track.id,
            title: track.name,
            artist: track.artists[0]?.name || 'Unknown Artist',
            albumCover: track.album?.images[0]?.url || '',
            duration: Math.floor(track.duration_ms / 1000),
            preview_url: track.preview_url,
            spotify_url: track.external_urls?.spotify,
            uri: track.uri
        };
    }

    // Get popular playlists for demo
    async getPlayoffPlaylist() {
        const playoffTracks = [
            'spotify:track:4uLU6hMCjMI75M1A2tKUQC', // Deftones - Change (In the House of Flies)
            'spotify:track:3HfB5mBU0dBOHrU8oDashP', // Audioslave - Cochise
            'spotify:track:1OmcAT5Y8eg5bUPv9qJT4R', // Queens of the Stone Age - No One Knows
            'spotify:track:52K4Nl7eVNqUpUeJeWJlwT'  // Soundgarden - Black Hole Sun
        ];

        return playoffTracks.map((uri, index) => ({
            id: `playoff_${index}`,
            title: ['Change (In the House of Flies)', 'Cochise', 'No One Knows', 'Black Hole Sun'][index],
            artist: ['Deftones', 'Audioslave', 'Queens of the Stone Age', 'Soundgarden'][index],
            albumCover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
            uri: uri,
            votes: Math.floor(Math.random() * 15) + 1
        }));
    }
}

// Initialize Spotify Helper
window.spotifyHelper = new SpotifyHelper();

// Handle Spotify callback on page load
document.addEventListener('DOMContentLoaded', () => {
    const callbackData = window.spotifyHelper.handleCallback();
    if (callbackData) {
        window.spotifyHelper.exchangeCodeForToken(callbackData.code)
            .then(token => {
                if (token) {
                    window.spotifyHelper.saveToken(token);
                    // Redirect to main page
                    window.location.href = window.location.origin;
                }
            });
    }
});

// Auto-initialize player if token exists
document.addEventListener('DOMContentLoaded', () => {
    const token = window.spotifyHelper.getToken();
    if (token) {
        // Wait for Spotify SDK to load
        setTimeout(() => {
            window.spotifyHelper.initializePlayer();
        }, 1000);
    }
}); 