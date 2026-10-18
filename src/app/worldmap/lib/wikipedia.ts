const API = 'https://en.wikipedia.org/w/api.php';
const REST = 'https://en.wikipedia.org/api/rest_v1';

export type WikiSummary = {
  title: string;
  description?: string;
  extract: string;
  thumbnail?: string;
  url: string;
};

export type WikiLink = {
  title: string;
  description?: string;
  url: string;
  // Set when the topic article is a redirect to a section of another article
  section?: string;
};

export type WikiCategory = { name: string; links: WikiLink[] };

export type CountryWiki = {
  summary: WikiSummary;
  categories: WikiCategory[];
  more: WikiLink[];
};

// `{}` is replaced with the country subject, e.g. "Economy of {}" -> "Economy of France"
const TOPICS: { name: string; templates: string[] }[] = [
  {
    name: 'Overview',
    templates: [
      'Outline of {}', 'Index of {}-related articles', 'History of {}', 'Geography of {}',
      'Administrative divisions of {}', 'List of cities in {}', 'List of counties in {}',
    ],
  },
  {
    name: 'Government & Politics',
    templates: [
      'Government of {}', 'Politics of {}', 'Constitution of {}', 'Elections in {}',
      'List of political parties in {}', 'Foreign relations of {}', 'Law of {}',
      'Judiciary of {}', 'Human rights in {}', 'Military of {}', 'Law enforcement in {}',
      'Corruption in {}', 'List of heads of state of {}', 'List of heads of government of {}',
      'List of governors of {}',
    ],
  },
  {
    name: 'Economy',
    templates: [
      'Economy of {}', 'Economic history of {}', 'Taxation in {}', 'Agriculture in {}',
      'Energy in {}', 'Mining in {}', 'Transport in {}', 'Tourism in {}',
      'Telecommunications in {}', 'Poverty in {}',
    ],
  },
  {
    name: 'Society',
    templates: [
      'Demographics of {}', 'Ethnic groups in {}', 'Languages of {}', 'Religion in {}',
      'Education in {}', 'Health in {}', 'Immigration to {}', 'Crime in {}',
      'Women in {}', 'LGBT rights in {}',
    ],
  },
  {
    name: 'Culture & Symbols',
    templates: [
      'Culture of {}', 'Music of {}', 'Cuisine of {}', 'Sport in {}', 'Media of {}',
      'Architecture of {}', 'Public holidays in {}', 'Flag of {}', 'Coat of arms of {}',
      'National symbols of {}',
    ],
  },
];

const pageUrl = (title: string, fragment?: string) =>
  `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}` +
  (fragment ? `#${encodeURIComponent(fragment.replace(/ /g, '_'))}` : '');

async function apiQuery(params: Record<string, string>, signal?: AbortSignal) {
  const qs = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', origin: '*', ...params });
  const res = await fetch(`${API}?${qs}`, { signal });
  if (!res.ok) throw new Error(`Wikipedia API error ${res.status}`);
  return res.json();
}

// Wikidata QID -> English Wikipedia article title
export async function titleFromWikidata(qid: string, signal?: AbortSignal): Promise<string | null> {
  const qs = new URLSearchParams({
    action: 'wbgetentities', ids: qid, props: 'sitelinks', sitefilter: 'enwiki', format: 'json', origin: '*',
  });
  const res = await fetch(`https://www.wikidata.org/w/api.php?${qs}`, { signal });
  if (!res.ok) return null;
  const data = await res.json();
  return data.entities?.[qid]?.sitelinks?.enwiki?.title ?? null;
}

// Best-matching article for a place name, given context words (e.g. its state and country)
export async function searchTitle(name: string, context: string, signal?: AbortSignal): Promise<string | null> {
  for (const srsearch of [`intitle:"${name}" ${context}`, `${name} ${context}`]) {
    const data = await apiQuery({ list: 'search', srsearch, srnamespace: '0', srlimit: '1', srprop: '' }, signal);
    const hit = data.query?.search?.[0]?.title;
    if (hit) return hit;
  }
  return null;
}

export async function fetchSummary(title: string, signal?: AbortSignal): Promise<WikiSummary> {
  const res = await fetch(`${REST}/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}?redirect=true`, { signal });
  if (!res.ok) throw new Error(`No Wikipedia article found for "${title}"`);
  const d = await res.json();
  return {
    title: d.title,
    description: d.description,
    extract: d.extract,
    thumbnail: d.thumbnail?.source,
    url: d.content_urls?.desktop?.page ?? pageUrl(d.title),
  };
}

