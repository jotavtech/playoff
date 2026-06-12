<script setup lang="ts">
import { usePlayoffFeedback } from '~/composables/usePlayoffFeedback'
import type { BattleTrack } from '~/types/battle'

const props = defineProps<{
  champion: BattleTrack
}>()

const emit = defineEmits<{
  battleAgain: []
  viewJournal: []
}>()

const { notify } = usePlayoffFeedback()

function coverStyle (track: BattleTrack) {
  return track.coverUrl ? { backgroundImage: `url(${track.coverUrl})` } : {}
}

function openSpotify () {
  if (!props.champion.spotifyUrl || !import.meta.client) return
  window.open(props.champion.spotifyUrl, '_blank', 'noopener,noreferrer')
}

async function shareResult () {
  const text = `Playoff champion: ${props.champion.title} by ${props.champion.artist}`
  try {
    if (import.meta.client && navigator.share) {
      await navigator.share({ title: 'Playoff Champion', text })
    } else if (import.meta.client) {
      await navigator.clipboard.writeText(text)
      notify({ title: 'RESULT COPIED', message: 'Champion result copied to clipboard.', kind: 'success' })
    }
  } catch {
    notify('error')
  }
}
</script>

<template>
  <section class="champion">
    <p class="microtext">CHAMPION</p>
    <div class="champion__cover" :style="coverStyle(champion)">
      <span v-if="!champion.coverUrl">PO</span>
    </div>
    <div class="champion__copy">
      <h2>{{ champion.title }}</h2>
      <p class="microtext microtext--bright">{{ champion.artist }}</p>
      <p v-if="champion.album || champion.releaseYear" class="microtext">
        {{ champion.album ?? 'Single' }}<span v-if="champion.releaseYear"> / {{ champion.releaseYear }}</span>
      </p>
    </div>

    <div class="champion__actions">
      <button v-if="champion.spotifyUrl" class="champion__btn microtext" type="button" @click="openSpotify">
        OPEN ON SPOTIFY
      </button>
      <button class="champion__btn champion__btn--primary microtext" type="button" @click="emit('battleAgain')">
        BATTLE AGAIN
      </button>
      <button class="champion__btn microtext" type="button" @click="emit('viewJournal')">
        VIEW JOURNAL
      </button>
      <button class="champion__btn microtext" type="button" @click="shareResult">
        SHARE RESULT
      </button>
    </div>
  </section>
</template>

<style scoped>
.champion {
  display: grid;
  justify-items: center;
  gap: 15px;
  width: min(760px, 100%);
  margin-inline: auto;
  padding: clamp(12px, 3vw, 24px);
  border: 1px solid rgba(57, 255, 156, 0.2);
  background:
    radial-gradient(circle at 50% 22%, rgba(57, 255, 156, 0.1), transparent 40%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(0, 0, 0, 0.2));
  box-shadow: inset 0 0 48px rgba(57, 255, 156, 0.03);
  text-align: center;
}

.champion__cover {
  width: min(300px, 70vw);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 34% 28%, rgba(57, 255, 156, 0.18), transparent 42%),
    linear-gradient(135deg, #171d24, #050607);
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(57, 255, 156, 0.36);
  box-shadow: 0 0 70px rgba(57, 255, 156, 0.1);
}

.champion__cover span {
  font-size: 72px;
  font-weight: 800;
}

.champion__copy h2 {
  max-width: 14ch;
  overflow-wrap: anywhere;
  font-size: clamp(36px, 7vw, 82px);
  line-height: 0.94;
}

.champion__actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
  justify-content: center;
  gap: 10px;
  width: 100%;
}

.champion__btn {
  min-height: 50px;
  padding: 0 18px;
  border: 1px solid var(--glass-border);
  color: var(--ink);
  letter-spacing: 0.13em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.champion__btn:hover {
  border-color: var(--ink-dim);
  background: var(--glass);
}

.champion__btn--primary {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--bg);
}

@media (max-width: 640px) {
  .champion__actions {
    grid-template-columns: 1fr;
  }

  .champion__btn {
    width: 100%;
    min-height: 56px;
  }
}
</style>
