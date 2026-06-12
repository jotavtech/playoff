import type { AudioAnalysisFrame } from '~/types/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'

/**
 * Audio Analyser Engine (PRD Radiola §5.2) — singleton.
 *
 * Realidade técnica: o Spotify Web Playback SDK toca mídia criptografada (EME)
 * que NÃO pode ser grampeada pela Web Audio API. Então:
 *   • Preview de 30s (HTMLAudioElement nosso) → FFT real via AnalyserNode.
 *   • Premium SDK / visual-only → quadro sintético convincente, dirigido por
 *     BPM + progresso + camadas de ruído. O olho não distingue, e o sistema
 *     inteiro (disco, barras, aberração) ganha pulso.
 *
 * Um único rAF alimenta todos os assinantes (visualizer, reator global do beat).
 */

const BANDS = 48

let audioCtx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let sourceNode: MediaElementAudioSourceNode | null = null
let attachedEl: HTMLMediaElement | null = null
let freqData: Uint8Array | null = null

// ─── Equalizer (SPEC 07) ─────────────────────────────────────────────────────
// Filtros inseridos entre o source e o analyser. Só afetam o áudio quando há um
// elemento real grampeado (preview de 30s). No SDK Premium (EME/DRM) não há grafo
// acessível, então o preset é só selecionado/persistido — limitação informada.
const EQ_FREQS = [60, 230, 910, 3000, 14000]
let eqFilters: BiquadFilterNode[] = []
let eqGains: number[] = new Array(EQ_FREQS.length).fill(0)

/** Monta a cadeia de EQ e devolve o nó de saída (ou o próprio input se falhar). */
function buildEqChain (ctx: AudioContext, input: AudioNode): AudioNode {
  try {
    eqFilters = EQ_FREQS.map((freq, i) => {
      const f = ctx.createBiquadFilter()
      f.type = i === 0 ? 'lowshelf' : i === EQ_FREQS.length - 1 ? 'highshelf' : 'peaking'
      f.frequency.value = freq
      f.Q.value = 1
      f.gain.value = eqGains[i] ?? 0
      return f
    })
    let node: AudioNode = input
    for (const f of eqFilters) { node.connect(f); node = f }
    return node
  } catch {
    eqFilters = []
    return input
  }
}

let rafId: number | null = null
let subscribers = new Set<(frame: AudioAnalysisFrame, beat: boolean) => void>()
let refCount = 0

// Estado do beat detector (PRD Radiola §5.6)
const energyHistory: number[] = []
const HISTORY = 43
let lastBeatAt = 0
const beatIntervals: number[] = []

// Quadro reutilizado (evita alocar array a cada frame)
const frame: AudioAnalysisFrame = { bands: new Array(BANDS).fill(0), energy: 0, bass: 0 }

/** Conecta um elemento de áudio real (preview) para análise FFT verdadeira. */
function attachElement (el: HTMLMediaElement) {
  if (!import.meta.client) return
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})

    // Um elemento só pode ter um MediaElementSource — recria se trocou
    if (attachedEl !== el) {
      detachElement()
      sourceNode = audioCtx.createMediaElementSource(el)
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.75
      freqData = new Uint8Array(analyser.frequencyBinCount)
      // EQ (SPEC 07): source → [filtros] → analyser → destination
      const eqOut = buildEqChain(audioCtx, sourceNode)
      eqOut.connect(analyser)
      analyser.connect(audioCtx.destination)
      attachedEl = el
    }
  } catch {
    // Falha de Web Audio (autoplay policy, CORS) → segue no modo sintético
    detachElement()
  }
}

function detachElement () {
  try { sourceNode?.disconnect() } catch { /* noop */ }
  try { eqFilters.forEach(f => f.disconnect()) } catch { /* noop */ }
  try { analyser?.disconnect() } catch { /* noop */ }
  sourceNode = null
  eqFilters = []
  analyser = null
  freqData = null
  attachedEl = null
}

/** Índices log-espaçados para mapear bins FFT → bandas (PRD Radiola §5.4). */
function logBandRanges (bins: number): [number, number][] {
  const ranges: [number, number][] = []
  const minF = 2
  const maxF = bins * 0.85
  for (let i = 0; i < BANDS; i++) {
    const lo = minF * Math.pow(maxF / minF, i / BANDS)
    const hi = minF * Math.pow(maxF / minF, (i + 1) / BANDS)
    ranges.push([Math.floor(lo), Math.max(Math.floor(lo) + 1, Math.floor(hi))])
  }
  return ranges
}
let cachedRanges: [number, number][] | null = null

/** Lê o quadro real do AnalyserNode. */
function readReal (): void {
  if (!analyser || !freqData) return
  analyser.getByteFrequencyData(freqData as Uint8Array<ArrayBuffer>)
  if (!cachedRanges) cachedRanges = logBandRanges(freqData.length)

  let energy = 0
  let bass = 0
  for (let i = 0; i < BANDS; i++) {
    const [lo, hi] = cachedRanges[i]
    let sum = 0
    for (let j = lo; j < hi; j++) sum += freqData[j]
    const v = sum / (hi - lo) / 255
    frame.bands[i] = v
    energy += v
    if (i < BANDS * 0.18) bass += v
  }
  frame.energy = energy / BANDS
  frame.bass = bass / Math.max(1, Math.floor(BANDS * 0.18))
}

