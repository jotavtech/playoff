export type PlayoffFeedbackKind =
  | 'success'
  | 'info'
  | 'warning'
  | 'error'

export type PlayoffFeedbackPreset =
  | 'coming-soon'
  | 'spotify-required'
  | 'preview-unavailable'
  | 'demo-mode'
  | 'loading'
  | 'error'
  | 'empty-state'
  | 'vote-locked'
  | 'battle-not-ready'

export interface PlayoffToastMessage {
  id: number
  title: string
  message: string
  kind: PlayoffFeedbackKind
}

const toasts = ref<PlayoffToastMessage[]>([])
let nextToastId = 1

const PRESETS: Record<PlayoffFeedbackPreset, Omit<PlayoffToastMessage, 'id'>> = {
  'coming-soon': {
    title: 'MODE CALIBRATING',
    message: 'This mode is being calibrated. Try Quick Battle for now.',
    kind: 'info'
  },
  'spotify-required': {
    title: 'SPOTIFY REQUIRED',
    message: 'Connect Spotify to generate taste-based battles.',
    kind: 'warning'
  },
  'preview-unavailable': {
    title: 'PREVIEW UNAVAILABLE',
    message: 'Preview unavailable. Open this track on Spotify instead.',
    kind: 'warning'
  },
  'demo-mode': {
    title: 'DEMO MODE ACTIVATED',
    message: 'Spotify signal lost. Demo battle mode activated.',
    kind: 'info'
  },
  loading: {
    title: 'CALIBRATING SIGNAL',
    message: 'Battle engine is warming up.',
    kind: 'info'
  },
  error: {
    title: 'BATTLE SIGNAL LOST',
    message: 'Something slipped out of phase. Demo fallback is ready.',
    kind: 'error'
  },
  'empty-state': {
    title: 'NO SIGNAL YET',
    message: 'Start your first battle to generate this section.',
    kind: 'info'
  },
  'vote-locked': {
    title: 'VOTE LOCKED',
    message: 'Your vote is locked. Waiting for the result.',
    kind: 'success'
  },
  'battle-not-ready': {
    title: 'BATTLE NOT READY',
    message: 'Battle engine is warming up. Try again in a second.',
    kind: 'warning'
  }
}

export function usePlayoffFeedback () {
  function removeToast (id: number) {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }

  function notify (
    input: PlayoffFeedbackPreset | Partial<Omit<PlayoffToastMessage, 'id'>>,
    timeoutMs = 3400
  ) {
    const base = typeof input === 'string'
      ? PRESETS[input]
      : {
          title: input.title ?? 'PLAYOFF SIGNAL',
          message: input.message ?? '',
          kind: input.kind ?? 'info'
        }

    const toast: PlayoffToastMessage = {
      id: nextToastId++,
      title: base.title,
      message: base.message,
      kind: base.kind
    }

    toasts.value = [toast, ...toasts.value].slice(0, 3)

    if (import.meta.client && timeoutMs > 0) {
      window.setTimeout(() => removeToast(toast.id), timeoutMs)
    }

    return toast.id
  }

  return {
    toasts,
    notify,
    removeToast
  }
}
