import { useBattleJournal } from '~/composables/useBattleJournal'

export interface WeeklyRecap {
  totalBattles: number
  totalVotes: number
  champions: number
  topArtist?: string
  topTrack?: string
  mostPlayedHour?: string
  favoriteEra?: string
  discoveryCount?: number
  generatedAt: string
}

function eraOf (year?: number) {
  if (!year) return undefined
  return `${Math.floor(year / 10) * 10}s`
}

export function useWeeklyRecap () {
  const journal = useBattleJournal()

  const recap = computed<WeeklyRecap>(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const entries = journal.entries.value.filter(entry => new Date(entry.date).getTime() >= weekAgo)
    const topEntry = entries[0]

    return {
      totalBattles: entries.length,
      totalVotes: entries.reduce((sum, entry) => sum + entry.userVotes.length, 0),
      champions: entries.length,
      topArtist: topEntry?.champion.artist,
      topTrack: topEntry?.champion.title,
      mostPlayedHour: entries.length ? '21h - 01h' : undefined,
      favoriteEra: eraOf(topEntry?.champion.releaseYear),
      discoveryCount: entries.reduce((sum, entry) => sum + entry.defeatedTracks.length, 0),
      generatedAt: new Date().toISOString()
    }
  })

  const status = computed(() => recap.value.totalBattles > 0 ? 'available' : 'empty')

  return {
    recap,
    status
  }
}
