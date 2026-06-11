# PLAYOFF — Deploy no Vercel

## Resumo

O Vercel detecta o Nuxt 3 automaticamente. O Nitro gera o build no formato
Build Output API (`.vercel/output`) e o Vercel serve tudo: o SPA, as rotas de
servidor (OAuth do Spotify, busca, refresh de token) como serverless functions.

> **Importante sobre salas em tempo real:** as salas usam **WebSocket**
> (`/api/ws`), e funções serverless do Vercel **não mantêm conexões WebSocket
> persistentes**. Logo, no Vercel funciona tudo — disco, Chromatic Engine,
> visualizer, todos os modos, busca e login do Spotify — **menos** o realtime
> das salas. Para salas, use um host com WebSocket (Railway, Fly.io, render,
> um Node próprio) ou a migração planejada para Cloudflare Durable Objects
> (ver PRD §3). O resto da experiência roda 100% no Vercel.

---

## Passo a passo

### 1. Importar o repositório no Vercel
- Vercel → **Add New → Project** → importe `jotavtech/playoff`.
- Framework Preset: **Nuxt.js** (detectado automaticamente).
- Build Command: `nuxt build` · Install: `npm install` (já no `vercel.json`).

### 2. Variáveis de ambiente (Settings → Environment Variables)

Configure com o **prefixo `NUXT_`** (lidas em runtime, não embutidas no build):

| Variável | Valor |
|---|---|
| `NUXT_SPOTIFY_CLIENT_ID` | seu Client ID do Spotify |
| `NUXT_SPOTIFY_CLIENT_SECRET` | seu Client Secret do Spotify |
| `NUXT_SPOTIFY_REDIRECT_URI` | `https://SEU-DOMINIO.vercel.app/auth/spotify/callback` |
| `NUXT_LASTFM_API_KEY` | (opcional) chave Last.fm |
| `NUXT_LASTFM_SHARED_SECRET` | (opcional) secret Last.fm |

Aplique nos ambientes **Production**, **Preview** e **Development**.

### 3. Spotify Dashboard
Em <https://developer.spotify.com/dashboard> → seu app → **Edit Settings** →
**Redirect URIs**, adicione **exatamente**:

```
https://SEU-DOMINIO.vercel.app/auth/spotify/callback
```

(e mantenha `http://127.0.0.1:3000/auth/spotify/callback` para o dev local).

### 4. Deploy
- **Deploy** no Vercel. Ou, com o CLI:
  ```bash
  npm i -g vercel
  vercel --prod
  ```

---

## Checklist pós-deploy
- [ ] Home carrega (Hero com tipografia massiva).
- [ ] `?demo=gwtf` mostra o disco girando com a cor da música.
- [ ] **Login with Spotify** redireciona e volta autenticado.
- [ ] Busca no Command Center (⌘K) retorna faixas reais.
- [ ] Tocar uma faixa anima disco + visualizer + Chromatic Engine.
- [ ] (Se host com WS) Salas conectam e a fila vota em tempo real.

## Notas técnicas
- `ssr: false` — app é SPA; o Vercel serve o shell e o cliente roteia
  `/room/:id` no browser.
- O `client_secret` nunca vai ao frontend: a troca de token é server-side
  (`/auth/spotify/callback`, `/api/spotify/refresh`).
- Tokens trafegam via hash da URL e são limpos do histórico no boot.
