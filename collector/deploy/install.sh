#!/usr/bin/env bash
#
# Instala (ou reinstala) o coletor como serviço de usuário do systemd.
#
# É idempotente de propósito: rodar isto de novo depois de um `git pull` é o
# caminho normal de deploy. Cada passo ou já está feito, ou é refeito por cima.
#
#     collector/deploy/install.sh
#
set -euo pipefail

DEPLOY_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COLLECTOR_DIR="$(cd -- "${DEPLOY_DIR}/.." && pwd)"
REPO_DIR="$(cd -- "${COLLECTOR_DIR}/.." && pwd)"

UNIT_NAME='playoff-collector.service'
UNIT_TEMPLATE="${DEPLOY_DIR}/${UNIT_NAME}"
UNIT_DIR="${XDG_CONFIG_HOME:-${HOME}/.config}/systemd/user"
UNIT_PATH="${UNIT_DIR}/${UNIT_NAME}"
ENV_FILE="${REPO_DIR}/.env"

# `$USER` não vem definido em toda sessão não interativa, e `set -u` mataria o
# script na primeira menção.
USER_NAME="${USER:-$(id -un)}"

say()  { printf '%s\n' "$*"; }
step() { printf '\n── %s ──\n' "$*"; }
warn() { printf 'aviso: %s\n' "$*" >&2; }
die()  { printf 'erro: %s\n' "$*" >&2; exit 1; }

# Uma chave "presente" precisa ter valor. `CHAVE=` no .env é pior que ausente:
# o config.ts trata string vazia como não definida, mas quem leu o arquivo acha
# que configurou.
has_key() {
  grep -Eq "^[[:space:]]*$1=[[:space:]]*[^[:space:]]" "$ENV_FILE"
}

# ── 1. pré-requisitos ───────────────────────────────────────────────────────

step 'conferindo o terreno'

command -v systemctl >/dev/null 2>&1 || die 'systemctl não existe nesta máquina.'
systemctl --user show-environment >/dev/null 2>&1 ||
  die 'não há gerenciador de systemd de usuário nesta sessão (container? ssh sem
     sessão de login?). Sem ele esta unidade não roda; ver PRD §3.2 para as
     alternativas (VPS, Cloudflare Worker) — e o que cada uma custa em resolução.'

command -v node >/dev/null 2>&1 || die 'node não encontrado no PATH.'
NODE_BIN="$(command -v node)"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || die "o coletor exige Node >= 20; aqui é $(node -v)."

# O caminho do binário entra fixo na unidade. Com nvm isso prende a unidade a uma
# versão específica de Node: depois de trocar de versão, rode este script de novo.
case "$NODE_BIN" in
  *"/.nvm/"*) warn "node vindo do nvm (${NODE_BIN}). A unidade vai apontar para este
     caminho; ao trocar de versão do Node, rode este script outra vez." ;;
esac

[ -f "$ENV_FILE" ] || die "não achei ${ENV_FILE}.
     Copie o exemplo e preencha:  cp ${REPO_DIR}/.env.example ${ENV_FILE}"

# O systemd lê o .env como EnvironmentFile, não como script de shell. `export` vira
# parte do nome da variável e a chave simplesmente não existe para o processo.
if grep -Eq '^[[:space:]]*export[[:space:]]' "$ENV_FILE"; then
  warn 'o .env tem linhas com `export`. O systemd lê esse arquivo literalmente,
     então essas variáveis NÃO chegam ao coletor. Remova o `export`.'
fi

has_key 'SPOTIFY_CLIENT_ID' || has_key 'NUXT_SPOTIFY_CLIENT_ID' ||
  die 'falta SPOTIFY_CLIENT_ID (ou NUXT_SPOTIFY_CLIENT_ID) no .env.'
has_key 'SPOTIFY_CLIENT_SECRET' || has_key 'NUXT_SPOTIFY_CLIENT_SECRET' ||
  die 'falta SPOTIFY_CLIENT_SECRET (ou NUXT_SPOTIFY_CLIENT_SECRET) no .env.'
has_key 'COLLECTOR_DATABASE_URL' || has_key 'DATABASE_URL' ||
  die 'falta COLLECTOR_DATABASE_URL (ou DATABASE_URL) no .env.'

