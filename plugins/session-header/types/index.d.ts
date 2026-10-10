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
      firstPrompt: string | null
      goalOverride: string | null
      modes: string[]
      isCommandDraft: boolean
    }
  }
}
