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

export function orbitalPosition(orbitMode: string, t: number, orbitData: OrbitProps, useSimplifiedDistance: boolean = false): [number, number, number] {
    const { 
        semimajorAxis, semimajorAxisSimplified, eccentricity, inclination, 
        longitudeOfAscendingNode, argumentOfPerihelion, 
        meanAnomaly, orbitalPeriod 
    } = orbitData

    const radius = useSimplifiedDistance ? semimajorAxisSimplified : semimajorAxis

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
  