import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { GitInfo } from '../types'

const git = atom({ plugin: 'session-header', key: 'git' } as const, null)
const firstPrompt = atom({ plugin: 'session-header', key: 'firstPrompt' } as const, null)
const goalOverride = atom({ plugin: 'session-header', key: 'goalOverride' } as const, null)
const modes = atom({ plugin: 'session-header', key: 'modes' } as const, [])
const isCommandDraft = atom({ plugin: 'session-header', key: 'isCommandDraft' } as const, false)

const MIN_BRANCH = 10
const MIN_GOAL_COLUMNS = 30
const FRAME_COLUMNS = 4
const BAR_CELLS = 10

export type Item = {
  key: string
  text: string
  color?: string
  bg?: string
  bold?: boolean
  dim?: boolean
  drop: number
  shrinks?: boolean
}

export const clip = (text: string, width: number): string =>
  width <= 0 ? '' : text.length <= width ? text : `${text.slice(0, width - 1)}…`

export const clipMiddle = (text: string, width: number): string => {
  if (width <= 0) return ''
  if (text.length <= width) return text
  if (width < 3) return clip(text, width)
  const head = Math.ceil((width - 1) / 2)
  const tail = Math.floor((width - 1) / 2)

  return `${text.slice(0, head)}…${text.slice(text.length - tail)}`
}

const rowWidth = (items: readonly Item[]): number =>
  items.reduce((sum, item) => sum + item.text.length, 0) + Math.max(0, items.length - 1)

export const fitRow = (items: readonly Item[], width: number): Item[] => {
  let row = [...items]

  while (rowWidth(row) > width) {
    const over = rowWidth(row) - width
    const shrinkable = row.find(item => item.shrinks === true && item.text.length - over >= MIN_BRANCH)
    if (shrinkable !== undefined) {
      row = row.map(item =>
        item === shrinkable ? { ...item, text: clipMiddle(item.text, item.text.length - over) } : item,
      )
      continue
    }
    const droppable = row.filter(item => item.drop > 0)
    if (droppable.length === 0) return row.map(item => ({ ...item, text: clip(item.text, width) }))
    const victim = droppable.reduce((worst, item) => (item.drop > worst.drop ? item : worst))
    row = row.filter(item => item !== victim)
  }

  return row
}

export const bar = (percent: number): string => {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * BAR_CELLS)

  return '▰'.repeat(filled) + '▱'.repeat(BAR_CELLS - filled)
}

export const compactTokens = (count: number): string =>
  count >= 1_000_000 ? `${(count / 1_000_000).toFixed(1)}M` : count >= 1000 ? `${Math.round(count / 1000)}k` : `${count}`

