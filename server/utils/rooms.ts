import { randomBytes } from 'node:crypto'
import type { Participant, TrackRef, QueueItem, RoomClientState, QueueDramaEvent, PlayedTrack, SessionRecap } from '~/types/room'

interface ServerQueueItem {
  id: string
  track: TrackRef
  votes: number
  voterIds: Set<string>
  addedBy: string
  addedByName: string
  addedAt: number
}

interface ServerRoom {
  id: string
  name: string
  participants: Map<string, Participant>
  queue: ServerQueueItem[]
  currentTrack: TrackRef | null
  isPlaying: boolean
  createdAt: number
  /** Histórico da sessão — alimenta o Recap (PRD §5.7.6) */
  history: PlayedTrack[]
  totalVotes: number
  peakTension: { at: number; trackTitles: string[] } | null
  /** Pico de participantes simultâneos da sessão */
  maxParticipants: number
}

const rooms = new Map<string, ServerRoom>()

/** peerId → roomId, para limpeza no disconnect */
export const peerRoom = new Map<string, string>()

function roomId (): string {
  return randomBytes(3).toString('hex').toUpperCase()
}

export function createRoom (name: string): string {
  const id = roomId()
  rooms.set(id, {
    id, name,
    participants: new Map(),
    queue: [],
    currentTrack: null,
    isPlaying: false,
    createdAt: Date.now(),
    history: [],
    totalVotes: 0,
    peakTension: null,
    maxParticipants: 0
  })
  return id
}

export function roomExists (id: string): boolean {
  return rooms.has(id)
}

function getRoom (id: string): ServerRoom | null {
  return rooms.get(id) ?? null
}

export function joinRoom (roomId: string, peerId: string, participant: Participant): boolean {
  const room = getRoom(roomId)
  if (!room) return false
  room.participants.set(participant.id, participant)
  room.maxParticipants = Math.max(room.maxParticipants, room.participants.size)
  peerRoom.set(peerId, roomId)
  return true
}

export function leaveRoom (peerId: string): { roomId: string; participantId: string } | null {
  const roomId = peerRoom.get(peerId)
  if (!roomId) return null
  const room = getRoom(roomId)
  if (!room) { peerRoom.delete(peerId); return null }

  // Find participant by peerId mapping (we store peerId as participant.id in join flow)
  const participant = room.participants.get(peerId)
  const participantId = participant?.id ?? peerId
  room.participants.delete(participantId)
  peerRoom.delete(peerId)

  if (room.participants.size === 0) {
    setTimeout(() => {
      // Limpa sala vazia após 5 minutos de inatividade
      const r = rooms.get(roomId)
      if (r && r.participants.size === 0) rooms.delete(roomId)
    }, 5 * 60_000)
  }

  return { roomId, participantId }
}

export function addTrack (
  roomId: string,
  track: TrackRef,
  participantId: string,
  participantName: string
): { queue: QueueItem[]; event: QueueDramaEvent; tensionActive: boolean } | null {
  const room = getRoom(roomId)
  if (!room) return null
  if (room.queue.find(i => i.id === track.id)) return null  // já está na fila

  room.queue.push({
    id: track.id, track,
    votes: 0, voterIds: new Set(),
    addedBy: participantId, addedByName: participantName,
    addedAt: Date.now()
  })

  return { ...calcDrama(room), event: 'track-added' }
}

export function castVote (
  roomId: string,
  trackId: string,
  participantId: string,
  isSuper = false
): { queue: QueueItem[]; event: QueueDramaEvent; tensionActive: boolean; prevLeader?: string } | null {
  const room = getRoom(roomId)
  if (!room) return null

  const item = room.queue.find(i => i.id === trackId)
  if (!item) return null

  const prevLeaderId = room.queue.length > 0
    ? [...room.queue].sort((a, b) => b.votes - a.votes)[0].id
    : null

  if (isSuper) {
    // Super Vote: vai direto para o topo (PRD original do Playoff)
    item.votes += 3
    room.totalVotes += 3
  } else {
    if (item.voterIds.has(participantId)) return null  // já votou
    item.voterIds.add(participantId)
    item.votes += 1
    room.totalVotes += 1
  }

  const result = calcDrama(room)

  // Registra o momento de maior disputa da sessão (PRD §5.7.6)
  if (result.tensionActive) {
    const tense = result.queue.filter(i => i.dramaticState === 'tension' || i.dramaticState === 'winner')
    room.peakTension = { at: Date.now(), trackTitles: tense.slice(0, 2).map(i => i.track.title) }
  }
  const newLeaderId = result.queue[0]?.id

  let event: QueueDramaEvent = 'vote-cast'
  if (result.tensionActive && prevLeaderId === newLeaderId) event = 'tie-detected'
  else if (prevLeaderId && prevLeaderId !== newLeaderId) event = 'leader-changed'
  else if (newLeaderId === trackId && result.queue[0]?.dramaticState === 'winner') event = 'winner-locked'

  return { ...result, event, prevLeader: prevLeaderId ?? undefined }
}

