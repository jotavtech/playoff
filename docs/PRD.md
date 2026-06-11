# PLAYOFF — PRD (Product Requirements Document)

> **Versão:** 1.0 — Rebuild Total
> **Status:** Aprovado para execução
> **Última atualização:** 2026-06-11

---

## IMPORTANTE — Leitura obrigatória

Este PRD incorpora o **Adendo Obrigatório de Cinematic Modes, OLED Wallpaper Experience e Rebuild Total** (seção 5 em diante). A prioridade do projeto é: **o Playoff deve ser reconstruído como uma experiência audiovisual cinematográfica**, com Cinema View, OLED Wallpaper Mode, barras pretas reativas, profundidade real, temas apenas preto/branco e funcionalidades novas. Isso não é detalhe visual. É o núcleo do produto.

---

## 1. Visão

O Playoff não é uma aplicação com animações. É um **wallpaper OLED interativo com produto real por cima**: um sistema audiovisual premium onde busca, votação, salas em tempo real e player musical vivem dentro de uma cena cinematográfica preto/branco com chrome liquid.

A referência mental principal:

> "O Playoff inteiro deve parecer um wallpaper OLED vivo do Wallpaper Engine, mas com funcionalidades reais de música, busca, fila, votação, salas e player."

## 2. Domínio (herdado do Playoff original como referência)

O repositório antigo (branch `master`, git history) serve **apenas** como fonte de:

- **Regras de negócio:** votação de músicas, "Super Voto" (joga a música pro topo e toca imediatamente), fila ordenada por votos, histórico de reprodução, likes por usuário.
- **Integrações:** Spotify OAuth 2.0 (Authorization Code Flow), Spotify Web Playback SDK (requer Premium; client-side), Spotify Web API (busca, metadados), Last.fm (metadados/gêneros), preview HTML5 de 30s como fallback.
- **Dados:** schema de users, songs, votes, play_history, friendships.
- **Histórico de produto:** retrospectivas (semanal e anual), perfil de usuário, social.

O Playoff antigo deve ser **descartado** em: arquitetura visual, layout, componentes, identidade, experiência, organização de interface, estrutura de produto, tom visual, decisões de UX antigas, estética punk/revoltada, aparência de projeto feito sozinho.

### 2.1 Restrições técnicas do player

O Spotify Web Playback SDK é client-side e exige **Spotify Premium**. O visual pode reagir a metadados, estado de player, progresso e capa — mas o produto **nunca promete reprodução** onde a conta/dispositivo não permite. Fallback: preview HTML5 de 30s quando disponível; estado visual `idle`/`AWAITING SIGNAL` quando não.

## 3. Stack técnica (decisões fechadas)

| Camada | Decisão |
|---|---|
| Framework | **Nuxt 3** (fullstack: Vue 3 + TypeScript + Nitro server) |
| Estado | **Pinia** (stores tipadas: `CinematicStore`, `MusicVisualStore`, …) |
| Realtime | **WebSocket self-hosted via Nitro** (crossws). Migração futura para Cloudflare Durable Objects (cada sala = um objeto com estado vivo) fica documentada como evolução, não requisito da v1. |
| Visual 3D | WebGL **lazy-loaded** (Three.js) com fallback CSS/canvas obrigatório |
| Persistência | PostgreSQL (produção) / SQLite (dev) — Fase 3 |
| Acessibilidade | `prefers-reduced-motion` obrigatório desde o nascimento |

## 4. Fases de execução

| Fase | Escopo | Status |
|---|---|---|
| **1 — Fundação cinematográfica** | PRD no repo, projeto Nuxt 3, AppShell com sistema de layers (00–11), CinematicBarsEngine reativo, MonochromeThemeSystem, Hero Mode editorial, Cinema View, OLED Wallpaper Mode, Ambient Idle, Smart Idle, reduced-motion, Adaptive Performance, Command Center (esqueleto), atalhos de teclado | **Em execução** |
| 2 — Música real | Spotify OAuth, Web Playback SDK, busca no Command Center, Track Transition Mode com dados reais, Music Mood Mapping | Pendente |
| 3 — Salas vivas | WebSocket/Nitro, Room Live Mode, Voting Tension Mode, Queue Drama System, persistência | Pendente |
| 4 — Premium extras | Session Recap, Room Poster Generator, Visual Snapshots, Personal Visual Profile, diagnostics completo | Pendente |

---

# 5. ADENDO OBRIGATÓRIO — CINEMATIC MODES, OLED WALLPAPER EXPERIENCE E REBUILD TOTAL

