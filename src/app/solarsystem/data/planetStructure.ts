// Real internal-structure and atmosphere data for the 8 major planets, sourced from the
// Wikipedia pages saved under ./wikipedia/Planets/<Planet>/. Physical parameters (mass,
// density, gravity, temperature, pressure, atmosphere composition) come from each page's
// {{Infobox planet}} template params (same data-mw JSON extraction technique used for the
// asteroid data in data/asteroids.ts). Internal-structure layer proportions are NOT in any
// infobox — none of the 8 planet infoboxes have a core/mantle/crust key — so those come
// from each page's prose "Internal structure" section instead, which is far less uniform
// across planets: only Earth has an actual boundary-depth table, the rest are read out of
// sentences like "core radius estimated at X km" or "extends for X-Y% of the radius",
// sometimes with multiple competing published estimates. Where that's the case, the most
// specific/recent single estimate was used for radiusFraction, with the alternative(s)
// kept in `note` for reference.
//
// radiusFraction values are fractions of the planet's realDiameter/2 (its display radius),
// i.e. of the crust/visible-surface radius, matching data/planets.tsx's existing
// realDiameter-driven realistic-size scaling.
//
// Atmosphere shell radius: real atmospheres have no hard edge, they fade out exponentially
// with altitude (characterized by the `scaleHeightKm` figure). Rather than an arbitrary
// illustrative fraction, `radiusFraction` here is modeled as the surface radius plus 6
// scale heights (~99.99% of atmospheric mass is below that altitude) — a documented,
// physically-grounded convention, not a fabricated number. Scale height is taken directly
// from the infobox where present (Jupiter/Saturn/Uranus/Neptune); Mercury/Venus/Earth/Mars
// only give surface_pressure in their infoboxes, so their scale heights are standard
// planetary-science reference values instead (cited individually below).
//
// core.innerCore / mantle.lowerMantle: added only where a sub-layer boundary is directly
// citable, not for every planet — Earth (textbook inner/outer core + upper/lower mantle
// transition zone) and Mars (a real, still-disputed 2025 inner-core detection, plus a
// distinct basal mantle layer). Mercury's core is genuinely stratified per 2019 MESSENGER
// data too, but the source gives no boundary radii for those sub-layers, so it stays a
// single core with an enriched `note` instead of a fabricated split. Venus and the four
// gas giants are unchanged — no confirmed inner-core detection for Venus, and the gas
// giants' existing core/mantle/crust already roughly track the real
// metallic-hydrogen/molecular-hydrogen distinction.
//
// atmosphere.layers: vertical structure (troposphere/stratosphere/mesosphere/thermosphere/
// exosphere), sourced from each planet's dedicated "Atmosphere of <Planet>" Wikipedia page
// where one exists. Added for Venus, Earth, Mars, Jupiter, and Uranus, all of which cite
// specific altitude (and usually temperature) ranges per layer. Neptune has no dedicated
// atmosphere page; its boundaries are only cited as pressure levels (bar), so its altitude
// figures here are derived from those pressure levels via its own scaleHeightKm (same
// altitude = H·ln(P₀/P) convention as the atmoFraction helper below) — noted explicitly
// per layer, not presented as directly-cited numbers. Saturn has no dedicated atmosphere
// page and no citable layer-boundary altitudes in the saved source (only qualitative cloud
// composition), so it's left without a `layers` array. Mercury's atmosphere is a true
// exosphere (individual atoms on ballistic trajectories) with nothing to layer.

const dayInHours = 24;

export type LayerFacts = {
  color?: string;
  displayName?: string; // tooltip heading override, e.g. "Visible Cloud Deck (1-bar level)"
  material: string; // 1-line composition description
  densityGCm3?: number;
  tempK?: number | { min?: number; mean?: number; max?: number };
  note?: string; // uncertainty / alternate estimate
};

// A sub-layer nested inside `core` or `mantle` (e.g. a solid inner core inside the
// overall core). Only added for planets where a sub-layer boundary is directly citable —
// see the per-planet comments below for sourcing.
type SubLayer = LayerFacts & { radiusFraction: number };

// Identifies which radial shell a hover/click refers to. Planets without a sub-layer
// split use the plain 'core'/'mantle' keys; planets with a split use
// 'innerCore'+'outerCore' and/or 'lowerMantle'+'upperMantle' instead.
export type LayerKey = 'innerCore' | 'core' | 'outerCore' | 'lowerMantle' | 'mantle' | 'upperMantle' | 'crust' | 'atmosphere';

