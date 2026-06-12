import type { BattleJournalEntry, BattleSession } from '~/types/battle'

const JOURNAL_KEY = 'playoff:battle-journal:v1'
const entries = ref<BattleJournalEntry[]>([])
const loaded = ref(false)

function readJournal (): BattleJournalEntry[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(JOURNAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeJournal (value: BattleJournalEntry[]) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(value))
  } catch {
    // Storage is optional. The battle flow must never fail because of it.
  }
}

function makeEntry (session: BattleSession): BattleJournalEntry | null {
  if (!session.champion || !session.finishedAt) return null

  const defeatedTracks = session.rounds
    .map(round => round.loser)
    .filter(Boolean) as BattleJournalEntry['defeatedTracks']

  return {
    id: session.id,
    date: new Date(session.finishedAt).toISOString(),
    mode: session.mode,
    champion: session.champion,
    defeatedTracks,
    roundsCount: session.rounds.length,
    durationMs: session.finishedAt - session.startedAt,
    userVotes: session.rounds
      .filter(round => round.userVote && round.winner)
      .map(round => ({
        roundIndex: round.index,
        votedTrackId: round.userVote === 'left' ? round.left.id : round.right.id,
        winnerTrackId: round.winner!.id
      }))
  }
}

export function useBattleJournal () {
  function loadJournal () {
    if (loaded.value) return
    entries.value = readJournal()
    loaded.value = true
  }

  function saveSession (session: BattleSession) {
    loadJournal()
    const entry = makeEntry(session)
    if (!entry) return
    const withoutDuplicate = entries.value.filter(item => item.id !== entry.id)
    entries.value = [entry, ...withoutDuplicate].slice(0, 30)
    writeJournal(entries.value)
  }

  function clearJournal () {
    entries.value = []
    writeJournal([])
  }

  if (import.meta.client) loadJournal()

  return {
    entries,
    loadJournal,
    saveSession,
    clearJournal
  }
}
