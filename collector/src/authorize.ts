import { createHash, randomBytes } from 'node:crypto'
import { createServer, type ServerResponse } from 'node:http'

import { loadSpotifyCredentials } from './config.js'

/**
 * Bootstrap interativo: obtém o refresh token do coletor e sai.
 *
 * Roda uma vez — e de novo a cada seis meses. Desde 20/07/2026 todo refresh token
 * do Spotify tem validade de seis meses, contada da emissão, e renovar o access
 * token não estende esse prazo. Este é o único ponto do sistema que exige um
 * humano, e o preço de esquecer dele é o coletor parar em silêncio: PRD §3, cada
 * dia sem coleta é dado perdido para sempre.
 *
 * Fluxo: Authorization Code + PKCE. O implicit grant foi removido em 27/11/2025 e
 * não existe alternativa — não é preferência, é o que sobrou.
 */

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'

/**
 * O mínimo para ler `GET /v1/me/player`. Nenhum escopo de escrita, de propósito:
 * este sistema lê e visualiza, não toca (PRD §12). A tela de consentimento é o
 * lugar onde essa promessa fica visível — e é o texto que eu vou reler daqui a
 * seis meses, na reautorização, quando não lembrar mais o que o coletor faz.
 */
const SCOPES = ['user-read-playback-state', 'user-read-currently-playing']

/** Paciência do servidor de callback antes de liberar a porta e desistir. */
const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000
const CALLBACK_TIMEOUT_MIN = Math.round(CALLBACK_TIMEOUT_MS / 60_000)

const TOKEN_TIMEOUT_MS = 15_000

// ── saída ───────────────────────────────────────────────────────────────────

function out(text = ''): void {
  process.stdout.write(`${text}\n`)
}

function section(title: string): string {
  const head = `── ${title} `
  return head + '─'.repeat(Math.max(3, 76 - head.length))
}

/**
 * Imprime o diagnóstico em português e devolve o erro curto para `throw`.
 *
 * O `main` serializa o Error numa linha de log JSON, onde um texto de dez linhas
 * vira uma tripa de `\n` ilegível. Então a explicação vai para stdout como texto,
 * e o que sobe é só a etiqueta.
 */
function abort(explanation: string, short: string): Error {
  out()
  out(section('erro'))
  out()
  out(explanation)
  out()
  return new Error(short)
}

// ── redirect ────────────────────────────────────────────────────────────────

interface Redirect {
  uri: string
  origin: string
  pathname: string
  port: number
}

function parseRedirect(uri: string): Redirect {
  let url: URL | null = null
  try {
    url = new URL(uri)
  } catch {
    url = null
  }

  if (url === null) {
    throw abort(`  COLLECTOR_REDIRECT_URI não é uma URL:\n\n    ${uri}`, 'redirect_uri inválido')
  }

  // O Spotify recusa apelido de host em redirect URI desde 27/11/2025: tem que ser
  // o IP literal. "localhost" resolve para 127.0.0.1 aqui dentro e o servidor até
  // sobe — o que falha é o cadastro no dashboard, e a mensagem de erro que volta
  // não diz isso. Barrar aqui é mais barato que descobrir na tela do Spotify.
  if (url.hostname !== '127.0.0.1') {
    throw abort(
      `  redirect_uri configurado: ${uri}\n\n` +
        `  O host precisa ser o IP literal 127.0.0.1, não "${url.hostname}". Desde\n` +
        '  27/11/2025 o Spotify não aceita mais apelidos de host ("localhost") nem\n' +
        '  redirect URI sem TLS fora do loopback. Use:\n\n' +
        '    COLLECTOR_REDIRECT_URI=http://127.0.0.1:8888/callback\n\n' +
        '  e cadastre exatamente essa URL no dashboard da app.',
      'redirect_uri precisa usar o IP literal 127.0.0.1'
    )
  }

  // https no loopback exigiria certificado; este servidor é http puro, que o
  // Spotify continua permitindo especificamente em 127.0.0.1.
  if (url.protocol !== 'http:') {
    throw abort(
      `  redirect_uri configurado: ${uri}\n\n` +
        '  Este comando sobe um servidor http simples no loopback e não tem como\n' +
        '  servir https. Use http://127.0.0.1:8888/callback.',
      'redirect_uri precisa ser http no loopback'
    )
  }

  return {
    uri,
    origin: url.origin,
    pathname: url.pathname,
    port: Number.parseInt(url.port === '' ? '80' : url.port, 10)
  }
}

