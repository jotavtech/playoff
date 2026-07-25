# playoff-collector

Processo Node standalone que faz poll em `GET /v1/me/player` a cada ~20 segundos e
escreve o que viu no Postgres. Zero interface. Não é rota do Nuxt (PRD §9) e nunca
deve virar uma.

Isto é a Fase 1 do PRD. No fim dela não há nada para mostrar para ninguém — e é
esse o ponto.

---

## Por que isto existe antes de qualquer pixel

`GET /me/player/recently-played` devolve **os últimos 50 itens**. Não existe API de
histórico completo, nem paginação para trás além disso, nem exportação que traga
progresso ou skip. Então só há duas possibilidades:

- ou algo está coletando continuamente **desde hoje**,
- ou o ARCHIVE não tem substrato, e não vai ter.

As duas consequências duras (PRD §3):

1. **O projeto começa a valer semanas depois de começar a rodar.** Não dá para
   construir a interface primeiro e ligar a coleta depois: a interface ficaria
   pronta sobre um banco vazio.
2. **Cada dia sem coletor é dado perdido para sempre.** Não é atraso, é perda. Não
   existe backfill que recupere o dia de ontem com resolução de skip.

É por isso que quase toda decisão de operação aqui — restart automático, o
`collector_poll` gravando até quando nada toca, o alarde em volta do refresh token
— resolve a mesma pergunta: como não ficar parado sem perceber.

---

## O que ele grava

Quatro tabelas, criadas por `db/migrations/001_init.sql`.

| tabela | o que é |
|---|---|
| `play_event` | uma linha por poll em que havia faixa de catálogo tocando. Append-only, fonte da verdade. |
| `collector_poll` | uma linha por poll, **sempre**, qualquer que seja o resultado. É o denominador: separa "nada tocou" de "o coletor estava fora do ar". |
| `listen` | escutas derivadas de `play_event` por `sessionize.ts`. Cache reconstruível — apaga e recalcula quando a lógica mudar. Nunca o contrário. |
| `collector_run` | um registro por processo: quando subiu, último tick, por que parou. Serve para depurar restart, não para interpretar dado. |

---

## Fase 0 — rode o probe primeiro

```bash
cd collector
npm ci
npm run build
npm run probe
```

O probe checa, em ordem: se o refresh token ainda vale, se `audio-features`
responde, quem é a conta, e se `/me/player` abre com os escopos certos. Ele não
encosta no banco de propósito — a Fase 0 roda antes de existir banco, e exigir
`DATABASE_URL` aqui transformaria o probe num teste de infraestrutura.

**Ele precisa de um `COLLECTOR_SPOTIFY_REFRESH_TOKEN` no `.env`.** Essa é a
pergunta original da Fase 0 do PRD §11: *o auth da app antiga ainda funciona?* Se
você não tem token nenhum ainda, faça os passos 1, 2 e 4 do Setup abaixo (app,
redirect URI, `authorize`) e volte aqui.

**Sobre o 403 em `audio-features`: não é falha e não muda nada.** O acesso ficou
restrito, em 27/11/2024, a apps que já tinham cota estendida concedida ou pendente
naquela data; ~20 meses depois não houve restauração nem substituto oficial.
Qualquer app registrada depois disso recebe 403 — a hipótese de trabalho do PRD
§4.1 é justamente essa. PRD §4.2 ao pé da letra: *"403 → seguir só com mic. Nada no
restante deste PRD muda."* A LIVE (Fase 3) lê o microfone da sala, que aliás capta o
que sai da caixa em vez de descrever a gravação. **O coletor, o schema e o ARCHIVE
não têm nada a ver com essa linha do probe.**

O 403 que importa é o outro: 403 em `/me/player` é autorização, não cota — escopo
faltando, usuário fora da lista de autorizados, ou Premium do dono vencido. Com
esse, o coletor não coletaria nada.

---

## Setup

### 1. A app no dashboard do Spotify

Crie uma app em <https://developer.spotify.com/dashboard>. Ela vai ficar em
Development Mode para sempre: desde abr/2025 a cota estendida exige empresa
registrada e ~250 mil usuários mensais, o que o PRD §12 já declara como
não-objetivo.

Três coisas que mudaram em fev/2026 e que derrubam a app sem aviso:

- **o DONO da app precisa de Premium ativo.** Se a assinatura vencer, a app para de
  funcionar e a API passa a responder 403 em tudo.
