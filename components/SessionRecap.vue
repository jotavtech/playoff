<script setup lang="ts">
import { downloadPoster } from '~/composables/usePosterGenerator'
import type { SessionRecap } from '~/types/room'

const props = defineProps<{ recap: SessionRecap }>()
const emit = defineEmits<{ close: [] }>()

function fmtDuration (ms: number): string {
  const min = Math.floor(ms / 60000)
  if (min < 1) return '<1 MIN'
  if (min < 60) return `${min} MIN`
  return `${Math.floor(min / 60)}H ${min % 60}MIN`
}

function fmtTime (ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <!-- Entra como camada cinematográfica (layer 10), não popup comum -->
  <div class="recap" role="dialog" aria-label="Resumo da sessão" @click.self="emit('close')">
    <article class="recap__card">
      <header class="recap__head">
        <p class="microtext">LIVE SESSION RECAP</p>
        <h2 class="recap__name">{{ recap.roomName }}</h2>
        <p class="microtext microtext--bright">
          {{ fmtDuration(recap.durationMs) }} · {{ recap.participantCount }} SIGNALS · {{ recap.totalVotes }} VOTES
        </p>
      </header>

      <!-- Most voted -->
      <section v-if="recap.topTrack" class="recap__block">
        <p class="microtext">MOST VOTED SIGNAL</p>
        <p class="recap__top-title">{{ recap.topTrack.track.title }}</p>
        <p class="microtext microtext--bright">
          {{ recap.topTrack.track.artist }} — {{ recap.topTrack.votesAtLock }} VOTES
        </p>
      </section>

      <!-- Tracklist -->
      <section v-if="recap.tracksPlayed.length" class="recap__block">
        <p class="microtext">SESSION TRACKLIST</p>
        <ol class="recap__list">
          <li v-for="(played, i) in recap.tracksPlayed.slice(0, 8)" :key="played.lockedAt" class="recap__row">
            <span class="microtext">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="recap__row-title">{{ played.track.title }}</span>
            <span class="microtext recap__row-meta">{{ played.track.artist }}</span>
            <span class="microtext">{{ fmtTime(played.lockedAt) }}</span>
          </li>
        </ol>
      </section>

      <section v-else class="recap__block recap__block--empty">
        <p class="microtext">NO TRACKS LOCKED THIS SESSION</p>
      </section>

      <!-- Stats -->
      <section class="recap__stats">
        <div v-if="recap.topAdder" class="recap__stat">
          <p class="microtext">TOP CURATOR</p>
          <p class="recap__stat-value">{{ recap.topAdder.name }}</p>
          <p class="microtext">{{ recap.topAdder.count }} TRACK{{ recap.topAdder.count !== 1 ? 'S' : '' }} LOCKED</p>
        </div>
        <div v-if="recap.topArtists.length" class="recap__stat">
          <p class="microtext">TOP ARTISTS</p>
          <p
            v-for="artist in recap.topArtists.slice(0, 3)"
            :key="artist.name"
            class="recap__stat-line"
          >
            {{ artist.name }} <span class="microtext">×{{ artist.count }}</span>
          </p>
        </div>
        <div v-if="recap.peakTension" class="recap__stat">
          <p class="microtext">PEAK TENSION</p>
          <p class="recap__stat-line">{{ recap.peakTension.trackTitles.join(' VS ') }}</p>
          <p class="microtext">{{ fmtTime(recap.peakTension.at) }}</p>
        </div>
      </section>

      <!-- Ações -->
      <footer class="recap__actions">
        <button class="recap__btn recap__btn--primary microtext" @click="downloadPoster(recap)">
          DOWNLOAD POSTER ↓
        </button>
        <button class="recap__btn microtext" @click="emit('close')">
          CLOSE
        </button>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.recap {
  position: fixed;
  inset: 0;
  z-index: var(--layer-10-command);
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(10px);
  animation: recap-in 0.5s var(--ease-scene);
}

@keyframes recap-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.recap__card {
  width: min(560px, 100%);
  max-height: 86dvh;
  overflow-y: auto;
  background: var(--bg-soft);
  border: 1px solid var(--glass-border);
  box-shadow: 0 60px 160px rgba(0, 0, 0, 0.75);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 26px;
  animation: card-rise 0.7s var(--ease-cut);
}

@keyframes card-rise {
  from { transform: translateY(24px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}

.recap__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: center;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--glass-border);
}

.recap__name {
  font-size: clamp(30px, 6vw, 46px);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.02em;
}

.recap__block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recap__block--empty {
  text-align: center;
  padding: 16px 0;
}

.recap__top-title {
  font-size: 24px;
  font-weight: 600;
}

.recap__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recap__row {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.recap__row-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recap__row-meta {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recap__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 18px;
  padding-top: 20px;
  border-top: 1px solid var(--glass-border);
}

.recap__stat {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.recap__stat-value {
  font-size: 17px;
  font-weight: 600;
}

.recap__stat-line {
  font-size: 13px;
  font-weight: 500;
}

.recap__actions {
  display: flex;
  gap: 10px;
}

.recap__btn {
  flex: 1;
  padding: 14px;
  border: 1px solid var(--glass-border);
  color: var(--ink);
  letter-spacing: 0.22em;
  text-align: center;
  transition: background var(--t-fast) linear, color var(--t-fast) linear, border-color var(--t-fast) linear;
}

.recap__btn:hover {
  border-color: var(--ink-dim);
}

.recap__btn--primary {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}

.recap__btn--primary:hover {
  background: transparent;
  color: var(--ink);
}
</style>
