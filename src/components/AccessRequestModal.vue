<template>
  <div class="access-modal-overlay" v-if="showModal" @click.self="$emit('close')">
    <div class="access-modal">
      <button class="close-btn" @click="$emit('close')">
        <i class="fas fa-times"></i>
      </button>

      <div class="access-content">
        <div class="glitch-header">
          <h1 class="glitch-title" data-text="ACESSO RESTRITO">ACESSO RESTRITO</h1>
          <div class="skull-icon">💀</div>
        </div>

        <div class="apology-section">
          <p class="punk-text">
            <span class="highlight">DESCULPA AÍ, PARCEIRO!</span><br>
            O Spotify e o YouTube são CHATOS pra caramba com apps novos.
          </p>
          <p class="explanation">
            Enquanto não liberamos pra geral, preciso adicionar seu email manualmente.
            <strong>É rapidinho, prometo!</strong>
          </p>
        </div>

        <div class="form-section">
          <h2 class="form-title">BORA RESOLVER ISSO 🔥</h2>
          
          <div class="input-group">
            <label for="nickname">APELIDO / NOME</label>
            <input 
              type="text" 
              id="nickname" 
              v-model="nickname" 
              placeholder="Como quer ser chamado?"
              class="punk-input"
            />
          </div>

          <div class="input-group">
            <label for="email">EMAIL (Spotify ou YouTube)</label>
            <input 
              type="email" 
              id="email" 
              v-model="email" 
              placeholder="seu@email.com"
              class="punk-input"
            />
          </div>

          <div class="input-group">
            <label>QUAL PLATAFORMA?</label>
            <div class="platform-buttons">
              <button 
                :class="['platform-btn', 'spotify', { active: platform === 'spotify' }]"
                @click="platform = 'spotify'"
              >
                <i class="fab fa-spotify"></i> Spotify
              </button>
              <button 
                :class="['platform-btn', 'youtube', { active: platform === 'youtube' }]"
                @click="platform = 'youtube'"
              >
                <i class="fab fa-youtube"></i> YouTube
              </button>
              <button 
                :class="['platform-btn', 'both', { active: platform === 'both' }]"
                @click="platform = 'both'"
              >
                <i class="fas fa-bolt"></i> AMBOS
              </button>
            </div>
          </div>

          <button 
            class="submit-btn" 
            @click="sendRequest"
            :disabled="!nickname || !email || !platform"
          >
            <i class="fab fa-whatsapp"></i>
            ENVIAR PEDIDO VIA WHATSAPP
          </button>
        </div>

        <div class="footer-note">
          <p>⚡ Assim que receber, libero seu acesso em minutos! ⚡</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  showModal: Boolean
})

const emit = defineEmits(['close'])

const nickname = ref('')
const email = ref('')
const platform = ref('')

const sendRequest = () => {
  const platformText = platform.value === 'both' ? 'Spotify e YouTube' : 
                       platform.value === 'spotify' ? 'Spotify' : 'YouTube'
  
  const message = `🎸 *NOVO PEDIDO DE ACESSO - PLAYOFF* 🎸

👤 *Apelido:* ${nickname.value}
📧 *Email:* ${email.value}
🎵 *Plataforma:* ${platformText}

_Enviado pelo formulário do PlayOff_`

  const whatsappUrl = `https://wa.me/5583999290376?text=${encodeURIComponent(message)}`
  window.open(whatsappUrl, '_blank')
  
  // Limpa o formulário
  nickname.value = ''
  email.value = ''
  platform.value = ''
  
  emit('close')
}
</script>

<style scoped>
.access-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  overflow-y: auto;
  padding: 1rem;
}

.access-modal {
  background: #0a0a0a;
  border: 4px solid #ff6b6b;
  padding: 2rem;
  max-width: 550px;
  width: 100%;
  margin: auto;
  position: relative;
  box-shadow: 
    0 0 0 2px #000,
    0 0 0 6px #ff6b6b,
    0 0 60px rgba(255, 107, 107, 0.5),
    inset 0 0 100px rgba(255, 107, 107, 0.1);
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
  z-index: 10;
}

