import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { comets, Comet } from '../data/comets'
import { cometOrbitPath, cometPosition, simulationState } from '../utils'
import Label from './Label'

// Notable comets (data/comets.ts, JPL SBDB) at their real positions for the simulation date.
// Position and orbit are real; the coma/tail *sizes* are illustrative — real tails reach
// tens of millions of km but are diffuse, so here they scale with Sun distance r (activity
// switches on inside ~4 AU, where water ice starts sublimating, and grows ~1/r^2) and with
// nucleus size. Directions are physical: the ion tail points straight away from the Sun;
// the dust tail curves back along the orbit, so it's drawn between anti-sunward and
// anti-velocity.

const AU = 12 // scene units per AU, matching data/planets.tsx
const ACTIVE_WITHIN_AU = 4
const ORBIT_COLOR = '#6fd3c7'

const tailVertex = /* glsl */ `
  varying float vT;
  void main() {
    vT = -position.y; // 0 at the nucleus, 1 at the tail's end
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const tailFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vT;
  void main() {
    float a = pow(1.0 - clamp(vT, 0.0, 1.0), 1.6) * uOpacity;
    gl_FragColor = vec4(uColor * a, a);
  }
`

// Unit cone with its tip at the origin, opening along -Y (scaled to length/width per frame)
function makeTailGeometry() {
  const g = new THREE.ConeGeometry(1, 1, 24, 1, true)
  g.rotateX(Math.PI) // tip up -> tip down
  g.translate(0, -0.5, 0) // tip at origin, body in y ∈ [-1, 0]
  return g
}

function makeTailMaterial(color: string, opacity: number) {
  return new THREE.ShaderMaterial({
    vertexShader: tailVertex,
    fragmentShader: tailFragment,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })
}

const _down = new THREE.Vector3(0, -1, 0)
const _dir = new THREE.Vector3()
const _vel = new THREE.Vector3()

function CometBody({ comet, showOrbit }: { comet: Comet; showOrbit: boolean }) {
  const groupRef = useRef<THREE.Group>(null!)
  const ionRef = useRef<THREE.Mesh>(null!)
  const dustRef = useRef<THREE.Mesh>(null!)
  const comaRef = useRef<THREE.Mesh>(null!)

  // Bigger nuclei are more active (Hale-Bopp's ~60 km vs Hartley 2's ~1.6 km); unknown → typical
  const activity = THREE.MathUtils.clamp(Math.sqrt((comet.diameterKm ?? 5) / 5), 0.5, 3)

  const tailGeometry = useMemo(makeTailGeometry, [])
  const ionMaterial = useMemo(() => makeTailMaterial('#7fb8ff', 0.55), [])
  const dustMaterial = useMemo(() => makeTailMaterial('#ffe2a8', 0.45), [])
  const orbitLine = useMemo(() => {
    const pts = cometOrbitPath(comet, 40).flat()
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    const m = new THREE.LineBasicMaterial({ color: ORBIT_COLOR, transparent: true, opacity: 0.18, depthWrite: false })
    return new THREE.Line(g, m)
  }, [comet])
  useEffect(() => () => {
    tailGeometry.dispose(); ionMaterial.dispose(); dustMaterial.dispose()
    orbitLine.geometry.dispose(); (orbitLine.material as THREE.Material).dispose()
  }, [tailGeometry, ionMaterial, dustMaterial, orbitLine])

  useFrame(() => {
    const dateMs = simulationState.dateMs
    const p = cometPosition(comet, dateMs)
    groupRef.current.position.set(...p)

    const rAU = Math.hypot(...p) / AU
    const active = rAU < ACTIVE_WITHIN_AU
    // ~1/r^2 growth, eased to zero at the activity threshold
    const strength = active ? activity * Math.min(1 / (rAU * rAU), 25) * (1 - rAU / ACTIVE_WITHIN_AU) : 0
    ionRef.current.visible = dustRef.current.visible = comaRef.current.visible = strength > 0.01
    if (!active) return

    // Ion tail: straight anti-sunward
    _dir.set(...p).normalize()
    const ionLen = Math.min(2.5 * strength, 14) // scene units (12 = 1 AU)
    ionRef.current.quaternion.setFromUnitVectors(_down, _dir)
    ionRef.current.scale.set(ionLen * 0.06, ionLen, ionLen * 0.06)

    // Dust tail: between anti-sunward and trailing the motion
    const ahead = cometPosition(comet, dateMs + 86400000)
    _vel.set(ahead[0] - p[0], ahead[1] - p[1], ahead[2] - p[2]).normalize()
    _dir.addScaledVector(_vel, -0.45).normalize()
    const dustLen = ionLen * 0.7
    dustRef.current.quaternion.setFromUnitVectors(_down, _dir)
    dustRef.current.scale.set(dustLen * 0.16, dustLen, dustLen * 0.16)

    comaRef.current.scale.setScalar(0.05 + 0.08 * Math.sqrt(strength))
  })

  return (
    <>
      {showOrbit && <primitive object={orbitLine} />}
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[0.06, 10, 10]} />
          <meshStandardMaterial color="#9a9184" />
        </mesh>
        <mesh ref={comaRef}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color="#cfe6ff" transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh ref={ionRef} geometry={tailGeometry} material={ionMaterial} />
        <mesh ref={dustRef} geometry={tailGeometry} material={dustMaterial} />
        <Label text={comet.name} position={[0, 0.6, 0]} fontSize={0.5} />
      </group>
    </>
  )
}

export default function Comets({ hiddenBodies, showOrbits }: { hiddenBodies: Set<string>; showOrbits: boolean }) {
  return (
    <>
      {comets.map((c) => (
        <group key={c.name} visible={!hiddenBodies.has(c.name)}>
          <CometBody comet={c} showOrbit={showOrbits} />
        </group>
      ))}
    </>
  )
}
