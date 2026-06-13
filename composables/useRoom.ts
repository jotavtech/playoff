import { useRoomStore } from '~/stores/room'
import { useAuthStore } from '~/stores/auth'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useAudioAnalyser } from '~/composables/useAudioAnalyser'
import type { WsClientMsg, WsServerMsg, TrackRef } from '~/types/room'
import type { SpotifyTrack } from '~/types/spotify'

const RECONNECT_DELAYS = [2000, 4000, 8000, 16000]

// Singleton — WebSocket e participantId são compartilhados entre todos os
// chamadores de useRoom() na mesma sessão do browser. Sem isso, votar a partir
// da VotingScreen (que não chama connect()) não enviaria nada.
let _ws: WebSocket | null = null
let _reconnectAttempt = 0
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null
let _currentRoomId: string | null = null
let _currentParticipantId: string | null = null
let _beatUnsub: (() => void) | null = null

// A sala é uma sessão persistente: sobrevive à navegação entre abas e a
// reloads. Só um "Sair" explícito encerra. Guardamos o id para reconectar.
const ROOM_KEY = 'playoff:room_id'

export function useRoom () {
  const room = useRoomStore()
  const auth = useAuthStore()
  const music = useMusicVisualStore()
  const analyser = useAudioAnalyser()

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
    // Já conectado à mesma sala com socket vivo → no-op (idempotente).
    if (_currentRoomId === roomId && _ws && _ws.readyState <= WebSocket.OPEN) return
    // Trocando de sala → fecha o socket anterior antes de abrir o novo.
    if (_ws) { try { _ws.close() } catch { /* noop */ } _ws = null }
    _currentRoomId = roomId
    _currentParticipantId = getOrCreateParticipantId()
    room.participantId = _currentParticipantId
    try { sessionStorage.setItem(ROOM_KEY, roomId) } catch { /* noop */ }
    _openSocket()
  }

  /** Reconecta à sala persistida (chamado no boot do app). */
  function restoreSession () {
    if (!import.meta.client || _currentRoomId) return
    let saved: string | null = null
    try { saved = sessionStorage.getItem(ROOM_KEY) } catch { /* noop */ }
    if (saved) connect(saved)
  }

  function _openSocket () {
    if (!_currentRoomId) return
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    _ws = new WebSocket(`${proto}//${location.host}/api/ws`)

    _ws.onopen = () => {
      _reconnectAttempt = 0
      _send({
        type: 'join',
        payload: {
          roomId: _currentRoomId!,
          participantId: _currentParticipantId!,
          displayName: auth.user?.display_name ?? `SIGNAL_${_currentParticipantId!.slice(0, 4)}`,
          spotifyUserId: auth.user?.id ?? undefined
        }
      })
      _startHeartbeat()
      _startBeatBroadcast()
    }

    _ws.onmessage = (e) => {
      let msg: WsServerMsg
      try { msg = JSON.parse(e.data) } catch { return }
      _handleMsg(msg)
    }

    _ws.onclose = () => {
      room.setConnected(false)
      _stopHeartbeat()
      _scheduleReconnect()
    }

    _ws.onerror = () => {
      _ws?.close()
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
      case 'disc_pulse':
        music.pulseBeat()
        break
      case 'disc_flip':
        music.triggerFlip()
        break
      case 'error':
        console.warn('[playoff/room]', msg.payload.message)
        break
      case 'pong':
        break
    }
  }

  function _scheduleReconnect () {
    if (!_currentRoomId) return
    if (_reconnectAttempt >= 6) {
      room.setConnectionFailed(true)
      return
    }
    const delay = RECONNECT_DELAYS[Math.min(_reconnectAttempt, RECONNECT_DELAYS.length - 1)]
    _reconnectAttempt++
    setTimeout(() => {
      if (_currentRoomId) _openSocket()
    }, delay)
  }

  function _startHeartbeat () {
    _stopHeartbeat()
    _heartbeatTimer = setInterval(() => _send({ type: 'ping' }), 25_000)
  }

  function _stopHeartbeat () {
    if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null }
  }

  function _startBeatBroadcast () {
    _stopBeatBroadcast()
    _beatUnsub = analyser.subscribe((frame, beat) => {
      if (beat && music.isPlaying) _send({ type: 'beat_sync', payload: { energy: frame.energy } })
    })
  }

  function _stopBeatBroadcast () {
    if (_beatUnsub) { _beatUnsub(); _beatUnsub = null }
  }

  function _send (msg: WsClientMsg) {
    if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify(msg))
  }

  // ─── Ações de sala ───────────────────────────────────────────────────────
  function addTrack (spotifyTrack: SpotifyTrack) {
    const pid = _currentParticipantId ?? room.participantId
    if (!pid) return
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
    _send({ type: 'add_track', payload: { track, participantId: pid } })
  }

  function vote (trackId: string) {
    const pid = _currentParticipantId ?? room.participantId
    if (!pid) return
    _send({ type: 'vote', payload: { trackId, participantId: pid } })
  }

  function unvote (trackId: string) {
    const pid = _currentParticipantId ?? room.participantId
    if (!pid) return
    _send({ type: 'unvote', payload: { trackId, participantId: pid } })
  }

  function superVote (trackId: string) {
    const pid = _currentParticipantId ?? room.participantId
    if (!pid) return
    _send({ type: 'super_vote', payload: { trackId, participantId: pid } })
  }

  function nextTrack () {
    const pid = _currentParticipantId ?? room.participantId
    if (!pid) return
    _send({ type: 'next_track', payload: { participantId: pid } })
  }

  function disconnect () {
    _currentRoomId = null
    try { sessionStorage.removeItem(ROOM_KEY) } catch { /* noop */ }
    _stopHeartbeat()
    _stopBeatBroadcast()
    _ws?.close()
    _ws = null
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

  return { connect, restoreSession, disconnect, addTrack, vote, unvote, superVote, nextTrack, createRoom }
}
