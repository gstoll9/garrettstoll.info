// Real heliosphere boundary distances and solar wind speeds, sourced from Voyager
// mission crossing data (Voyager 1: termination shock 94.0 AU in 2004; heliopause 121.6 AU
// in 2012. Voyager 2: termination shock 83.7 AU in 2007; heliopause ~119 AU in 2018).
// The heliosphere is genuinely asymmetric (compressed on the side facing the Sun's motion
// through the interstellar medium) — Voyager 1 and 2 took different paths and crossed at
// different distances, which is why these two values differ. Rendered here as a single
// representative sphere at the average of the two crossings rather than attempting the
// true asymmetric shape, which would need real interstellar-wind direction data.

// Matches the `distanceFactor` convention in data/planets.tsx (1 AU = 12 scene units).
export const AU_TO_SCENE_UNITS = 12;

export const TERMINATION_SHOCK_AU = (94.0 + 83.7) / 2; // ~88.85 AU
export const HELIOPAUSE_AU = (121.6 + 119) / 2; // ~120.3 AU

// Solar wind speed slows from supersonic to subsonic across the termination shock.
export const SOLAR_WIND_SLOW_KM_S = 400; // slow solar wind (from equatorial streamer belt)
export const SOLAR_WIND_FAST_KM_S = 750; // fast solar wind (from polar coronal holes)
export const SOLAR_WIND_POST_SHOCK_KM_S = 150; // subsonic, past the termination shock

// Sun's sidereal equatorial rotation period — what sets the Parker spiral's pitch (the
// spiral shape comes from continuous wind emission from a rotating source, not from any
// curvature in an individual particle's own path, which is essentially radial).
export const SUN_SIDEREAL_ROTATION_DAYS = 25.4;
