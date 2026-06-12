<script setup lang="ts">
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useCinematicStore } from '~/stores/cinematic'
import { useVinylPhysics } from '~/composables/useVinylPhysics'

/**
 * Disco Radiola (PRD Radiola §3) — vinil cromado giratório, capa do álbum
 * como rótulo, braço de toca-discos. Estado do player materializado em forma,
 * rotação e luz. Não é decoração: é o player visível.
 */
const props = withDefaults(defineProps<{
  /** Diâmetro do disco em px. */
  size?: number
  /** Mostra o braço (omitido em telas estreitas). */
  showArm?: boolean
  showShadow?: boolean
}>(), {
  size: 360,
  showArm: true,
  showShadow: true
})

const music = useMusicVisualStore()
const cinematic = useCinematicStore()
const physics = useVinylPhysics()

const rootEl = ref<HTMLElement | null>(null)
const groovesCanvas = ref<HTMLCanvasElement | null>(null)

// Em telas estreitas o braço some (PRD Radiola §3.4)
const armVisible = computed(() => props.showArm && props.size >= 300)
const armEngaged = computed(() => music.isPlaying && !!music.currentTrack)

// Ranhuras só em tiers altos (PRD Radiola §3.3, §14)
const drawGrooves = computed(() =>
  cinematic.performanceTier === 'high' || cinematic.performanceTier === 'ultra'
)

/** RPM-alvo derivado do estado do disco (PRD Radiola §3.2). */
function targetRpm (): number {
  if (cinematic.reducedMotion) return 0
  switch (music.vinylState) {
    case 'idle':
    case 'paused':
      return 0
    case 'loading':
      return 8
    case 'transitioning':
      return music.discRpm * 1.5
    case 'tension':
    case 'winner':
    case 'playing':
      return music.discRpm
    default:
      return 0
  }
}

// ─── Scratch easter egg (PRD Radiola §7.3): arrastar o disco gira manual ────
let scratchAngle = 0
let dragging = false
let lastX = 0

function onPointerDown (e: PointerEvent) {
  if (cinematic.reducedMotion) return
  dragging = true
  lastX = e.clientX
  rootEl.value?.setPointerCapture(e.pointerId)
}
function onPointerMove (e: PointerEvent) {
  if (!dragging) return
  scratchAngle += (e.clientX - lastX) * 0.6
  lastX = e.clientX
}
function onPointerUp (e: PointerEvent) {
  dragging = false
  rootEl.value?.releasePointerCapture?.(e.pointerId)
}

// ─── Loop de animação: escreve --disc-angle direto no DOM (sem re-render) ────
let rafId: number | null = null
let lastT = 0

function frame (t: number) {
  if (lastT === 0) lastT = t
  const dt = t - lastT
  lastT = t

  // Enquanto arrasta, o prato perde força (scrub manual domina)
  const base = physics.tick(dt, dragging ? 0 : targetRpm())
  if (!dragging) scratchAngle *= 0.9   // inércia: o scratch volta ao normal
  const angle = (base + scratchAngle) % 360

  if (rootEl.value) {
    rootEl.value.style.setProperty('--disc-angle', `${angle.toFixed(2)}deg`)
  }
  rafId = requestAnimationFrame(frame)
}

function startLoop () {
  if (rafId != null || !import.meta.client) return
  lastT = 0
  rafId = requestAnimationFrame(frame)
}

function stopLoop () {
  if (rafId != null) { cancelAnimationFrame(rafId); rafId = null }
}

