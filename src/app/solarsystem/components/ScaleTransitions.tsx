import { useEffect, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { scaleTransition } from '../utils'

// Scroll-zooming past the edge of one model moves to the next one out (or in):
//   planet ⇄ Solar System ⇄ Milky Way ⇄ Local Group
// Distances are camera-to-pivot, in each model's scene units. The thresholds overlap the
// next model's arrival framing (CameraController) with some slack, so arriving never
// immediately bounces back.

// Solar System: 12 units/AU — leaving at ~2,500 AU (or past the longest galactic tracer)
export const SOLAR_EXIT_DISTANCE = 30000
// Milky Way: 10 units/kpc — in below 0.12 kpc, out beyond 70 kpc
export const MILKY_WAY_ENTER_SOLAR = 1.2
export const MILKY_WAY_EXIT_DISTANCE = 700
// Local Group: 0.1 units/kpc — in below 50 kpc
export const LOCAL_GROUP_ENTER_MILKY_WAY = 5

const SETTLE_MS = 800 // ignore the camera while a newly entered model frames itself

type Props = {
  focus: string
  setFocus: (focus: string) => void
  orbitControlsRef: RefObject<OrbitControlsImpl | null>
  solarExitDistance: number
}

// a planet view hands back to the Solar System once zoomed out this many framing distances
const PLANET_EXIT_FACTOR = 15

export default function ScaleTransitions({ focus, setFocus, orbitControlsRef, solarExitDistance }: Props) {
  const enteredAt = useRef(0)
  useEffect(() => { enteredAt.current = performance.now() }, [focus])

  useFrame(({ camera }) => {
    const controls = orbitControlsRef.current
    if (!controls || performance.now() - enteredAt.current < SETTLE_MS) return
    const d = camera.position.distanceTo(controls.target)
    const go = (next: string, entry: 'fromInner' | 'fromOuter') => {
      scaleTransition.entry = entry
      enteredAt.current = performance.now()
      setFocus(next)
    }
    if (focus === 'solarsystem' || focus === 'Sun') {
      if (d > solarExitDistance) go('milkyway', 'fromInner')
    } else if (focus === 'milkyway') {
      if (d < MILKY_WAY_ENTER_SOLAR) go('solarsystem', 'fromOuter')
      else if (d > MILKY_WAY_EXIT_DISTANCE) go('cosmic', 'fromInner')
    } else if (focus === 'cosmic') {
      if (d < LOCAL_GROUP_ENTER_MILKY_WAY) go('milkyway', 'fromOuter')
    } else if (scaleTransition.planetFrameDistance !== null && d > scaleTransition.planetFrameDistance * PLANET_EXIT_FACTOR) {
      go('solarsystem', 'fromInner')
    }
  })

  return null
}
