import { Body, GeoMoon, HelioVector, JupiterMoons, Rotation_EQJ_ECL, RotateVector, RotationAxis, Vector } from 'astronomy-engine';
import { moonElements, type MoonElements } from './data/moonElements';
import { localGroupGalaxies, type LocalGroupGalaxy } from './data/localGroup';
import { ANDROMEDA, DISK_OVERRIDES, MILKY_WAY, SPHEROID_OVERRIDES, type DiskSpec } from './data/localGroupHosts';

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
        let E = M;
        for (let j = 0; j < 5; j++) {
            E = M + eccentricity * Math.sin(E);
        }
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
    let E = M
    for (let j = 0; j < 5; j++) {
      E = M + eccentricity * Math.sin(E) // Newton-Raphson iteration
    }
  
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

const SUN_GALACTOCENTRIC: Vec3 = [-MILKY_WAY.sunGalactocentricKpc, 0, MILKY_WAY.sunHeightKpc];

function galactocentricKpc(raDeg: number, decDeg: number, distanceKpc: number): Vec3 {
    return v3.add(SUN_GALACTOCENTRIC, v3.scale(skyBasis(raDeg, decDeg).los, distanceKpc));
}

export function localGroupToScene(p: Vec3): Vec3 {
    const s = LOCAL_GROUP_UNITS_PER_KPC;
    return [p[0] * s, p[2] * s, -p[1] * s];
}

export const SUN_SCENE_POSITION = localGroupToScene(SUN_GALACTOCENTRIC);

// Camera framing: centred between the Local Group's two dominant spirals, looking at the
// pair side-on (perpendicular to the Milky Way–Andromeda line) so they don't overlap.
const M31_SCENE = localGroupToScene(galactocentricKpc(ANDROMEDA.raDeg, ANDROMEDA.decDeg, ANDROMEDA.distanceKpc));
export const LOCAL_GROUP_VIEW_TARGET = v3.scale(M31_SCENE, 0.5);
export const LOCAL_GROUP_VIEW_POSITION = v3.add(
    LOCAL_GROUP_VIEW_TARGET,
    v3.add(v3.scale(v3.norm(v3.cross(M31_SCENE, [0, 1, 0])), 95), [0, 30, 0]));

// Deterministic PRNG so the particle clouds don't reshuffle between renders/reloads.
function mulberry32(seed: number) {
    return () => {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function gaussian(rand: () => number): number {
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
