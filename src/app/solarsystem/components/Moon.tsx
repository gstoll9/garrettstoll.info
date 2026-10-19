import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { moonOrbitPathKm, moonPositionKm, simulationState } from '../utils'
import { moonElements } from '../data/moonElements'
import { moonAppearance, PLANET_EQUATORIAL_RADIUS_KM } from '../data/moonAppearance'

// One moon of the focused planet, positioned for the simulation's current date (see
// moonPositionKm in utils.tsx) at its planet's true scale: `planetSize` is the planet's
// rendered radius, and every km — the moon's own radii and its distance — is scaled by
// planetSize / the planet's real equatorial radius.

// Cheap deterministic 3D value noise for surface mottling (illustrative, not a map).
function hash3(x: number, y: number, z: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return s - Math.floor(s)
}

function valueNoise(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
  const xf = x - xi, yf = y - yi, zf = z - zi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz)
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  )
}

function buildMoonGeometry(name: string): THREE.SphereGeometry {
  const look = moonAppearance[name]
  const geom = new THREE.SphereGeometry(1, 48, 32)
  // Brightness follows geometric albedo, compressed so dark moons (Phobos ~0.07) stay
  // visible next to icy ones (Enceladus ~1.4) under the scene's single sun light.
  const brightness = THREE.MathUtils.clamp(Math.sqrt(look.geometricAlbedo / 0.6), 0.35, 1.15)
  const base = new THREE.Color(look.color).multiplyScalar(brightness)
  const leading = look.leadingColor ? new THREE.Color(look.leadingColor) : null
  const seed = name.length * 13.37
  const pos = geom.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const n = 0.6 * valueNoise(x * 3 + seed, y * 3, z * 3) + 0.4 * valueNoise(x * 9, y * 9 + seed, z * 9)
    c.copy(base).multiplyScalar(1 + look.mottle * (n - 0.5) * 1.6)
    if (leading) {
      // Local +Z is the direction of travel (see the orientation below)
      c.lerp(leading, THREE.MathUtils.smoothstep(z, -0.25, 0.25))
    }
    colors.set([c.r, c.g, c.b], i * 3)
  }
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geom
}

const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3()
const _m = new THREE.Matrix4()

export default function Moon({ name, planetName, planetSize }: { name: string; planetName: string; planetSize: number }) {
  const groupRef = useRef<THREE.Group>(null!)
  const meshRef = useRef<THREE.Mesh>(null!)
  const look = moonAppearance[name]
  const el = moonElements[name]
  const kmToScene = planetSize / PLANET_EQUATORIAL_RADIUS_KM[planetName]
  const radii = look.triaxialRadiiKm ?? [el.meanRadiusKm, el.meanRadiusKm, el.meanRadiusKm]

  const geometry = useMemo(() => buildMoonGeometry(name), [name])
  useEffect(() => () => geometry.dispose(), [geometry])

  // Orbit line, refreshed as the simulated date drifts (precession, or the Moon/Galileans'
  // perturbed paths) rather than every frame.
  const [pathDateMs, setPathDateMs] = useState(() => simulationState.dateMs)
  // A plain 1px THREE.Line, not drei's <Line> (Line2): mounting/unmounting several of those
  // on every planet switch reliably lost the WebGL context.
  const orbitLine = useMemo(() => {
    const pts = moonOrbitPathKm(name, pathDateMs).flatMap(p => p.map(v => v * kmToScene))
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    const m = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, depthWrite: false })
    return new THREE.Line(g, m)
  }, [name, pathDateMs, kmToScene])
  useEffect(() => () => {
    orbitLine.geometry.dispose();
    (orbitLine.material as THREE.Material).dispose()
  }, [orbitLine])
  const refreshMs = Math.min(el.periodDays * 0.25, 30) * 86400000

  useFrame(() => {
    const dateMs = simulationState.dateMs
    if (Math.abs(dateMs - pathDateMs) > refreshMs) setPathDateMs(dateMs)

    const p = moonPositionKm(name, dateMs)
    if (!p) return
    groupRef.current.position.set(p[0] * kmToScene, p[1] * kmToScene, p[2] * kmToScene)

    if (look.tidallyLocked) {
      // Long axis (+X) at the planet, +Z along the direction of travel, +Y the orbit pole.
      const ahead = moonPositionKm(name, dateMs + el.periodDays * 86400)
      if (!ahead) return
      _x.set(-p[0], -p[1], -p[2]).normalize()
      _z.set(ahead[0] - p[0], ahead[1] - p[1], ahead[2] - p[2])
      _z.addScaledVector(_x, -_z.dot(_x)).normalize()
      _y.crossVectors(_z, _x)
      meshRef.current.quaternion.setFromRotationMatrix(_m.makeBasis(_x, _y, _z))
    } else if (look.rotationPeriodHours) {
      meshRef.current.rotation.y = (dateMs / 3600000 / look.rotationPeriodHours) * 2 * Math.PI
    }
  })

  return (
    <>
      <primitive object={orbitLine} />
      <group ref={groupRef}>
        <mesh
          ref={meshRef}
          geometry={geometry}
          scale={[radii[0] * kmToScene, radii[2] * kmToScene, radii[1] * kmToScene]}
        >
          <meshStandardMaterial vertexColors roughness={1} metalness={0} />
        </mesh>
        <Html center zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
          <div className="moon-label">{name}</div>
        </Html>
      </group>
    </>
  )
}
