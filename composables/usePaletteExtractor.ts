import type { MonochromeMusicPalette } from '~/types/cinematic'

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
