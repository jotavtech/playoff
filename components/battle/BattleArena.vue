<script setup lang="ts">
import BattleCard from '~/components/battle/BattleCard.vue'
import ChampionScreen from '~/components/battle/ChampionScreen.vue'
import PlayoffMechanicalDisc from '~/components/hero/PlayoffMechanicalDisc.vue'
import { useBattleEngine } from '~/composables/useBattleEngine'

const emit = defineEmits<{
  viewJournal: []
}>()

const battle = useBattleEngine()

const round = computed(() => battle.currentRound.value)
const statusLabel = computed(() => {
  switch (battle.status.value) {
    case 'seeding': return 'SEEDING BATTLE'
    case 'reveal': return 'BATTLE REVEAL'
    case 'voting': return 'VOTE WINDOW'
    case 'result': return 'RESULT LOCKED'
    case 'champion': return 'CHAMPION'
    case 'error': return 'BATTLE SIGNAL LOST'
    default: return 'READY'
  }
})

const discMode = computed(() => {
  switch (battle.status.value) {
    case 'seeding': return 'loading-profile'
    case 'reveal': return 'battle-reveal'
    case 'voting': return 'voting'
    case 'result': return 'result'
    case 'champion': return 'champion'
    default: return 'preview'
  }
})

const featuredTrack = computed(() => {
  if (battle.champion.value) return battle.champion.value
  return round.value?.winner ?? round.value?.left ?? null
})

function cardState (side: 'left' | 'right') {
  const active = round.value
  if (!active) return 'disabled'
  if (battle.status.value === 'result') {
    if (active.winner === active[side]) return 'winner'
    return 'loser'
  }
  if (battle.status.value !== 'voting') return 'disabled'
  if (active.userVote === side) return 'voted'
  if (active.userVote) return 'disabled'
  return 'idle'
}
</script>

<template>
  <section class="battle-arena">
    <ChampionScreen
      v-if="battle.status.value === 'champion' && battle.champion.value"
      :champion="battle.champion.value"
      @battle-again="battle.startBattle('quick')"
      @view-journal="emit('viewJournal')"
    />

    <template v-else-if="battle.session.value && round">
      <header class="battle-arena__header">
        <div>
          <p class="microtext">{{ statusLabel }}</p>
          <h2>ROUND {{ round.index + 1 }} OF {{ battle.session.value.totalRounds }}</h2>
        </div>
        <button class="battle-arena__reset microtext" type="button" @click="battle.resetBattle">
          RESET
        </button>
      </header>

      <div class="battle-arena__signal">
        <PlayoffMechanicalDisc
          :title="featuredTrack?.title"
          :artist="featuredTrack?.artist"
          :cover-url="featuredTrack?.coverUrl"
          :votes="round.userVote ? 1 : 0"
          :flow-index="round.index + 1"
          :progress="(round.index + 1) / battle.session.value.totalRounds"
          :mode="discMode"
        />
      </div>

      <div class="battle-arena__cards">
        <BattleCard
          :track="round.left"
          side="left"
          :state="cardState('left')"
          @vote="battle.vote"
        />

        <div class="battle-arena__vs microtext">VS</div>

        <BattleCard
          :track="round.right"
          side="right"
          :state="cardState('right')"
          @vote="battle.vote"
        />
      </div>

      <footer class="battle-arena__footer">
        <p class="microtext">
          {{ battle.status.value === 'result' && round.winner ? `WINNER / ${round.winner.title}` : 'LOCK ONE TRACK TO ADVANCE' }}
        </p>
        <button
          v-if="battle.status.value === 'result'"
          class="battle-arena__next microtext"
          type="button"
          @click="battle.nextRound"
        >
          {{ round.index + 1 >= battle.session.value.totalRounds ? 'SHOW CHAMPION' : 'NEXT ROUND' }}
        </button>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.battle-arena {
  width: min(1060px, 100%);
  display: grid;
  gap: 16px;
  margin-inline: auto;
  padding-bottom: 18px;
}

.battle-arena__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}

.battle-arena__header h2 {
  font-size: clamp(28px, 4.5vw, 58px);
  line-height: 0.96;
}

.battle-arena__reset,
.battle-arena__next {
  min-height: 48px;
  padding: 0 18px;
  border: 1px solid var(--glass-border);
  color: var(--ink);
  letter-spacing: 0.14em;
}

.battle-arena__reset:hover,
.battle-arena__next:hover {
  border-color: var(--ink-dim);
  background: var(--glass);
}

.battle-arena__signal {
  display: grid;
  justify-items: center;
}

.battle-arena__signal :deep(.mechanical-disc) {
  width: min(570px, 96vw);
}

.battle-arena__cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 14px;
}

.battle-arena__vs {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background:
    radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.1), transparent 60%),
    rgba(255, 255, 255, 0.045);
  color: var(--ink);
  box-shadow: inset 0 0 22px rgba(255, 255, 255, 0.03);
}

.battle-arena__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.battle-arena__next {
  border-color: rgba(57, 255, 156, 0.36);
}

@media (max-width: 760px) {
  .battle-arena {
    gap: 14px;
  }

  .battle-arena__header,
  .battle-arena__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .battle-arena__cards {
    grid-template-columns: 1fr;
  }

  .battle-arena__vs {
    width: 100%;
    height: 40px;
  }

  .battle-arena__next,
  .battle-arena__reset {
    width: 100%;
    min-height: 56px;
  }
}
</style>
