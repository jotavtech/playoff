# PRD — v5

> **Versão:** 5.0 — Mudança de premissa
> **Status:** Rascunho para execução
> **Substitui:** `docs/PRD.md` v1.0 (Rebuild Total / Cinematic Modes), que fica no git history como referência de domínio e de erro.

---

## 0. Por que este documento existe

O PRD v1 decidiu a estética antes de decidir quem abre o app. Ele especificou sete modos cinematográficos, oito temas monocromáticos e um sistema de barras em cinco camadas — e nenhum critério de aceite que verificasse se o produto funcionava. Dos nove critérios "funcionais", sete eram critérios visuais fantasiados.

Ele também prometia reatividade à música sobre uma API que não entrega áudio. O "Music Mood Mapping" inferia clima de **capa de álbum e popularidade** porque o Spotify não deixava ouvir nada.

Este documento inverte as duas coisas: define o usuário e o sinal primeiro, e trata visual como consequência.

**Regra suprema:** nenhum requisito estético entra aqui sem uma restrição funcional que o justifique.

---

## 1. O que é

Um instrumento pessoal de escuta. Duas superfícies sobre uma base comum de dados que o próprio sistema acumula ao longo do tempo.

- **LIVE** — o que está tocando agora, como sinal visual.
- **ARCHIVE** — o que eu ouvi ao longo dos meses, como material explorável.

**Audiência: uma pessoa.** Isto é hobby declarado. Não tem usuário-alvo, não tem monetização, não tem crescimento. O critério de sucesso é: eu abro isso com vontade, e continua verdade daqui a seis meses.

Essa restrição é libertadora, não limitante. Ela autoriza especificidade — cruzamentos esquisitos, métricas que só fazem sentido pra mim, decisões que um produto teria que diluir.

### 1.1 Nome

"Playoff" descrevia votação e disputa. Nenhuma das duas superfícies é competitiva. O nome está errado e a renomeação fica em aberto — não bloqueia execução.

---

## 2. Quem abre, quando, e por quê

Esta seção não existia no v1. É a mais importante deste documento.

### Sessão A — Ambiente

Estou no computador fazendo outra coisa. Música tocando. A LIVE está no segundo monitor ou em fullscreen atrás. Olho pra ela de relance, a metros de distância, algumas vezes por hora.

Requisitos que isso impõe: legível a distância, sem elementos que exijam leitura, seguro pra ficar horas ligado (OLED, temperatura de GPU), zero interação obrigatória, movimento contínuo mas não chamativo.

### Sessão B — Escavação

Sento com intenção de olhar o próprio histórico. Perto da tela, mouse na mão, dez a trinta minutos, seguindo curiosidade. Ocasionalmente mostro pra alguém.

Requisitos que isso impõe: densidade alta de informação, tipografia pequena e precisa, navegação por filtro e recorte, respostas rápidas a perguntas específicas.

### 2.1 Consequência

**As duas sessões são opostas em quase tudo.** Distância, densidade, interação, duração.

Elas compartilham tokens (cor, tipo, grid) e nada mais. Tentar unificá-las num único sistema visual foi exatamente o erro do v1 — o "wallpaper com produto por cima" era a Sessão A engolindo a Sessão B.

---

## 3. A espinha: o coletor

**Sem isto, nada do resto vale.**

O endpoint `/me/player/recently-played` devolve apenas os últimos 50 itens. Não existe API de histórico completo. Então: ou algo está coletando continuamente desde hoje, ou o ARCHIVE não tem substrato e nunca terá.

Isso tem duas consequências duras:

1. **O projeto começa a ter valor semanas depois de começar a rodar.** O coletor precisa estar de pé antes de qualquer pixel.
2. **Cada dia sem coletor é dado perdido pra sempre.** Não dá pra recuperar depois.

O coletor é um processo separado do site. Ele faz poll em `/me/player` a cada ~20 segundos, escreve eventos, e não tem interface.

### 3.1 Por que 20 segundos e não 60

Para detectar **skip**. Se o poll for esparso demais, uma faixa curta pode entrar e sair entre duas amostras e vira uma faixa "completa" no histórico — ou some. Vinte segundos dá resolução suficiente pra saber onde a faixa foi interrompida.