// ─── Ranhuras: arcos concêntricos desenhados uma vez por tamanho ─────────────
function renderGrooves () {
  const canvas = groovesCanvas.value
  if (!canvas || !drawGrooves.value) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const d = props.size
  canvas.width = d * dpr
  canvas.height = d * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)

  const cx = d / 2
  const cy = d / 2
  const outer = d / 2 * 0.97
  const inner = d * 0.17   // raio do rótulo

  // Ranhuras: anéis finos, mais densos perto do rótulo, mais fracos no centro
  for (let r = inner; r < outer; r += 2.4) {
    const tNorm = (r - inner) / (outer - inner)
    const op = 0.04 + 0.1 * tNorm
    // Deformação senoidal leve → sensação analógica
    ctx.beginPath()
    ctx.strokeStyle = `rgba(255, 255, 255, ${op.toFixed(3)})`
    ctx.lineWidth = 0.7
    ctx.arc(cx, cy, r + Math.sin(r) * 0.3, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Duas marcas não-simétricas → a rotação fica perceptível mesmo sem capa
  for (const a of [0.6, 3.4]) {
    const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * outer, cy + Math.sin(a) * outer)
    grad.addColorStop(0, 'rgba(255,255,255,0)')
    grad.addColorStop(0.7, 'rgba(255,255,255,0.05)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.strokeStyle = grad
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(cx, cy, outer * 0.72, a, a + 0.5)
    ctx.stroke()
  }
}

// Vinyl Flip (PRD Radiola §7.1): virada 3D na troca de música
const flipping = ref(false)
watch(() => music.discFlipNonce, () => {
  if (cinematic.reducedMotion) return
  flipping.value = true
  setTimeout(() => { flipping.value = false }, 700)
})

onMounted(() => {
  renderGrooves()
  startLoop()
})

onBeforeUnmount(stopLoop)

watch(() => [props.size, drawGrooves.value], () => nextTick(renderGrooves))
</script>

<template>
  <div
    ref="rootEl"
    class="vinyl"
    :class="[
      `vinyl--${music.vinylVariant}`,
      { 'vinyl--beat': music.beatActive && !cinematic.reducedMotion, 'vinyl--flip': flipping }
    ]"
    :style="{ width: `${size}px`, height: `${size}px`, '--disc-d': `${size}px` }"
    :data-state="music.vinylState"
    aria-hidden="true"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <!-- Layer 0 — sombra de contato (estática) -->
    <div v-if="showShadow" class="vinyl__shadow" />

    <!-- Layer 1 — corpo do vinil + ranhuras (gira +angle) -->
    <div class="vinyl__body">
      <canvas v-if="drawGrooves" ref="groovesCanvas" class="vinyl__grooves" />
    </div>

    <!-- Layer 2 — reflexo cromático (gira em contra-sentido) -->
    <div class="vinyl__chrome" />

    <!-- Layer 3 — rótulo / capa do álbum (gira +angle) -->
    <div class="vinyl__label">
      <Transition name="cover-cut" mode="out-in">
        <img
          v-if="music.currentTrack?.coverUrl"
          :key="music.currentTrack.id"
          :src="music.currentTrack.coverUrl"
          class="vinyl__cover"
          alt=""
        >
        <div v-else :key="'mono'" class="vinyl__mono">
          <span>PO</span>
        </div>
      </Transition>
    </div>

    <!-- Spindle central (estático) -->
    <div class="vinyl__spindle" />

    <!-- Layer 4 — brilho especular fixo (não gira: a luz é fixa) -->
    <div class="vinyl__sheen" />

    <!-- Braço da radiola -->
    <VinylArm v-if="armVisible" :engaged="armEngaged" />
  </div>
</template>

<style scoped>
.vinyl {
  position: relative;
  --disc-angle: 0deg;
  flex-shrink: 0;
  transition: scale 0.12s var(--ease-liquid);
  transform-style: preserve-3d;
  perspective: 1400px;
}

/* Pulso de beat (PRD Radiola §5.6) */
.vinyl--beat {
  scale: 1.014;
}

/* Vinyl Flip (PRD Radiola §7.1): revela o "lado B" na virada de faixa */
.vinyl--flip {
  animation: vinyl-flip 0.7s var(--ease-cut);
}

@keyframes vinyl-flip {
  0%   { transform: rotateY(0deg); }
  50%  { transform: rotateY(90deg) scale(0.92); }
  100% { transform: rotateY(0deg); }
}

/* ── Sombra de contato ─────────────────────────────────────────────────── */
.vinyl__shadow {
  position: absolute;
  inset: 4%;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 58%, rgba(0, 0, 0, 0.6), transparent 70%);
  filter: blur(18px);
  transform: translateY(6%) scale(1.04);
  z-index: 0;
}