## 5.0 Regra suprema atualizada

Este projeto deve deixar absolutamente claro que o Playoff será um **REBUILD COMPLETO**.

Não é redesign. Não é skin. Não é tema novo. Não é refactor. Não é versão 2 com a mesma estrutura. É um produto novo usando o repositório antigo apenas como referência de domínio.

O Playoff antigo deve ser tratado como: fonte de ideias, fonte de regras de negócio, fonte de histórico, fonte de entendimento da proposta, fonte de dados úteis.

Mas deve ser descartado em: arquitetura visual, layout, componentes, identidade, experiência, organização de interface, estrutura de produto, tom visual, decisões de UX antigas, estética punk/revoltada, aparência de projeto feito sozinho.

O novo Playoff deve nascer como um produto premium, cinematográfico, preto/branco, chrome liquid, reativo à música e com sensação de instalação audiovisual interativa.

## 5.1 Filosofia visual obrigatória

### 5.1.1 Playoff como Wallpaper Engine funcional

O produto inteiro deve parecer uma cena viva. Não deve existir separação rígida entre background, player, música, sala, fila, busca, animação e tema. Tudo deve parecer parte do mesmo organismo visual.

A interface deve funcionar como: wallpaper OLED interativo, pôster editorial animado, visualizer musical premium, sistema operacional sonoro, painel de controle cinematográfico, sala digital de música, produto de luxo tecnológico.

O usuário deve abrir o site e sentir que entrou em uma cena. Não em um dashboard.

### 5.1.2 Preto e branco como regra absoluta

O produto deve ter temas, mas os temas são apenas variações dentro do universo preto/branco. **Não criar temas coloridos tradicionais.**

Temas permitidos: Pure White, Deep Black, OLED Black, Editorial White, Chrome Light, Chrome Dark, Monochrome Glass, Cinema Contrast, Ink Mode, Frost Mode.

Cores da música podem existir, mas apenas como: reflexo no chrome, aberração cromática leve, halo mínimo, sombra atmosférica, iluminação de borda, progress accent, shader uniform, microdetalhe no player.

**Nunca** transformar a UI em um tema colorido baseado na capa. A capa influencia a atmosfera, não sequestra a identidade.

## 5.2 Cinematic Modes

Criar um sistema chamado `CinematicModeSystem`. Ele controla a forma como o Playoff se comporta visualmente em diferentes estados de uso.

### 5.2.1 Hero Mode

Modo padrão da landing e das telas principais.

Características: tipografia gigante, composição editorial, barras pretas cinematográficas, objeto chrome liquid em profundidade, microtextos técnicos, grid fino, background preto/branco, movimento lento, atmosfera premium, sensação de trailer silencioso.

Uso: landing, dashboard vazio, primeira entrada do usuário, tela de música em destaque.

### 5.2.2 OLED Wallpaper Mode

Modo onde a interface vira praticamente um wallpaper vivo.

Características: fullscreen, poucos elementos visíveis, player mínimo, barras pretas reativas, chrome liquid em movimento lento, capa da música como influência abstrata, título grande da música, artista em microtexto, progress bar cinematográfica, relógio ou status opcional, ideal para deixar aberto no monitor.

Acessível por botão: `Enter Wallpaper Mode` ou `Cinema View`.

Objetivo: o usuário deve poder deixar o Playoff aberto como uma peça visual no monitor enquanto a música toca.

### 5.2.3 Focus Listening Mode

Modo para ouvir música sem distração.

Características: interface reduzida, player central, capa em destaque, barras pretas, background vivo, fila oculta, busca minimizada, motion controlado, transições suaves.

Ações disponíveis: play/pause, próxima, anterior, abrir fila, sair do modo foco.

### 5.2.4 Room Live Mode

Modo para salas musicais em tempo real.

Características: fila visível, votos com animação, participantes como pequenos sinais, barras reativas à atividade da sala, chrome reage quando alguém vota, música vencedora ganha destaque, transição cinematográfica quando troca a música.

A sala deve parecer um ambiente vivo, não apenas uma lista.

### 5.2.5 Voting Tension Mode

Ativado quando há disputa forte entre músicas na fila.

Características: barras pretas ficam mais presentes, micro pulsos na interface, cards disputando posição, score com animação tensa, textos técnicos do tipo: `TENSION HELD`, `QUEUE PRESSURE RISING`, `NEXT SIGNAL UNSTABLE`, `VOTE WINDOW ACTIVE`.

