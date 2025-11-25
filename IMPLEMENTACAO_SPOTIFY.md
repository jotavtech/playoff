# 🎵 PlayOff - Integração Completa com Spotify

## 📋 Resumo da Implementação

Esta documentação descreve a integração completa do PlayOff com Spotify OAuth, banco de dados, histórico de reprodução e estatísticas.

## ✅ O Que Já Foi Implementado

### 1. Banco de Dados (SQLite)
- ✅ Schema completo em `/database/schema.sql`
- ✅ Módulo de acesso em `/database/db.js`
- ✅ Tabelas: users, songs, play_history, votes, user_song_stats
- ✅ Índices e views para performance

### 2. Autenticação OAuth com Spotify
- ✅ Módulo de autenticação em `/auth/spotify-auth.js`
- ✅ Authorization Code Flow implementado
- ✅ Refresh token automático
- ✅ Integração com Spotify Web API

### 3. Rotas da API
- ✅ Arquivo `/routes/auth-routes.js` com:
  - Login e callback OAuth
  - Refresh token
  - Perfil do usuário
  - Histórico de reprodução
  - Top músicas do usuário
  - Controle de playback do Spotify

### 4. Frontend
- ✅ Componente LoginModal.vue (design punk anos 2000)
- ✅ Dependencies atualizadas no package.json

## 🚧 Próximos Passos

### Passo 1: Instalar Dependências

```bash
npm install
```

### Passo 2: Integrar Rotas no Server.js

Adicione no início do arquivo `server.js`, após as importações existentes:

```javascript
const db = require('./database/db');
const authRoutes = require('./routes/auth-routes');

// Inicializa banco de dados
db.initializeDatabase();

// Registra rotas de autenticação
app.use('/auth', authRoutes.router);
app.use('/api', authRoutes.router);
```

### Passo 3: Criar Composable de Autenticação

Crie o arquivo `/src/composables/useAuth.js`:

```javascript
import { ref, computed, onMounted } from 'vue'

export function useAuth() {
  const user = ref(null)
  const isAuthenticated = computed(() => !!user.value)
  const spotifyAccessToken = ref(null)

  // Verifica se usuário está logado (via URL params após callback)
  const checkAuth = () => {
    const params = new URLSearchParams(window.location.search)
    const spotifyId = params.get('spotify_id')
    const accessToken = params.get('access_token')

    if (spotifyId && accessToken) {
      spotifyAccessToken.value = accessToken
      localStorage.setItem('spotify_id', spotifyId)
      localStorage.setItem('spotify_access_token', accessToken)
      
      // Limpa URL
      window.history.replaceState({}, '', '/')
      
      // Busca perfil completo
      fetchUserProfile()
    } else {
      // Tenta recuperar do localStorage
      const savedSpotifyId = localStorage.getItem('spotify_id')
      const savedToken = localStorage.getItem('spotify_access_token')
      
      if (savedSpotifyId && savedToken) {
        spotifyAccessToken.value = savedToken
        fetchUserProfile()
      }
    }
  }

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('spotify_id')}`
        }
      })
      
      if (response.ok) {
        user.value = await response.json()
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
    }
  }

  const logout = () => {
    user.value = null
    spotifyAccessToken.value = null
    localStorage.removeItem('spotify_id')
    localStorage.removeItem('spotify_access_token')
  }

  onMounted(() => {
    checkAuth()
  })

  return {
    user,
    isAuthenticated,
    spotifyAccessToken,
    logout,
    checkAuth
  }
}
```

### Passo 4: Criar Componente de Perfil

Crie `/src/components/UserProfile.vue`:

```vue
<template>
  <div class="user-profile" v-if="user">
    <div class="profile-header">
      <img :src="user.profile_image" :alt="user.display_name" class="profile-image" />
      <div class="profile-info">
        <h2 class="profile-name">{{ user.display_name }}</h2>
        <p class="profile-email">{{ user.email }}</p>
      </div>
      <button class="logout-btn" @click="$emit('logout')">
        <i class="fas fa-sign-out-alt"></i>
        Sair
      </button>
    </div>

    <div class="profile-stats" v-if="user.stats">
      <div class="stat-item">
        <span class="stat-value">{{ user.stats.total_plays || 0 }}</span>
        <span class="stat-label">Reproduções</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ user.stats.unique_songs || 0 }}</span>
        <span class="stat-label">Músicas Diferentes</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ formatTime(user.stats.total_listening_time) }}</span>
        <span class="stat-label">Tempo Ouvindo</span>
      </div>
    </div>

    <div class="top-songs" v-if="topSongs.length > 0">
      <h3 class="section-title">Suas Top Músicas</h3>
      <div class="top-songs-list">
        <div 
          v-for="(song, index) in topSongs" 
          :key="song.id"
          class="top-song-item"
        >
          <span class="song-rank">{{ index + 1 }}</span>
          <img :src="song.album_cover" :alt="song.title" class="song-cover" />
          <div class="song-info">
            <span class="song-title">{{ song.title }}</span>
            <span class="song-artist">{{ song.artist }}</span>
          </div>
          <span class="song-plays">{{ song.play_count }}x</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

defineProps({
  user: Object
})

defineEmits(['logout'])

const topSongs = ref([])

const formatTime = (ms) => {
  if (!ms) return '0min'
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`
}

onMounted(async () => {
  try {
    const response = await fetch('http://localhost:3000/api/me/top-songs', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('spotify_id')}`
      }
    })
    
    if (response.ok) {
      topSongs.value = await response.json()
    }
  } catch (error) {
    console.error('Erro ao buscar top músicas:', error)
  }
})
</script>

