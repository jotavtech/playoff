<script setup lang="ts">
import BattleArena from '~/components/battle/BattleArena.vue'
import BattleJournal from '~/components/battle/BattleJournal.vue'
import LoadingProfile from '~/components/profile/LoadingProfile.vue'
import TasteDNA from '~/components/profile/TasteDNA.vue'
import { useAuthStore } from '~/stores/auth'
import { useBattleEngine } from '~/composables/useBattleEngine'
import { usePlayoffFeedback } from '~/composables/usePlayoffFeedback'
import { useRoom } from '~/composables/useRoom'

const auth = useAuthStore()
const battle = useBattleEngine()
const { notify } = usePlayoffFeedback()
const { createRoom } = useRoom()
const router = useRouter()

const selectedEra = ref(2000)
const showJournal = ref(false)
const creatingRoom = ref(false)

const hasActiveBattle = computed(() => battle.session.value && battle.status.value !== 'idle')

const modes = computed(() => [
  {
    id: 'quick',
    title: 'Quick Battle',
    description: 'Three local rounds with safe demo tracks and any current signal.',
    status: 'READY',
    action: 'START QUICK BATTLE'
  },
  {
    id: 'taste',
    title: 'Taste Battle',
    description: 'Uses the current Spotify signal when available, then falls back to demo seeds.',
    status: auth.isAuthenticated ? 'READY / FALLBACK' : 'SPOTIFY REQUIRED',
    action: 'GENERATE TASTE BATTLE'
  },
  {
    id: 'era',
    title: 'Era Battle',
    description: 'Calibrated by decade with a safe local track pool.',
    status: 'PARTIAL',
    action: 'START ERA BATTLE'
  },
  {
    id: 'room',
    title: 'Room Battle',
    description: 'Realtime battle mode is being calibrated. The existing live room stays separate.',
    status: 'CALIBRATING',
    action: 'ROOM OPTIONS'
  },
  {
    id: 'journal',
    title: 'Battle Journal',
    description: 'Local archive of finished champions and votes.',
    status: 'LOCAL',
    action: 'VIEW JOURNAL'
  }
])

async function runMode (id: string) {
  showJournal.value = false
  if (id === 'quick') {
    await battle.startBattle('quick')
    return
  }
  if (id === 'taste') {
    if (!auth.isAuthenticated) {
      notify('spotify-required')
      return
    }
    await battle.startBattle('taste')
    return
  }
  if (id === 'era') {
    await battle.startBattle('era', { era: selectedEra.value })
    return
  }
  if (id === 'room') {
    notify({
      title: 'ROOM BATTLE CALIBRATING',
      message: 'Soon you will battle with friends in real time. For now, start a Quick Battle.',
      kind: 'info'
    })
    return
  }
  if (id === 'journal') showJournal.value = true
}

async function createLiveRoom () {
  if (creatingRoom.value) return
  creatingRoom.value = true
  const id = await createRoom('PLAYOFF SESSION')
  creatingRoom.value = false
  if (id) router.push(`/room/${id}`)
  else notify('error')
}
</script>

<template>
  <section class="battle-home">
    <BattleArena v-if="hasActiveBattle" @view-journal="showJournal = true" />

    <template v-else>
      <header class="battle-home__hero">
        <div>
          <p class="microtext">PLAYOFF CONTROL ROOM</p>
          <h1>{{ auth.user?.display_name ? `Ready, ${auth.user.display_name}` : 'Your taste signal is loaded.' }}</h1>
          <p>Choose a battle mode. The best next step is Quick Battle.</p>
        </div>
        <button class="battle-home__primary microtext" type="button" @click="runMode('quick')">
          START QUICK BATTLE
        </button>
      </header>

      <div class="battle-home__profile">
        <LoadingProfile />
        <TasteDNA />
      </div>

      <div class="battle-home__era">
        <p class="microtext">ERA SELECTOR</p>
        <div class="battle-home__segments">
          <button
            v-for="era in [1990, 2000, 2010, 2020]"
            :key="era"
            class="battle-home__segment microtext"
            :class="{ 'battle-home__segment--active': selectedEra === era }"
            type="button"
            @click="selectedEra = era"
          >
            {{ era }}S
          </button>
        </div>
      </div>

      <div class="battle-home__modes">
        <article v-for="mode in modes" :key="mode.id" class="battle-home__mode">
          <div>
            <p class="microtext">{{ mode.status }}</p>
            <h2>{{ mode.title }}</h2>
            <p>{{ mode.description }}</p>
          </div>
          <button class="battle-home__mode-btn microtext" type="button" @click="runMode(mode.id)">
            {{ mode.action }}
          </button>
        </article>
      </div>

      <div class="battle-home__room-note">
        <p class="microtext">LIVE ROOM LEGACY</p>
        <p>Need the existing shared queue room instead of Battle Mode?</p>
        <button class="battle-home__mode-btn microtext" type="button" :disabled="creatingRoom" @click="createLiveRoom">
          {{ creatingRoom ? 'OPENING...' : 'CREATE LIVE ROOM' }}
        </button>
      </div>
    </template>

    <BattleJournal v-if="showJournal" class="battle-home__journal" />
  </section>
