<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useAuthStore } from '~/stores/auth'
import { useAuth } from '~/composables/useAuth'
import { useRoom } from '~/composables/useRoom'
import { loadGoWithTheFlow } from '~/composables/useDemoSignal'
import { usePlayoffFeedback } from '~/composables/usePlayoffFeedback'
import { useBattleEngine } from '~/composables/useBattleEngine'
import VinylDisc from '~/components/VinylDisc.vue'

const cinematic = useCinematicStore()
const music = useMusicVisualStore()
const auth = useAuthStore()
const { login } = useAuth()
const { createRoom } = useRoom()
const { notify } = usePlayoffFeedback()
const battle = useBattleEngine()
const router = useRouter()

const creatingRoom = ref(false)
const connecting = ref(false)
const loadingDemo = ref(false)

async function onCreateRoom () {
  if (creatingRoom.value) return
  creatingRoom.value = true
  const id = await createRoom('PLAYOFF SESSION')
  creatingRoom.value = false
  if (id) router.push(`/room/${id}`)
  else notify('error')
}

function onPrimaryCta () {
  if (music.currentTrack) cinematic.toggleCinemaView()
  else cinematic.toggleCommandCenter()
}

function onLogin () {
  if (connecting.value) return
  auth.setAuthError(null)
  connecting.value = true
  setTimeout(() => login(), 280)
}

async function onDemo () {
  if (loadingDemo.value) return
  loadingDemo.value = true
  try {
    await loadGoWithTheFlow()
    await battle.startBattle('quick')
    notify('demo-mode')
  } finally {
    loadingDemo.value = false
  }
}

// O disco é dimensionado em px (o canvas das ranhuras precisa do valor real)
const viewportW = ref(1280)
function onResize () { viewportW.value = window.innerWidth }
onMounted(() => { onResize(); window.addEventListener('resize', onResize) })
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

const discSize = computed(() => {
  const w = viewportW.value
  if (w <= 900) return Math.round(Math.min(310, w * 0.74))
  return Math.round(Math.min(480, w * 0.34))
})
</script>

<template>
  <section class="hero editorial-grid">
    <div class="hero__layout">
      <div class="hero__composition">
        <p class="hero__kicker microtext">
          <span class="hero__rule" aria-hidden="true" />
          SESSION 2026{{ music.isPlaying ? ' / LIVE' : '' }}
          <span class="hero__rule" aria-hidden="true" />
        </p>

        <h1 class="hero__title">
          <img
            class="hero__logo"
            src="/logo-playoff.png"
            alt="Playoff"
            width="694"
            height="394"
            draggable="false"
          >
        </h1>

        <div class="hero__copy">
          <p class="hero__headline">Go with the flow.</p>
          <p v-if="!music.currentTrack" class="hero__subtitle">
            A vote-driven tracklist where every song earns its rotation.
            No skips. No algorithm. Only the community decides.
          </p>
          <p v-else class="hero__track microtext microtext--bright">
            NOW PLAYING / {{ music.currentTrack.title }} / {{ music.currentTrack.artist }}
          </p>
        </div>

        <div class="hero__ctas">
          <template v-if="music.currentTrack">
            <button class="hero__cta hero__cta--primary" type="button" @click="cinematic.toggleCinemaView()">
              <span class="hero__cta-label">ENTER CINEMA VIEW</span>
            </button>
            <button class="hero__cta hero__cta--ghost" type="button" @click="cinematic.toggleCommandCenter()">
              <span class="hero__cta-label">SEARCH MUSIC</span>
            </button>
          </template>

          <template v-else-if="auth.isAuthenticated">
            <button class="hero__cta hero__cta--primary" type="button" @click="onPrimaryCta">
              <span class="hero__cta-label">{{ music.currentTrack ? 'ENTER CINEMA VIEW' : 'SEARCH MUSIC' }}</span>
            </button>
            <button class="hero__cta hero__cta--ghost" type="button" :disabled="creatingRoom" @click="onCreateRoom">
              <span class="hero__cta-label">{{ creatingRoom ? 'OPENING...' : 'CREATE ROOM' }}</span>
            </button>
          </template>

          <template v-else>
            <button
              class="hero__cta hero__cta--spotify"
              type="button"
              :class="{ 'hero__cta--connecting': connecting }"
              :disabled="connecting"
              @click="onLogin"
            >
              <svg v-if="!connecting" class="hero__spotify-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.586 14.424a.623.623 0 0 1-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.623.623 0 1 1-.277-1.215c3.809-.87 7.076-.496 9.712 1.115a.623.623 0 0 1 .207.857Zm1.224-2.723a.78.78 0 0 1-1.072.257c-2.687-1.652-6.785-2.13-9.965-1.166a.78.78 0 1 1-.452-1.493c3.632-1.101 8.147-.568 11.232 1.329a.78.78 0 0 1 .257 1.073Zm.105-2.835c-3.223-1.914-8.54-2.09-11.617-1.156a.935.935 0 1 1-.542-1.79c3.532-1.072 9.404-.865 13.115 1.338a.935.935 0 1 1-.956 1.608Z"
                />
              </svg>
              <span class="hero__cta-label">{{ connecting ? 'CONNECTING TO SPOTIFY...' : 'CONTINUE WITH SPOTIFY' }}</span>
            </button>

            <button
              class="hero__cta hero__cta--demo"
              type="button"
              :disabled="loadingDemo"
              @click="onDemo"
            >
              <span class="hero__cta-label">{{ loadingDemo ? 'LOADING SCENE...' : 'START QUICK BATTLE DEMO' }}</span>
            </button>
          </template>
        </div>

        <p v-if="auth.authError" class="hero__error" role="alert">
          {{ auth.authError }}
        </p>

        <p v-else-if="!auth.isAuthenticated && !music.currentTrack" class="hero__helper">
          <span class="hero__helper-full">Cada faixa entra na rotação se a comunidade girar. Ninguém pula. Só vota.</span>
          <span class="hero__helper-short">Spotify login unlocks personalized battles.</span>
        </p>

        <div class="hero__footnotes microtext">
          <span>NO SKIPS / ONLY VOTES</span>
          <span v-if="auth.isAuthenticated">
            {{ auth.isPremium ? 'PREMIUM SDK ACTIVE' : 'FREE / PREVIEW MODE' }}
          </span>
        </div>
      </div>

      <!-- A alma do site: o vinil real, com física, girando desde o primeiro frame -->
      <div class="hero__stage">
        <div class="hero__stage-glow" aria-hidden="true" />
        <VinylDisc :size="discSize" :idle-rpm="8" />
        <p class="hero__stage-meta microtext">
          <span>{{ music.statusLabel }}</span>
          <span aria-hidden="true">/</span>
          <span v-if="music.currentTrack">{{ music.timecode }}</span>
          <span v-else>33 RPM</span>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding-block: clamp(18px, 4vh, 34px);
  padding-inline: clamp(12px, 4vw, 48px);
}

