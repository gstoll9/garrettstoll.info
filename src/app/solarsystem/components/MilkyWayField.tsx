import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { milkyWayArms } from '../data/milkyWay'
import {
  ARM_DISPLAY_NAMES, MILKY_WAY_SUN_SCENE, armPoint, buildMilkyWay, milkyWayMarkers, milkyWayToScene,
  type MilkyWayMarker,
} from '../utils'
import { createStarParticleMaterial, updateStarParticleMaterial } from './starParticles'
import SunGalacticOrbit from './SunGalacticOrbit'

// The Milky Way model between the Local Group and the Solar System: measured spiral arms,
// bar and disk (utils.tsx "Milky Way model") plus ~600 catalogued objects and the satellite
// galaxies at their real positions. Hover a marker for its name and distance.

export type MarkerKind = MilkyWayMarker['kind']

export const MARKER_STYLES: Record<MarkerKind, { color: string; label: string; px: number }> = {
  'globular cluster': { color: '#ffd27a', label: 'Globular clusters', px: 4 },
  'open cluster': { color: '#9fd0ff', label: 'Open clusters', px: 4 },
  'star-forming region': { color: '#ff8fc8', label: 'Star-forming regions', px: 5 },
  nebula: { color: '#ff9fd8', label: 'Nebulae', px: 5 },
  'planetary nebula': { color: '#8affb0', label: 'Planetary nebulae', px: 5 },
  'supernova remnant': { color: '#ff7a7a', label: 'Supernova remnants', px: 4 },
  'neutron star': { color: '#7affe0', label: 'Neutron stars', px: 4 },
  'black hole': { color: '#c18cff', label: 'Black holes', px: 5 },
  'nearby star': { color: '#ffffff', label: 'Nearest stars', px: 3 },
  'satellite galaxy': { color: '#ffe9b0', label: 'Satellite galaxies', px: 6 },
}

export const MARKERS = milkyWayMarkers()

// Camera target eases from the Sun (zoomed in, arriving from the Solar System) to the
// Galactic Centre (zoomed out) so a continuous scroll goes Sun → whole galaxy
const SUN = new THREE.Vector3(...MILKY_WAY_SUN_SCENE)
const CENTRE = new THREE.Vector3(0, 0, 0)
const NEAR_DISTANCE = 4 // scene units (0.4 kpc): target at the Sun below this
const FAR_DISTANCE = 160 // (16 kpc): target at the Galactic Centre beyond this

const markerVertex = /* glsl */ `
  attribute vec3 color;
  attribute float px;
  varying vec3 vColor;
  void main() {
    vColor = color;
    gl_PointSize = px;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const markerFragment = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    if (r > 0.5) discard;
    float ring = smoothstep(0.5, 0.38, r);
    gl_FragColor = vec4(vColor, ring * 0.95);
  }
`

const formatLy = (kpc: number) => {
  const ly = kpc * 3261.56
  return ly >= 10000 ? `${Math.round(ly / 1000).toLocaleString()} thousand ly` : `${Math.round(ly).toLocaleString()} ly`
}

type Props = {
  orbitControlsRef: RefObject<OrbitControlsImpl | null>
  hiddenKinds: Set<MarkerKind>
}

