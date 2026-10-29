import test from 'node:test'
import assert from 'node:assert/strict'
import { directionProblems, reviewText, tidyDecimals, factsFrom } from './reportChecks.js'

// The true figures for Rusizi as printed in the supplied report.
const facts = [
  { id: 'poverty', district_value: 44.2, national_value: 27.4, direction: 'above' },
  { id: 'grid_connection', district_value: 66.0, national_value: 50.8, direction: 'above' },
  { id: 'health_insurance', district_value: 78.1, national_value: 85.3, direction: 'below' },
  { id: 'vup_among_poor', district_value: 16.4, national_value: 15.9, direction: 'above' },
]

const RUSIZI_ERROR = '66.0% of Rusizi households have a grid connection, while 78.1% of people have health insurance. Both figures are below the national averages of 50.8% and 85.3% respectively.'

test('the Rusizi sentence that called electricity below the national average is detected', () => {
  const problems = directionProblems(RUSIZI_ERROR, facts)
  assert.equal(problems.length, 1)
  assert.deepEqual(problems[0].wrong, ['grid_connection'])
})

test('the Rusizi sentence is corrected from the data and the correction is recorded, not silent', () => {
  const { text, corrections } = reviewText(RUSIZI_ERROR, facts, 'results: Access')
  assert.match(text, /Grid electricity connection is 66\.0%, above the national figure of 50\.8%/)
  assert.match(text, /Health insurance coverage is 78\.1%, below the national figure of 85\.3%/)
  assert.doesNotMatch(text, /Both figures are below/)
  assert.equal(corrections.length, 1)
  assert.equal(corrections[0].original.startsWith('Both figures are below'), true)
  assert.match(corrections[0].reason, /contradicts the data/)
  assert.equal(directionProblems(text, facts).length, 0)
})

test('correct comparisons are left alone', () => {
  for (const sentence of [
    'Grid connection (66%) is higher than the national level (50.8%), while health-insurance coverage (78.1%) is lower than the national level (85.3%).',
    'Rusizi poverty rate (44.2%) is well above the national average (27.4%).',
    'Electricity access is relatively better, but health insurance is lower than the national average.',
    "Rusizi's poverty rate (44.2%) is higher than neighbouring Nyamasheke (42.8%).",
  ]) assert.deepEqual(directionProblems(sentence, facts), [], sentence)
})

test('sentences about the poverty line are not comparisons with the national figure (false alarms seen on real Rusizi text)', () => {
  for (const sentence of [
    '**Poverty rate:** 44.2% of people in Rusizi were below the EICV7 poverty line, compared with 27.4% nationally.',
    '- **Poverty rate:** 44.2% of people in Rusizi were below the EICV7 poverty line, compared with 27.4% nationally.',
    'Poverty gap = average shortfall below the poverty line across all people (non-poor count as zero).',
    'Households fall below the poverty line more often in large families than the national average suggests.',
  ]) {
    assert.deepEqual(directionProblems(sentence, facts), [], sentence)
    assert.equal(reviewText(sentence, facts, 'x').corrections.length, 0, sentence)
  }
})

test('a single wrong claim is caught, and "poverty" inside "extreme poverty" is not confused', () => {
  assert.equal(directionProblems('The electricity connection rate is lower than the national average.', facts).length, 1)
  assert.equal(directionProblems('Health insurance coverage is higher than the national level.', facts).length, 1)
  const extreme = [...facts, { id: 'extreme_poverty', district_value: 10.9, national_value: 5.4, direction: 'above' }]
  assert.deepEqual(directionProblems('Extreme poverty is higher than the national figure.', extreme), [])
  assert.equal(directionProblems('Extreme poverty is lower than the national figure.', extreme).length, 1)
})

test('"both" with two correct directions in separate clauses is accepted', () => {
  assert.deepEqual(directionProblems('Poverty is above the national average; health insurance is below the national average.', facts), [])
})

test('causal wording about the decomposition is softened and recorded', () => {
  const { text, corrections } = reviewText('Household size and dependants explain 4.3 percentage points of the poverty gap, and poverty is caused by large households.', facts, 'option 3')
  assert.match(text, /line up with 4\.3 percentage points/)
  assert.match(text, /associated with large households/)
  assert.equal(corrections.filter((item) => item.kind === 'language').length, 2)
})

test('confidence interval ends use one decimal place', () => {
  assert.equal(tidyDecimals('a 95% confidence interval of 37.43 to 50.9 percent'), 'a 95% confidence interval of 37.4 to 50.9 percent')
  assert.equal(tidyDecimals('The rate is 44.16% overall.'), 'The rate is 44.2% overall.')
  assert.equal(tidyDecimals('R-squared was 0.254 here.'), 'R-squared was 0.254 here.')
})

test('facts come from the engine verification, or are worked out from the findings when it did not run', () => {
  assert.equal(factsFrom({ verification: { directions: [{ id: 'poverty', district_value: 1, national_value: 2, direction: 'below' }] } })[0].direction, 'below')
  const fromFindings = factsFrom({ findings: { findings: [{ id: 'grid_connection', value: 66, national: 50.8 }, { id: 'modelled_change', value: 44, national: 27 }] } })
  assert.deepEqual(fromFindings.map((item) => [item.id, item.direction]), [['grid_connection', 'above']])
})