// ── servidor de callback ────────────────────────────────────────────────────

function page(message: string): string {
  return [
    '<!doctype html>',
    '<html lang="pt-BR"><head><meta charset="utf-8"><title>playoff-collector</title></head>',
    '<body style="background:#0a0a0a;color:#e8e8e8;padding:4rem 2rem;' +
      'font:14px ui-monospace,SFMono-Regular,Menlo,monospace">',
    `<p>${message}</p>`,
    '</body></html>'
  ].join('\n')
}

function reply(res: ServerResponse, status: number, message: string, done: () => void): void {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' })
  // `done` só dispara quando a resposta saiu do socket. Derrubar o servidor antes
  // disso deixa o navegador com uma aba em branco e o humano sem saber se deu certo.
  res.end(page(message), done)
}

/**
 * Sobe um servidor de um tiro só, espera o callback e devolve o `code`.
 *
 * Encerra em todos os caminhos — sucesso, erro e timeout. Uma porta de loopback
 * esquecida aberta é a única coisa que este comando pode deixar para trás.
 */
function waitForCallback(
  redirect: Redirect,
  expectedState: string,
  onListening: () => void
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let settled = false

    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', redirect.origin)

      // O navegador pede /favicon.ico por conta própria. Responder 404 sem encerrar
      // o servidor evita jogar fora o callback verdadeiro por causa dele.
      if (url.pathname !== redirect.pathname) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('não é aqui\n')
        return
      }

      const error = url.searchParams.get('error')
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')

      if (error !== null) {
        reply(res, 400, 'Autorização negada. Volte ao terminal.', () => {
          settle(
            abort(
              `  O Spotify recusou a autorização: ${error}\n\n` +
                '  access_denied é o botão "Cancelar" da tela de consentimento. Qualquer\n' +
                '  outro valor costuma ser a app: client_id errado, redirect_uri não\n' +
                '  cadastrado, ou o usuário fora da lista de 5 autorizados do Development\n' +
                '  Mode (dashboard → Settings → User Management).',
              `o Spotify não autorizou: ${error}`
            ),
            null
          )
        })
        return
      }

      // O state é o que separa o callback verdadeiro de qualquer processo local
      // que resolva bater nesta porta com um code forjado.
      if (state !== expectedState) {
        reply(res, 400, 'State não confere. Volte ao terminal.', () => {
          settle(
            abort(
              '  O state do callback não confere com o que foi enviado.\n\n' +
                '  Ou chegou um callback velho, de uma execução anterior aberta em outra\n' +
                '  aba, ou alguém bateu nesta porta por fora. Nos dois casos o code foi\n' +
                '  descartado sem ser trocado. Rode o comando de novo e use a URL nova.',
              'state do callback não confere'
            ),
            null
          )
        })
        return
      }

      if (code === null) {
        reply(res, 400, 'Callback sem code. Volte ao terminal.', () => {
          settle(
            abort(
              '  O callback chegou sem o parâmetro `code` e sem `error`, que não é uma\n' +
                '  resposta prevista. Rode o comando de novo.',
              'callback sem o parâmetro code'
            ),
            null
          )
        })
        return
      }

      reply(res, 200, 'Autorizado. Pode fechar esta aba e voltar ao terminal.', () => {
        settle(null, code)
      })
    })

    const timer = setTimeout(() => {
      settle(
        abort(
          `  Ninguém completou o login em ${CALLBACK_TIMEOUT_MIN} minutos, então a porta\n` +
            `  ${redirect.port} foi liberada. Rode o comando de novo quando estiver com o\n` +
            '  navegador na mão — a URL de autorização é gerada nova a cada execução.',
          'timeout esperando o callback'
        ),
        null
      )
    }, CALLBACK_TIMEOUT_MS)

    function settle(err: Error | null, code: string | null): void {
      if (settled) return
      settled = true
      clearTimeout(timer)
      // closeAllConnections antes do close: o keep-alive do navegador segura o
      // socket, e `close` sozinho esperaria por ele — a porta ficaria presa até o
      // processo morrer, que é justamente o que este bloco existe para evitar.
      server.closeAllConnections()
      server.close(() => {
        if (err !== null) reject(err)
        else if (code !== null) resolve(code)
        else reject(new Error('callback sem code'))
      })
    }

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        settle(
          abort(
            `  A porta ${redirect.port} já está ocupada.\n\n` +
              '  Normalmente é uma execução anterior deste mesmo comando que ficou\n' +
              '  pendurada, ou o site do Nuxt em outra porta configurada por engano.\n' +
              `  Feche o que estiver escutando em ${redirect.port} e rode de novo.`,
            `porta ${redirect.port} ocupada`
          ),
          null
        )
        return
      }
      settle(err, null)
    })

    // Só no loopback: a query do callback carrega o authorization code, e ninguém
    // na rede precisa alcançar esta porta.
    server.listen(redirect.port, '127.0.0.1', onListening)
  })
}

