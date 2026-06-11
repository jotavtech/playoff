# PLAYOFF — PRD ADENDO: RADIOLA SYSTEM, CHROMATIC ENGINE & AUDIO VISUALIZER

> **Versão:** 2.0 — Radiola System  
> **Status:** Aprovado para execução  
> **Criado em:** 2026-06-11  
> **Contexto:** Adendo ao PRD principal (docs/PRD.md). Este documento não substitui
> o PRD base — expande as fases 2 a 4 com um conjunto novo de features centrado em
> três pilares: o Disco Radiola (vinil cromado giratório), o Chromatic Engine
> (cores dinâmicas por música) e o Audio Visualizer (barras sincronizadas).

---

## NOTA DO AUTOR

Dois anos de desenvolvimento. Monitoria de front-end avançado no terceiro período.
Já formado.

Este documento vai além de especificar features técnicas — ele define o que o
Playoff deve **sentir** quando alguém o abre. O disco girando, as cores mudando,
as barras pulsando: isso é o Playoff sendo honesto sobre o que sempre foi.
Um sistema musical que vive.

---

## 1. Visão do Sistema Radiola

O Playoff deve ter um objeto central: o **Disco Radiola**. Um vinil cromado 3D que
gira quando a música toca, carrega a capa do álbum como seu rótulo, reflete a luz
como metal real e desacelera quando a faixa pausa — como uma radiola analógica de
verdade, mas renderizada em código.

Este disco não é decoração. É o **estado do player materializado visualmente**. Ele
comunica: está tocando, está pausado, está em transição, está esperando. Sem texto.
Só forma, rotação e luz.

> Referência mental: uma Seeburg 100C de 1952, mas redesenhada para ser feita
> inteiramente de cromo líquido e renderizada em Canvas/WebGL numa tela OLED.

---

## 2. Pilares técnicos

| Pilar | Descrição | API principal |
|---|---|---|
| **Disco Radiola** | Vinil cromado giratório com capa do álbum no centro | CSS 3D + Canvas 2D |
| **Chromatic Engine** | Extração de paleta da capa → cores dinamicamente aplicadas no sistema todo | Canvas 2D sampling |
| **Audio Visualizer** | Barras de frequência sincronizadas com o áudio real | Web Audio API (AnalyserNode) |
| **BPM Reactor** | Velocidade do disco e pulso do visualizer synced ao tempo da música | Spotify audio-features API |
| **Needle Arm** | Braço de toca-discos que pousa e levanta animado | CSS keyframes + Spring physics |
| **Chromatic Themes** | 8 temas novos com variação de cor real baseada na música atual | CSS vars dinâmicas |

---

## 3. Feature 01 — Disco Radiola

### 3.1 Anatomia do disco

O disco é composto por **5 camadas concêntricas**, renderizadas via CSS 3D + Canvas:

```
[ Sombra de contato ]          ← Layer 0: sombra projetada no chão
[ Corpo do vinil ]             ← Layer 1: disco preto/cromado, com ranhuras
[ Reflexo cromático ]          ← Layer 2: lustre metálico girando em sentido oposto
[ Label / Capa do álbum ]      ← Layer 3: imagem centralizada, desaceleração relativa
[ Brilho especular estático ]  ← Layer 4: highlight fixo no topo (não gira com o disco)
```

### 3.2 Estados de rotação

| Estado do player | Comportamento do disco |
|---|---|
| `idle` (sem música) | Disco presente mas estático. Sem ranhuras visíveis. Vácuo cromado. |
| `loading` | Rotação lenta (2rpm), easing linear. Espera ativa. |
| `playing` | Rotação constante (33rpm por padrão). Ranhuras ativas. Reflexo vivo. |
| `paused` | Desaceleração com easing exponencial — como um vinil que perde força. Nunca para abruptamente. |
| `transitioning` | Aceleração + fade cinematográfico. A capa antiga dissolve na nova enquanto o disco gira mais rápido por ~800ms, depois normaliza. |
| `voting-tension` (sala) | Tremor radial leve (2px), saturação do reflexo aumenta. |
| `winner-locked` (sala) | Pulso de flash branco no label + aceleração de 300ms. |

