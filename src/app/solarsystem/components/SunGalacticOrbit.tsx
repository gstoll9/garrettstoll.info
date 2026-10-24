import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { MILKY_WAY_SUN_SCENE, milkyWayToScene, sunGalacticOrbit } from '../utils'

// The Sun's path around the Milky Way over the last ~one galactic year (utils.tsx
// "Galactic motion"), drawn in the Milky Way view at true scale: an orbit
// ~8 kpc in radius that wanders ~0.7 kpc in and out and bobs ±99 pc through the disk.
// Brightest at the present, fading into the past.

const SPAN_MYR = 250
const STEP_MYR = 0.5
// The label is hidden while zoomed in close to the Sun, where it would float off-screen
const LABEL_MIN_DISTANCE = 30 // scene units (= 3 kpc)
const SUN = new THREE.Vector3(...MILKY_WAY_SUN_SCENE)

export default function SunGalacticOrbit() {
  const { line, labelAt } = useMemo(() => {
    const pts = sunGalacticOrbit(-SPAN_MYR, STEP_MYR).map(milkyWayToScene)
    const pos = new Float32Array(pts.flat())
    const col = new Float32Array(pts.length * 3)
    const warm = new THREE.Color('#ffd27a')
    pts.forEach((_, i) => {
      const a = 0.08 + 0.92 * Math.pow(1 - i / (pts.length - 1), 1.2)
      col.set([warm.r * a, warm.g * a, warm.b * a], i * 3)
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    }))
    l.renderOrder = 10
    // label a quarter of an orbit back, clear of the "Sun" marker
    return { line: l, labelAt: pts[Math.round(pts.length * 0.22)] }
  }, [])
  useEffect(() => () => { line.geometry.dispose(); (line.material as THREE.Material).dispose() }, [line])
  const labelRef = useRef<HTMLDivElement>(null)
  useFrame(({ camera }) => {
    if (labelRef.current) labelRef.current.style.visibility = camera.position.distanceTo(SUN) > LABEL_MIN_DISTANCE ? 'visible' : 'hidden'
  })

  return (
    <>
      <primitive object={line} />
      <Html position={labelAt} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div ref={labelRef} className="galactic-label" style={{ visibility: 'hidden' }}>Sun&apos;s orbit · last {SPAN_MYR} million years</div>
      </Html>
    </>
  )
}
