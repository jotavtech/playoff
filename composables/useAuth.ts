import { useAuthStore } from '~/stores/auth'
import { useSpotifyPlayer } from '~/composables/useSpotifyPlayer'

/**
 * Gerencia o ciclo de vida da autenticação Spotify:
 * - Lê tokens do URL hash após o callback OAuth
 * - Restaura sessão do localStorage
 * - Inicializa o Web Playback SDK se Premium
 * - Expõe helpers de login/logout
 */
export function useAuth () {
  const auth = useAuthStore()
  const { initPlayer } = useSpotifyPlayer()

  /** Lê parâmetros do hash da URL após o callback Spotify. */
  function readHashTokens (): boolean {
    if (!import.meta.client || !window.location.hash) return false

    const params = new URLSearchParams(window.location.hash.slice(1))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    const expires_in = Number(params.get('expires_in') || 3600)
    const login = params.get('login')

    if (access_token && login === 'ok') {
      auth.setTokens(access_token, refresh_token, expires_in)
      // Limpa o hash da URL para não expor token no histórico do browser
      history.replaceState(null, '', window.location.pathname + window.location.search)
      return true
    }

    const login_error = params.get('login_error')
    if (login_error) {
      console.warn('[playoff/auth] login error:', login_error)
      // Mensagem clara para o usuário (PRD §UX/Login): erro de redirect URI é o caso comum
      auth.setAuthError('Spotify connection failed. Check redirect URI or try again.')
      history.replaceState(null, '', window.location.pathname)
    }
    return false
  }

  async function boot () {
    // 1. Tenta ler tokens do hash (vindo do callback OAuth)
    const fromHash = readHashTokens()

    // 2. Fallback: restaura do localStorage
    if (!fromHash) auth.restoreTokens()

    if (!auth.isAuthenticated) return

    // 3. Carrega perfil do usuário
    await auth.loadProfile()

    // 4. Inicializa SDK se Premium
    if (auth.isPremium) {
      await initPlayer()
    }
  }

  function login () {
    window.location.href = '/auth/spotify/login'
  }

  function logout () {
    auth.logout()
  }

  return { auth, login, logout, boot }
}
