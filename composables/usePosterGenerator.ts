import type { SessionRecap } from '~/types/room'

/**
 * Room Poster Generator (PRD §5.7.7) — transforma a sessão em arte
 * compartilhável. Render 100% Canvas 2D, preto/branco, estética
 * chrome liquid, formato 1080×1350 (4:5, ideal pra compartilhar).
 */

const W = 1080
const H = 1350

function mono (ctx: CanvasRenderingContext2D, alpha: number) {
  return `rgba(242, 242, 242, ${alpha})`
}

/** Desenha o blob chrome como gradientes radiais sobrepostos. */
function drawChrome (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  // corpo metálico
  const body = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r)
  body.addColorStop(0, 'rgba(235, 235, 235, 0.95)')
  body.addColorStop(0.35, 'rgba(150, 150, 150, 0.85)')
  body.addColorStop(0.6, 'rgba(60, 60, 60, 0.9)')
  body.addColorStop(0.85, 'rgba(20, 20, 20, 0.95)')
  body.addColorStop(1, 'rgba(5, 5, 5, 1)')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(cx, cy, r, r * 0.92, -0.18, 0, Math.PI * 2)
  ctx.fill()

  // brilho especular
  const sheen = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.45, 0, cx - r * 0.4, cy - r * 0.45, r * 0.55)
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.75)')
  sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)')
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = sheen
  ctx.beginPath()
  ctx.ellipse(cx, cy, r, r * 0.92, -0.18, 0, Math.PI * 2)
  ctx.fill()

  // reflexo inferior frio
  const under = ctx.createRadialGradient(cx + r * 0.35, cy + r * 0.5, 0, cx + r * 0.35, cy + r * 0.5, r * 0.6)
  under.addColorStop(0, 'rgba(190, 190, 190, 0.3)')
  under.addColorStop(1, 'rgba(190, 190, 190, 0)')
  ctx.fillStyle = under
  ctx.beginPath()
  ctx.ellipse(cx, cy, r, r * 0.92, -0.18, 0, Math.PI * 2)
  ctx.fill()
}

function fmtDuration (ms: number): string {
  const min = Math.floor(ms / 60000)
  if (min < 60) return `${min}MIN`
  return `${Math.floor(min / 60)}H${String(min % 60).padStart(2, '0')}`
}