Skip é a informação mais valiosa que este sistema coleta e a que nenhuma ferramenta pronta te dá. O Spotify não expõe. `recently-played` não distingue faixa ouvida inteira de faixa abandonada em 4 segundos. Só quem faz poll do progresso sabe.

### 3.2 Onde ele roda

Vercel Cron no plano hobby não desce a 20 segundos. Opções, em ordem de recomendação:

| Onde | Prós | Contras |
|---|---|---|
| Timer systemd na máquina local | Grátis, controle total, terreno conhecido | Só coleta com a máquina ligada |
| VPS mínimo | Sempre de pé | Custo mensal, mais uma coisa pra manter |
| Cloudflare Worker + Cron | Grátis, sempre de pé | Piso de 1 minuto — perde skips curtos |

**Decisão:** começar com systemd local. A máquina fica ligada durante as horas em que eu de fato escuto música, então o buraco de cobertura é pequeno. Migrar pra VPS se o buraco incomodar.

O banco precisa ser acessível de fora (o site em Vercel lê dele): Postgres gerenciado em free tier.

---

## 4. Estados de capacidade

Existe uma incógnita não resolvida: o client ID antigo (projeto de faculdade, pré-novembro/2024) tem ou não acesso a `audio-features` e `audio-analysis`?

O grandfathering exige extensão de quota concedida ou pendente antes de 27/11/2024. App de faculdade quase certamente ficou em Development Mode e nunca teve. **Hipótese de trabalho: não tem.**

### 4.1 Isto não pode bloquear o projeto

O sistema define uma **fonte de sinal** abstrata com duas implementações e escolhe em runtime:

```
type SignalSource = 'spotify-analysis' | 'room-mic' | 'none'

type Signal = {
  bands: Float32Array   // energia por banda de frequência
  level: number         // 0..1
  beat: boolean         // onset detectado neste frame
  bpm: number | null
  confidence: number    // 0..1 — quanto confiar no que veio acima
}
```

- **`spotify-analysis`** — só se o probe passar. Dá grade de beats, seções e vetores de timbre por segmento. Precisão temporal alta, mas é dado pré-calculado: descreve a gravação, não o que está saindo pela caixa.
- **`room-mic`** — `getUserMedia` → `AnalyserNode`. Sempre disponível. Latência de 50–100ms. Captura a acústica real do cômodo, incluindo conversa e o grave batendo na parede. Exige permissão e alto-falante (não funciona com fone).
- **`none`** — sem sinal. Tudo cai pra animação derivada só de `progress_ms`. Precisa ser aceitável, não degradado feio.

### 4.2 Probe

Passo zero da execução, antes de escrever qualquer código de produto:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  https://api.spotify.com/v1/audio-features/11dFghVXANMlKmJXsNCbNl
```

`200` → `spotify-analysis` disponível, registrar no `.env` e usar como fonte primária com mic como complemento.
`403` → seguir só com mic. **Nada no restante deste PRD muda.**

Verificar também o changelog de julho/2026 da Web API, que é posterior ao levantamento que originou este documento.

---

## 5. Modelo de dados

Eventos são a fonte da verdade. Toda métrica é derivada, nada é agregado na escrita.

```sql
-- escrito pelo coletor, append-only
play_event (
  id            bigserial primary key,
  observed_at   timestamptz not null,
  track_id      text not null,
  track_name    text not null,
  artist_ids    text[] not null,
  artist_names  text[] not null,
  album_id      text,
  duration_ms   int not null,
  progress_ms   int not null,
  is_playing    bool not null,
  device_type   text,
  context_uri   text,          -- playlist / album / artist de origem
  shuffle       bool,
  repeat_state  text
)