Objetivo: transformar votação em momento cinematográfico.

### 5.2.6 Track Transition Mode

Ativado na troca de música.

Características: tela muda como corte de cena, barra superior/inferior reage primeiro, chrome distorce, título antigo desaparece como afterimage, nova capa entra com profundidade, nova paleta aparece apenas como reflexo, progress reseta com animação líquida.

Tempo sugerido: 900ms a 1600ms — deve parecer intencional, não lento.

### 5.2.7 Ambient Idle Mode

Ativado quando não há música tocando.

Características: chrome respira lentamente, barras quase estáticas, microtextos de sistema, CTA discreto para buscar música, fundo premium limpo, nenhum visual barulhento.

Textos possíveis: `AWAITING SIGNAL`, `NO TRACK LOCKED`, `SEARCH TO BEGIN`, `SYSTEM IDLE`.

## 5.3 Cinematic Bars System

Criar um sistema chamado `CinematicBarsEngine`. **Este sistema é obrigatório.**

### 5.3.1 Conceito

O Playoff deve ter barras pretas cinematográficas que ocupam o espaço total do monitor e fazem parte da cena. Elas não devem parecer apenas dois retângulos jogados por cima. Elas devem ser camadas vivas da interface.

As barras devem: ocupar 100dvw, respeitar 100dvh, funcionar em qualquer monitor, adaptar em mobile, reagir à música, reagir à sala, reagir à votação, reagir à troca de faixa, criar sensação de profundidade, permitir elementos por cima, não bloquear usabilidade.

### 5.3.2 Barras como elemento de profundidade

As barras devem existir em camadas:

- **Camada 1 — base mask:** barras pretas sólidas, posição superior e inferior.
- **Camada 2 — soft edge:** borda interna com leve blur ou gradient para criar profundidade.
- **Camada 3 — reactive line:** linha fina que reage à música (escala, opacidade, distorção, vibração, comprimento, ritmo).
- **Camada 4 — metadata overlay:** pequenos textos técnicos sobre as barras (track title, artist, room status, playback status, timecode, queue signal, FPS/status em dev, `PLAYOFF SYSTEM`, `LIVE SESSION`, `CHROME AUDIO ENGINE`).
- **Camada 5 — foreground UI:** elementos reais de interface acima das barras (botão de modo cinema, status Spotify, mini player, controle de volume, sair do modo, nome da sala, participantes).

### 5.3.3 Comportamento reativo das barras

As barras devem reagir com base em: música tocando, pausa, troca de faixa, progresso, intensidade estimada, votos, entrada de participantes, busca ativa, erro, modo cinema.

```ts
type CinematicBarsState =
  | 'idle'
  | 'searching'
  | 'loading-track'
  | 'playing'
  | 'paused'
  | 'transitioning'
  | 'voting'
  | 'winner'
  | 'room-live'
  | 'error'
  | 'wallpaper'

type CinematicBarsVisualState = {
  topHeight: number
  bottomHeight: number
  opacity: number
  edgeBlur: number
  innerLineOpacity: number
  innerLineScale: number
  vibration: number
  metadataOpacity: number
  depthShadow: number
  chromaticNoise: number
}
```

### 5.3.4 Regras de movimento das barras

- **Idle:** barras pequenas, opacidade baixa, movimento quase inexistente.
- **Playing:** barras respiram lentamente, linhas internas reagem ao progresso, micro vibração sutil.
- **Paused:** barras travam, metadados continuam visíveis, chrome desacelera.
- **Track Transition:** barras aumentam rapidamente, tela parece cortar para uma nova cena, metadados somem e retornam com nova faixa.
- **Voting:** barras pulsam de forma curta, linhas internas mais evidentes, score da fila influencia tensão.
- **Winner:** barras fecham levemente, próximo track ganha destaque, texto técnico aparece por 1 segundo.
- **Wallpaper Mode:** barras protagonistas, conteúdo reduzido, player vira peça visual, movimento contínuo e elegante.

## 5.4 Layering e profundidade

A aplicação deve ter diferença real de profundidade. Não usar apenas z-index sem intenção.

```
Layer 00 - Base background
Layer 01 - Dynamic monochrome gradient
Layer 02 - Abstract album influence
Layer 03 - Chrome liquid 3D object
Layer 04 - Cinematic bars base
Layer 05 - Soft shadows and depth masks
Layer 06 - Main content grid
Layer 07 - Floating panels
Layer 08 - Player dock
Layer 09 - Technical metadata overlays
Layer 10 - Command/menu/modal
Layer 11 - Scene transition overlay
```

