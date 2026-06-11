<script setup lang="ts">
/**
 * Vinyl Arm (PRD Radiola §3.4) — o braço da radiola.
 * Pousa no disco com um micro-bounce de spring quando a música toca e
 * se levanta limpo quando pausa. Puramente decorativo e aria-hidden.
 * Omitido em telas estreitas pelo componente pai.
 */
defineProps<{ engaged: boolean }>()
</script>

<template>
  <div class="arm" :class="{ 'arm--engaged': engaged }" aria-hidden="true">
    <div class="arm__pivot" />
    <div class="arm__tube">
      <div class="arm__counterweight" />
      <div class="arm__headshell">
        <div class="arm__needle" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* O braço vive no canto superior-direito do disco e pivota sobre a base. */
.arm {
  position: absolute;
  top: -6%;
  right: -10%;
  width: 22%;
  height: 22%;
  z-index: 6;
  pointer-events: none;
}

.arm__pivot {
  position: absolute;
  top: 0;
  right: 0;
  width: 26%;
  height: 26%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, var(--chrome-hi, #e8e8e8), var(--chrome-lo, #2a2a2a) 80%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.4);
}

/* O tubo do braço pivota a partir do canto superior-direito (a base). */
.arm__tube {
  position: absolute;
  top: 11%;
  right: 11%;
  width: 8%;
  height: 120%;
  transform-origin: top center;
  /* Levantado/retraído por padrão */
  transform: rotate(18deg);
  transition: transform 0.42s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 999px;
  background: linear-gradient(90deg, #3a3a3a, #cfcfcf 45%, #f4f4f4 50%, #cfcfcf 55%, #2c2c2c);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

/* Pouso com micro-bounce de spring quando engatado */
.arm--engaged .arm__tube {
  transform: rotate(-27deg);
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.arm__counterweight {
  position: absolute;
  top: -14%;
  left: 50%;
  translate: -50% 0;
  width: 220%;
  height: 14%;
  border-radius: 999px;
  background: radial-gradient(circle at 40% 30%, #d8d8d8, #1c1c1c 85%);
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.3);
}

.arm__headshell {
  position: absolute;
  bottom: -6%;
  left: 50%;
  translate: -50% 0;
  width: 200%;
  height: 12%;
  border-radius: 2px;
  background: linear-gradient(180deg, #e0e0e0, #3a3a3a);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
}

.arm__needle {
  position: absolute;
  bottom: -55%;
  left: 50%;
  translate: -50% 0;
  width: 8%;
  height: 60%;
  background: linear-gradient(180deg, #bdbdbd, #f2f2f2);
}
</style>
