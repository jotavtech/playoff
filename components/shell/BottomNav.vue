<script setup lang="ts">
import { useCinematicStore } from '~/stores/cinematic'

const cinematic = useCinematicStore()
const route = useRoute()

const tabs = [
  {
    to: '/',
    label: 'Home',
    path: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  },
  {
    to: '/search',
    label: 'Buscar',
    path: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  },
  {
    to: '/queue',
    label: 'Fila',
    path: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  },
  {
    to: '/voting',
    label: 'Votação',
    path: 'M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z',
  },
  {
    to: '/profile',
    label: 'Perfil',
    path: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  },
]

function isActive (to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <nav
    v-if="!cinematic.karaokeMode"
    class="bottom-nav"
    role="navigation"
    aria-label="Navegação principal"
  >
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="bottom-nav__item"
      :class="{ 'bottom-nav__item--active': isActive(tab.to) }"
      :aria-current="isActive(tab.to) ? 'page' : undefined"
      :aria-label="tab.label"
    >
      <svg
        class="bottom-nav__icon"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        aria-hidden="true"
        fill="currentColor"
      >
        <path :d="tab.path" />
      </svg>
      <span class="bottom-nav__label">{{ tab.label }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  height: calc(var(--nav-height) + var(--safe-bottom));
  padding-bottom: var(--safe-bottom);
  background: var(--bar);
  border-top: 1px solid var(--glass-border);
  display: flex;
  align-items: stretch;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.bottom-nav__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: var(--touch-min);
  min-height: var(--touch-min);
  padding: 8px 4px;
  color: var(--ink-faint);
  text-decoration: none;
  transition: color var(--t-fast) linear;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.bottom-nav__item--active {
  color: var(--ink);
}

.bottom-nav__icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.bottom-nav__label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}
</style>
