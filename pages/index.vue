<script setup lang="ts">
import { usePlayerStore } from '~/stores/player'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useSpotifyPlayer } from '~/composables/useSpotifyPlayer'
import { useRoomStore } from '~/stores/room'
import { useRoom } from '~/composables/useRoom'
import { useAuth } from '~/composables/useAuth'
import HomeVinyl from '~/components/shell/HomeVinyl.vue'
import SignalMeter from '~/components/shell/SignalMeter.vue'

const player = usePlayerStore()
const music = useMusicVisualStore()
const room = useRoomStore()
const { auth, login } = useAuth()
const { togglePlay, seek, skipToNext, playTrack } = useSpotifyPlayer()
const { nextTrack } = useRoom()
const hasTrack = computed(() => Boolean(music.currentTrack))
const albumArt = computed(() => music.currentTrack?.coverUrl ?? '')
const local = computed(() => music.currentTrack?.source === 'local')
const spotify = computed(() => Boolean(music.currentTrack?.spotifyUrl))
const canSeek = computed(() => local.value || music.currentTrack?.source === 'preview' || Boolean(spotify.value && auth.deviceId))
const sourceLabel = computed(() => local.value ? 'ARQUIVO LOCAL' : music.currentTrack?.source === 'preview' ? 'PRÉVIA' : spotify.value ? 'SPOTIFY' : 'SINAL DE TESTE')
function onSeek (event: Event) { void seek(Number((event.target as HTMLInputElement).value)) }

function skipNext () {
  if (!room.inRoom) { void skipToNext(); return }
  nextTrack()
  const next = room.queue[0]?.track
  if (!next?.uri) return
  void playTrack({
    id: next.id, name: next.title, artists: [{ id: '', name: next.artist }],
    album: { id: '', name: next.album, images: next.coverUrl ? [{ url: next.coverUrl, height: 300, width: 300 }] : [], release_date: '' },
    duration_ms: next.durationMs, preview_url: next.previewUrl, uri: next.uri
  })
}
</script>