### 3.3 Ranhuras do vinil

As ranhuras (grooves) são renderizadas em Canvas 2D como arcos concêntricos com:
- Espaçamento entre 3–6px dependendo da "faixa" (zona interna = mais apertada)
- Opacidade entre 0.04–0.15 (quanto mais perto do centro, menos visível)
- Cada ranhura é levemente deformada com noise senoidal para parecer analógica
- Animação: as ranhuras "passam" sob o brilho especular estático criando efeito de movimento
- Sem WebGL: ranhuras desabilitadas, mantendo apenas reflexo cromático CSS

### 3.4 Braço (Needle Arm)

O braço é um elemento SVG/CSS posicionado à direita do disco com:
- **Estado `playing`:** braço pousado no disco, ângulo ~25° a partir do centro, ponta tocando o label externo
- **Estado `idle/paused`:** braço levantado, retraído para ~70°, tip no ar
- **Animação de pouso:** Spring physics (tensão 180, fricção 22) — o braço pousa com um pequeníssimo bounce antes de assentar. Duração ~600ms
- **Animação de levantada:** EaseInCubic, 400ms, sem bounce
- Em mobile, o braço é omitido (espaço insuficiente)

### 3.5 Layout e posicionamento

```
┌─────────────────────────────────────────────────┐
│  [  ] PLAYOFF                    LIVE SESSION   │  ← barra top cinematográfica
│                                                  │
│              ┌──────────┐                        │
│              │  DISCO   │  ← centro da tela      │
│              │  VINIL   │     com braço à dir.   │
│              └──────────┘                        │
│                                                  │
│  CHROME REQUIEM                  2:47 / 4:12    │
│  BURIAL · UNTRUE                                 │
│  ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │  ← progress bar
│                                                  │
│  ▁ ▂ ▄ ▃ ▆ ▅ ▇ ▅ ▄ ▂ ▁ ▂ ▄ ▆ ▇ ▆ ▅ ▄ ▂ ▁     │  ← visualizer
│                                                  │
│  [PLAYLIST] [QUEUE] [ROOM] [SEARCH]             │  ← barra bottom
└─────────────────────────────────────────────────┘
```

No **Focus Listening Mode** e **OLED Wallpaper Mode**, o disco ocupa 60–70% da viewport.
No **Hero Mode**, ocupa 30–40%.
Em salas (**Room Live Mode**), o disco fica reduzido (200–240px) no header.

---

## 4. Feature 02 — Chromatic Engine

> "A capa nunca sequestra a identidade. Ela apenas assombra a cena."
> — PRD §5.1.2

O Chromatic Engine **não muda o tema do Playoff para colorido**. Ele extrai a
personalidade cromática da capa e a injeta como fantasma no sistema visual.

### 4.1 Extração de paleta

1. A capa do álbum (64×64px redimensionada) é amostrada via Canvas 2D
2. Extraídos: **cor dominante**, **cor de destaque** (mais saturada), **luminância média**
3. Calculado: **temperatura** (quente/fria) e **intensidade** (alta/baixa)
4. Produzido: 3 tokens cromáticos:
   - `--music-accent`: cor do destaque, aplicada em barras de progresso, bordas, barras do visualizer
   - `--music-glow`: versão com 25% de opacidade, aplicada como halo no disco e sombra do player
   - `--music-bg-tint`: versão com 4% de opacidade, aplicada como tint levíssimo no background

### 4.2 Tokens CSS afetados

