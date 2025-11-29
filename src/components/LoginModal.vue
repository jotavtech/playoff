<template>
  <div class="login-modal-overlay" v-if="showModal" @click.self="$emit('close')">
    <div class="login-modal">
      <button class="close-btn" @click="$emit('close')">
        <i class="fas fa-times"></i>
      </button>

      <div class="login-content">
        <div class="login-header">
          <h2 class="login-title">Entrar no PlayOff</h2>
          <p class="login-subtitle">Conecte sua conta do Spotify para começar</p>
        </div>

        <div class="login-features">
          <div class="feature-item">
            <i class="fas fa-music"></i>
            <span>Toque músicas do Spotify</span>
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

        <button 
          class="spotify-login-btn" 
          @click="handleSpotifyLogin"
          :disabled="isLoading"
        >
          <i v-if="isLoading" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fab fa-spotify"></i>
          <span>{{ isLoading ? 'Conectando...' : 'Entrar com Spotify' }}</span>
        </button>

        <p class="login-disclaimer">
          Ao entrar, você concorda em conectar sua conta do Spotify ao PlayOff
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

const handleSpotifyLogin = async () => {
  isLoading.value = true
  
  try {
    // Usa URL relativa (proxy do Vite redireciona para porta correta)
    const apiUrl = ''
    
    console.log('🔌 Tentando conectar em API relativa...')

    // Verifica se o backend está acessível
    try {
      const healthCheck = await fetch(`${apiUrl}/health`)
      if (!healthCheck.ok) {
        console.warn('⚠️ Backend health check falhou')
      } else {
        console.log('✅ Backend online:', await healthCheck.json())
      }
    } catch (e) {
      console.warn('⚠️ Backend inacessível:', e)
    }

    // Busca URL de autenticação do backend
    const response = await fetch(`${apiUrl}/auth/login`)
    
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.error('❌ Resposta inválida do servidor (esperado JSON, recebeu HTML):', text.substring(0, 100))
      throw new Error('Servidor retornou página HTML em vez de dados de login. Verifique a porta da API.')
    }

    const data = await response.json()
    
    // Salva state no localStorage para validação
    localStorage.setItem('spotify_auth_state', data.state)
    
    // Redireciona para página de autenticação do Spotify
    window.location.href = data.authUrl
  } catch (error) {
    console.error('Erro ao iniciar login:', error)
    isLoading.value = false
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
  height: 100dvh; /* Mobile viewport fix */
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
  overflow-y: auto; /* Allow scroll if content is too tall */
  padding: 1rem;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.login-modal {
  background: rgba(0, 0, 0, 0.95);
  border: 4px solid #fff;
  padding: 3rem;
  max-width: 500px;
  width: 100%;
  margin: auto; /* Helps with centering in flex container with scroll */
  position: relative;
  transform: skewX(-2deg);
  box-shadow: 
    8px 8px 0 #ff6b6b,
    0 0 40px rgba(255, 107, 107, 0.6);
  animation: slideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes slideIn {
  from {
    transform: skewX(-2deg) translateY(-50px);
    opacity: 0;
  }
  to {
    transform: skewX(-2deg) translateY(0);
    opacity: 1;
  }
}

.login-modal > * {
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
  transition: all 0.2s;
}

.close-btn:hover {
  background: #ff6b6b;
  border-color: #ff6b6b;
  transform: skewX(2deg) rotate(90deg);
}

.login-content {
  text-align: center;
}

.login-header {
  margin-bottom: 2rem;
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
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 2rem 0 1rem 0;
}

.spotify-login-btn:hover:not(:disabled) {
  background: #fff;
  color: #1DB954;
  transform: translate(-3px, -3px);
  box-shadow: 3px 3px 0 #1DB954;
}

.spotify-login-btn:disabled {
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

  .spotify-login-btn {
    font-size: 1.1rem;
    padding: 1rem 1.5rem;
  }
}
</style>
