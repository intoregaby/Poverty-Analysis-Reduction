import test from 'node:test'
import assert from 'node:assert/strict'
import { answerInvestigationQuestion } from './ai-chat.mjs'
import { organizeNotebook } from './ai-notebook.mjs'

const result = { findings: { district: 'Kamonyi', findings: [{ id: 'poverty', title: 'Poverty rate', value: 39.7, national: 27.4, unit: '% of people', explanation: 'x', limitations: 'y' }] } }
const providers = [{ name: 'Test', url: 'https://example.test', model: 'm', key: 'k', reasoning: false }]
const reply = (content) => async () => ({ ok: true, status: 200, headers: new Headers(), clone() { return this }, text: async () => '', json: async () => ({ choices: [{ message: { content } }] }) })

test('the chat answers and still flags numbers that are not in the verified results', async () => {
  const answer = await answerInvestigationQuestion(result, { messages: [{ role: 'user', content: 'Why might poverty be this high here?' }] }, providers, [], [], [], [], reply('Poverty is 39.7% in Kamonyi, against 27.4% nationally. Some say 61.3% elsewhere.'))
  assert.match(answer.answer, /39\.7%/)
  assert.deepEqual(answer.unmatched_numbers, ['61.3'])
})

test('the notebook organiser still works and flags unverified numbers', async () => {
  const notebook = JSON.stringify({ summary: 'Poverty is 39.7% in Kamonyi.', key_facts: [{ fact: 'Poverty is 39.7%.', why_it_matters: 'It is above 27.4% nationally.' }], answered: [], decisions: [], open_questions: [], next_steps: [], changes: [] })
  const out = await organizeNotebook(result, [], [], providers, null, [], [], reply(notebook))
  assert.equal(out.notebook.summary, 'Poverty is 39.7% in Kamonyi.')
  assert.deepEqual(out.unmatched_numbers, [])
})
