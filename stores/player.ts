import { defineStore } from 'pinia'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useRoomStore } from '~/stores/room'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    volume: 0.8 as number,
    muted: false as boolean,
    lastVotePulse: 0 as number,
  }),

  getters: {
    currentTrack () {
      const music = useMusicVisualStore()
      return music.currentTrack ?? null
    },

    status (): 'playing' | 'paused' | 'buffering' {
      const music = useMusicVisualStore()
      if (music.vinylState === 'loading' || music.vinylState === 'transitioning') return 'buffering'
      return music.isPlaying ? 'playing' : 'paused'
    },

    currentTime (): number {
      return useMusicVisualStore().progressMs / 1000
    },

    duration (): number {
      const music = useMusicVisualStore()
      return (music.currentTrack?.durationMs ?? 0) / 1000
    },

    progress (): number {
      if (!this.duration) return 0
      return Math.min(1, this.currentTime / this.duration)
    },

    timecode (): string {
      const fmt = (s: number) =>
        `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
      return `${fmt(this.currentTime)} / ${fmt(this.duration)}`
    },

    queue () {
      return useRoomStore().queue
    },

    isInRoom (): boolean {
      return useRoomStore().inRoom
    },
  },

  actions: {
    setVolume (v: number) {
      this.volume = Math.max(0, Math.min(1, v))
    },

    toggleMute () {
      this.muted = !this.muted
    },

    triggerVotePulse () {
      this.lastVotePulse = Date.now()
    },
  },
})
