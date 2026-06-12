export type BattleMode = 'quick' | 'taste' | 'era' | 'room'

export type BattleStatus =
  | 'idle'
  | 'seeding'
  | 'reveal'
  | 'preview'
  | 'voting'
  | 'result'
  | 'champion'
  | 'error'

export interface BattleTrack {
  id: string
  title: string
  artist: string
  album?: string
  coverUrl?: string
  previewUrl?: string
  spotifyUrl?: string
  releaseYear?: number
  popularity?: number
}

export interface BattleRound {
  index: number
  left: BattleTrack
  right: BattleTrack
  winner?: BattleTrack
  loser?: BattleTrack
  userVote?: 'left' | 'right'
  startedAt?: number
  finishedAt?: number
}

export interface BattleSession {
  id: string
  mode: BattleMode
  status: BattleStatus
  currentRoundIndex: number
  totalRounds: number
  rounds: BattleRound[]
  champion?: BattleTrack
  startedAt: number
  finishedAt?: number
}

export interface BattleJournalEntry {
  id: string
  date: string
  mode: BattleMode
  champion: BattleTrack
  defeatedTracks: BattleTrack[]
  roundsCount: number
  durationMs: number
  userVotes: {
    roundIndex: number
    votedTrackId: string
    winnerTrackId: string
  }[]
}