- **5 usuários autorizados por app** (era 25). Você precisa se adicionar
  explicitamente em Settings → User Management, com o e-mail da conta que vai ser
  arquivada. Esta é a causa número um de "funcionava ontem" com 403 em tudo.
- a cota de Development Mode passou a ser contada **por conta de desenvolvedor**
  (jul/2026), não por client id. Registrar apps extras não compra headroom.

### 2. O redirect URI

Cadastre, caractere por caractere:

```
http://127.0.0.1:8888/callback
```

**`localhost` não serve.** Em 27/11/2025 o Spotify removeu o implicit grant,
redirect URIs sem TLS fora do loopback e **apelidos de host** — tem que ser o IP
literal `127.0.0.1`. O detalhe cruel é que `localhost` resolve para 127.0.0.1 aqui
dentro, então o servidor de callback do `authorize` sobe normalmente e o erro só
aparece do lado do Spotify, com uma mensagem que não diz isso. O `authorize.ts`
barra antes, mas o cadastro no dashboard é com você.

O fluxo é Authorization Code + PKCE, um usuário só (PRD §9). Escopos pedidos:
`user-read-playback-state` e `user-read-currently-playing` — nada de escrita, o
coletor não controla playback.

Se o site (Nuxt) usa a mesma app, cadastre os dois redirect URIs: são URLs
diferentes e ambas podem conviver na mesma app.

### 3. O banco

Postgres gerenciado em free tier. Precisa ser acessível de fora, porque o site na
Vercel vai ler dele (PRD §3.2). A URL vai em `COLLECTOR_DATABASE_URL`; provedores
gerenciados costumam exigir `?sslmode=require` no fim.

```bash
cp .env.example .env      # na raiz do repo
$EDITOR .env              # preencha client id, secret e a URL do banco
cd collector
npm run migrate           # idempotente; o `run` também aplica ao subir
```

### 4. Autorizar

```bash
npm run authorize
```

Ele imprime uma URL, você abre no navegador, autoriza, e ele devolve a linha
pronta:

```
COLLECTOR_SPOTIFY_REFRESH_TOKEN=...
```

Cole no `.env` da raiz. **Anote a data de hoje ao lado** — o `.env.example` tem a
linha de comentário reservada para isso. Leia a seção seguinte antes de seguir; ela
explica por que essa data importa mais que o token.

### 5. Instalar o serviço

```bash
collector/deploy/install.sh
```

Faz build, escreve `~/.config/systemd/user/playoff-collector.service`, recarrega o
daemon, habilita o linger, sobe o serviço e imprime como seguir o log. É idempotente:
rodar de novo depois de um `git pull` é o caminho normal de deploy.

A partir daí o relógio está correndo.

---

## O refresh token morre em 6 meses

**Esta é a falha mais provável do projeto inteiro, e a que mais silenciosamente
apaga meses de coleta.** Ela não é um bug: é o comportamento novo da plataforma.

Desde **20/07/2026** todo refresh token do Spotify expira **6 meses depois de ser
emitido**, para todas as apps. Renovar o access token (o que o coletor faz de hora
em hora) **não estende o prazo** — é vida absoluta, contada da emissão. Quando
vence, `POST https://accounts.spotify.com/api/token` passa a responder **HTTP 400
com `error: "invalid_grant"`**, e nenhuma retentativa jamais funciona.

Revogar o acesso em <https://spotify.com/account/apps> ou trocar a senha da conta
produz exatamente o mesmo 400. Pela resposta, os três casos são indistinguíveis — e
não faz diferença, porque a saída é a mesma.

### Como isso aparece

O coletor **não** insiste. Ao ver o `invalid_grant` ele para na hora, registra o
motivo em `collector_run` e sai com código 78; a unidade tem
`RestartPreventExitStatus=78`, então o systemd a deixa em `failed` em vez de bater
no endpoint de token a cada 10 segundos. Falhar alto e parar é deliberado: o
contrário seria queimar a cota da conta e enterrar o erro real embaixo de milhares
de linhas idênticas.

No journal, a linha é esta:

```
PARADO: o refresh token expirou ou foi revogado. Rode `npm run authorize` no
coletor e atualize COLLECTOR_SPOTIFY_REFRESH_TOKEN. Nenhum dado é coletado até lá.
```

