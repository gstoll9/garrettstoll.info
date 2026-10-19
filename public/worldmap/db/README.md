# World map database

Relational tables as CSV (UTF-8, header row, RFC 4180 quoting). Built by
`node scripts/build-worldmap-db.mjs`; don't edit by hand — re-run the script instead.
Served as static files and read in the browser by `src/app/worldmap/lib/db.ts`.

Keys:
- countries: **ISO 3166-1 alpha-3** (`iso3`)
- subregions (`region_key`): admin-1 subregions are `<country map slug>/<admin-1 id>`
  (as in `public/worldmap/admin1/<slug>.json`, e.g. `united-states-of-america/texas`);
  US counties are their Wikidata **QID**
- Wikidata items: **QID**

Government tables hold both national and subregional rows: `region_key` is empty for a
country's own government.

## Tables

### countries — one row per country/territory
| column | |
|---|---|
| `iso3` | **PK** |
| `iso2`, `iso_numeric` | other ISO 3166-1 codes |
| `name` | English name (Wikidata label) |
| `wikidata` | QID |
| `map_slug` | the map's country slug (`public/worldmap/admin1/<slug>.json`); empty if the map has no shape for it |
| `capital`, `currency` | labels |
| `region`, `income_group` | World Bank classifications |

### regions — one row per subregion with a Wikidata item (admin-1 and US counties)
`region_key` (**PK**), `level` (`admin1` | `admin2`), `iso3` (FK → countries), `wikidata`,
`name`, `area_km2`.

### government — executive, judiciary, constitution
`iso3` (FK), `region_key` (FK → regions; empty for national), `executive_body_qid`,
`executive_body` (e.g. the cabinet), `judiciary_qid`, `judiciary` (highest court),
`constitution_qid`, `constitution`. **PK** (`iso3`, `region_key`). Every country has a row;
subregions only when one of the fields is known.

### government_forms — basic form(s) of a country's government
`iso3` (FK), `form_qid`, `form` — e.g. *federal republic*, *presidential system*. Several rows per country.

### offices — head of state / head of government and current holders
`iso3` (FK), `region_key` (FK; empty for national), `role` (`head_of_state` |
`head_of_government`), `office_qid`, `office`, `holder_qid`, `holder`, `party_qid`
(FK → parties), `party`. A place can have several holders for one role (e.g. Andorra's
co-princes); where one person holds both roles, both rows appear. Subregional heads of
government are governors, premiers, ministers-president, etc.

### legislatures — legislatures and their chambers
`legislature_qid`, `iso3` (FK), `region_key` (FK; empty for national), `parent_qid` (the
legislature a chamber belongs to; empty for a top-level body), `name`, `seats`, `wikipedia`
(article title). **PK** (`iso3`, `region_key`, `legislature_qid`). A bicameral legislature
is a parent row plus two chamber rows. Dissolved chambers are excluded.

### legislature_seats — current party composition of a chamber
`legislature_qid` (FK → legislatures), `party` (name as listed), `party_wikipedia`
(article title, may be empty), `color` (party colour), `seats`, `source`
(`wikipedia` infobox | `wikidata`), `as_of` (date read or Wikidata point in time).
Only chambers whose parties add up to the chamber's size are included. A `Vacant` row
counts empty seats.

### parties — political parties referenced by `offices`
`party_qid` (**PK**), `name`, `short_name`, `color`, `alignment` (e.g. *centre-left*).

### official_languages
`iso3` (FK), `language_qid`, `language`.

### capitals — current capital(s) of countries, subregions and US counties
`region_level` (`country` | `admin1` | `admin2`), `region_key` (`iso3` for countries,
otherwise as in regions), `capital_qid`, `capital`, `lat`, `lon`. Several rows where a
place has more than one capital (South Africa; Maharashtra's winter capital). For US
counties this is the county seat.

### indicators — the national indicator catalogue
`code` (**PK**, World Bank code), `name`, `topic` (`economy` | `demographics` | `government`),
`unit`, `source`.

### indicator_values/`<iso3>`.csv — yearly national values, partitioned by country
`code` (FK → indicators), `year`, `value`. The file name is the `iso3` key, so the
browser only downloads the clicked country's data.

### region_indicators — the subregional indicator catalogue
`code` (**PK**, e.g. `population`, `gdp`, `hdi`), `name`, `topic`, `wikidata_property`
(the Wikidata property the values come from, e.g. `P1082`).

### region_values/`<country map slug>`.csv — dated subregional values, partitioned by country
`region_key` (FK → regions), `code` (FK → region_indicators), `year`, `value`, `unit`
(Wikidata unit label, e.g. *United States dollar*, *percent*; empty for counts and
indices). Coverage is uneven: population is widely available; economic figures exist for
only a few percent of subregions.

## Sources and licences
- Wikidata — CC0
- Wikipedia (legislature infoboxes) — CC BY-SA 4.0
- World Bank World Development Indicators and Worldwide Governance Indicators — CC BY 4.0