export function unvote (
  roomId: string,
  trackId: string,
  participantId: string
): { queue: QueueItem[]; event: QueueDramaEvent; tensionActive: boolean } | null {
  const room = getRoom(roomId)
  if (!room) return null
  const item = room.queue.find(i => i.id === trackId)
  if (!item || !item.voterIds.has(participantId)) return null
  item.voterIds.delete(participantId)
  item.votes = Math.max(0, item.votes - 1)
  return { ...calcDrama(room), event: 'vote-removed' }
}

export function nextTrack (
  roomId: string
): { queue: QueueItem[]; track: TrackRef | null; event: QueueDramaEvent; tensionActive: boolean } | null {
  const room = getRoom(roomId)
  if (!room) return null

  const sorted = [...room.queue].sort((a, b) => b.votes - a.votes)
  if (sorted.length === 0) {
    room.currentTrack = null
    room.isPlaying = false
    return { ...calcDrama(room), track: null, event: 'track-skipped' }
  }

  const winner = sorted[0]
  room.queue = room.queue.filter(i => i.id !== winner.id)
  room.currentTrack = winner.track
  room.isPlaying = true

  // Histórico da sessão: faixa promovida com o placar do momento
  room.history.push({
    track: winner.track,
    votesAtLock: winner.votes,
    addedByName: winner.addedByName,
    lockedAt: Date.now()
  })

  return { ...calcDrama(room), track: winner.track, event: 'winner-locked' }
}

/** Listening Session Recap (PRD §5.7.6) — resumo visual da sessão. */
export function buildRecap (roomId: string): SessionRecap | null {
  const room = getRoom(roomId)
  if (!room) return null

  const topTrack = room.history.length > 0
    ? [...room.history].sort((a, b) => b.votesAtLock - a.votesAtLock)[0]
    : null

  // Quem mais colocou música pra tocar
  const adderCounts = new Map<string, number>()
  for (const played of room.history) {
    adderCounts.set(played.addedByName, (adderCounts.get(played.addedByName) ?? 0) + 1)
  }
  const topAdderEntry = [...adderCounts.entries()].sort((a, b) => b[1] - a[1])[0]

  // Artistas mais presentes
  const artistCounts = new Map<string, number>()
  for (const played of room.history) {
    for (const artist of played.track.artist.split(', ')) {
      artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1)
    }
  }
  const topArtists = [...artistCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  return {
    roomId: room.id,
    roomName: room.name,
    createdAt: room.createdAt,
    generatedAt: Date.now(),
    durationMs: Date.now() - room.createdAt,
    tracksPlayed: room.history,
    topTrack,
    topAdder: topAdderEntry ? { name: topAdderEntry[0], count: topAdderEntry[1] } : null,
    topArtists,
    totalVotes: room.totalVotes,
    peakTension: room.peakTension,
    participantCount: room.maxParticipants
  }
}

export function toClientState (roomId: string): RoomClientState | null {
  const room = getRoom(roomId)
  if (!room) return null
  const drama = calcDrama(room)
  return {
    id: room.id,
    name: room.name,
    participants: [...room.participants.values()],
    queue: drama.queue,
    currentTrack: room.currentTrack,
    isPlaying: room.isPlaying,
    createdAt: room.createdAt
  }
}

/** Calcula estados dramáticos e tensão da fila. */
function calcDrama (room: ServerRoom): { queue: QueueItem[]; tensionActive: boolean } {
  const sorted = [...room.queue].sort((a, b) => b.votes - a.votes || a.addedAt - b.addedAt)

  const top1 = sorted[0]
  const top2 = sorted[1]
  const tie = !!top1 && !!top2 && top1.votes > 0 && top1.votes === top2.votes
  const tensionActive = tie || (!!top1 && !!top2 && top2.votes > 0 && (top1.votes - top2.votes) <= 1)

  const queue: QueueItem[] = sorted.map((item, i) => {
    let dramaticState: QueueItem['dramaticState'] = 'normal'
    if (i === 0 && item.votes > 0) dramaticState = tie ? 'tension' : 'winner'
    else if (i === 1 && tie) dramaticState = 'tension'
    else if (i === 1 && item.votes > 0) dramaticState = 'leading'

    return {
      id: item.id, track: item.track,
      votes: item.votes, voterIds: [...item.voterIds],
      addedBy: item.addedBy, addedByName: item.addedByName,
      addedAt: item.addedAt, dramaticState
    }
  })

  return { queue, tensionActive }
}

export function getRoomInfo (id: string): { id: string; name: string; participantCount: number } | null {
  const room = getRoom(id)
  if (!room) return null
  return { id: room.id, name: room.name, participantCount: room.participants.size }
}
