"""Build ../data/layerCitations.ts: for every layer the planet cross-section panels show
(data/planetStructure.ts), the sentence(s) in the saved Wikipedia page that its numbers come
from, with the article section and the sources Wikipedia cites for that sentence (journal
articles resolve to their DOI / ADS link).

Each entry below is (saved page, regex). The regex picks the sentence that states the value
the layer uses (radius, depth, altitude range, composition); the generator fails if it
matches nothing, so a re-saved page that rewords the sentence is caught.

Run:  python -I generateLayerCitations.py           (--show prints all matches per entry)
"""
import json
import os
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wikicite  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'layerCitations.ts')

P = {
    'Mercury': 'Planets/Mercury_(planet)/Mercury_(planet).html',
    'Venus': 'Planets/Venus/Venus.html', 'VenusAtmo': 'Planets/Venus/Atmosphere_of_Venus.html',
    'Earth': 'Planets/Earth/Internal_structure_of_Earth.html', 'EarthAtmo': 'Planets/Earth/Atmosphere_of_Earth.html',
    'EarthMain': 'Planets/Earth/Earth.html',
    'Mars': 'Planets/Mars/Mars.html', 'MarsAtmo': 'Planets/Mars/Atmosphere_of_Mars.html',
    'Jupiter': 'Planets/Jupiter/Jupiter.html', 'JupiterAtmo': 'Planets/Jupiter/Atmosphere_of_Jupiter.html',
    'Saturn': 'Planets/Saturn/Saturn.html',
    'Uranus': 'Planets/Uranus/Uranus.html', 'UranusAtmo': 'Planets/Uranus/Atmosphere_of_Uranus.html',
    'Neptune': 'Planets/Neptune/Neptune.html',
}

# planet -> layer key (or "atmo:<layer name>") -> [(page, regex), ...]
CITES = {
    'Mercury': {
        'core': [('Mercury', r"radius of Mercury's core is estimated")],
        'mantle': [('Mercury', r'mantle-crust layer is in total 420')],
        'crust': [('Mercury', r'Airy isostacy model')],
    },
    'Venus': {
        'core': [('Venus', r'estimate of 3,500 km')],
        'mantle': [('Venus', r'share a similar internal structure')],
        'crust': [('Venus', r'crust of Venus is estimated to be 40')],
        'atmosphere': [('Venus', r'dense atmosphere composed of 96\.5')],
        'atmo:Troposphere': [('VenusAtmo', r'troposphere, begins at the surface')],
        'atmo:Mesosphere': [('VenusAtmo', r'mesosphere of Venus extends from 65')],
        'atmo:Thermosphere': [('VenusAtmo', r'mesosphere of Venus extends from 65'), ('VenusAtmo', r'dayside mesopause')],
        'atmo:Exosphere': [('VenusAtmo', r'mesosphere of Venus extends from 65'), ('VenusAtmo', r'exosphere begins when')],
    },
    'Earth': {
        'innerCore': [('Earth', r'solid ball with a radius of about 1,220')],
        'outerCore': [('Earth', r'outer core is a fluid layer'), ('Earth', r'transition between the inner core and outer core')],
        'lowerMantle': [('EarthMain', r'410 and 660 km')],
        'upperMantle': [('EarthMain', r'410 and 660 km')],
        'crust': [('EarthMain', r'thickness of the crust varies'), ('EarthMain', r'Mohorovi.i. discontinuity')],
        'atmosphere': [('EarthAtmo', r'dry air contains 78\.08')],
        'atmo:Troposphere': [('EarthAtmo', r'^Troposphere: 0')],
        'atmo:Stratosphere': [('EarthAtmo', r'^Stratosphere: 12')],
        'atmo:Mesosphere': [('EarthAtmo', r'^Mesosphere: 50')],
        'atmo:Thermosphere': [('EarthAtmo', r'^Thermosphere: 80')],
        'atmo:Exosphere': [('EarthAtmo', r'^Exosphere: 700')],
    },
    'Mars': {
        'innerCore': [('Mars', r'remains a topic of active research')],
        'outerCore': [('Mars', r'approximately 1650.1675 km')],
        'lowerMantle': [('Mars', r'basal liquid silicate layer')],
        'upperMantle': [('Mars', r'mantle appears to be rigid')],
        'crust': [('Mars', r'outermost layer is the crust')],
        'atmosphere': [('MarsAtmo', r'primarily composed of carbon dioxide \(95')],
        'atmo:Troposphere': [('MarsAtmo', r'^Troposphere \(')],
        'atmo:Mesosphere': [('MarsAtmo', r'^Mesosphere \(')],
        'atmo:Thermosphere': [('MarsAtmo', r'^Thermosphere \('), ('MarsAtmo', r'daytime temperature of the upper thermosphere')],
        'atmo:Exosphere': [('MarsAtmo', r'exosphere of Mars starts at about 230')],
    },
    'Jupiter': {
        'core': [('Jupiter', r'diffuse core that mixes into its mantle')],
        'mantle': [('Jupiter', r'extending outward to about 80%')],
        'crust': [('Jupiter', r'extending outward to about 80%')],
        'atmosphere': [('Jupiter', r'approximately 76% hydrogen')],
        'atmo:Troposphere': [('JupiterAtmo', r'commonly treated as the base of the troposphere'), ('JupiterAtmo', r'tropopause is approximately 50 km')],
        'atmo:Stratosphere': [('JupiterAtmo', r'around 320 km and 1')],
        'atmo:Thermosphere': [('JupiterAtmo', r'1000 K at about 1000 km')],
        'atmo:Exosphere': [('JupiterAtmo', r'does not have a specific upper boundary')],
    },
    'Saturn': {
        'core': [('Saturn', r'diffuse core", extending 60%')],
        'mantle': [('Saturn', r'thicker, liquid metallic hydrogen layer')],
        'crust': [('Saturn', r'outermost layer spans about 1,000')],
        'atmosphere': [('Saturn', r'composed predominantly of hydrogen and helium')],
    },
    'Uranus': {
        'core': [('Uranus', r'radius less than 20% of the planet')],
        'mantle': [('Uranus', r'ice mantle is not in fact')],
        'crust': [('Uranus', r'radius less than 20% of the planet')],
        'atmosphere': [('UranusAtmo', r'composed primarily of hydrogen and helium')],
        'atmo:Troposphere': [('UranusAtmo', r'divided into three main layers')],
        'atmo:Stratosphere': [('UranusAtmo', r'divided into three main layers')],
        'atmo:Thermosphere/Exosphere': [('UranusAtmo', r'divided into three main layers')],
    },
    'Neptune': {
        'core': [('Neptune', r'core of Neptune is likely composed')],
        'mantle': [('Neptune', r'mantle is equivalent to 10 to 15')],
        'crust': [('Neptune', r'extends perhaps 10 to 20%')],
        'atmosphere': [('Neptune', r'composed primarily of hydrogen and helium, along with')],
        'atmo:Troposphere': [('Neptune', r'tropopause, lies at a pressure of 0\.1')],
        'atmo:Stratosphere': [('Neptune', r'gives way to the thermosphere at a pressure')],
        'atmo:Thermosphere/Exosphere': [('Neptune', r'gives way to the thermosphere at a pressure'), ('Neptune', r'transitions to the exosphere')],
    },
}

