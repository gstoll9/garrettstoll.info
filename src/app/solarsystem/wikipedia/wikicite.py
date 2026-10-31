"""Parse a saved Wikipedia (Parsoid) page into sentences that keep track of their section and
the footnotes attached to them, so a value can be cited back to the exact sentence and the
sources Wikipedia gives for it. Used by generateLayerCitations.py.

    python -I wikicite.py <saved page.html> <regex>     # search: print matching sentences
"""
import html
import os
import re
import sys

REF_TOKEN = '⟦{}⟧'  # ⟦cite_note-id⟧ placeholders kept in the text while stripping tags


def _clean(fragment):
    fragment = re.sub(r'<style.*?</style>', '', fragment, flags=re.S)
    fragment = re.sub(r'<span[^>]*display:\s*none[^>]*>.*?</span>', '', fragment, flags=re.S)
    text = html.unescape(re.sub(r'<[^>]+>', '', fragment)).replace('\xad', '')
    return re.sub(r'\s+', ' ', text).strip()


def load(path):
    h = open(path, encoding='utf-8').read()
    h = re.sub(r"data-mw='[^']*'", '', h)
    h = re.sub(r'data-mw="[^"]*"', '', h)

    # references: <li id="cite_note-…"> … <span class="mw-reference-text">…</span>
    refs = {}
    for m in re.finditer(r'<li[^>]*id="(cite_note-[^"]+)"[^>]*>(.*?)</li>', h, re.S):
        body = m.group(2)
        text_m = re.search(r'<span[^>]*class="mw-reference-text[^"]*"[^>]*>(.*)', body, re.S)
        text = _clean(text_m.group(1) if text_m else body)
        links = [re.search(r'href="([^"]+)"', a).group(1) for a in re.findall(r'<a\s[^>]*>', body)
                 if 'mw:ExtLink' in a and 'href="' in a]
        doi = next((l for l in links if 'doi.org/' in l), None)
        bib = next((l for l in links if 'adsabs.harvard.edu' in l), None)
        url = doi or bib or (links[0] if links else None)
        refs[m.group(1)] = {'text': text, 'url': html.unescape(url) if url else None}

    # sentences with their section heading and footnotes
    body = h.split('<div class="mw-references-wrap', 1)[0]
    sentences = []
    section, section_id = 'Introduction', None
    # paragraphs, table cells and innermost list items (a plain non-greedy <li>…</li> around a
    # nested list would run on past headings)
    for m in re.finditer(r'<h([2-4])[^>]*id="([^"]+)"[^>]*>(.*?)</h\1>|<p[^>]*>(.*?)</p>|<li[^>]*>((?:(?!<li|<h[2-4]).)*?)</li>|<td[^>]*>(.*?)</td>', body, re.S):
        if m.group(1):
            section, section_id = _clean(m.group(3)), m.group(2)
            continue
        frag = m.group(4) or m.group(5) or m.group(6) or ''
        frag = re.sub(r'<sup[^>]*class="[^"]*mw-ref[^"]*"[^>]*>.*?href="[^"#]*#(cite_note-[^"]+)".*?</sup>',
                      lambda r: REF_TOKEN.format(r.group(1)), frag, flags=re.S)
        frag = re.sub(r'<sup.*?</sup>', '', frag, flags=re.S)
        text = _clean(frag)
        if not text:
            continue
        # split into sentences; footnotes stay with the sentence they follow
        for s in re.split(r'(?:(?<=[.!?])|(?<=[.!?]⟧)|(?<=⟧))\s+(?=[A-Z0-9"(])', text):
            ids = re.findall('⟦([^⟧]+)⟧', s)
            plain = re.sub('⟦[^⟧]+⟧', '', s).strip()
            if plain:
                sentences.append({'text': plain, 'refs': ids, 'section': section, 'sectionId': section_id})
    title = re.search(r'<title>(.*?)</title>', h)
    return {'title': html.unescape(title.group(1)) if title else os.path.basename(path)[:-5].replace('_', ' '),
            'sentences': sentences, 'refs': refs}


def search(page, pattern):
    rx = re.compile(pattern, re.I)
    return [s for s in page['sentences'] if rx.search(s['text'])]


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    page = load(sys.argv[1])
    for s in search(page, sys.argv[2])[:int(sys.argv[3]) if len(sys.argv) > 3 else 12]:
        print(f"[{s['section']}] {s['text'][:300]}  refs={len(s['refs'])}")
