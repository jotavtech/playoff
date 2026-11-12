import { defineStore } from 'pinia'
import type { SpotifyUser } from '~/types/spotify'

const TOKEN_KEY = 'playoff:spotify_access_token'
const EXPIRY_KEY = 'playoff:spotify_token_expiry'
const REFRESH_KEY = 'playoff:spotify_refresh_token'

let refreshing: Promise<boolean> | null = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as SpotifyUser | null,
    accessToken: null as string | null,
    refreshToken: null as string | null,
    tokenExpiry: 0,
    loading: false,
    deviceId: null as string | null,
    isPremium: false,
    /** Erro do OAuth Spotify, lido do hash após o callback. */
    authError: null as string | null
  }),

  getters: {
    isAuthenticated (state): boolean {
      return !!state.accessToken && Date.now() < state.tokenExpiry
    },

    tokenValid (state): boolean {
      return !!state.accessToken && Date.now() < state.tokenExpiry - 30_000
    }
  },

  actions: {
    setTokens (accessToken: string, refreshToken: string | null, expiresIn: number) {
      this.accessToken = accessToken
      if (refreshToken) this.refreshToken = refreshToken
      this.tokenExpiry = Date.now() + expiresIn * 1000
      this.authError = null

      try {
        localStorage.setItem(TOKEN_KEY, accessToken)
        localStorage.setItem(EXPIRY_KEY, String(this.tokenExpiry))
        if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
      } catch { /* storage indisponível */ }
    },

    restoreTokens () {
      try {
        const token = localStorage.getItem(TOKEN_KEY)
        const expiry = Number(localStorage.getItem(EXPIRY_KEY) || 0)
        const refresh = localStorage.getItem(REFRESH_KEY)
        if (token && expiry > Date.now()) {
          this.accessToken = token
          this.tokenExpiry = expiry
        }
        if (refresh) this.refreshToken = refresh
      } catch { /* storage indisponível */ }
    },

    refreshAccessToken (): Promise<boolean> {
      if (!refreshing) refreshing = this.requestRefresh().finally(() => { refreshing = null })
      return refreshing
    },

    async requestRefresh (): Promise<boolean> {
      const refreshToken = this.refreshToken
      if (!refreshToken) return false
      try {
        const res = await fetch('/api/spotify/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        })
        if (!res.ok) return false
        const data = await res.json()
        if (this.refreshToken !== refreshToken) return false
        this.setTokens(data.access_token, data.refresh_token || null, data.expires_in)
        return true
      } catch { return false }
    },

    async ensureFreshToken (): Promise<string | null> {
      if (this.accessToken && Date.now() < this.tokenExpiry - 30_000) return this.accessToken
      const ok = await this.refreshAccessToken()
      return ok ? this.accessToken : null
    },

    async loadProfile () {
      const token = await this.ensureFreshToken()
      if (!token) return
      try {
        const res = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) return
        const user = await res.json()
        this.user = user
        this.isPremium = user.product === 'premium' || Boolean(this.deviceId)
      } catch { /* offline / token revogado */ }
    },

    setDeviceId (id: string | null) {
      this.deviceId = id
    },

    setAuthError (msg: string | null) {
      this.authError = msg
    },

    logout () {
      this.user = null
      this.accessToken = null
      this.refreshToken = null
      this.tokenExpiry = 0
      this.deviceId = null
      this.isPremium = false
      try {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(EXPIRY_KEY)
        localStorage.removeItem(REFRESH_KEY)
      } catch { /* ok */ }
    }
  }
})
