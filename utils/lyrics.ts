import type { LyricLine } from '../types/lyrics.ts'

export function parseLrc (lrc: string): LyricLine[] {
  const offset = Number(lrc.match(/^\s*\[offset:\s*([+-]?\d+)\s*\]/im)?.[1] ?? 0)
  const lines = lrc.split(/\r?\n/).flatMap(raw => {
    const stamps = [...raw.matchAll(/\[(\d+):([0-5]\d)(?:[.:](\d{1,3}))?\]/g)]
    const last = stamps.at(-1)
    if (!last) return []
    const text = raw.slice(last.index + last[0].length).trim()
    return stamps.map(([, min, sec, fraction]) => ({
      at: Math.max(0, Number(min) * 60_000 + Number(sec) * 1000 + Number((fraction ?? '').padEnd(3, '0')) + offset),
      text
    }))
  }).sort((a, b) => a.at - b.at)
  return lines.some(line => line.text) ? lines : []
}

export function activeLyric (lines: LyricLine[], ms: number): number {
  let low = 0
  let high = lines.length
  while (low < high) {
    const mid = (low + high) >>> 1
    if (lines[mid].at <= ms) low = mid + 1
    else high = mid
  }
  return low - 1
}