function fmtDate (ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

export function generateSessionPoster (recap: SessionRecap): string {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // ── Fundo preto absoluto + vinheta sutil ─────────────────────────────────
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)

  const vignette = ctx.createRadialGradient(W / 2, H * 0.42, 100, W / 2, H * 0.42, H * 0.75)
  vignette.addColorStop(0, 'rgba(18, 18, 18, 1)')
  vignette.addColorStop(1, 'rgba(0, 0, 0, 1)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, W, H)

  // ── Grid editorial sutil ─────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
  ctx.lineWidth = 1
  for (let i = 1; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo((W / 6) * i, 0); ctx.lineTo((W / 6) * i, H); ctx.stroke()
  }

  // ── Chrome blob atrás do título ──────────────────────────────────────────
  drawChrome(ctx, W / 2, 420, 300)

  // ── Barras cinematográficas ──────────────────────────────────────────────
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, 110)
  ctx.fillRect(0, H - 130, W, 130)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
  ctx.beginPath(); ctx.moveTo(0, 110); ctx.lineTo(W, 110); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, H - 130); ctx.lineTo(W, H - 130); ctx.stroke()

  // ── Microtextos da barra superior ────────────────────────────────────────
  ctx.font = '500 22px "JetBrains Mono", monospace'
  ctx.fillStyle = mono(ctx, 0.85)
  ctx.textAlign = 'left'
  ctx.fillText('P L A Y O F F   S Y S T E M', 48, 68)
  ctx.textAlign = 'right'
  ctx.fillStyle = mono(ctx, 0.45)
  ctx.fillText('LIVE SESSION RECAP', W - 48, 68)

  // ── Nome da sala (tipografia massiva, difference sobre o chrome) ─────────
  ctx.textAlign = 'center'
  ctx.globalCompositeOperation = 'difference'
  ctx.fillStyle = '#f2f2f2'
  const nameSize = recap.roomName.length > 14 ? 88 : 120
  ctx.font = `700 ${nameSize}px "Space Grotesk", sans-serif`
  ctx.fillText(recap.roomName, W / 2, 450, W - 80)
  ctx.globalCompositeOperation = 'source-over'

  ctx.font = '500 24px "JetBrains Mono", monospace'
  ctx.fillStyle = mono(ctx, 0.5)
  ctx.fillText(`${fmtDate(recap.createdAt)} — ${fmtDuration(recap.durationMs)} — ${recap.participantCount} SIGNALS`, W / 2, 520)

  // ── Top track ────────────────────────────────────────────────────────────
  let y = 640
  if (recap.topTrack) {
    ctx.font = '400 20px "JetBrains Mono", monospace'
    ctx.fillStyle = mono(ctx, 0.4)
    ctx.fillText('MOST VOTED SIGNAL', W / 2, y)
    y += 52
    ctx.font = '600 44px "Space Grotesk", sans-serif'
    ctx.fillStyle = mono(ctx, 0.95)
    ctx.fillText(recap.topTrack.track.title, W / 2, y, W - 120)
    y += 40
    ctx.font = '400 24px "JetBrains Mono", monospace'
    ctx.fillStyle = mono(ctx, 0.55)
    ctx.fillText(`${recap.topTrack.track.artist} — ${recap.topTrack.votesAtLock} VOTES`, W / 2, y, W - 120)
    y += 80
  }

  // ── Tracklist ────────────────────────────────────────────────────────────
  const list = recap.tracksPlayed.slice(0, 6)
  if (list.length > 0) {
    ctx.font = '400 20px "JetBrains Mono", monospace'
    ctx.fillStyle = mono(ctx, 0.4)
    ctx.fillText('SESSION TRACKLIST', W / 2, y)
    y += 44
    ctx.font = '500 28px "Space Grotesk", sans-serif'
    for (const [i, played] of list.entries()) {
      ctx.fillStyle = mono(ctx, 0.8)
      ctx.fillText(
        `${String(i + 1).padStart(2, '0')}  ${played.track.title} — ${played.track.artist}`,
        W / 2, y, W - 120
      )
      y += 42
    }
  } else {
    ctx.font = '400 24px "JetBrains Mono", monospace'
    ctx.fillStyle = mono(ctx, 0.35)
    ctx.fillText('NO TRACKS LOCKED THIS SESSION', W / 2, y)
  }

  // ── Destaques laterais ───────────────────────────────────────────────────
  ctx.font = '400 20px "JetBrains Mono", monospace'
  ctx.textAlign = 'left'
  if (recap.topAdder) {
    ctx.fillStyle = mono(ctx, 0.4)
    ctx.fillText('TOP CURATOR', 48, H - 220)
    ctx.fillStyle = mono(ctx, 0.85)
    ctx.fillText(recap.topAdder.name.toUpperCase(), 48, H - 188, 420)
  }
  ctx.textAlign = 'right'
  ctx.fillStyle = mono(ctx, 0.4)
  ctx.fillText('TOTAL VOTES', W - 48, H - 220)
  ctx.fillStyle = mono(ctx, 0.85)
  ctx.fillText(String(recap.totalVotes), W - 48, H - 188)

  // ── Barra inferior: frase técnica + link ─────────────────────────────────
  ctx.textAlign = 'left'
  ctx.font = '400 20px "JetBrains Mono", monospace'
  ctx.fillStyle = mono(ctx, 0.45)
  ctx.fillText('CHROME AUDIO ENGINE — SIGNAL ARCHIVED', 48, H - 56)
  ctx.textAlign = 'right'
  ctx.fillStyle = mono(ctx, 0.7)
  ctx.fillText(`PLAYOFF.ROOM/${recap.roomId}`, W - 48, H - 56)

  return canvas.toDataURL('image/png')
}

export function downloadPoster (recap: SessionRecap) {
  const url = generateSessionPoster(recap)
  const a = document.createElement('a')
  a.href = url
  a.download = `playoff-session-${recap.roomId}.png`
  a.click()
}