Regras:

- o chrome liquid deve parecer atrás da UI em algumas telas
- em modo cinema, o chrome pode atravessar visualmente a composição
- as barras devem estar acima do background, mas abaixo de alguns controles
- o player deve parecer preso à cena, não colado no HTML
- modais devem entrar como camada cinematográfica, não popup comum
- busca deve abrir como painel de comando premium
- cada tela deve ter noção de distância visual

## 5.5 Hero padrão obrigatório

### 5.5.1 Elementos obrigatórios

Fundo preto ou branco; barras pretas cinematográficas; tipografia massiva; microtextos técnicos; objeto chrome liquid em profundidade; CTA principal; CTA secundário; status do sistema; algum elemento reativo à música quando houver música tocando; grid editorial sutil; composição com partes cortadas pelas bordas da tela.

### 5.5.2 Layout sugerido

```
┌─────────────────────────────────────────────┐
│ BLACK CINEMATIC BAR                         │
│ system text / room status / playback state  │
├─────────────────────────────────────────────┤
│                                             │
│      HUGE EDITORIAL TITLE                   │
│      PLAYOFF                                │
│                                             │
│          [chrome liquid object]             │
│                                             │
│ search / create room / enter cinema         │
│                                             │
├─────────────────────────────────────────────┤
│ BLACK CINEMATIC BAR                         │
│ track metadata / timecode / signal          │
└─────────────────────────────────────────────┘
```

### 5.5.3 Hero dinâmico

Se houver música tocando: título pode dividir espaço com o nome da faixa; barras mostram metadados; chrome reage ao progresso; CTA muda para `Enter Cinema View`; fundo recebe reflexo mínimo da capa.

Se não houver música: CTA principal é `Search Music`; CTA secundário é `Create Room`; status mostra `AWAITING SIGNAL`.

## 5.6 Sistema de temas preto/branco

Criar `MonochromeThemeSystem`.

```ts
type MonochromeTheme =
  | 'pure-white'
  | 'editorial-white'
  | 'frost-chrome'
  | 'deep-black'
  | 'oled-black'
  | 'cinema-contrast'
  | 'monochrome-glass'
  | 'ink-system'
```

- **Pure White:** background quase branco, texto preto, chrome claro, sombras suaves — ideal para busca e dashboard.
- **OLED Black:** preto real, branco forte, brilho mínimo — perfeito para Wallpaper Mode, economia visual em telas OLED, sensação de monitor premium.
- **Cinema Contrast:** preto intenso, barras protagonistas, tipografia grande, alto contraste — usado em troca de música e modo sala.
- **Frost Chrome:** branco frio, vidro translúcido, chrome com reflexo limpo — ideal para páginas de perfil/configurações.

## 5.7 Funcionalidades novas obrigatórias

### 5.7.1 Cinema View

Botão global `Cinema View`. Ao ativar: interface vira fullscreen visual, barras cinematográficas ativas, player vira centro da experiência, fila oculta por padrão, busca vira comando rápido, chrome liquid ganha protagonismo, título da música em escala grande, controles mínimos.

Atalhos: `C` entra/sai do Cinema View · `Space` play/pause · `S` abre busca · `Q` abre fila · `Esc` sai do modo.

### 5.7.2 OLED Wallpaper Mode

Modo ainda mais limpo que Cinema View. Objetivo: transformar o Playoff em um wallpaper animado funcional.

Elementos visíveis: música atual, artista, progresso, chrome liquid, barras pretas, hora/status opcional, controles aparecem apenas no hover.

Regras: esconder UI desnecessária após alguns segundos; mostrar controles no mouse move; reduzir burn-in com movimento sutil; evitar elementos estáticos brancos por tempo infinito; permitir tema OLED Black como padrão.

### 5.7.3 Visual Presets

```ts
type VisualPreset =
  | 'cinema'
  | 'oled-wallpaper'
  | 'editorial'
  | 'chrome-lab'
  | 'minimal-player'
  | 'room-stage'
  | 'focus'
```

Cada preset altera: intensidade de motion, tamanho das barras, presença de chrome, quantidade de microtexto, densidade da UI, comportamento do player, fundo claro/escuro.

### 5.7.4 Music Mood Mapping

Sistema que infere clima visual da música usando metadados disponíveis (capa do álbum, popularidade, nome, artista, gênero quando disponível, estado de reprodução, histórico de interação, BPM se alguma fonte permitir futuramente, fallback manual).

