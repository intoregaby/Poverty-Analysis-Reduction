import test from 'node:test'
import assert from 'node:assert/strict'
import { choosePageCuts } from './pdfPagination.js'

const lines = (count, height = 20, gap = 4, start = 0) => Array.from({ length: count }, (_, index) => [start + index * (height + gap), start + index * (height + gap) + height])

const covers = (slices, total) => {
  const drawn = slices.filter((slice) => slice.bottom > slice.top)
  assert.equal(drawn[0].top, 0)
  assert.equal(drawn[drawn.length - 1].bottom, total)
  drawn.slice(1).forEach((slice, index) => assert.equal(slice.top, drawn[index].bottom, 'slices must be contiguous with nothing lost or repeated'))
}

test('a block that fits is not cut', () => {
  assert.deepEqual(choosePageCuts({ totalHeight: 500, firstCapacity: 600, pageCapacity: 800 }), [{ top: 0, bottom: 500 }])
})

test('a tall block is never cut through a line of text', () => {
  const spans = lines(120)
  const slices = choosePageCuts({ totalHeight: 2880, firstCapacity: 800, pageCapacity: 800, protectedSpans: spans })
  covers(slices, 2880)
  for (const slice of slices.slice(0, -1)) {
    assert.ok(slice.bottom - slice.top <= 800)
    assert.equal(spans.some(([top, bottom]) => slice.bottom > top && slice.bottom < bottom), false, `cut at ${slice.bottom} runs through a line`)
  }
})

test('a heading is never left alone at the foot of a page', () => {
  // text lines up to 770, a heading 770-790, then its paragraph from 794
  const spans = [...lines(30, 20, 4), [770, 790], [794, 814], [818, 838]]
  const slices = choosePageCuts({ totalHeight: 1600, firstCapacity: 800, pageCapacity: 800, protectedSpans: spans, headingBottoms: [790] })
  assert.ok(slices[0].bottom <= 746 || slices[0].bottom < 790, `the first page ends at ${slices[0].bottom}, directly after the heading`)
  assert.notEqual(slices[0].bottom, 790)
})

test('when little of the current page is left, the next block starts a new page instead of being squeezed in', () => {
  // only 120 left on the page, and the first clean cut is a card that is 490 tall: it must not be split to fill the gap
  const spans = [[0, 10], [10, 500], [504, 524], [528, 548]]
  const slices = choosePageCuts({ totalHeight: 1500, firstCapacity: 120, pageCapacity: 800, protectedSpans: spans, minimumFill: 0.3 })
  assert.deepEqual(slices[0], { top: 0, bottom: 0 }, 'an empty first slice means: start a new page first')
  covers(slices, 1500)
})

test('a leading empty slice is followed by drawn content, so no blank page can result', () => {
  const slices = choosePageCuts({ totalHeight: 1500, firstCapacity: 120, pageCapacity: 800, protectedSpans: [[0, 10], [10, 500], [504, 524], [528, 548]] })
  const drawn = slices.filter((slice) => slice.bottom > slice.top)
  assert.ok(drawn.length >= 2)
  assert.ok(drawn.every((slice) => slice.bottom - slice.top > 100), 'no nearly empty pages')
})

test('every page respects its capacity and the last page carries the remainder', () => {
  const slices = choosePageCuts({ totalHeight: 5000, firstCapacity: 300, pageCapacity: 800, protectedSpans: lines(200) })
  covers(slices, 5000)
  assert.ok(slices[0].bottom - slices[0].top <= 300)
  slices.slice(1).forEach((slice) => assert.ok(slice.bottom - slice.top <= 800))
})

test('content with no clean cut in reach is cut at the page limit rather than overflowing', () => {
  const slices = choosePageCuts({ totalHeight: 2000, firstCapacity: 800, pageCapacity: 800, protectedSpans: [[0, 2000]] })
  assert.deepEqual(slices.map((slice) => slice.bottom), [800, 1600, 2000])
})

test('nothing is produced for an empty image', () => {
  assert.deepEqual(choosePageCuts({ totalHeight: 0, firstCapacity: 800, pageCapacity: 800 }), [])
})
