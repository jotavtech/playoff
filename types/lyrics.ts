export interface LyricLine {
  at: number
  text: string
}

export type LyricsPayload =
  | { kind: 'synced'; lines: LyricLine[] }
  | { kind: 'plain'; text: string }
  | { kind: 'instrumental' | 'missing' }