```ts
type MusicMood =
  | 'cold'
  | 'soft'
  | 'heavy'
  | 'fast'
  | 'nocturnal'
  | 'bright'
  | 'minimal'
  | 'dramatic'
  | 'luxury'
  | 'chaotic-controlled'
```

Uso: controlar velocidade do chrome, intensidade das barras, densidade dos microtextos, blur/noise, comportamento do player.

### 5.7.5 Queue Drama System

A fila deve ter dramaticidade visual. Não pode ser apenas uma lista.

Funcionalidades: música com mais votos cresce visualmente; disputa acirrada ativa Voting Tension Mode; música próxima recebe spotlight; música removida sai como corte visual; música adicionada entra como sinal novo; empate mostra estado de tensão; vencedor ativa transição especial.

```ts
type QueueDramaEvent =
  | 'track-added'
  | 'vote-cast'
  | 'vote-removed'
  | 'leader-changed'
  | 'tie-detected'
  | 'winner-locked'
  | 'track-skipped'
  | 'queue-cleared'
```

### 5.7.6 Listening Session Recap

Ao finalizar uma sala ou sessão, gerar resumo visual: músicas tocadas, música mais votada, usuário que mais adicionou músicas, duração da sessão, artistas mais presentes, momento de maior disputa, capa visual da sessão, opção de compartilhar.

Visual: card preto/branco premium, poster gerado, estética chrome liquid, exportável como imagem futuramente.

### 5.7.7 Room Poster Generator

Cada sala pode gerar um poster visual: nome da sala, data, músicas principais, top voters, chrome liquid render, tema preto/branco, frase técnica, QR/link da sala. Objetivo: transformar sessões em arte compartilhável.

### 5.7.8 Command Center

Command menu premium. Atalho: `Cmd/Ctrl + K`.

Ações: buscar música, criar sala, entrar em sala, ativar Cinema View, ativar OLED Mode, trocar tema, abrir player, abrir fila, abrir perfil, abrir configurações, abrir diagnóstico do sistema.

Visual: painel preto/branco, blur, borda fina, animação cinematográfica, resultados com teclado, sensação de terminal premium — não terminal hacker genérico.

### 5.7.9 System Diagnostics Overlay

Overlay opcional com status técnico: FPS aproximado, WebGL status, Spotify status, realtime status, latency, current theme, current cinematic mode, current scene, queue events, room participants, token status mascarado, build version.

Uso: desenvolvimento, demonstração técnica, portfolio, debugging. Atalho: `Cmd/Ctrl + Shift + D`.

### 5.7.10 Adaptive Performance Mode

A aplicação deve detectar capacidade do dispositivo e ajustar visual.

```ts
type PerformanceTier = 'low' | 'medium' | 'high' | 'ultra'
```

- **Low:** sem WebGL pesado, barras simples, menos blur, menos partículas, motion reduzido.
- **Medium:** chrome simplificado, motion moderado, shader leve.
- **High:** chrome liquid completo, barras reativas, transições cinematográficas.
- **Ultra:** qualidade máxima, maior DPR controlado, efeitos refinados, modo OLED completo.

## 5.8 Arquitetura dos modos cinematográficos

### 5.8.1 Stores

```ts
type CinematicStore = {
  mode: CinematicMode
  preset: VisualPreset
  barsState: CinematicBarsState
  wallpaperMode: boolean
  motionIntensity: number
  depthIntensity: number
  setMode: (mode: CinematicMode) => void
  setPreset: (preset: VisualPreset) => void
  toggleWallpaperMode: () => void
}

type MusicVisualStore = {
  currentTrackId: string | null
  currentMood: MusicMood
  palette: MonochromeMusicPalette
  progress: number
  isPlaying: boolean
  scene: VisualScene
}
```

### 5.8.2 CSS variables obrigatórias

```css
:root {
  --cinema-bar-top-height: 72px;
  --cinema-bar-bottom-height: 96px;
  --cinema-bar-opacity: 1;
  --cinema-edge-blur: 18px;
  --cinema-depth-shadow: 0.55;
  --cinema-line-opacity: 0.38;
  --scene-depth-z0: 0;
  --scene-depth-z1: 10;
  --scene-depth-z2: 20;
  --scene-depth-z3: 30;
  --scene-depth-z4: 40;
  --music-reactivity: 0.65;
  --motion-intensity: 0.8;
  --chrome-distortion: 0.32;
  --chrome-speed: 0.5;
}
```

