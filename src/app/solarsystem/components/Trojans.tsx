import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { jupiterTrojans, neptuneTrojans, TrojanRow } from '../data/trojans'
import { orbitalPosition, OrbitProps, simulationState } from '../utils'

// Jupiter and Neptune Trojans (data/trojans.ts, from JPL's Small-Body Database), each one
// propagated from its own real orbital elements to the simulation date. Unlike the main-belt
// cloud (AsteroidBelt.tsx, random orbital phases), the phase here is real — that's what makes
// them bunch into the two swarms 60° ahead of and behind their planet instead of a ring.

const AU = 12 // scene units, matching data/planets.tsx
const SECONDS_PER_YEAR = 365.25 * 86400
// "Simplified distance" mode spaces planets evenly; scale each swarm with its planet so it
// stays on that planet's (simplified) orbit.
const SIMPLIFIED_SCALE = { Jupiter: 48 / 5.204, Neptune: 72 / 30.07 }

// Re-place the swarms whenever the simulated date has moved this far (they're slow: Jupiter
// Trojans take ~12 years per orbit), rather than solving thousands of orbits every frame.
const UPDATE_EVERY_MS = 2 * 86400000

function toOrbitData(rows: TrojanRow[], simplifiedScale: number): OrbitProps[] {
  return rows.map(([a, e, i, node, w, M, epochJd]) => ({
    semimajorAxis: a * AU,
    semimajorAxisSimplified: a * simplifiedScale,
    eccentricity: e,
    inclination: i,
    longitudeOfAscendingNode: node,
    argumentOfPerihelion: w,
    meanAnomaly: M,
    orbitalPeriod: Math.pow(a, 1.5) * SECONDS_PER_YEAR,
    epochMs: (epochJd - 2440587.5) * 86400000,
  }))
}

// Built once at module scope (not per frame / per render)
const JUPITER_ORBITS = toOrbitData(jupiterTrojans, SIMPLIFIED_SCALE.Jupiter)
const NEPTUNE_ORBITS = toOrbitData(neptuneTrojans, SIMPLIFIED_SCALE.Neptune)

const _dummy = new THREE.Object3D()

function Swarm({ orbits, size, color, useSimplifiedDistance }: { orbits: OrbitProps[]; size: number; color: string; useSimplifiedDistance: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const lastPlaced = useRef<number | null>(null)

  const place = (dateMs: number) => {
    orbits.forEach((orbit, i) => {
      _dummy.position.set(...orbitalPosition('Elliptical', 0, orbit, useSimplifiedDistance, undefined, dateMs))
      _dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, _dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
    meshRef.current.computeBoundingSphere()
    lastPlaced.current = dateMs
  }

  useLayoutEffect(() => {
    place(simulationState.dateMs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useSimplifiedDistance])

  useFrame(() => {
    const dateMs = simulationState.dateMs
    if (lastPlaced.current === null || Math.abs(dateMs - lastPlaced.current) > UPDATE_EVERY_MS) place(dateMs)
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, orbits.length]} frustumCulled={false}>
      <sphereGeometry args={[size, 6, 6]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
    </instancedMesh>
  )
}

export function JupiterTrojans({ useSimplifiedDistance = false }: { useSimplifiedDistance?: boolean }) {
  // Trojans are dark, reddish D/P-type bodies, unlike the greyer main belt
  return <Swarm orbits={JUPITER_ORBITS} size={0.14} color="#d39a6a" useSimplifiedDistance={useSimplifiedDistance} />
}

export function NeptuneTrojans({ useSimplifiedDistance = false }: { useSimplifiedDistance?: boolean }) {
  // Only ~40 known and ~6x farther out, so drawn larger to stay findable
  return <Swarm orbits={NEPTUNE_ORBITS} size={0.4} color="#a9c3d6" useSimplifiedDistance={useSimplifiedDistance} />
}