```css
/* Progress bar */
.progress-fill { background: var(--music-accent); }

/* Disco: reflexo cromático */
.disc__chrome { background: conic-gradient(from 0deg, var(--music-accent, #f2f2f2), ...); }

/* Halo do disco */
.disc__glow { box-shadow: 0 0 80px 20px var(--music-glow, transparent); }

/* Barras do visualizer */
.visualizer__bar { background: var(--music-accent); }

/* Background atmosférico */
.cinematic-viewport { background-color: var(--music-bg-tint, transparent); }
```

### 4.3 Transição cromática

- Toda mudança de `--music-accent` usa `transition: all 1.8s var(--ease-liquid)`
- Quando a música muda, os tokens fazem crossfade suave — nunca um snap abrupto
- Se a luminância da cor extraída for > 0.85 (cor quase branca), `--music-accent` usa
  `rgba(242, 242, 242, 0.8)` como fallback para manter legibilidade

### 4.4 Intensidade cromática por preset

| Preset visual | Intensidade dos tokens |
|---|---|
| `oled-wallpaper` | 100% — máxima expressão da cor |
| `cinema` | 70% — cor presente mas subordinada ao preto |
| `editorial` | 40% — apenas accent na progress bar |
| `minimal-player` | 20% — só o halo do disco |
| `room-stage` | 80% — sala precisa de vida visual |

### 4.5 Aberração cromática reativa

Quando o Chromatic Engine detecta alta tensão (votação acirrada em sala ou beat forte),
aplica um efeito de **aberração cromática** sobre o disco e o título da música:
- CSS `text-shadow` em vermelho/ciano deslocados por 1–3px
- Duração: 80ms a cada beat (ou cada voto em sala)
- Controlado por `--motion-intensity` — desabilita se `prefers-reduced-motion`

---

## 5. Feature 03 — Audio Visualizer

### 5.1 Filosofia

O visualizer é **FXSound-style**: barras verticais simétricas, centradas, com glow
colorido, reagindo às frequências do áudio em tempo real. Não é decoração —
é o áudio visível. Se o Chromatic Engine dá cor ao sistema, o visualizer dá **pulso**.

### 5.2 Arquitetura técnica

```
Spotify Web Playback SDK → AudioContext → MediaElementSourceNode
                                       → AnalyserNode (FFT 2048)
                                       → Destination (saída de áudio)
                                          ↓
                                    Float32Array (frequencyData)
                                          ↓
                              requestAnimationFrame loop
                                          ↓
                              Smooth via lerp (α = 0.18)
                                          ↓
                               CSS custom props → barras
```

**Fallback por tier:**
- `ultra/high`: Web Audio API real, 64 barras, animação nativa a 60fps
- `medium`: Web Audio API real, 32 barras, animação via CSS vars a 30fps
- `low`: Simulação baseada em `currentTime` progress + amplitude senoidal, 16 barras
- `reduced-motion`: barras estáticas com altura proporcional ao volume médio da faixa

### 5.3 Layout das barras

```
         █
       █ █ █
     █ █ █ █ █
   █ █ █ █ █ █ █
█ █ █ █ █ █ █ █ █ █
─────────────────────
```

- **32–64 barras** dispostas em simetria bilateral (espelhadas no centro)
- Altura máxima: 64px (player), 120px (focus/wallpaper mode)
- Largura de cada barra: `max(2px, containerWidth / barCount - 1px)`
- Corner radius: 2px no topo
- Gap entre barras: 1px
- Cor: `var(--music-accent)` com `opacity: 0.8`
- Glow: `filter: drop-shadow(0 0 4px var(--music-accent))`

### 5.4 Mapeamento de frequências

Não usar linear — usar **escala logarítmica** (como o ouvido humano):
- Sub-bass (20–60Hz) → 4 primeiras barras externas (mais baixas visualmente)
- Bass (60–250Hz) → barras 5–12
- Mid (250–2000Hz) → barras 13–20 (geralmente as mais altas)
- High-mid (2000–8000Hz) → barras 21–27
- Presence/Air (8000–20000Hz) → últimas barras (mais finas)

### 5.5 Reatividade por modo

