import { useEffect, useState } from 'react'

// A Wikipedia article's summary and lead image, fetched live from the REST API (like the
// world map's panels). Shared by the Milky Way object panel and the planet/moon info card.
//
// Images: only files hosted on Wikimedia Commons (freely licensed) are returned, with a link
// to the file's Commons page for its author and license. A lead image stored on English
// Wikipedia itself is non-free (fair use) and is skipped.

export type WikiSummary = {
  title: string
  extract: string
  url: string
  image: { src: string; full: string; filePage: string } | null
}

const cache = new Map<string, WikiSummary | null>()

// Catalogue names ("Sagittarius dSph", "FSR 584") often aren't article titles; when the title
// 404s (or is a disambiguation page), take the top search hit for `searchQuery` instead
async function searchTitle(query: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=5&srsearch=${encodeURIComponent(query)}`
  const j = await fetch(url).then((r) => r.json())
  const hit = (j.query?.search ?? []).find((h: { title: string }) => !/^(List of|Lists of|Satellite galaxies of|Moons of)/.test(h.title))
  return hit?.title ?? null
}

async function fetchPage(title: string) {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}?redirect=true`)
  if (!res.ok) return null
  const j = await res.json()
  return j.type === 'disambiguation' ? null : j
}

async function fetchSummary(title: string, searchQuery: string): Promise<WikiSummary | null> {
  if (cache.has(title)) return cache.get(title)!
  try {
    let j = await fetchPage(title)
    if (!j) {
      const found = await searchTitle(searchQuery)
      j = found ? await fetchPage(found) : null
    }
    if (!j) throw new Error('not found')
    const original: string | undefined = j.originalimage?.source
    const thumb: string | undefined = j.thumbnail?.source
    let image: WikiSummary['image'] = null
    if (original && thumb && original.includes('/wikipedia/commons/')) {
      const file = decodeURIComponent(original.split('/').pop() ?? '')
      image = { src: thumb, full: original, filePage: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}` }
    }
    const summary: WikiSummary = { title: j.title, extract: j.extract ?? '', url: j.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`, image }
    cache.set(title, summary)
    return summary
  } catch {
    cache.set(title, null)
    return null
  }
}

// undefined while loading, null when nothing was found
export function useWikiSummary(title: string, searchQuery: string): WikiSummary | null | undefined {
  const [summary, setSummary] = useState<WikiSummary | null | undefined>(cache.get(title))
  useEffect(() => {
    let live = true
    setSummary(cache.get(title))
    if (!cache.has(title)) fetchSummary(title, searchQuery).then((s) => { if (live) setSummary(s) })
    return () => { live = false }
  }, [title, searchQuery])
  return summary
}
