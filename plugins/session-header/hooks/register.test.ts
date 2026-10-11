import { expect, test } from 'claude-code/testing'

import {
  bar,
  clip,
  clipMiddle,
  compactTokens,
  fitRow,
  formatAge,
  goalLine,
  identityRow,
  innerColumns,
  isCommandText,
  metricsRow,
  modeColors,
  extractRequest,
  cleanSummary,
  workTranscript,
} from './register'
import type { HeaderInfo } from './register'

const info: HeaderInfo = {
  git: { slug: 'scum-map', branch: 'feature/637-route-planner-back-end', changed: 3, ahead: 1, behind: 0, at: 0 },
  model: 'sonnet-5-5',
  mode: 'plan',
  contextPercent: 42,
  contextTokens: 84_000,
  contextWindow: 200_000,
  costUsd: 1.234,
  turns: 7,
  ageMs: 95 * 60_000,
  limits: [{ kind: 'five_hour', percentUsed: 23.4 }],
}

const text = (items: { text: string }[]) => items.map(item => item.text).join(' ')

test('a wide row keeps every identity item', () => {
  const row = fitRow(identityRow(info), 120)

  expect(text(row)).toContain('scum-map')
  expect(text(row)).toContain('feature/637-route-planner-back-end')
  expect(text(row)).toContain('✚3')
  expect(text(row)).toContain('↑1')
  expect(row.map(item => item.key)).toContain('mode')
})

test('a clean branch is green and a dirty one yellow', () => {
  const dirty = identityRow(info).find(item => item.key === 'branch')
  const clean = identityRow({ ...info, git: { ...info.git!, changed: 0 } }).find(item => item.key === 'branch')

  expect(dirty?.bg).toBe('yellow')
  expect(clean?.bg).toBe('green')
})

test('a narrow row shrinks the branch in the middle first', () => {
  const row = fitRow(identityRow(info), 60)
  const branch = row.find(item => item.key === 'branch')

  expect(text(row).length).toBeLessThanOrEqual(60)
  expect(branch?.text).toContain('…')
  expect(row.map(item => item.key)).toEqual(expect.arrayContaining(['slug', 'model', 'mode']))
})

test('optional items are dropped before required ones', () => {
  const row = fitRow(metricsRow(info), 30)
  const keys = row.map(item => item.key)

  expect(keys).toContain('ctx')
  expect(keys).not.toContain('age')
  expect(text(row).length).toBeLessThanOrEqual(30)
})

test('outside a repository the git chips are omitted', () => {
  const keys = identityRow({ ...info, git: null }).map(item => item.key)

  expect(keys).toEqual(['model', 'mode'])
})

test('metrics show the context bar, cost, turns, age and rate limit', () => {
  const rendered = text(metricsRow(info))

  expect(rendered).toContain('ctx ▰▰▰▰▱▱▱▱▱▱ 42%')
  expect(rendered).toContain('84k/200k')
  expect(rendered).toContain('$1.23')
  expect(rendered).toContain('7 turns')
  expect(rendered).toContain('1h35m')
  expect(rendered).toContain('5h 23%')
})

test('helpers format values', () => {
  expect(bar(0)).toBe('▱▱▱▱▱▱▱▱▱▱')
  expect(bar(100)).toBe('▰▰▰▰▰▰▰▰▰▰')
  expect(compactTokens(950)).toBe('950')
  expect(compactTokens(1_500_000)).toBe('1.5M')
  expect(formatAge(5 * 60_000)).toBe('5m')
  expect(modeColors('bypass permissions').bg).toBe('red')
  expect(modeColors('default').bg).toBe('gray')
  expect(innerColumns(80)).toBe(76)
})

test('the goal line waits for the first request when empty and hides when narrow', () => {
  expect(goalLine(null, 80)).toContain('first request')
  expect(goalLine('fix it', 20)).toBeNull()
  expect(goalLine('x'.repeat(100), 40)?.length).toBe(40)
})

test('a bare slash command is no request, a command with text keeps the text', () => {
  expect(extractRequest('/model')).toBeNull()
  expect(extractRequest('/grill-me:grill-me build a mod')).toBe('build a mod')
  expect(extractRequest('  make   a\nmod ')).toBe('make a mod')
  expect(extractRequest('   ')).toBeNull()
})

test('a model reply is cleaned to one short phrase', () => {
  expect(cleanSummary('"Build a session header mod."\n\nExtra')).toBe('Build a session header mod')
  expect(cleanSummary('Goal: fix the login bug.')).toBe('fix the login bug')
  expect(cleanSummary('  \n ')).toBeNull()
  expect(cleanSummary('x'.repeat(300))?.length).toBe(120)
})

test('the work transcript lists the requests of the whole session, oldest first', () => {
  const messages = Array.from({ length: 100 }, (_, index) => [
    { role: 'user', text: `request ${index}` },
    { role: 'assistant', text: `answer ${index}` },
  ]).flat()
  const transcript = workTranscript(messages)

  expect(transcript).toContain('request 0')
  expect(transcript).toContain('request 99')
  expect(transcript).toContain('(100 in all')
  expect(transcript).not.toContain('answer')
  expect(transcript.indexOf('request 0')).toBeLessThan(transcript.indexOf('request 99'))
  expect(transcript.match(/^- /gm)?.length).toBe(36)
  expect(transcript.length).toBeLessThanOrEqual(8000)
})

test('the middle of a long session is sampled, not dropped', () => {
  const messages = Array.from({ length: 200 }, (_, index) => ({ role: 'user', text: `request ${index}` }))
  const picked = [...workTranscript(messages).matchAll(/request (\d+)/g)].map(match => Number(match[1]))

  expect(picked.some(n => n > 40 && n < 160)).toBe(true)
  expect(picked).toEqual([...picked].sort((a, b) => a - b))
})

test('command echoes, skill bodies and system notices are not requests', () => {
  const transcript = workTranscript([
    { role: 'user', text: 'build a mod' },
    { role: 'user', text: '<command-name>/plugin</command-name>' },
    { role: 'user', text: 'Base directory for this skill: /x' },
    { role: 'user', text: '[SYSTEM NOTIFICATION - NOT USER INPUT] hot reload' },
    { role: 'user', text: '<local-command-caveat>x</local-command-caveat>' },
  ])

  expect(transcript).toContain('build a mod')
  expect(transcript).toContain('(1 in all')
  expect(transcript).not.toContain('command-name')
})

test('clip helpers respect the width', () => {
  expect(clip('abcdef', 4)).toBe('abc…')
  expect(clipMiddle('abcdefghij', 5)).toBe('ab…ij')
})

test('a draft starting with a slash is a command, even after leading spaces', () => {
  expect(isCommandText('/goal fix it')).toBe(true)
  expect(isCommandText('  /goal')).toBe(true)
  expect(isCommandText('fix /goal')).toBe(false)
  expect(isCommandText('')).toBe(false)
})
