import { expect, mock, test } from 'claude-code/testing'

import { asksQuestion, isCommandText, cleanName, fromTodos, normalize, planSteps, reportProgress, placeholders, errorSentence } from './clean-view'

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

test('7. a running job is drawn as a bordered card set apart from the chat', async ($, on) => {
  world(on)
  await $.turn.start({ text: 'Make my page', turnId: 't1' })
  const drawn = await band($)
  expect(drawn).toContain('"borderStyle":"round"')
  expect(drawn).toContain('"borderColor":"cyan"')
  expect(drawn).toContain('"marginTop":1')
  expect(drawn).toContain('"width":76')
  // the name column is capped, so labels stay beside the names on a wide terminal
  const wide = await $.ui.mount({
    plugin: 'clean-view', surface: 'terminal', component: 'AbovePrompt', props: { ...AP, bodyColumns: 200 },
  } as any)
  expect(JSON.stringify(await wide.drawn())).toContain('"width":76')
})

const finishTurn = async ($: any, answer: string): Promise<string> => {
  await $.turn.complete({ answer, durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer' })
  return band($)
}

test('8. an unfinished plan with no question pauses instead of asking for you', async ($, on) => {
  world(on)
  on('turn.complete', (_$: any, e: any) => ({ text: e.answer }) as any)
  await $.turn.start({ text: 'Make my page', turnId: 't1' })
  await $.tool.call({ tool: PLAN, steps: ['Read notes', 'Build page'] } as any)
  const drawn = await finishTurn($, 'I pushed the branch.')
  expect(drawn).toContain('Paused')
  expect(drawn).toContain('2 steps left')
  expect(drawn).not.toContain('Needs you')
})

test('9. an unfinished plan whose answer asks something still needs you', async ($, on) => {
  world(on)
  on('turn.complete', (_$: any, e: any) => ({ text: e.answer }) as any)
  await $.turn.start({ text: 'Make my page', turnId: 't1' })
  await $.tool.call({ tool: PLAN, steps: ['Read notes', 'Build page'] } as any)
  const drawn = await finishTurn($, 'Which colour do you prefer?')
  expect(drawn).toContain('Needs you')
  expect(drawn).toContain('Claude is waiting for your reply')
})

test('10. the card steps aside while a slash command is typed', async ($, on) => {
  world(on)
  on('prompt.edit', (_$: any, e: any) => ({ text: e.text.slice(0, e.start) + e.inputText + e.text.slice(e.end), cursor: e.start + e.inputText.length }) as any)
  await $.turn.start({ text: 'Make my page', turnId: 't1' })
  expect(await band($)).toContain('Working on it')
  await $.prompt.edit({ origin: { kind: 'composer' }, text: '', cursor: 0, start: 0, end: 0, inputText: '/cre' } as any)
  const hidden = await band($)
  expect(hidden).not.toContain('Working on it')
  expect(hidden).not.toContain('Clean View: ON')
  await $.prompt.edit({ origin: { kind: 'composer' }, text: '/cre', cursor: 4, start: 0, end: 4, inputText: '' } as any)
  expect(await band($)).toContain('Working on it')
})

test('11. the card draws above another mod instead of replacing it', async ($, on) => {
  world(on)
  on('ui.render', { component: 'AbovePrompt' } as any, (m$: any, e: any) => {
    const { Text } = m$.ui.resolve(e)
    return (globalThis as any).h(Text, {}, 'BELOW-MARK')
  })
  await $.turn.start({ text: 'Make my page', turnId: 't1' })
  const drawn = await band($)
  expect(drawn).toContain('BELOW-MARK')
  expect(drawn).toContain('Working on it')
  expect(drawn.indexOf('Working on it')).toBeLessThan(drawn.indexOf('BELOW-MARK'))
})

test('helpers: question and command detection', () => {
  expect(asksQuestion('Done. Want me to open the PR?')).toBe(true)
  expect(asksQuestion('Done.')).toBe(false)
  expect(isCommandText('  /plugin')).toBe(true)
  expect(isCommandText('make a /thing')).toBe(false)
})
