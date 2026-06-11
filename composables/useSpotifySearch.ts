import { useAuthStore } from '~/stores/auth'
import type { SpotifySearchResult, SpotifyTrack } from '~/types/spotify'

export function useSpotifySearch () {
  const auth = useAuthStore()
  const results = ref<SpotifyTrack[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  async function search (query: string, limit = 12): Promise<SpotifyTrack[]> {
    const q = query.trim()
    if (!q) { results.value = []; return [] }

    const token = await auth.ensureFreshToken()
    if (!token) { error.value = 'not_authenticated'; return [] }

    loading.value = true
    error.value = null

    try {
      const res = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(q)}&type=track&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const data: SpotifySearchResult = await res.json()
      results.value = data.tracks?.items ?? []
      return results.value
    } catch (e: any) {
      error.value = e?.message ?? 'search_failed'
      return []
    } finally {
      loading.value = false
    }
  }

  function searchDebounced (query: string, delay = 320) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => search(query), delay)
  }

  function clear () {
    results.value = []
    error.value = null
    if (debounceTimer) clearTimeout(debounceTimer)
  }

  return { results, loading, error, search, searchDebounced, clear }
}
