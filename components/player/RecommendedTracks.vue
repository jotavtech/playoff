<script setup lang="ts">
import { useTrackRecommendations } from '~/composables/useTrackRecommendations'
import { useBattleEngine } from '~/composables/useBattleEngine'
import { usePlayoffFeedback } from '~/composables/usePlayoffFeedback'
import type { RecommendedTrack } from '~/composables/useTrackRecommendations'

const { recommendations, status } = useTrackRecommendations()
const battle = useBattleEngine()
const { notify } = usePlayoffFeedback()

let audio: HTMLAudioElement | null = null
const previewingId = ref<string | null>(null)

function coverStyle (track: RecommendedTrack) {
  return track.coverUrl ? { backgroundImage: `url(${track.coverUrl})` } : {}
}

function stopPreview () {
  if (!audio) return
  audio.pause()
  audio.src = ''
  audio = null
  previewingId.value = null
}

function preview (track: RecommendedTrack) {
  if (!track.previewUrl) {
    if (track.spotifyUrl && import.meta.client) {
      window.open(track.spotifyUrl, '_blank', 'noopener,noreferrer')
      return
    }
    notify('preview-unavailable')
    return
  }

  if (previewingId.value === track.id) {
    stopPreview()
    return
  }

  stopPreview()
  audio = new Audio(track.previewUrl)
  audio.volume = 0.72
  audio.onended = stopPreview
  audio.play()
    .then(() => { previewingId.value = track.id })
    .catch(() => notify('preview-unavailable'))
}

function addToBattle (track: RecommendedTrack) {
  stopPreview()
  battle.startBattle('quick', { seed: track })
  notify({
    title: 'TRACK SEEDED',
    message: `${track.title} is queued into a Quick Battle.`,
    kind: 'success'
  })
}

onBeforeUnmount(stopPreview)
</script>

<template>
  <section class="recommended">
    <div class="recommended__head">
      <p class="microtext">RECOMMENDED NEXT</p>
      <span class="microtext">{{ status === 'available' ? 'SIGNAL LOCKED' : 'DEMO FALLBACK' }}</span>
    </div>

    <ul class="recommended__list">
      <li v-for="track in recommendations" :key="track.id" class="recommended__item">
        <div class="recommended__cover" :style="coverStyle(track)">
          <span v-if="!track.coverUrl">PO</span>
        </div>
        <div class="recommended__copy">
          <h3>{{ track.title }}</h3>
          <p class="microtext microtext--bright">{{ track.artist }}</p>
          <p class="microtext">{{ track.reason }}</p>
        </div>
        <div class="recommended__actions">
          <button class="recommended__btn microtext" type="button" @click="preview(track)">
            {{ previewingId === track.id ? 'STOP' : track.previewUrl ? 'PREVIEW' : track.spotifyUrl ? 'OPEN' : 'NO PREVIEW' }}
          </button>
          <button class="recommended__btn recommended__btn--primary microtext" type="button" @click="addToBattle(track)">
            ADD TO BATTLE
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.recommended {
  display: grid;
  gap: 12px;
}

.recommended__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.recommended__list {
  display: grid;
  gap: 10px;
  max-height: 386px;
  overflow-y: auto;
  padding-right: 4px;
  list-style: none;
}

.recommended__item {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.recommended__item:last-child {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.recommended__cover {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 34% 28%, rgba(0, 229, 255, 0.18), transparent 42%),
    linear-gradient(135deg, #171d24, #050607);
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.recommended__cover span {
  font-size: 16px;
  font-weight: 800;
}

.recommended__copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.recommended__copy h3 {
  overflow: hidden;
  font-size: 16px;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommended__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(96px, 1fr));
  gap: 6px;
}

.recommended__btn {
  min-height: 46px;
  padding: 0 10px;
  border: 1px solid var(--glass-border);
  color: var(--ink);
  letter-spacing: 0.1em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommended__btn:hover {
  border-color: var(--ink-dim);
  background: var(--glass);
}

.recommended__btn--primary {
  border-color: rgba(57, 255, 156, 0.32);
  background: rgba(57, 255, 156, 0.035);
}

@media (max-width: 640px) {
  .recommended__item {
    grid-template-columns: 56px minmax(0, 1fr);
  }

  .recommended__actions {
    grid-column: 1 / -1;
    grid-template-columns: 1fr 1fr;
  }

  .recommended__btn {
    min-height: 48px;
  }
}
</style>