// ── troca do code pelo token ────────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

function parseJson(raw: string): Record<string, unknown> | null {
  try {
    return asRecord(JSON.parse(raw))
  } catch {
    return null
  }
}

interface IssuedToken {
  refreshToken: string
  scope: string | null
  expiresIn: number | null
}

async function exchangeCode(args: {
  clientId: string
  redirect: Redirect
  code: string
  verifier: string
}): Promise<IssuedToken> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: args.code,
    redirect_uri: args.redirect.uri,
    client_id: args.clientId,
    // Quem prova a posse do code no PKCE é o verifier, não o client secret — por
    // isso o secret não aparece aqui. O refresh token que volta pertence ao
    // client_id, então o coletor pode renová-lo com Basic auth normalmente.
    code_verifier: args.verifier
  })

  let response: Response
  try {
    response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS)
    })
  } catch (err) {
    throw abort(
      `  Não consegui falar com ${TOKEN_URL}:\n\n` +
        `    ${(err as Error).message}\n\n` +
        '  O authorization code vale poucos minutos e só uma vez, então ele já não\n' +
        '  serve mais. Rode o comando de novo.',
      'falha de rede na troca do code'
    )
  }

  const raw = await response.text()
  const payload = parseJson(raw)

  if (!response.ok) {
    const error = asText(payload?.['error']) ?? String(response.status)
    const description = asText(payload?.['error_description']) ?? raw.slice(0, 300)

    const hint =
      error === 'invalid_grant'
        ? '  invalid_grant aqui quase sempre é uma destas três coisas: o redirect_uri\n' +
          '  enviado não é idêntico ao cadastrado no dashboard, o code já foi usado,\n' +
          '  ou ele expirou. Confira o cadastro e rode de novo.'
        : error === 'invalid_client'
          ? '  invalid_client quer dizer que o client_id não confere com nenhuma app.\n' +
            '  Confira SPOTIFY_CLIENT_ID no .env.'
          : '  Rode o comando de novo; o code não é reaproveitável.'

    throw abort(
      `  O endpoint de token respondeu ${response.status}.\n\n` +
        `    error              ${error}\n` +
        `    error_description  ${description}\n\n` +
        hint,
      `troca do code falhou: ${error}`
    )
  }

  const refreshToken = asText(payload?.['refresh_token'])
  if (refreshToken === null) {
    throw abort(
      '  A troca deu 200 mas veio sem refresh_token, que é a única coisa que este\n' +
        '  comando existe para produzir. Sem ele o coletor não roda sozinho.\n\n' +
        `    resposta  ${raw.slice(0, 300)}`,
      'resposta do token sem refresh_token'
    )
  }

  const expiresIn = payload?.['expires_in']
  return {
    refreshToken,
    scope: asText(payload?.['scope']),
    expiresIn: typeof expiresIn === 'number' && Number.isFinite(expiresIn) ? expiresIn : null
  }
}

