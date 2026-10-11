export type CleanTask = {
  id: string
  name: string
  status: 'done' | 'active' | 'upcoming'
  percent: number
  hasReported: boolean
}

export type CleanPhase = 'idle' | 'working' | 'needs-you' | 'stuck' | 'paused' | 'stopped' | 'done'

export type Checklist = {
  title: string
  phase: CleanPhase
  tasks: CleanTask[]
  needsYouReason: string | null
  stuckReason: string | null
  startedAt: number
  finishedAt: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'clean-view': { checklist: Checklist; tick: number; isCommandDraft: boolean }
  }
}
