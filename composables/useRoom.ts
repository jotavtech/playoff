import { useRoomStore } from '~/stores/room'
import { useAuthStore } from '~/stores/auth'
import { useSpotifySearch } from '~/composables/useSpotifySearch'
import type { WsClientMsg, WsServerMsg, TrackRef } from '~/types/room'
import type { SpotifyTrack } from '~/types/spotify'

const RECONNECT_DELAYS = [2000, 4000, 8000, 16000]

export function useRoom () {
  const room = useRoomStore()
  const auth = useAuthStore()

  let ws: WebSocket | null = null
  let reconnectAttempt = 0
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let currentRoomId: string | null = null
  let currentParticipantId: string | null = null

  // ─── Participant ID persistido por sessão ────────────────────────────────
  function getOrCreateParticipantId (): string {
    const KEY = 'playoff:participant_id'
    try {
      const stored = sessionStorage.getItem(KEY)
      if (stored) return stored
      const id = Math.random().toString(36).slice(2, 10).toUpperCase()
      sessionStorage.setItem(KEY, id)
      return id
    } catch { return Math.random().toString(36).slice(2, 10).toUpperCase() }
  }

  // ─── Conexão WebSocket ───────────────────────────────────────────────────
  function connect (roomId: string) {
    if (!import.meta.client) return
    currentRoomId = roomId
    currentParticipantId = getOrCreateParticipantId()
    room.participantId = currentParticipantId
    _openSocket()
  }

  function _openSocket () {
    if (!currentRoomId) return
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    ws = new WebSocket(`${proto}//${location.host}/api/ws`)

    ws.onopen = () => {
      reconnectAttempt = 0
      _send({
        type: 'join',
        payload: {
          roomId: currentRoomId!,
          participantId: currentParticipantId!,
          displayName: auth.user?.display_name ?? `SIGNAL_${currentParticipantId!.slice(0, 4)}`,
          spotifyUserId: auth.user?.id ?? undefined
        }
      })
      _startHeartbeat()
    }

    ws.onmessage = (e) => {
      let msg: WsServerMsg
      try { msg = JSON.parse(e.data) } catch { return }
      _handleMsg(msg)
    }

    ws.onclose = () => {
      room.setConnected(false)
      _stopHeartbeat()
      _scheduleReconnect()
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  function _handleMsg (msg: WsServerMsg) {
    switch (msg.type) {
      case 'room_state':
        room.setRoom(msg.payload)
        break
      case 'participant_joined':
        room.addParticipant(msg.payload)
        break
      case 'participant_left':
        room.removeParticipant(msg.payload.id)
        break
      case 'queue_updated':
        room.applyQueueUpdate(
          msg.payload.queue,
          msg.payload.event,
          msg.payload.trackId,
          msg.payload.tensionActive
        )
        break
      case 'track_changed':
        room.applyTrackChanged(msg.payload.track)
        break
      case 'error':
        console.warn('[playoff/room]', msg.payload.message)
        break
      case 'pong':
        break
    }
  }

  function _scheduleReconnect () {
    if (!currentRoomId) return
    const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)]
    reconnectAttempt++
    setTimeout(() => {
      if (currentRoomId) _openSocket()
    }, delay)
  }

  function _startHeartbeat () {
    _stopHeartbeat()
    heartbeatTimer = setInterval(() => _send({ type: 'ping' }), 25_000)
  }

  function _stopHeartbeat () {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
  }

  function _send (msg: WsClientMsg) {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
  }

  // ─── Ações de sala ───────────────────────────────────────────────────────
  function addTrack (spotifyTrack: SpotifyTrack) {
    if (!currentParticipantId) return
    const track: TrackRef = {
      id: spotifyTrack.id,
      title: spotifyTrack.name,
      artist: spotifyTrack.artists.map(a => a.name).join(', '),
      album: spotifyTrack.album.name,
      coverUrl: spotifyTrack.album.images[0]?.url ?? null,
      uri: spotifyTrack.uri,
      durationMs: spotifyTrack.duration_ms,
      previewUrl: spotifyTrack.preview_url
    }
    _send({ type: 'add_track', payload: { track, participantId: currentParticipantId } })
  }

  function vote (trackId: string) {
    if (!currentParticipantId) return
    _send({ type: 'vote', payload: { trackId, participantId: currentParticipantId } })
  }

  function unvote (trackId: string) {
    if (!currentParticipantId) return
    _send({ type: 'unvote', payload: { trackId, participantId: currentParticipantId } })
  }

  function superVote (trackId: string) {
    if (!currentParticipantId) return
    _send({ type: 'super_vote', payload: { trackId, participantId: currentParticipantId } })
  }

  function nextTrack () {
    if (!currentParticipantId) return
    _send({ type: 'next_track', payload: { participantId: currentParticipantId } })
  }

  function disconnect () {
    currentRoomId = null
    _stopHeartbeat()
    ws?.close()
    ws = null
    room.leave()
  }

  // ─── Criar sala ──────────────────────────────────────────────────────────
  async function createRoom (name: string): Promise<string | null> {
    const res = await fetch('/api/room/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.id as string
  }

  return { connect, disconnect, addTrack, vote, unvote, superVote, nextTrack, createRoom }
}
