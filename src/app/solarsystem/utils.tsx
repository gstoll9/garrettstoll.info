import { Body, GeoMoon, HelioVector, JupiterMoons, Rotation_EQJ_ECL, RotateVector, RotationAxis, Vector } from 'astronomy-engine';
import { moonElements, type MoonElements } from './data/moonElements';
import type { Comet } from './data/comets';
import { localGroupGalaxies, type LocalGroupGalaxy } from './data/localGroup';
import { ANDROMEDA, DISK_OVERRIDES, MILKY_WAY, SPHEROID_OVERRIDES, type DiskSpec } from './data/localGroupHosts';
import { GALACTIC_MOTION } from './data/galacticMotion';
import { milkyWayArms, milkyWayObjects, type MilkyWayObjectInfo, type MilkyWayObjectKind, type SpiralArm } from './data/milkyWay';

export const REAL_LIVE_BODIES: Record<string, Body> = {
    'Sun': Body.Sun,
    'Mercury': Body.Mercury,
    'Venus': Body.Venus,
    'Earth': Body.Earth,
    'Mars': Body.Mars,
    'Jupiter': Body.Jupiter,
    'Saturn': Body.Saturn,
    'Uranus': Body.Uranus,
    'Neptune': Body.Neptune,
    'Pluto': Body.Pluto,
};

// Same EQJ -> ECL -> three.js (Y-up) remap used for positions throughout this file,
// applied to a direction vector (e.g. a rotation axis) instead of a position.
function eqjVectorToThree(v: Vector): [number, number, number] {
    const vecEcl = RotateVector(Rotation_EQJ_ECL(), v);
    return [vecEcl.x, vecEcl.z, -vecEcl.y];
}

export type BodyAxis = {
    northThree: [number, number, number]; // real north-pole direction, already in this scene's three.js frame
    spinDegrees: number; // real prime-meridian angle at this instant (IAU rotation model)
};

