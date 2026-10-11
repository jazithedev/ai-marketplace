export type GitInfo = {
  slug: string
  branch: string
  changed: number
  ahead: number
  behind: number
  at: number
}

declare module 'claude-code' {
  interface PluginState {
    'session-header': {
      git: GitInfo | null
      firstRequest: string | null
      goal: string | null
      modes: string[]
      isCommandDraft: boolean
    }
  }
}
