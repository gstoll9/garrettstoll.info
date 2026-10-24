import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { spacecraftTrajectories, TrajectoryRow } from '../data/spacecraft'
import { simplifiedRadius } from '../data/smallBodies.display'
import { simulationState } from '../utils'
import Label from './Label'

// The five probes on escape trajectories (data/spacecraft.ts, JPL Horizons): full path as a
// faint line, the probe itself interpolated along it for the simulation date (hidden before
// launch / after the ephemeris ends).

const AU = 12
export const SPACECRAFT = Object.keys(spacecraftTrajectories)
const COLORS: Record<string, string> = {
  'Pioneer 10': '#ff9e6e', 'Pioneer 11': '#ff9e6e',
  'Voyager 1': '#ffd36e', 'Voyager 2': '#ffd36e',
  'New Horizons': '#9ee37d',
}

// Ecliptic AU -> scene, compressing distance the same way as the other far bodies in
// "simplified distance" mode
export function eclipticToScene([x, y, z]: [number, number, number], simplified: boolean): [number, number, number] {
  const r = Math.hypot(x, y, z)
  const k = simplified && r > 0 ? simplifiedRadius(r) / r : AU
  return [x * k, z * k, -y * k]
}

function positionAt(rows: TrajectoryRow[], jd: number): [number, number, number] | null {
  if (jd < rows[0][0] || jd > rows[rows.length - 1][0]) return null
  let lo = 0, hi = rows.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (rows[mid][0] <= jd) lo = mid; else hi = mid
  }
  const [j0, x0, y0, z0] = rows[lo], [j1, x1, y1, z1] = rows[hi]
  const t = j1 > j0 ? (jd - j0) / (j1 - j0) : 0
  return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t]
}

function Probe({ name, useSimplifiedDistance }: { name: string; useSimplifiedDistance: boolean }) {
  const rows = spacecraftTrajectories[name]
  const groupRef = useRef<THREE.Group>(null!)
  const color = COLORS[name] ?? '#ffffff'

  const path = useMemo(() => {
    const pts = rows.flatMap(([, x, y, z]) => eclipticToScene([x, y, z], useSimplifiedDistance))
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }))
  }, [rows, color, useSimplifiedDistance])
  useEffect(() => () => { path.geometry.dispose(); (path.material as THREE.Material).dispose() }, [path])

  useFrame(() => {
    const p = positionAt(rows, simulationState.dateMs / 86400000 + 2440587.5)
    groupRef.current.visible = !!p
    if (p) groupRef.current.position.set(...eclipticToScene(p, useSimplifiedDistance))
  })

  return (
    <>
      <primitive object={path} />
      <group ref={groupRef}>
        <mesh>
          <octahedronGeometry args={[0.35, 0]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <Label text={name} position={[0, 1.4, 0]} fontSize={1.2} />
      </group>
    </>
  )
}

export default function Spacecraft({ hiddenBodies, useSimplifiedDistance }: { hiddenBodies: Set<string>; useSimplifiedDistance: boolean }) {
  return (
    <>
      {SPACECRAFT.map((name) => (
        <group key={name} visible={!hiddenBodies.has(name)}>
          <Probe name={name} useSimplifiedDistance={useSimplifiedDistance} />
        </group>
      ))}
    </>
  )
}