Para procurar:

```bash
systemctl --user is-failed playoff-collector          # "failed" = confira já
systemctl --user status  playoff-collector            # procure "status=78"
journalctl --user -u playoff-collector --since '30 days ago' \
  | grep -E 'invalid_grant|PARADO|reautoriz'
```

### O conserto

```bash
cd collector
npm run authorize                                # gera um token novo
$EDITOR ../.env                                  # troque COLLECTOR_SPOTIFY_REFRESH_TOKEN
systemctl --user restart playoff-collector
```

O restart é obrigatório: o `EnvironmentFile` é lido pelo systemd **na partida**, então
editar o `.env` com o serviço rodando não muda nada até reiniciar.

### Ponha no calendário. Agora.

**Crie um lembrete para daqui a ~5 meses.** Não existe nada no sistema que vá
lembrar por você: o Spotify não devolve a data de emissão do token, o `spotify.ts`
tem um aviso proativo aos 150 dias mas ele só dispara se alguém informar essa data,
e hoje o `main.ts` não informa. O único lugar onde essa data existe é onde você a
escrever.

Prática que custa dez segundos e paga meses: ao rodar `authorize`, anote a data no
comentário acima da variável no `.env`, e crie o evento no calendário no mesmo
minuto.

### O parente próximo: rotação

O Spotify **pode** devolver um refresh token novo em qualquer renovação e matar o
antigo na hora. Quando isso acontece o coletor segue rodando (ele tem o novo em
memória) e loga:

```
o Spotify rotacionou o refresh token. Atualize o .env com o valor novo, senão o
coletor não sobe na próxima reinicialização.
```

Se você não atualizar o `.env`, tudo parece bem — até o próximo restart, que é o
pior momento possível para descobrir. Vale um `grep rotacion` no journal de vez em
quando.

Pelo mesmo motivo, **cuidado com o `npm run probe` com o coletor no ar**: o probe
também troca o refresh token por um access token e pode disparar a rotação. Ele
avisa e imprime o valor novo — se avisar, atualize o `.env` na hora.

---

## Operação

Tudo daqui roda de `collector/`.

### Está vivo?

```bash
systemctl --user status playoff-collector
journalctl --user -u playoff-collector -f
```

`active (running)` é necessário e não é suficiente: um processo vivo que não
consegue escrever no banco não está coletando nada. O teste de verdade é do lado do
banco:

```sql
select id, started_at, last_tick_at, ticks, events, stopped_at, stop_reason
  from collector_run
 order by id desc limit 5;
```

`last_tick_at` tem que estar a menos de um minuto de `now()`.

### Quanto do dia foi coberto

```bash
node dist/src/main.js status
```

Imprime a contagem das últimas 24h por tipo de poll (`track`, `idle`,
`unsupported`, `rate-limited`, `error`) e o percentual do dia coberto. A 20s, um dia
inteiro de pé são ~4.320 polls; uma hora, ~180.

Por hora, para achar o buraco:

```sql
select date_trunc('hour', observed_at) as hora,
       count(*)                                as polls,
       count(*) filter (where kind = 'track')  as tocando,
       count(*) filter (where kind = 'idle')   as parado,
       count(*) filter (where kind = 'error')  as erro
  from collector_poll
 where observed_at > now() - interval '48 hours'
 group by 1
 order by 1;
```

Hora com muito menos de 180 polls é hora em que o coletor esteve fora — e essa
distinção é a única coisa que impede o ARCHIVE de ler downtime como abandono.

### Rederivar `listen`

O `run` já rederiva sozinho a cada 5 minutos, então normalmente não há o que fazer.
Manualmente:

```bash
npm run derive                        # incremental, relê as últimas 6h
node dist/src/main.js derive --rebuild # apaga listen e recalcula do zero
```

O `--rebuild` é o "apaga e recalcula" do PRD §5, e é a operação obrigatória depois
de qualquer mudança em `sessionize.ts` — inclusive mudar `endToleranceMs`. Ele
apaga e regrava dentro de uma transação, então o site continua lendo as linhas
antigas até o commit.

`play_event` e `collector_poll` **nunca** são tocados por nada disso. Se um
`--rebuild` estragar `listen`, conserta-se o código e roda de novo. Se `play_event`
for perdido, acabou.

### Um poll só, para conferir configuração

