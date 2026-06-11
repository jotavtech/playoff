<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useAuthStore } from '~/stores/auth'
import { useAuth } from '~/composables/useAuth'
import { useRoom } from '~/composables/useRoom'

const cinematic = useCinematicStore()
const music = useMusicVisualStore()
const auth = useAuthStore()
const { login } = useAuth()
const { createRoom } = useRoom()
const router = useRouter()
const creatingRoom = ref(false)

async function onCreateRoom () {
  if (creatingRoom.value) return
  creatingRoom.value = true
  const id = await createRoom('PLAYOFF SESSION')
  creatingRoom.value = false
  if (id) router.push(`/room/${id}`)
}

// CTA dinâmico (PRD §5.5.3): com música tocando vira `Enter Cinema View`;
// sem música, abre a busca no Command Center
function onPrimaryCta () {
  if (music.currentTrack) cinematic.toggleCinemaView()
  else cinematic.toggleCommandCenter()
}

// Disco em profundidade no Hero (PRD Radiola §8.2: Hero 280–320px)
const heroDiscSize = ref(300)
function measure () {
  if (!import.meta.client) return
  const v = Math.min(window.innerWidth, window.innerHeight)
  heroDiscSize.value = Math.max(200, Math.min(320, Math.round(v * 0.42)))
}
onMounted(() => {
  measure()
  window.addEventListener('resize', measure, { passive: true })
  onBeforeUnmount(() => window.removeEventListener('resize', measure))
})
</script>

<template>
  <section class="hero editorial-grid">
    <!-- Disco em profundidade: aparece quando há sinal vivo -->
    <Transition name="hero-disc">
      <div v-if="music.currentTrack" class="hero__disc" aria-hidden="true">
        <VinylDisc :size="heroDiscSize" :show-arm="false" />
      </div>
    </Transition>

    <div class="hero__composition">
      <!-- Cartela de abertura: kicker flanqueado por réguas finas, como intertítulo de cinema mudo -->
      <p class="hero__kicker microtext">
        <span class="hero__rule" aria-hidden="true" />
        CINEMATIC MUSIC SYSTEM — REBUILD 4.0
        <span class="hero__rule" aria-hidden="true" />
      </p>

      <!-- Tipografia massiva, cortada pelas bordas (PRD §5.5.1) -->
      <h1 class="hero__title" aria-label="PLAYOFF">PLAYOFF</h1>

      <p v-if="music.currentTrack" class="hero__track microtext microtext--bright">
        NOW — {{ music.currentTrack.title }} · {{ music.currentTrack.artist }}
      </p>

      <div class="hero__ctas">
        <!-- Autenticado: busca e cinema -->
        <template v-if="auth.isAuthenticated">
          <button class="hero__cta hero__cta--primary" @click="onPrimaryCta">
            {{ music.currentTrack ? 'ENTER CINEMA VIEW' : 'SEARCH MUSIC' }}
          </button>
          <button class="hero__cta" :disabled="creatingRoom" @click="onCreateRoom">
            {{ creatingRoom ? 'OPENING…' : 'CREATE ROOM' }}
          </button>
        </template>

        <!-- Não autenticado: login em destaque -->
        <template v-else>
          <button class="hero__cta hero__cta--primary" @click="login()">
            LOGIN WITH SPOTIFY
          </button>
          <button class="hero__cta" @click="cinematic.toggleCommandCenter()">
            DEMO SCENE
          </button>
        </template>
      </div>

      <div class="hero__footnotes microtext">
        <span>{{ music.statusLabel }}</span>
        <span v-if="auth.isAuthenticated">
          {{ auth.isPremium ? 'PREMIUM SDK ACTIVE' : 'FREE — PREVIEW MODE' }}
        </span>
        <span v-else>SPOTIFY AUTH REQUIRED FOR FULL PLAYBACK</span>
        <span>TIER {{ cinematic.performanceTier.toUpperCase() }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  height: 100%;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding-inline: clamp(12px, 4vw, 48px);
}

.hero__composition {
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  text-align: center;
}

/* Disco em profundidade atrás da tipografia */
.hero__disc {
  position: absolute;
  top: 50%;
  left: 50%;
  translate: -50% -50%;
  z-index: 0;
  opacity: 0.5;
  filter: saturate(0.9);
}

.hero-disc-enter-active { transition: opacity 1.4s var(--ease-scene); }
.hero-disc-leave-active { transition: opacity 0.6s var(--ease-cut); }
.hero-disc-enter-from, .hero-disc-leave-to { opacity: 0; }

.hero__kicker {
  display: flex;
  align-items: center;
  gap: 18px;
  letter-spacing: 0.34em;
  /* cartela entra primeiro, como abertura de trailer mudo */
  animation: card-reveal 1.1s var(--ease-scene) both;
}

.hero__rule {
  display: inline-block;
  width: clamp(28px, 6vw, 72px);
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
  font-size: clamp(96px, 19vw, 320px);
  font-weight: 700;
  line-height: 0.84;
  letter-spacing: -0.04em;
  /* composição cortada pelas bordas */
  width: 104vw;
  margin-inline: -2vw;
  user-select: none;
  mix-blend-mode: difference;
  color: #f2f2f2;
  /* título sobe como cartela de cinema mudo — corte intencional, não fade genérico */
  animation: title-card 1.3s var(--ease-cut) 0.15s both;
}

@keyframes title-card {
  from { opacity: 0; transform: translateY(0.18em) scale(0.985); letter-spacing: -0.01em; }
  to   { opacity: 1; transform: translateY(0) scale(1); letter-spacing: -0.04em; }
}

.hero__track {
  letter-spacing: 0.26em;
}

.hero__ctas {
  display: flex;
  gap: 14px;
  margin-top: 10px;
  animation: card-reveal 1s var(--ease-scene) 0.55s both;
}

@keyframes card-reveal {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.hero__cta {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.24em;
  padding: 16px 30px;
  border: 1px solid var(--ink-dim);
  color: var(--ink);
  transition: background var(--t-fast) linear, color var(--t-fast) linear, opacity var(--t-fast) linear;
}

.hero__cta--primary {
  background: var(--ink);
  color: var(--bg);
}

.hero__cta--primary:hover {
  background: transparent;
  color: var(--ink);
}

.hero__cta:not(.hero__cta--primary):hover {
  background: var(--glass);
}

.hero__cta:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.hero__footnotes {
  display: flex;
  gap: 36px;
  margin-top: 18px;
  animation: card-reveal 1s var(--ease-scene) 0.75s both;
}

@media (max-width: 768px) {
  .hero__composition { gap: 16px; }
  .hero__ctas { flex-direction: column; width: min(320px, 80vw); }
  .hero__cta { padding: 14px 24px; }
  .hero__footnotes { gap: 12px 16px; flex-wrap: wrap; justify-content: center; }
  .hero__rule { width: 20px; }
}
</style>
