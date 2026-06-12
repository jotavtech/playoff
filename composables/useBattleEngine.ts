import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useBattleJournal } from '~/composables/useBattleJournal'
import { usePlayoffFeedback } from '~/composables/usePlayoffFeedback'
import type { BattleMode, BattleRound, BattleSession, BattleStatus, BattleTrack } from '~/types/battle'

const DEMO_TRACKS: BattleTrack[] = [
  {
    id: 'demo-qotsa-flow',
    title: 'Go With The Flow',
    artist: 'Queens of the Stone Age',
    album: 'Songs for the Deaf',
    releaseYear: 2002,
    popularity: 86,
    spotifyUrl: 'https://open.spotify.com/search/Go%20With%20The%20Flow%20Queens%20of%20the%20Stone%20Age'
  },
  {
    id: 'demo-white-stripes-seven',
    title: 'Seven Nation Army',
    artist: 'The White Stripes',
    album: 'Elephant',
    releaseYear: 2003,
    popularity: 91,
    spotifyUrl: 'https://open.spotify.com/search/Seven%20Nation%20Army%20The%20White%20Stripes'
  },
  {
    id: 'demo-arctic-monkeys-dancefloor',
    title: 'I Bet You Look Good on the Dancefloor',
    artist: 'Arctic Monkeys',
    album: 'Whatever People Say I Am, That Is What I Am Not',
    releaseYear: 2005,
    popularity: 82,
    spotifyUrl: 'https://open.spotify.com/search/I%20Bet%20You%20Look%20Good%20on%20the%20Dancefloor'
  },
  {
    id: 'demo-strokes-reptilia',
    title: 'Reptilia',
    artist: 'The Strokes',
    album: 'Room on Fire',
    releaseYear: 2003,
    popularity: 84,
    spotifyUrl: 'https://open.spotify.com/search/Reptilia%20The%20Strokes'
  },
  {
    id: 'demo-franz-take-me-out',
    title: 'Take Me Out',
    artist: 'Franz Ferdinand',
    album: 'Franz Ferdinand',
    releaseYear: 2004,
    popularity: 83,
    spotifyUrl: 'https://open.spotify.com/search/Take%20Me%20Out%20Franz%20Ferdinand'
  },
  {
    id: 'demo-chico-a-cidade',
    title: 'A Cidade',
    artist: 'Chico Science & Nacao Zumbi',
    album: 'Da Lama ao Caos',
    releaseYear: 1994,
    popularity: 76,
    spotifyUrl: 'https://open.spotify.com/search/A%20Cidade%20Chico%20Science%20Nacao%20Zumbi'
  }
]

const session = ref<BattleSession | null>(null)
const error = ref<string | null>(null)
let revealTimer: ReturnType<typeof setTimeout> | null = null

