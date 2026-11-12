import { useAuthStore } from '~/stores/auth'
import type { SpotifySearchResult, SpotifyTrack } from '~/types/spotify'

export function useSpotifySearch () {
  const auth = useAuthStore()
  const results = ref<SpotifyTrack[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  let request: AbortController | undefined

  function cancel () {
    clearTimeout(timer)
    request?.abort()
    loading.value = false
  }

  async function search (query: string, limit = 10): Promise<SpotifyTrack[]> {
    cancel()
    const q = query.trim()
    results.value = []
    error.value = null
    if (!q) return []
    const controller = new AbortController()
    request = controller
    loading.value = true
    try {
      let token = await auth.ensureFreshToken()
      if (controller.signal.aborted) return []
      if (!token) { error.value = 'not_authenticated'; return [] }
      const send = (token: string) => fetch('/api/spotify/search?' + new URLSearchParams({ q, limit: String(limit) }), {
        headers: { Authorization: 'Bearer ' + token }, signal: controller.signal
      })
      let res = await send(token)
      if (res.status === 401) {
        if (await auth.refreshAccessToken()) {
          token = auth.accessToken
          if (token && !controller.signal.aborted) res = await send(token)
        }
      }
      if (!res.ok) throw new Error(String(res.status))
      const data: SpotifySearchResult = await res.json()
      if (controller.signal.aborted) return []
      results.value = data.tracks?.items ?? []
      return results.value
    } catch (e) {
      if (!controller.signal.aborted) error.value = e instanceof Error ? e.message : 'search_failed'
      return []
    } finally {
      if (request === controller) loading.value = false
    }
  }

  function searchDebounced (query: string, delay = 320) {
    clear()
    if (query.trim()) timer = setTimeout(() => { void search(query) }, delay)
  }

  function clear () {
    cancel()
    results.value = []
    error.value = null
  }
  onScopeDispose(cancel)

  return { results, loading, error, search, searchDebounced, clear }
}
