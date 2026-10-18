// world-atlas (Natural Earth) uses abbreviated display names. Map them to
// their English Wikipedia article titles. Names not listed here are used as-is.
export const WIKI_TITLE_OVERRIDES: Record<string, string> = {
  'United States of America': 'United States',
  'Dem. Rep. Congo': 'Democratic Republic of the Congo',
  'Congo': 'Republic of the Congo',
  'Central African Rep.': 'Central African Republic',
  'S. Sudan': 'South Sudan',
  'Eq. Guinea': 'Equatorial Guinea',
  'Dominican Rep.': 'Dominican Republic',
  'Bosnia and Herz.': 'Bosnia and Herzegovina',
  'Macedonia': 'North Macedonia',
  'eSwatini': 'Eswatini',
  'W. Sahara': 'Western Sahara',
  'N. Cyprus': 'Northern Cyprus',
  'Solomon Is.': 'Solomon Islands',
  'Marshall Is.': 'Marshall Islands',
  'N. Mariana Is.': 'Northern Mariana Islands',
  'U.S. Virgin Is.': 'United States Virgin Islands',
  'S. Geo. and the Is.': 'South Georgia and the South Sandwich Islands',
  'Br. Indian Ocean Ter.': 'British Indian Ocean Territory',
  'Saint Helena': 'Saint Helena, Ascension and Tristan da Cunha',
  'Pitcairn Is.': 'Pitcairn Islands',
  'Falkland Is.': 'Falkland Islands',
  'Cayman Is.': 'Cayman Islands',
  'British Virgin Is.': 'British Virgin Islands',
  'Turks and Caicos Is.': 'Turks and Caicos Islands',
  'Cook Is.': 'Cook Islands',
  'St. Vin. and Gren.': 'Saint Vincent and the Grenadines',
  'St. Kitts and Nevis': 'Saint Kitts and Nevis',
  'São Tomé and Principe': 'São Tomé and Príncipe',
  'St. Pierre and Miquelon': 'Saint Pierre and Miquelon',
  'Wallis and Futuna Is.': 'Wallis and Futuna',
  'St-Martin': 'Collectivity of Saint Martin',
  'St-Barthélemy': 'Saint Barthélemy',
  'Fr. Polynesia': 'French Polynesia',
  'Fr. S. Antarctic Lands': 'French Southern and Antarctic Lands',
  'Faeroe Is.': 'Faroe Islands',
  'Micronesia': 'Federated States of Micronesia',
  'Georgia': 'Georgia (country)',
  'Palestine': 'State of Palestine',
  'Indian Ocean Ter.': 'Australian Indian Ocean Territories',
  'Heard I. and McDonald Is.': 'Heard Island and McDonald Islands',
  'Ashmore and Cartier Is.': 'Ashmore and Cartier Islands',
  'Antigua and Barb.': 'Antigua and Barbuda',
  'Timor-Leste': 'East Timor',
  'Czechia': 'Czech Republic',
  "Côte d'Ivoire": 'Ivory Coast',
  'Cabo Verde': 'Cape Verde',
  'Gambia': 'The Gambia',
  'Bahamas': 'The Bahamas',
  'Macao': 'Macau',
  'Vatican': 'Vatican City',
};

export function wikiTitleFor(mapName: string): string {
  return WIKI_TITLE_OVERRIDES[mapName] ?? mapName;
}

// File name of a country's subregion data in /public/worldmap/admin1.
// Must match countrySlug() in scripts/build-admin1.mjs.
export function countrySlug(name: string): string {
  return Array.from(name.normalize('NFD')).filter(ch => ch.charCodeAt(0) < 128).join('').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
