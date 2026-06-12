export default defineNuxtConfig({
  compatibilityDate: '2026-06-01',
  devtools: { enabled: false },

  modules: ['@pinia/nuxt'],

  ssr: false,

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'PLAYOFF — GO WITH THE FLOW',
      htmlAttrs: { lang: 'pt-BR', 'data-theme': 'deep-black' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'PLAYOFF — a tracklist decidida por votos. Ninguém pula, só vota: cada faixa conquista a rotação no vinil.' },
        { name: 'theme-color', content: '#000000' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'PLAYOFF' },
        { property: 'og:title', content: 'PLAYOFF — GO WITH THE FLOW' },
        { property: 'og:description', content: 'A tracklist decidida por votos. Ninguém pula, só vota: cada faixa conquista a rotação no vinil.' },
        { property: 'og:url', content: 'https://playoff-eight.vercel.app' },
        { property: 'og:image', content: 'https://playoff-eight.vercel.app/logo-playoff.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'PLAYOFF — GO WITH THE FLOW' },
        { name: 'twitter:image', content: 'https://playoff-eight.vercel.app/logo-playoff.png' }
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