-- derivada por job, reconstruível a partir de play_event
listen (
  id             bigserial primary key,
  track_id       text not null,
  started_at     timestamptz not null,
  ended_at       timestamptz not null,
  duration_ms    int not null,
  listened_ms    int not null,
  completion     real not null,   -- listened_ms / duration_ms
  outcome        text not null,   -- 'completed' | 'skipped' | 'interrupted'
  device_type    text,
  context_uri    text
)
```

`listen` é cache. Se a lógica de derivação mudar, apaga e recalcula de `play_event`. Nunca o contrário.

Nota deliberada: **não existe store visual no modelo de dados.** O v1 tinha `CinematicStore` e `MusicVisualStore` como as duas únicas estruturas tipadas e nenhuma estrutura de domínio.

---

## 6. O que torna isso interessante

Métricas que só existem porque eu acumulo, e que nenhum serviço pronto entrega. Esta lista é o produto.

**Curva de decaimento.** Toda música descoberta tem uma curva de frequência de escuta ao longo das semanas. Umas caem a zero em 10 dias, outras estabilizam num platô baixo e ficam anos. **As de platô são as favoritas reais** — e nunca aparecem num top 50, que é dominado pelo pico recente.

**Abandono.** Artistas que dominaram três meses atrás e hoje estão em zero. Invisível em qualquer ranking, porque ranking mostra presença, não ausência.

**Reentrada.** Música que sumiu por um ano e voltou. Emocionalmente o dado mais interessante do conjunto, e literalmente impossível de obter sem histórico próprio.

**Assinatura de skip.** Onde eu abandono. Existe faixa que eu sempre pulo no mesmo ponto — normalmente uma que eu acho que gosto e não gosto. O sistema sabe antes de mim.

**Impressão digital de horário.** Distribuição de escuta por hora do dia, por artista. O que é música das 3h e o que é música das 15h.

**Forma de sessão.** Uma sessão de escuta tem trajetória: energia inicial, deriva, ponto onde a taxa de skip dispara (que costuma ser o ponto onde eu perdi o foco no trabalho).

**Fidelidade de contexto.** `context_uri` diz de onde a faixa veio. Quanto da minha escuta é playlist minha, playlist do Spotify, álbum inteiro, ou avulsa. Se a resposta for "quase tudo algoritmo", isso é um fato desconfortável e vale saber.

---

## 7. As duas superfícies

### 7.1 LIVE

**Uma tela. Sem navegação.**

Mostra: faixa atual, artista, posição na faixa, e o sinal visualizado.

Regras derivadas da Sessão A:
- Tipografia legível a 2–3 metros.
- Preto real em áreas grandes, elementos persistentes com deriva lenta (burn-in é problema real numa tela que fica 8h aberta).
- Frame budget de 8ms. Se cair disso, reduzir qualidade automaticamente — a tela não pode esquentar a máquina enquanto eu trabalho.
- `prefers-reduced-motion` respeitado.
- Sem controles visíveis em repouso. Aparecem no mouse move.
- Um único dado do ARCHIVE, discreto: **quantas vezes eu já ouvi isto, e quando foi a primeira.** É o gancho entre as duas superfícies e a coisa que nenhum player mostra.

### 7.2 ARCHIVE

**Denso. Perto da tela. Feito pra vasculhar.**

Estrutura mínima: uma linha do tempo navegável, e a partir dela recortes por artista, faixa, hora do dia, contexto.

Regras derivadas da Sessão B:
- Informação por pixel alta. Aqui tabela é boa, gráfico pequeno é bom, texto pequeno é bom.
- Toda visualização precisa responder a uma pergunta nomeável. Se eu não consigo escrever a pergunta, o gráfico sai.
- Filtro sempre visível, estado do filtro na URL.
- Nada de animação de entrada. Latência percebida importa mais que transição.

---

## 8. Direção visual

Colocada de propósito depois das seções 2 a 7, e derivada delas.

**Referência funcional: instrumento científico.** Painel de leitura, osciloscópio, sismógrafo, carta astronômica. Não é escolha de gosto — é a família visual que resolve "série temporal densa com sinal em tempo real ao lado". Que ela também coincida com Space Mono, quase-preto e acento elétrico é conveniência, não justificativa.

- **Tokens compartilhados:** escala tipográfica, grid, cor, espaçamento.
- **Nada além disso é compartilhado.** LIVE é sinal; ARCHIVE é leitura.
- **Cor:** base quase-preta, um único acento. Cor derivada da capa entra no LIVE como influência sutil, nunca sequestrando a identidade — este era um bom instinto do v1 e fica.
- **Movimento:** no LIVE, todo movimento vem de `Signal`. Se `confidence` for baixa, o movimento diminui em vez de fingir. **Nada anima com dado inventado.**

### 8.1 Anti-requisitos

Explicitamente mortos do v1: barras cinematográficas globais, sete Cinematic Modes, oito temas monocromáticos, chrome liquid como protagonista, Command Center, Voting Tension Mode, Queue Drama System, Room Poster Generator, System Diagnostics como feature de portfólio, e a regra de preto-e-branco absoluto.

Alguns eram bonitos. Nenhum servia a uma das duas sessões.

---

## 9. Stack

Reaproveitar o que já está de pé:

| Camada | Decisão |
|---|---|
| Site | Nuxt 3 + TypeScript (já existe, funciona, fica) |
| Coletor | Script Node standalone + timer systemd. **Não** é rota do Nuxt. |
| Banco | Postgres gerenciado, free tier |
| Auth | Authorization Code + refresh token, um usuário só |
| Sinal | Web Audio API nativa; sem Three.js até provar necessidade |
| Deploy | Vercel para o site; coletor fora |

Sem WebSocket: não há multiusuário. Sem Pinia se o estado couber em composables — o v1 tinha duas stores globais para estado que era só visual.

---

## 10. Critérios de aceite

Todos verificáveis. Se não dá pra falhar, não é critério.

**Coletor**
- Roda 7 dias sem intervenção manual.
- Não perde nenhuma faixa ouvida com a máquina ligada — validado contra o histórico do app do Spotify.
- Detecta skip corretamente em ao menos 9 de 10 casos testados à mão.
- Reinicia sozinho após queda e não duplica eventos.

**Archive**
- Respondo "qual música sumiu por meses e voltou" sem escrever SQL.
- Respondo "o que eu ouvia em março e não ouço mais".
- Primeira pintura útil em menos de 1,5s com 6 meses de dados.

**Live**
- 8 horas aberto sem degradação de framerate e sem esquentar a GPU de forma perceptível.
- Com `403` no probe, continua funcionando via mic sem nenhuma mudança de código de produto.
- Sem mic e sem analysis, ainda é agradável de olhar.

**Global**
- Seis meses depois, ainda abro por vontade e não por obrigação. Único critério que importa de verdade, e o único que não dá pra automatizar.

---

## 11. Fases

Invertidas em relação ao v1 de propósito. Lá, a cenografia era a Fase 1 e o loop central do produto era a Fase 3.

**Fase 0 — Probe.** Rodar o curl. Confirmar Premium. Confirmar que o auth do app antigo ainda funciona. Ler o changelog de julho/2026. *Meia hora.*

**Fase 1 — Coletor.** Script, schema, timer, banco. **Zero interface.** Nada pra mostrar pra ninguém no fim desta fase, e é esse o ponto: a partir daqui o relógio está correndo e o dado está entrando.

**Fase 2 — Archive mínimo.** Uma tela, uma pergunta respondida bem. Provavelmente a linha do tempo com decaimento. Sem gráfico que eu não saiba nomear.

**Fase 3 — Live.** Só depois que existir dado real acumulado pra calibrar contra. O v1 calibrou estados visuais contra um `Simulate signal` inventado; quando o dado real chegasse, a calibragem estaria errada e o sistema já seria estrutural.

**Fase 4 — O que ficar interessante.** Deliberadamente indefinida. É hobby: a Fase 4 se decide depois de conviver com as fases 1 a 3.

---

## 12. Não-objetivos

- Não é produto. Não tem outro usuário além de mim.
- Não é multiusuário, não tem sala, não tem votação, não tem tempo real compartilhado.
- Não é karaokê.
- Não toca música — quem toca é o Spotify. Isto lê e visualiza.
- Não vai pra Extended Quota, que exige 250 mil usuários mensais e não faz sentido aqui.
- Não precisa impressionar ninguém. Se acabar impressionando, ótimo, mas não é critério e não entra em nenhuma decisão.