.hero__layout {
  position: relative;
  z-index: 1;
  width: min(1180px, 100%);
  display: grid;
  grid-template-columns: minmax(300px, 1fr) auto;
  align-items: center;
  gap: clamp(22px, 4vw, 56px);
}

.hero__composition {
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 18px;
  text-align: left;
}

.hero__kicker {
  display: flex;
  align-items: center;
  gap: 16px;
  letter-spacing: 0.34em;
  animation: card-reveal 1.1s var(--ease-scene) both;
}

.hero__rule {
  display: inline-block;
  width: clamp(24px, 5vw, 56px);
  height: 1px;
  background: var(--ink-faint);
  transform-origin: center;
  animation: rule-extend 1.4s var(--ease-cut) both;
}

@keyframes rule-extend {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

.hero__title {
  margin: 0;
  line-height: 0;
  animation: title-card 1.3s var(--ease-cut) 0.15s both;
}

.hero__logo {
  display: block;
  width: clamp(220px, 30vw, 420px);
  height: auto;
  user-select: none;
  filter:
    drop-shadow(0 8px 28px rgba(0, 0, 0, 0.55))
    drop-shadow(0 0 calc(14px * var(--music-reactivity, 0.2)) var(--music-glow, transparent));
}

@keyframes title-card {
  from { opacity: 0; transform: translateY(0.14em) scale(0.985); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.hero__copy {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hero__headline {
  font-size: clamp(30px, 4.6vw, 64px);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: 0;
}

.hero__subtitle {
  max-width: 36ch;
  color: var(--ink-dim);
  font-size: clamp(15px, 2.2vw, 19px);
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.45;
  animation: card-reveal 1s var(--ease-scene) 0.4s both;
}

.hero__track {
  letter-spacing: 0.18em;
  animation: card-reveal 1s var(--ease-scene) 0.4s both;
}

.hero__ctas {
  display: flex;
  align-items: stretch;
  gap: 12px;
  margin-top: 2px;
  animation: card-reveal 1s var(--ease-scene) 0.55s both;
}

@keyframes card-reveal {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.hero__cta {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  transition: transform var(--t-fast) var(--ease-liquid),
              background var(--t-fast) linear,
              color var(--t-fast) linear,
              border-color var(--t-fast) linear,
              opacity var(--t-fast) linear;
}

.hero__cta:active:not(:disabled) {
  transform: scale(0.98);
}

.hero__cta-label {
  display: inline-block;
  transition: transform var(--t-fast) var(--ease-liquid);
}

.hero__cta:hover:not(:disabled) .hero__cta-label {
  transform: translateY(-2px);
}

.hero__cta--spotify {
  height: 64px;
  padding: 0 34px;
  border: 1px solid #f5f5f0;
  background: #f5f5f0;
  color: #050505;
}

.hero__cta--spotify::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 180% at 50% 130%, rgba(255, 255, 255, 0.9), transparent 60%);
  opacity: 0;
  transition: opacity var(--t-fast) linear;
  pointer-events: none;
}

.hero__cta--spotify:hover:not(:disabled)::after {
  opacity: 0.5;
}

.hero__spotify-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #1db954;
}

.hero__cta--connecting {
  border-color: rgba(29, 185, 84, 0.5);
  background: #0d150f;
  color: #d8f5e2;
  cursor: progress;
  animation: connecting-glow 1.3s ease-in-out infinite;
}

@keyframes connecting-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0); }
  50% { box-shadow: 0 0 26px 2px rgba(29, 185, 84, 0.32); }
}

