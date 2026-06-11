export default defineNuxtConfig({
  compatibilityDate: '2026-06-01',
  devtools: { enabled: false },

  modules: ['@pinia/nuxt'],

  ssr: false,

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'PLAYOFF — CHROME AUDIO ENGINE',
      htmlAttrs: { lang: 'pt-BR', 'data-theme': 'deep-black' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'PLAYOFF — sistema musical cinematográfico. Um wallpaper OLED interativo com música, salas e votação em tempo real.' },
        { name: 'theme-color', content: '#000000' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap'
        }
      ]
    }
  },

  runtimeConfig: {
    // Mapeados automaticamente via NUXT_SPOTIFY_CLIENT_ID etc.
    // Fallback explícito para dev com o formato atual do .env
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID || process.env.NUXT_SPOTIFY_CLIENT_ID || '',
    spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET || process.env.NUXT_SPOTIFY_CLIENT_SECRET || '',
    spotifyRedirectUri: process.env.SPOTIFY_REDIRECT_URI || process.env.NUXT_SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/auth/spotify/callback',
    lastfmApiKey: process.env.LASTFM_API_KEY || process.env.NUXT_LASTFM_API_KEY || '',
    lastfmSharedSecret: process.env.LASTFM_SHARED_SECRET || process.env.NUXT_LASTFM_SHARED_SECRET || '',
    public: {
      buildVersion: '4.0.0-alpha.2'
    }
  },

  nitro: {
    experimental: {
      websocket: true
    }
  }
})