export const formatAge = (ms: number): string => {
  const minutes = Math.max(0, Math.floor(ms / 60_000))
  if (minutes < 60) return `${minutes}m`

  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`
}

export const modeColors = (mode: string): { bg: string; color: string } => {
  const label = mode.toLowerCase()
  if (label.includes('bypass')) return { bg: 'red', color: 'white' }
  if (label.includes('plan')) return { bg: 'cyan', color: 'black' }
  if (label.includes('accept')) return { bg: 'green', color: 'black' }
  if (label.includes('auto')) return { bg: 'magenta', color: 'white' }

  return { bg: 'gray', color: 'white' }
}

const limitLabels: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }

export type HeaderInfo = {
  git: GitInfo | null
  model: string
  mode: string
  contextPercent: number | null
  contextTokens: number | null
  contextWindow: number
  costUsd: number | null
  turns: number
  ageMs: number
  limits: readonly { kind: string; percentUsed: number }[]
}

const heat = (percent: number): string => (percent >= 80 ? 'red' : percent >= 60 ? 'yellow' : 'green')

export const identityRow = (info: HeaderInfo): Item[] => {
  const items: Item[] = []
  const repo = info.git
  if (repo !== null) {
    items.push({ key: 'slug', text: ` ◆ ${repo.slug} `, bg: 'blue', color: 'white', bold: true, drop: 0 })
    items.push({
      key: 'branch',
      text: ` ⎇ ${repo.branch} `,
      bg: repo.changed > 0 ? 'yellow' : 'green',
      color: 'black',
      bold: true,
      drop: 0,
      shrinks: true,
    })
    if (repo.changed > 0) items.push({ key: 'changed', text: `✚${repo.changed}`, color: 'yellow', bold: true, drop: 2 })
    if (repo.ahead > 0) items.push({ key: 'ahead', text: `↑${repo.ahead}`, color: 'green', drop: 3 })
    if (repo.behind > 0) items.push({ key: 'behind', text: `↓${repo.behind}`, color: 'red', drop: 3 })
  }
  items.push({ key: 'model', text: ` ✦ ${info.model} `, bg: 'magenta', color: 'white', bold: true, drop: 0 })
  const colors = modeColors(info.mode)
  items.push({ key: 'mode', text: ` ${info.mode} `, ...colors, bold: true, drop: 0 })

  return items
}

export const metricsRow = (info: HeaderInfo): Item[] => {
  const items: Item[] = []
  const percent = info.contextPercent
  items.push({
    key: 'ctx',
    text: percent === null ? 'ctx –' : `ctx ${bar(percent)} ${percent}%`,
    color: percent === null ? undefined : heat(percent),
    bold: true,
    drop: 0,
  })
  if (info.contextTokens !== null) {
    items.push({
      key: 'tokens',
      text: `${compactTokens(info.contextTokens)}/${compactTokens(info.contextWindow)}`,
      dim: true,
      drop: 5,
    })
  }
  if (info.costUsd !== null) items.push({ key: 'cost', text: `$${info.costUsd.toFixed(2)}`, color: 'yellow', bold: true, drop: 2 })
  items.push({ key: 'turns', text: `${info.turns} ${info.turns === 1 ? 'turn' : 'turns'}`, color: 'cyan', drop: 4 })
  items.push({ key: 'age', text: `⏱ ${formatAge(info.ageMs)}`, color: 'cyan', drop: 6 })
  info.limits.forEach((limit, index) => {
    items.push({
      key: `limit-${limit.kind}`,
      text: `${limitLabels[limit.kind] ?? limit.kind} ${Math.round(limit.percentUsed)}%`,
      color: heat(limit.percentUsed),
      drop: 7 + index,
    })
  })

  return items
}

export const goalLine = (goal: string | null, columns: number): string | null => {
  if (columns < MIN_GOAL_COLUMNS) return null

  return clip(goal === null ? '◎ goal: none yet — set one with /goal <text>' : `◎ goal: ${goal}`, columns)
}

export const innerColumns = (bodyColumns: number): number => Math.max(0, bodyColumns - FRAME_COLUMNS)

export const isCommandText = (text: string): boolean => text.trimStart().startsWith('/')

export const summarisePrompt = (text: string): string | null => {
  const trimmed = text.trim()
  if (trimmed === '' || trimmed.startsWith('/')) return null

  return trimmed.replace(/\s+/g, ' ')
}

const readGit = async ($: EngineInterface): Promise<GitInfo | null> => {
  const top = await $.process.run(['git', 'rev-parse', '--show-toplevel', '--abbrev-ref', 'HEAD'])
  if (top.exitCode !== 0) return null
  const [root = '', branch = ''] = top.stdout.trim().split('\n')
  const status = await $.process.run(['git', 'status', '--porcelain'])
  const counts = await $.process.run(['git', 'rev-list', '--left-right', '--count', '@{upstream}...HEAD'])
  const [behind = 0, ahead = 0] = counts.exitCode === 0 ? counts.stdout.trim().split(/\s+/).map(Number) : []

  return {
    slug: root.split('/').filter(Boolean).at(-1) ?? '',
    branch,
    changed: status.exitCode === 0 ? status.stdout.split('\n').filter(line => line.trim() !== '').length : 0,
    ahead,
    behind,
    at: await $.clock.now(),
  }
}

const refresh = async ($: EngineInterface) => {
  try {
    const info = await readGit($)
    await update($, git, () => info)
  } catch {
    await update($, git, () => null)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'goal',
      description: 'Set the goal line of the session header; no text clears it',
    })
    await refresh($)

    return next(e)
  })

  on('command.run', async ($, e, next) => {
    if (await read($, isCommandDraft)) {
      await update($, isCommandDraft, () => false)
    }

    return next(e)
  })

  on('command.run', { command: 'goal' }, async ($, e) => {
    const text = e.args.trim()
    await update($, goalOverride, () => (text === '' ? null : text))

    return { text: text === '' ? 'Goal cleared; the header shows the first prompt.' : `Goal set: ${text}` }
  })

  on('prompt.edit', async ($, e, next) => {
    const result = await next(e)
    const isCommand = isCommandText(result.text)
    if (isCommand !== (await read($, isCommandDraft))) {
      await update($, isCommandDraft, () => isCommand)
    }

    return result
  })

  on('prompt.submit', async ($, e, next) => {
    if (await read($, isCommandDraft)) {
      await update($, isCommandDraft, () => false)
    }
    const summary = summarisePrompt(e.text)
    if (summary !== null) {
      await update($, firstPrompt, current => current ?? summary)
    }
    await refresh($)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const labels = [...e.props.modes]
    const current = await read($, modes)
    if (labels.join('|') !== current.join('|')) {
      await update($, modes, () => labels)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (e.props.hasSurvey || (await read($, isCommandDraft))) return below

    const { Box, Text } = $.ui.resolve(e)
    const width = innerColumns(e.props.bodyColumns)
    const usage = await $.session.usage()
    const info: HeaderInfo = {
      git: await read($, git),
      model: await $.session.model(),
      mode: (await read($, modes)).join(' ').trim() || 'default',
      contextPercent: usage.context.percent ?? null,
      contextTokens: usage.context.tokens ?? null,
      contextWindow: usage.context.window,
      costUsd: usage.cost?.usd ?? null,
      turns: await $.session.turns(),
      ageMs: (await $.clock.now()) - usage.startedAt,
      limits: usage.rateLimits,
    }
    const goal = goalLine((await read($, goalOverride)) ?? (await read($, firstPrompt)), width)
    const rows = [fitRow(identityRow(info), width), fitRow(metricsRow(info), width)]

    return (
      <Box flexDirection="column">
        {below}
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
        {rows.map((row, index) => (
          <Box key={`row-${index}`} gap={1}>
            {row.map(item => (
              <Text
                key={item.key}
                bold={item.bold}
                dimColor={item.dim}
                color={item.color}
                backgroundColor={item.bg}
              >
                {item.text}
              </Text>
            ))}
          </Box>
        ))}
        {goal !== null && (
          <Text italic color="white">
            {goal}
          </Text>
        )}
        </Box>
      </Box>
    )
  })
}