| Modo | Visualizer |
|---|---|
| `hero` | Desabilitado. Só o chrome liquid reage. |
| `focus` | Barras em altura máxima (120px), abaixo do disco, centrado |
| `oled-wallpaper` | Barras de 80px, na barra inferior, espalhadas por toda largura |
| `room-live` | Barras compactas (40px) no header da sala, reativas a todos os usuários |
| `voting-tension` | Velocidade das barras aumenta 30% (urgência) |

### 5.6 Beat Detection

Detectar pico de energia na faixa de bass para **beat detection** leve:
- Comparar energia atual com média dos últimos 43 frames (~700ms a 60fps)
- Se energia atual > média × 1.4: emitir evento `beat`
- Evento `beat` aciona: micro-pulso no disco (+1.5% scale por 80ms), micro-pulso nos
  participantes da sala, aberração cromática se intensidade > 0.6

---

## 6. Feature 04 — BPM Reactor

O **BPM** define o ritmo do sistema visual inteiro.

### 6.1 Fonte de BPM

1. **Spotify Audio Features API** (`/audio-features/{id}`) → `tempo` em BPM
2. Se não disponível: detecção leve por beat detection (Feature 03 §5.6) → BPM estimado
3. Fallback: 120 BPM (comportamento neutro)

### 6.2 O que o BPM controla

| BPM | Velocidade do disco | Chrome speed | Motion intensity |
|---|---|---|---|
| < 80 | 28rpm | 0.6 | 0.5 (ambient, lento) |
| 80–120 | 33rpm | 0.9 | 0.75 (neutro) |
| 120–150 | 38rpm | 1.2 | 0.9 (energético) |
| > 150 | 45rpm | 1.6 | 1.0 (máximo) |

CSS: `--disc-rpm` e `--chrome-speed` ajustados via JS → `animation-duration` calculado

### 6.3 Transição de BPM

Quando a música muda, a velocidade do disco **não pula** — faz crossfade de 2 segundos
para o novo RPM, como um motor ajustando rotação.

---

## 7. Feature 05 — Vinyl Modes (prévia futura)

> Planejado para v2.1 — especificado agora para não criar dívida de arquitetura.

### 7.1 Vinyl Flip

Quando `nextTrack()` é chamado, o disco executa uma animação de **flip em 3D**
(rotateY 180°) revelando o "lado B" — enquanto a nova capa aparece. Duração: 700ms.

### 7.2 Vinyl Color Variants

Ao invés do vinil sempre preto, a cor base do vinil muda com o humor da música:
- `nocturnal`: vinil quase preto com reflexo roxo frio
- `bright`: vinil translúcido com reflexo dourado
- `heavy`: vinil preto fosco com reflexo vermelho escuro
- `minimal`: vinil branco marmorizado

### 7.3 Scratching (Easter Egg)

Drag horizontal sobre o disco → scratch sound + velocidade negativa momentânea.
Requer Web Audio API e `AudioBufferSourceNode`. Oculto, sem UI — descoberta orgânica.

---

## 8. Feature 06 — Redesign do Player (integrado ao Disco)

O player atual (barras, progress, metadata) é redesenhado para **orbitar o disco**.

### 8.1 Novo layout do player

```
                    ←── NEEDLE ARM ──→
              ┌─────────────────────┐
              │    [ALBUM COVER]    │   ← label do disco (centro)
              │       DISCO         │
              │      (girando)      │
              └─────────────────────┘

  CHROME REQUIEM                          4:12
  BURIAL · UNTRUE                      EXPLICIT

  ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░  2:47

     ▁▂▄▃▆▅▇▅▄▂▁▂▄▆▇▆▅▄▂▁▂▄▃▆▅▇▅▄▂▁
               VISUALIZER

     [  ◀◀  ]  [  ▶▶  ]  [  ⌘K  ]
```

### 8.2 Tamanhos do disco por contexto

