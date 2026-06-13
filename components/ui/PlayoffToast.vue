<script setup lang="ts">
import { usePlayoffFeedback } from '~/composables/usePlayoffFeedback'

const { toasts, removeToast } = usePlayoffFeedback()
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="playoff-toast" tag="div" class="playoff-toast-stack" aria-live="polite">
      <article
        v-for="toast in toasts"
        :key="toast.id"
        class="playoff-toast"
        :data-kind="toast.kind"
      >
        <div class="playoff-toast__rail" aria-hidden="true" />
        <div class="playoff-toast__copy">
          <p class="playoff-toast__title microtext">{{ toast.title }}</p>
          <p class="playoff-toast__message">{{ toast.message }}</p>
        </div>
        <button
          class="playoff-toast__close microtext"
          type="button"
          aria-label="Dismiss notification"
          @click="removeToast(toast.id)"
        >
          X
        </button>
      </article>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.playoff-toast-stack {
  position: fixed;
  right: max(14px, env(safe-area-inset-right));
  bottom: calc(var(--cinema-bar-bottom-height, 72px) + max(14px, env(safe-area-inset-bottom)));
  z-index: 80;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(360px, calc(100vw - 28px));
  pointer-events: none;
}

.playoff-toast {
  position: relative;
  display: grid;
  grid-template-columns: 4px 1fr auto;
  gap: 12px;
  padding: 14px 14px 14px 0;
  background: rgba(5, 7, 9, 0.88);
  border: 1px solid var(--glass-border);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.48);
  backdrop-filter: blur(12px);
  pointer-events: auto;
}

.playoff-toast__rail {
  width: 4px;
  background: var(--ink-dim);
}

.playoff-toast[data-kind='success'] .playoff-toast__rail {
  background: #39ff9c;
}

.playoff-toast[data-kind='warning'] .playoff-toast__rail {
  background: #f5c542;
}

.playoff-toast[data-kind='error'] .playoff-toast__rail {
  background: #ff4d6d;
}

.playoff-toast__copy {
  min-width: 0;
}

.playoff-toast__title {
  color: var(--ink);
  letter-spacing: 0.2em;
}

.playoff-toast__message {
  margin-top: 6px;
  color: var(--ink-dim);
  font-size: 16px;
  line-height: 1.45;
}

.playoff-toast__close {
  align-self: start;
  width: 44px;
  height: 44px;
  border: 1px solid var(--glass-border);
  color: var(--ink-dim);
  transition: border-color var(--t-fast) linear, color var(--t-fast) linear;
}

.playoff-toast__close:hover {
  border-color: var(--ink-dim);
  color: var(--ink);
}

.playoff-toast-enter-active,
.playoff-toast-leave-active {
  transition: opacity 180ms linear, transform 240ms var(--ease-scene);
}

.playoff-toast-enter-from,
.playoff-toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 640px) {
  .playoff-toast-stack {
    left: 14px;
    right: 14px;
    bottom: calc(var(--cinema-bar-bottom-height, 64px) + 10px);
    width: auto;
  }
}
</style>
