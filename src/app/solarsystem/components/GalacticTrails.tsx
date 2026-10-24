import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import {
  GALACTIC_TRAVEL_DIRECTION_SCENE, SUN_GALACTIC_SPEED_KMS, SUN_GALACTIC_VELOCITY_SCENE_PER_YEAR,
  orbitalPosition, simulationState, type OrbitProps,
} from '../utils'

// Each body's real path through the Galaxy over the last `spanYears`: its heliocentric
// position at every past instant (astronomy-engine / its orbital elements, as everywhere
// else) plus how far the whole Solar System has moved around the Milky Way since then
// (utils.tsx "Galactic motion"). Planets trace stretched helices around the Sun's
// straight-line path; nothing here is exaggerated, so the helices are very long and thin.
//
// Each path is drawn as a tracer: a screen-space ribbon whose width depends on the kind of
// body (the Sun widest, small bodies thinnest) and which tapers and fades toward its tail.
// Tracers are built in a frame frozen at a reference date and slid backwards every frame
// (-v × elapsed), so a rebuild is only needed once the sim date drifts past a margin.

const YEAR_MS = 365.25 * 86400000
const AU = 12
const MAX_SAMPLES = 120000
const SAMPLES_PER_ORBIT = 64

export type TrailKind = 'star' | 'planet' | 'dwarf' | 'small'
export type TrailBody = { name: string; orbitData?: OrbitProps; color: string; kind: TrailKind }

// tracer width at the head, in screen pixels
const TRACER_WIDTH_PX: Record<TrailKind, number> = { star: 5, planet: 2.6, dwarf: 1.6, small: 1 }

const vertex = /* glsl */ `
  attribute vec3 aPrev;
  attribute vec3 aNext;
  attribute float aSide;
  attribute float aTime;
  uniform float uWidth;
  uniform vec2 uResolution;
  uniform float uNow;
  uniform float uSpan;
  varying float vTime;
  void main() {
    mat4 mvp = projectionMatrix * modelViewMatrix;
    vec4 clip = mvp * vec4(position, 1.0);
    vec4 prevClip = mvp * vec4(aPrev, 1.0);
    vec4 nextClip = mvp * vec4(aNext, 1.0);
    float aspect = uResolution.x / uResolution.y;
    // screen-space direction of the path through this vertex (guarding points behind the camera)
    vec2 p = clip.xy / max(clip.w, 1e-6);
    vec2 a = prevClip.xy / max(prevClip.w, 1e-6);
    vec2 b = nextClip.xy / max(nextClip.w, 1e-6);
    vec2 dir = (b - a) * vec2(aspect, 1.0);
    dir = length(dir) > 1e-9 ? normalize(dir) : vec2(1.0, 0.0);
    vec2 normal = vec2(-dir.y, dir.x);
    normal.x /= aspect;
    // taper toward the tail
    float fresh = clamp(1.0 - (uNow - aTime) / uSpan, 0.0, 1.0);
    float width = uWidth * mix(0.3, 1.0, fresh);
    clip.xy += normal * aSide * width / uResolution.y * clip.w;
    vTime = aTime;
    gl_Position = clip;
  }
`
const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uNow;
  uniform float uSpan;
  varying float vTime;
  void main() {
    float age = uNow - vTime;
    if (age < 0.0 || age > uSpan) discard;
    float a = 0.05 + 0.85 * pow(1.0 - age / uSpan, 0.9);
    gl_FragColor = vec4(uColor * a, a);
  }
