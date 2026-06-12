<script setup lang="ts">
type MechanicalDiscMode =
  | 'landing'
  | 'loading-profile'
  | 'battle-reveal'
  | 'preview'
  | 'voting'
  | 'result'
  | 'champion'
  | 'paused'

const props = withDefaults(defineProps<{
  title?: string
  artist?: string
  coverUrl?: string | null
  isPlaying?: boolean
  votes?: number
  flowIndex?: number
  progress?: number
  sessionLabel?: string
  mode?: MechanicalDiscMode
}>(), {
  title: 'Go With The Flow',
  artist: 'Queens of the Stone Age',
  coverUrl: null,
  isPlaying: true,
  votes: 42,
  flowIndex: 5,
  progress: 0.38,
  sessionLabel: 'Session 2026 / Live',
  mode: 'landing'
})

const emit = defineEmits<{
  vote: []
  control: [action: 'previous' | 'preview' | 'next']
}>()

const tiltX = ref(0)
const tiltY = ref(0)
const lastAction = ref('')
let actionTimer: ReturnType<typeof setTimeout> | null = null

const statusText = computed(() => {
  switch (props.mode) {
    case 'loading-profile': return 'ANALYZING PROFILE'
    case 'battle-reveal': return 'BATTLE SIGNAL'
    case 'preview': return 'PREVIEW CHANNEL'
    case 'voting': return 'VOTE WINDOW'
    case 'result': return 'WINNER LOCKED'
    case 'champion': return 'CHAMPION'
    case 'paused': return 'SIGNAL HELD'
    default: return 'NOW PLAYING DEMO'
  }
})

const clampedProgress = computed(() => Math.max(0, Math.min(1, props.progress)))
const displayTitle = computed(() => props.title || 'Untitled Signal')
const displayArtist = computed(() => props.artist || 'Unknown Artist')
const coverStyle = computed(() => props.coverUrl
  ? { backgroundImage: `url(${props.coverUrl})` }
  : {}
)
const parallaxStyle = computed(() => ({
  '--tilt-x': `${tiltX.value}deg`,
  '--tilt-y': `${tiltY.value}deg`,
  '--flow-progress': `${clampedProgress.value * 100}%`
}))

function onPointerMove (event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width - 0.5
  const y = (event.clientY - rect.top) / rect.height - 0.5
  tiltX.value = Number((-y * 5).toFixed(2))
  tiltY.value = Number((x * 7).toFixed(2))
}

function resetTilt () {
  tiltX.value = 0
  tiltY.value = 0
}

function flashAction (label: string) {
  lastAction.value = label
  if (actionTimer) clearTimeout(actionTimer)
  actionTimer = setTimeout(() => { lastAction.value = '' }, 1500)
}

function onVote () {
  flashAction('VOTE PULSE SENT')
  emit('vote')
}

function onControl (action: 'previous' | 'preview' | 'next') {
  flashAction(action === 'preview' ? 'PREVIEW ARMED' : 'FLOW SHIFTED')
  emit('control', action)
}

onBeforeUnmount(() => {
  if (actionTimer) clearTimeout(actionTimer)
})
</script>

