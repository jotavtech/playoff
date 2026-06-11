<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useAuthStore } from '~/stores/auth'
import { useAuth } from '~/composables/useAuth'
import { useRoom } from '~/composables/useRoom'
import { loadGoWithTheFlow } from '~/composables/useDemoSignal'

const cinematic = useCinematicStore()
const music = useMusicVisualStore()
const auth = useAuthStore()
const { login } = useAuth()
const { createRoom } = useRoom()
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
}

// CTA dinâmico (PRD §5.5.3): com música tocando vira `Enter Cinema View`;
// sem música, abre a busca no Command Center
function onPrimaryCta () {
  if (music.currentTrack) cinematic.toggleCinemaView()
  else cinematic.toggleCommandCenter()
}

// Login Spotify com feedback de "conectando" antes do redirect (PRD §UX/Login)
function onLogin () {
  if (connecting.value) return
  auth.setAuthError(null)
  connecting.value = true
  // pequeno atraso para o estado "CONNECTING" pintar antes do redirect cheio
  setTimeout(() => login(), 280)
}

// Demo mode: entra direto numa cena real pelo mesmo pipeline do Spotify
async function onDemo () {
  if (loadingDemo.value) return
  loadingDemo.value = true
  try {
    await loadGoWithTheFlow()
  } finally {
    loadingDemo.value = false
  }
}

// Estado do objeto central (PRD §Background/Objeto central)
const discState = computed(() => {
  if (music.currentTrack) return 'live'
  if (connecting.value) return 'connecting'
  if (auth.isAuthenticated) return 'ready'
  return 'offline'
})

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
  <section class="hero editorial-grid" :class="`hero--${discState}`">
    <!-- Objeto central: disco em profundidade, reage ao estado do sistema -->
    <div class="hero__disc" :class="`hero__disc--${discState}`" aria-hidden="true">
      <VinylDisc :size="heroDiscSize" :show-arm="false" />
    </div>

    <div class="hero__composition">
      <!-- Kicker — intertítulo curto de cinema -->
      <p class="hero__kicker microtext">
        <span class="hero__rule" aria-hidden="true" />
        CINEMATIC MUSIC BATTLES
        <span class="hero__rule" aria-hidden="true" />
      </p>

      <!-- Wordmark da marca — logo chrome (PRD §Hero) -->
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

      <!-- Subtítulo: explica o produto em uma linha -->
      <p v-if="!music.currentTrack" class="hero__subtitle">
        Music battles powered by your Spotify taste.
      </p>
      <p v-else class="hero__track microtext microtext--bright">
        NOW PLAYING — {{ music.currentTrack.title }} · {{ music.currentTrack.artist }}
      </p>

      <div class="hero__ctas">
        <!-- Autenticado: busca e cinema -->
        <template v-if="auth.isAuthenticated">
          <button class="hero__cta hero__cta--primary" @click="onPrimaryCta">
            <span class="hero__cta-label">{{ music.currentTrack ? 'ENTER CINEMA VIEW' : 'SEARCH MUSIC' }}</span>
          </button>
          <button class="hero__cta hero__cta--ghost" :disabled="creatingRoom" @click="onCreateRoom">
            <span class="hero__cta-label">{{ creatingRoom ? 'OPENING…' : 'CREATE ROOM' }}</span>
          </button>
        </template>

        <!-- Não autenticado: login premium + demo -->
        <template v-else>
          <button
            class="hero__cta hero__cta--spotify"
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
            <span class="hero__cta-label">{{ connecting ? 'CONNECTING TO SPOTIFY…' : 'CONTINUE WITH SPOTIFY' }}</span>
          </button>

          <button
            class="hero__cta hero__cta--demo"
            :disabled="loadingDemo"
            @click="onDemo"
          >
            <span class="hero__cta-label">{{ loadingDemo ? 'LOADING SCENE…' : 'TRY DEMO MODE' }}</span>
          </button>
        </template>
      </div>

      <!-- Erro de conexão Spotify, mensagem clara (PRD §UX/Login) -->
      <p v-if="auth.authError" class="hero__error" role="alert">
        {{ auth.authError }}
      </p>

      <!-- Texto de apoio -->
      <p v-else-if="!auth.isAuthenticated && !music.currentTrack" class="hero__helper">
        <span class="hero__helper-full">Connect your Spotify account to generate cinematic music battles from your listening profile.</span>
        <span class="hero__helper-short">Spotify login unlocks your personalized music battles.</span>
      </p>

      <div class="hero__footnotes microtext">
        <span>{{ music.statusLabel }}</span>
        <span v-if="auth.isAuthenticated">
          {{ auth.isPremium ? 'PREMIUM SDK ACTIVE' : 'FREE — PREVIEW MODE' }}
        </span>
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
  gap: 20px;
  text-align: center;
}

/* ── Objeto central ─────────────────────────────────────────────────────── */
.hero__disc {
  position: absolute;
  top: 50%;
  left: 50%;
  translate: -50% -50%;
  z-index: 0;
  transition: opacity 1.2s var(--ease-scene), filter 1.2s var(--ease-scene);
}

/* offline — CD holográfico recuado, mas com iridescência viva */
.hero__disc--offline {
  opacity: 0.6;
  filter: saturate(1.05) brightness(0.96);
}

