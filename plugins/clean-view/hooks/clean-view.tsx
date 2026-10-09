import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Checklist, CleanPhase, CleanTask } from '../types'

type On = Parameters<Register>[0]

const enabled = atom({ plugin: 'clean-view', key: 'cleanViewEnabled' } as const, true)
const tick = atom({ plugin: 'clean-view', key: 'tick' } as const, 0)

export const IDLE: Checklist = {
  title: '',
  phase: 'idle',
  tasks: [],
  needsYouReason: null,
  stuckReason: null,
  startedAt: 0,
  finishedAt: null,
  isCollapsed: false,
}
const checklist = atom({ plugin: 'clean-view', key: 'checklist' } as const, IDLE)

const PLAN = 'mcp__clean-view__plan_steps'
const REPORT = 'mcp__clean-view__report_progress'
const ALWAYS_ALLOWED = new Set([
  'ToolSearch', 'TodoWrite', 'TaskCreate', 'TaskUpdate', 'AskUserQuestion', PLAN, REPORT,
])
const MAX_NAME = 40
const METER = 10

// ---------- pure helpers (exported for tests) ----------

const CODE_EXT = /\.(tsx?|jsx?|mjs|cjs|json|ya?ml|toml|md|mdx|py|rb|go|rs|java|kt|cs|php|css|scss|html?|sh|sql|lock|env)\b/i

export const cleanName = (raw: string): string => {
  const words = raw
    .replace(/`[^`]*`/g, ' ')
    .split(/\s+/)
    .filter(w => w !== '' && !w.includes('/') && !w.includes('\\') && !CODE_EXT.test(w))
  let s = words.join(' ').trim()
  if (s === '') return 'Working on it'
  s = s.charAt(0).toUpperCase() + s.slice(1)
  if (s.length > MAX_NAME) {
    const cut = s.slice(0, MAX_NAME - 1)
    const at = cut.lastIndexOf(' ')
    s = `${(at > 8 ? cut.slice(0, at) : cut).trimEnd()}…`
  }
  return s
}

const task = (id: string, name: string): CleanTask => ({
  id, name, status: 'upcoming', percent: 0, hasReported: false,
})

export const normalize = (tasks: CleanTask[]): CleanTask[] => {
  let seen = false
  return tasks.map(t => {
    if (t.status === 'done') return { ...t, percent: 100, hasReported: true }
    if (!seen) {
      seen = true
      return { ...t, status: 'active' as const }
    }
    return { ...t, status: 'upcoming' as const, percent: 0, hasReported: false }
  })
}

export const placeholders = (): CleanTask[] =>
  normalize([task('ph-1', 'Understand your request'), task('ph-2', 'Plan the steps')])

export const hasRealPlan = (tasks: readonly CleanTask[]): boolean =>
  tasks.some(t => !t.id.startsWith('ph-'))

export const planSteps = (names: readonly string[]): CleanTask[] =>
  normalize(names.slice(0, 8).map((n, i) => task(`s-${i + 1}`, cleanName(n))))

export const reportProgress = (
  tasks: readonly CleanTask[],
  name: string,
  rawPercent: number,
): CleanTask[] => {
  const percent = Math.min(100, Math.max(0, Math.round(Number.isFinite(rawPercent) ? rawPercent : 0)))
  const clean = cleanName(name)
  const key = clean.toLowerCase()
  let list = tasks.filter(t => !t.id.startsWith('ph-')).map(t => ({ ...t }))
  let i = list.findIndex(t => t.name.toLowerCase() === key)
  if (i < 0) i = list.findIndex(t => t.name.toLowerCase().includes(key) || key.includes(t.name.toLowerCase()))
  if (i < 0) {
    list = [...list, task(`s-${list.length + 1}`, clean)]
    i = list.length - 1
  }
  list = list.map((t, j) => (j < i ? { ...t, status: 'done' as const } : t))
  list[i] =
    percent >= 100
      ? { ...list[i], status: 'done', percent: 100, hasReported: true }
      : { ...list[i], status: 'active', percent, hasReported: true }
  return normalize(list)
}

export const fromTodos = (
  todos: ReadonlyArray<{ content: string; status: string }>,
): CleanTask[] =>
  normalize(
    todos.map((t, i) => ({
      ...task(`t-${i + 1}`, cleanName(t.content)),
      status: t.status === 'completed' ? ('done' as const) : ('upcoming' as const),
    })),
  )

export const errorSentence = (text: string): string => {
  const s = text.toLowerCase()
  if (/rate.?limit|usage limit|429|quota/.test(s)) return 'you hit your usage limit, try again a little later'
  if (/overload|529|busy|unavailable|503/.test(s)) return "Claude's servers are busy, try again in a minute"
  if (/context|too long|too many tokens|prompt is too long/.test(s)) return 'type /compact and try again'
  if (/network|econn|enotfound|fetch failed|connection|timed? ?out|offline/.test(s)) return 'the internet connection dropped'
  if (/auth|login|api key|401|credential|token expired/.test(s)) return 'type /login'
  return 'something went wrong, try again'
}

export const formatElapsed = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`
}

