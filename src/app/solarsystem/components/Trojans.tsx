import { jupiterTrojans, neptuneTrojans } from '../data/trojans'
import OrbitSwarm, { rowsToOrbits } from './OrbitSwarm'

// Jupiter and Neptune Trojans (data/trojans.ts, from JPL's Small-Body Database) at their real
// positions for the simulation date — which is what bunches them into the two swarms 60°
// ahead of and behind their planet instead of a ring.

// "Simplified distance" mode spaces planets evenly; scale each swarm with its planet so it
// stays on that planet's (simplified) orbit.
const JUPITER_ORBITS = rowsToOrbits(jupiterTrojans, (a) => a * (48 / 5.204))
const NEPTUNE_ORBITS = rowsToOrbits(neptuneTrojans, (a) => a * (72 / 30.07))

export function JupiterTrojans({ useSimplifiedDistance = false }: { useSimplifiedDistance?: boolean }) {
  // Trojans are dark, reddish D/P-type bodies, unlike the greyer main belt
  return <OrbitSwarm orbits={JUPITER_ORBITS} size={0.14} color="#d39a6a" useSimplifiedDistance={useSimplifiedDistance} />
}

export function NeptuneTrojans({ useSimplifiedDistance = false }: { useSimplifiedDistance?: boolean }) {
  // Only ~40 known and ~6x farther out, so drawn larger to stay findable
  return <OrbitSwarm orbits={NEPTUNE_ORBITS} size={0.4} color="#a9c3d6" useSimplifiedDistance={useSimplifiedDistance} />
}
