import { describe, expect, it } from 'vitest'
import { renderDailyEmail, type RenderableItem } from './render'

const QUIZ: RenderableItem = {
  kind: 'quiz',
  title: 'Depolarization',
  body: {
    prompt: 'Which ion influx drives the rising phase of an action potential?',
    options: ['Na+', 'K+', 'Cl-', 'Ca2+'],
    correct_index: 0,
    explanation: 'Voltage-gated sodium channels open first.',
  },
}

const ADVENTURE: RenderableItem = {
  kind: 'adventure',
  title: 'The patient who cannot sleep',
  body: {
    opening_scenario: 'A 34-year-old presents with insomnia three weeks after starting an SSRI.',
    grading_rubric: 'Should connect serotonergic activity to sleep architecture.',
    max_turns: 8,
  },
}

const URL = 'https://notemaxxing.net/learn/r/abc.def'

describe('renderDailyEmail', () => {
  it('addresses the learner by first name only', () => {
    const e = renderDailyEmail({ learnerName: 'Max Lovejoy', item: QUIZ, answerUrl: URL })
    expect(e.text).toContain('Max')
    expect(e.text).not.toContain('Lovejoy')
  })

  it('handles a single-word name', () => {
    const e = renderDailyEmail({ learnerName: 'Max', item: QUIZ, answerUrl: URL })
    expect(e.text).toContain('Max')
  })

  it('puts the question in the quiz subject', () => {
    const e = renderDailyEmail({ learnerName: 'Max', item: QUIZ, answerUrl: URL })
    expect(e.subject).toContain('Depolarization')
  })

  it('uses a different subject shape for an adventure', () => {
    const quiz = renderDailyEmail({ learnerName: 'Max', item: QUIZ, answerUrl: URL })
    const adv = renderDailyEmail({ learnerName: 'Max', item: ADVENTURE, answerUrl: URL })
    expect(adv.subject).not.toBe(quiz.subject)
    expect(adv.subject).toContain('The patient who cannot sleep')
  })

  it('shows the quiz prompt', () => {
    const e = renderDailyEmail({ learnerName: 'Max', item: QUIZ, answerUrl: URL })
    expect(e.html).toContain('Which ion influx drives the rising phase')
    expect(e.text).toContain('Which ion influx drives the rising phase')
  })

  it('shows the adventure scenario', () => {
    const e = renderDailyEmail({ learnerName: 'Max', item: ADVENTURE, answerUrl: URL })
    expect(e.html).toContain('A 34-year-old presents with insomnia')
    expect(e.text).toContain('A 34-year-old presents with insomnia')
  })

  it('never leaks the answer or the explanation', () => {
    const e = renderDailyEmail({ learnerName: 'Max', item: QUIZ, answerUrl: URL })
    // correct_index and explanation belong on the page, after he answers.
    expect(e.html).not.toContain('Voltage-gated sodium channels')
    expect(e.text).not.toContain('Voltage-gated sodium channels')
  })

  it('never leaks the grading rubric', () => {
    const e = renderDailyEmail({ learnerName: 'Max', item: ADVENTURE, answerUrl: URL })
    expect(e.html).not.toContain('Should connect serotonergic activity')
    expect(e.text).not.toContain('Should connect serotonergic activity')
  })

  it('does not put the options in the email', () => {
    // Answering happens on the page, not in the inbox — that's the whole design.
    const e = renderDailyEmail({ learnerName: 'Max', item: QUIZ, answerUrl: URL })
    expect(e.html).not.toContain('Cl-')
    expect(e.text).not.toContain('Cl-')
  })

  it('links to the answer page in both html and text', () => {
    const e = renderDailyEmail({ learnerName: 'Max', item: QUIZ, answerUrl: URL })
    expect(e.html).toContain(URL)
    expect(e.text).toContain(URL)
  })

  it('escapes html in authored content', () => {
    const nasty: RenderableItem = {
      kind: 'quiz',
      title: 'XSS',
      body: { prompt: '<script>alert(1)</script> & "quoted"', options: [], correct_index: 0, explanation: '' },
    }
    const e = renderDailyEmail({ learnerName: 'Max', item: nasty, answerUrl: URL })
    expect(e.html).not.toContain('<script>')
    expect(e.html).toContain('&lt;script&gt;')
    expect(e.html).toContain('&amp;')
  })

  it('escapes html in the learner name', () => {
    const e = renderDailyEmail({ learnerName: '<b>Max</b>', item: QUIZ, answerUrl: URL })
    expect(e.html).not.toContain('<b>Max</b>')
  })

  it('produces a plain-text part with no markup', () => {
    const e = renderDailyEmail({ learnerName: 'Max', item: QUIZ, answerUrl: URL })
    expect(e.text).not.toMatch(/<[a-z]/i)
  })

  it('is deterministic — no clock, no randomness', () => {
    const a = renderDailyEmail({ learnerName: 'Max', item: QUIZ, answerUrl: URL })
    const b = renderDailyEmail({ learnerName: 'Max', item: QUIZ, answerUrl: URL })
    expect(a).toEqual(b)
  })

  it('tolerates an item whose body is missing fields', () => {
    // The bank is hand-authored; a malformed row must not break the send.
    const empty: RenderableItem = { kind: 'quiz', title: 'Bare', body: {} }
    const e = renderDailyEmail({ learnerName: 'Max', item: empty, answerUrl: URL })
    expect(e.subject).toContain('Bare')
    expect(e.html).toContain(URL)
  })
})
