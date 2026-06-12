<script setup lang="ts">
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useCinematicStore } from '~/stores/cinematic'
import { useVinylPhysics } from '~/composables/useVinylPhysics'

/**
 * Disco Radiola (PRD Radiola §3) — vinil preto premium giratório, capa do álbum
 * como rótulo, braço de toca-discos. Estado do player materializado em forma,
 * rotação e luz. Não é decoração: é o player visível. A cor da música vive no
 * glow ao redor e no rótulo (capa) — o corpo é vinil preto físico, glossy.
 */
const props = withDefaults(defineProps<{
  /** Diâmetro do disco em px. */
  size?: number
  /** Mostra o braço (omitido em telas estreitas). */
  showArm?: boolean
  showShadow?: boolean
  /** RPM quando não há faixa (landing: o disco nunca está morto). */
  idleRpm?: number
}>(), {
  size: 360,
  showArm: true,
  showShadow: true,
  idleRpm: 0
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
      return props.idleRpm
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
  const outer = d / 2 * 0.965
  const inner = d * 0.18   // raio do rótulo

  // Ranhuras finas e densas → sensação analógica real de vinil
  for (let r = inner; r < outer; r += 1.7) {
    const tNorm = (r - inner) / (outer - inner)
    // sulcos catando luz: alterna fino claro / sombra fina
    const op = 0.03 + 0.085 * tNorm
    ctx.beginPath()
    ctx.strokeStyle = `rgba(255, 255, 255, ${op.toFixed(3)})`
    ctx.lineWidth = 0.6
    ctx.arc(cx, cy, r + Math.sin(r * 0.7) * 0.25, 0, Math.PI * 2)
    ctx.stroke()

    ctx.beginPath()
    ctx.strokeStyle = `rgba(0, 0, 0, ${(op * 0.9).toFixed(3)})`
    ctx.lineWidth = 0.6
    ctx.arc(cx, cy, r + 0.85, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Marcas não-simétricas → a rotação fica perceptível mesmo sem capa
  for (const a of [0.6, 3.4]) {
    const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * outer, cy + Math.sin(a) * outer)
    grad.addColorStop(0, 'rgba(255,255,255,0)')
    grad.addColorStop(0.7, 'rgba(255,255,255,0.06)')
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
    <!-- sombra de contato (fixa) -->
    <div v-if="showShadow" class="vinyl__shadow" />

    <!-- corpo do vinil: material + sulcos + reflexo de luz (gira +angle) -->
    <div class="vinyl__body">
      <canvas v-if="drawGrooves" ref="groovesCanvas" class="vinyl__grooves" />
      <div class="vinyl__sheen-spin" />
    </div>

    <!-- rótulo / capa do álbum (gira +angle) -->
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
      <div class="vinyl__label-ring" />
    </div>

    <!-- spindle central (fixo) -->
    <div class="vinyl__spindle" />

    <!-- vidro especular fixo (a luz não gira) -->
    <div class="vinyl__gloss" />

    <!-- luz de borda fixa: separa o vinil preto do fundo preto -->
    <div class="vinyl__rim" />

    <!-- braço da radiola -->
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
  scale: 1.012;
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
  inset: 1%;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 56%, rgba(0, 0, 0, 0.72), transparent 72%);
  filter: blur(26px);
  transform: translateY(7%) scale(1.06);
  z-index: 0;
}

/* ── Corpo do vinil ────────────────────────────────────────────────────── */
.vinyl__body {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  /* Vinil preto físico: bandas concêntricas matte/glossy alternadas + lábio do aro */
  background:
    radial-gradient(circle at 50% 50%,
      #121216 0 16.5%,
      #050506 17%, #0b0b0f 23%,
      #050506 31%, #0c0c11 39%,
      #050506 47%, #0b0b0f 55%,
      #050506 63%, #0a0a0e 71%,
      #050506 79%, #090909 89%,
      #040405 95.5%, #010102 100%);
  box-shadow:
    inset 0 0 0 1.5px rgba(255, 255, 255, 0.05),
    inset 0 0 70px rgba(0, 0, 0, 0.92),
    0 34px 80px rgba(0, 0, 0, 0.72),
    0 0 70px var(--music-glow, transparent);
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

/* ── Reflexo de luz que varre o vinil (monocromático, gira com o corpo) ──── */
.vinyl__sheen-spin {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    rgba(255, 255, 255, 0) 0deg,
    rgba(255, 255, 255, 0.13) 12deg,
    rgba(255, 255, 255, 0) 44deg,
    rgba(255, 255, 255, 0) 150deg,
    rgba(255, 255, 255, 0.06) 170deg,
    rgba(255, 255, 255, 0) 202deg,
    rgba(255, 255, 255, 0) 320deg,
    rgba(255, 255, 255, 0.09) 342deg,
    rgba(255, 255, 255, 0) 360deg
  );
  -webkit-mask: radial-gradient(circle, transparent 22%, #000 30%, #000 95%, transparent 100%);
  mask: radial-gradient(circle, transparent 22%, #000 30%, #000 95%, transparent 100%);
  mix-blend-mode: screen;
  opacity: 0.9;
}

/* ── Rótulo / capa ─────────────────────────────────────────────────────── */
.vinyl__label {
  position: absolute;
  inset: 33%;
  border-radius: 50%;
  overflow: hidden;
  transform: rotate(var(--disc-angle));
  background: #0a0a0a;
  box-shadow:
    0 0 0 4px #060607,
    0 0 0 5px rgba(255, 255, 255, 0.06),
    inset 0 6px 16px rgba(0, 0, 0, 0.55);
  z-index: 3;
}

.vinyl__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* A capa é a alma do disco: cor quase natural, levemente cinematográfica */
  filter: saturate(0.96) contrast(1.04) brightness(0.97);
}

.vinyl__mono {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 40% 35%, #242424, #050505);
  color: var(--ink-dim);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: calc(var(--disc-d, 360px) * 0.05);
  letter-spacing: 0.1em;
}

/* Anel cravado do rótulo — dá o relevo de etiqueta colada no vinil */
.vinyl__label-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
  pointer-events: none;
}

/* ── Spindle central (furo do prato) ───────────────────────────────────── */
.vinyl__spindle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 3%;
  height: 3%;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(circle at 42% 38%, #34343a, #050506 72%);
  box-shadow:
    inset 0 0 3px rgba(0, 0, 0, 0.95),
    0 0 0 1px rgba(255, 255, 255, 0.14),
    0 1px 2px rgba(255, 255, 255, 0.2);
  z-index: 4;
}

/* ── Vidro especular fixo (a luz no topo não gira) ─────────────────────── */
.vinyl__gloss {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(68% 48% at 32% 19%, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.04) 38%, transparent 62%),
    radial-gradient(52% 40% at 72% 86%, rgba(255, 255, 255, 0.05), transparent 70%);
  mix-blend-mode: screen;
  pointer-events: none;
  z-index: 5;
}

/* ── Luz de borda (rim light) — o aro pega luz fria de cima/esquerda e o
   reflexo da cor da música embaixo; sem ela o vinil preto some no fundo OLED ── */
.vinyl__rim {
  position: absolute;
  inset: -1px;
  border-radius: 50%;
  background:
    conic-gradient(from 215deg,
      rgba(255, 255, 255, 0) 0deg,
      rgba(255, 255, 255, 0.34) 28deg,
      rgba(255, 255, 255, 0.1) 72deg,
      rgba(255, 255, 255, 0) 130deg,
      rgba(255, 255, 255, 0) 180deg,
      var(--music-glow, rgba(255, 255, 255, 0.1)) 235deg,
      rgba(255, 255, 255, 0) 300deg);
  -webkit-mask: radial-gradient(closest-side, transparent 96.4%, #000 98.2%);
  mask: radial-gradient(closest-side, transparent 96.4%, #000 98.2%);
  pointer-events: none;
  z-index: 6;
}

/* ── Variantes por humor: vinil preto com viés de temperatura sutil no glow
   (PRD Radiola §7.2) — sem arco-íris; a cor real vem da capa + --music-glow ── */
.vinyl--bright .vinyl__body { box-shadow:
  inset 0 0 0 1.5px rgba(255, 245, 225, 0.06),
  inset 0 0 70px rgba(0, 0, 0, 0.92),
  0 34px 80px rgba(0, 0, 0, 0.72),
  0 0 72px var(--music-glow, rgba(255, 220, 180, 0.12)); }

.vinyl--heavy .vinyl__body { box-shadow:
  inset 0 0 0 1.5px rgba(255, 220, 220, 0.06),
  inset 0 0 70px rgba(0, 0, 0, 0.94),
  0 34px 80px rgba(0, 0, 0, 0.75),
  0 0 72px var(--music-glow, rgba(255, 150, 150, 0.12)); }

/* ── Corte de capa na troca de faixa ───────────────────────────────────── */
.cover-cut-enter-active { transition: opacity 0.6s var(--ease-scene), filter 0.6s var(--ease-scene); }
.cover-cut-leave-active { transition: opacity 0.3s var(--ease-cut), filter 0.3s var(--ease-cut); }
.cover-cut-enter-from { opacity: 0; filter: blur(8px) saturate(0); }
.cover-cut-leave-to { opacity: 0; filter: blur(10px); }
</style>