<template>
  <section
    class="mechanical-disc"
    :class="{ 'mechanical-disc--playing': isPlaying }"
    :data-mode="mode"
    :style="parallaxStyle"
    aria-label="Playoff mechanical disc"
    @pointermove="onPointerMove"
    @pointerleave="resetTilt"
  >
    <div class="mechanical-disc__case">
      <span v-for="corner in 4" :key="corner" class="mechanical-disc__screw" aria-hidden="true" />

      <div class="mechanical-disc__brand">
        <span class="microtext">{{ sessionLabel }}</span>
        <strong>PLAYOFF</strong>
      </div>

      <div class="mechanical-disc__assembly">
        <div class="mechanical-disc__rails" aria-hidden="true" />
        <div class="mechanical-disc__disc-bay">
          <div class="mechanical-disc__disc-shadow" aria-hidden="true" />
          <div class="mechanical-disc__rotor">
            <div class="mechanical-disc__platter">
              <div class="mechanical-disc__holo" />
              <div class="mechanical-disc__cover" :style="coverStyle">
                <span v-if="!coverUrl">PO</span>
              </div>
              <div class="mechanical-disc__spindle" />
            </div>
          </div>
          <div class="mechanical-disc__clamp" aria-hidden="true" />
        </div>

        <aside class="mechanical-disc__module">
          <div class="mechanical-disc__oled">
            <span class="microtext">{{ lastAction || statusText }}</span>
            <strong :title="displayTitle">{{ displayTitle }}</strong>
            <small :title="displayArtist">{{ displayArtist }}</small>
          </div>

          <div class="mechanical-disc__wave" aria-hidden="true">
            <span
              v-for="bar in 18"
              :key="bar"
              :style="{ '--i': bar, '--h': `${18 + (bar % 7) * 9}%` }"
            />
          </div>

          <div class="mechanical-disc__progress" aria-hidden="true">
            <span />
          </div>

          <div class="mechanical-disc__controls">
            <button type="button" aria-label="Previous signal" @click="onControl('previous')">PREV</button>
            <button type="button" aria-label="Preview signal" @click="onControl('preview')">{{ isPlaying ? 'HOLD' : 'PLAY' }}</button>
            <button type="button" aria-label="Next signal" @click="onControl('next')">NEXT</button>
          </div>

          <button type="button" class="mechanical-disc__vote" @click="onVote">
            <span>VOTE</span>
            <strong>{{ votes }}</strong>
          </button>
        </aside>
      </div>

      <div class="mechanical-disc__strip">
        <span class="microtext">FLOW INDEX {{ String(flowIndex).padStart(2, '0') }}</span>
        <span class="microtext">COMMUNITY SIGNAL</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mechanical-disc {
  position: relative;
  width: min(620px, 94vw);
  min-width: 0;
  transform: perspective(1100px) rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
  transform-style: preserve-3d;
  transition: transform 260ms var(--ease-scene), filter 500ms var(--ease-scene);
  filter: saturate(1.08);
}

.mechanical-disc__case {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 16px;
  min-height: clamp(398px, 42vw, 472px);
  overflow: hidden;
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background:
    radial-gradient(circle at 22% 32%, rgba(57, 255, 156, 0.12), transparent 34%),
    radial-gradient(circle at 78% 22%, rgba(0, 229, 255, 0.08), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.085), transparent 28%),
    linear-gradient(180deg, rgba(18, 22, 27, 0.96), rgba(3, 4, 6, 0.98));
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    inset 0 -34px 80px rgba(0, 0, 0, 0.42),
    0 34px 110px rgba(0, 0, 0, 0.58),
    0 0 76px var(--music-glow, rgba(0, 229, 255, 0.08));
}

.mechanical-disc__case::before {
  content: '';
  position: absolute;
  inset: 14px;
  z-index: 1;
  border: 1px solid rgba(255, 255, 255, 0.075);
  pointer-events: none;
}

.mechanical-disc__case::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.045) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 52px 52px;
  opacity: 0.13;
  pointer-events: none;
}

.mechanical-disc__screw {
  position: absolute;
  z-index: 4;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background:
    linear-gradient(90deg, transparent 43%, rgba(0, 0, 0, 0.68) 44% 56%, transparent 57%),
    radial-gradient(circle at 35% 30%, #f4f7f8, #59636d 70%, #101318);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.35), 0 0 11px rgba(0, 0, 0, 0.7);
}

.mechanical-disc__screw:nth-child(1) { top: 18px; left: 18px; }
.mechanical-disc__screw:nth-child(2) { top: 18px; right: 18px; }
.mechanical-disc__screw:nth-child(3) { bottom: 18px; left: 18px; }
.mechanical-disc__screw:nth-child(4) { bottom: 18px; right: 18px; }

.mechanical-disc__brand {
  position: relative;
  z-index: 3;
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  padding-inline: 12px;
}

.mechanical-disc__brand strong {
  font-size: clamp(24px, 3vw, 32px);
  line-height: 0.9;
  letter-spacing: 0.08em;
}

.mechanical-disc__assembly {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(214px, 242px);
  gap: 18px;
  align-items: stretch;
  min-width: 0;
}

.mechanical-disc__rails {
  position: absolute;
  inset: 18% 26px 18% 18px;
  z-index: 0;
  border-top: 2px solid rgba(255, 255, 255, 0.08);
  border-bottom: 2px solid rgba(255, 255, 255, 0.045);
  transform: skewY(-3deg);
}

.mechanical-disc__disc-bay {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: 268px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.075);
  background:
    radial-gradient(circle at 48% 48%, rgba(255, 255, 255, 0.045), transparent 42%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.025), rgba(0, 0, 0, 0.18));
}

