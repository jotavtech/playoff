/**
 * Vinyl Physics (PRD Radiola §3.2, §6.2) — integrador de rotação do disco.
 *
 * Não é um composable reativo: é uma máquina de estado pura que o VinylDisc
 * alimenta a cada frame (rAF) e cujo ângulo é escrito direto no DOM, sem passar
 * pela reatividade do Vue (60fps sem re-render).
 *
 * O segredo da sensação de radiola está aqui: a velocidade angular nunca pula.
 * Ela persegue o alvo com easing exponencial — o disco ganha rotação ao tocar
 * e perde força ao pausar, como um motor real, nunca um corte seco.
 */

export interface VinylPhysics {
  /** Avança a simulação. Retorna o ângulo acumulado em graus (0..360). */
  tick (dtMs: number, targetRpm: number): number
  /** Velocidade angular atual em RPM. */
  readonly rpm: number
  /** Zera o estado (troca de faixa dura, sair do modo). */
  reset (): void
}

export function useVinylPhysics (): VinylPhysics {
  let angle = Math.random() * 360   // começa em posição aleatória — cada disco é único
  let currentRpm = 0

  // Constante de tempo da perseguição. Subir é mais rápido que descer:
  // o disco acelera com vontade e desacelera com peso (inércia do prato).
  const SPIN_UP = 0.9     // por segundo
  const SPIN_DOWN = 0.55  // por segundo — desaceleração mais demorada

  return {
    tick (dtMs: number, targetRpm: number): number {
      const dt = Math.min(dtMs, 100) / 1000   // clamp anti-salto após aba inativa

      const rate = targetRpm > currentRpm ? SPIN_UP : SPIN_DOWN
      // Aproximação exponencial estável independente de framerate
      const k = 1 - Math.exp(-rate * dt * 6)
      currentRpm += (targetRpm - currentRpm) * k

      // Abaixo de um limiar, assenta em zero (evita micro-tremor eterno)
      if (targetRpm === 0 && currentRpm < 0.05) currentRpm = 0

      // RPM → graus por segundo (rpm * 360 / 60 = rpm * 6)
      angle = (angle + currentRpm * 6 * dt) % 360
      return angle
    },

    get rpm () { return currentRpm },

    reset () {
      angle = Math.random() * 360
      currentRpm = 0
    }
  }
}
