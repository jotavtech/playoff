<template>
  <div class="voting-section">
    <h2><i class="fas fa-vote-yea"></i> Vote nas Músicas</h2>
    
    <div class="songs-container">
      <div 
        v-for="(song, index) in songs" 
        :key="song.id" 
        class="song-item"
      >
        <div class="song-rank">#{{ index + 1 }}</div>
        
        <div class="song-info">
          <img 
            :src="song.albumCover" 
            :alt="`${song.album} - Album Cover`" 
            class="song-cover" 
            loading="lazy"
          />
          <div class="song-details">
            <div class="song-title">{{ song.title }}</div>
            <div class="song-artist">{{ song.artist }}</div>
            <div class="song-album">from "{{ song.album }}"</div>
          </div>
        </div>
        
        <div class="song-stats">
          <span class="song-votes">{{ song.votes }} votes</span>
        </div>
        
        <div class="song-actions">
          <button 
            class="play-btn"
            :class="{ playing: currentTrack?.id === song.id }"
            @click="$emit('play-song', song)"
            :title="`Tocar ${song.title}`"
          >
            <i v-if="currentTrack?.id !== song.id" class="fas fa-play"></i>
            <i v-else class="fas fa-pause"></i>
          </button>
          
          <button 
            class="vote-btn" 
            @click="$emit('vote-for-song', song.id)"
            :title="`Votar em ${song.title}`"
          >
            <i class="fas fa-heart"></i> Vote
          </button>
        </div>
      </div>
    </div>
    
    <!-- Now Playing Info -->
    <div v-if="currentTrack" class="now-playing">
      <div class="current-song-info">
        <div class="current-song-title">{{ currentTrack.title }}</div>
        <div class="current-song-artist">{{ currentTrack.artist }}</div>
        <div class="current-song-album">from "{{ currentTrack.album }}"</div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Props
defineProps({
  songs: Array,
  currentTrack: Object
})

// Emits
defineEmits(['vote-for-song', 'play-song'])
</script>

<style scoped>
.voting-section {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 25px;
  padding: 2.5rem;
  margin: 2rem;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.voting-section h2 {
  color: #ffffff;
  margin-bottom: 2rem;
  font-size: 2rem;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 3px;
  background: linear-gradient(45deg, #ff6b6b, #feca57);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.songs-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 2rem;
}

.song-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  margin-bottom: 10px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.song-item:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.song-rank {
  font-size: 24px;
  font-weight: bold;
  color: #f39c12;
  min-width: 40px;
  text-align: center;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.song-info {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
}

.song-cover {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.song-details {
  flex: 1;
}

.song-title {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 4px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
}

.song-artist {
  font-size: 14px;
  color: #bbb;
  margin-bottom: 2px;
}

.song-album {
  font-size: 12px;
  color: #888;
  font-style: italic;
}

.song-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 15px;
}

.song-votes {
  font-size: 14px;
  color: #e74c3c;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.song-actions {
  display: flex;
  gap: 10px;
}

.play-btn, .vote-btn {
  padding: 8px 15px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.play-btn {
  background: rgba(46, 204, 113, 0.8);
  color: white;
}

.play-btn:hover, .play-btn.playing {
  background: rgba(46, 204, 113, 1);
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);
}

.vote-btn {
  background: rgba(231, 76, 60, 0.8);
  color: white;
}

.vote-btn:hover {
  background: rgba(231, 76, 60, 1);
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
}

.now-playing {
  margin-top: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.current-song-info {
  text-align: center;
  color: #fff;
}

.current-song-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
  color: #f39c12;
}

.current-song-artist {
  font-size: 14px;
  color: #bbb;
  margin-bottom: 3px;
}

.current-song-album {
  font-size: 12px;
  color: #888;
  font-style: italic;
}

/* Responsive Design */
@media (max-width: 768px) {
  .voting-section {
    margin: 1rem;
    padding: 2rem;
  }

  .songs-container {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .song-item {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  
  .song-info {
    flex-direction: column;
    text-align: center;
  }
  
  .song-rank {
    font-size: 20px;
    min-width: auto;
  }
  
  .song-actions {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .voting-section {
    margin: 0.5rem;
    padding: 1.5rem;
  }
}
</style> 