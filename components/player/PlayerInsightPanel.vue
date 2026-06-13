<script setup lang="ts">
import RecommendedTracks from '~/components/player/RecommendedTracks.vue'
import WeeklyRecap from '~/components/player/WeeklyRecap.vue'
import BattleJournal from '~/components/battle/BattleJournal.vue'
import { useLyrics } from '~/composables/useLyrics'

const lyrics = useLyrics()
const showJournal = ref(false)
</script>

<template>
  <section class="player-insights">
    <article class="player-insights__panel player-insights__panel--lyrics">
      <div class="player-insights__head">
        <p class="microtext">LYRICS SIGNAL</p>
        <span class="microtext">{{ lyrics.result.value.status }}</span>
      </div>

      <div v-if="lyrics.available.value" class="player-insights__lyrics">
        <p
          v-for="(line, index) in lyrics.lines.value"
          :key="`${line.at}-${index}`"
          :class="{ 'player-insights__lyric--active': index === lyrics.activeIndex.value }"
        >
          {{ line.text }}
        </p>
      </div>

      <div v-else class="player-insights__empty">
        <h3>{{ lyrics.result.value.status === 'provider-required' ? 'LYRICS SIGNAL LOCKED' : 'LYRICS UNAVAILABLE' }}</h3>
        <p>{{ lyrics.result.value.message }}</p>
      </div>
    </article>

    <article class="player-insights__panel">
      <RecommendedTracks />
    </article>

    <article class="player-insights__panel player-insights__panel--wide">
      <WeeklyRecap @view-journal="showJournal = !showJournal" />
    </article>

    <article v-if="showJournal" class="player-insights__panel player-insights__panel--wide">
      <BattleJournal />
    </article>
  </section>
</template>

<style scoped>
.player-insights {
  width: min(980px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: 14px;
  margin-top: 10px;
}

.player-insights__panel {
  min-width: 0;
  padding: clamp(14px, 2vw, 18px);
  border: 1px solid rgba(255, 255, 255, 0.105);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.018)),
    rgba(0, 0, 0, 0.24);
  box-shadow: inset 0 0 34px rgba(255, 255, 255, 0.022);
}

.player-insights__panel--wide {
  grid-column: 1 / -1;
}

.player-insights__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.player-insights__lyrics {
  display: grid;
  gap: 10px;
  max-height: min(34dvh, 300px);
  overflow-y: auto;
  padding-right: 8px;
}

.player-insights__lyrics p {
  color: var(--ink-faint);
  line-height: 1.5;
}

.player-insights__lyric--active {
  color: var(--ink) !important;
}

.player-insights__empty {
  display: grid;
  gap: 10px;
  min-height: 170px;
  align-content: center;
}

.player-insights__empty h3 {
  font-size: clamp(24px, 4vw, 42px);
  line-height: 0.95;
}

.player-insights__empty p {
  color: var(--ink-dim);
  line-height: 1.45;
}

@media (max-width: 860px) {
  .player-insights {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .player-insights__panel--wide {
    grid-column: auto;
  }
}
</style>