function uid () {
  return `battle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function cloneTrack (track: BattleTrack, suffix = ''): BattleTrack {
  return { ...track, id: suffix ? `${track.id}-${suffix}` : track.id }
}

function trackFromCurrentSignal (): BattleTrack | null {
  const music = useMusicVisualStore()
  const track = music.currentTrack
  if (!track) return null
  return {
    id: `signal-${track.id}`,
    title: track.title,
    artist: track.artist,
    album: track.album,
    coverUrl: track.coverUrl ?? undefined
  }
}

function tracksForMode (mode: BattleMode, options?: unknown): BattleTrack[] {
  if (mode === 'room') return []

  const current = trackFromCurrentSignal()
  const seed = (options as { seed?: BattleTrack } | undefined)?.seed
  const rawBase = [
    ...(seed ? [seed] : []),
    ...(current ? [current] : []),
    ...DEMO_TRACKS
  ]
  const seen = new Set<string>()
  const base = rawBase.filter((track) => {
    const key = `${track.title.toLowerCase()}::${track.artist.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (mode === 'era') {
    const era = Number((options as { era?: number } | undefined)?.era ?? 2000)
    const min = era
    const max = era + 9
    const eraTracks = base.filter(track => {
      const year = track.releaseYear ?? 2000
      return year >= min && year <= max
    })
    return eraTracks.length >= 2 ? eraTracks : base
  }

  if (mode === 'taste' && !current) {
    return base.map((track, index) => ({
      ...track,
      id: `${track.id}-taste-${index}`,
      popularity: Math.min(100, (track.popularity ?? 70) + 4)
    }))
  }

  return base
}

function makeRounds (tracks: BattleTrack[], totalRounds = 3): BattleRound[] {
  const safeTracks = tracks.length >= 2
    ? tracks
    : [cloneTrack(DEMO_TRACKS[0], 'a'), cloneTrack(DEMO_TRACKS[1], 'b')]

  return Array.from({ length: totalRounds }, (_, index) => {
    const left = safeTracks[(index * 2) % safeTracks.length]
    let right = safeTracks[(index * 2 + 1) % safeTracks.length]
    if (right.id === left.id) right = safeTracks[(index * 2 + 2) % safeTracks.length]
    return {
      index,
      left: cloneTrack(left, `r${index}-l`),
      right: cloneTrack(right, `r${index}-r`),
      startedAt: Date.now()
    }
  })
}

function setSessionStatus (status: BattleStatus) {
  if (!session.value) return
  session.value = { ...session.value, status }
}

function armVotingSoon () {
  if (!import.meta.client) {
    setSessionStatus('voting')
    return
  }
  if (revealTimer) clearTimeout(revealTimer)
  revealTimer = setTimeout(() => {
    setSessionStatus('voting')
    useCinematicStore().setBarsState('voting')
  }, 520)
}

export function useBattleEngine () {
  const cinematic = useCinematicStore()
  const journal = useBattleJournal()
  const { notify } = usePlayoffFeedback()

  const status = computed<BattleStatus>(() => session.value?.status ?? 'idle')
  const currentRound = computed(() => getCurrentRound())
  const champion = computed(() => session.value?.champion ?? null)

  async function startBattle (mode: BattleMode, options?: unknown): Promise<void> {
    error.value = null

    if (mode === 'room') {
      notify({
        title: 'ROOM BATTLE CALIBRATING',
        message: 'Soon you will battle with friends in real time. For now, start a Quick Battle.',
        kind: 'info'
      })
      return
    }

    const tracks = tracksForMode(mode, options)
    const rounds = makeRounds(tracks)

    session.value = {
      id: uid(),
      mode,
      status: 'seeding',
      currentRoundIndex: 0,
      totalRounds: rounds.length,
      rounds,
      startedAt: Date.now()
    }

    cinematic.exitImmersive()
    cinematic.setBarsState('loading-track')

    await new Promise(resolve => setTimeout(resolve, 220))
    setSessionStatus('reveal')
    cinematic.setBarsState('voting')
    armVotingSoon()

    if (mode === 'taste' && !trackFromCurrentSignal()) notify('demo-mode')
  }

  function vote (side: 'left' | 'right') {
    const active = getCurrentRound()
    const activeSession = session.value
    if (!active || !activeSession) {
      notify('battle-not-ready')
      return
    }
    if (activeSession.status !== 'voting') {
      notify('battle-not-ready')
      return
    }
    if (active.userVote) {
      notify('vote-locked')
      return
    }

    const winner = side === 'left' ? active.left : active.right
    const loser = side === 'left' ? active.right : active.left
    const updatedRound: BattleRound = {
      ...active,
      userVote: side,
      winner,
      loser,
      finishedAt: Date.now()
    }

    const rounds = [...activeSession.rounds]
    rounds[activeSession.currentRoundIndex] = updatedRound

    session.value = {
      ...activeSession,
      rounds,
      status: 'result'
    }
    cinematic.setBarsState('winner')
    notify('vote-locked')
  }

  function nextRound () {
    const activeSession = session.value
    if (!activeSession) return
    if (activeSession.status !== 'result') {
      notify('battle-not-ready')
      return
    }

    const nextIndex = activeSession.currentRoundIndex + 1
    if (nextIndex >= activeSession.totalRounds) {
      finishBattle()
      return
    }

    session.value = {
      ...activeSession,
      currentRoundIndex: nextIndex,
      status: 'reveal'
    }
    cinematic.setBarsState('voting')
    armVotingSoon()
  }

  function resetBattle () {
    if (revealTimer) clearTimeout(revealTimer)
    session.value = null
    error.value = null
    cinematic.setBarsState('idle')
  }

  function finishBattle () {
    const activeSession = session.value
    if (!activeSession) return
    const lastWinner = [...activeSession.rounds].reverse().find(round => round.winner)?.winner
    if (!lastWinner) {
      error.value = 'Champion missing'
      session.value = { ...activeSession, status: 'error' }
      cinematic.setBarsState('error')
      notify('error')
      return
    }

    const finished: BattleSession = {
      ...activeSession,
      status: 'champion',
      champion: lastWinner,
      finishedAt: Date.now()
    }
    session.value = finished
    cinematic.setBarsState('winner')
    journal.saveSession(finished)
  }

  function getCurrentRound (): BattleRound | null {
    const activeSession = session.value
    if (!activeSession) return null
    return activeSession.rounds[activeSession.currentRoundIndex] ?? null
  }

  function beginVoting () {
    if (status.value === 'reveal') setSessionStatus('voting')
  }

  return {
    session,
    status,
    currentRound,
    champion,
    error,
    demoTracks: DEMO_TRACKS,
    startBattle,
    vote,
    nextRound,
    resetBattle,
    finishBattle,
    getCurrentRound,
    beginVoting
  }
}