.close-btn:hover {
  background: #ff6b6b;
  border-color: #ff6b6b;
}

.access-content {
  text-align: center;
}

.glitch-header {
  margin-bottom: 1.5rem;
}

.glitch-title {
  font-family: 'Snuggle Punk', 'Impact', sans-serif;
  font-size: 2rem;
  color: #ff6b6b;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0;
  text-shadow: 
    2px 2px 0 #000,
    -2px -2px 0 #000,
    2px -2px 0 #000,
    -2px 2px 0 #000,
    0 0 20px #ff6b6b;
  animation: glitch 2s infinite;
}

@keyframes glitch {
  0%, 90%, 100% { transform: translate(0); }
  92% { transform: translate(-2px, 2px); }
  94% { transform: translate(2px, -2px); }
  96% { transform: translate(-2px, -2px); }
  98% { transform: translate(2px, 2px); }
}

.skull-icon {
  font-size: 2.5rem;
  margin-top: 0.5rem;
}

.apology-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background: rgba(255, 107, 107, 0.1);
  border-left: 4px solid #ff6b6b;
}

.punk-text {
  font-family: 'Cingire', sans-serif;
  font-size: 1.1rem;
  color: #fff;
  margin: 0 0 0.5rem 0;
  line-height: 1.6;
}

.highlight {
  color: #ff6b6b;
  font-size: 1.3rem;
}

.explanation {
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

.form-section {
  text-align: left;
}

.form-title {
  font-family: 'Cingire', sans-serif;
  font-size: 1.3rem;
  color: #fff;
  text-align: center;
  margin: 0 0 1.5rem 0;
}

.input-group {
  margin-bottom: 1.2rem;
}

.input-group label {
  display: block;
  font-family: 'Cingire', sans-serif;
  font-size: 0.9rem;
  color: #ff6b6b;
  margin-bottom: 0.5rem;
  letter-spacing: 0.1em;
}

.punk-input {
  width: 100%;
  padding: 0.8rem 1rem;
  background: #1a1a1a;
  border: 2px solid #333;
  color: #fff;
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  transition: all 0.3s;
}

.punk-input:focus {
  outline: none;
  border-color: #ff6b6b;
  box-shadow: 0 0 10px rgba(255, 107, 107, 0.3);
}

.punk-input::placeholder {
  color: #666;
}

.platform-buttons {
  display: flex;
  gap: 0.5rem;
}

.platform-btn {
  flex: 1;
  padding: 0.8rem;
  border: 2px solid #333;
  background: #1a1a1a;
  color: #fff;
  font-family: 'Cingire', sans-serif;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.platform-btn.spotify.active {
  background: #1DB954;
  border-color: #1DB954;
}

.platform-btn.youtube.active {
  background: #FF0000;
  border-color: #FF0000;
}

.platform-btn.both.active {
  background: linear-gradient(135deg, #1DB954 0%, #FF0000 100%);
  border-color: #ff6b6b;
}

.platform-btn:hover:not(.active) {
  border-color: #ff6b6b;
}

.submit-btn {
  width: 100%;
  padding: 1rem;
  margin-top: 1.5rem;
  background: #25D366;
  border: 3px solid #25D366;
  color: #fff;
  font-family: 'Cingire', sans-serif;
  font-size: 1.1rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  transition: all 0.3s;
}

.submit-btn:hover:not(:disabled) {
  background: #fff;
  color: #25D366;
  transform: translate(-3px, -3px);
  box-shadow: 3px 3px 0 #25D366;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.footer-note {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px dashed #333;
}

.footer-note p {
  font-family: 'Cingire', sans-serif;
  font-size: 0.9rem;
  color: #ff6b6b;
  margin: 0;
}

@media (max-width: 500px) {
  .access-modal {
    padding: 1.5rem;
  }

  .glitch-title {
    font-size: 1.5rem;
  }

  .platform-buttons {
    flex-direction: column;
  }

  .platform-btn {
    width: 100%;
  }
}
</style>