// A vertical layer within the atmosphere (troposphere/stratosphere/etc.), measured as
// altitude above the planet's reference surface — not a radiusFraction like core/mantle
// sub-layers, since that's how these are actually cited in the source material and how
// atmospheric structure is conventionally described. `altitudeKm.max` omitted means the
// layer has no cited upper boundary (the exosphere, or a combined
// "Thermosphere/Exosphere" entry where the source doesn't separate them with a number).
// Shown only in the 2D AtmosphereCrossSection panel — deliberately not rendered as
// additional 3D shells, since these are the thinnest, most tightly-packed layers of all
// and would be effectively unhoverable at true scale (the exact problem the 2D panel
// exists to solve).
export type AtmosphereLayer = {
  name: string;
  color?: string;
  altitudeKm: { min: number; max?: number };
  tempK?: number | { min?: number; mean?: number; max?: number };
  note?: string;
};

export type PlanetStructure = {
  core: LayerFacts & { radiusFraction: number; innerCore?: SubLayer };
  mantle: LayerFacts & { radiusFraction: number; lowerMantle?: SubLayer };
  crust: LayerFacts;
  atmosphere?: LayerFacts & {
    radiusFraction: number;
    composition: { gas: string; percent: number }[];
    surfacePressureKPa?: number;
    scaleHeightKm?: number;
    layers?: AtmosphereLayer[]; // vertical sub-structure (troposphere/stratosphere/etc.); only where citable, see AtmosphereLayer
  };
  facts: {
    massKg: number;
    gravityMs2: number;
    meanRadiusKm: number;
    dayLengthHours: number; // sidereal rotation, not solar day (see Mercury/Venus notes)
    axialTiltDeg: number;
    moonCount: number | string;
    densityGCm3: number;
    funFact?: string;
  };
};

// Flattens a planet's structure into an ordered list of radial layers, center outward,
// picking the sub-layer pair when present (else the single parent layer) — the single
// shared source of "what layers does this planet have" for both the 3D cutaway
// (Planet.tsx) and the 2D cross-section panel (LayerCrossSection.tsx), so the two views
// can't drift out of sync with each other.
export type LayerSegment = {
  key: LayerKey;
  label: string;
  facts: LayerFacts;
  radiusFraction: number; // fraction of the crust/visible-surface radius
  kind: 'core' | 'mantle' | 'crust' | 'atmosphere';
};

export function getLayerSegments(structure: PlanetStructure): LayerSegment[] {
  const segments: LayerSegment[] = [];

  if (structure.core.innerCore) {
    segments.push({ key: 'innerCore', label: structure.core.innerCore.displayName || 'Inner Core', facts: structure.core.innerCore, radiusFraction: structure.core.innerCore.radiusFraction, kind: 'core' });
    segments.push({ key: 'outerCore', label: structure.core.displayName || 'Outer Core', facts: structure.core, radiusFraction: structure.core.radiusFraction, kind: 'core' });
  } else {
    segments.push({ key: 'core', label: structure.core.displayName || 'Core', facts: structure.core, radiusFraction: structure.core.radiusFraction, kind: 'core' });
  }

  if (structure.mantle.lowerMantle) {
    segments.push({ key: 'lowerMantle', label: structure.mantle.lowerMantle.displayName || 'Lower Mantle', facts: structure.mantle.lowerMantle, radiusFraction: structure.mantle.lowerMantle.radiusFraction, kind: 'mantle' });
    segments.push({ key: 'upperMantle', label: structure.mantle.displayName || 'Upper Mantle', facts: structure.mantle, radiusFraction: structure.mantle.radiusFraction, kind: 'mantle' });
  } else {
    segments.push({ key: 'mantle', label: structure.mantle.displayName || 'Mantle', facts: structure.mantle, radiusFraction: structure.mantle.radiusFraction, kind: 'mantle' });
  }

  segments.push({ key: 'crust', label: structure.crust.displayName || 'Crust', facts: structure.crust, radiusFraction: 1, kind: 'crust' });

  if (structure.atmosphere) {
    segments.push({ key: 'atmosphere', label: structure.atmosphere.displayName || 'Atmosphere', facts: structure.atmosphere, radiusFraction: structure.atmosphere.radiusFraction, kind: 'atmosphere' });
  }

  return segments;
}