.hero__cta--demo {
  height: 56px;
  padding: 0 28px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: transparent;
  color: rgba(255, 255, 255, 0.88);
}

.hero__cta--demo:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.7);
  background: var(--glass);
}

.hero__cta--primary {
  height: 60px;
  padding: 0 30px;
  border: 1px solid var(--ink);
  background: var(--ink);
  color: var(--bg);
}

.hero__cta--primary:hover:not(:disabled) {
  background: transparent;
  color: var(--ink);
}

.hero__cta--ghost {
  height: 60px;
  padding: 0 28px;
  border: 1px solid var(--ink-dim);
  background: transparent;
  color: var(--ink);
}

.hero__cta--ghost:hover:not(:disabled) {
  background: var(--glass);
}

.hero__cta:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.hero__helper {
  max-width: 44ch;
  margin-top: 2px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  line-height: 1.5;
  animation: card-reveal 1s var(--ease-scene) 0.7s both;
}

.hero__helper-short {
  display: none;
}

.hero__error {
  max-width: 42ch;
  padding: 10px 16px;
  border: 1px solid rgba(255, 138, 122, 0.4);
  color: #ff8a7a;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  animation: card-reveal 0.5s var(--ease-scene) both;
}

.hero__footnotes {
  display: flex;
  gap: 28px;
  margin-top: 14px;
  animation: card-reveal 1s var(--ease-scene) 0.8s both;
}

.hero__stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-self: end;
  gap: clamp(16px, 2.4vh, 26px);
  padding: clamp(8px, 1.4vw, 20px);
  animation: card-reveal 1.3s var(--ease-scene) 0.3s both;
}

/* Halo da cor da música atrás do disco — no idle é um respiro neutro */
.hero__stage-glow {
  position: absolute;
  inset: -14% -14% 6% -14%;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 44%, var(--music-glow, rgba(154, 154, 154, 0.1)), transparent 62%);
  filter: blur(34px);
  opacity: calc(0.55 + 0.45 * var(--music-reactivity, 0.2));
  pointer-events: none;
}

.hero__stage-meta {
  position: relative;
  display: flex;
  gap: 12px;
  letter-spacing: 0.26em;
}

@media (max-width: 900px) {
  .hero {
    align-items: start;
    overflow-y: auto;
    padding: 12px 14px 18px;
  }

  .hero__layout {
    grid-template-columns: 1fr;
    gap: 16px;
    justify-items: center;
    padding-bottom: 12px;
  }

  .hero__composition {
    align-items: center;
    gap: 12px;
    text-align: center;
  }

  .hero__kicker {
    font-size: 9px;
    letter-spacing: 0.28em;
  }

  .hero__rule {
    width: 18px;
  }

  .hero__logo {
    width: clamp(190px, 48vw, 270px);
  }

  .hero__copy {
    gap: 7px;
  }

  .hero__headline {
    font-size: clamp(27px, 8vw, 42px);
  }

  .hero__ctas {
    flex-direction: column;
    width: min(340px, 86vw);
  }

  .hero__cta--spotify,
  .hero__cta--primary,
  .hero__cta--ghost {
    height: 56px;
  }

  .hero__cta--demo {
    height: 52px;
  }

  .hero__cta {
    width: 100%;
    font-size: 10px;
    letter-spacing: 0.14em;
  }

  .hero__subtitle {
    max-width: 31ch;
    font-size: 14px;
  }

  .hero__helper-full {
    display: none;
  }

  .hero__helper-short {
    display: inline;
  }

  .hero__footnotes {
    gap: 14px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .hero__stage {
    justify-self: center;
    gap: 12px;
  }
}

@media (max-height: 620px) and (max-width: 900px) {
  .hero__composition {
    gap: 10px;
  }

  .hero__logo {
    width: clamp(172px, 42vw, 230px);
  }

  .hero__subtitle,
  .hero__helper,
  .hero__footnotes {
    display: none;
  }
}
</style>
