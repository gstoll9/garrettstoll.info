export type OrbitProps = {
    semimajorAxis: number
    eccentricity: number
    inclination: number
    longitudeOfAscendingNode: number
    argumentOfPerihelion: number
    meanAnomaly: number
    orbitalPeriod: number
}

export function orbitalPosition(t: number, orbitData: OrbitProps): [number, number, number] {
    const { 
        semimajorAxis, eccentricity, inclination, 
        longitudeOfAscendingNode, argumentOfPerihelion, 
        meanAnomaly, orbitalPeriod 
    } = orbitData


    const M = meanAnomaly + (2 * Math.PI * t) / orbitalPeriod
  
    // Solve Kepler's Equation: M = E - e * sin(E)
    let E = M
    for (let j = 0; j < 5; j++) {
      E = M + eccentricity * Math.sin(E) // Newton-Raphson iteration
    }
  
    // Position in orbital plane
    const x = semimajorAxis * (Math.cos(E) - eccentricity)
    const y = semimajorAxis * Math.sqrt(1 - eccentricity ** 2) * Math.sin(E)
  
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
  