</template>

<style scoped>
.battle-home {
  height: 100%;
  overflow-y: auto;
  padding: clamp(16px, 3vw, 36px);
}

.battle-home__hero {
  width: min(1080px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 20px;
  margin: 0 auto 18px;
}

.battle-home__hero h1 {
  max-width: 13ch;
  font-size: clamp(44px, 8vw, 102px);
  line-height: 0.88;
  letter-spacing: 0;
}

.battle-home__hero p:not(.microtext) {
  max-width: 42ch;
  margin-top: 14px;
  color: var(--ink-dim);
  line-height: 1.45;
}

.battle-home__primary,
.battle-home__mode-btn,
.battle-home__segment {
  min-height: 52px;
  padding: 0 18px;
  border: 1px solid var(--glass-border);
  color: var(--ink);
  letter-spacing: 0.18em;
  transition: border-color var(--t-fast) linear, background var(--t-fast) linear, color var(--t-fast) linear;
}

.battle-home__primary {
  min-height: 60px;
  border-color: var(--ink);
  background: var(--ink);
  color: var(--bg);
}

.battle-home__mode-btn:hover:not(:disabled),
.battle-home__segment:hover,
.battle-home__primary:hover {
  border-color: var(--ink-dim);
  background: var(--glass);
  color: var(--ink);
}

.battle-home__profile {
  width: min(1080px, 100%);
  display: grid;
  grid-template-columns: 0.82fr 1.18fr;
  gap: 12px;
  margin: 0 auto 12px;
}

.battle-home__era {
  width: min(1080px, 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 auto 12px;
  padding: 12px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.03);
}

.battle-home__segments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.battle-home__segment {
  min-height: 42px;
  padding: 0 12px;
}

.battle-home__segment--active {
  border-color: rgba(57, 255, 156, 0.54);
  background: rgba(57, 255, 156, 0.08);
}

.battle-home__modes {
  width: min(1080px, 100%);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin: 0 auto;
}

.battle-home__mode,
.battle-home__room-note {
  display: grid;
  align-content: space-between;
  gap: 16px;
  min-height: 236px;
  padding: 16px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.035);
}

.battle-home__mode h2 {
  margin-top: 8px;
  font-size: 24px;
  line-height: 0.96;
}

.battle-home__mode p:not(.microtext),
.battle-home__room-note p:not(.microtext) {
  margin-top: 10px;
  color: var(--ink-dim);
  font-size: 16px;
  line-height: 1.45;
}

.battle-home__room-note {
  width: min(1080px, 100%);
  min-height: auto;
  grid-template-columns: 1fr auto;
  align-items: center;
  margin: 12px auto 0;
}

.battle-home__journal {
  width: min(1080px, 100%);
  margin: 18px auto 0;
}

@media (max-width: 980px) {
  .battle-home__hero,
  .battle-home__profile,
  .battle-home__room-note {
    grid-template-columns: 1fr;
  }

  .battle-home__modes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .battle-home {
    padding: 14px;
  }

  .battle-home__hero h1 {
    max-width: 9ch;
  }

  .battle-home__modes {
    grid-template-columns: 1fr;
  }

  .battle-home__mode {
    min-height: 190px;
  }

  .battle-home__primary,
  .battle-home__mode-btn {
    width: 100%;
    min-height: 56px;
  }

  .battle-home__era {
    align-items: stretch;
    flex-direction: column;
  }

  .battle-home__segments {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