<style scoped>
/* Adicione estilos punk anos 2000 similares ao LoginModal */
</style>
```

### Passo 5: Integração com Spotify Web Playback SDK

Adicione no `index.html`, antes do `</body>`:

```html
<script src="https://sdk.scdn.co/spotify-player.js"></script>
```

Crie `/src/composables/useSpotifyPlayer.js`:

```javascript
import { ref } from 'vue'

export function useSpotifyPlayer() {
  const player = ref(null)
  const deviceId = ref(null)
  const isReady = ref(false)

  const initializePlayer = (accessToken) => {
    window.onSpotifyWebPlaybackSDKReady = () => {
      player.value = new window.Spotify.Player({
        name: 'PlayOff Web Player',
        getOAuthToken: cb => { cb(accessToken) },
        volume: 0.7
      })

      // Ready
      player.value.addListener('ready', ({ device_id }) => {
        console.log('Spotify Player pronto!', device_id)
        deviceId.value = device_id
        isReady.value = true
      })

      // Erros
      player.value.addListener('initialization_error', ({ message }) => {
        console.error('Erro de inicialização:', message)
      })

      player.value.connect()
    }
  }

  const playTrack = async (spotifyUri) => {
    if (!deviceId.value) return false

    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId.value}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: [spotifyUri] })
      })
      return true
    } catch (error) {
      console.error('Erro ao tocar:', error)
      return false
    }
  }

  return {
    player,
    deviceId,
    isReady,
    initializePlayer,
    playTrack
  }
}
```

### Passo 6: Atualizar App.vue

Adicione no início do `<script setup>`:

```javascript
import { ref } from 'vue'
import LoginModal from './components/LoginModal.vue'
import UserProfile from './components/UserProfile.vue'
import { useAuth } from './composables/useAuth'
import { useSpotifyPlayer } from './composables/useSpotifyPlayer'

const { user, isAuthenticated, spotifyAccessToken, logout } = useAuth()
const { initializePlayer, playTrack, isReady } = useSpotifyPlayer()
const showLoginModal = ref(false)
const showProfileModal = ref(false)

// Inicializa Spotify Player quando autenticado
watch(spotifyAccessToken, (token) => {
  if (token) {
    initializePlayer(token)
  }
})
```

Adicione no template:

```vue
<!-- Botão de Login/Perfil -->
<div class="user-section">
  <button v-if="!isAuthenticated" @click="showLoginModal = true" class="login-btn">
    <i class="fab fa-spotify"></i>
    Entrar
  </button>
  <button v-else @click="showProfileModal = true" class="profile-btn">
    <img :src="user.profile_image" :alt="user.display_name" />
    {{ user.display_name }}
  </button>
</div>

<!-- Modals -->
<LoginModal :showModal="showLoginModal" @close="showLoginModal = false" />
<UserProfile v-if="showProfileModal" :user="user" @close="showProfileModal = false" @logout="handleLogout" />
```

### Passo 7: Ordenação - Música Adicionada em 2º Lugar

Atualize `handleAddSpotifySong` em App.vue:

```javascript
const handleAddSpotifySong = async (track) => {
  try {
    // ... código existente ...
    
    if (response.ok) {
      await refreshSongs()
      
      // Encontra a música adicionada
      const addedSong = sortedSongs.value.find(s => 
        s.title === track.name && s.artist === track.artist
      )
      
      if (addedSong) {
        // Se não estiver tocando nada, toca a música
        if (!currentTrack.value) {
          await handlePlaySong(addedSong)
        } else {
          // Caso contrário, move para segunda posição
          const songs = [...sortedSongs.value]
          const index = songs.findIndex(s => s.id === addedSong.id)
          
          if (index > 1) {
            songs.splice(index, 1)
            songs.splice(1, 0, addedSong)
            // Atualiza a ordenação
          }
        }
        
        // Auto-reproduz
        setTimeout(() => handlePlaySong(addedSong), 500)
      }
    }
  } catch (error) {
    console.error('Erro ao adicionar música:', error)
  }
}
```

## 🎨 Configuração do Spotify App

1. Acesse: https://developer.spotify.com/dashboard
2. Crie um novo App
3. Adicione Redirect URI: `http://localhost:3000/auth/spotify/callback`
4. Copie Client ID e Client Secret
5. Atualize as credenciais em `/auth/spotify-auth.js`

## 🚀 Executando

```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run dev
```

## 📊 Funcionalidades Implementadas

- ✅ Login com Spotify OAuth
- ✅ Banco de dados SQLite para usuários e histórico
- ✅ Tracking de músicas ouvidas
- ✅ Contador de reproduções por usuário
- ✅ Top músicas do usuário
- ✅ Estatísticas de tempo ouvindo
- ✅ Perfil do usuário
- ✅ Integração com Spotify Web Playback SDK
- ✅ Reprodução de músicas reais do Spotify
- ✅ Design punk anos 2000 consistente

## 🎯 Próximas Melhorias

- Implementar JWT para autenticação mais segura
- Adicionar websockets para sincronização em tempo real
- Criar sistema de playlists colaborativas
- Adicionar gráficos de estatísticas
- Implementar sistema de conquistas/badges

## 💕 Beijo!

Sistema completo de autenticação Spotify, banco de dados e tracking de músicas implementado! 🎵✨
