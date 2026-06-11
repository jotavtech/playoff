import {
  createRoom, joinRoom, leaveRoom, addTrack, castVote, unvote,
  nextTrack, toClientState, peerRoom, roomExists, getRoomInfo
} from '~/server/utils/rooms'
import type { WsClientMsg, WsServerMsg } from '~/types/room'

function send (peer: any, msg: WsServerMsg) {
  peer.send(JSON.stringify(msg))
}

function broadcast (peer: any, channel: string, msg: WsServerMsg) {
  peer.publish(channel, JSON.stringify(msg))
}

function broadcastAll (peer: any, channel: string, msg: WsServerMsg) {
  broadcast(peer, channel, msg)
  send(peer, msg)
}

export default defineWebSocketHandler({
  open (peer) {
    // Conexão aberta — o cliente envia 'join' com roomId e dados do participante
  },

  message (peer, raw) {
    let msg: WsClientMsg
    try { msg = JSON.parse(raw.text()) }
    catch { return }

    if (msg.type === 'ping') { send(peer, { type: 'pong' }); return }

    if (msg.type === 'join') {
      const { roomId, participantId, displayName, spotifyUserId } = msg.payload

      if (!roomExists(roomId)) {
        send(peer, { type: 'error', payload: { message: 'ROOM NOT FOUND' } })
        return
      }

      const participant = {
        id: participantId, displayName,
        spotifyUserId: spotifyUserId ?? null,
        joinedAt: Date.now()
      }

      const ok = joinRoom(roomId, peer.id, participant)
      if (!ok) { send(peer, { type: 'error', payload: { message: 'JOIN FAILED' } }); return }

      peer.subscribe(`room:${roomId}`)

      // Envia o estado completo da sala ao novo participante
      const state = toClientState(roomId)
      if (state) send(peer, { type: 'room_state', payload: state })

      // Anuncia a todos que alguém entrou
      broadcast(peer, `room:${roomId}`, { type: 'participant_joined', payload: participant })
      return
    }

    if (msg.type === 'add_track') {
      const roomId = peerRoom.get(peer.id)
      if (!roomId) return
      const { track, participantId } = msg.payload

      // Reconstrói o nome do participante a partir do estado da sala
      const state = toClientState(roomId)
      const name = state?.participants.find(p => p.id === participantId)?.displayName ?? 'ANON'

      const result = addTrack(roomId, track, participantId, name)
      if (!result) return

      broadcastAll(peer, `room:${roomId}`, {
        type: 'queue_updated',
        payload: { queue: result.queue, event: result.event, tensionActive: result.tensionActive }
      })
      return
    }

    if (msg.type === 'vote' || msg.type === 'super_vote') {
      const roomId = peerRoom.get(peer.id)
      if (!roomId) return
      const { trackId, participantId } = msg.payload

      const result = castVote(roomId, trackId, participantId, msg.type === 'super_vote')
      if (!result) return

      broadcastAll(peer, `room:${roomId}`, {
        type: 'queue_updated',
        payload: { queue: result.queue, event: result.event, trackId, tensionActive: result.tensionActive }
      })
      return
    }

    if (msg.type === 'unvote') {
      const roomId = peerRoom.get(peer.id)
      if (!roomId) return
      const result = unvote(roomId, msg.payload.trackId, msg.payload.participantId)
      if (!result) return

      broadcastAll(peer, `room:${roomId}`, {
        type: 'queue_updated',
        payload: { queue: result.queue, event: result.event, tensionActive: result.tensionActive }
      })
      return
    }

    if (msg.type === 'next_track') {
      const roomId = peerRoom.get(peer.id)
      if (!roomId) return
      const result = nextTrack(roomId)
      if (!result) return

      broadcastAll(peer, `room:${roomId}`, {
        type: 'track_changed',
        payload: { track: result.track }
      })
      broadcastAll(peer, `room:${roomId}`, {
        type: 'queue_updated',
        payload: { queue: result.queue, event: result.event, tensionActive: result.tensionActive }
      })
    }
  },

  close (peer) {
    const left = leaveRoom(peer.id)
    if (!left) return

    const channel = `room:${left.roomId}`
    peer.unsubscribe(channel)
    broadcast(peer, channel, {
      type: 'participant_left',
      payload: { id: left.participantId }
    })
  },

  error (peer, error) {
    console.error('[playoff/ws] peer error', peer.id, error)
  }
})
