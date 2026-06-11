<script setup lang="ts">
/**
 * Vinyl Arm (PRD Radiola §3.4) — o braço da radiola.
 * Pivô no canto superior-direito do disco; o tubo desce e pousa a agulha
 * sobre a superfície do vinil com micro-bounce de spring quando a música toca,
 * e se levanta limpo quando pausa. Decorativo e aria-hidden.
 */
defineProps<{ engaged: boolean }>()
</script>

<template>
  <div class="arm" :class="{ 'arm--engaged': engaged }" aria-hidden="true">
    <!-- Base / pivô -->
    <div class="arm__base">
      <div class="arm__base-cap" />
    </div>

    <!-- Tubo do braço, pivota a partir do centro da base -->
    <div class="arm__tube">
      <div class="arm__counterweight" />
      <div class="arm__head">
        <div class="arm__needle" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.arm {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
}

/* Base / pivô — disco metálico no canto superior-direito */
.arm__base {
  position: absolute;
  top: 6%;
  right: 8%;
  width: 11%;
  height: 11%;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 30%, #f0f0f0, #2a2a2a 78%);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.65), inset 0 1px 2px rgba(255, 255, 255, 0.5);
}

.arm__base-cap {
  position: absolute;
  inset: 32%;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #d0d0d0, #161616);
}

/*
 * Tubo: ancorado no centro da base (top/right batem com o centro do pivô).
 * transform-origin no topo = o pivô. Rotação positiva balança a agulha para
 * a esquerda, sobre o disco.
 */
.arm__tube {
  position: absolute;
  top: 11.5%;
  right: 13.5%;
  width: 3.4%;
  height: 42%;
  transform-origin: top center;
  transform: rotate(14deg);   /* levantado/retraído, fora do disco */
  transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 999px;
  background: linear-gradient(90deg, #2c2c2c, #cccccc 42%, #f6f6f6 50%, #c4c4c4 58%, #242424);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.55);
}

/* Pouso sobre o disco com micro-bounce de spring */
.arm--engaged .arm__tube {
  transform: rotate(40deg);
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Contrapeso atrás do pivô */
.arm__counterweight {
  position: absolute;
  top: -7%;
  left: 50%;
  translate: -50% 0;
  width: 320%;
  height: 9%;
  border-radius: 999px;
  background: radial-gradient(circle at 40% 30%, #dadada, #1a1a1a 85%);
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.3);
}

/* Headshell na ponta do tubo */
.arm__head {
  position: absolute;
  bottom: -2%;
  left: 50%;
  translate: -50% 0;
  width: 260%;
  height: 9%;
  border-radius: 2px;
  background: linear-gradient(180deg, #e4e4e4, #333);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.55);
}

/* Agulha tocando o sulco */
.arm__needle {
  position: absolute;
  bottom: -70%;
  left: 50%;
  translate: -50% 0;
  width: 14%;
  height: 70%;
  background: linear-gradient(180deg, #c0c0c0, #f4f4f4);
}
</style>