/** Sintetiza um quadro convincente quando não há FFT real (PRD Radiola §5.2). */
function synth (music: ReturnType<typeof useMusicVisualStore>): void {
  const now = performance.now() / 1000
  const bpm = music.bpm || 120
  const beatHz = bpm / 60
  const beatPhase = (now * beatHz) % 1
  // Envelope de batida: ataque rápido, decaimento exponencial
  const kick = Math.exp(-beatPhase * 6)
  const swing = 0.5 + 0.5 * Math.sin(now * 1.3)

  let energy = 0
  let bass = 0
  for (let i = 0; i < BANDS; i++) {
    const t = i / BANDS
    // Graves seguem o kick; médios ondulam; agudos cintilam com ruído
    const lowEnd = (1 - t) * kick * 0.9
    const midBody = Math.sin(now * (2 + t * 5) + i) * 0.5 + 0.5
    const mid = Math.max(0, midBody - 0.4) * (1 - Math.abs(t - 0.4)) * swing
    const air = Math.random() * 0.12 * t
    let v = lowEnd + mid * 0.8 + air
    // Curva de palco: extremos mais baixos, centro mais alto
    v *= 0.45 + 0.55 * Math.sin(t * Math.PI)
    v = Math.min(1, v)
    // Suaviza com o valor anterior (lerp)
    frame.bands[i] += (v - frame.bands[i]) * 0.35
    energy += frame.bands[i]
    if (t < 0.18) bass += frame.bands[i]
  }
  frame.energy = energy / BANDS
  frame.bass = bass / Math.max(1, Math.floor(BANDS * 0.18))
}

/** Quadro silencioso decaindo a zero (pausado/idle). */
function decay (): void {
  let energy = 0
  for (let i = 0; i < BANDS; i++) {
    frame.bands[i] *= 0.85
    energy += frame.bands[i]
  }
  frame.energy = energy / BANDS
  frame.bass *= 0.85
}

/** Beat detection sobre a energia de grave (PRD Radiola §5.6). */
function detectBeat (): boolean {
  energyHistory.push(frame.bass)
  if (energyHistory.length > HISTORY) energyHistory.shift()
  const avg = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length
  const now = performance.now()
  // Pico de grave + intervalo mínimo (evita disparo duplo)
  if (frame.bass > avg * 1.4 && frame.bass > 0.12 && now - lastBeatAt > 220) {
    if (lastBeatAt > 0) {
      const interval = now - lastBeatAt
      beatIntervals.push(interval)
      if (beatIntervals.length > 8) beatIntervals.shift()
    }
    lastBeatAt = now
    return true
  }
  return false
}

/** Estima BPM pela mediana dos intervalos entre beats (modo preview real). */
function estimateBpm (): number {
  if (beatIntervals.length < 4) return 0
  const sorted = [...beatIntervals].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const bpm = 60000 / median
  return bpm > 60 && bpm < 200 ? bpm : 0
}

function tick () {
  const music = useMusicVisualStore()

  if (music.isPlaying) {
    if (analyser && attachedEl && !attachedEl.paused) {
      readReal()
      const est = estimateBpm()
      if (est && !music.bpm) music.setBpm(est)
    } else {
      synth(music)
    }
  } else {
    decay()
  }

  const beat = music.isPlaying ? detectBeat() : false
  if (import.meta.client && document?.documentElement) {
    document.documentElement.style.setProperty('--viz-energy', frame.energy.toFixed(3))
  }
  subscribers.forEach(fn => fn(frame, beat))

  rafId = requestAnimationFrame(tick)
}

export function useAudioAnalyser () {
  function start () {
    refCount++
    if (rafId == null && import.meta.client) rafId = requestAnimationFrame(tick)
  }

  function stop () {
    refCount = Math.max(0, refCount - 1)
    if (refCount === 0 && rafId != null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function subscribe (fn: (frame: AudioAnalysisFrame, beat: boolean) => void): () => void {
    subscribers.add(fn)
    return () => subscribers.delete(fn)
  }

  /** SPEC 07: atualiza os ganhos (dB) do EQ ao vivo e guarda para futuros attaches. */
  function setEqGains (gains: number[]) {
    eqGains = EQ_FREQS.map((_, i) => gains[i] ?? 0)
    eqFilters.forEach((f, i) => {
      try { f.gain.value = eqGains[i] } catch { /* noop */ }
    })
  }

  /** SPEC 07: o EQ realmente afeta o áudio agora? (preview grampeado + filtros). */
  function eqAvailable (): boolean {
    return !!attachedEl && eqFilters.length > 0
  }

  return {
    start, stop, subscribe, attachElement, detachElement, bandCount: BANDS,
    setEqGains, eqAvailable, eqFreqs: EQ_FREQS
  }
}
