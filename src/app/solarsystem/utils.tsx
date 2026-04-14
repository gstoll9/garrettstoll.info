export type OrbitProps = {
    semimajorAxis: number
    semimajorAxisSimplified: number
    eccentricity: number
    inclination: number
    longitudeOfAscendingNode: number
    argumentOfPerihelion: number
    meanAnomaly: number
    orbitalPeriod: number
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
            // dynamically require 'astronomy-engine' since we cannot import at top of this file without modifying more heavily
            const { Body, HelioVector, Rotation_EQJ_ECL, RotateVector } = require('astronomy-engine');
            const now = new Date(dateMs ?? Date.now());
            const bodyMap: Record<string, any> = {
                'Mercury': Body.Mercury,
                'Venus': Body.Venus,
                'Earth': Body.Earth,
                'Mars': Body.Mars,
                'Jupiter': Body.Jupiter,
                'Saturn': Body.Saturn,
                'Uranus': Body.Uranus,
                'Neptune': Body.Neptune
            };
            const body = bodyMap[name];
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
  