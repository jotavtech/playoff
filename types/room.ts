import type { QueueDramaEvent } from '~/types/cinematic'

export interface Participant {
  id: string
  displayName: string
  spotifyUserId: string | null
  joinedAt: number
}

export interface TrackRef {
  id: string
  title: string
  artist: string
  album: string
  coverUrl: string | null
  uri: string
  durationMs: number
  previewUrl: string | null
}

export interface QueueItem {
  id: string
  track: TrackRef
  votes: number
  voterIds: string[]
  addedBy: string
  addedByName: string
  addedAt: number
  dramaticState: 'normal' | 'leading' | 'tension' | 'winner'
}

export interface RoomClientState {
  id: string
  name: string
  participants: Participant[]
  queue: QueueItem[]
  currentTrack: TrackRef | null
  isPlaying: boolean
  createdAt: number
}

/** Faixa que já tocou na sessão — base do Listening Session Recap (PRD §5.7.6). */
export interface PlayedTrack {
  track: TrackRef
  votesAtLock: number
  addedByName: string
  lockedAt: number
}

export interface SessionRecap {
  roomId: string
  roomName: string
  createdAt: number
  generatedAt: number
  durationMs: number
  tracksPlayed: PlayedTrack[]
  topTrack: PlayedTrack | null
  topAdder: { name: string; count: number } | null
  topArtists: { name: string; count: number }[]
  totalVotes: number
  peakTension: { at: number; trackTitles: string[] } | null
  participantCount: number
}

export type WsClientMsg =
  | { type: 'join';       payload: { roomId: string; participantId: string; displayName: string; spotifyUserId?: string } }
  | { type: 'add_track';  payload: { track: TrackRef; participantId: string } }
  | { type: 'vote';       payload: { trackId: string; participantId: string } }
  | { type: 'unvote';     payload: { trackId: string; participantId: string } }
  | { type: 'super_vote'; payload: { trackId: string; participantId: string } }
  | { type: 'next_track'; payload: { participantId: string } }
  | { type: 'ping' }

export type WsServerMsg =
  | { type: 'room_state';          payload: RoomClientState }
  | { type: 'participant_joined';  payload: Participant }
  | { type: 'participant_left';    payload: { id: string } }
  | { type: 'queue_updated';       payload: { queue: QueueItem[]; event: QueueDramaEvent; trackId?: string; tensionActive: boolean } }
  | { type: 'track_changed';       payload: { track: TrackRef | null } }
  | { type: 'error';               payload: { message: string } }
  | { type: 'pong' }