| Contexto | Diâmetro | Nota |
|---|---|---|
| Hero Mode | 280–320px | Com braço completo |
| Focus Mode | 360–400px | Destaque total |
| OLED Wallpaper | 440–500px | Máximo impacto visual |
| Room Live (header) | 160–200px | Compacto, sem braço |
| Mobile (< 480px) | 220–260px | Sem braço, sem glow externo |

---

## 9. Feature 07 — Sala com Disco Compartilhado

Em `Room Live Mode`, o disco do player é **compartilhado visualmente** entre todos.

### 9.1 Comportamento

- Todos os participantes veem o mesmo disco girando (sincronizado via WebSocket)
- Quando alguém vota: micro-tremor no disco sincronizado para todos
- Quando a faixa vencedora é eleita: disco acelera por 400ms, flash no label
- A capa do álbum da música em votação **não entra no disco ainda** — entra só quando
  `nextTrack()` é chamado (transição cinematográfica para todos)

### 9.2 Mensagens WebSocket adicionadas

```typescript
// cliente → servidor
{ type: 'beat_sync'; payload: { energy: number } }  // beat detector local

// servidor → todos
{ type: 'disc_pulse'; payload: { energy: number; at: number } }  // broadcast de beat
{ type: 'disc_flip';  payload: { newTrack: TrackRef } }          // virada de música
```

---

## 10. Feature 08 — Novas ideias (sugestão expandida)

### 10.1 Aura Mode

O Playoff detecta quando o usuário está **completamente parado** (sem hover, sem clique,
sem toque) por mais de 20 segundos. Entra no **Aura Mode**:

- A UI desaparece completamente
- O disco cresce para 90vmin ocupando quase toda a tela
- As barras do visualizer se expandem para o perímetro do disco como raios
- A cor da música domina toda a tela em opacidade 8%
- Qualquer interação encerra o Aura Mode com transição rápida (300ms)

Objetivo: deixar o Playoff aberto enquanto trabalha e olhar para a tela ocasionalmente
para ver algo bonito que conta o estado da música.

### 10.2 Mood Timeline

Uma linha do tempo visual da sessão, acessível via botão no header.

```
─●─────────────────────────────────────────────────────●─
 BURIAL                                              JAMIE XX
 nocturnal                                            bright
 ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░████████████
 dark                                              energetic
```

Cada faixa tocada é um ponto na timeline com:
- Cor baseada no mood (extraída do Chromatic Engine)
- Altura do ponto baseada na energia (BPM × votos)
- Tooltip com título, artista, votos e horário
- Clicável para ver o contexto de votação naquele momento

### 10.3 Signal Constellation (Sala)

Substituir a lista linear de participantes por uma **constelação**:
- Cada participante é um ponto de luz (círculo 8px)
- Posições calculadas em órbita do disco central
- Quando um participante vota: o ponto pulsa e uma linha fina conecta-o ao disco
  por 600ms
- Participantes novos entram com animação de fade-in do fundo escuro
- Participantes que saem: o ponto vai se apagando por 2s antes de sumir

### 10.4 Queue Tension Meter

Uma barra vertical à esquerda da fila que mede a tensão atual:
- Cresce com a proximidade entre votos do 1º e 2º colocados
- Cor varia: branco (calma) → ciano → vermelho-escuro (máxima tensão)
- Quando atinge 100%: a barra pulsa, o disco treme, texto "DEAD HEAT" aparece em microtype

### 10.5 Personal Signal Card

Ao final de cada sessão (junto com o Session Recap), o usuário recebe um
**Signal Card** pessoal — diferente do poster da sala:

- Mostra apenas suas contribuições: músicas que você adicionou, votos que você deu
- Sua faixa com mais votos na sessão
- Quantas vezes você votou no vencedor
- Horário de entrada e saída
- Fundo: a cor dominante das suas músicas adicionadas

Exportável como PNG 1080×1080 (formato quadrado, ideal para Instagram).

### 10.6 Remix Mode (prévia futura)

