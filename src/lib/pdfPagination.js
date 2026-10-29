// Decides where to cut a tall rendered page image into PDF pages. All numbers are pixels of the rendered image.
//
// A cut is never made through a line of text or a chart (a "protected" span) and never right after a heading (the heading would be
// left alone at the foot of a page). If the current page would be mostly empty before the first clean cut, a new page starts first.

const inside = (position, spans) => spans.some(([top, bottom]) => position > top + 0.5 && position < bottom - 0.5);
const afterHeading = (position, headingBottoms, gap) => headingBottoms.some((bottom) => position > bottom - 0.5 && position <= bottom + gap);

// totalHeight: image height. firstCapacity: room left on the current page. pageCapacity: room on a fresh page.
// protectedSpans: [top, bottom] of text lines, list items, table rows, charts and cards small enough to fit on a page.
// headingBottoms: bottom edges of headings. Returns slices [{ top, bottom }].
export function choosePageCuts({ totalHeight, firstCapacity, pageCapacity, protectedSpans = [], headingBottoms = [], headingGap = 14, minimumFill = 0.3 }) {
  if (!(totalHeight > 0) || !(pageCapacity > 0)) return [];
  const slices = [];
  const edges = [...new Set(protectedSpans.flat().concat(headingBottoms).map((value) => Math.round(value)))].sort((a, b) => a - b);
  let position = 0;
  let capacity = firstCapacity > 0 ? firstCapacity : pageCapacity;
  while (totalHeight - position > capacity + 0.5) {
    const limit = position + capacity;
    const floor = position + capacity * minimumFill;
    const cuts = edges.filter((edge) => edge > position && edge <= limit && !inside(edge, protectedSpans) && !afterHeading(edge, headingBottoms, headingGap));
    const best = cuts.length ? cuts[cuts.length - 1] : null;
    // Little of the current page would be used before a clean cut: start a new page instead (an empty slice means "new page first").
    if (best !== null && best < floor && capacity < pageCapacity) {
      slices.push({ top: position, bottom: position });
      capacity = pageCapacity;
      continue;
    }
    // Cut at the last clean edge. Only when the content has none in reach is it cut at the limit.
    const cut = best !== null ? best : limit;
    slices.push({ top: position, bottom: cut });
    position = cut;
    capacity = pageCapacity;
  }
  if (position < totalHeight) slices.push({ top: position, bottom: totalHeight });
  return slices;
}
