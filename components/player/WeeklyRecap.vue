<script setup lang="ts">
import { useWeeklyRecap } from '~/composables/useWeeklyRecap'
import { useBattleEngine } from '~/composables/useBattleEngine'

const emit = defineEmits<{
  viewJournal: []
}>()

const { recap, status } = useWeeklyRecap()
const battle = useBattleEngine()

const cards = computed(() => [
  ['BATTLES', status.value === 'available' ? `${recap.value.totalBattles} this week` : 'No signal yet'],
  ['VOTES LOCKED', `${recap.value.totalVotes} decisions`],
  ['TOP SIGNAL', recap.value.topArtist ?? 'Awaiting champion'],
  ['CHAMPION TRACK', recap.value.topTrack ?? 'No champion yet'],
  ['PEAK HOUR', recap.value.mostPlayedHour ?? '21h - 01h'],
  ['DISCOVERIES', `${recap.value.discoveryCount ?? 0} new tracks`]
])
</script>

<template>
  <section class="weekly">
    <div class="weekly__head">
      <p class="microtext">WEEKLY SIGNAL</p>
      <span class="microtext">{{ status === 'available' ? 'LOCAL JOURNAL' : 'EMPTY' }}</span>
    </div>

    <div class="weekly__grid">
      <article v-for="[label, value] in cards" :key="label" class="weekly__card">
        <p class="microtext">{{ label }}</p>
        <strong>{{ value }}</strong>
      </article>
    </div>

    <div class="weekly__actions">
      <button class="weekly__btn microtext" type="button" @click="emit('viewJournal')">
        VIEW BATTLE JOURNAL
      </button>
      <button class="weekly__btn weekly__btn--primary microtext" type="button" @click="battle.startBattle('quick')">
        START QUICK BATTLE
      </button>
    </div>
  </section>
</template>

<style scoped>
.weekly {
  display: grid;
  gap: 12px;
}

.weekly__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.weekly__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(146px, 1fr));
  gap: 8px;
}

.weekly__card {
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.095);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.044), rgba(255, 255, 255, 0.018)),
    rgba(0, 0, 0, 0.18);
}

.weekly__card strong {
  display: block;
  margin-top: 8px;
  overflow-wrap: anywhere;
  color: var(--ink-dim);
  font-size: 16px;
  line-height: 1.2;
}

.weekly__actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 8px;
}

.weekly__btn {
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--glass-border);
  color: var(--ink);
  letter-spacing: 0.12em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weekly__btn:hover {
  border-color: var(--ink-dim);
  background: var(--glass);
}

.weekly__btn--primary {
  border-color: rgba(57, 255, 156, 0.32);
  background: rgba(57, 255, 156, 0.035);
}

@media (max-width: 640px) {
  .weekly__grid {
    grid-template-columns: 1fr 1fr;
  }

  .weekly__actions {
    grid-template-columns: 1fr;
  }

  .weekly__btn {
    width: 100%;
    min-height: 56px;
  }
}
</style>