Um modo onde o usuário pode reorganizar manualmente a fila e propor uma "versão remix
da sessão" — uma playlist diferente, com as mesmas músicas em outra ordem.
Exporta como link Spotify ou arquivo `.m3u`.

### 10.7 Spotify DJ Mode (prévia futura)

Integrar com a **Spotify DJ feature** (onde disponível):
- Quando ativado, transições entre músicas são geradas pelo DJ da Spotify
- O disco faz animação de crossfade (dois discos se dissolvendo)
- Requer conta Premium com acesso ao DJ Mode na API

### 10.8 Live Lyrics Layer

Buscar letras via **Spotify Lyrics API** (ou Genius como fallback) e exibi-las
no Layer 06 (content), centralizadas abaixo do disco, com timing sincronizado:
- Linha atual em `color: var(--ink)` tamanho 22px
- Linhas adjacentes em `color: var(--ink-dim)` tamanho 16px
- Transição: fade cross com translateY(−8px)
- Configurável: on/off, tamanho, posição

### 10.9 Spatial Audio Indicator

Quando a faixa tem suporte a Spatial Audio (Dolby Atmos / Sony 360RA via Spotify):
- Ícone minimalista no player (círculo com ondas radiais)
- O disco ganha um segundo anel de rotação externo, mais lento, em sentido contrário
- O halo do disco (music-glow) pulsa levemente em elipse ao invés de círculo uniforme

---

## 11. Arquitetura técnica — novos componentes

### 11.1 Componentes novos

| Componente | Propósito |
|---|---|
| `VinylDisc.vue` | Disco principal — estados, rotação, canvas de ranhuras, braço |
| `VinylArm.vue` | Braço SVG com animação de pouso/levantada |
| `AudioVisualizer.vue` | Container das barras + Web Audio connection |
| `VisualizerBar.vue` | Barra individual com transição suave |
| `ChromaticEngine.vue` | Componente lógico (renderless) — extrai paleta, seta tokens CSS |
| `AuraMode.vue` | Overlay do Aura Mode com idle detection |
| `MoodTimeline.vue` | Timeline da sessão com pontos por mood |
| `SignalConstellation.vue` | Constelação de participantes em sala |
| `QueueTensionMeter.vue` | Barra de tensão lateral |
| `SignalCard.vue` | Cartão pessoal do usuário pós-sessão |

### 11.2 Composables novos

| Composable | Propósito |
|---|---|
| `useVinylPhysics.ts` | RPM atual, transição de velocidade, easing de pausa |
| `useAudioAnalyser.ts` | Cria AnalyserNode, retorna `frequencyData` reativo |
| `useBeatDetector.ts` | Beat detection sobre frequencyData |
| `useBpmSync.ts` | Busca BPM via Spotify Audio Features, expõe `currentBpm` |
| `useChromaticEngine.ts` | Extrai paleta, seta CSS vars, gerencia transição |
| `useAuraMode.ts` | Idle detection (20s), entra/sai do Aura Mode |
| `useSignalCard.ts` | Agrega dados pessoais da sessão para o Signal Card |

### 11.3 Store: `musicVisual.ts` — novos campos

```typescript
// Adicionar ao MusicVisualStore existente:
bpm: number                    // BPM atual (0 = desconhecido)
musicalKey: string | null      // Tonalidade (C, D, Am, etc.)
audioFeatures: SpotifyAudioFeatures | null

// Chromatic Engine
musicAccent: string            // Hex/rgba extraído da capa
musicGlow: string
musicBgTint: string
chromaticIntensity: number     // 0–1, controlado pelo preset ativo

// Visualizer
analyserNode: AnalyserNode | null
frequencyData: Float32Array | null
beatActive: boolean            // true por 80ms a cada beat detectado
```

### 11.4 Server: novos campos no WebSocket

