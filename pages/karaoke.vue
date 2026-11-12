<script setup lang="ts">
import { useLyrics } from '~/composables/useLyrics'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { usePlayerStore } from '~/stores/player'
import { useSpotifyPlayer } from '~/composables/useSpotifyPlayer'
import { useCinematicStore } from '~/stores/cinematic'
import { parseLrc } from '~/utils/lyrics'

const music = useMusicVisualStore()
const player = usePlayerStore()
const cinematic = useCinematicStore()
const { playLocal, seek, togglePlay } = useSpotifyPlayer()
const { lines, available, activeIndex, status, message, synced, retry } = useLyrics()
const list = ref<HTMLElement | null>(null)
const fileError = ref('')
const local = computed(() => music.currentTrack?.source === 'local')
const fullscreen = ref(false)

function openAudio (event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  fileError.value = ''
  playLocal(file)
}
async function openLrc (event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  const id = music.currentTrack?.id
  if (!file || !local.value) return
  fileError.value = ''
  try {
    if (file.size > 1_000_000) throw new Error()
    const parsed = parseLrc(await file.text())
    if (!parsed.length) throw new Error()
    if (music.currentTrack?.id === id) music.localLyrics = parsed
  } catch {
    if (music.currentTrack?.id === id) fileError.value = 'O arquivo .lrc precisa conter versos com marcações de tempo.'
  }
}
async function toggleFullscreen () {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await listPanel.value?.requestFullscreen()
  } catch { /* The reading view remains usable without fullscreen. */ }
}
const listPanel = ref<HTMLElement | null>(null)
function syncFullscreen () { fullscreen.value = document.fullscreenElement === listPanel.value }
onMounted(() => document.addEventListener('fullscreenchange', syncFullscreen))
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', syncFullscreen))

watch([activeIndex, () => music.currentTrack?.id], ([index, id], [, previousId]) => {
  if (id !== previousId && list.value) list.value.scrollTop = 0
  if (index >= 0) list.value?.children[index]?.scrollIntoView({
    block: 'center', behavior: cinematic.reducedMotion ? 'instant' : 'smooth'
  })
}, { flush: 'post' })
</script>

<template>
  <section ref="listPanel" class="lyrics-deck">
    <header class="lyrics-deck__header">
      <div>
        <p class="lyrics-deck__kicker">PLAYOFF / LETRAS</p>
        <h1>{{ music.currentTrack?.title ?? 'Cante junto.' }}</h1>
        <p v-if="music.currentTrack">{{ music.currentTrack.artist }}</p>
      </div>
      <div class="lyrics-deck__meta">
        <p v-if="synced">{{ player.timecode }}</p>
        <button v-if="local" type="button" @click="togglePlay">{{ music.isPlaying ? 'Pausar' : 'Reproduzir' }}</button>
        <button v-if="available" type="button" @click="toggleFullscreen">{{ fullscreen ? 'Sair da tela cheia' : 'Tela cheia' }}</button>
      </div>
    </header>

    <div class="lyrics-deck__files">
      <label class="lyrics-deck__file">Abrir áudio <input type="file" accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg" aria-label="Abrir áudio" @change="openAudio" /></label>
      <label v-if="local" class="lyrics-deck__file">Adicionar letra .lrc <input type="file" accept=".lrc" aria-label="Adicionar letra .lrc" @change="openLrc" /></label>
      <a v-if="music.currentTrack?.spotifyUrl" :href="music.currentTrack.spotifyUrl" target="_blank" rel="noopener noreferrer">Ver no Spotify ↗</a>
    </div>
    <p v-if="fileError || player.playbackError" class="lyrics-deck__error" role="alert">{{ fileError || player.playbackError }}</p>

    <template v-if="available">
      <p class="lyrics-deck__mode">{{ synced ? 'KARAOKÊ SINCRONIZADO' : 'LETRA PARA LEITURA · LRCLIB' }}</p>
      <ol ref="list" class="lyrics-deck__lines" :class="{ 'lyrics-deck__lines--synced': synced }">
        <li v-for="(line, i) in lines" :key="i" :aria-current="i === activeIndex ? 'true' : undefined">
          <button v-if="synced && line.text" type="button" @click="seek(line.at)">{{ line.text }}</button>
          <template v-else>{{ line.text }}</template>
        </li>
      </ol>
    </template>
    <div v-else class="lyrics-deck__empty">
      <p role="status">{{ message }}</p>
      <button v-if="status === 'error'" type="button" @click="retry">Tentar novamente</button>
      <p v-else-if="!music.currentTrack">Busque no Spotify para ler a letra, ou abra áudio e .lrc para cantar junto.</p>
    </div>
  </section>
</template>

<style scoped>
.lyrics-deck {
  --acid: #d9fa6e;
  width: min(100%, 920px);
  height: 100%;
  min-height: 0;
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: clamp(20px, 5vw, 46px) clamp(18px, 5vw, 52px) var(--page-bottom-pad);
  color: #f4f3ee;
  background: linear-gradient(155deg, #151911, #090a0a 45%);
  border-inline: 1px solid #ffffff15;
}
.lyrics-deck:fullscreen { width: 100%; padding-bottom: 2rem; }
.lyrics-deck__header { display: flex; justify-content: space-between; flex-wrap: wrap; align-items: end; gap: 12px; }
.lyrics-deck__header h1 { font-size: clamp(1.85rem, 6vw, 4rem); line-height: 1; overflow-wrap: anywhere; margin-block: .25em .15em; }
.lyrics-deck__header p { color: #b7b9b2; }
.lyrics-deck__kicker, .lyrics-deck__mode, .lyrics-deck__meta { font: 500 .75rem var(--font-mono); letter-spacing: .12em; }
.lyrics-deck .lyrics-deck__kicker, .lyrics-deck__mode { color: var(--acid); }
.lyrics-deck__meta, .lyrics-deck__files { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.lyrics-deck__file, .lyrics-deck__files a, .lyrics-deck__meta button, .lyrics-deck__empty button {
  position: relative; display: inline-flex; align-items: center; min-height: 44px; padding: 8px 13px;
  border: 1px solid #ffffff38; border-radius: 4px; color: inherit; font-size: .875rem; text-decoration: none; cursor: pointer;
}
.lyrics-deck__file:focus-within { outline: 2px solid var(--acid); }
.lyrics-deck__file input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.lyrics-deck__lines { flex: 1; overflow: auto; min-height: 0; list-style: none; margin: 0; padding: 8px 12px 50px 0; }
.lyrics-deck__lines--synced { padding-block: 12vh; }
.lyrics-deck__lines li { color: #dedfd6; font-size: clamp(1.05rem, 3.4vw, 2rem); margin: 0 0 .65em; overflow-wrap: anywhere; }
.lyrics-deck__lines button { text-align: left; color: inherit; }
.lyrics-deck__lines--synced li { color: #b7b9b2; }
.lyrics-deck__lines li[aria-current] { color: var(--acid); font-weight: 700; }
.lyrics-deck__empty { color: #b7b9b2; display: grid; gap: 12px; align-content: center; justify-items: start; flex: 1; }
.lyrics-deck__error { color: #ffd4a3; }
</style>
