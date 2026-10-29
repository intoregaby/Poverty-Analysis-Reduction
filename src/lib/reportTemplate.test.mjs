import test from 'node:test'
import assert from 'node:assert/strict'
import { GLOSSARY, REPORT_VERSION, SECTION_TITLES, explainTerms, assembleReport, narrativeText, readability } from './reportTemplate.js'
import { writeAiReport, unmatchedNumbers, buildDigest } from '../../tools/investigation/ai-report.mjs'

const result = {
  findings: { district: 'Gisagara', findings: [{ id: 'poverty', title: 'Poverty rate', value: 45.6, national: 27.4, unit: '% of people', sample: 486, explanation: 'x', limitations: 'y' }] },
  data_used: { used: [{ dataset: 'EICV7 2023/24 cross-section', file: 'T2 Finance and Poverty - EICV7.zip', status: 'Used' }, { dataset: 'FinScope 2024', file: 'T2 Finance and Poverty - FinScope.dta', status: 'Completed' }, { dataset: 'Other', file: 'o.csv', status: 'Not used' }, { dataset: 'Ref', file: null, status: 'Reference' }] },
  source_register: [{ id: 'eicv7-main', publisher: 'NISR', title: 'EICV7 Main Indicators Report', url: 'https://statistics.gov.rw/x', data_period: '2023/24' }, { id: 'worldbank-wdi', publisher: 'World Bank', title: 'WDI', url: 'https://api.worldbank.org/x' }],
  drivers: { gap_points: 18.2 },
}

test('a technical term is explained in brackets at its first use only', () => {
  const seen = new Set()
  const first = explainTerms('The standard error is small. Another standard error is large.', seen)
  assert.match(first, /standard error \(a number that shows how much a survey result could change just by chance\) is small\. Another standard error is large\./)
  assert.equal(explainTerms('A standard error appears again.', seen), 'A standard error appears again.')
})

test('a term the writer already explained is left alone', () => {
  assert.equal(explainTerms('The standard error (the chance spread) is 2.7.', new Set()), 'The standard error (the chance spread) is 2.7.')
})

test('bold terms keep their formatting', () => {
  assert.equal(explainTerms('Many **households** lack power.', new Set()), 'Many **households** (people who live together and share meals) lack power.')
})

test('glossary meanings contain no other glossary term and no figures', () => {
  for (const entry of GLOSSARY) {
    const others = GLOSSARY.filter((other) => other !== entry)
    for (const other of others) assert.equal(new RegExp(`(?<![\\w-])(?:${other.pattern})(?![\\w-])`, 'i').test(entry.meaning), false, `${entry.term} meaning mentions ${other.term}`)
    assert.equal(/\d/.test(entry.meaning.replace('2020', '')), false, `${entry.term} meaning has a number`)
    assert.ok(entry.meaning.split(' ').length <= 22, `${entry.term} meaning is too long`)
  }
})

const parts = {
  title: 'Gisagara', subtitle: 'EICV7', objective: 'This report asks how poor Gisagara is.', main_points: ['The poverty rate is 45.6%, against 27.4% in Rwanda.'],
  key_numbers: [{ label: 'Poverty rate', value: '45.6%', context: 'Rwanda 27.4%' }], background: 'Many households live on little.', questions: ['How does it compare?'], scope: ['Place: Gisagara.'],
  sections: [{ heading: 'What we found', body: 'The gap is 18.2 percentage points.', chart: 'findings' }], how_sure: 'The standard error is small.',
  interpretation: 'About 46 of every 100 people are poor.', comparison: 'Higher than Rwanda.', risks: ['Small samples.'], conclusion: 'Poverty is higher here.', options: [], next_steps: ['Check the data.'],
}

test('the assembled report follows the standard outline and explains terms once', () => {
  const report = assembleReport(parts, result, '2026-10-29T00:00:00Z')
  assert.equal(report.version, REPORT_VERSION)
  for (const key of ['executive_summary', 'introduction', 'methodology', 'results', 'discussion', 'conclusion', 'appendices']) assert.ok(report[key], key)
  assert.equal(SECTION_TITLES.length, 8)
  assert.match(report.executive_summary.main_points[0], /poverty rate \(the share of people/)
  assert.equal((narrativeText(report).match(/poverty rate \(/g) || []).length, 1)
  const terms = report.appendices.glossary.map((item) => item.term)
  assert.ok(terms.includes('poverty rate') && terms.includes('standard error') && terms.includes('percentage points'))
  assert.equal(new Set(terms).size, terms.length)
})

test('methodology and references come from the engine results, not the writer', () => {
  const report = assembleReport(parts, result)
  assert.match(report.methodology.sampling[0], /486 surveyed/)
  assert.ok(report.methodology.data_sources.some((item) => item.text.includes('FinScope') && item.file === 'FinScope.dta'))
  assert.equal(report.methodology.data_sources[0].file, 'EICV7.zip')
  assert.ok(!report.methodology.data_sources.some((item) => /Other|Ref/.test(item.text)))
  assert.ok(report.methodology.tools.some((line) => /Oaxaca-Blinder/.test(line)))
  assert.deepEqual(report.appendices.references, [{ publisher: 'NISR', title: 'EICV7 Main Indicators Report', url: 'https://statistics.gov.rw/x', period: '2023/24' }])
})

test('glossary text added by the system is not reported as an unverified figure', () => {
  const report = assembleReport(parts, result)
  const digest = buildDigest({ ...result, comparison: undefined })
  assert.deepEqual(unmatchedNumbers(report, { ...digest, extra: [45.6, 27.4, 18.2, 486, 46, 100] }), [])
})

test('rounding a verified figure is not reported as an unverified number', () => {
  const report = assembleReport({ ...parts, interpretation: 'About 46 of every 100 people are poor, and 39 of 100 homes have power.' }, result)
  assert.deepEqual(unmatchedNumbers(report, { findings: [{ value_pct: 45.6 }, { value_pct: 39.1 }, { value_pct: 27.4 }, { value_pct: 18.2 }] }), [])
})

test('the chat and notebook plain-text stand-ins are still checked for unverified numbers', () => {
  const stand = (text) => ({ executive_summary: text, sections: [], key_numbers: [], options: [] })
  assert.deepEqual(unmatchedNumbers(stand('Poverty is 45.6% here.'), { value: 45.6 }), [])
  assert.deepEqual(unmatchedNumbers(stand('Poverty is 77.7% here.'), { value: 45.6 }), ['77.7'])
})

test('readability reports sentence length', () => {
  assert.equal(readability(['Short one here. Another short sentence now.']).long_sentences, 0)
  assert.equal(readability([`${'word '.repeat(40)}end.`]).long_sentences, 1)
})

test('the AI writer output is cleaned into the new layout and incomplete answers are refused', async () => {
  const raw = { ...parts, objective: parts.objective }
  const reply = (body) => async () => ({ ok: true, status: 200, headers: new Headers(), clone() { return this }, text: async () => '', json: async () => ({ choices: [{ message: { content: JSON.stringify(body) } }] }) })
  const providers = [{ name: 'Test', url: 'https://example.test', model: 'm', key: 'k', reasoning: false }]
  const written = await writeAiReport(result, providers, reply(raw))
  assert.equal(written.report.version, REPORT_VERSION)
  assert.equal(written.report.results.sections[0].chart, 'findings')
  await assert.rejects(writeAiReport(result, providers, reply({ ...raw, objective: '' })), /incomplete/)
})
