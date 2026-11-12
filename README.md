# PLAYOFF

**Sistema musical cinematográfico.** Um wallpaper OLED interativo com produto real por cima: busca, votação, salas em tempo real e player — tudo dentro de uma cena preto/branco com chrome liquid.

> Este é um **rebuild total** (v4). O Playoff antigo vive no git history e na branch `master` apenas como referência de domínio. Leia o [PRD completo](./docs/PRD.md) antes de contribuir — os Cinematic Modes, as barras pretas reativas e o universo monocromático são requisitos centrais, não detalhes.

## Stack

- **Nuxt 3** (Vue 3 + TypeScript + Nitro) — SPA fullstack
- **Pinia** — `CinematicStore` e `MusicVisualStore` centralizam todo o estado visual
- **WebSocket via Nitro** (Fase 3) — salas com estado vivo
- **WebGL lazy** (Fase 2) — chrome liquid 3D com fallback CSS obrigatório

## Rodando

```bash
npm install
npm run dev      # http://localhost:3000
```

## Player e letras

- A busca usa a API oficial do Spotify. Para tocar no navegador, use uma conta Premium autorizada para o app.
- O Playoff procura letras no LRCLIB e mostra os versos disponíveis para leitura. A sincronização com áudio do Spotify não é oferecida.
- Em **Letras**, abra um arquivo de áudio e adicione a letra correspondente em formato `.lrc`. O áudio e o LRC ficam no navegador. Os versos seguem a reprodução, e clicar em um verso pula para o ponto correspondente. O medidor da Home reage à frequência do áudio local.

## Atalhos

| Tecla | Ação |
|---|---|
| `C` | Cinema View |
| `W` | OLED Wallpaper Mode |
| `S` ou `Cmd/Ctrl+K` | Command Center |
| `Space` | Play/pause |
| `Cmd/Ctrl+Shift+D` | System Diagnostics |
| `Esc` | Sai do modo atual |

## Fases

1. **Fundação cinematográfica** ✅ — AppShell com layers 00–11, CinematicBarsEngine, MonochromeThemeSystem (8 temas P&B), Hero Mode, Cinema View, OLED Wallpaper Mode, Command Center, Smart Idle, Adaptive Performance, reduced-motion.
2. **Música real** — Spotify OAuth + Web Playback SDK, busca no Command Center, Music Mood Mapping.
3. **Salas vivas** — WebSocket, Room Live Mode, Voting Tension Mode, Queue Drama System.
4. **Premium extras** — Session Recap, Room Poster Generator, Visual Snapshots.

Para demonstrar a cena reativa antes da Fase 2: `Cmd+K` → **Simulate signal**.
