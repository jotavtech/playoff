<script setup lang="ts">
/**
 * Jukebox Coin Voting (SPEC 03) — votar é "colocar uma ficha".
 * Fluxo: INSERT COIN → LOCKING VOTE → VOTE LOCKED. Mobile-first, sem botão morto:
 * todo estado tem rótulo e comportamento claros. Não inventa backend — apenas
 * emite 'vote'; quem usa (battle/queue) decide o que fazer.
 */
type VoteState =
  | 'idle'
  | 'requiresLogin'
  | 'locking'
  | 'locked'
  | 'winner'
  | 'alreadyVoted'
  | 'disabled'
  | 'error'

const props = withDefaults(defineProps<{
  state?: VoteState
  coins?: number
}>(), { state: 'idle', coins: 0 })

const emit = defineEmits<{ vote: []; login: [] }>()

const locking = ref(false)
let lockTimer: ReturnType<typeof setTimeout> | null = null

const effectiveState = computed<VoteState>(() => (locking.value ? 'locking' : props.state))

const label = computed(() => {
  switch (effectiveState.value) {
    case 'locking': return 'LOCKING VOTE'
    case 'locked': return 'COIN LOCKED'
    case 'winner': return 'WINNER'
    case 'alreadyVoted': return 'ROUND LOCKED'
    case 'requiresLogin': return 'LOGIN TO VOTE'
    case 'error': return 'TRY AGAIN'
    case 'disabled': return 'LOCKED OUT'
    default: return 'INSERT COIN'
  }
})

const clickable = computed(() =>
  !locking.value && ['idle', 'requiresLogin', 'error'].includes(effectiveState.value)
)

const isDisabled = computed(() =>
  ['disabled', 'locked', 'winner', 'alreadyVoted'].includes(effectiveState.value)
)

function onClick () {
  if (!clickable.value) return
  if (props.state === 'requiresLogin') { emit('login'); return }
  locking.value = true
  emit('vote')
  if (lockTimer) clearTimeout(lockTimer)
  lockTimer = setTimeout(() => { locking.value = false }, 520)
}

onBeforeUnmount(() => { if (lockTimer) clearTimeout(lockTimer) })
</script>

<template>
  <button
    class="coin-vote"
    type="button"
    :data-state="effectiveState"
    :disabled="isDisabled"
    :aria-label="label"
    @click="onClick"
  >
    <span class="coin-vote__slot" aria-hidden="true">
      <span class="coin-vote__coin" />
    </span>
    <span class="coin-vote__label">{{ label }}</span>
    <span v-if="coins > 0" class="coin-vote__count" aria-hidden="true">×{{ coins }}</span>
  </button>
</template>

<style scoped>
.coin-vote {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 56px;
  padding: 0 16px;
  overflow: hidden;
  border: 1px solid rgba(57, 255, 156, 0.4);
  background: rgba(57, 255, 156, 0.05);
  color: var(--ink, #f2f2f2);
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  transition: border-color var(--t-fast) linear, background var(--t-fast) linear, color var(--t-fast) linear, opacity var(--t-fast) linear;
}

.coin-vote:hover:not(:disabled) {
  border-color: rgba(57, 255, 156, 0.85);
  background: rgba(57, 255, 156, 0.12);
}

.coin-vote:active:not(:disabled) {
  transform: scale(0.985);
}

.coin-vote:disabled {
  cursor: not-allowed;
}

/* ── Slot da ficha ──────────────────────────────────────────────────────── */
.coin-vote__slot {
  position: relative;
  width: 14px;
  height: 20px;
  flex-shrink: 0;
  border: 1px solid currentColor;
  border-radius: 2px;
  opacity: 0.7;
}

.coin-vote__coin {
  position: absolute;
  top: 3px;
  left: 50%;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0;
}

/* Animação: a ficha cai quando trava o voto */
.coin-vote[data-state='locking'] .coin-vote__coin {
  animation: coin-drop 0.52s var(--ease-cut, ease) forwards;
}

@keyframes coin-drop {
  0% { opacity: 1; transform: translateY(-14px) scale(1); }
  70% { opacity: 1; transform: translateY(2px) scale(0.9); }
  100% { opacity: 0; transform: translateY(8px) scale(0.7); }
}

/* ── Estados ────────────────────────────────────────────────────────────── */
.coin-vote[data-state='locking'] {
  border-color: rgba(0, 229, 255, 0.7);
  background: rgba(0, 229, 255, 0.1);
  color: #aef3ff;
}

.coin-vote[data-state='locked'],
.coin-vote[data-state='winner'] {
  border-color: rgba(57, 255, 156, 0.7);
  background: rgba(57, 255, 156, 0.16);
  color: #c9ffe4;
  opacity: 1;
}

.coin-vote[data-state='requiresLogin'] {
  border-color: var(--ink-dim, rgba(255, 255, 255, 0.5));
  background: transparent;
}

.coin-vote[data-state='error'] {
  border-color: rgba(255, 138, 122, 0.7);
  background: rgba(255, 138, 122, 0.08);
  color: #ff8a7a;
}

.coin-vote[data-state='disabled'],
.coin-vote[data-state='alreadyVoted'] {
  border-color: var(--glass-border, rgba(255, 255, 255, 0.09));
  background: transparent;
  color: var(--ink-faint, rgba(255, 255, 255, 0.3));
  opacity: 0.65;
}

.coin-vote__count {
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}

@media (prefers-reduced-motion: reduce) {
  .coin-vote[data-state='locking'] .coin-vote__coin { animation: none; opacity: 1; }
  .coin-vote { transition: none; }
}
</style>
