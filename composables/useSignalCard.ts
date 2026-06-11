import type { SessionRecap } from '~/types/room'

/**
 * Personal Signal Card (PRD Radiola §10.5) — cartão pessoal da sessão.
 * Diferente do poster da sala: mostra só as SUAS contribuições.
 * Canvas 1080×1080 (quadrado, ideal pra stories), preto/branco + chrome.
 */

const S = 1080

function mono (alpha: number) {
  return `rgba(242, 242, 242, ${alpha})`
}

function fmtDuration (ms: number): string {
  const min = Math.floor(ms / 60000)
  if (min < 60) return `${min}MIN`
  return `${Math.floor(min / 60)}H${String(min % 60).padStart(2, '0')}`
}

export function generateSignalCard (recap: SessionRecap, myName: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')!

  // Minhas faixas (as que EU adicionei)
  const mine = recap.tracksPlayed.filter(p => p.addedByName === myName)
  const myTop = mine.length > 0
    ? [...mine].sort((a, b) => b.votesAtLock - a.votesAtLock)[0]
    : null
  const myWins = mine.length

  // ── Fundo preto + chrome blob frio ──────────────────────────────────────
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, S, S)

  const blob = ctx.createRadialGradient(S / 2, S * 0.32, 40, S / 2, S * 0.32, S * 0.5)
  blob.addColorStop(0, 'rgba(230, 230, 230, 0.9)')
  blob.addColorStop(0.4, 'rgba(120, 120, 120, 0.6)')
  blob.addColorStop(0.7, 'rgba(40, 40, 40, 0.7)')
  blob.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = blob
  ctx.beginPath()
  ctx.ellipse(S / 2, S * 0.32, S * 0.34, S * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()

  // ── Barras cinematográficas ─────────────────────────────────────────────
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, S, 90)
  ctx.fillRect(0, S - 100, S, 100)
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.beginPath(); ctx.moveTo(0, 90); ctx.lineTo(S, 90); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, S - 100); ctx.lineTo(S, S - 100); ctx.stroke()

  // ── Topo ────────────────────────────────────────────────────────────────
  ctx.font = '500 22px "JetBrains Mono", monospace'
  ctx.fillStyle = mono(0.85)
  ctx.textAlign = 'left'
  ctx.fillText('P L A Y O F F   S I G N A L   C A R D', 44, 56)
  ctx.textAlign = 'right'
  ctx.fillStyle = mono(0.45)
  ctx.fillText(recap.roomName, S - 44, 56)

  // ── Nome (difference sobre o chrome) ────────────────────────────────────
  ctx.textAlign = 'center'
  ctx.globalCompositeOperation = 'difference'
  ctx.fillStyle = '#f2f2f2'
  const nameSize = myName.length > 12 ? 84 : 116
  ctx.font = `700 ${nameSize}px "Space Grotesk", sans-serif`
  ctx.fillText(myName.toUpperCase(), S / 2, S * 0.34, S - 100)
  ctx.globalCompositeOperation = 'source-over'

  ctx.font = '500 24px "JetBrains Mono", monospace'
  ctx.fillStyle = mono(0.5)
  ctx.fillText(`${fmtDuration(recap.durationMs)} SESSION · ${recap.participantCount} SIGNALS`, S / 2, S * 0.34 + 56)

  // ── Estatísticas pessoais ───────────────────────────────────────────────
  let y = S * 0.52
  ctx.font = '400 22px "JetBrains Mono", monospace'
  ctx.fillStyle = mono(0.4)
  ctx.fillText('YOUR TRACKS LOCKED', S / 2, y)
  y += 70
  ctx.font = '700 96px "Space Grotesk", sans-serif'
  ctx.fillStyle = mono(0.95)
  ctx.fillText(String(myWins), S / 2, y)

  if (myTop) {
    y += 70
    ctx.font = '400 22px "JetBrains Mono", monospace'
    ctx.fillStyle = mono(0.4)
    ctx.fillText('YOUR TOP SIGNAL', S / 2, y)
    y += 48
    ctx.font = '600 40px "Space Grotesk", sans-serif'
    ctx.fillStyle = mono(0.9)
    ctx.fillText(myTop.track.title, S / 2, y, S - 120)
    y += 38
    ctx.font = '400 24px "JetBrains Mono", monospace'
    ctx.fillStyle = mono(0.55)
    ctx.fillText(`${myTop.track.artist} — ${myTop.votesAtLock} VOTES`, S / 2, y, S - 120)
  } else {
    y += 70
    ctx.font = '400 24px "JetBrains Mono", monospace'
    ctx.fillStyle = mono(0.35)
    ctx.fillText('NO TRACKS LOCKED — NEXT TIME', S / 2, y)
  }

  // ── Rodapé ──────────────────────────────────────────────────────────────
  ctx.textAlign = 'left'
  ctx.font = '400 20px "JetBrains Mono", monospace'
  ctx.fillStyle = mono(0.45)
  ctx.fillText('CHROME AUDIO ENGINE', 44, S - 46)
  ctx.textAlign = 'right'
  ctx.fillStyle = mono(0.7)
  ctx.fillText(`PLAYOFF.ROOM/${recap.roomId}`, S - 44, S - 46)

  return canvas.toDataURL('image/png')
}

export function downloadSignalCard (recap: SessionRecap, myName: string) {
  const url = generateSignalCard(recap, myName)
  const a = document.createElement('a')
  a.href = url
  a.download = `playoff-signal-${myName}-${recap.roomId}.png`
  a.click()
}
