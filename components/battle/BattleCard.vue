<script setup lang="ts">
import { usePlayoffFeedback } from '~/composables/usePlayoffFeedback'
import type { BattleTrack } from '~/types/battle'

const props = defineProps<{
  track: BattleTrack
  side: 'left' | 'right'
  state?: 'idle' | 'previewing' | 'voted' | 'winner' | 'loser' | 'disabled'
}>()

const emit = defineEmits<{
  vote: [side: 'left' | 'right']
}>()

const { notify } = usePlayoffFeedback()
const previewing = ref(false)
let audio: HTMLAudioElement | null = null

const cardState = computed(() => props.state ?? 'idle')
const canVote = computed(() => !['winner', 'loser', 'disabled'].includes(cardState.value))

function coverStyle (track: BattleTrack) {
  return track.coverUrl ? { backgroundImage: `url(${track.coverUrl})` } : {}
}

function stopPreview () {
  if (!audio) return
  audio.pause()
  audio.src = ''
  audio = null
  previewing.value = false
}

function onPreview () {
  if (!props.track.previewUrl) {
    if (props.track.spotifyUrl && import.meta.client) {
      window.open(props.track.spotifyUrl, '_blank', 'noopener,noreferrer')
      return
    }
    notify('preview-unavailable')
    return
  }

  if (previewing.value) {
    stopPreview()
    return
  }

  stopPreview()
  audio = new Audio(props.track.previewUrl)
  audio.volume = 0.72
  audio.onended = stopPreview
  audio.play()
    .then(() => { previewing.value = true })
    .catch(() => notify('preview-unavailable'))
}

function onVote () {
  if (!canVote.value) {
    notify('vote-locked')
    return
  }
  stopPreview()
  emit('vote', props.side)
}

onBeforeUnmount(stopPreview)
</script>

<template>
  <article class="battle-card" :data-state="cardState">
    <div class="battle-card__cover" :style="coverStyle(track)">
      <span v-if="!track.coverUrl">{{ side === 'left' ? 'A' : 'B' }}</span>
    </div>

    <div class="battle-card__meta">
      <p class="battle-card__title">{{ track.title }}</p>
      <p class="battle-card__artist microtext">{{ track.artist }}</p>
      <p v-if="track.album || track.releaseYear" class="battle-card__album microtext">
        {{ track.album ?? 'Single' }}<span v-if="track.releaseYear"> / {{ track.releaseYear }}</span>
      </p>
    </div>

    <div class="battle-card__actions">
      <button class="battle-card__btn microtext" type="button" @click="onPreview">
        {{ previewing ? 'STOP' : track.previewUrl ? 'PREVIEW' : track.spotifyUrl ? 'OPEN SPOTIFY' : 'NO PREVIEW' }}
      </button>
      <button
        class="battle-card__btn battle-card__btn--vote microtext"
        type="button"
        :disabled="cardState === 'disabled' || cardState === 'loser'"
        @click="onVote"
      >
        {{ cardState === 'winner' ? 'WINNER' : cardState === 'voted' ? 'VOTE LOCKED' : 'VOTE THIS' }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.battle-card {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 14px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.035);
  transition: border-color var(--t-fast) linear, transform var(--t-fast) var(--ease-liquid), opacity var(--t-fast) linear;
}

.battle-card[data-state='winner'] {
  border-color: rgba(57, 255, 156, 0.58);
  box-shadow: inset 0 0 48px rgba(57, 255, 156, 0.06);
}

.battle-card[data-state='loser'],
.battle-card[data-state='disabled'] {
  opacity: 0.56;
}

.battle-card[data-state='voted'] {
  border-color: rgba(0, 229, 255, 0.42);
}

.battle-card__cover {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 34% 28%, rgba(57, 255, 156, 0.18), transparent 42%),
    linear-gradient(135deg, #171d24, #050607);
  background-size: cover;
  background-position: center;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.battle-card__cover span {
  color: rgba(255, 255, 255, 0.72);
  font-size: clamp(46px, 7vw, 82px);
  font-weight: 800;
}

.battle-card__meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.battle-card__title {
  overflow-wrap: anywhere;
  font-size: clamp(22px, 3vw, 34px);
  font-weight: 700;
  line-height: 0.98;
}

.battle-card__artist,
.battle-card__album {
  letter-spacing: 0.16em;
}

.battle-card__actions {
  display: grid;
  gap: 8px;
}

.battle-card__btn {
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--glass-border);
  color: var(--ink);
  letter-spacing: 0.18em;
  transition: border-color var(--t-fast) linear, background var(--t-fast) linear, color var(--t-fast) linear;
}

.battle-card__btn:hover:not(:disabled) {
  border-color: var(--ink-dim);
  background: var(--glass);
}

.battle-card__btn--vote {
  min-height: 56px;
  border-color: rgba(57, 255, 156, 0.32);
}

.battle-card__btn--vote:hover:not(:disabled) {
  border-color: rgba(57, 255, 156, 0.68);
  background: rgba(57, 255, 156, 0.08);
}

.battle-card__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
