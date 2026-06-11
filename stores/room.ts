import { defineStore } from 'pinia'
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'
import type { RoomClientState, QueueItem, Participant, TrackRef } from '~/types/room'
import type { QueueDramaEvent } from '~/types/cinematic'

export const useRoomStore = defineStore('room', {
  state: () => ({
    room: null as RoomClientState | null,
    participantId: '',
    connected: false,
    tensionActive: false,
    lastDramaEvent: null as QueueDramaEvent | null,
    lastEventTrackId: null as string | null
  }),

  getters: {
    inRoom (state): boolean { return !!state.room && state.connected },
    queue (state): QueueItem[] { return state.room?.queue ?? [] },
    participants (state): Participant[] { return state.room?.participants ?? [] },
    myVotes (state): string[] {
      return state.room?.queue
        .filter(i => i.voterIds.includes(state.participantId))
        .map(i => i.id) ?? []
    },
    topTrack (state): QueueItem | null { return state.room?.queue[0] ?? null }
  },

  actions: {
    setRoom (state: RoomClientState) {
      this.room = state
      this.connected = true
      this._syncCinematicMode()
    },

    applyQueueUpdate (queue: QueueItem[], event: QueueDramaEvent, trackId: string | undefined, tensionActive: boolean) {
      if (this.room) this.room.queue = queue
      this.tensionActive = tensionActive
      this.lastDramaEvent = event
      this.lastEventTrackId = trackId ?? null
      this._syncCinematicMode()
      this._syncBarsState(event, tensionActive)
    },

    addParticipant (p: Participant) {
      if (!this.room) return
      const exists = this.room.participants.find(x => x.id === p.id)
      if (!exists) this.room.participants.push(p)
    },

    removeParticipant (id: string) {
      if (!this.room) return
      this.room.participants = this.room.participants.filter(p => p.id !== id)
    },

    applyTrackChanged (track: TrackRef | null) {
      if (!this.room) return
      this.room.currentTrack = track
      if (track) {
        const music = useMusicVisualStore()
        music.setTrack({
          id: track.id, title: track.title, artist: track.artist,
          album: track.album, coverUrl: track.coverUrl, durationMs: track.durationMs
        })
      }
    },

    setConnected (v: boolean) {
      this.connected = v
      if (!v) useCinematicStore().setMode('ambient-idle')
    },

    leave () {
      this.room = null
      this.connected = false
      this.tensionActive = false
      useCinematicStore().setMode('ambient-idle')
      useCinematicStore().setBarsState('idle')
    },

    _syncCinematicMode () {
      const cinematic = useCinematicStore()
      if (this.tensionActive) {
        cinematic.setMode('voting-tension')
        cinematic.setBarsState('voting')
      } else if (this.inRoom) {
        cinematic.setMode('room-live')
        cinematic.setBarsState('room-live')
      }
    },

    _syncBarsState (event: QueueDramaEvent, tension: boolean) {
      const cinematic = useCinematicStore()
      if (event === 'winner-locked') cinematic.setBarsState('winner')
      else if (tension) cinematic.setBarsState('voting')
      else if (this.inRoom) cinematic.setBarsState('room-live')
    }
  }
})
