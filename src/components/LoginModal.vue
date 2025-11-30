<template>
  <div class="login-modal-overlay" v-if="showModal" @click.self="$emit('close')">
    <div class="login-modal">
      <button class="close-btn" @click="$emit('close')">
        <i class="fas fa-times"></i>
      </button>

      <div class="login-content">
        <div class="login-header">
          <div class="connection-icon">
            <i class="fas fa-plug"></i>
          </div>
          <h2 class="login-title">Conectar</h2>
          <p class="login-subtitle">Escolha sua plataforma de música</p>
        </div>

        <div class="login-features">
          <div class="feature-item">
            <i class="fas fa-music"></i>
            <span>Toque músicas completas</span>
          </div>
          <div class="feature-item">
            <i class="fas fa-chart-line"></i>
            <span>Acompanhe seu histórico</span>
          </div>
          <div class="feature-item">
            <i class="fas fa-heart"></i>
            <span>Vote nas suas favoritas</span>
          </div>
        </div>

        <button class="spotify-login-btn" @click="handleSpotifyLogin" :disabled="isLoading">
          <i v-if="isLoading && activeProvider === 'spotify'" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fab fa-spotify"></i>
          <span>{{ isLoading && activeProvider === 'spotify' ? 'Conectando...' : 'Entrar com Spotify' }}</span>
        </button>

        <button class="youtube-login-btn" @click="handleGoogleLogin" :disabled="isLoading">
          <i v-if="isLoading && activeProvider === 'google'" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fab fa-youtube"></i>
          <span>{{ isLoading && activeProvider === 'google' ? 'Conectando...' : 'Entrar com YouTube' }}</span>
        </button>

        <p class="login-disclaimer">
          Ao entrar, você concorda em conectar sua conta ao PlayOff
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  showModal: Boolean
})

const emit = defineEmits(['close', 'login'])

const isLoading = ref(false)
const activeProvider = ref(null)

const handleSpotifyLogin = async () => {
  isLoading.value = true
  activeProvider.value = 'spotify'
  
  try {
    const response = await fetch('/auth/login')
    const data = await response.json()
    localStorage.setItem('spotify_auth_state', data.state)
    window.location.href = data.authUrl
  } catch (error) {
    console.error('Erro ao iniciar login Spotify:', error)
    isLoading.value = false
    activeProvider.value = null
  }
}

const handleGoogleLogin = async () => {
  isLoading.value = true
  activeProvider.value = 'google'
  
  try {
    const response = await fetch('/auth/google/login')
    const data = await response.json()
    
    if (!response.ok || data.error) {
      console.error('Erro do servidor:', data.error || 'Resposta inválida')
      alert('Erro ao conectar com YouTube: ' + (data.error || 'Tente novamente'))
      isLoading.value = false
      activeProvider.value = null
      return
    }
    
    if (!data.authUrl) {
      console.error('authUrl não recebido:', data)
      alert('Erro: URL de autenticação não recebida')
      isLoading.value = false
      activeProvider.value = null
      return
    }
    
    localStorage.setItem('google_auth_state', data.state)
    window.location.href = data.authUrl
  } catch (error) {
    console.error('Erro ao iniciar login Google:', error)
    alert('Erro de conexão. Verifique se o servidor está rodando.')
    isLoading.value = false
    activeProvider.value = null
  }
}
</script>

<style scoped>
.login-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  overflow-y: auto;
  padding: 1rem;
}

.login-modal {
  background: rgba(0, 0, 0, 0.95);
  border: 4px solid #fff;
  padding: 3rem;
  max-width: 500px;
  width: 100%;
  margin: auto;
  position: relative;
  transform: skewX(-2deg);
  box-shadow: 8px 8px 0 #ff6b6b, 0 0 40px rgba(255, 107, 107, 0.6);
}

.login-modal .login-content {
  transform: skewX(2deg);
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: 2px solid #fff;
  color: #fff;
  width: 40px;
  height: 40px;
  font-size: 1.2rem;
  cursor: pointer;
  transform: skewX(2deg);
}

.close-btn:hover {
  background: #ff6b6b;
  border-color: #ff6b6b;
}

.login-content {
  text-align: center;
}

.login-header {
  margin-bottom: 2rem;
}

.connection-icon {
  font-size: 3rem;
  color: #fff;
  margin-bottom: 1rem;
  text-shadow: 0 0 15px rgba(255, 255, 255, 0.6);
}

.login-title {
  font-family: 'Snuggle Punk', 'Impact', sans-serif;
  font-size: 2.5rem;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.5rem 0;
  text-shadow: 3px 3px 0 #ff6b6b;
}

.login-subtitle {
  font-family: 'Inter', sans-serif;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  margin: 0;
}

.login-features {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 2rem 0;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-family: 'Cingire', sans-serif;
  color: #fff;
  font-size: 1.1rem;
  letter-spacing: 0.05em;
}

.feature-item i {
  width: 30px;
  color: #ff6b6b;
  font-size: 1.3rem;
}

.spotify-login-btn {
  width: 100%;
  padding: 1.2rem 2rem;
  background: #1DB954;
  border: 3px solid #1DB954;
  color: #fff;
  font-family: 'Cingire', sans-serif;
  font-size: 1.3rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 2rem 0 1rem 0;
}

.spotify-login-btn:hover {
  background: #fff;
  color: #1DB954;
  transform: translate(-3px, -3px);
  box-shadow: 3px 3px 0 #1DB954;
}

.spotify-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.youtube-login-btn {
  width: 100%;
  padding: 1.2rem 2rem;
  background: #FF0000;
  border: 3px solid #FF0000;
  color: #fff;
  font-family: 'Cingire', sans-serif;
  font-size: 1.3rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 0 0 2rem 0;
}

.youtube-login-btn:hover {
  background: #fff;
  color: #FF0000;
  transform: translate(-3px, -3px);
  box-shadow: 3px 3px 0 #FF0000;
}

.youtube-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-disclaimer {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .login-modal {
    padding: 2rem;
    max-width: 90%;
  }

  .login-title {
    font-size: 2rem;
  }

  .spotify-login-btn,
  .youtube-login-btn {
    font-size: 1.1rem;
    padding: 1rem 1.5rem;
  }
}
</style>
