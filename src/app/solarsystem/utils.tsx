import { Body, HelioVector, Rotation_EQJ_ECL, RotateVector, RotationAxis, Vector } from 'astronomy-engine';

export const REAL_LIVE_BODIES: Record<string, any> = {
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

// Rodrigues' rotation formula: rotate `v` by whatever rotation takes `fromAxis` to `toAxis`.
// Used to tilt a moon's orbital plane (computed as if its parent's pole were world-up)
// into the parent planet's real axial-tilt orientation.
function rotateVectorToAlign(
    v: [number, number, number],
    fromAxis: [number, number, number],
    toAxis: [number, number, number]
): [number, number, number] {
    const norm = (a: [number, number, number]): [number, number, number] => {
        const len = Math.sqrt(a[0] ** 2 + a[1] ** 2 + a[2] ** 2) || 1;
        return [a[0] / len, a[1] / len, a[2] / len];
    };
    const f = norm(fromAxis);
    const t = norm(toAxis);
    const dot = f[0] * t[0] + f[1] * t[1] + f[2] * t[2];

    if (dot > 0.999999) return v;

    if (dot < -0.999999) {
        // 180-degree flip: reflect v through the plane perpendicular to f
        const vDotF = v[0] * f[0] + v[1] * f[1] + v[2] * f[2];
        return [v[0] - 2 * vDotF * f[0], v[1] - 2 * vDotF * f[1], v[2] - 2 * vDotF * f[2]];
    }

    const axis = [
        f[1] * t[2] - f[2] * t[1],
        f[2] * t[0] - f[0] * t[2],
        f[0] * t[1] - f[1] * t[0],
    ];
    const axisLen = Math.sqrt(axis[0] ** 2 + axis[1] ** 2 + axis[2] ** 2);
    const a: [number, number, number] = [axis[0] / axisLen, axis[1] / axisLen, axis[2] / axisLen];
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const cross: [number, number, number] = [
        a[1] * v[2] - a[2] * v[1],
        a[2] * v[0] - a[0] * v[2],
        a[0] * v[1] - a[1] * v[0],
    ];
    const aDotV = a[0] * v[0] + a[1] * v[1] + a[2] * v[2];

    return [
        v[0] * cosA + cross[0] * sinA + a[0] * aDotV * (1 - cosA),
        v[1] * cosA + cross[1] * sinA + a[1] * aDotV * (1 - cosA),
        v[2] * cosA + cross[2] * sinA + a[2] * aDotV * (1 - cosA),
    ];
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

// Real orbital elements for a moon around its parent planet, instead of a circular-orbit
// approximation. `semimajorAxis` is expressed as a multiple of the parent planet's radius
// (not km/AU) so it can be scaled by whatever display size the planet is currently rendered
// at; `orbitalPeriod` is in real seconds so it lines up with `simulationState.elapsed`
// (real seconds, scaled by the time-speed slider) the same way the exact-ephemeris moons do.
// `parentNorthThree` is the parent planet's real north-pole direction (see getBodyAxis) —
// when provided, the orbital plane (computed assuming the parent's pole points along
// world +Y) is tilted to match the planet's real axial tilt.
export type MoonOrbitProps = {
    semimajorAxis: number
    eccentricity: number
    inclination: number
    longitudeOfAscendingNode: number
    argumentOfPerihelion: number
    meanAnomaly: number
    orbitalPeriod: number
}

export function moonOrbitalPosition(
    t: number,
    orbitData: MoonOrbitProps,
    parentRadiusScale: number,
    parentNorthThree: [number, number, number] | null
): [number, number, number] {
    const { semimajorAxis, eccentricity, inclination, longitudeOfAscendingNode, argumentOfPerihelion, meanAnomaly, orbitalPeriod } = orbitData;
    const radius = semimajorAxis * parentRadiusScale;

    const M = meanAnomaly + (2 * Math.PI * t) / orbitalPeriod;
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

    const local: [number, number, number] = [X, Z, -Y];
    return parentNorthThree ? rotateVectorToAlign(local, [0, 1, 0], parentNorthThree) : local;
}
