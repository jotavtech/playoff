<script setup lang="ts">
import { useSpotifySearch } from '~/composables/useSpotifySearch'
import { useSpotifyPlayer } from '~/composables/useSpotifyPlayer'
import { useRoom } from '~/composables/useRoom'
import { useRoomStore } from '~/stores/room'
import { useAuthStore } from '~/stores/auth'
import { useAuth } from '~/composables/useAuth'
import type { SpotifyTrack } from '~/types/spotify'

const { results, loading, searchDebounced, clear } = useSpotifySearch()
const { playTrack } = useSpotifyPlayer()
const { addTrack } = useRoom()
const roomStore = useRoomStore()
const auth = useAuthStore()
const { login } = useAuth()

const query = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

onMounted(() => {
  nextTick(() => inputEl.value?.focus())
})

watch(query, q => {
  if (q.trim()) searchDebounced(q)
  else clear()
})

function coverOf (track: SpotifyTrack) {
  return track.album.images.find(i => i.height >= 64)?.url ?? track.album.images[0]?.url ?? null
}

function selectTrack (track: SpotifyTrack) {
  if (roomStore.inRoom) addTrack(track)
  else playTrack(track)
}

function formatDuration (ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
</script>

<template>
  <div class="search-page">
    <!-- Barra de busca -->
    <div class="search-page__bar">
      <div class="search-page__input-wrap">
        <svg class="search-page__icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          ref="inputEl"
          v-model="query"
          class="search-page__input"
          type="search"
          inputmode="search"
          placeholder="Buscar música ou artista…"
          spellcheck="false"
          autocomplete="off"
          autofocus
          aria-label="Buscar música"
        />
        <button
          v-if="query"
          class="search-page__clear"
          aria-label="Limpar busca"
          @click="query = ''; inputEl?.focus()"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Não autenticado -->
    <div v-if="!auth.isAuthenticated" class="search-page__state">
      <p class="search-page__state-title">Login necessário</p>
      <p class="search-page__state-sub">Entre com Spotify para buscar músicas</p>
      <button class="search-page__login-btn" @click="login()">
        Login com Spotify
      </button>
    </div>

    <!-- Carregando -->
    <div v-else-if="loading" class="search-page__state">
      <p class="search-page__state-sub">Buscando…</p>
    </div>

    <!-- Resultados -->
    <ul v-else-if="results.length" class="search-page__results" role="list">
      <li
        v-for="track in results"
        :key="track.id"
        class="search-page__track"
        role="listitem"
        @click="selectTrack(track)"
      >
        <img
          v-if="coverOf(track)"
          :src="coverOf(track)!"
          :alt="track.name"
          class="search-page__cover"
          loading="lazy"
          width="52"
          height="52"
        />
        <div v-else class="search-page__cover search-page__cover--empty" aria-hidden="true" />
        <div class="search-page__track-info">
          <p class="search-page__track-name">{{ track.name }}</p>
          <p class="search-page__track-meta">{{ track.artists.map(a => a.name).join(', ') }}</p>
        </div>
        <span class="search-page__duration" aria-label="Duração">{{ formatDuration(track.duration_ms) }}</span>
      </li>
    </ul>

    <!-- Sem resultados -->
    <div v-else-if="query.trim() && !loading" class="search-page__state">
      <p class="search-page__state-title">Nenhum resultado</p>
      <p class="search-page__state-sub">Tente outro nome ou artista</p>
    </div>

    <!-- Estado inicial -->
    <div v-else-if="auth.isAuthenticated" class="search-page__state">
      <p class="search-page__state-sub">Digite o nome da música ou artista</p>
    </div>
  </div>
</template>

<style scoped>
.search-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: var(--page-bottom-pad);
}

/* ── Barra de busca ── */
.search-page__bar {
  padding: 12px 16px 8px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--glass-border);
}

.search-page__input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--glass);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  padding: 0 14px;
  height: 52px;
  transition: border-color var(--t-fast) linear;
}

.search-page__input-wrap:focus-within {
  border-color: var(--ink-dim);
}

.search-page__icon {
  flex-shrink: 0;
  color: var(--ink-faint);
}

.search-page__input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 16px;
  color: var(--ink);
  letter-spacing: 0.01em;
  -webkit-appearance: none;
}

.search-page__input::placeholder {
  color: var(--ink-faint);
}

/* Remove native search clear button */
.search-page__input::-webkit-search-cancel-button { display: none; }

.search-page__clear {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-faint);
  border-radius: 50%;
  transition: color var(--t-fast) linear, background var(--t-fast) linear;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.search-page__clear:hover,
.search-page__clear:active {
  color: var(--ink);
  background: var(--glass);
}

/* ── Lista de resultados ── */
.search-page__results {
  list-style: none;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  flex: 1;
}

.search-page__track {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  min-height: 72px;
  border-bottom: 1px solid var(--glass-border);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: background var(--t-fast) linear;
}

.search-page__track:active {
  background: var(--glass);
}

.search-page__cover {
  width: 52px;
  height: 52px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.search-page__cover--empty {
  background: var(--glass);
  border: 1px solid var(--glass-border);
}

.search-page__track-info {
  flex: 1;
  min-width: 0;
}

.search-page__track-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.search-page__track-meta {
  font-size: 16px;
  color: var(--ink-dim);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.search-page__duration {
  font-family: var(--font-mono);
  font-size: 16px;
  color: var(--ink-faint);
  flex-shrink: 0;
}

/* ── Estados ── */
.search-page__state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 24px;
  text-align: center;
}

.search-page__state-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ink);
}

.search-page__state-sub {
  font-size: 16px;
  color: var(--ink-dim);
}

.search-page__login-btn {
  margin-top: 8px;
  padding: 16px 32px;
  background: var(--ink);
  color: var(--bg);
  font-family: var(--font-mono);
  font-size: 16px;
  letter-spacing: 0.1em;
  border-radius: 4px;
  min-height: var(--touch-min);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: opacity var(--t-fast) linear;
}

.search-page__login-btn:active {
  opacity: 0.8;
}
</style>
