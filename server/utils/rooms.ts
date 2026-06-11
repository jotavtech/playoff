import { randomBytes } from 'node:crypto'
import type { Participant, TrackRef, QueueItem, RoomClientState, QueueDramaEvent } from '~/types/room'

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
    createdAt: Date.now()
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
  } else {
    if (item.voterIds.has(participantId)) return null  // já votou
    item.voterIds.add(participantId)
    item.votes += 1
  }

  const result = calcDrama(room)
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

  return { ...calcDrama(room), track: winner.track, event: 'winner-locked' }
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