/** Data aproximada em que este refresh token morre. Seis meses da emissão. */
function expiryEstimate(from: Date): string {
  const dead = new Date(from)
  dead.setUTCMonth(dead.getUTCMonth() + 6)
  return dead.toISOString().slice(0, 10)
}

// ── comando ─────────────────────────────────────────────────────────────────

export async function runAuthorize(): Promise<void> {
  // Pede também o client secret, que o PKCE não usa: é melhor descobrir que o
  // .env está incompleto agora do que depois de o humano já ter feito o login.
  const { clientId, redirectUri } = loadSpotifyCredentials()
  const redirect = parseRedirect(redirectUri)

  // 32 bytes viram 43 caracteres em base64url — o mínimo que a RFC 7636 aceita.
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const state = randomBytes(16).toString('base64url')

  const authorizeUrl = new URL(AUTHORIZE_URL)
  authorizeUrl.search = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirect.uri,
    scope: SCOPES.join(' '),
    state,
    code_challenge_method: 'S256',
    code_challenge: challenge
  }).toString()

  out()
  out('playoff-collector — authorize')
  out()
  out('Authorization Code + PKCE, um usuário só (PRD §9).')
  out()
  out(`  client_id     ${clientId}`)
  out(`  redirect_uri  ${redirect.uri}`)
  out(`  escopos       ${SCOPES.join(' ')}`)
  out()
  out('O redirect_uri precisa estar cadastrado, caractere por caractere, em')
  out('Spotify Dashboard → sua app → Settings → Redirect URIs.')
  out()

  const code = await waitForCallback(redirect, state, () => {
    out(section('abra no navegador'))
    out()
    out(authorizeUrl.toString())
    out()
    out(`Escutando o callback em ${redirect.uri} — ${CALLBACK_TIMEOUT_MIN} minutos até desistir.`)
  })

  out()
  out('Callback recebido. Trocando o code pelo refresh token...')

  const issued = await exchangeCode({ clientId, redirect, code, verifier })
  const now = new Date()

  out()
  out(section('pronto'))
  out()
  out('Cole esta linha no .env da raiz do repo:')
  out()
  out(`COLLECTOR_SPOTIFY_REFRESH_TOKEN=${issued.refreshToken}`)
  out()
  out(`  escopos concedidos  ${issued.scope ?? '(o Spotify não informou)'}`)
  out(`  access token        vale ${issued.expiresIn ?? 3600}s (o coletor renova sozinho)`)
  out(`  emitido em          ${now.toISOString()}`)
  out()
  out(section('leia isto'))
  out()
  out('ESTE REFRESH TOKEN EXPIRA EM ~6 MESES.')
  out()
  out('Desde 20/07/2026 todo refresh token do Spotify vale seis meses, contados da')
  out('emissão. Renovar o access token não estende o prazo. Quando vencer, o endpoint')
  out('de token passa a responder 400 invalid_grant, o coletor para de coletar, e cada')
  out('dia parado é dado que não volta (PRD §3).')
  out()
  out(`  morre por volta de  ${expiryEstimate(now)}`)
  out('  o que fazer         rodar `npm run authorize` de novo e trocar a linha acima')
  out()
  out('Anote essa data em algum lugar que te cutuque. Nada aqui vai lembrar por você.')
  out()
  out('Mais duas coisas que valem os dez segundos de leitura:')
  out()
  out('  1. O Spotify pode devolver um refresh token NOVO a cada renovação e matar o')
  out('     antigo na hora. Quando o coletor avisar que rotacionou, atualize o .env')
  out('     imediatamente — senão ele segue rodando e só quebra na reinicialização')
  out('     seguinte, que é o pior momento possível para descobrir.')
  out('  2. Revogar o acesso em spotify.com/account/apps ou trocar a senha da conta')
  out('     produz exatamente o mesmo 400 invalid_grant. A saída é a mesma: rodar isto.')
  out()
}
