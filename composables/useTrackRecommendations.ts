import { useMusicVisualStore } from '~/stores/musicVisual'
import { useBattleEngine } from '~/composables/useBattleEngine'
import type { BattleTrack } from '~/types/battle'

export interface RecommendedTrack extends BattleTrack {
  reason: string
  score?: number
}

export function useTrackRecommendations () {
  const music = useMusicVisualStore()
  const battle = useBattleEngine()

  const recommendations = computed<RecommendedTrack[]>(() => {
    const current = music.currentTrack
    const demo = battle.demoTracks.map((track, index) => ({
      ...track,
      id: `rec-${track.id}`,
      reason: index % 2 === 0 ? 'High flow compatibility' : 'Same era',
      score: 92 - index * 4
    }))

    if (!current) return demo.slice(0, 5)

    const currentArtist = current.artist.toLowerCase()
    return demo
      .filter(track => !track.artist.toLowerCase().includes(currentArtist))
      .map((track, index) => ({
        ...track,
        reason: index === 0 ? 'Close to your current signal' : track.releaseYear ? 'Same era' : 'From your taste cluster',
        score: 96 - index * 5
      }))
      .slice(0, 5)
  })

  const status = computed(() => recommendations.value.length ? 'available' : 'empty')

  return {
    recommendations,
    status
  }
}
