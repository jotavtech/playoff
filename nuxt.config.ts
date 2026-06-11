export default defineNuxtConfig({
  compatibilityDate: '2026-06-01',
  devtools: { enabled: false },

  modules: ['@pinia/nuxt'],

  // SPA — o produto é uma cena viva client-side; SSR não agrega ao wallpaper
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
    spotifyClientId: '',
    spotifyClientSecret: '',
    spotifyRedirectUri: '',
    lastfmApiKey: '',
    lastfmSharedSecret: '',
    public: {
      buildVersion: '4.0.0-alpha.1'
    }
  },

  nitro: {
    experimental: {
      websocket: true
    }
  }
})
