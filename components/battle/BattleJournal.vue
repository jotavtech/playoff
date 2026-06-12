<script setup lang="ts">
import { useBattleJournal } from '~/composables/useBattleJournal'
import { useBattleEngine } from '~/composables/useBattleEngine'

const journal = useBattleJournal()
const battle = useBattleEngine()

function fmtDate (date: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}
</script>

<template>
  <section class="battle-journal">
    <header class="battle-journal__header">
      <div>
        <p class="microtext">BATTLE JOURNAL</p>
        <h2>Archived champions</h2>
      </div>
      <button v-if="journal.entries.value.length" class="battle-journal__clear microtext" type="button" @click="journal.clearJournal">
        CLEAR
      </button>
    </header>

    <div v-if="journal.entries.value.length === 0" class="battle-journal__empty">
      <p class="microtext">NO BATTLES ARCHIVED YET</p>
      <h3>Start your first battle to create your journal.</h3>
      <button class="battle-journal__btn microtext" type="button" @click="battle.startBattle('quick')">
        START QUICK BATTLE
      </button>
    </div>

    <ul v-else class="battle-journal__list">
      <li v-for="entry in journal.entries.value" :key="entry.id" class="battle-journal__entry">
        <div class="battle-journal__cover" :style="entry.champion.coverUrl ? { backgroundImage: `url(${entry.champion.coverUrl})` } : {}">
          <span v-if="!entry.champion.coverUrl">PO</span>
        </div>
        <div class="battle-journal__copy">
          <p class="microtext">{{ entry.mode }} / {{ fmtDate(entry.date) }}</p>
          <h3>{{ entry.champion.title }}</h3>
          <p class="microtext microtext--bright">{{ entry.champion.artist }}</p>
        </div>
        <div class="battle-journal__stats microtext">
          <span>{{ entry.roundsCount }} ROUNDS</span>
          <span>{{ entry.userVotes.length }} VOTES</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.battle-journal {
  display: grid;
  gap: 14px;
}

.battle-journal__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
}

.battle-journal__header h2 {
  font-size: clamp(28px, 4vw, 48px);
  line-height: 0.95;
}

.battle-journal__clear,
.battle-journal__btn {
  min-height: 48px;
  padding: 0 18px;
  border: 1px solid var(--glass-border);
  color: var(--ink);
}

.battle-journal__empty {
  display: grid;
  gap: 12px;
  padding: 22px;
  border: 1px solid var(--glass-border);
  background: var(--glass);
}

.battle-journal__empty h3 {
  font-size: clamp(24px, 4vw, 40px);
  line-height: 0.98;
}

.battle-journal__list {
  display: grid;
  gap: 10px;
  list-style: none;
}

.battle-journal__entry {
  display: grid;
  grid-template-columns: 74px 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 12px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.035);
}

.battle-journal__cover {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 34% 28%, rgba(57, 255, 156, 0.18), transparent 42%),
    linear-gradient(135deg, #171d24, #050607);
  background-size: cover;
  background-position: center;
}

.battle-journal__cover span {
  font-weight: 800;
}

.battle-journal__copy {
  min-width: 0;
}

.battle-journal__copy h3 {
  overflow: hidden;
  font-size: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.battle-journal__stats {
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-align: right;
}

@media (max-width: 640px) {
  .battle-journal__entry {
    grid-template-columns: 58px 1fr;
  }

  .battle-journal__stats {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: space-between;
    text-align: left;
  }
}
</style>