.mechanical-disc__disc-shadow {
  position: absolute;
  width: min(82%, 330px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 0, 0, 0.72), transparent 70%);
  filter: blur(22px);
  transform: translateY(10%);
}

.mechanical-disc__rotor {
  position: relative;
  width: min(86%, 326px);
  aspect-ratio: 1;
  animation: mechanical-spin 22s linear infinite;
  animation-play-state: paused;
}

.mechanical-disc--playing .mechanical-disc__rotor,
.mechanical-disc[data-mode='landing'] .mechanical-disc__rotor,
.mechanical-disc[data-mode='voting'] .mechanical-disc__rotor,
.mechanical-disc[data-mode='champion'] .mechanical-disc__rotor {
  animation-play-state: running;
}

.mechanical-disc[data-mode='battle-reveal'] .mechanical-disc__rotor,
.mechanical-disc[data-mode='result'] .mechanical-disc__rotor {
  animation-duration: 12s;
}

.mechanical-disc[data-mode='paused'] .mechanical-disc__rotor {
  animation-duration: 90s;
  animation-play-state: running;
}

@keyframes mechanical-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.mechanical-disc__platter {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at center, #050607 0 17%, transparent 17%),
    repeating-radial-gradient(circle, rgba(255, 255, 255, 0.09) 0 1px, transparent 1px 9px),
    conic-gradient(from 18deg, #14181f, #656e7a, #101319, #45f2ff, #171a20, #a85cff, #101319, #39ff9c, #14181f);
  box-shadow:
    inset 0 0 38px rgba(0, 0, 0, 0.82),
    0 0 34px rgba(0, 229, 255, 0.2),
    0 0 66px rgba(57, 255, 156, 0.12);
}

.mechanical-disc__holo {
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  background: conic-gradient(
    from 90deg,
    transparent 0 8%,
    rgba(0, 229, 255, 0.7) 13%,
    transparent 20%,
    rgba(124, 77, 255, 0.68) 31%,
    transparent 39%,
    rgba(57, 255, 156, 0.7) 51%,
    transparent 60%,
    rgba(255, 255, 255, 0.42) 72%,
    transparent 84%
  );
  mix-blend-mode: screen;
  opacity: 0.86;
}

.mechanical-disc__cover {
  position: absolute;
  inset: 34%;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background:
    radial-gradient(circle at 38% 34%, rgba(255, 255, 255, 0.18), transparent 44%),
    linear-gradient(135deg, #171d24, #050607);
  background-size: cover;
  background-position: center;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.16),
    0 0 0 8px rgba(0, 0, 0, 0.62);
}

.mechanical-disc__cover span {
  color: rgba(255, 255, 255, 0.74);
  font-weight: 800;
  letter-spacing: 0.08em;
}

.mechanical-disc__spindle {
  position: absolute;
  inset: 48%;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, #f4f7f8, #15191e 75%);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.28);
}

.mechanical-disc__clamp {
  position: absolute;
  right: 5%;
  top: 20%;
  width: 21%;
  height: 14%;
  border: 1px solid rgba(255, 255, 255, 0.13);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.025));
  transform: skewX(-12deg);
}

.mechanical-disc__module {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 11px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.11);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(0, 0, 0, 0.22)),
    rgba(0, 0, 0, 0.34);
  box-shadow: inset 0 0 34px rgba(255, 255, 255, 0.03);
}

.mechanical-disc__oled {
  display: flex;
  min-height: 112px;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border: 1px solid rgba(57, 255, 156, 0.25);
  background:
    linear-gradient(180deg, rgba(57, 255, 156, 0.085), rgba(0, 229, 255, 0.032)),
    #020403;
  box-shadow: inset 0 0 26px rgba(57, 255, 156, 0.08);
}

