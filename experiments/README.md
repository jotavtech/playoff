# UNDER SCIENCE · Experimental Lab

Um caderno de protótipos de áudio-visual reativo no universo monocromático/cinematográfico.
**Não fazem parte do app Playoff** — são fagulhas soltas pra gerar ideias pro futuro.
Tudo roda 100% no navegador, sem build e sem dependências.

## Como abrir

```bash
# direto no navegador
open experiments/index.html        # macOS
xdg-open experiments/index.html    # linux

# ou servindo a pasta (recomendado p/ fontes e save de PNG)
npx serve experiments
```

> Como o Nuxt serve `public/` na raiz, o `00 · Resonance Chamber` também abre em
> `http://localhost:3000/resonator.html` durante `npm run dev`.

## Os experimentos

| # | Nome | Ideia | Interação |
|---|------|-------|-----------|
| 00 | **Resonance Chamber** (`../public/resonator.html`) | Instrumento polifônico: drone supersaw + sub, plucks, reverb por convolução, delay ping-pong, arpejador generativo, gravador de loop | mover/click · teclado Z–M & A–L · 1–6 specimens · space=arp · R=rec |
| 01 | **Cinematic Bars** | Barras de letterbox que respiram com um sinal de energia; 4 humores cinematográficos | space=nova cena · click=pulso |
| 02 | **Liquid Chrome** | Fluido metálico monocromático (metaballs) com shading "chrome" e luz móvel — vibe wallpaper OLED | mover=atrai · click=adiciona orb |
| 03 | **Flow Field** | Milhares de partículas advectadas por campo de ruído; música como vento | mover=perturba · click=vórtice · 1–4 paletas |
| 04 | **Poster Generator** | One-sheets cinematográficos generativos com RNG semeado + export PNG | space=gerar · botão Save PNG |

## Onde isso encosta no Playoff (só referência de ideias)

- **Cinematic Bars** → protótipo direto da *CinematicBarsEngine* / barras pretas reativas.
- **Liquid Chrome** → estudo do *chrome liquid* monocromático do OLED Wallpaper Mode.
- **Poster Generator** → sketch do *Room Poster Generator* (fase 4).
- **Resonance Chamber / Flow Field** → como "sinal/música vira movimento" — base p/ Music Mood Mapping.

## Próximas direções possíveis

- Trocar o canvas2d por **WebGL/shaders** (bloom real, feedback, 100k+ partículas).
- **Áudio real** alimentando os visuais (mic ou Web Audio analyser compartilhado).
- **Export de vídeo/WebM** das cenas, não só PNG.
- **MIDI / teclado físico** no Resonance Chamber.
- Um **sequenciador por passos** ligando todos numa só timeline.