### 5.8.3 Componentes novos

```
<CinematicViewport />
<CinematicBars />
<CinematicBarTop />
<CinematicBarBottom />
<CinematicMetadata />
<CinematicDepthMask />
<OLEDWallpaperMode />
<CinemaView />
<ModeSwitcher />
<VisualPresetSelector />
<MusicMoodProvider />
<QueueDramaLayer />
<TrackTransitionOverlay />
<RoomStageView />
<SystemDiagnosticsOverlay />
```

## 5.9 Regras de implementação das barras

1. **Nunca implementar como detalhe simples.** As barras não são decoração — são parte da identidade principal e devem existir como sistema global dentro do AppShell.
2. **Não esconder conteúdo importante.** As barras devem reservar espaço ou funcionar com layout-aware padding. Nunca cobrir botões críticos sem alternativa.
3. **Responsividade.** Desktop: barras completas, microtextos, metadata, profundidade alta. Tablet: barras médias, menos microtexto, controles simplificados. Mobile: barras menores, foco em player, microtextos mínimos, sem poluição visual.
4. **Safe area.** Usar unidades modernas: `100dvh`, `100dvw`, `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`.

## 5.10 Regras para sensação OLED

### OLED Black real

Em modo OLED: usar preto real `#000000`; evitar grandes áreas brancas fixas; usar branco com cuidado; reduzir intensidade de elementos estáticos; animar levemente elementos persistentes; permitir esconder UI.

### Movimento anti-estático

Para evitar sensação travada e burn-in: deslocar chrome lentamente, mover microtextos quase imperceptivelmente, variar opacidade das linhas, alternar metadados, mover progress com fluidez.

## 5.11 Funcionalidades premium adicionais

- **Personal Visual Profile:** usuário salva tema padrão, preset visual, intensidade de motion, intensidade de barras, modo inicial, mostrar/ocultar microtextos, modo OLED automático, qualidade visual padrão.
- **Auto Cinema Trigger:** entrar automaticamente em Cinema View quando música começa, sala entra em modo live, usuário fica inativo por X segundos, fullscreen é ativado, monitor grande é detectado.
- **Smart Idle:** sem interação por alguns segundos → UI reduz, controles desaparecem, barras assumem protagonismo, player vira visualizer, movimento fica mais elegante. Mouse move ou tecla traz UI de volta.
- **Session Memory:** o Playoff lembra última sala, último modo visual, último preset, última intensidade, último tema, últimas buscas, músicas recentes.
- **Visual Snapshots:** salvar visual atual como snapshot (estado visual no banco/local storage; futuramente exportar imagem). Exemplos: snapshot da música atual, da sala, da fila, do momento vencedor.

## 5.12 Critérios de aceite

O produto só será aceito se ficar claro que é um rebuild completo.

### Critérios visuais

- existe Cinema View funcional
- existe OLED Wallpaper Mode funcional
- existem barras pretas cinematográficas globais
- barras reagem à música, à votação e à troca de faixa
- existe profundidade real entre background, chrome, barras e UI
- hero padrão usa barras cinematográficas
- temas são apenas preto/branco
- chrome liquid tem papel central
- UI não parece dashboard genérico nem player comum
- o produto parece um wallpaper OLED vivo

### Critérios funcionais

- usuário pode alternar modo visual
- usuário pode controlar intensidade visual
- usuário pode ativar modo foco
- usuário pode deixar o site em modo wallpaper
- salas possuem drama visual
- fila possui tensão visual
- troca de música possui transição cinematográfica
- busca funciona dentro do Command Center
- sistema possui diagnóstico visual/técnico

### Critérios técnicos

- WebGL é lazy-loaded
- existe fallback sem WebGL
- existe reduced motion
- existe adaptive performance
- cinematic bars não quebram layout
- Cinema View funciona em desktop e mobile
- OLED Mode não prejudica usabilidade
- motion não bloqueia player, busca ou realtime
- estado visual é centralizado e previsível

---

## 6. Frase final obrigatória

O Playoff antigo não será preservado visualmente.
O novo Playoff deve parecer um produto audiovisual premium, um wallpaper OLED interativo e um sistema musical cinematográfico.
A aplicação inteira deve reagir à música, à sala, à fila, aos votos e ao estado do usuário.
As barras pretas cinematográficas, o chrome liquid, o tema preto/branco e a profundidade visual são requisitos centrais, não detalhes opcionais.
Este rebuild deve provar qualidade de produto, design, engenharia, performance e visão.