export const meter = (t: CleanTask, frame: number, isWaiting: boolean): string => {
  if (t.status === 'done') return '█'.repeat(METER)
  if (t.status === 'upcoming') return '░'.repeat(METER)
  if (!t.hasReported && !isWaiting) {
    const pos = (frame % (METER + 3)) - 3
    return Array.from({ length: METER }, (_, i) => (i >= pos && i < pos + 3 ? '█' : '░')).join('')
  }
  const filled = Math.round((t.percent / 100) * METER)
  return '█'.repeat(filled) + '░'.repeat(METER - filled)
}

const pad = (s: string, width: number): string => {
  const cut = s.length > width ? `${s.slice(0, Math.max(1, width - 1))}…` : s
  return cut.padEnd(width)
}

// ---------- the mod ----------

let timer: { cancel: () => void } | undefined
let failures = 0
let denials = 0


function syncTimer($: any, phase: CleanPhase): void {
  const isLive = phase === 'working' || phase === 'needs-you'
  if (isLive && timer === undefined) {
    timer = $.clock.every(250, () => {
      void update($, tick, n => n + 1)
    })
  } else if (!isLive && timer !== undefined) {
    timer.cancel()
    timer = undefined
  }
}

async function patch($: any, fn: (c: Checklist) => Checklist): Promise<Checklist> {
  const next = await update($, checklist, fn)
  const c = (next ?? (await read($, checklist))) as Checklist
  syncTimer($, c.phase)
  return c
}

async function setEnabled($: any, value: boolean): Promise<void> {
  await update($, enabled, () => value)
  await $.store.set('cleanViewEnabled', value)
  $.ui.toast(`Clean View is ${value ? 'on' : 'off'}`)
}

async function finish($: any, phase: CleanPhase, extra: Partial<Checklist>): Promise<void> {
  const now = await $.clock.now()
  await patch($, c => ({ ...c, phase, finishedAt: now, ...extra }))
  if (phase === 'done') {
    $.clock.after(5000, () => {
      void update($, checklist, c => (c.phase === 'done' ? { ...c, isCollapsed: true } : c))
    })
  }
}


