import { extractChromaticPalette } from '~/composables/usePaletteExtractor'
import { useMusicVisualStore } from '~/stores/musicVisual'

/**
 * Demo Signal — carrega uma faixa real pelo MESMO pipeline do Spotify.
 * Usado para demonstração quando o OAuth não está disponível (ex.: gravação
 * headless). Gera uma capa procedural, extrai a cor por Canvas (Chromatic
 * Engine de verdade) e dirige disco + visualizer + beat como uma faixa real.
 */

let progressTimer: ReturnType<typeof setInterval> | null = null

/** Gera uma capa procedural no clima de "Songs for the Deaf" (vermelho/preto). */
function makeCover (): string {
  const c = document.createElement('canvas')
  c.width = c.height = 320
  const ctx = c.getContext('2d')!

  // Base vermelho-sangue radial sobre preto
  const g = ctx.createRadialGradient(160, 130, 20, 160, 160, 240)
  g.addColorStop(0, '#c41f1a')
  g.addColorStop(0.45, '#7e1410')
  g.addColorStop(0.8, '#2a0807')
  g.addColorStop(1, '#080302')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 320, 320)

  // Faixa de horizonte mais clara (deserto)
  const h = ctx.createLinearGradient(0, 150, 0, 200)
  h.addColorStop(0, 'rgba(220, 90, 60, 0)')
  h.addColorStop(0.5, 'rgba(230, 120, 70, 0.4)')
  h.addColorStop(1, 'rgba(220, 90, 60, 0)')
  ctx.fillStyle = h
  ctx.fillRect(0, 150, 320, 50)

  // Grão / poeira
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * 320
    const y = Math.random() * 320
    const a = Math.random() * 0.12
    ctx.fillStyle = Math.random() > 0.5
      ? `rgba(255, 180, 120, ${a})`
      : `rgba(0, 0, 0, ${a * 1.6})`
    ctx.fillRect(x, y, 1.4, 1.4)
  }

  // Vinheta
  const v = ctx.createRadialGradient(160, 160, 120, 160, 160, 230)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(0,0,0,0.7)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, 320, 320)

  return c.toDataURL('image/png')
}

export async function loadGoWithTheFlow () {
  if (!import.meta.client) return
  const music = useMusicVisualStore()

  const coverUrl = makeCover()

  // Pipeline real: extrai a cor da capa via Canvas (Chromatic Engine)
  const chroma = await extractChromaticPalette(coverUrl)
  music.setChromatic(chroma)
  music.currentMood = 'fast'   // riff motorik, energia alta
  music.setBpm(152)            // BPM real de Go With The Flow

  await music.setTrack({
    id: 'demo-gwtf',
    title: 'GO WITH THE FLOW',
    artist: 'QUEENS OF THE STONE AGE',
    album: 'SONGS FOR THE DEAF',
    coverUrl,
    durationMs: 3 * 60 * 1000 + 7 * 1000  // 3:07
  })

  // Progresso (visual-only — sem áudio, mas o synth do analyser dá pulso)
  if (progressTimer) clearInterval(progressTimer)
  progressTimer = setInterval(() => {
    if (!music.isPlaying || !music.currentTrack) return
    music.progressMs += 1000
    if (music.progressMs >= music.currentTrack.durationMs) music.progressMs = 0
  }, 1000)
}

export function stopDemoSignal () {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null }
}