```bash
node dist/src/main.js once     # imprime o PollResult normalizado e sai
```

### Depois de um `git pull`

```bash
collector/deploy/install.sh    # rebuild + reinstala a unidade + restart
```

### Quando não sobe

| sintoma | causa provável |
|---|---|
| `status=78` no journal, unidade em `failed` | refresh token morto (ver seção acima) **ou** outro coletor com o advisory lock. A linha anterior do journal distingue. Se for a trava: `systemctl --user restart`. |
| `Failed to set up mount namespacing` | kernel sem user namespace sem privilégio. Comente `PrivateTmp` e `ProtectSystem` na unidade. Coletar vale mais que a caixinha. |
| `Falta a URL do banco` | o `.env` não chegou ao processo. Confira `EnvironmentFile` na unidade e que não há `export` no `.env` — o systemd lê aquele arquivo literalmente, não como shell. |
| 403 em tudo, e ontem funcionava | Premium do dono da app venceu, ou você saiu da lista de 5 usuários autorizados. Não é bug de código. |
| coletor parou quando você deslogou | falta `loginctl enable-linger <usuário>`. |

---

## Limites conhecidos

Isto aqui não é ressalva de rodapé. São **propriedades do instrumento** que, se
não estiverem escritas, vão ser lidas daqui a seis meses como propriedades de quem
escuta — e nessa altura não serão recuperáveis a partir do próprio dado.

### 1. Faixa rejeitada rápido é quase invisível

Uma faixa abandonada após `t` segundos só chega a ser amostrada com probabilidade
`~min(t/20, 1)`. Ou seja:

| abandonada em | chance de nunca ser vista |
|---|---|
| 2s | ~90% |
| 4s | ~80% |
| 8s | ~60% |
| 12s | ~40% |
| 19s | ~5% |

A rejeição de 3 segundos — o julgamento mais decidido que existe — é invisível em
~85% das vezes. Consequência direta: **o histograma de duração-até-skip vai cair em
direção a zero, e essa queda é 100% artefato do amostrador**, não comportamento. O
viés é unidirecional e pior exatamente nos skips mais informativos.

Nenhuma taxa de poll viável fecha isso: mesmo a 5s — quatro vezes mais chamadas —
uma rejeição de 2s continua invisível em 60% das vezes. Não é bug, é o teto do
método.

### 2. O teto de 3 skips por minuto

Não dá para registrar mais de um evento por poll. A 20s, a taxa de skip observável
**satura em 3/min**. Quando alguém varre uma playlist pulando sete faixas em um
minuto, o arquivo registra três.

Isso atinge de frente a métrica "ponto onde a taxa de skip dispara" do PRD §6: ela
mede uma grandeza saturada. O platô no gráfico é o instrumento batendo no teto, não
a pessoa se acalmando.

### 3. Crossfade torna skip no fim da faixa indecidível

O Spotify permite crossfade de até 12 segundos e **não expõe esse ajuste pela API**.
Com crossfade ligado, toda transição natural termina N segundos antes de
`duration_ms` — exatamente a assinatura de um skip no fim.

Por isso `sessionize.ts` tem `endToleranceMs` (padrão 5s, suba para ~13000 se você
usa crossfade). Mas nenhum valor resolve: ele só escolhe qual erro cometer. Com
tolerância apertada, toda transição vira skip; com tolerância folgada, pular os
últimos segundos é indistinguível de ouvir até o fim. **Um skip dentro dos últimos ~12
segundos é genuinamente indecidível a partir de `/me/player`.**

Corolário operacional: se você mudar `endToleranceMs`, anote a data. O
`--rebuild` reprocessa o arquivo inteiro com o valor novo, e o arquivo passa a
misturar duas leituras da mesma fronteira.

### 4. `outcome` e `completion` respondem perguntas diferentes

- **`outcome`** descreve **como a reprodução TERMINOU**: `completed`, `skipped`,
  `interrupted`.
- **`completion`** descreve **quanto foi OUVIDO**: `listened_ms / duration_ms`.

**Nenhum dos dois é proxy do outro, e usar um no lugar do outro é o erro de análise
mais fácil de cometer aqui.** Arrastar o scrubber para o último acorde e deixar
terminar dá `outcome = completed` com `completion` em torno de 0,2 — a faixa
terminou, quase nada foi ouvido. Pausar a 3:00 de uma faixa de 3:20 e sair para
almoçar dá `outcome = interrupted` com `completion` em torno de 0,9 — quase tudo
foi ouvido, e ainda assim não terminou.