/* ready (logado, sem faixa) — desperta levemente */
.hero__disc--ready {
  opacity: 0.66;
  filter: saturate(1.15);
}

/* connecting — pulso luminoso enquanto conecta */
.hero__disc--connecting {
  opacity: 0.62;
  filter: saturate(1.1);
  animation: disc-pulse 1.4s var(--ease-scene) infinite;
}

/* live — reage à música, cor cheia */
.hero__disc--live {
  opacity: 0.58;
  filter: saturate(1.15);
}

@keyframes disc-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}

/* hover sobre o hero gira lentamente o disco quando está parado */
.hero--offline:hover .hero__disc--offline,
.hero--ready:hover .hero__disc--ready {
  opacity: 0.5;
  animation: disc-idle-spin 28s linear infinite;
}

@keyframes disc-idle-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* ── Kicker ──────────────────────────────────────────────────────────────── */
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

/* ── Wordmark (logo chrome) ──────────────────────────────────────────────── */
.hero__title {
  margin: 0;
  line-height: 0;
  animation: title-card 1.3s var(--ease-cut) 0.15s both;
}

.hero__logo {
  display: block;
  width: clamp(260px, 46vw, 560px);
  height: auto;
  user-select: none;
  /* profundidade sutil + leve halo da cor da música quando há sinal */
  filter:
    drop-shadow(0 8px 28px rgba(0, 0, 0, 0.55))
    drop-shadow(0 0 calc(14px * var(--music-reactivity, 0.2)) var(--music-glow, transparent));
}

@keyframes title-card {
  from { opacity: 0; transform: translateY(0.14em) scale(0.985); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Subtítulo / faixa ───────────────────────────────────────────────────── */
.hero__subtitle {
  font-size: clamp(15px, 2.2vw, 19px);
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--ink-dim);
  max-width: 30ch;
  animation: card-reveal 1s var(--ease-scene) 0.4s both;
}

.hero__track {
  letter-spacing: 0.24em;
  animation: card-reveal 1s var(--ease-scene) 0.4s both;
}

/* ── CTAs ────────────────────────────────────────────────────────────────── */
.hero__ctas {
  display: flex;
  align-items: stretch;
  gap: 12px;
  margin-top: 6px;
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
  letter-spacing: 0.24em;
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

/* Primário Spotify — premium, inevitável */
.hero__cta--spotify {
  height: 64px;
  padding: 0 34px;
  border-radius: 2px;
  background: #f5f5f0;
  color: #050505;
  border: 1px solid #f5f5f0;
}

.hero__cta--spotify::after {
  /* brilho interno no hover */
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

/* Estado conectando — pulso verde sutil */
.hero__cta--connecting {
  background: #0d150f;
  color: #d8f5e2;
  border-color: rgba(29, 185, 84, 0.5);
  animation: connecting-glow 1.3s ease-in-out infinite;
  cursor: progress;
}

@keyframes connecting-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0); }
  50% { box-shadow: 0 0 26px 2px rgba(29, 185, 84, 0.32); }
}

/* Secundário demo — claramente secundário, ainda bonito */
.hero__cta--demo {
  height: 56px;
  padding: 0 28px;
  border-radius: 2px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: rgba(255, 255, 255, 0.88);
}

.hero__cta--demo:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.7);
  background: var(--glass);
}

/* CTAs autenticado — herdam linguagem mas mais sóbrios */
.hero__cta--primary {
  height: 60px;
  padding: 0 30px;
  border-radius: 2px;
  background: var(--ink);
  color: var(--bg);
  border: 1px solid var(--ink);
}

.hero__cta--primary:hover:not(:disabled) {
  background: transparent;
  color: var(--ink);
}

.hero__cta--ghost {
  height: 60px;
  padding: 0 28px;
  border-radius: 2px;
  background: transparent;
  border: 1px solid var(--ink-dim);
  color: var(--ink);
}

.hero__cta--ghost:hover:not(:disabled) {
  background: var(--glass);
}

.hero__cta:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ── Texto de apoio / erro ───────────────────────────────────────────────── */
.hero__helper {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.5;
  letter-spacing: 0.04em;
  color: var(--ink-faint);
  max-width: 44ch;
  margin-top: 2px;
  animation: card-reveal 1s var(--ease-scene) 0.7s both;
}

.hero__helper-short { display: none; }

.hero__error {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: #ff8a7a;
  border: 1px solid rgba(255, 138, 122, 0.4);
  padding: 10px 16px;
  border-radius: 2px;
  max-width: 42ch;
  animation: card-reveal 0.5s var(--ease-scene) both;
}

.hero__footnotes {
  display: flex;
  gap: 28px;
  margin-top: 14px;
  animation: card-reveal 1s var(--ease-scene) 0.8s both;
}

@media (max-width: 768px) {
  .hero__composition { gap: 16px; }
  .hero__kicker { font-size: 9px; letter-spacing: 0.28em; }
  .hero__rule { width: 18px; }
  .hero__ctas { flex-direction: column; width: min(340px, 86vw); }
  .hero__cta { width: 100%; }
  .hero__subtitle { max-width: 26ch; }
  .hero__helper-full { display: none; }
  .hero__helper-short { display: inline; }
  .hero__footnotes { gap: 14px; flex-wrap: wrap; justify-content: center; }
}
</style>