.mechanical-disc__oled strong {
  display: -webkit-box;
  min-width: 0;
  overflow: hidden;
  color: #f2f5f8;
  font-size: clamp(19px, 2vw, 24px);
  line-height: 1.06;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.mechanical-disc__oled small {
  overflow: hidden;
  color: rgba(242, 245, 248, 0.6);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  line-height: 1.35;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.mechanical-disc__wave {
  display: grid;
  grid-template-columns: repeat(18, 1fr);
  align-items: end;
  height: 34px;
  gap: 3px;
}

.mechanical-disc__wave span {
  display: block;
  height: var(--h);
  background: linear-gradient(to top, rgba(57, 255, 156, 0.28), rgba(0, 229, 255, 0.9));
  animation: waveform 900ms ease-in-out infinite alternate;
  animation-delay: calc(var(--i) * -80ms);
}

@keyframes waveform {
  from { transform: scaleY(0.45); opacity: 0.44; }
  to   { transform: scaleY(1); opacity: 0.95; }
}

.mechanical-disc__progress {
  height: 3px;
  background: rgba(255, 255, 255, 0.12);
}

.mechanical-disc__progress span {
  display: block;
  width: var(--flow-progress);
  height: 100%;
  background: linear-gradient(90deg, #39ff9c, #00e5ff);
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.4);
  transition: width 500ms linear;
}

.mechanical-disc__controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.mechanical-disc__controls button,
.mechanical-disc__vote {
  min-height: 48px;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(242, 245, 248, 0.82);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: transform var(--t-fast) var(--ease-liquid), border-color var(--t-fast) linear, background var(--t-fast) linear;
}

.mechanical-disc__controls button:hover,
.mechanical-disc__vote:hover {
  border-color: rgba(57, 255, 156, 0.48);
  background: rgba(57, 255, 156, 0.08);
}

.mechanical-disc__controls button:active,
.mechanical-disc__vote:active {
  transform: scale(0.97);
}

.mechanical-disc__vote {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 58px;
  padding: 0 13px;
  border-color: rgba(57, 255, 156, 0.28);
}

.mechanical-disc[data-mode='voting'] .mechanical-disc__vote,
.mechanical-disc[data-mode='champion'] .mechanical-disc__vote {
  animation: vote-pulse 1.2s ease-in-out infinite alternate;
}

@keyframes vote-pulse {
  from { box-shadow: 0 0 0 rgba(57, 255, 156, 0); }
  to   { box-shadow: 0 0 24px rgba(57, 255, 156, 0.22); }
}

.mechanical-disc__strip {
  position: relative;
  z-index: 3;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
  padding: 11px 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.mechanical-disc__strip span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mechanical-disc[data-mode='loading-profile'] .mechanical-disc__wave span {
  animation-duration: 1500ms;
}

.mechanical-disc[data-mode='battle-reveal'],
.mechanical-disc[data-mode='champion'] {
  filter: saturate(1.24) brightness(1.04);
}

@media (max-width: 720px) {
  .mechanical-disc {
    width: min(372px, 94vw);
  }

  .mechanical-disc__case {
    gap: 12px;
    min-height: auto;
    padding: 18px;
  }

  .mechanical-disc__screw:nth-child(1) { top: 14px; left: 14px; }
  .mechanical-disc__screw:nth-child(2) { top: 14px; right: 14px; }
  .mechanical-disc__screw:nth-child(3) { bottom: 14px; left: 14px; }
  .mechanical-disc__screw:nth-child(4) { bottom: 14px; right: 14px; }

  .mechanical-disc__brand {
    padding-inline: 8px;
  }

  .mechanical-disc__assembly {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .mechanical-disc__rails {
    inset: 8% 16px 44% 16px;
  }

  .mechanical-disc__disc-bay {
    min-height: 220px;
  }

  .mechanical-disc__rotor {
    width: min(76vw, 260px);
  }

  .mechanical-disc__module {
    width: 100%;
    padding: 12px;
  }

  .mechanical-disc__oled {
    min-height: 96px;
  }

  .mechanical-disc__strip {
    padding-inline: 8px;
  }
}

@media (max-width: 390px) {
  .mechanical-disc__case {
    padding: 16px;
  }

  .mechanical-disc__disc-bay {
    min-height: 204px;
  }

  .mechanical-disc__module {
    gap: 9px;
  }

  .mechanical-disc__controls button,
  .mechanical-disc__vote {
    font-size: 9px;
    letter-spacing: 0.09em;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mechanical-disc {
    transform: none;
  }

  .mechanical-disc__rotor {
    animation-duration: 120s;
  }

  .mechanical-disc__wave span,
  .mechanical-disc__vote {
    animation-duration: 4s;
  }
}
</style>
