-- 001_init — substrato do ARCHIVE.
--
-- Ver docs/PRD.md §5. Eventos são a fonte da verdade; toda métrica é derivada e
-- nada é agregado na escrita. `listen` é cache: se a lógica de derivação mudar,
-- apaga e recalcula de `play_event`. Nunca o contrário.

-- ── play_event — escrito pelo coletor, append-only ──────────────────────────
create table if not exists play_event (
  id            bigserial primary key,
  observed_at   timestamptz not null,
  track_id      text        not null,
  track_name    text        not null,
  artist_ids    text[]      not null,
  artist_names  text[]      not null,
  album_id      text,
  duration_ms   int         not null,
  progress_ms   int         not null,
  is_playing    bool        not null,
  device_type   text,
  context_uri   text,          -- playlist / album / artist de origem
  shuffle       bool,
  repeat_state  text
);

-- Duas amostras da mesma faixa no mesmo milissegundo são, por definição, a mesma
-- amostra escrita duas vezes. Backstop de banco para o critério "não duplica
-- eventos" (PRD §10) — a defesa primária é o advisory lock em db.ts, que impede
-- duas instâncias do coletor de rodarem ao mesmo tempo.
create unique index if not exists play_event_track_observed_uniq
  on play_event (track_id, observed_at);

-- Caminho de acesso principal: a derivação varre janelas em ordem cronológica,
-- e a linha do tempo do ARCHIVE lê por intervalo.
create index if not exists play_event_observed_at_idx
  on play_event (observed_at);

-- ── listen — derivada por job, reconstruível a partir de play_event ─────────
create table if not exists listen (
  id             bigserial primary key,
  track_id       text        not null,
  started_at     timestamptz not null,
  ended_at       timestamptz not null,
  duration_ms    int         not null,
  listened_ms    int         not null,
  completion     real        not null,   -- listened_ms / duration_ms
  outcome        text        not null,   -- 'completed' | 'skipped' | 'interrupted'
  device_type    text,
  context_uri    text,
  constraint listen_outcome_check
    check (outcome in ('completed', 'skipped', 'interrupted'))
);

-- Torna a derivação idempotente: recalcular uma janela faz upsert em cima das
-- mesmas chaves em vez de duplicar. Uma faixa não pode começar duas vezes no
-- mesmo instante.
create unique index if not exists listen_track_started_uniq
  on listen (track_id, started_at);

create index if not exists listen_started_at_idx
  on listen (started_at);

-- ── collector_poll — o que foi observado a cada tick ───────────────────────
--
-- Esta tabela é a razão de o ARCHIVE ser interpretável, e ela precisa existir
-- desde o primeiro dia.
--
-- `play_event.track_id` é `not null`, então um 204 (nada tocando), um anúncio, um
-- podcast, um arquivo local e um coletor morto produzem exatamente a mesma coisa:
-- nenhuma linha. São cinco fenômenos diferentes com o mesmo registro — e três das
-- métricas do PRD §6 (curva de decaimento, abandono, reentrada) são taxas. Taxa
-- sem denominador de tempo observado não é interpretável: um buraco de cobertura
-- é byte-a-byte idêntico a um abandono real, e "sumiu por um ano e voltou" é
-- exatamente o formato de um coletor que ficou fora do ar.
--
-- Uma linha por poll, sempre, independente do resultado. Ao lado de `play_event`
-- ela responde: o coletor estava de pé neste instante? e o que ele viu?
--
-- Isto não altera o schema do PRD §5 — `play_event` e `listen` seguem exatos.
-- Metadado de observação (rtt, status HTTP) mora aqui, não na tabela de domínio.
create table if not exists collector_poll (
  id           bigserial   primary key,
  observed_at  timestamptz not null,
  -- 'track'        — tocando faixa de catálogo; existe play_event com este observed_at
  -- 'idle'         — 204/sem player. Silêncio OBSERVADO, que é dado, não ausência.
  -- 'unsupported'  — tocando algo sem track id: arquivo local, episódio, anúncio
  -- 'rate-limited' — 429
  -- 'error'        — falha transitória
  kind         text        not null,
  http_status  int,
  -- A amostra já era velha quando chegou. Guardar o round-trip permite corrigir
  -- `progress_ms` depois; sem isto a tolerância da derivação precisa absorver o
  -- jitter às cegas. Impossível de reconstruir retroativamente.
  rtt_ms       int,
  detail       text,
  constraint collector_poll_kind_check
    check (kind in ('track', 'idle', 'unsupported', 'rate-limited', 'error'))
);

-- Um poll por instante. Também é a chave de junção com play_event.observed_at.
create unique index if not exists collector_poll_observed_at_uniq
  on collector_poll (observed_at);

-- ── collector_run — um registro por processo ───────────────────────────────
-- Complementa collector_poll com identidade de processo: quem estava rodando,
-- por que parou. Serve para depurar restart, não para interpretar dado.
create table if not exists collector_run (
  id            bigserial primary key,
  started_at    timestamptz not null default now(),
  last_tick_at  timestamptz not null default now(),
  stopped_at    timestamptz,
  stop_reason   text,
  ticks         bigint      not null default 0,
  events        bigint      not null default 0,
  hostname      text,
  pid           int
);

create index if not exists collector_run_started_at_idx
  on collector_run (started_at);