// atmosphereRadiusFraction(meanRadiusKm, scaleHeightKm) = (r + 6*H) / r
const atmoFraction = (meanRadiusKm: number, scaleHeightKm: number) =>
  (meanRadiusKm + 6 * scaleHeightKm) / meanRadiusKm;

// altitude implied by a cited pressure level, via the barometric formula and a planet's
// own scaleHeightKm — used only for Neptune, whose atmosphere article cites layer
// boundaries as pressure levels rather than altitudes (see the header comment above).
const altitudeFromPressureRatio = (scaleHeightKm: number, pressureRatio: number) =>
  Math.round(scaleHeightKm * Math.log(pressureRatio));

// Shared per-layer-name colors so the same layer reads consistently across every planet's
// AtmosphereCrossSection panel (see components/AtmosphereCrossSection.tsx).
const ATMO_LAYER_COLORS = {
  troposphere: '#ffcc80',
  stratosphere: '#81d4fa',
  mesosphere: '#7986cb',
  thermosphere: '#ef5350',
  exosphere: '#78909c',
} as const;

export const planetStructures: Record<string, PlanetStructure> = {
  Mercury: {
    core: {
      radiusFraction: 2020 / 2439.7, // 0.828 — "core radius estimated 2,020±30 km" (moment of inertia factor 0.346±0.014)
      color: '#3a3a3a',
      material: 'Iron-nickel (with silicon, sulfur, carbon)',
      // Not split into inner/outer sub-layers — the source describes real stratification
      // (a solid, metallic outer layer atop a liquid layer atop a solid inner core, per
      // 2019 MESSENGER gravity-tracking analysis) but gives no boundary radii for those
      // sub-layers, only the single overall core radius already used above.
      note: "Occupies ~57% of Mercury's volume — the largest core-to-planet ratio of any planet (Earth's is ~17%). 2019 MESSENGER gravity data suggests it's stratified — a solid FeS-rich layer atop a liquid layer atop a solid inner core — though the individual sub-layer radii aren't well constrained yet",
    },
    mantle: {
      radiusFraction: (2439.7 - 35) / 2439.7, // 0.986 — 420 km combined mantle+crust, crust ~35 km of that
      color: '#7a6a54',
      material: 'Silicate mantle',
    },
    crust: {
      color: '#8c8377',
      material: 'Silicate crust, ~35 km thick (Mariner 10/MESSENGER estimate; Airy isostacy model suggests 26±11 km)',
      note: 'No global atmosphere — only a trace exosphere (≲0.5 nPa) of O, Na, Mg, H, K, Ca, He + traces',
    },
    // No atmosphere layer — Mercury's exosphere has no meaningful radius to render.
    facts: {
      massKg: 3.3011e23,
      gravityMs2: 3.7,
      meanRadiusKm: 2439.7,
      dayLengthHours: 58.646 * dayInHours, // sidereal day; its 176-day figure is the *solar* day (3:2 spin-orbit resonance)
      axialTiltDeg: 0.034,
      moonCount: 0,
      densityGCm3: 5.427,
      funFact: 'Has the most eccentric orbit of any planet and the largest temperature swings in the solar system — from -173°C at night to 427°C during the day.',
    },
  },

  Venus: {
    core: {
      radiusFraction: 3500 / 6051.8, // 0.578 — newer (2006-2020) axial-precession estimate
      color: '#d9a441',
      material: 'Likely iron-nickel, probably at least partially liquid',
      note: 'Older seismic/moment-of-inertia models estimated 2,900-3,450 km instead',
    },
    mantle: {
      radiusFraction: (6051.8 - 40) / 6051.8, // 0.993 — crust ~40 km average
      color: '#c56a2e',
      material: 'Silicate mantle',
    },
    crust: {
      color: '#8a6a4a',
      material: 'Basaltic silicate crust, ~40 km average thickness (up to 65 km); no plate tectonics',
    },
    atmosphere: {
      radiusFraction: atmoFraction(6051.8, 15.9), // ~1.016; scale height ~15.9 km (standard reference value, not in infobox)
      color: '#e8d09a',
      material: 'Thick CO2 atmosphere with sulfuric acid clouds',
      composition: [
        { gas: 'Carbon dioxide', percent: 96.5 },
        { gas: 'Nitrogen', percent: 3.5 },
        { gas: 'Sulphur dioxide', percent: 0.015 },
      ],
      surfacePressureKPa: 9300,
      tempK: { mean: 737 },
      // Atmosphere_of_Venus.html: no stratosphere is described for Venus — the source goes
      // straight from troposphere to mesosphere.
      layers: [
        {
          name: 'Troposphere',
          color: ATMO_LAYER_COLORS.troposphere,
          altitudeKm: { min: 0, max: 65 },
          tempK: { min: 230, max: 737 },
          note: 'Densest part of the atmosphere; surface pressure ~92× Earth\'s. Winds are slow near the surface but reach ~360 km/h (100 m/s) at the cloud tops',
        },
        {
          name: 'Mesosphere',
          color: ATMO_LAYER_COLORS.mesosphere,
          altitudeKm: { min: 65, max: 120 },
          tempK: { min: 165, max: 300 },
          note: 'Splits into a lower band (62-73 km, steady ~230 K, coincides with the upper cloud deck) and an upper band (73-95 km, cooling to ~165 K — the coldest part of the dayside atmosphere) before the 95-120 km mesopause warms back toward the thermosphere',
        },
        {
          name: 'Thermosphere',
          color: ATMO_LAYER_COLORS.thermosphere,
          altitudeKm: { min: 120, max: 220 },
          tempK: { min: 300, max: 400 },
          note: "Extreme day-night contrast — the nightside thermosphere (sometimes called Venus's 'cryosphere') is far colder than the dayside",
        },
        {
          name: 'Exosphere',
          color: ATMO_LAYER_COLORS.exosphere,
          altitudeKm: { min: 220 },
          note: 'Begins where molecules average less than one collision each; the outer edge varies from ~220 km (night) to ~350 km (day)',
        },
      ],
    },
    facts: {
      massKg: 4.86731e24,
      gravityMs2: 8.87,
      meanRadiusKm: 6051.8,
      dayLengthHours: 243.0226 * dayInHours, // retrograde sidereal rotation
      axialTiltDeg: 177.36,
      moonCount: 0,
      densityGCm3: 5.243,
      funFact: 'Rotates backwards (retrograde) and so slowly that its day (243 Earth days) is longer than its year (225 Earth days).',
    },
  },

  Earth: {
    core: {
      radiusFraction: (6371 - 2890) / 6371, // 0.546 — outer-core/mantle boundary at 2,890 km depth
      color: '#f4c430',
      material: 'Liquid iron-nickel outer core',
      innerCore: {
        radiusFraction: 1220 / 6371, // 0.1915 — "primarily a solid ball with a radius of about 1,220 km" (Internal_structure_of_Earth)
        color: '#fff2b0',
        material: 'Solid iron-nickel inner core',
        tempK: { min: 5400, max: 6230 }, // Internal_structure_of_Earth: "5,400-6,230 K for Earth's solid inner core"
      },
    },
    mantle: {
      radiusFraction: (6371 - 35) / 6371, // 0.995 — crust averages ~35 km
      color: '#ff5722',
      material: 'Upper mantle (peridotite)',
      lowerMantle: {
        radiusFraction: (6371 - 660) / 6371, // 0.8964 — the well-known ~660 km-depth transition zone separating upper/lower mantle
        color: '#c73e10',
        material: 'Lower mantle (denser silicate, bridgmanite/ferropericlase-dominated), transitioning to the D″ layer near the core boundary',
      },
    },
    crust: {
      color: '#6b5842',
      material: 'Silicate crust (oceanic + continental), ~35 km average thickness',
    },
    atmosphere: {
      radiusFraction: atmoFraction(6371, 8.5), // ~1.008; scale height ~8.5 km (standard reference value)
      color: '#a6e1ff',
      material: 'Nitrogen-oxygen atmosphere',
      composition: [
        { gas: 'Nitrogen', percent: 78.08 },
        { gas: 'Oxygen', percent: 20.95 },
        { gas: 'Argon', percent: 0.934 },
        { gas: 'Carbon dioxide', percent: 0.043 },
      ],
      surfacePressureKPa: 101.325,
      tempK: { min: 184, mean: 288, max: 330 }, // -89.2 / 14.76 / 56.7 °C
      // Standard, textbook-level layer boundaries (Atmosphere_of_Earth.html confirms the
      // same 5-layer troposphere/stratosphere/mesosphere/thermosphere/exosphere ordering).
      layers: [
        {
          name: 'Troposphere',
          color: ATMO_LAYER_COLORS.troposphere,
          altitudeKm: { min: 0, max: 12 },
          tempK: { min: 217, max: 288 },
          note: 'Where nearly all weather occurs; thickness varies from ~8 km at the poles to ~17 km at the equator',
        },
        {
          name: 'Stratosphere',
          color: ATMO_LAYER_COLORS.stratosphere,
          altitudeKm: { min: 12, max: 50 },
          tempK: { min: 217, max: 270 },
          note: 'Warms with altitude because ozone absorbs UV radiation here — the only layer that does',
        },
        {
          name: 'Mesosphere',
          color: ATMO_LAYER_COLORS.mesosphere,
          altitudeKm: { min: 50, max: 85 },
          tempK: { min: 187, max: 270 },
          note: "Earth's coldest atmospheric layer; most meteors burn up here",
        },
        {
          name: 'Thermosphere',
          color: ATMO_LAYER_COLORS.thermosphere,
          altitudeKm: { min: 85, max: 600 },
          tempK: { min: 187, max: 1773 },
          note: 'Temperature swings enormously with solar activity; the ISS and most satellites orbit within this layer',
        },
        {
          name: 'Exosphere',
          color: ATMO_LAYER_COLORS.exosphere,
          altitudeKm: { min: 600, max: 10000 },
          note: "Outermost layer, thinning gradually into interplanetary space — Earth's atmosphere has no sharp outer edge",
        },
      ],
    },
    facts: {
      massKg: 5.97217e24,
      gravityMs2: 9.80665,
      meanRadiusKm: 6371.0,
      dayLengthHours: 23.9345, // sidereal day (23h 56m 4.1s)
      axialTiltDeg: 23.4392811,
      moonCount: 1,
      densityGCm3: 5.513,
      funFact: 'The only known planet with plate tectonics and liquid-water oceans, which cover about 71% of its surface.',
    },
  },

  Mars: {
    core: {
      radiusFraction: 1662.5 / 3389.5, // 0.49 — midpoint of the "approximately 1,650-1,675 km" estimate
      color: '#8a6f5c',
      material: 'Liquid iron-nickel outer core, enriched in sulfur, oxygen, carbon, hydrogen',
      tempK: { min: 2000, max: 2400 },
      innerCore: {
        radiusFraction: 613 / 3389.5, // 0.1808 — see note; a 2025 study's point estimate
        color: '#c9a688',
        material: 'Solid inner core (tentative)',
        note: 'Actively disputed: a 2023 InSight-seismic-data study found no evidence of a solid inner core, while a 2025 study using the same dataset reported one 613±67 km in radius',
      },
    },
    mantle: {
      radiusFraction: (3389.5 - 49) / 3389.5, // 0.986 — crust 42-56 km average, midpoint 49 km
      color: '#b5563a',
      material: 'Upper mantle; rigid lithosphere down to ~250 km depth, more ductile below',
      lowerMantle: {
        radiusFraction: (1662.5 + 165) / 3389.5, // 0.5391 — core boundary + ~165 km (midpoint of the "150-180 km thick" basal layer)
        color: '#8a4a38',
        material: 'Basal liquid (partially molten) silicate layer at the base of the mantle',
        note: "Unlike Earth, the wider mantle above this basal layer doesn't have a distinct lower-mantle transition — below ~1,050 km depth it becomes mineralogically similar to Earth's transition zone instead",
      },
    },
    crust: {
      color: '#c1440e',
      material: 'Basaltic/silicate crust, 42-56 km average (6 km at Isidis Planitia to 117 km at Tharsis)',
    },
    atmosphere: {
      radiusFraction: atmoFraction(3389.5, 11.1), // ~1.02; scale height ~11.1 km (standard reference value)
      color: '#e8b89a',
      material: 'Thin carbon dioxide atmosphere',
      composition: [
        { gas: 'Carbon dioxide', percent: 95.97 },
        { gas: 'Argon', percent: 1.93 },
        { gas: 'Nitrogen', percent: 1.89 },
        { gas: 'Oxygen', percent: 0.146 },
      ],
      surfacePressureKPa: 0.636,
      tempK: { min: 163, mean: 213, max: 308 }, // -110 / -60 / 35 °C
      layers: [
        {
          name: 'Troposphere',
          color: ATMO_LAYER_COLORS.troposphere,
          altitudeKm: { min: 0, max: 40 },
          note: 'Convection and dust storms happen here. Diurnal surface temperature swings by ~60°C — far more than Earth — due to Mars\'s low thermal inertia. Unlike every other planet in the solar system, Mars has no persistent stratosphere: it lacks a UV-absorbing species like ozone to create one',
        },
        {
          name: 'Mesosphere',
          color: ATMO_LAYER_COLORS.mesosphere,
          altitudeKm: { min: 40, max: 100 },
          tempK: { min: 100, max: 120 },
          note: 'Coldest layer — CO2 radiates heat efficiently into space here, sometimes cold enough for CO2 ice clouds to form',
        },
        {
          name: 'Thermosphere',
          color: ATMO_LAYER_COLORS.thermosphere,
          altitudeKm: { min: 100, max: 230 },
          tempK: { min: 175, max: 390 },
          note: 'Heated by extreme-UV absorption; temperature varies by season (175 K at aphelion to 240 K at perihelion, spiking to 390 K)',
        },
        {
          name: 'Exosphere',
          color: ATMO_LAYER_COLORS.exosphere,
          altitudeKm: { min: 230 },
          note: 'Gradually merges with interplanetary space; the solar wind strips ions from here directly into space',
        },
      ],
    },
    facts: {
      massKg: 6.4171e23,
      gravityMs2: 3.72076,
      meanRadiusKm: 3389.5,
      dayLengthHours: 1.025957 * dayInHours,
      axialTiltDeg: 25.19,
      moonCount: 2,
      densityGCm3: 3.9335,
      funFact: 'Home to Olympus Mons, the largest volcano in the solar system, and Valles Marineris, a canyon system over 4,000 km long.',
    },
  },

  Jupiter: {
    core: {
      radiusFraction: 0.40, // midpoint of Juno mission's "diffuse core extending 30-50% of the radius"
      color: '#c9a876',
      material: 'Diffuse mix of heavy elements blending into the surrounding metallic hydrogen — no sharp boundary',
      note: 'Juno data: 7-25 Earth masses of heavy elements; older pre-Juno models assumed a small, dense, compact core instead',
    },
    mantle: {
      radiusFraction: 0.80, // "extending outward to about 80% of the radius"
      color: '#e8935a',
      material: 'Liquid metallic hydrogen (with helium)',
    },
    crust: {
      displayName: 'Visible Cloud Deck (1-bar level)',
      color: '#d8ab6f',
      material: 'Molecular hydrogen/helium gas, transitioning to liquid with depth',
    },
    atmosphere: {
      radiusFraction: atmoFraction(69886, 27), // ~1.002; scale_height 27 km, direct from infobox
      color: '#f5e3c0',
      material: 'Hydrogen-helium atmosphere',
      composition: [
        { gas: 'Hydrogen', percent: 89 },
        { gas: 'Helium', percent: 10 },
        { gas: 'Methane', percent: 0.3 },
        { gas: 'Ammonia', percent: 0.026 },
      ],
      surfacePressureKPa: 400, // "200-600 kPa, opaque cloud deck"
      tempK: { mean: 165 }, // at the 1-bar level
      // Altitudes are referenced to the 1-bar pressure level (Jupiter has no solid
      // surface); Jupiter has no mesosphere, per Atmosphere_of_Jupiter.html.
      layers: [
        {
          name: 'Troposphere',
          color: ATMO_LAYER_COLORS.troposphere,
          altitudeKm: { min: -90, max: 50 },
          tempK: { min: 110, max: 340 },
          note: 'Smoothly transitions into the fluid interior below — hydrogen/helium become supercritical fluids rather than crossing a sharp gas-liquid boundary. Ammonia, ammonium hydrosulfide, and water clouds form successive decks within it',
        },
        {
          name: 'Stratosphere',
          color: ATMO_LAYER_COLORS.stratosphere,
          altitudeKm: { min: 50, max: 320 },
          tempK: { min: 110, max: 200 },
          note: 'Contains haze layers of polycyclic aromatic hydrocarbons and hydrazine, produced when solar UV breaks down methane',
        },
        {
          name: 'Thermosphere',
          color: ATMO_LAYER_COLORS.thermosphere,
          altitudeKm: { min: 320, max: 1000 },
          tempK: { min: 200, max: 1000 },
          note: "Unexpectedly hot (800-1000 K) — the decades-long 'energy crisis' puzzle is now attributed to auroral heating redistributed via ion drag. Hosts Jupiter's ionosphere and permanent auroral ovals",
        },
        {
          name: 'Exosphere',
          color: ATMO_LAYER_COLORS.exosphere,
          altitudeKm: { min: 1000, max: 5000 },
          note: 'Has no sharp upper edge — density gradually fades into the interplanetary medium roughly 5,000 km above the 1-bar level',
        },
      ],
    },
    facts: {
      massKg: 1.898125e27,
      gravityMs2: 24.79,
      meanRadiusKm: 69886,
      dayLengthHours: 9.9250,
      axialTiltDeg: 3.13,
      moonCount: 115,
      densityGCm3: 1.326,
      funFact: "Its Great Red Spot is a storm larger than Earth that has raged for at least 190 years.",
    },
  },

  Saturn: {
    core: {
      radiusFraction: 0.60, // ring-seismology estimate, ~17 Earth masses
      color: '#c9b896',
      material: 'Rocky/icy, denser and more centrally concentrated than Jupiter’s',
      note: 'Older (2004) gravity-based estimate: 9-22 Earth masses, ~20,000 km diameter (~17% of radius)',
    },
    mantle: {
      radiusFraction: (58232 - 1000) / 58232, // 0.983 — outermost gas layer spans ~1,000 km
      color: '#e0b878',
      material: 'Liquid metallic hydrogen, transitioning to liquid molecular hydrogen/helium',
    },
    crust: {
      displayName: 'Visible Cloud Deck (1-bar level)',
      color: '#e8d4a0',
      material: 'Hydrogen/helium gas layer transitioning to the visible cloud deck',
    },
    atmosphere: {
      radiusFraction: atmoFraction(58232, 59.5), // ~1.006; scale_height 59.5 km, direct from infobox
      color: '#f2e8c8',
      material: 'Hydrogen-helium atmosphere',
      composition: [
        { gas: 'Hydrogen', percent: 96.3 },
        { gas: 'Helium', percent: 3.25 },
        { gas: 'Methane', percent: 0.45 },
      ],
      scaleHeightKm: 59.5, // no usable surface_pressure figure ("much greater than 1000 bars" in the infobox is only a qualitative floor)
      tempK: { mean: 134 }, // at the 1-bar level
    },
    facts: {
      massKg: 5.68317e26,
      gravityMs2: 10.44,
      meanRadiusKm: 58232,
      dayLengthHours: 10.5433,
      axialTiltDeg: 26.73,
      moonCount: '293 (+ innumerable moonlets)',
      densityGCm3: 0.687,
      funFact: 'Its icy rings are only about 10 meters thick on average despite being 280,000 km wide. Saturn is the least dense planet — it would float in water.',
    },
  },

  Uranus: {
    core: {
      radiusFraction: 0.20, // "radius less than 20% of the planet"
      color: '#8f7a63',
      material: 'Rocky silicate/iron-nickel',
      densityGCm3: 9,
      tempK: 5000,
    },
    mantle: {
      radiusFraction: 0.80, // 1 - "upper atmosphere ... extending for the last 20% of Uranus's radius"
      color: '#2b96cc',
      material: "Hot, dense fluid of water, ammonia, and methane (a superionic/ionic “water-ammonia ocean,” not ice)",
    },
    crust: {
      displayName: 'Visible Cloud Deck (1-bar level)',
      color: '#6dd3e0',
      material: 'Hydrogen/helium/methane gas envelope — methane absorption gives Uranus its pale blue-green color',
    },
    atmosphere: {
      radiusFraction: atmoFraction(25362, 27.7), // ~1.007; scale_height 27.7 km, direct from infobox
      color: '#a8f0f5',
      material: 'Hydrogen-helium atmosphere with methane',
      composition: [
        { gas: 'Hydrogen', percent: 83 },
        { gas: 'Helium', percent: 15 },
        { gas: 'Methane', percent: 2.3 },
      ],
      scaleHeightKm: 27.7,
      tempK: { mean: 76 }, // at the 1-bar level
      // Atmosphere_of_Uranus.html gives precise altitude AND pressure boundaries for all
      // three layers; Uranus has no mesosphere.
      layers: [
        {
          name: 'Troposphere',
          color: ATMO_LAYER_COLORS.troposphere,
          altitudeKm: { min: -300, max: 50 },
          tempK: { min: 53, max: 320 },
          note: 'Holds nearly all the atmosphere\'s mass. A complex, mostly-speculative cloud stack is hypothesized: water (50-300 bar), ammonium hydrosulfide (20-40 bar), ammonia/hydrogen sulfide (3-10 bar), and methane (1-2 bar, the only layer directly confirmed by Voyager 2)',
        },
        {
          name: 'Stratosphere',
          color: ATMO_LAYER_COLORS.stratosphere,
          altitudeKm: { min: 50, max: 4000 },
          tempK: { min: 53, max: 850 },
          note: 'Heated both by downward conduction from the hot thermosphere and by solar UV absorption from methane photochemistry',
        },
        {
          name: 'Thermosphere/Exosphere',
          color: ATMO_LAYER_COLORS.thermosphere,
          altitudeKm: { min: 4000 },
          note: 'Extends out to as much as a few Uranus radii from the surface, with no distinct boundary between the thermosphere and exosphere',
        },
      ],
    },
    facts: {
      massKg: 8.68099e25,
      gravityMs2: 8.69,
      meanRadiusKm: 25362,
      dayLengthHours: 0.718661 * dayInHours, // retrograde sidereal rotation
      axialTiltDeg: 82.23,
      moonCount: 29,
      densityGCm3: 1.27,
      funFact: 'Rotates almost completely on its side (98° axial tilt), likely the result of an ancient massive collision.',
    },
  },

  Neptune: {
    core: {
      radiusFraction: 0.20, // ⚠ no explicit radius figure found in Neptune.html's Internal_structure prose (only mass, ~1.2 Earth masses,
      color: '#8f7a63',      // is given) — this follows the same ~20% estimate used for Uranus, which the article explicitly says
      material: 'Iron-nickel-silicate', // Neptune's internal structure "resembles." Treat as an estimate, not a directly-cited figure.
      tempK: 5400,
      note: 'Core radius not directly cited in source; estimated by analogy to Uranus (mass ~1.2 Earth masses is cited directly)',
    },
    mantle: {
      radiusFraction: 0.85, // 1 - midpoint of "atmosphere ... extends perhaps 10 to 20% of the way towards the core"
      color: '#2b6cc4',
      material: 'Hot, dense fluid of water, ammonia, and methane (a "water-ammonia ocean"); methane may decompose into diamond rain near 7,000 km depth',
    },
    crust: {
      displayName: 'Visible Cloud Deck (1-bar level)',
      color: '#3d5fd1',
      material: 'Hydrogen/helium/methane gas envelope',
    },
    atmosphere: {
      radiusFraction: atmoFraction(24622, 19.7), // ~1.005; scale_height 19.7 km, direct from infobox
      color: '#6a8fff',
      material: 'Hydrogen-helium atmosphere with methane',
      composition: [
        { gas: 'Hydrogen', percent: 80 },
        { gas: 'Helium', percent: 19 },
        { gas: 'Methane', percent: 1.5 },
      ],
      scaleHeightKm: 19.7,
      tempK: { mean: 72 }, // at the 1-bar level
      // Neptune.html only cites layer boundaries as pressure levels, not altitudes (no
      // dedicated atmosphere sub-article exists for Neptune) — altitudeKm values here are
      // derived from those cited pressures via altitudeFromPressureRatio(), not directly
      // sourced; see each note.
      layers: [
        {
          name: 'Troposphere',
          color: ATMO_LAYER_COLORS.troposphere,
          altitudeKm: { min: 0, max: altitudeFromPressureRatio(19.7, 10) }, // ~45 km; tropopause cited at 0.1 bar
          note: 'Upper-level methane clouds form below 1 bar; ammonia and hydrogen sulfide clouds are modeled between 1-5 bar',
        },
        {
          name: 'Stratosphere',
          color: ATMO_LAYER_COLORS.stratosphere,
          altitudeKm: { min: altitudeFromPressureRatio(19.7, 10), max: altitudeFromPressureRatio(19.7, 1e5) }, // ~45-227 km; boundary cited as 1e-5 to 1e-4 bar
          note: 'Temperature rises with altitude here, the reverse of the troposphere below',
        },
        {
          name: 'Thermosphere/Exosphere',
          color: ATMO_LAYER_COLORS.thermosphere,
          altitudeKm: { min: altitudeFromPressureRatio(19.7, 1e5) }, // ~227 km
          note: 'The thermosphere gradually transitions to the exosphere with no cited boundary between them',
        },
      ],
    },
    facts: {
      massKg: 1.024092e26,
      gravityMs2: 11.27,
      meanRadiusKm: 24622,
      dayLengthHours: 0.673 * dayInHours,
      axialTiltDeg: 28.32,
      moonCount: 16,
      densityGCm3: 1.638,
      funFact: 'Has the strongest sustained winds in the solar system, reaching up to 2,100 km/h (1,300 mph).',
    },
  },
};