<template>
  <div class="home-screen">
    <section class="deck" aria-label="Player Playoff">
      <header class="deck__header">
        <p class="deck__brand"><i aria-hidden="true" /> PLAYOFF <span class="deck__tag">/ DECK 01</span></p>
        <div class="deck__actions">
          <button v-if="!auth.isAuthenticated" type="button" class="deck__action" :disabled="auth.loading" @click="login">Conectar Spotify</button>
          <NuxtLink v-else to="/profile" class="deck__action">Conta Spotify</NuxtLink>
          <NuxtLink to="/search" class="deck__action deck__action--accent">Buscar faixa ↗</NuxtLink>
        </div>
      </header>
      <div class="deck__stage">
        <div class="deck__art" :class="{ 'deck__art--local': local }">
          <img v-if="spotify && albumArt" :src="albumArt" class="deck__cover" :alt="'Capa de ' + music.currentTrack?.album" />
          <div v-else class="deck__disc" :class="{ 'deck__disc--beat': local && music.beatActive }">
            <HomeVinyl :size="240" :cover="albumArt" :status="player.status" :vote-pulse="player.lastVotePulse" />
          </div>
          <SignalMeter v-if="local" class="deck__meter" />
          <span class="deck__tag deck__index" aria-hidden="true">{{ local ? 'FFT / AO VIVO' : 'PLAYOFF / 01' }}</span>
        </div>
        <div class="deck__details">
          <p class="deck__tag deck__eyebrow">{{ hasTrack ? sourceLabel : 'ESTAÇÃO DE ESCUTA' }}</p>
          <h1 class="deck__title">{{ music.currentTrack?.title ?? 'Dê play.' }}</h1>
          <p class="deck__artist">{{ music.currentTrack?.artist ?? 'Encontre uma faixa no Spotify ou abra seu áudio para cantar junto.' }}</p>
          <p v-if="player.playbackError || auth.authError" class="deck__error" role="alert">{{ player.playbackError || auth.authError }}</p>

          <template v-if="hasTrack">
            <label class="deck__progress">
              <span class="deck__tag">{{ player.timecode }}</span>
              <input aria-label="Posição da faixa" type="range" min="0" :max="music.currentTrack?.durationMs || 1"
                step="100" :value="music.progressMs" :disabled="!canSeek" @change="onSeek" />
            </label>
            <div class="deck__controls" role="group" aria-label="Controles de reprodução">
              <button type="button" class="deck__action deck__action--accent deck__play" :aria-label="music.isPlaying ? 'Pausar' : 'Reproduzir'" @click="togglePlay">
                {{ music.isPlaying ? '❚❚' : '▶' }}
              </button>
              <button type="button" class="deck__ghost" @click="player.toggleMute()">{{ player.muted ? 'Ativar som' : 'Silenciar' }}</button>
              <button v-if="room.inRoom || (music.currentTrack?.source === 'spotify' && auth.deviceId)" type="button" class="deck__ghost" @click="skipNext">Próxima</button>
              <a v-if="music.currentTrack?.spotifyUrl" class="deck__ghost" :href="music.currentTrack.spotifyUrl" target="_blank" rel="noopener noreferrer">Abrir no Spotify ↗</a>
            </div>
          </template>
          <NuxtLink to="/karaoke" class="deck__action" :class="{ 'deck__action--accent': !hasTrack }">{{ hasTrack ? 'Ver letras ↗' : 'Abrir áudio e letra ↗' }}</NuxtLink>
        </div>
      </div>
      <footer class="deck__foot">
        <span class="deck__tag">{{ music.isPlaying ? '● REPRODUZINDO' : hasTrack ? '◉ PAUSADO' : '○ AGUARDANDO FAIXA' }}</span>
        <NuxtLink class="deck__tag" to="/voting">Votar na próxima faixa ↗</NuxtLink>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.home-screen {
  --remaster-accent: #d9fa6e;
  --remaster-paper: #f3f3ed;
  --remaster-muted: #b4b8ae;
  height: 100%;
  overflow-y: auto;
  padding: clamp(16px, 4vw, 45px) clamp(16px, 4vw, 52px) var(--page-bottom-pad);
  color: var(--remaster-paper);
}
.deck {
  width: min(100%, 1160px);
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid #ffffff26;
  background: #10120f;
}
.deck__header, .deck__foot {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  padding: 12px clamp(16px, 3vw, 30px); border-bottom: 1px solid #ffffff26;
}
.deck__brand { display: flex; align-items: center; gap: 11px; font: 700 .95rem var(--font-display); letter-spacing: .17em; }
.deck__brand i { width: 10px; height: 10px; border-radius: 100%; background: var(--remaster-accent); box-shadow: 0 0 12px #d9fa6e80; }
.deck__tag { font: 500 .68rem var(--font-mono); letter-spacing: .15em; color: var(--remaster-muted); }
.deck__actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.deck__action, .deck__ghost {
  min-height: 44px; display: inline-flex; align-items: center; justify-content: center; padding: 9px 13px;
  color: var(--remaster-paper); border: 1px solid #ffffff35; border-radius: 3px;
  font: 500 .76rem var(--font-mono); text-decoration: none;
}
.deck__action--accent { background: var(--remaster-accent); color: #151910; border-color: var(--remaster-accent); font-weight: 700; }
.deck__stage { display: grid; grid-template-columns: minmax(0, .95fr) minmax(0, 1.05fr); min-height: 380px; }
.deck__art {
  isolation: isolate; position: relative; min-height: 270px; overflow: hidden; display: grid; place-items: center;
  background: radial-gradient(ellipse at center, #2b3320, #171d12 48%, #111410 76%);
  border-right: 1px solid #ffffff26; padding: 24px;
}
.deck__art::before {
  content: ''; position: absolute; z-index: -1; inset: 0; opacity: .35;
  background-image: linear-gradient(#d9fa6e18 1px, transparent 1px), linear-gradient(90deg, #d9fa6e18 1px, transparent 1px);
  background-size: 32px 32px; mask-image: radial-gradient(ellipse, #000, transparent 85%);
}
.deck__art--local { background: radial-gradient(ellipse at center, #35451d, #171d12 54%, #111410 78%); }
.deck__disc { position: relative; width: clamp(154px, 26vw, 270px); aspect-ratio: 1; display: grid; place-items: center; }
.deck__disc::before, .deck__disc::after {
  content: ''; position: absolute; pointer-events: none; border-radius: 50%; border: 1px solid #d9fa6e43; inset: -10%; z-index: -1;
  transform: scale(calc(1 + var(--viz-energy, 0) * .17)); opacity: calc(.55 + var(--viz-energy, 0) * .45);
}
.deck__disc::after { inset: -20%; border-style: dashed; }
.deck__disc--beat { filter: drop-shadow(0 0 16px #d9fa6e5c); }
.deck__disc > :deep(.home-vinyl) { width: 100% !important; height: 100% !important; }
.deck__cover { width: 100%; height: 100%; object-fit: contain; border: 1px solid #ffffff2c; }
.deck__meter { position: absolute; inset: auto auto 14px 20px; }
.deck__index { position: absolute; inset: auto 18px 20px auto; }
.deck__details {
  min-width: 0; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 15px;
  padding: clamp(22px, 4vw, 52px);
  background: linear-gradient(130deg, #1a1d17, #111310 58%);
}
.deck__eyebrow { color: var(--remaster-accent); }
.deck__title { margin: 0; font: 700 clamp(2.05rem, 5.3vw, 4.9rem)/.96 var(--font-display); letter-spacing: -.065em; overflow-wrap: anywhere; }
.deck__artist, .deck__error { color: var(--remaster-muted); line-height: 1.45; }
.deck__error { color: #ffcf9f; }
.deck__progress { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.deck__progress input { width: 100%; min-height: 28px; accent-color: var(--remaster-accent); cursor: pointer; }
.deck__progress input:disabled { cursor: default; }
.deck__controls { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; }
.deck__play { width: 52px; min-height: 52px; border-radius: 100%; padding: 0; font-size: 1rem; }
.deck__foot { border-top: 1px solid #ffffff26; border-bottom: 0; }
.deck__foot a { color: var(--remaster-paper); text-decoration: none; }
.deck__foot a:hover, .deck__ghost:hover { color: var(--remaster-accent); }
@media (max-width: 700px) {
  .deck__stage { grid-template-columns: minmax(0, 1fr); }
  .deck__art { border-right: 0; border-bottom: 1px solid #ffffff26; min-height: 220px; }
  .deck__details { padding: 22px 16px; }
  .deck__disc { width: clamp(145px, 43vw, 220px); }
}
@media (prefers-reduced-motion: reduce) {
  .deck__disc::before, .deck__disc::after { transform: none; }
  .deck__disc--beat { filter: none; }
}
</style>