export default function MilkyWayField({ orbitControlsRef, hiddenKinds }: Props) {
  const { size, pointer, camera, gl } = useThree()
  // hover only while the pointer is actually over the canvas (pointer starts at the centre)
  const pointerInside = useRef(false)
  useEffect(() => {
    const el = gl.domElement
    const enter = () => { pointerInside.current = true }
    const leave = () => { pointerInside.current = false }
    el.addEventListener('pointermove', enter)
    el.addEventListener('pointerleave', leave)
    return () => { el.removeEventListener('pointermove', enter); el.removeEventListener('pointerleave', leave) }
  }, [gl])
  const stars = useMemo(() => {
    const data = buildMilkyWay()
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(data.colors, 3))
    g.setAttribute('size', new THREE.BufferAttribute(data.sizes, 1))
    return g
  }, [])
  const starMaterial = useMemo(() => createStarParticleMaterial(3.5), [])

  const shown = useMemo(() => MARKERS.filter((m) => !hiddenKinds.has(m.kind)), [hiddenKinds])
  const markerPoints = useMemo(() => {
    const pos = new Float32Array(shown.length * 3), col = new Float32Array(shown.length * 3), px = new Float32Array(shown.length)
    shown.forEach((m, i) => {
      pos.set(m.scene, i * 3)
      const c = new THREE.Color(MARKER_STYLES[m.kind].color)
      col.set([c.r, c.g, c.b], i * 3)
      px[i] = MARKER_STYLES[m.kind].px * Math.min(window.devicePixelRatio || 1, 2)
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.setAttribute('px', new THREE.BufferAttribute(px, 1))
    const m = new THREE.ShaderMaterial({ vertexShader: markerVertex, fragmentShader: markerFragment, transparent: true, depthWrite: false, depthTest: false })
    const points = new THREE.Points(g, m)
    points.frustumCulled = false
    points.renderOrder = 5
    return points
  }, [shown])
  useEffect(() => () => { stars.dispose(); starMaterial.dispose() }, [stars, starMaterial])
  useEffect(() => () => { markerPoints.geometry.dispose(); (markerPoints.material as THREE.Material).dispose() }, [markerPoints])

  // arm name labels: the measured stretches all bunch up around the Sun, so each label sits
  // just past the far end of its arm's measured stretch instead, where the arms fan apart
  const armLabels = useMemo(() => milkyWayArms.map((arm) => ({
    name: ARM_DISPLAY_NAMES[arm.name] ?? arm.name,
    at: milkyWayToScene(armPoint(arm, arm.betaMax + 25)),
  })), [])
  const satelliteLabels = useMemo(() => MARKERS.filter((m) => m.kind === 'satellite galaxy' && /Magellanic|Sagittarius/.test(m.name)), [])

  const [hovered, setHovered] = useState<MilkyWayMarker | null>(null)
  const overviewRef = useRef<HTMLDivElement[]>([])
  const projected = useMemo(() => new THREE.Vector3(), [])
  const cameraDir = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    updateStarParticleMaterial(starMaterial, camera, size.height)
    const controls = orbitControlsRef.current
    if (controls) {
      // ease the orbit pivot between the Sun and the Galactic Centre with zoom
      const d = camera.position.distanceTo(controls.target)
      const t = THREE.MathUtils.smoothstep(Math.log(d), Math.log(NEAR_DISTANCE), Math.log(FAR_DISTANCE))
      const desired = SUN.clone().lerp(CENTRE, t)
      const delta = desired.sub(controls.target)
      if (delta.lengthSq() > 1e-10) {
        controls.target.add(delta)
        camera.position.add(delta)
        controls.update()
      }
      // overview labels (arms, centre) only once the galaxy is in view
      const showOverview = d > 25
      for (const el of overviewRef.current) if (el) el.style.visibility = showOverview ? 'visible' : 'hidden'
    }

    // hover: nearest shown marker within 9 px of the pointer
    camera.getWorldDirection(cameraDir)
    let best: MilkyWayMarker | null = null
    let bestPx = 9
    for (const m of pointerInside.current ? shown : []) {
      projected.set(...m.scene)
      if (projected.clone().sub(camera.position).dot(cameraDir) <= 0) continue
      projected.project(camera)
      const dx = (projected.x - pointer.x) * size.width / 2
      const dy = (projected.y - pointer.y) * size.height / 2
      const px = Math.hypot(dx, dy)
      if (px < bestPx) { bestPx = px; best = m }
    }
    if (best !== hovered) setHovered(best)
  })

  return (
    <>
      <points geometry={stars} material={starMaterial} frustumCulled={false} />
      <primitive object={markerPoints} />
      <SunGalacticOrbit />

      {armLabels.map((a, i) => (
        <Html key={a.name} position={a.at} center zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
          <div ref={(el) => { if (el) overviewRef.current[i] = el }} className="mw-arm-label">{a.name}</div>
        </Html>
      ))}
      <Html position={[0, 0, 0]} center zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
        <div ref={(el) => { if (el) overviewRef.current[armLabels.length] = el }} className="mw-centre-label">Galactic Centre · Sgr A*</div>
      </Html>
      {satelliteLabels.map((m) => (
        <Html key={m.name} position={m.scene} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
          <div className="lg-label">{m.name}</div>
        </Html>
      ))}
      <Html position={MILKY_WAY_SUN_SCENE} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className="lg-sun-marker">Sun</div>
      </Html>

      {hovered && (
        <Html position={hovered.scene} zIndexRange={[30, 20]} style={{ pointerEvents: 'none' }}>
          <div className="lg-tooltip">
            <div className="lg-tooltip-name">{hovered.name}</div>
            <div>{hovered.kind}</div>
            <div>{hovered.distanceKpc > 0 ? `${formatLy(hovered.distanceKpc)} from the Sun` : ''}</div>
          </div>
        </Html>
      )}
    </>
  )
}
