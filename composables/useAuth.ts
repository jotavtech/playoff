import { useAuthStore } from '~/stores/auth'
import { useSpotifyPlayer } from '~/composables/useSpotifyPlayer'

const messages: Record<string, string> = {
  access_denied: 'A conexão com o Spotify foi cancelada.',
  state_mismatch: 'A sessão de login expirou. Conecte o Spotify novamente.',
  configuration: 'A conexão com o Spotify ainda não foi configurada.',
  token_exchange_failed: 'O Spotify não concluiu a conexão. Tente novamente.'
}

export function useAuth () {
  const auth = useAuthStore()
  const { initPlayer, destroy } = useSpotifyPlayer()

  function readCallback () {
    const url = new URL(window.location.href)
    const hash = new URLSearchParams(url.hash.slice(1))
    const error = url.searchParams.get('login_error') ?? hash.get('login_error')
    const token = hash.get('access_token')
    if (token && hash.get('login') === 'ok') {
      auth.setTokens(token, hash.get('refresh_token'), Number(hash.get('expires_in')) || 3600)
      url.hash = ''
    } else if (error) {
      auth.setAuthError(messages[error] ?? 'Não foi possível conectar ao Spotify.')
      url.searchParams.delete('login_error')
      if (hash.has('login_error')) url.hash = ''
    } else return false
    history.replaceState(history.state, '', url.pathname + url.search + url.hash)
    return Boolean(token)
  }

  async function boot () {
    auth.loading = true
    try {
      if (!readCallback()) auth.restoreTokens()
      if (!await auth.ensureFreshToken()) return
      await auth.loadProfile()
      if (auth.isAuthenticated && auth.user?.product !== 'free' && auth.user?.product !== 'open') {
        void initPlayer()
      }
    } finally {
      auth.loading = false
    }
  }

  function login () { window.location.assign('/auth/spotify/login') }
  function logout () {
    destroy()
    auth.logout()
  }
  return { auth, login, logout, boot }
}