HEADER = '''// GENERATED by solarsystem/wikipedia/generateLayerCitations.py — do not hand-edit; regenerate instead.
//
// Where each planet layer's numbers in data/planetStructure.ts come from: the sentence in the
// saved Wikipedia article (solarsystem/wikipedia/Planets/), its section, and the sources that
// Wikipedia cites for that sentence. Keyed by planet, then by layer key (core, mantle, …) or
// "atmo:<layer name>" for the vertical atmosphere layers.

export type LayerCitation = {
  article: string;
  section: string;
  url: string;
  quote: string;
  references: { text: string; url?: string }[];
};

export const layerCitations: Record<string, Record<string, LayerCitation[]>> = '''


def page_url(path, section_id):
    name = os.path.basename(path)[:-5]
    return 'https://en.wikipedia.org/wiki/' + urllib.parse.quote(name) + ('#' + urllib.parse.quote(section_id) if section_id else '')


def short_ref(text):
    text = text.split('Archived from the original')[0].rstrip(' .') + '.'
    return text if len(text) <= 260 else text[:257].rstrip() + '…'


def main():
    show = '--show' in sys.argv
    pages = {k: wikicite.load(os.path.join(HERE, v)) for k, v in P.items()}
    out, missing = {}, []
    for planet, layers in CITES.items():
        for key, specs in layers.items():
            entries = []
            for page_key, rx in specs:
                hits = wikicite.search(pages[page_key], rx)
                if show:
                    print(f'== {planet} {key} [{page_key}] {rx}: {len(hits)} hits')
                    for h in hits[:4]:
                        print(f'   [{h["section"]}] ({len(h["refs"])} refs) {h["text"][:220]}')
                if not hits:
                    missing.append(f'{planet}/{key}: {rx}')
                    continue
                h = hits[0]
                page = pages[page_key]
                refs = []
                for rid in h['refs']:
                    r = page['refs'].get(rid)
                    if r and r['text'] and all(x['text'] != short_ref(r['text']) for x in refs):
                        refs.append({'text': short_ref(r['text']), **({'url': r['url']} if r['url'] else {})})
                entries.append({
                    'article': page['title'].replace(' - Wikipedia', ''),
                    'section': h['section'],
                    'url': page_url(P[page_key], h['sectionId']),
                    'quote': h['text'],
                    'references': refs,
                })
            out.setdefault(planet, {})[key] = entries
    if missing:
        print('NO MATCH:', *missing, sep='\n  ')
        sys.exit(1)
    n = sum(len(v) for p in out.values() for v in p.values())
    nrefs = sum(len(e['references']) for p in out.values() for v in p.values() for e in v)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(HEADER + json.dumps(out, indent=2, ensure_ascii=False) + ';\n')
    print(f'wrote {OUT}: {n} cited sentences, {nrefs} references')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