// Real axial tilt + rotational phase for any body astronomy-engine models (Sun, Moon, the 8 planets, Pluto).
// Returns null for bodies the library doesn't cover, so callers can fall back to the old Y-axis spin.
export function getBodyAxis(bodyName: string, dateMs: number): BodyAxis | null {
    const body = REAL_LIVE_BODIES[bodyName];
    if (!body) return null;
    try {
        const axis = RotationAxis(body, new Date(dateMs));
        return { northThree: eqjVectorToThree(axis.north), spinDegrees: axis.spin };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export type OrbitProps = {
    semimajorAxis: number
    semimajorAxisSimplified: number
    eccentricity: number
    inclination: number
    longitudeOfAscendingNode: number
    argumentOfPerihelion: number
    meanAnomaly: number
    orbitalPeriod: number
    // Optional: real epoch (ms) at which `meanAnomaly` is valid, and `orbitalPeriod` in real
    // seconds (not the stylized/legacy unit the 8 planets use below, which is only ever
    // sampled as a full closed loop for Orbit.tsx's static path line, so its phase is never
    // observed in isolation). Bodies without astronomy-engine ephemeris support (e.g. Ceres,
    // Eris, Haumea, Makemake) set this so their real-time position is phase-accurate, not
    // just shape-accurate.
    epochMs?: number
}

export const simulationState = {
    elapsed: 0,
    dateMs: Date.now()
};

// Scroll-zoom moves between the nested models (Local Group ⇄ Milky Way ⇄ Solar System ⇄
// planet). When a zoom crosses a model's edge, ScaleTransitions sets `entry` before
// switching focus, so CameraController can place the camera at the matching end of the next
// model: zooming out of the Solar System arrives at the Milky Way zoomed in on the Sun, etc.
export const scaleTransition: { entry: 'fromInner' | 'fromOuter' | null; planetFrameDistance: number | null; locked: boolean } = {
    entry: null,
    planetFrameDistance: null, // the focused planet's framing distance (CameraController), for zooming back out
    locked: false, // true while the Milky Way view is zoomed onto a selected object: no scale switching
};

export function orbitalPosition(orbitMode: string, t: number, orbitData: OrbitProps, useSimplifiedDistance: boolean = false, name?: string, dateMs?: number): [number, number, number] {
    const { 
        semimajorAxis, semimajorAxisSimplified, eccentricity, inclination, 
        longitudeOfAscendingNode, argumentOfPerihelion, 
        meanAnomaly, orbitalPeriod 
    } = orbitData

    const radius = useSimplifiedDistance ? semimajorAxisSimplified : semimajorAxis

    if (orbitMode === 'RealLive' && name) {
        try {
            const now = new Date(dateMs ?? Date.now());
            const body = REAL_LIVE_BODIES[name];
            if (body) {
                // Get J2000 equatorial coordinates
                const vecEqj = HelioVector(body, now);
                // Rotate to J2000 ecliptic coordinates (x, y = ecliptic plane, z = perpendicular)
                const rotMatrix = Rotation_EQJ_ECL();
                const vecEcl = RotateVector(rotMatrix, vecEqj);

                // Map to three.js coordinates: Y is up!
                // vecEcl.x, vecEcl.y form the ecliptic plane mapped to three.js XZ plane.
                let X = vecEcl.x;
                let Y = vecEcl.z;
                let Z = -vecEcl.y;
                
                if (useSimplifiedDistance) {
                    const currentDist = Math.sqrt(X*X + Y*Y + Z*Z);
                    const targetDist = semimajorAxisSimplified;
                    const rScale = targetDist / currentDist;
                    X *= rScale;
                    Y *= rScale;
                    Z *= rScale;
                } else {
                    const distanceFactor = 12; // 1 AU = 12 units
                    X *= distanceFactor;
                    Y *= distanceFactor;
                    Z *= distanceFactor;
                }
                return [X, Y, Z];
            }
        } catch (e) {
            console.error(e);
            // fallback below
        }
    }

    if (orbitData.epochMs !== undefined && dateMs !== undefined) {
        // Epoch-anchored elliptical body (no astronomy-engine ephemeris): phase must come
        // from real elapsed time since the elements' epoch, not the page-load-relative `t`.
        const M = (meanAnomaly * Math.PI / 180) + (2 * Math.PI * (dateMs - orbitData.epochMs) / 1000) / orbitalPeriod;
        // Newton's method: the old 5-step fixed-point iteration didn't converge for
        // high-eccentricity orbits (Sedna, 2017 OF201 were tens of degrees off Horizons)
        const E = solveKepler(((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), eccentricity);
        const x = radius * (Math.cos(E) - eccentricity);
        const y = radius * Math.sqrt(1 - eccentricity ** 2) * Math.sin(E);

        const Ω = longitudeOfAscendingNode * (Math.PI / 180);
        const iRad = inclination * (Math.PI / 180);
        const wRad = argumentOfPerihelion * (Math.PI / 180);

        const X =
            (Math.cos(Ω) * Math.cos(wRad) - Math.sin(Ω) * Math.sin(wRad) * Math.cos(iRad)) * x +
            (-Math.cos(Ω) * Math.sin(wRad) - Math.sin(Ω) * Math.cos(wRad) * Math.cos(iRad)) * y;
        const Y =
            (Math.sin(Ω) * Math.cos(wRad) + Math.cos(Ω) * Math.sin(wRad) * Math.cos(iRad)) * x +
            (-Math.sin(Ω) * Math.sin(wRad) + Math.cos(Ω) * Math.cos(wRad) * Math.cos(iRad)) * y;
        const Z = (Math.sin(wRad) * Math.sin(iRad)) * x + (Math.cos(wRad) * Math.sin(iRad)) * y;

        return [X, Z, -Y];
    }

    if (orbitMode === 'Simple') {
        // Simple circular orbit
        const angle = (t / orbitalPeriod) * 2 * Math.PI
        const x = radius * Math.cos(angle)
        const z = radius * Math.sin(angle)
        return [x, 0, -z] // Adjust for three.js Z-up camera
    }

    const M = meanAnomaly + (2 * Math.PI * t) / orbitalPeriod
  
    // Solve Kepler's Equation: M = E - e * sin(E)
    const E = solveKepler(((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), eccentricity)
  
    // Position in orbital plane
    const x = radius * (Math.cos(E) - eccentricity)
    const y = radius * Math.sqrt(1 - eccentricity ** 2) * Math.sin(E)
  
    // Convert angles to radians
    const cos = Math.cos
    const sin = Math.sin
    const Ω = longitudeOfAscendingNode * (Math.PI / 180)
    const iRad = inclination * (Math.PI / 180)
    const wRad = argumentOfPerihelion * (Math.PI / 180)
  
    // Rotate to 3D space
    const X =
      (cos(Ω) * cos(wRad) - sin(Ω) * sin(wRad) * cos(iRad)) * x +
      (-cos(Ω) * sin(wRad) - sin(Ω) * cos(wRad) * cos(iRad)) * y
    const Y =
      (sin(Ω) * cos(wRad) + cos(Ω) * sin(wRad) * cos(iRad)) * x +
      (-sin(Ω) * sin(wRad) + cos(Ω) * cos(wRad) * cos(iRad)) * y
    const Z = (sin(wRad) * sin(iRad)) * x + (cos(wRad) * sin(iRad)) * y
  
    return [X, Z, -Y] // Adjust for three.js Z-up camera
  }

// ── Comets ──────────────────────────────────────────────────────────────────
// Two-body heliocentric motion from perihelion elements (q, e, tp), valid for ellipses,
// near-parabolic and hyperbolic orbits alike. Mirrors `position` in jpl/generateComets.py,
// which checks it against JPL Horizons.

const GAUSS_K = 0.01720209895; // sqrt(GM_sun), AU^1.5 / day
const COMET_AU = 12; // scene units per AU, matching data/planets.tsx

// In-plane position (perifocal x toward perihelion, y along motion) for a true anomaly
function perifocalAt(c: Comet, nu: number): [number, number] {
    const r = c.q * (1 + c.e) / (1 + c.e * Math.cos(nu));
    return [r * Math.cos(nu), r * Math.sin(nu)];
}

function perifocalAtDate(c: Comet, dateMs: number): [number, number] {
    const dt = dateMs / 86400000 + 2440587.5 - c.tpJd;
    const e = c.e;
    if (e < 1) {
        const a = c.q / (1 - e);
        let M = GAUSS_K * dt / Math.pow(a, 1.5);
        M = ((M + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        let E = e < 0.8 ? M : Math.sign(M) * Math.PI;
        for (let k = 0; k < 50; k++) {
            const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
            E -= d;
            if (Math.abs(d) < 1e-12) break;
        }
        return [a * (Math.cos(E) - e), a * Math.sqrt(1 - e * e) * Math.sin(E)];
    }
    const a = c.q / (e - 1);
    const M = GAUSS_K * dt / Math.pow(a, 1.5);
    let H = Math.asinh(M / e);
    for (let k = 0; k < 50; k++) {
        const d = (e * Math.sinh(H) - H - M) / (e * Math.cosh(H) - 1);
        H -= d;
        if (Math.abs(d) < 1e-12) break;
    }
    return [a * (e - Math.cosh(H)), a * Math.sqrt(e * e - 1) * Math.sinh(H)];
}

// Perifocal -> ecliptic (AU) -> scene units, same Y-up mapping as orbitalPosition
function cometToScene(c: Comet, [xo, yo]: [number, number]): [number, number, number] {
    const d2r = Math.PI / 180;
    const O = c.nodeDeg * d2r, i = c.inclinationDeg * d2r, w = c.argPerihelionDeg * d2r;
    const cO = Math.cos(O), sO = Math.sin(O), ci = Math.cos(i), si = Math.sin(i), cw = Math.cos(w), sw = Math.sin(w);
    const x = (cO * cw - sO * sw * ci) * xo + (-cO * sw - sO * cw * ci) * yo;
    const y = (sO * cw + cO * sw * ci) * xo + (-sO * sw + cO * cw * ci) * yo;
    const z = (sw * si) * xo + (cw * si) * yo;
    return [x * COMET_AU, z * COMET_AU, -y * COMET_AU];
}

export function cometPosition(c: Comet, dateMs: number): [number, number, number] {
    return cometToScene(c, perifocalAtDate(c, dateMs));
}

// Orbit path, sampled evenly in true anomaly (dense near perihelion, where it curves most).
// Hyperbolic / very long orbits are clipped to `maxAU` from the Sun.
export function cometOrbitPath(c: Comet, maxAU = 60, samples = 360): [number, number, number][] {
    // largest true anomaly with r <= maxAU (and inside the asymptote for e >= 1)
    const cosLimit = (c.q * (1 + c.e) / maxAU - 1) / c.e;
    const nuMax = cosLimit <= -1 ? Math.PI : Math.acos(Math.max(-1, Math.min(1, cosLimit)));
    const pts: [number, number, number][] = [];
    for (let k = 0; k <= samples; k++) {
        const nu = -nuMax + (2 * nuMax * k) / samples;
        pts.push(cometToScene(c, perifocalAt(c, nu)));
    }
    return pts;
}

// ── Moons ───────────────────────────────────────────────────────────────────
// Planet-centred moon positions in km, already in this scene's three.js frame (same
// EQJ -> ECL -> Y-up remap as the planets), for any date. Earth's Moon and Jupiter's four
// Galilean moons use astronomy-engine's full analytic theories; every other moon propagates
// an orbit fitted to JPL Horizons (data/moonElements.ts) — within ~3° of Horizons along the
// orbit for 2020-2040, except Mimas (~15°) and Hyperion (~25°), whose resonances a linear
// model can't follow.

const KM_PER_AU = 149597870.7;
const OBLIQUITY_J2000 = 23.4392911 * Math.PI / 180;

function eqjKmToThree(x: number, y: number, z: number): [number, number, number] {
    const ce = Math.cos(OBLIQUITY_J2000), se = Math.sin(OBLIQUITY_J2000);
    const eclX = x, eclY = y * ce + z * se, eclZ = -y * se + z * ce;
    return [eclX, eclZ, -eclY];
}

function solveKepler(M: number, e: number): number {
    let E = e < 0.8 ? M : Math.PI;
    for (let k = 0; k < 30; k++) {
        const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        E -= dE;
        if (Math.abs(dE) < 1e-12) break;
    }
    return E;
}

const galileanKey: Record<string, 'io' | 'europa' | 'ganymede' | 'callisto'> = {
    Io: 'io', Europa: 'europa', Ganymede: 'ganymede', Callisto: 'callisto',
};

// Horizons-anchored orbit (see data/moonElements.ts), optionally with the mean anomaly
// overridden (for drawing the whole current ellipse). Mirrors `position` in
// jpl/generateTs.py, which validates it against Horizons.
function meanElementPositionKm(el: MoonElements, dateMs: number, meanAnomalyOverrideDeg?: number): [number, number, number] {
    const d2r = Math.PI / 180;
    const days = dateMs / 86400000 + 2440587.5 - el.epochJd;
    const node = (el.nodeDeg + el.nodeRate * days) * d2r;
    const varpi = (el.longPeriapsisDeg + el.periapsisRate * days) * d2r;
    const lam = (el.meanLongitudeDeg + el.meanLongitudeRate * days) * d2r;
    const w = varpi - node;
    const M = meanAnomalyOverrideDeg !== undefined ? meanAnomalyOverrideDeg * d2r : lam - varpi;
    const inc = el.inclinationDeg * d2r;
    const e = el.eccentricity;

    const E = solveKepler(((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), e);
    const xo = el.semimajorAxisKm * (Math.cos(E) - e);
    const yo = el.semimajorAxisKm * Math.sqrt(1 - e * e) * Math.sin(E);

    // Orbit plane -> reference plane (standard Ω, i, ω rotation)
    const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(node), sO = Math.sin(node), ci = Math.cos(inc), si = Math.sin(inc);
    const xr = (cO * cw - sO * sw * ci) * xo + (-cO * sw - sO * cw * ci) * yo;
    const yr = (sO * cw + cO * sw * ci) * xo + (-sO * sw + cO * cw * ci) * yo;
    const zr = (sw * si) * xo + (cw * si) * yo;

    // Reference plane -> ICRF: x' = plane's ascending node on the ICRF equator (RA = α + 90°),
    // z' = the plane's pole, y' = z' × x'.
    const a = el.poleRaDeg * d2r, dp = el.poleDecDeg * d2r;
    const zp: [number, number, number] = [Math.cos(dp) * Math.cos(a), Math.cos(dp) * Math.sin(a), Math.sin(dp)];
    const xp: [number, number, number] = [-Math.sin(a), Math.cos(a), 0];
    const yp: [number, number, number] = [
        zp[1] * xp[2] - zp[2] * xp[1],
        zp[2] * xp[0] - zp[0] * xp[2],
        zp[0] * xp[1] - zp[1] * xp[0],
    ];
    return eqjKmToThree(
        xp[0] * xr + yp[0] * yr + zp[0] * zr,
        xp[1] * xr + yp[1] * yr + zp[1] * zr,
        xp[2] * xr + yp[2] * yr + zp[2] * zr,
    );
}

export function moonPositionKm(name: string, dateMs: number): [number, number, number] | null {
    const date = new Date(dateMs);
    if (name === 'Moon') {
        const v = GeoMoon(date);
        return eqjKmToThree(v.x * KM_PER_AU, v.y * KM_PER_AU, v.z * KM_PER_AU);
    }
    const g = galileanKey[name];
    if (g) {
        const sv = JupiterMoons(date)[g];
        return eqjKmToThree(sv.x * KM_PER_AU, sv.y * KM_PER_AU, sv.z * KM_PER_AU);
    }
    const el = moonElements[name];
    return el ? meanElementPositionKm(el, dateMs) : null;
}

// Points along the moon's path, for its orbit line: the current osculating ellipse for
// mean-element moons, or one sampled period of the full theory for the others (whose
// orbits aren't closed ellipses).
export function moonOrbitPathKm(name: string, dateMs: number, samples = 256): [number, number, number][] {
    const el = moonElements[name];
    if (!el) return [];
    const pts: [number, number, number][] = [];
    const exact = name === 'Moon' || !!galileanKey[name];
    for (let k = 0; k <= samples; k++) {
        const f = k / samples;
        if (exact) {
            const p = moonPositionKm(name, dateMs + (f - 0.5) * el.periodDays * 86400000);
            if (p) pts.push(p);
        } else {
            pts.push(meanElementPositionKm(el, dateMs, f * 360));
        }
    }
    return pts;
}

// ── Local Group ─────────────────────────────────────────────────────────────
// Frame: galactocentric, in kpc, with the Milky Way's disk in the galactic plane (galactic
// x from the Sun toward the Galactic Centre, y toward l=90°, z toward the North Galactic
// Pole). Scene mapping keeps three.js Y-up: scene (x, y, z) = (gx, gz, -gy) * units/kpc.

export const LOCAL_GROUP_UNITS_PER_KPC = 0.1;

type Vec3 = [number, number, number];

// J2000 equatorial -> galactic rotation (Hipparcos/IAU definition).
const EQ_TO_GAL: [Vec3, Vec3, Vec3] = [
    [-0.0548755604, -0.8734370902, -0.4838350155],
    [+0.4941094279, -0.4448296300, +0.7469822445],
    [-0.8676661490, -0.1980763734, +0.4559837762],
];

const v3 = {
    add: (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    scale: (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s],
    cross: (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    norm: (a: Vec3): Vec3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    // a*x + b*y + c*z for basis vectors a, b, c
    combine: (a: Vec3, x: number, b: Vec3, y: number, c: Vec3, z: number): Vec3 => [
        a[0] * x + b[0] * y + c[0] * z,
        a[1] * x + b[1] * y + c[1] * z,
        a[2] * x + b[2] * y + c[2] * z,
    ],
};

function eqToGal(v: Vec3): Vec3 {
    return EQ_TO_GAL.map(row => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) as Vec3;
}

// Line of sight plus the sky's local north/east directions at (ra, dec), all as galactic
// unit vectors — what's needed to turn a catalogued position angle/inclination into 3D.
function skyBasis(raDeg: number, decDeg: number) {
    const ra = raDeg * Math.PI / 180;
    const dec = decDeg * Math.PI / 180;
    return {
        los: eqToGal([Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)]),
        north: eqToGal([-Math.sin(dec) * Math.cos(ra), -Math.sin(dec) * Math.sin(ra), Math.cos(dec)]),
        east: eqToGal([-Math.sin(ra), Math.cos(ra), 0]),
    };
}

export const SUN_GALACTOCENTRIC: Vec3 = [-MILKY_WAY.sunGalactocentricKpc, 0, MILKY_WAY.sunHeightKpc];

export function galactocentricKpc(raDeg: number, decDeg: number, distanceKpc: number): Vec3 {
    return v3.add(SUN_GALACTOCENTRIC, v3.scale(skyBasis(raDeg, decDeg).los, distanceKpc));
}

export function localGroupToScene(p: Vec3): Vec3 {
    const s = LOCAL_GROUP_UNITS_PER_KPC;
    return [p[0] * s, p[2] * s, -p[1] * s];
}

export const SUN_SCENE_POSITION = localGroupToScene(SUN_GALACTOCENTRIC);

// Camera framing: centred on the Milky Way (our home galaxy, and the frame everything
// here is measured in), looking side-on to the Milky Way–Andromeda line so the two spirals
// don't overlap, and pulled back far enough that Andromeda (765 kpc) stays in view.
const M31_SCENE = localGroupToScene(galactocentricKpc(ANDROMEDA.raDeg, ANDROMEDA.decDeg, ANDROMEDA.distanceKpc));
export const LOCAL_GROUP_VIEW_TARGET: Vec3 = [0, 0, 0];
export const LOCAL_GROUP_VIEW_POSITION = v3.add(
    v3.scale(v3.norm(v3.cross(M31_SCENE, [0, 1, 0])), 150), [0, 45, 0]);

// Deterministic PRNG so the particle clouds don't reshuffle between renders/reloads.
export function mulberry32(seed: number) {
    return () => {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function gaussian(rand: () => number): number {
    return Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
}

function randomUnitVector(rand: () => number): Vec3 {
    const z = 2 * rand() - 1;
    const phi = 2 * Math.PI * rand();
    const r = Math.sqrt(1 - z * z);
    return [r * Math.cos(phi), r * Math.sin(phi), z];
}

// Star count grows with luminosity (sub-linearly, so the brightest galaxies stay renderable
// and the faintest still get a visible handful).
function particleCount(absMagV: number | null, cap: number): number {
    if (absMagV === null) return 24;
    return Math.round(Math.min(cap, Math.max(24, 60 * Math.pow(10, -0.2 * (absMagV + 8)))));
}

export type GalaxyKind = 'spiral' | 'gas-rich dwarf' | 'gas-poor dwarf';

export type LocalGroupBody = {
    name: string;
    kind: GalaxyKind;
    candidate: boolean; // flagged '*' in the catalog
    center: Vec3; // scene units
    extent: number; // scene units, rough visual radius
    distanceKpc: number; // from the Sun
    absMagV: number | null;
};

export type LocalGroupParticles = {
    positions: Float32Array;
    colors: Float32Array;
    sizes: Float32Array; // world-space point diameter, scene units
    bodies: LocalGroupBody[];
};

const STAR_COLORS = {
    old: [1.0, 0.8, 0.55] as Vec3, // gas-poor: old, red-giant-dominated light
    young: [0.62, 0.76, 1.0] as Vec3, // gas-rich: ongoing star formation
    disk: [1.0, 0.95, 0.88] as Vec3,
    hii: [1.0, 0.45, 0.6] as Vec3, // H II regions along spiral arms
};

type ParticleBuffers = { p: number[]; c: number[]; s: number[] };

function pushParticle(out: ParticleBuffers, pos: Vec3, color: Vec3, size: number, brightness: number) {
    const scene = localGroupToScene(pos);
    out.p.push(scene[0], scene[1], scene[2]);
    out.c.push(color[0] * brightness, color[1] * brightness, color[2] * brightness);
    out.s.push(size);
}

type DiskShape = Pick<DiskSpec, 'diameterKpc' | 'arms' | 'pitchDeg' | 'bulgeFraction' | 'barLengthKpc'> & { barAngleDeg?: number };

// Exponential disk (surface density ∝ e^(-R/h), h = diameter/8 so the quoted diameter
// encloses ~98% of the light) with a bulge/bar and illustrative log-spiral arms.
function sampleDisk(out: ParticleBuffers, rand: () => number, center: Vec3, axisU: Vec3, axisV: Vec3, normal: Vec3, spec: DiskShape, n: number) {
    const R = spec.diameterKpc / 2;
    const h = spec.diameterKpc / 8;
    const thickness = 0.012 * spec.diameterKpc;
    const size = spec.diameterKpc * 0.012 * LOCAL_GROUP_UNITS_PER_KPC;
    const tanPitch = Math.tan(spec.pitchDeg * Math.PI / 180);
    const barAngle = (spec.barAngleDeg ?? 0) * Math.PI / 180;
    const nBulge = Math.round(n * spec.bulgeFraction);

    for (let i = 0; i < n; i++) {
        let u: number, v: number, w: number, color: Vec3, bright = 0.55;
        if (i < nBulge) {
            if (spec.barLengthKpc) {
                const along = gaussian(rand) * spec.barLengthKpc * 0.35;
                const across = gaussian(rand) * spec.barLengthKpc * 0.1;
                u = along * Math.cos(barAngle) - across * Math.sin(barAngle);
                v = along * Math.sin(barAngle) + across * Math.cos(barAngle);
            } else {
                u = gaussian(rand) * R * 0.08;
                v = gaussian(rand) * R * 0.08;
            }
            w = gaussian(rand) * R * 0.05;
            color = STAR_COLORS.old;
            bright = 0.7;
        } else {
            // Gamma(2)-distributed radius = an exponential surface-density profile
            let r = -h * Math.log((rand() || 1e-9) * (rand() || 1e-9));
            if (r > R * 1.15) r = rand() * R;
            const inArm = rand() < 0.65 && r > R * 0.12;
            let theta: number;
            if (inArm) {
                const arm = Math.floor(rand() * spec.arms);
                theta = Math.log(r / (R * 0.1)) / tanPitch + (2 * Math.PI * arm) / spec.arms + barAngle + gaussian(rand) * 0.22;
            } else {
                theta = rand() * 2 * Math.PI;
            }
            u = r * Math.cos(theta);
            v = r * Math.sin(theta);
            w = gaussian(rand) * thickness;
            color = inArm ? (rand() < 0.05 ? STAR_COLORS.hii : STAR_COLORS.young) : STAR_COLORS.disk;
        }
        pushParticle(out, v3.add(center, v3.combine(axisU, u, axisV, v, normal, w)), color, size, bright);
    }
}

// Plummer sphere (projected half-light radius = the scale radius), stretched so its sky
// projection matches the catalogued ellipticity/position angle. Depth along the line of
// sight isn't observable, so it's taken as the geometric mean of the two sky axes.
function sampleSpheroid(out: ParticleBuffers, rand: () => number, center: Vec3, major: Vec3, minor: Vec3, los: Vec3,
    halfLightKpc: number, ellipticity: number, gasRich: boolean, n: number) {
    const q = 1 - ellipticity;
    const depth = Math.sqrt(q);
    const size = Math.max(halfLightKpc * 0.25, 0.01) * LOCAL_GROUP_UNITS_PER_KPC;
    for (let i = 0; i < n; i++) {
        const m = Math.max(rand(), 1e-6);
        let r = halfLightKpc / Math.sqrt(Math.pow(m, -2 / 3) - 1);
        if (r > halfLightKpc * 6) r = halfLightKpc * 6 * rand();
        const d = randomUnitVector(rand);
        const pos = v3.add(center, v3.combine(major, d[0] * r, minor, d[1] * r * q, los, d[2] * r * depth));
        const color = gasRich && rand() < 0.6 ? STAR_COLORS.young : STAR_COLORS.old;
        pushParticle(out, pos, color, size, 0.8);
    }
}

// In-plane axes + normal for a disk seen at (inclination, PA) from the Sun. Which side of
// the disk is nearer isn't fixed by inclination/PA alone; one is picked.
function diskAxesFromSky(raDeg: number, decDeg: number, inclinationDeg: number, paDeg: number) {
    const { los, north, east } = skyBasis(raDeg, decDeg);
    const pa = paDeg * Math.PI / 180;
    const inc = inclinationDeg * Math.PI / 180;
    const major = v3.norm(v3.add(v3.scale(north, Math.cos(pa)), v3.scale(east, Math.sin(pa))));
    const minorSky = v3.norm(v3.add(v3.scale(north, -Math.sin(pa)), v3.scale(east, Math.cos(pa))));
    const normal = v3.norm(v3.add(v3.scale(los, -Math.cos(inc)), v3.scale(minorSky, Math.sin(inc))));
    return { axisU: major, axisV: v3.norm(v3.cross(normal, major)), normal };
}

function classify(g: LocalGroupGalaxy): GalaxyKind {
    return g.hiMass !== null && g.hiMass > 0.1 ? 'gas-rich dwarf' : 'gas-poor dwarf';
}

export function buildLocalGroup(): LocalGroupParticles {
    const out: ParticleBuffers = { p: [], c: [], s: [] };
    const bodies: LocalGroupBody[] = [];
    const rand = mulberry32(31);
    const S = LOCAL_GROUP_UNITS_PER_KPC;

    // Milky Way: disk in the galactic plane, bar angled from the Sun–centre line.
    sampleDisk(out, rand, [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], MILKY_WAY, particleCount(MILKY_WAY.absMagV, 40000));
    bodies.push({ name: MILKY_WAY.name, kind: 'spiral', candidate: false, center: [0, 0, 0], extent: MILKY_WAY.diameterKpc / 2 * S, distanceKpc: 0, absMagV: MILKY_WAY.absMagV });

    const m31 = ANDROMEDA.disk;
    const m31Center = galactocentricKpc(ANDROMEDA.raDeg, ANDROMEDA.decDeg, ANDROMEDA.distanceKpc);
    const m31Axes = diskAxesFromSky(ANDROMEDA.raDeg, ANDROMEDA.decDeg, m31.inclinationDeg, m31.positionAngleDeg);
    sampleDisk(out, rand, m31Center, m31Axes.axisU, m31Axes.axisV, m31Axes.normal, m31, particleCount(m31.absMagV, 45000));
    bodies.push({ name: ANDROMEDA.name, kind: 'spiral', candidate: false, center: localGroupToScene(m31Center), extent: m31.diameterKpc / 2 * S, distanceKpc: ANDROMEDA.distanceKpc, absMagV: m31.absMagV });

    for (const g of localGroupGalaxies) {
        const center = galactocentricKpc(g.raDeg, g.decDeg, g.distanceKpc);
        const disk = DISK_OVERRIDES[g.catalogName];
        const spheroid = SPHEROID_OVERRIDES[g.catalogName];
        const absMagV = disk?.absMagV ?? spheroid?.absMagV ?? g.absMagV;
        let kind = classify(g);
        let extentKpc: number;

        if (disk) {
            const axes = diskAxesFromSky(g.raDeg, g.decDeg, disk.inclinationDeg, disk.positionAngleDeg);
            sampleDisk(out, rand, center, axes.axisU, axes.axisV, axes.normal, disk, particleCount(absMagV, 20000));
            extentKpc = disk.diameterKpc / 2;
            if (disk.arms > 1) kind = 'spiral';
        } else {
            const rh = spheroid?.halfLightKpc ?? g.halfLightKpc;
            if (rh === null) {
                // No measured size: one faint point keeps it findable/hoverable without
                // inventing a shape.
                pushParticle(out, center, STAR_COLORS.old, 0.02, 0.6);
                extentKpc = 0.05;
            } else {
                const { los, north, east } = skyBasis(g.raDeg, g.decDeg);
                const pa = (g.positionAngle ?? 0) * Math.PI / 180;
                const major = v3.add(v3.scale(north, Math.cos(pa)), v3.scale(east, Math.sin(pa)));
                const minor = v3.add(v3.scale(north, -Math.sin(pa)), v3.scale(east, Math.cos(pa)));
                sampleSpheroid(out, rand, center, major, minor, los, rh, g.ellipticity ?? 0, kind === 'gas-rich dwarf', particleCount(absMagV, 8000));
                extentKpc = rh * 2;
            }
        }
        bodies.push({
            name: g.name,
            kind,
            candidate: g.catalogName.startsWith('*'),
            center: localGroupToScene(center),
            extent: extentKpc * S,
            distanceKpc: g.distanceKpc,
            absMagV,
        });
    }

    return {
        positions: new Float32Array(out.p),
        colors: new Float32Array(out.c),
        sizes: new Float32Array(out.s),
        bodies,
    };
}

// ── Galactic motion ─────────────────────────────────────────────────────────
// The Sun's orbit around the Milky Way, from the constants in data/galacticMotion.ts, in
// the galactocentric frame above (kpc; x from the Sun toward the Centre, y along the
// rotation, z toward the north galactic pole).
//
// Model: an axisymmetric power-law rotation curve Vc ∝ R^β whose local angular speed and
// slope reproduce the Oort constants (so its galactic year and epicycle period match theirs),
// plus a harmonic vertical oscillation with the observed ~83 Myr period. The Sun starts at
// its measured position and velocity and is integrated (leapfrog) through that potential.
// Real orbits are perturbed by the bar and spiral arms; this is the standard smooth model.

const KMS_TO_KPC_PER_MYR = 1.0227e-3;
const KMS_TO_AU_PER_YEAR = 0.210945;
const OMEGA0 = GALACTIC_MOTION.oortA - GALACTIC_MOTION.oortB; // km/s/kpc
const ROTATION_SLOPE = -(GALACTIC_MOTION.oortA + GALACTIC_MOTION.oortB) / OMEGA0; // β
const R_SUN = MILKY_WAY.sunGalactocentricKpc;
export const CIRCULAR_SPEED_KMS = OMEGA0 * R_SUN;
export const GALACTIC_YEAR_MYR = 2 * Math.PI / (OMEGA0 * KMS_TO_KPC_PER_MYR);
const NU = 2 * Math.PI / GALACTIC_MOTION.verticalPeriodMyr; // rad/Myr

// The Sun's velocity relative to the Galactic Centre (km/s, galactic axes): circular speed
// plus its peculiar motion relative to the local standard of rest
const { U, V, W } = GALACTIC_MOTION.peculiarKms;
export const SUN_GALACTIC_VELOCITY_KMS: Vec3 = [U, CIRCULAR_SPEED_KMS + V, W];
export const SUN_GALACTIC_SPEED_KMS = Math.hypot(...SUN_GALACTIC_VELOCITY_KMS);

// Sun's galactocentric position (kpc) every `stepMyr` from now over `spanMyr` (negative =
// into the past). Index 0 is the present.
export function sunGalacticOrbit(spanMyr: number, stepMyr = 0.5): Vec3[] {
    const dt = Math.sign(spanMyr) * stepMyr;
    const steps = Math.ceil(Math.abs(spanMyr) / stepMyr);
    const vc0 = CIRCULAR_SPEED_KMS * KMS_TO_KPC_PER_MYR;
    const accel = (x: number, y: number): [number, number] => {
        const r = Math.hypot(x, y);
        const vc = vc0 * Math.pow(r / R_SUN, ROTATION_SLOPE);
        const a = -vc * vc / r; // centripetal, toward the centre
        return [a * x / r, a * y / r];
    };
    let [x, y] = [SUN_GALACTOCENTRIC[0], SUN_GALACTOCENTRIC[1]];
    let vx = U * KMS_TO_KPC_PER_MYR; // U is toward the Centre, which is +x here
    let vy = (CIRCULAR_SPEED_KMS + V) * KMS_TO_KPC_PER_MYR;
    const z0 = SUN_GALACTOCENTRIC[2];
    const w0 = W * KMS_TO_KPC_PER_MYR;
    const out: Vec3[] = [[x, y, z0]];
    let [ax, ay] = accel(x, y);
    for (let i = 1; i <= steps; i++) {
        vx += 0.5 * dt * ax; vy += 0.5 * dt * ay;
        x += dt * vx; y += dt * vy;
        [ax, ay] = accel(x, y);
        vx += 0.5 * dt * ax; vy += 0.5 * dt * ay;
        const t = i * dt;
        out.push([x, y, z0 * Math.cos(NU * t) + (w0 / NU) * Math.sin(NU * t)]);
    }
    return out;
}

// Galactic direction -> this solar-system scene's axes (galactic -> J2000 equatorial ->
// ecliptic -> three.js Y-up, the same remap the planet positions use)
const OBLIQUITY = 23.4392911 * Math.PI / 180;
function galacticToSolarScene(g: Vec3): Vec3 {
    const eq: Vec3 = [0, 1, 2].map(i => EQ_TO_GAL[0][i] * g[0] + EQ_TO_GAL[1][i] * g[1] + EQ_TO_GAL[2][i] * g[2]) as Vec3;
    const ecl: Vec3 = [eq[0], eq[1] * Math.cos(OBLIQUITY) + eq[2] * Math.sin(OBLIQUITY), -eq[1] * Math.sin(OBLIQUITY) + eq[2] * Math.cos(OBLIQUITY)];
    return [ecl[0], ecl[2], -ecl[1]];
}

// How far the whole Solar System moves around the Galaxy per year, in scene units
// (12 per AU) — over the centuries the trails span, the galactic orbit is a straight line
// (its radius of curvature is 1.7 billion AU)
export const SUN_GALACTIC_VELOCITY_SCENE_PER_YEAR = v3.scale(galacticToSolarScene(SUN_GALACTIC_VELOCITY_KMS), KMS_TO_AU_PER_YEAR * 12);
// Unit vectors in the scene: direction of travel, and toward the north galactic pole
export const GALACTIC_TRAVEL_DIRECTION_SCENE = v3.norm(SUN_GALACTIC_VELOCITY_SCENE_PER_YEAR);
export const GALACTIC_NORTH_SCENE = galacticToSolarScene([0, 0, 1]);

// ── Milky Way model ─────────────────────────────────────────────────────────
// The galaxy on its own, ~100x closer than the Local Group view: same galactocentric frame,
// 10 scene units per kpc.
//
// Real: the spiral arms are Reid et al. 2019's maser-parallax fits (data/milkyWay.ts), drawn
// at full density over the azimuths their masers cover and extrapolated ±60° beyond at lower
// density (flagged in the arm buffers) — the arms' far-side courses are unmeasured. Disk
// scale length 3.4 kpc (exponential disk with the infobox's 5.75 kpc half-light radius;
// R_half = 1.678 h), thin-disk thickness 220–450 pc ("Milky Way" infobox), long bar 5 kpc
// half-length at 27° (Wegg et al. 2015, see localGroupHosts.ts). Every catalogued object sits
// at its measured direction and distance.

export const MILKY_WAY_UNITS_PER_KPC = 10;

export function milkyWayToScene(p: Vec3): Vec3 {
    const s = MILKY_WAY_UNITS_PER_KPC;
    return [p[0] * s, p[2] * s, -p[1] * s];
}

export const MILKY_WAY_SUN_SCENE = milkyWayToScene(SUN_GALACTOCENTRIC);

const DISK_SCALE_LENGTH_KPC = 5.75 / 1.678;
const THIN_DISK_SIGMA_KPC = 0.33 / 2;
const ARM_WIDTH_GROWTH = 0.042; // kpc of extra arm width per kpc of radius (Reid 2019, §4)
const ARM_EXTRAPOLATION_DEG = 60;

export const ARM_DISPLAY_NAMES: Record<string, string> = {
    '3-kpc(N)': 'Near 3-kpc arm',
    Norma: 'Norma arm',
    'Sct-Cen': 'Scutum–Centaurus arm',
    'Sgr-Car': 'Sagittarius–Carina arm',
    Local: 'Local (Orion) arm',
    Perseus: 'Perseus arm',
    Outer: 'Outer arm',
};

// Galactocentric position of an arm's centre line at azimuth beta (deg): beta = 0 toward the
// Sun, increasing along the rotation (+y here)
export function armPoint(arm: SpiralArm, betaDeg: number): Vec3 {
    const pitch = (betaDeg <= arm.betaKink ? arm.pitchBelow : arm.pitchAbove) * Math.PI / 180;
    const r = arm.rKink * Math.exp(-((betaDeg - arm.betaKink) * Math.PI / 180) * Math.tan(pitch));
    const b = betaDeg * Math.PI / 180;
    return [-r * Math.cos(b), r * Math.sin(b), 0];
}

export type MilkyWayParticles = { positions: Float32Array; colors: Float32Array; sizes: Float32Array };

export function buildMilkyWay(): MilkyWayParticles {
    const rand = mulberry32(77);
    const S = MILKY_WAY_UNITS_PER_KPC;
    const p: number[] = [], c: number[] = [], sz: number[] = [];
    const push = (pos: Vec3, color: Vec3, size: number, bright: number) => {
        const q = milkyWayToScene(pos);
        p.push(q[0], q[1], q[2]);
        c.push(color[0] * bright, color[1] * bright, color[2] * bright);
        sz.push(size * S);
    };
    const maxR = MILKY_WAY.diameterKpc / 2 * 1.1;

    // smooth exponential disk (older stars)
    for (let i = 0; i < 70000; i++) {
        let r = -DISK_SCALE_LENGTH_KPC * Math.log((rand() || 1e-9) * (rand() || 1e-9));
        if (r > maxR) r = rand() * maxR;
        const th = rand() * 2 * Math.PI;
        push([r * Math.cos(th), r * Math.sin(th), gaussian(rand) * THIN_DISK_SIGMA_KPC], STAR_COLORS.disk, 0.09, 0.35);
    }

    // measured spiral arms (young stars, H II regions)
    for (const arm of milkyWayArms) {
        const lo = arm.betaMin - ARM_EXTRAPOLATION_DEG, hi = arm.betaMax + ARM_EXTRAPOLATION_DEG;
        const n = Math.round(9000 * (hi - lo) / 200);
        for (let i = 0; i < n; i++) {
            const beta = lo + rand() * (hi - lo);
            const measured = beta >= arm.betaMin && beta <= arm.betaMax;
            if (!measured && rand() < 0.5) continue;
            const centre = armPoint(arm, beta);
            const r = Math.hypot(centre[0], centre[1]);
            if (r < 2.5 || r > maxR) continue;
            const width = Math.max(0.08, arm.width + ARM_WIDTH_GROWTH * (r - arm.rKink));
            const off = gaussian(rand) * width;
            const along = gaussian(rand) * width;
            const ux = centre[0] / r, uy = centre[1] / r;
            const pos: Vec3 = [centre[0] + ux * off - uy * along, centre[1] + uy * off + ux * along, gaussian(rand) * THIN_DISK_SIGMA_KPC * 0.6];
            const hii = rand() < 0.06;
            push(pos, hii ? STAR_COLORS.hii : STAR_COLORS.young, hii ? 0.13 : 0.08, measured ? 0.75 : 0.4);
        }
    }

    // long bar + bulge (old stars); the bar's near end points into the first quadrant (+y)
    const bar = MILKY_WAY.barAngleDeg * Math.PI / 180;
    const barAxis: Vec3 = [-Math.cos(bar), Math.sin(bar), 0];
    for (let i = 0; i < 22000; i++) {
        const along = gaussian(rand) * MILKY_WAY.barLengthKpc * 0.38;
        const across = gaussian(rand) * 0.45;
        push([barAxis[0] * along - barAxis[1] * across, barAxis[1] * along + barAxis[0] * across, gaussian(rand) * 0.3], STAR_COLORS.old, 0.1, 0.55);
    }
    for (let i = 0; i < 12000; i++) {
        const d = randomUnitVector(rand);
        const r = Math.abs(gaussian(rand)) * 0.7;
        push([d[0] * r, d[1] * r, d[2] * r * 0.7], STAR_COLORS.old, 0.1, 0.7);
    }

    return { positions: new Float32Array(p), colors: new Float32Array(c), sizes: new Float32Array(sz) };
}

export type MilkyWayMarker = {
    name: string;
    kind: MilkyWayObjectKind | 'satellite galaxy';
    scene: Vec3;
    distanceKpc: number;
    wiki?: string; // Wikipedia article title
    info?: MilkyWayObjectInfo;
    galaxy?: { absMagV: number | null; halfLightKpc: number | null; ellipticity: number | null };
};

// Catalogued objects + the Milky Way's satellite galaxies (within 300 kpc, from the Local
// Group catalog), at their real positions
export function milkyWayMarkers(): MilkyWayMarker[] {
    const out: MilkyWayMarker[] = milkyWayObjects.map(o => ({
        name: o.name, kind: o.kind, distanceKpc: o.distanceKpc, wiki: o.wiki, info: o.info,
        scene: milkyWayToScene(galactocentricKpc(o.ra, o.dec, o.distanceKpc)),
    }));
    for (const g of localGroupGalaxies) {
        const centre = galactocentricKpc(g.raDeg, g.decDeg, g.distanceKpc);
        if (Math.hypot(...centre) > 300 || g.catalogName.startsWith('*')) continue;
        out.push({
            name: g.name, kind: 'satellite galaxy', distanceKpc: g.distanceKpc, scene: milkyWayToScene(centre), wiki: g.name,
            galaxy: { absMagV: g.absMagV, halfLightKpc: g.halfLightKpc, ellipticity: g.ellipticity },
        });
    }
    return out;
}

// ── Star physics for the object models ─────────────────────────────────────
// The nearest-star list gives each star's spectral class and mass but not its radius or
// temperature, so those are estimated from the class (standard values per Harvard class,
// interpolated by subtype; white dwarfs from their DA number, T = 50,400 K / n) and the mass
// (main sequence R ∝ M^0.8; giants ~10 R☉; white dwarfs ~0.012 R☉; brown dwarfs ~0.1 R☉).
// The colour is the blackbody colour at that temperature.

const CLASS_TEMPERATURE: Record<string, [number, number]> = { // [subtype 0, subtype 9] in K
    O: [45000, 31000], B: [30000, 10500], A: [10000, 7500], F: [7300, 6100], G: [6000, 5300],
    K: [5200, 3900], M: [3850, 2400], L: [2300, 1400], T: [1300, 600], Y: [500, 300],
    W: [70000, 40000], // Wolf–Rayet (WN, WC)
};

export function spectralTemperature(spectralClass: string | undefined): number | null {
    if (!spectralClass) return null;
    const s = spectralClass.trim().toUpperCase();
    const wd = /^D[A-Z]*\s*(\d+(?:\.\d+)?)/.exec(s);
    if (wd) return 50400 / Math.max(parseFloat(wd[1]), 0.5);
    if (s.startsWith('D')) return 10000;
    const m = /^([OBAFGKMLTYW])\s*(\d+(?:\.\d+)?)?/.exec(s);
    if (!m) return null;
    const [t0, t9] = CLASS_TEMPERATURE[m[1]];
    const sub = m[2] !== undefined ? Math.min(parseFloat(m[2]), 9.5) : 5;
    return t0 + (t9 - t0) * sub / 9;
}

// Blackbody colour (Tanner Helland's fit to the CIE colour-matching data), as linear 0–1 RGB
export function blackbodyColor(kelvin: number): Vec3 {
    const t = Math.min(Math.max(kelvin, 1000), 40000) / 100;
    const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
    const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
    const c = (v: number) => Math.min(Math.max(v, 0), 255) / 255;
    return [c(r), c(g), c(b)];
}

export function starRadiusSun(spectralClass: string | undefined, massSun: number | undefined): number {
    const s = (spectralClass ?? '').trim().toUpperCase();
    if (s.startsWith('D')) return 0.012;
    if (/^[LTY]/.test(s)) return 0.1;
    if (/\b(III|II|I[AB]?)\b/.test(s) || /^W/.test(s)) return 10;
    if (s.startsWith('BH')) return 0;
    return Math.pow(massSun ?? 0.5, 0.8);
}

// Separation of a binary from Kepler's third law: a³ = (M₁ + M₂) P² (AU, M☉, years)
export function binarySeparationAU(totalMassSun: number, periodDays: number): number {
    return Math.cbrt(totalMassSun * Math.pow(periodDays / 365.25, 2));
}
