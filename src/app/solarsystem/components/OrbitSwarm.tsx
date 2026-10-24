import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { orbitalPosition, OrbitProps, simulationState } from '../utils'

// Thousands of small bodies (Trojans, Kuiper belt), each propagated from its own real orbital
// elements to the simulation date and drawn as one InstancedMesh. Unlike the main-belt cloud
// (AsteroidBelt.tsx, random orbital phases), phases here are real, so the populations' actual
// structure shows (Trojan swarms at L4/L5, plutinos avoiding Neptune).

const AU = 12 // scene units, matching data/planets.tsx
const SECONDS_PER_YEAR = 365.25 * 86400
// Re-place whenever the simulated date has moved this far — these orbits take years to decades,
// so solving thousands of them every frame would be wasted work.
const UPDATE_EVERY_MS = 2 * 86400000

// [a (AU), e, i, node, peri, M (deg), epoch (JD TDB), ...] rows, as in data/trojans.ts / kuiperBelt.ts
export type ElementRow = [number, number, number, number, number, number, number, ...number[]]

export function rowsToOrbits(rows: ElementRow[], simplifiedRadius: (aAU: number) => number): OrbitProps[] {
  return rows.map(([a, e, i, node, w, M, epochJd]) => ({
    semimajorAxis: a * AU,
    semimajorAxisSimplified: simplifiedRadius(a),
    eccentricity: e,
    inclination: i,
    longitudeOfAscendingNode: node,
    argumentOfPerihelion: w,
    meanAnomaly: M,
    orbitalPeriod: Math.pow(a, 1.5) * SECONDS_PER_YEAR,
    epochMs: (epochJd - 2440587.5) * 86400000,
  }))
}

const _dummy = new THREE.Object3D()

export default function OrbitSwarm({ orbits, size, color, useSimplifiedDistance }: { orbits: OrbitProps[]; size: number; color: string; useSimplifiedDistance: boolean }) {
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