export const registerCleanView = (on: On): void => {
  on('session.start', async ($, e, next) => {
    const saved = await $.store.get('cleanViewEnabled')
    if (typeof saved === 'boolean') await update($, enabled, () => saved)
    await $.command.register({
      name: 'simple',
      description: 'Turn Clean View on or off',
      argumentHint: 'on|off',
    })
    await $.tool.register({
      name: 'plan_steps',
      description:
        'Lay out every step of the job up front, 2 to 8 short plain-English names in order. The first step starts right away.',
      inputSchema: {
        type: 'object',
        properties: { steps: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 8 } },
        required: ['steps'],
      },
      isDeferred: false,
    })
    await $.tool.register({
      name: 'report_progress',
      description:
        'Report progress on a step of the plan. percent is 0 to 100; send 100 the moment the step finishes.',
      inputSchema: {
        type: 'object',
        properties: { task: { type: 'string' }, percent: { type: 'number' } },
        required: ['task', 'percent'],
      },
      isDeferred: false,
    })
    return next(e)
  })

  on('command.run', { command: 'simple' }, async ($, e) => {
    const arg = String((e as { args?: string }).args ?? '').trim().toLowerCase()
    const value = arg === 'on' ? true : arg === 'off' ? false : !(await read($, enabled))
    await setEnabled($, value)
    return { text: `Clean View is ${value ? 'on' : 'off'}.` }
  })

  on('prompt.compose', async ($, e, next) => {
    const out = await next(e)
    if (!(await read($, enabled))) return out
    const text = [
      'Clean View is on: the person sees only a checklist of your plan, not your tool calls.',
      '- Write every step name in plain English a non-technical person understands, under 40 characters, starting with a verb, like "Build the pricing section".',
      '- Never put file paths, file names, commands, code or tool names in a step name.',
      `- For every request, even a quick question, call ${PLAN} first (load it with ToolSearch if it is deferred). Then call ${REPORT} as real progress happens, and with percent 100 the moment a step finishes.`,
      '- If TodoWrite or TaskCreate is available, its to-do list can serve as the plan instead.',
    ].join('\n')
    return { ...out, sections: [...out.sections, { id: 'clean-view:rules', text, scope: 'session' as const }] }
  })

  on('turn.start', async ($, e, next) => {
    if (e.text.trim().startsWith('/') || !(await read($, enabled))) return next(e)
    const c = await read($, checklist)
    if (c.phase === 'working' || c.phase === 'needs-you') {
      await patch($, cur => ({ ...cur, phase: 'working', needsYouReason: null }))
      return next(e)
    }
    const now = await $.clock.now()
    failures = 0
    denials = 0
    await patch($, () => ({
      ...IDLE,
      title: 'Working on it',
      phase: 'working',
      tasks: placeholders(),
      startedAt: now,
    }))
    void $.model
      .complete({
        model: 'haiku',
        effort: 'low',
        maxTokens: 30,
        prompt: `Name this job in 2 to 6 plain words, starting with a verb. Reply with the name only.\n\nRequest: ${e.text.slice(0, 500)}`,
      })
      .then(async (r: any) => {
        if (!r.isAnswered) return
        const name = cleanName(String(r.text).split('\n')[0])
        await update($, checklist, cur => (cur.startedAt === now ? { ...cur, title: name } : cur))
      })
      .catch(() => undefined)
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined || !(await read($, enabled))) return next(e)
    const c = await read($, checklist)
    const isJob = c.phase === 'working' || c.phase === 'needs-you' || c.phase === 'stuck'
    if (isJob && !hasRealPlan(c.tasks) && !ALWAYS_ALLOWED.has(e.tool) && denials < 3) {
      denials += 1
      return {
        deny: `Clean View needs a plan first. Call ${PLAN} with 2 to 8 short plain-English steps, then continue.`,
      }
    }
    if (c.phase === 'needs-you' || (c.phase === 'working' && c.needsYouReason !== null)) {
      await patch($, cur => ({ ...cur, phase: 'working', needsYouReason: null }))
    }
    if (e.tool === 'AskUserQuestion') {
      await patch($, cur => ({ ...cur, phase: 'needs-you', needsYouReason: 'Claude has a question for you' }))
    } else if (e.tool === 'TodoWrite') {
      const todos = (e as { todos?: Array<{ content: string; status: string }> }).todos ?? []
      await patch($, cur => ({ ...cur, tasks: fromTodos(todos) }))
    } else if (e.tool === 'TaskCreate') {
      const subject = String((e as { subject?: string }).subject ?? '')
      await patch($, cur => {
        const real = cur.tasks.filter(t => !t.id.startsWith('ph-'))
        return { ...cur, tasks: normalize([...real, task(`n-${real.length + 1}`, cleanName(subject))]) }
      })
    } else if (e.tool === 'TaskUpdate') {
      const u = e as { taskId?: string; status?: string; subject?: string }
      await patch($, cur => {
        const list = cur.tasks
          .filter(t => !(u.status === 'deleted' && t.id === `n-${u.taskId}`))
          .map(t => {
            if (t.id !== `n-${u.taskId}`) return t
            const name = u.subject !== undefined ? cleanName(u.subject) : t.name
            if (u.status === 'completed') return { ...t, name, status: 'done' as const }
            return { ...t, name }
          })
        return { ...cur, tasks: normalize(list) }
      })
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: PLAN }, async ($, e) => {
    const steps = ((e as { steps?: unknown }).steps ?? []) as unknown
    const names = Array.isArray(steps) ? steps.map(String) : []
    if (names.length === 0) return { deny: 'Give at least one step.' }
    const tasks = planSteps(names)
    await patch($, c => ({ ...c, tasks }))
    return { result: `Planned ${tasks.length} steps. The first one has started.` }
  })

  on('tool.call', { tool: REPORT }, async ($, e) => {
    const r = e as { task?: string; percent?: number }
    const percent = Math.min(100, Math.max(0, Number(r.percent ?? 0)))
    await patch($, c => ({ ...c, tasks: reportProgress(c.tasks, String(r.task ?? ''), percent) }))
    return { result: `Progress noted: ${Math.round(percent)}%.` }
  })

  on('classic.Notification', async ($, e, next) => {
    const c = await read($, checklist)
    if ((c.phase === 'working' || c.phase === 'needs-you') && (await read($, enabled))) {
      await patch($, cur => ({ ...cur, phase: 'needs-you', needsYouReason: 'Claude needs your OK to continue' }))
    }
    return next(e)
  })

  on('classic.PermissionDenied', async ($, e, next) => {
    await patch($, c => ({
      ...c, phase: 'stuck', stuckReason: 'you said no to a step, so Claude paused',
    }))
    return next(e)
  })

  on('classic.PostToolUseFailure', async ($, e, next) => {
    if (e.is_interrupt === true) return next(e)
    failures += 1
    if (failures >= 3) {
      await patch($, c => ({
        ...c, phase: 'stuck', stuckReason: 'a step keeps failing, Claude is trying another way',
      }))
    }
    return next(e)
  })

  on('classic.PostToolUse', async ($, e, next) => {
    failures = 0
    const c = await read($, checklist)
    if (c.phase === 'stuck') await patch($, cur => ({ ...cur, phase: 'working', stuckReason: null }))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined || !(await read($, enabled))) return next(e)
    const c = await read($, checklist)
    if (c.phase === 'idle') return next(e)
    if (e.reason === 'error') {
      await finish($, 'stuck', { stuckReason: errorSentence(e.answer) })
    } else if (e.reason === 'refusal') {
      await finish($, 'stuck', { stuckReason: "Claude couldn't help with that request" })
    } else if (e.reason === 'aborted') {
      await finish($, 'stopped', {})
    } else if (c.tasks.some(t => t.status !== 'done')) {
      await patch($, cur => ({
        ...cur, phase: 'needs-you', needsYouReason: 'Claude is waiting for your reply',
      }))
      syncTimer($, 'idle')
    } else {
      await finish($, 'done', {})
    }
    return next(e)
  })

  // Hide the technical rows.
  for (const component of ['ToolUse', 'ToolResult', 'ToolGroup'] as const) {
    on('ui.render', { component }, async ($, e, next) => {
      if (!(await read($, enabled))) return next(e)
      const { Box } = $.ui.resolve(e)
      return <Box />
    })
  }

  on('ui.render', { component: 'ToolProgress' }, async ($, e, next) => {
    if (!(await read($, enabled))) return next(e)
    return next({ ...e, props: { ...e.props, hint: '' } })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const isOn = await read($, enabled)
    const c = await read($, checklist)
    const frame = await read($, tick)
    const now = await $.clock.now()

    const button = (
      <Button
        key="toggle"
        label={isOn ? '● Clean View: ON' : '○ Clean View: OFF'}
        onPress={() => setEnabled($, !isOn)}
      />
    )

    let left: any = null
    if (isOn && c.phase !== 'idle') {
      const took = formatElapsed((c.finishedAt ?? now) - c.startedAt)
      if (c.phase === 'working') {
        left = <Text bold>{c.title} · {took}</Text>
      } else if (c.phase === 'needs-you') {
        left = (
          <Text>
            <Text inverse bold> Needs you </Text> {c.needsYouReason}
          </Text>
        )
      } else if (c.phase === 'stuck') {
        left = <Text color="red">⚠ Stuck: {c.stuckReason}</Text>
      } else if (c.phase === 'stopped') {
        left = <Text dimColor>■ Stopped · {c.title} · you pressed Esc</Text>
      } else {
        left = <Text color="green">✓ All done · {c.title} · took {took}</Text>
      }
    }

    const isShort = c.phase === 'done' && c.isCollapsed
    const showRows = isOn && c.phase !== 'idle' && !isShort && c.tasks.length > 0
    const isWaiting = c.phase === 'needs-you'
    const nameWidth = Math.max(8, e.props.bodyColumns - 2 - METER - 2 - 9)

    return (
      <Box flexDirection="column">
        <Box justifyContent="space-between">
          <Box flexGrow={1}>{left}</Box>
          {button}
        </Box>
        {showRows &&
          c.tasks.map(t => {
            const icon = t.status === 'done' ? '✓' : t.status === 'active' ? (isWaiting ? '‖' : '▶') : '○'
            const first = c.tasks.find(x => x.status === 'upcoming')
            const label =
              t.status === 'done'
                ? 'Done'
                : t.status === 'active'
                  ? t.hasReported ? `${t.percent}%` : 'Working'
                  : t === first ? 'Next' : 'Up next'
            const dim = t.status !== 'active'
            return (
              <Text key={t.id} dimColor={t.status === 'upcoming' || t.status === 'done'}>
                <Text color={t.status === 'done' ? 'green' : undefined}>{icon} </Text>
                <Text bold={t.status === 'active'} dimColor={dim}>{pad(t.name, nameWidth)}</Text>
                {' '}{meter(t, frame, isWaiting)}  {label}
              </Text>
            )
          })}
      </Box>
    )
  })
}
