import type { MonochromeMusicPalette, ChromaticPalette } from '~/types/cinematic'

/**
 * Extrai luminância e acento cromático mínimo da capa via canvas.
 * Alimenta o MonochromeMusicPalette sem depender de biblioteca externa.
 * A cor resultante influencia apenas reflexos no chrome e progress accent —
 * nunca sequestra a identidade visual (PRD §5.1.2).
 */
export async function extractPalette (imageUrl: string): Promise<MonochromeMusicPalette> {
  if (!import.meta.client) return defaultPalette()

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const SIZE = 48
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(defaultPalette())

      ctx.drawImage(img, 0, 0, SIZE, SIZE)
      const data = ctx.getImageData(0, 0, SIZE, SIZE).data

      let totalLum = 0, totalR = 0, totalG = 0, totalB = 0
      const count = (SIZE * SIZE)

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2]
        // Luminância percebida (BT.709)
        totalLum += 0.2126 * r + 0.7152 * g + 0.0722 * b
        totalR += r; totalG += g; totalB += b
      }

      const lum = (totalLum / count) / 255
      const avgR = totalR / count, avgG = totalG / count, avgB = totalB / count
      const maxC = Math.max(avgR, avgG, avgB)
      const minC = Math.min(avgR, avgG, avgB)
      const contrast = (maxC - minC) / 255

      // Acento: cor dominante dessaturada (~40%) para usar como reflexo mínimo
      const accent = `rgb(${Math.round(avgR * 0.4 + 153 * 0.6)}, ${Math.round(avgG * 0.4 + 153 * 0.6)}, ${Math.round(avgB * 0.4 + 153 * 0.6)})`

      resolve({ luminance: lum, accent, contrast })
    }
    img.onerror = () => resolve(defaultPalette())
    img.src = imageUrl
  })
}

function defaultPalette (): MonochromeMusicPalette {
  return { luminance: 0.5, accent: '#9a9a9a', contrast: 0.5 }
}

/**
 * Chromatic Engine (PRD Radiola §4.1) — extrai a personalidade cromática
 * da capa: cor dominante, cor de destaque (mais saturada), luminância,
 * saturação e temperatura. Produz os tokens accent/glow/bgTint.
 *
 * A cor resultante assombra a cena (progress, halo, barras) mas o fundo
 * continua preto/branco — nunca vira tema colorido (PRD §5.1.2).
 */
export async function extractChromaticPalette (imageUrl: string): Promise<ChromaticPalette> {
  if (!import.meta.client) return defaultChromatic()

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const SIZE = 64
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = SIZE
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return resolve(defaultChromatic())

      ctx.drawImage(img, 0, 0, SIZE, SIZE)
      let data: Uint8ClampedArray
      try { data = ctx.getImageData(0, 0, SIZE, SIZE).data }
      catch { return resolve(defaultChromatic()) }

      let totalLum = 0, totalR = 0, totalG = 0, totalB = 0
      const count = SIZE * SIZE

      // Acumula a cor de destaque ponderada por saturação² (realça o que é vivo)
      let accentR = 0, accentG = 0, accentB = 0, accentWeight = 0
      let maxSat = 0

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2]
        totalLum += 0.2126 * r + 0.7152 * g + 0.0722 * b
        totalR += r; totalG += g; totalB += b

        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        const sat = max === 0 ? 0 : (max - min) / max
        if (sat > maxSat) maxSat = sat

        // Pixels muito escuros ou estourados não contribuem para o accent
        const lumPx = max / 255
        if (lumPx > 0.12 && lumPx < 0.96) {
          const w = sat * sat * (0.5 + 0.5 * lumPx)
          accentR += r * w; accentG += g * w; accentB += b * w
          accentWeight += w
        }
      }

      const lum = (totalLum / count) / 255
      const domR = Math.round(totalR / count)
      const domG = Math.round(totalG / count)
      const domB = Math.round(totalB / count)

      let aR: number, aG: number, aB: number
      if (accentWeight > 0.0001) {
        aR = accentR / accentWeight
        aG = accentG / accentWeight
        aB = accentB / accentWeight
      } else {
        // Capa praticamente monocromática: usa o dominante levemente clareado
        aR = domR; aG = domG; aB = domB
      }

      // Garante vivacidade e legibilidade do accent
      const { r: vR, g: vG, b: vB } = vivify(aR, aG, aB, maxSat)

      const temperature: ChromaticPalette['temperature'] =
        vR - vB > 24 ? 'warm' : vB - vR > 24 ? 'cool' : 'neutral'

      resolve({
        accent: `rgb(${vR}, ${vG}, ${vB})`,
        glow: `rgba(${vR}, ${vG}, ${vB}, 0.28)`,
        bgTint: `rgba(${vR}, ${vG}, ${vB}, 0.05)`,
        dominant: `rgb(${domR}, ${domG}, ${domB})`,
        luminance: lum,
        saturation: maxSat,
        temperature
      })
    }
    img.onerror = () => resolve(defaultChromatic())
    img.src = imageUrl
  })
}

/**
 * Aumenta saturação e garante luminância mínima do accent.
 * Cores quase-brancas viram chrome neutro (PRD Radiola §4.3 — fallback de legibilidade).
 */
function vivify (r: number, g: number, b: number, sourceSat: number): { r: number; g: number; b: number } {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lum = max / 255

  // Capa lavada / branca: mantém um chrome legível em vez de uma cor lavada
  if (sourceSat < 0.08 || lum > 0.92) {
    return { r: 200, g: 202, b: 206 }
  }

  // Realça a saturação afastando cada canal do mínimo
  const boost = 0.4
  let rr = r + (r - min) * boost
  let gg = g + (g - min) * boost
  let bb = b + (b - min) * boost

  // Garante luminância mínima pra não sumir no fundo preto
  const newMax = Math.max(rr, gg, bb)
  if (newMax < 120 && newMax > 0) {
    const lift = 150 / newMax
    rr *= lift; gg *= lift; bb *= lift
  }

  return {
    r: Math.round(Math.min(255, Math.max(0, rr))),
    g: Math.round(Math.min(255, Math.max(0, gg))),
    b: Math.round(Math.min(255, Math.max(0, bb)))
  }
}

function defaultChromatic (): ChromaticPalette {
  return {
    accent: 'rgb(200, 202, 206)',
    glow: 'rgba(200, 202, 206, 0.2)',
    bgTint: 'rgba(200, 202, 206, 0.04)',
    dominant: 'rgb(140, 140, 144)',
    luminance: 0.5,
    saturation: 0,
    temperature: 'neutral'
  }
}
