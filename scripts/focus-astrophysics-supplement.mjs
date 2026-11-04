// Hand-curated fixes for gaps in Wikidata for the astrophysics focus (scripts/focuses.mjs).
// Every value here must carry a citation; the info box shows it as a reference.
//
// `coordinates`: facilities whose Wikidata items have no coordinates (P625). The item's other
//   facts still come from Wikidata; only the location (and optionally a Wikipedia article and
//   category) is supplied.
// `drop`: items not to draw, with the reason.

// LIGO's detector vertices, as published in LALSuite (LIGO Scientific Collaboration, GPL): the
// detector constants used in LIGO data analysis, given there in radians
const LALSUITE = {
  title: 'LALSuite, LALDetectors.h: LAL_LHO_4K / LAL_LLO_4K detector vertex latitude and longitude (LIGO Scientific Collaboration)',
  url: 'https://git.ligo.org/lscsoft/lalsuite/-/blob/master/lal/lib/tools/LALDetectors.h',
};
const deg = rad => +(rad * 180 / Math.PI).toFixed(6);

export const SUPPLEMENT = {
  coordinates: [
    // LIGO Hanford Observatory: LAL_LHO_4K_DETECTOR_LATITUDE_RAD / _LONGITUDE_RAD
    { id: 'Q51792451', cat: 'gw', lat: deg(0.81079526383), lon: deg(-2.08405676917), wiki: 'LIGO', ref: LALSUITE },
    // LIGO Livingston Observatory: LAL_LLO_4K_DETECTOR_LATITUDE_RAD / _LONGITUDE_RAD
    { id: 'Q121094988', cat: 'gw', lat: deg(0.53342313506), lon: deg(-1.58430937078), wiki: 'LIGO', ref: LALSUITE },
  ],
  drop: [
    // The umbrella LIGO item has the Hanford site's coordinates; its two sites are drawn instead
    { id: 'Q255371', reason: 'LIGO umbrella item (drawn as its Hanford and Livingston sites)' },
  ],
};
