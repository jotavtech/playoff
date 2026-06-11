import { computed } from 'vue'
import type { VisualPreset } from '~/types/cinematic'
import { useMusicVisualStore } from '~/stores/musicVisual'
import { useCinematicStore } from '~/stores/cinematic'

/**
 * Chromatic Engine (PRD Radiola §4) — converte a paleta extraída da capa
 * em tokens CSS que assombram a cena. NUNCA transforma a UI em tema colorido:
 * o fundo continua preto/branco. A cor entra só em progress, halo do disco,
 * barras do visualizer e um tint atmosférico levíssimo (§4.2).
 *
 * A intensidade dos tokens varia por preset (§4.4): wallpaper expressa a cor
 * ao máximo; editorial a deixa quase só no accent da progress bar.
 */

const INTENSITY_BY_PRESET: Record<VisualPreset, number> = {
  'oled-wallpaper': 1.0,
  'room-stage':     0.8,
  'cinema':         0.7,
  'chrome-lab':     0.6,
  'editorial':      0.4,
  'focus':          0.3,
  'minimal-player': 0.2
}

/** Extrai [r,g,b] de uma string "rgb(r, g, b)". Fallback chrome neutro. */
function parseRgb (rgb: string): [number, number, number] {
  const m = rgb.match(/(\d+)\D+(\d+)\D+(\d+)/)
  if (!m) return [200, 202, 206]
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

export function useChromaticEngine () {
  const music = useMusicVisualStore()
  const cinematic = useCinematicStore()

  const intensity = computed(() => {
    const base = INTENSITY_BY_PRESET[cinematic.preset] ?? 0.6
    // Sem música tocando, a cor recua — a cena respira em preto/branco
    return music.currentTrack ? base : base * 0.25
  })

  /** Mapa de tokens CSS prontos para serem aplicados no viewport. */
  const tokens = computed<Record<string, string>>(() => {
    const [r, g, b] = parseRgb(music.chromatic.accent)
    const k = intensity.value

    return {
      '--music-accent': music.chromatic.accent,
      '--music-accent-soft': `rgba(${r}, ${g}, ${b}, ${(0.5 * k).toFixed(3)})`,
      '--music-glow': `rgba(${r}, ${g}, ${b}, ${(0.32 * k).toFixed(3)})`,
      '--music-bg-tint': `rgba(${r}, ${g}, ${b}, ${(0.055 * k).toFixed(3)})`,
      '--music-chromatic-intensity': k.toFixed(3),
      // Aberração cromática reativa ao beat (§4.5) — só quando há movimento
      '--music-aberration': music.beatActive && !cinematic.reducedMotion
        ? `${(2.4 * cinematic.effectiveMotion).toFixed(2)}px`
        : '0px'
    }
  })

  return { tokens, intensity }
}
