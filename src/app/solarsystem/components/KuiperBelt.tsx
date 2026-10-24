import { kuiperBelt } from '../data/kuiperBelt'
import { simplifiedRadius } from '../data/smallBodies.display'
import OrbitSwarm, { rowsToOrbits } from './OrbitSwarm'

// ~5,000 real trans-Neptunian objects (data/kuiperBelt.ts, JPL SBDB, H <= 8) at their real
// positions for the simulation date: the Kuiper belt proper (a < 50 AU) and the more
// eccentric, inclined scattered disc / detached population beyond it.

const BELT_ORBITS = rowsToOrbits(kuiperBelt.filter((r) => r[7] === 0), simplifiedRadius)
const SCATTERED_ORBITS = rowsToOrbits(kuiperBelt.filter((r) => r[7] === 1), simplifiedRadius)

export function KuiperBelt({ useSimplifiedDistance = false }: { useSimplifiedDistance?: boolean }) {
  return <OrbitSwarm orbits={BELT_ORBITS} size={0.35} color="#b6a5d6" useSimplifiedDistance={useSimplifiedDistance} />
}

export function ScatteredDisc({ useSimplifiedDistance = false }: { useSimplifiedDistance?: boolean }) {
  return <OrbitSwarm orbits={SCATTERED_ORBITS} size={0.45} color="#8f86b8" useSimplifiedDistance={useSimplifiedDistance} />
}
