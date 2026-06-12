<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useCinematicStore } from '~/stores/cinematic'
import { useRoom } from '~/composables/useRoom'

const auth = useAuthStore()
const cinematic = useCinematicStore()
const { createRoom } = useRoom()
const router = useRouter()

const creatingRoom = ref(false)
const roomName = ref('')
const showRoomCreate = ref(false)

async function handleCreateRoom () {
  const name = roomName.value.trim() || 'Sala PLAYOFF'
  creatingRoom.value = true
  try {
    const id = await createRoom(name)
    if (id) router.push(`/room/${id}`)
  } finally {
    creatingRoom.value = false
    showRoomCreate.value = false
  }
}
</script>

<template>
  <div class="profile-screen">
    <header class="profile-screen__header">
      <h1 class="profile-screen__heading">Perfil</h1>
    </header>

    <div class="profile-screen__content">
      <!-- Info do usuário -->
      <div v-if="auth.user" class="profile-screen__user">
        <img
          v-if="auth.user.images?.[0]?.url"
          :src="auth.user.images[0].url"
          :alt="auth.user.display_name ?? ''"
          class="profile-screen__avatar"
          width="72"
          height="72"
          loading="lazy"
        />
        <div v-else class="profile-screen__avatar profile-screen__avatar--empty" aria-hidden="true" />
        <div class="profile-screen__user-info">
          <p class="profile-screen__user-name">{{ auth.user.display_name }}</p>
          <p class="profile-screen__user-sub">Conta Spotify</p>
        </div>
      </div>

      <div v-else class="profile-screen__login">
        <p class="profile-screen__login-text">Conecte sua conta Spotify para uma experiência completa</p>
        <a href="/auth/spotify/login" class="profile-screen__login-btn">
          CONECTAR SPOTIFY
        </a>
      </div>

      <!-- Ações -->
      <ul class="profile-screen__actions" role="list">
        <li>
          <button
            class="profile-screen__action-item"
            @click="cinematic.toggleCommandCenter()"
          >
            <span>Adicionar faixa</span>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </button>
        </li>
        <li>
          <button class="profile-screen__action-item" @click="showRoomCreate = !showRoomCreate">
            <span>Criar sala</span>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
          </button>
        </li>
      </ul>

      <!-- Form criar sala -->
      <div v-if="showRoomCreate" class="profile-screen__room-form" role="region" aria-label="Criar sala">
        <label for="room-name" class="profile-screen__room-label">Nome da sala</label>
        <input
          id="room-name"
          v-model="roomName"
          type="text"
          class="profile-screen__room-input"
          placeholder="Sala PLAYOFF"
          maxlength="40"
          @keydown.enter="handleCreateRoom"
        />
        <button
          class="profile-screen__room-btn"
          :disabled="creatingRoom"
          @click="handleCreateRoom"
        >
          {{ creatingRoom ? 'CRIANDO…' : 'CRIAR SALA' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: var(--page-bottom-pad);
}

.profile-screen__header {
  padding: 16px 20px 8px;
  flex-shrink: 0;
}

.profile-screen__heading {
  font-size: clamp(22px, 6vw, 32px);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink);
}

.profile-screen__content {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* Usuário */
.profile-screen__user {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-screen__avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.profile-screen__avatar--empty {
  background: var(--glass);
  border: 1px solid var(--glass-border);
}

.profile-screen__user-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--ink);
}

.profile-screen__user-sub {
  font-size: 16px;
  color: var(--ink-dim);
  margin-top: 2px;
}

/* Login */
.profile-screen__login {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-screen__login-text {
  font-size: 16px;
  color: var(--ink-dim);
  line-height: 1.5;
}

.profile-screen__login-btn {
  display: inline-block;
  padding: 16px 28px;
  background: var(--ink);
  color: var(--bg);
  font-family: var(--font-mono);
  font-size: 16px;
  letter-spacing: 0.12em;
  text-decoration: none;
  border-radius: 4px;
  text-align: center;
  transition: opacity var(--t-fast) linear;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  min-height: var(--touch-min);
  align-self: flex-start;
}

.profile-screen__login-btn:active {
  opacity: 0.8;
}

/* Ações */
.profile-screen__actions {
  list-style: none;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  overflow: hidden;
}

.profile-screen__action-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  font-size: 16px;
  color: var(--ink);
  text-decoration: none;
  background: transparent;
  width: 100%;
  text-align: left;
  border-bottom: 1px solid var(--glass-border);
  min-height: var(--touch-min);
  transition: background var(--t-fast) linear;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.profile-screen__action-item:last-child {
  border-bottom: none;
}

.profile-screen__action-item:hover,
.profile-screen__action-item:active {
  background: var(--glass);
}

/* Form criar sala */
.profile-screen__room-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  background: var(--glass);
}

.profile-screen__room-label {
  font-size: 16px;
  color: var(--ink-dim);
  font-family: var(--font-mono);
  letter-spacing: 0.08em;
}

.profile-screen__room-input {
  padding: 14px 16px;
  background: var(--bg);
  border: 1px solid var(--glass-border);
  border-radius: 4px;
  color: var(--ink);
  font-size: 16px;
  font-family: var(--font-display);
  min-height: var(--touch-min);
  transition: border-color var(--t-fast) linear;
}

.profile-screen__room-input:focus {
  outline: none;
  border-color: var(--ink-dim);
}

.profile-screen__room-btn {
  padding: 16px;
  background: var(--ink);
  color: var(--bg);
  font-family: var(--font-mono);
  font-size: 16px;
  letter-spacing: 0.12em;
  border-radius: 4px;
  min-height: var(--touch-min);
  transition: opacity var(--t-fast) linear;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.profile-screen__room-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