# Sem refresh token o serviço sobe, sai 78 e — por RestartPreventExitStatus —
# estaciona em `failed`. Melhor barrar aqui, com o comando que resolve.
has_key 'COLLECTOR_SPOTIFY_REFRESH_TOKEN' ||
  die "falta COLLECTOR_SPOTIFY_REFRESH_TOKEN no .env.
     Rode:  cd ${COLLECTOR_DIR} && npm run authorize
     e cole a linha que ele imprime no .env."

say "repo         ${REPO_DIR}"
say "coletor      ${COLLECTOR_DIR}"
say "node         ${NODE_BIN} ($(node -v))"
say "unidade      ${UNIT_PATH}"

# ── 2. build ────────────────────────────────────────────────────────────────

step 'build'

# `pg` é a única dependência de runtime, então reinstalar a cada deploy só faria o
# script demorar. Instala se ainda não houver node_modules; senão vai direto ao tsc.
if [ ! -d "${COLLECTOR_DIR}/node_modules" ]; then
  say 'instalando dependências...'
  npm --prefix "$COLLECTOR_DIR" ci
fi

npm --prefix "$COLLECTOR_DIR" run build
[ -f "${COLLECTOR_DIR}/dist/src/main.js" ] ||
  die 'o build terminou sem produzir dist/src/main.js.'

# ── 3. unidade ──────────────────────────────────────────────────────────────

step 'instalando a unidade'

mkdir -p "$UNIT_DIR"

# Substituição em Bash puro em vez de sed: caminho com `/`, `&` ou `\` é armadilha
# de escape no sed, e o preço de errar aqui é uma unidade silenciosamente torta.
unit="$(cat "$UNIT_TEMPLATE")"
unit="${unit//__NODE__/$NODE_BIN}"
unit="${unit//__COLLECTOR_DIR__/$COLLECTOR_DIR}"
unit="${unit//__REPO_DIR__/$REPO_DIR}"

# Escreve em arquivo temporário e renomeia: se este script morrer no meio, o
# systemd nunca vê uma unidade pela metade.
tmp="$(mktemp "${UNIT_DIR}/.${UNIT_NAME}.XXXXXX")"
printf '%s\n' "$unit" >"$tmp"
chmod 0644 "$tmp"
mv -f "$tmp" "$UNIT_PATH"
say "escrito ${UNIT_PATH}"

systemctl --user daemon-reload

# ── 4. linger ───────────────────────────────────────────────────────────────

step 'linger'

# Sem linger, o gerenciador de usuário morre quando a última sessão fecha e leva o
# coletor junto — ele só coletaria enquanto houvesse um login aberto, que é
# exatamente o contrário do que este projeto quer.
if loginctl show-user "$USER_NAME" --property=Linger 2>/dev/null | grep -q 'Linger=yes'; then
  say 'já habilitado.'
elif loginctl enable-linger "$USER_NAME" 2>/dev/null; then
  say "habilitado para ${USER_NAME}."
else
  warn "não consegui habilitar o linger. Rode à mão:  loginctl enable-linger ${USER_NAME}
     Sem isso o coletor para quando você desloga, e o que não for coletado não
     volta (PRD §3)."
fi

# ── 5. subir ────────────────────────────────────────────────────────────────

step 'subindo'

systemctl --user enable "$UNIT_NAME" >/dev/null

# `restart` e não `start`: se a unidade já estava rodando, ela está com o dist
# antigo carregado na memória e um `start` não faria nada. `restart` também sobe o
# que estava parado, então serve para os dois casos.
systemctl --user restart "$UNIT_NAME"

# Dá tempo de o processo abrir o banco, pegar a trava e falhar, se for falhar.
sleep 3

if ! systemctl --user is-active --quiet "$UNIT_NAME"; then
  say ''
  systemctl --user status "$UNIT_NAME" --no-pager --lines=20 || true
  die 'a unidade não ficou de pé. As causas mais comuns, em ordem:
     saída 78  = refresh token morto (400 invalid_grant) ou outro coletor com a
                 trava. Ver README, seção "o refresh token morre em 6 meses".
     erro de namespace = kernel sem user namespace; comente PrivateTmp e
                 ProtectSystem na unidade.
     falha de banco = COLLECTOR_DATABASE_URL errada ou free tier hibernando.'
fi

say ''
say 'coletor de pé. A partir de agora o relógio está correndo e o dado está entrando.'
say ''
say '  seguir o log       journalctl --user -u playoff-collector -f'
say '  estado             systemctl --user status playoff-collector'
say "  cobertura 24h      node ${COLLECTOR_DIR}/dist/src/main.js status"
say '  parar              systemctl --user stop playoff-collector'
say ''