// "France" -> ["France", "the France"]; "The Gambia" -> ["the Gambia", "Gambia"].
// Non-existent candidates are simply dropped, so over-generating is harmless.
// Subregion articles like "Okinawa Prefecture" also get "Okinawa", since topic articles
// are often titled "History of Okinawa".
function subjectVariants(title: string): string[] {
  if (title.startsWith('The ')) return [`the ${title.slice(4)}`, title.slice(4)];
  const short = title.replace(/ (Prefecture|Province|Region|Oblast|Krai|Governorate|Department|District|County|State|Territory)$/, '');
  return short !== title ? [title, short, `the ${title}`] : [title, `the ${title}`];
}

type Resolved = { title: string; fragment?: string; description?: string };

// Resolves candidate titles (following redirects) and returns only those that exist.
async function resolveTitles(candidates: string[], signal?: AbortSignal): Promise<Map<string, Resolved>> {
  const out = new Map<string, Resolved>();
  const chunks: string[][] = [];
  for (let i = 0; i < candidates.length; i += 50) chunks.push(candidates.slice(i, i + 50));

  await Promise.all(chunks.map(async chunk => {
    const data = await apiQuery({ titles: chunk.join('|'), redirects: '1', prop: 'description' }, signal);
    const q = data.query ?? {};
    const normalized = new Map<string, string>((q.normalized ?? []).map((n: { from: string; to: string }) => [n.from, n.to]));
    const redirects = new Map<string, { to: string; tofragment?: string }>(
      (q.redirects ?? []).map((r: { from: string; to: string; tofragment?: string }) => [r.from, r]),
    );
    const pages = new Map<string, { title: string; missing?: boolean; invalid?: boolean; description?: string }>(
      (q.pages ?? []).map((p: { title: string }) => [p.title, p]),
    );

    for (const cand of chunk) {
      let t = normalized.get(cand) ?? cand;
      const r = redirects.get(t);
      if (r) t = r.to;
      const page = pages.get(t);
      if (!page || page.missing || page.invalid) continue;
      out.set(cand, { title: page.title, fragment: r?.tofragment, description: page.description });
    }
  }));
  return out;
}

export async function fetchCountryWiki(articleTitle: string, signal?: AbortSignal): Promise<CountryWiki> {
  const summary = await fetchSummary(articleTitle, signal);
  const subjects = subjectVariants(summary.title);

  const candidates = TOPICS.flatMap(t => t.templates.flatMap(tpl => subjects.map(s => tpl.replace('{}', s))));
  const [resolved, more] = await Promise.all([
    resolveTitles(candidates, signal),
    searchMore(summary.title, signal),
  ]);

  const seen = new Set<string>([summary.title]);
  const categories: WikiCategory[] = TOPICS.map(topic => {
    const links: WikiLink[] = [];
    for (const tpl of topic.templates) {
      for (const s of subjects) {
        const r = resolved.get(tpl.replace('{}', s));
        if (!r) continue;
        const key = r.fragment ? `${r.title}#${r.fragment}` : r.title;
        if (r.title === summary.title && !r.fragment) break;
        if (seen.has(key)) break;
        seen.add(key);
        links.push({
          title: r.fragment ? tpl.replace('{}', s) : r.title,
          section: r.fragment ? `${r.title} § ${r.fragment}` : undefined,
          description: r.fragment ? undefined : r.description,
          url: pageUrl(r.title, r.fragment),
        });
        break;
      }
    }
    return { name: topic.name, links };
  }).filter(c => c.links.length > 0);

  return { summary, categories, more: more.filter(l => !seen.has(l.title)) };
}

// Broader net: other articles titled "... of X" / "... in X"
async function searchMore(title: string, signal?: AbortSignal): Promise<WikiLink[]> {
  const bare = title.replace(/^The /, '');
  const data = await apiQuery({
    list: 'search',
    srsearch: `intitle:"of ${bare}" OR intitle:"in ${bare}"`,
    srnamespace: '0',
    srlimit: '50',
    srprop: '',
  }, signal);
  return (data.query?.search ?? []).map((s: { title: string }) => ({ title: s.title, url: pageUrl(s.title) }));
}
