# playoff

**Um instrumento pessoal de escuta.** Duas superfícies sobre uma base de dados que o
próprio sistema acumula ao longo do tempo:

- **LIVE** — o que está tocando agora, como sinal visual.
- **ARCHIVE** — o que eu ouvi ao longo dos meses, como material explorável.

Audiência: uma pessoa. É hobby declarado — sem usuário-alvo, sem monetização, sem
crescimento. Leia o [PRD](./docs/PRD.md) antes de mexer em qualquer coisa: ele decide
quem abre o app e por quê, e todo requisito visual é consequência disso.

> O nome "playoff" descrevia votação e disputa, que nenhuma das duas superfícies faz.
> Está errado e a renomeação segue em aberto — não bloqueia execução.

## Estado

| Fase | O que é | Estado |
|---|---|---|
| 0 — Probe | Confirmar auth, escopos e se `audio-features` responde | pronta (`npm run probe`) |
| 1 — Coletor | Script, schema, serviço, banco. **Zero interface.** | pronta |
| 2 — Archive mínimo | Uma tela, uma pergunta respondida bem | não começada |
| 3 — Live | Só depois de haver dado real para calibrar | não começada |

A ordem é essa de propósito, e é o oposto da do PRD v1 — ver §11 do PRD.

## Comece pelo coletor

`/me/player/recently-played` devolve só os últimos 50 itens e não existe API de
histórico. Ou algo está coletando continuamente desde hoje, ou o ARCHIVE nunca vai ter
substrato: **cada dia sem coletor é dado perdido para sempre.** Por isso ele vem antes
de qualquer pixel — e por isso, no fim da Fase 1, não há nada para mostrar a ninguém.
É esse o ponto.

Manual completo em [`collector/README.md`](./collector/README.md).

```bash
cd collector
npm install && npm run build
npm run probe        # Fase 0 — um 403 em audio-features não muda nada (PRD §4.2)
npm run authorize    # uma vez; o refresh token expira em 6 meses
npm run migrate
./deploy/install.sh  # serviço systemd de usuário
```

## O site

Nuxt 3 + TypeScript, SPA. Hoje ele ainda é a interface do produto antigo — votação,
salas, Cinematic Modes — que o PRD v5 §8.1 e §12 descartam. Nada disso foi removido
ainda porque a Fase 2 vai substituir, não remendar.

```bash
npm install
npm run dev
```

## Layout

```
collector/            processo separado de coleta — NÃO é rota do Nuxt (PRD §9)
  src/sessionize.ts   o coração: amostras cruas → escutas, com detecção de skip
  test/scenarios.ts   33 cenários com verdade conhecida + varredura de fase
db/migrations/        play_event, listen, collector_poll, collector_run
docs/PRD.md           o documento vigente
docs/PRD-RADIOLA.md   supersedido; fica como histórico de domínio
```

## Testes

```bash
cd collector && npm test
```
