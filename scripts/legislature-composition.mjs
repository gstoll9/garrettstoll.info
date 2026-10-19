// Parses a legislature's current party composition from its English Wikipedia infobox
// ("Political groups" row), which editors keep current after elections and defections.
//
// The rendered HTML is used rather than wikitext: templates (party colours, custom group
// lists) are already expanded, and sub-groups appear as nested lists. Leaf items are
// counted so blocs aren't double-counted with their member parties.

import { parse } from 'node-html-parser';

const UA = 'garrettstoll.info-worldmap/0.1 (https://github.com/gstoll9/garrettstoll.info)';

async function infoboxHtml(title) {
  const qs = new URLSearchParams({
    action: 'parse', page: title, prop: 'text', section: '0', format: 'json', formatversion: '2', redirects: '1',
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${qs}`, { headers: { 'User-Agent': UA } });
    if (res.ok) return (await res.json()).parse?.text ?? '';
    await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
  }
  return '';
}

const COLOR_RE = /background(?:-color)?\s*:\s*(#[0-9a-f]{3,6}|[a-z]+)/i;
const SEATS_RE = /\(\s*(\d{1,4})\s*(?:seats?|members?)?\s*\)|[:–—]\s*(\d{1,4})\s*(?:seats?)?\s*$/i;

// One line of the political-groups cell: a colour swatch, a name and a seat count
function parseLine(el) {
  const swatch = el.querySelectorAll('span, div').find(s => COLOR_RE.test(s.getAttribute('style') ?? '') && !s.text.trim());
  if (!swatch) return null;
  const text = el.text.replace(/\[\d+\]|\[[a-z]\]|\[note \d+\]/gi, '').replace(/\s+/g, ' ').trim();
  const m = SEATS_RE.exec(text);
  if (!m) return null;
  const link = el.querySelectorAll('a').find(a => (a.getAttribute('href') ?? '').startsWith('/wiki/') && !/^[[\d]/.test(a.text.trim()));
  const name = (link?.text || text.replace(SEATS_RE, '')).replace(/[:–—]\s*$/, '').trim();
  if (/vacan/i.test(text) && (!link || /vacan/i.test(name) || /^\d+$/.test(name))) {
    return { party: 'Vacant', party_wikipedia: '', color: '#ffffff', seats: +(m[1] ?? m[2]) };
  }
  if (!name || /^\d+$/.test(name)) return null;
  return {
    party: name,
    party_wikipedia: link ? decodeURIComponent(link.getAttribute('href').slice(6)).replace(/_/g, ' ') : '',
    color: COLOR_RE.exec(swatch.getAttribute('style'))[1].toLowerCase(),
    seats: +(m[1] ?? m[2]),
  };
}

// Returns { groups, total } or null when no consistent composition could be read
export async function legislatureComposition(title, expectedSeats) {
  const root = parse(await infoboxHtml(title));
  const header = root.querySelectorAll('.infobox th').find(th => /political groups?|composition/i.test(th.text));
  // The groups usually sit in the row following the header, or in the header's own row
  let row = header?.parentNode;
  if (row && !row.querySelector('td')) row = row.nextElementSibling;
  const cell = row?.querySelector('td');
  if (!cell) return null;

  // Candidate lines: leaf list items, else <br>-separated chunks / paragraphs / divs
  const lis = cell.querySelectorAll('li').filter(li => !li.querySelector('li'));
  let lines = lis.map(parseLine).filter(Boolean);
  if (!lines.length) {
    const chunks = cell.innerHTML.split(/<br\s*\/?>|<\/p>|<\/div>/i).map(h => parse(h));
    lines = chunks.map(parseLine).filter(Boolean);
  }
  // Drop exact duplicates (same party listed under two headings)
  const seen = new Set();
  lines = lines.filter(l => !seen.has(`${l.party}|${l.seats}`) && seen.add(`${l.party}|${l.seats}`));
  if (!lines.length) return null;

  const total = lines.reduce((s, l) => s + l.seats, 0);
  // Accept when the parties add up to the chamber (allowing for vacancies)
  if (expectedSeats && (total > expectedSeats * 1.02 || total < expectedSeats * 0.85)) return null;
  return { groups: lines, total };
}