Qualquer consulta do tipo "gostei = completion > 0,8" precisa dizer explicitamente
qual das duas perguntas está fazendo.

### 5. Os outros, mais curtos

- **Buraco de cobertura não é abandono.** Ausência de linha em `play_event` só é
  interpretável junto com `collector_poll`: com linhas de poll, houve silêncio
  observado; sem nenhuma, o coletor estava fora do ar. As três métricas de taxa do
  PRD §6 (decaimento, abandono, reentrada) são inúteis sem esse denominador — e
  "sumiu por meses e voltou" é exatamente o formato de um coletor que ficou fora.
- **Sessão privada é um buraco permanente.** Com Private Session no dispositivo, o
  Spotify não reporta a reprodução (204) *e* exclui essas faixas do
  `recently-played`. Não há backfill possível: some, e some para sempre.
- **Podcast, arquivo local e anúncio não viram escuta.** São registrados em
  `collector_poll` como `unsupported` — observados, nunca contados. Arquivo local
  não tem `track_id`, e o schema do PRD §5 exige um.
- **O intervalo tem jitter de propósito** ([17s, 23s], ver `poll.ts`). Uma grade
  travada produz erro *estruturado* em vez de ruído, e o artefato tem a forma exata
  de "sempre pulo esta faixa no mesmo ponto". Se você mexer em
  `COLLECTOR_POLL_INTERVAL_MS`, anote a data: misturar dois regimes de amostragem
  no mesmo arquivo deixa o artefato em metade dos dados, sem como saber qual metade.
- **Máquina desligada é dado não coletado.** Foi a decisão consciente do PRD §3.2:
  systemd local primeiro, VPS se o buraco incomodar. O `status` mede o buraco.
- **Sem `audio-features`**, não há como enriquecer o arquivo com energia, valência
  ou tempo. Se um dia isso for necessário, é tabela lateral de outra fonte, nunca
  coluna nova em `play_event`.

---

## Variáveis de ambiente

Lidas de `.env` na raiz do repo (o `.env.example` documenta cada uma). Sob systemd
quem carrega esse arquivo é o `EnvironmentFile` da unidade — **sem `export`, sem
expansão de `$VAR`, valor com espaço entre aspas.**

| variável | obrigatória | padrão | o que é |
|---|---|---|---|
| `COLLECTOR_DATABASE_URL` | sim (ou `DATABASE_URL`) | — | Postgres. Costuma pedir `?sslmode=require`. |
| `COLLECTOR_SPOTIFY_REFRESH_TOKEN` | sim | — | sai do `npm run authorize`. Morre em 6 meses. |
| `SPOTIFY_CLIENT_ID` | sim (ou `NUXT_SPOTIFY_CLIENT_ID`) | — | do dashboard. |
| `SPOTIFY_CLIENT_SECRET` | sim (ou `NUXT_SPOTIFY_CLIENT_SECRET`) | — | usado no Basic auth da renovação. |
| `COLLECTOR_REDIRECT_URI` | não | `http://127.0.0.1:8888/callback` | só o `authorize` usa. Host precisa ser o IP literal. |
| `COLLECTOR_POLL_INTERVAL_MS` | não | `20000` | leia Limites conhecidos antes de mexer. |
| `COLLECTOR_LOG_LEVEL` | não | `info` | `debug` \| `info` \| `warn` \| `error`. |

O prefixo `NUXT_` é aceito nas credenciais do Spotify para que um `.env` só sirva
aos dois processos, sem credencial duplicada.

---

## Anatomia

| arquivo | responsabilidade |
|---|---|
| `src/main.ts` | CLI: `run`, `once`, `probe`, `authorize`, `migrate`, `derive`, `status`. |
| `src/poll.ts` | o laço. Um poll, uma linha em `collector_poll`, sempre. |
| `src/spotify.ts` | HTTP, renovação de token, 401/403/429, normalização do player. |
| `src/sessionize.ts` | amostras → escutas. Função pura. É o coração; leia antes de tocar. |
| `src/derive.ts` | janela de releitura e upsert de `listen`. |
| `src/db.ts` | pool, migrações, advisory lock, repositórios. |
| `deploy/` | a unidade systemd e o instalador. |