`

function heliocentric(body: TrailBody, dateMs: number): [number, number, number] {
  return body.orbitData ? orbitalPosition('RealLive', 0, body.orbitData, false, body.name, dateMs) : [0, 0, 0]
}

// A polyline as a ribbon: every point becomes two vertices (one per side) that the vertex
// shader pushes apart perpendicular to the path on screen
function ribbonGeometry(pts: Float32Array, times: Float32Array): THREE.BufferGeometry {
  const n = times.length
  const position = new Float32Array(n * 6), prev = new Float32Array(n * 6), next = new Float32Array(n * 6)
  const side = new Float32Array(n * 2), time = new Float32Array(n * 2)
  for (let i = 0; i < n; i++) {
    const ip = Math.max(i - 1, 0) * 3, ic = i * 3, inx = Math.min(i + 1, n - 1) * 3
    for (let s = 0; s < 2; s++) {
      const o = (i * 2 + s) * 3
      for (let k = 0; k < 3; k++) {
        position[o + k] = pts[ic + k]
        prev[o + k] = pts[ip + k]
        next[o + k] = pts[inx + k]
      }
      side[i * 2 + s] = s === 0 ? -1 : 1
      time[i * 2 + s] = times[i]
    }
  }
  const index = new Uint32Array(Math.max(n - 1, 0) * 6)
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2
    index.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(position, 3))
  g.setAttribute('aPrev', new THREE.BufferAttribute(prev, 3))
  g.setAttribute('aNext', new THREE.BufferAttribute(next, 3))
  g.setAttribute('aSide', new THREE.BufferAttribute(side, 1))
  g.setAttribute('aTime', new THREE.BufferAttribute(time, 1))
  g.setIndex(new THREE.BufferAttribute(index, 1))
  return g
}

function Tracer({ body, spanYears }: { body: TrailBody; spanYears: number }) {
  const { size } = useThree()
  const mesh = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex, fragmentShader: fragment,
      uniforms: {
        uColor: { value: new THREE.Color(body.color) }, uNow: { value: 0 }, uSpan: { value: spanYears },
        uWidth: { value: TRACER_WIDTH_PX[body.kind] }, uResolution: { value: new THREE.Vector2(1, 1) },
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    })
    const m = new THREE.Mesh(new THREE.BufferGeometry(), material)
    m.frustumCulled = false
    return m
  }, [body.color, body.kind, spanYears])
  useEffect(() => () => { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose() }, [mesh])

  const built = useRef({ t0: Infinity, t1: -Infinity, tRef: 0 })

  useFrame(() => {
    const now = simulationState.dateMs
    const spanMs = spanYears * YEAR_MS
    const b = built.current
    if (now - spanMs < b.t0 || now > b.t1) {
      // rebuild over [now - span - margin, now + margin]
      const margin = spanMs * 0.1
      const t0 = now - spanMs - margin, t1 = now + margin
      const periodYears = body.orbitData ? Math.pow(body.orbitData.semimajorAxis / AU, 1.5) : Infinity
      const dt = Math.max(Math.min(periodYears * YEAR_MS / SAMPLES_PER_ORBIT, (t1 - t0) / 2), (t1 - t0) / MAX_SAMPLES)
      const n = Math.ceil((t1 - t0) / dt) + 1
      const pos = new Float32Array(n * 3)
      const time = new Float32Array(n)
      const v = SUN_GALACTIC_VELOCITY_SCENE_PER_YEAR
      for (let i = 0; i < n; i++) {
        const t = Math.min(t0 + i * dt, t1)
        const yrs = (t - now) / YEAR_MS
        const p = heliocentric(body, t)
        pos[i * 3] = p[0] + v[0] * yrs
        pos[i * 3 + 1] = p[1] + v[1] * yrs
        pos[i * 3 + 2] = p[2] + v[2] * yrs
        time[i] = yrs
      }
      mesh.geometry.dispose()
      mesh.geometry = ribbonGeometry(pos, time)
      Object.assign(b, { t0, t1, tRef: now })
    }
    // slide the frozen tracer back by however far the Solar System has moved since tRef
    const elapsed = (now - b.tRef) / YEAR_MS
    const v = SUN_GALACTIC_VELOCITY_SCENE_PER_YEAR
    mesh.position.set(-v[0] * elapsed, -v[1] * elapsed, -v[2] * elapsed)
    const u = (mesh.material as THREE.ShaderMaterial).uniforms
    u.uNow.value = elapsed
    u.uResolution.value.set(size.width, size.height)
  })

  return <primitive object={mesh} />
}

const formatAU = (au: number) => au >= 1000 ? `${Math.round(au).toLocaleString()} AU` : `${au.toFixed(au < 10 ? 1 : 0)} AU`

export default function GalacticTrails({ bodies, spanYears, showLabels }: { bodies: TrailBody[]; spanYears: number; showLabels: boolean }) {
  const travelAU = Math.hypot(...SUN_GALACTIC_VELOCITY_SCENE_PER_YEAR) / AU * spanYears
  const tail = SUN_GALACTIC_VELOCITY_SCENE_PER_YEAR.map((c) => -c * spanYears) as [number, number, number]
  const arrowLength = Math.max(30, travelAU * AU * 0.025)
  const arrow = useMemo(() => new THREE.ArrowHelper(
    new THREE.Vector3(...GALACTIC_TRAVEL_DIRECTION_SCENE), new THREE.Vector3(0, 0, 0),
    arrowLength, 0xffd27a, arrowLength * 0.18, arrowLength * 0.08,
  ), [arrowLength])
  useEffect(() => () => arrow.dispose(), [arrow])
  const ahead = GALACTIC_TRAVEL_DIRECTION_SCENE.map((c) => c * arrowLength) as [number, number, number]

  return (
    <>
      {bodies.map((b) => <Tracer key={b.name} body={b} spanYears={spanYears} />)}
      <primitive object={arrow} />
      {/* drei <Html> ignores a hidden parent group, so labels are only mounted while shown */}
      {showLabels && (
        <>
          <Html position={ahead} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <div className="galactic-label galactic-label--ahead">
              Orbit around the Milky Way · {Math.round(SUN_GALACTIC_SPEED_KMS)} km/s
            </div>
          </Html>
          <Html position={tail} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <div className="galactic-label">
              Sun {spanYears.toLocaleString()} {spanYears === 1 ? 'year' : 'years'} ago · {formatAU(travelAU)} back
            </div>
          </Html>
        </>
      )}
    </>
  )
}