```typescript
// WsServerMsg — adicionar ao union type existente:
| { type: 'disc_pulse'; payload: { energy: number; at: number } }
| { type: 'disc_flip';  payload: { newTrack: TrackRef } }

// WsClientMsg — adicionar ao union type existente:
| { type: 'beat_sync'; payload: { energy: number } }
```

---

## 12. Fases de execução (atualizado)

| Fase | Escopo | Prioridade |
|---|---|---|
| **5.1** | VinylDisc.vue + VinylArm.vue + useVinylPhysics.ts + integração no player | ALTA |
| **5.2** | ChromaticEngine.vue + useChromaticEngine.ts + tokens CSS + transição | ALTA |
| **5.3** | AudioVisualizer.vue + useAudioAnalyser.ts + Web Audio API | ALTA |
| **5.4** | useBpmSync.ts + BPM Reactor (velocidade dinâmica do disco) | MÉDIA |
| **5.5** | Sala: disc_pulse/disc_flip WebSocket + Signal Constellation | MÉDIA |
| **5.6** | Aura Mode + useAuraMode.ts | BAIXA |
| **5.7** | Mood Timeline + Queue Tension Meter | BAIXA |
| **5.8** | Signal Card pessoal | BAIXA |
| **5.9** | Live Lyrics Layer | BAIXA |
| **5.10** | Vinyl Modes (Flip, Color Variants, Scratch easter egg) | FUTURA |
| **5.11** | DJ Mode + Spatial Audio Indicator | FUTURA |

---

## 13. Critérios de aceitação (features principais)

### Disco Radiola
- [ ] Disco visível em todos os modos (Hero, Focus, OLED, Room)
- [ ] Rotação contínua no estado `playing`
- [ ] Desaceleração realista no `paused` (easing exponencial, nunca para abrupt)
- [ ] Capa do álbum no center como label
- [ ] Braço desce/sobe animado (desktop)
- [ ] Ranhuras visíveis com Canvas 2D (tier high/ultra)
- [ ] Reflexo cromático no layer do disco
- [ ] Transição de capa ao mudar música (600–800ms crossfade)

### Chromatic Engine
- [ ] Paleta extraída para cada nova música
- [ ] `--music-accent`, `--music-glow`, `--music-bg-tint` setados corretamente
- [ ] Progress bar usa `--music-accent`
- [ ] Halo do disco usa `--music-glow`
- [ ] Background tem tint atmosférico `--music-bg-tint`
- [ ] Transição entre cores dura 1.8s (não snap)
- [ ] Fallback gracioso quando capa não está disponível

### Audio Visualizer
- [ ] Barras reagindo ao áudio em tempo real (Web Audio API)
- [ ] Fallback animado quando Web Audio não disponível
- [ ] 32+ barras em simetria bilateral
- [ ] Cor das barras segue `--music-accent`
- [ ] Glow nas barras via `drop-shadow`
- [ ] Desabilitado com `prefers-reduced-motion`
- [ ] Funciona nos modos Focus e OLED Wallpaper

---

## 14. Restrições e limites

- O Chromatic Engine **não** transforma o Playoff em tema colorido. Os tokens são
  aplicados APENAS nos elementos listados em §4.2. O fundo continua preto/branco.
- O Web Audio API pode ser **bloqueado por autoplay policy**. Sempre obter
  AudioContext em resposta a interação do usuário (primeiro play).
- Ranhuras Canvas2D são **desabilitadas** em tiers `low` e `medium` para performance.
- O braço SVG é **omitido em mobile** (viewport < 480px).
- BPM via Spotify Audio Features exige uma chamada adicional à API — cachear o
  resultado por `track.id` para não refazer a cada play.
- `beat_sync` WebSocket é **throttled** a 8 eventos/segundo para não sobrecarregar
  clientes em salas grandes.

---

*PRD RADIOLA SYSTEM — PLAYOFF v2.0*  
*O disco gira. A cor muda. As barras pulsam. Isso é o Playoff sendo honesto sobre o que sempre foi.*
