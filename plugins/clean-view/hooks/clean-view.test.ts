import { expect, mock, test } from 'claude-code/testing'

import { cleanName, fromTodos, normalize, planSteps, reportProgress, placeholders, errorSentence } from './clean-view'

const PLAN = 'mcp__clean-view__plan_steps'
const REPORT = 'mcp__clean-view__report_progress'
const world = (on: any): void => {
  mock.clock(on)
  mock.store(on)
  on('turn.start', (_$: any, e: any) => ({ turnId: e.turnId }))
  on('tool.call', () => ({ result: 'ok', text: 'ok' }) as any)
}

const band = async ($: any): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'clean-view', surface: 'terminal', component: 'AbovePrompt', props: AP })
  return JSON.stringify(await ui.drawn())
}

const AP = {
  hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 80,
  scroll: { bodyRows: 20 },
} as any

test('1. cleans names: code, paths and long names', () => {
  expect(cleanName('Build the pricing section in `src/Pricing.tsx`')).toBe('Build the pricing section in')
  expect(cleanName('Fix bug in src/app/main.ts today')).toBe('Fix bug in today')
  expect(cleanName('open Pricing.tsx')).toBe('Open')
  expect(cleanName('`x` /a/b')).toBe('Working on it')
  const long = cleanName('Write a really long winded description of the work that goes on and on forever')
  expect(long.length <= 40).toBe(true)
  expect(long.endsWith('…')).toBe(true)
})

test('5. a report of 100 checks off step one and starts step two', () => {
  const plan = planSteps(['Read your notes', 'Build the page', 'Polish the footer'])
  expect(plan.map(t => t.status)).toEqual(['active', 'upcoming', 'upcoming'])
  const after = reportProgress(plan, 'Read your notes', 100)
  expect(after.map(t => t.status)).toEqual(['done', 'active', 'upcoming'])
  const mid = reportProgress(after, 'Build the page', 250)
  expect(mid[1].percent).toBe(100)
  const skipped = reportProgress(plan, 'Polish the footer', 40)
  expect(skipped.map(t => t.status)).toEqual(['done', 'done', 'active'])
  const extra = reportProgress(plan, 'Ship it', 10)
  expect(extra.length).toBe(4)
})

test('to-do lists become checklist rows', () => {
  const rows = fromTodos([
    { content: 'Read notes', status: 'completed' },
    { content: 'Build pricing', status: 'in_progress' },
    { content: 'Add form', status: 'pending' },
  ])
  expect(rows.map(t => t.status)).toEqual(['done', 'active', 'upcoming'])
  expect(normalize(placeholders())[0].status).toBe('active')
  expect(errorSentence('429 rate limit')).toContain('usage limit')
})

test('5b. plan_steps then report_progress through the tools', async ($, on) => {
  world(on)
  await $.turn.start({ text: 'Make my page', turnId: 't1' })
  const planned = await $.tool.call({ tool: PLAN, steps: ['Read notes', 'Build page'] } as any)
  expect((planned as any).text ?? (planned as any).result).toContain('Planned 2 steps')
  await $.tool.call({ tool: REPORT, task: 'Read notes', percent: 100 } as any)
  const drawn = await band($)
  expect(drawn).toContain('✓')
  expect(drawn).toContain('Build page')
  expect(drawn).toContain('▶')
})

test('6. any tool is denied before a plan exists and allowed after', async ($, on) => {
  world(on)
  await $.turn.start({ text: 'Make my page', turnId: 't1' })
  const denied = await $.tool.call({ tool: 'Bash', command: 'ls' } as any)
  expect(JSON.stringify(denied)).toContain('plan')
  await $.tool.call({ tool: PLAN, steps: ['Read notes', 'Build page'] } as any)
  const allowed = await $.tool.call({ tool: 'Bash', command: 'ls' } as any)
  expect(JSON.stringify(allowed)).not.toContain('needs a plan first')
})

test('3. a permission prompt shows Needs you', async ($, on) => {
  world(on)
  on('classic.Notification', () => ({}) as any)
  await $.turn.start({ text: 'Make my page', turnId: 't1' })
  await $.classic.Notification({ message: 'Claude needs your permission', notification_type: 'permission_prompt' } as any)
  const drawn = await band($)
  expect(drawn).toContain('Needs you')
  expect(drawn).toContain('Claude needs your OK to continue')
})

test('4. /simple off hides the band, leaving the button', async ($, on) => {
  world(on)
  await $.command.run({ command: 'simple', args: 'off' } as any)
  const drawn = await band($)
  expect(drawn).toContain('Clean View: OFF')
  expect(drawn).not.toContain('Understand')
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`2. a to-do list and a 60% report render the rows on ${surface}`, async ($, on) => {
    world(on)
    await $.turn.start({ text: 'Make my page', turnId: 't1' })
    await $.tool.call({
      tool: 'TodoWrite',
      todos: [
        { content: 'Read your brand notes', status: 'completed', activeForm: 'Reading' },
        { content: 'Build the pricing section', status: 'in_progress', activeForm: 'Building' },
        { content: 'Add the contact form', status: 'pending', activeForm: 'Adding' },
        { content: 'Polish the footer', status: 'pending', activeForm: 'Polishing' },
      ],
    } as any)
    await $.tool.call({ tool: REPORT, task: 'Build the pricing section', percent: 60 } as any)
    const ui = await $.ui.mount({ plugin: 'clean-view', surface, component: 'AbovePrompt', props: AP } as any)
    const texts = JSON.stringify(await ui.drawn())
    for (const s of ['✓', '▶', '60%', 'Next', 'Up next', 'Done', 'Clean View: ON']) {
      expect(texts).toContain(s)
    }
    expect(await ui.find({ key: 'toggle' })).toBeDefined()
  })
}