/* ── Corpo do vinil ────────────────────────────────────────────────────── */
.vinyl__body {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  /* CD holográfico: grafite escuro com bandas concêntricas sutis — base
     escura o bastante para a refração espectral aparecer vívida por cima */
  background:
    radial-gradient(circle at 50% 50%,
      #050506 0%, #050506 17%,
      #34353e 22%, #191a20 28%,
      #43444e 35%, #212229 45%,
      #4b4c57 55%, #1f2027 65%,
      #3d3e48 74%, #17181d 85%,
      #0c0c10 95%, #060608 100%);
  box-shadow:
    inset 0 0 var(--disc-d-inset, 40px) rgba(0, 0, 0, 0.75),
    0 var(--disc-shadow-y, 30px) var(--disc-shadow-blur, 70px) rgba(0, 0, 0, 0.7),
    0 0 60px var(--music-glow, transparent);
  transform: rotate(var(--disc-angle));
  z-index: 1;
}

.vinyl__grooves {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

/* ── Refração holográfica: espectro cônico mascarado num anel, como a
   superfície de dados de um CD pegando a luz (PRD §estética chrome) ────── */
.vinyl__chrome {
  position: absolute;
  inset: 7%;
  border-radius: 50%;
  /* espectro em arcos vivos com vãos escuros: refração de CD, não um anel
     uniforme (que de longe vira cinza) */
  background: conic-gradient(
    from 0deg,
    hsl(195 100% 60%) 0%, transparent 9%,
    hsl(280 100% 64%) 17%, transparent 26%,
    hsl(330 100% 62%) 35%, transparent 43%,
    hsl(48 100% 60%) 53%, transparent 61%,
    hsl(150 100% 56%) 71%, transparent 80%,
    hsl(210 100% 60%) 90%, transparent 99%
  );
  /* anel: centro limpo para o rótulo, borda esvaece no aro */
  -webkit-mask: radial-gradient(circle, transparent 26%, #000 33%, #000 92%, transparent 99%);
  mask: radial-gradient(circle, transparent 26%, #000 33%, #000 92%, transparent 99%);
  mix-blend-mode: screen;
  opacity: calc(0.78 + 0.22 * var(--music-reactivity, 0.4));
  transform: rotate(calc(var(--disc-angle) * -0.5));
  /* shimmer vivo mesmo com o disco parado */
  animation: holo-breathe 7s ease-in-out infinite alternate;
  z-index: 2;
}

@keyframes holo-breathe {
  from { filter: saturate(1.2) hue-rotate(0deg); transform: rotate(calc(var(--disc-angle) * -0.5)); }
  to   { filter: saturate(1.6) hue-rotate(50deg); transform: rotate(calc(var(--disc-angle) * -0.5 + 8deg)); }
}

/* Segundo brilho espectral suave — bloom iridescente perto da luz */
.vinyl__chrome::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(45% 38% at 36% 26%,
    hsla(280, 90%, 70%, 0.5), hsla(190, 90%, 65%, 0.25) 45%, transparent 72%);
  mix-blend-mode: screen;
}

/* ── Rótulo / capa ─────────────────────────────────────────────────────── */
.vinyl__label {
  position: absolute;
  inset: 33%;
  border-radius: 50%;
  overflow: hidden;
  transform: rotate(var(--disc-angle));
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    0 0 0 6px rgba(0, 0, 0, 0.55),
    0 0 0 7px rgba(255, 255, 255, 0.05);
  z-index: 3;
}

.vinyl__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Capa entra dessaturada — a cor vive no chrome e nas barras, não na UI */
  filter: saturate(0.55) contrast(1.05);
}

.vinyl__mono {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 40% 35%, #232323, #050505);
  color: var(--ink-dim);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: calc(var(--disc-d, 360px) * 0.05);
  letter-spacing: 0.1em;
}

/* ── Spindle central ───────────────────────────────────────────────────── */
.vinyl__spindle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2.4%;
  height: 2.4%;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #d8d8d8, #1a1a1a);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.5);
  z-index: 4;
}

/* ── Brilho especular fixo (luz no topo, não gira) ─────────────────────── */
.vinyl__sheen {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(40% 30% at 38% 22%, rgba(255, 255, 255, 0.22), transparent 70%),
    radial-gradient(60% 40% at 62% 82%, rgba(255, 255, 255, 0.05), transparent 70%);
  mix-blend-mode: screen;
  pointer-events: none;
  z-index: 5;
}

/* ── Variantes por humor: o mesmo CD prata, com viés de temperatura no
   metal (PRD Radiola §7.2) ─────────────────────────────────────────────── */
.vinyl--noir .vinyl__body {
  background: radial-gradient(circle at 50% 50%,
    #050507 0%, #050507 17%, #2f3340 22%, #161922 28%, #3a3f50 35%, #1c2029 45%,
    #42475a 55%, #1a1e27 65%, #353a48 74%, #14171e 85%, #0a0b10 95%, #050608 100%);
}
.vinyl--bright .vinyl__body {
  background: radial-gradient(circle at 50% 50%,
    #070605 0%, #070605 17%, #403a30 22%, #1f1c16 28%, #4e4736 35%, #28241b 45%,
    #564e3c 55%, #25221a 65%, #453f30 74%, #1c1a14 85%, #100e0a 95%, #080705 100%);
}
.vinyl--heavy .vinyl__body {
  background: radial-gradient(circle at 50% 50%,
    #070505 0%, #070505 17%, #403030 22%, #1f1616 28%, #4e3636 35%, #282020 45%,
    #564242 55%, #251a1a 65%, #453030 74%, #1c1414 85%, #100a0a 95%, #080505 100%);
}
.vinyl--minimal .vinyl__body {
  background: radial-gradient(circle at 50% 50%,
    #050506 0%, #050506 17%, #34353e 22%, #191a20 28%, #43444e 35%, #212229 45%,
    #4b4c57 55%, #1f2027 65%, #3d3e48 74%, #17181d 85%, #0c0c10 95%, #060608 100%);
}

/* ── Corte de capa na troca de faixa ───────────────────────────────────── */
.cover-cut-enter-active { transition: opacity 0.6s var(--ease-scene), filter 0.6s var(--ease-scene); }
.cover-cut-leave-active { transition: opacity 0.3s var(--ease-cut), filter 0.3s var(--ease-cut); }
.cover-cut-enter-from { opacity: 0; filter: blur(8px) saturate(0); }
.cover-cut-leave-to { opacity: 0; filter: blur(10px); }
</style>
