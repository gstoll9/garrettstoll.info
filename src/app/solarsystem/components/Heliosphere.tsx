import { useEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject, type ReactNode } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { heliosphereCrossings } from '../data/spacecraft'
import { eclipticToScene } from './Spacecraft'

// The heliosphere's two boundaries, anchored to where Voyager 1 and 2 actually crossed them
// (data/spacecraft.ts): the termination shock (solar wind drops to subsonic; V1 94 AU,
// V2 84 AU) and the heliopause (solar wind meets interstellar plasma; V1 122 AU, V2 119 AU).
//
// Real: the four crossing points each surface passes through exactly, and the nose
// direction — straight into the interstellar wind, which IBEX measured flowing in from
// ecliptic J2000 longitude 255.7°, latitude 5.04° at 26.6 km/s (Swaczyna et al. 2023,
// arXiv:2307.06694, abstract saved in ../literature/). That's the Sun's motion relative to
// the local interstellar gas; it's ~80° from the Sun's direction around the Galaxy because
// that gas is itself orbiting the Galaxy almost as fast as the Sun.
//
// Modelled (illustrative): the overall comet-like shape — a blunt nose and a stretched
// tail ("heliotail", Wikipedia: trailing thousands of AU, drawn here only to a few hundred
// and faded out) — plus one linear north–south asymmetry term. The asymmetry is what lets
// the surfaces pass through both Voyagers' crossings: Voyager 2 met the termination shock
// 10 AU closer than Voyager 1 although it left farther from the nose, because "the
// southern hemisphere of the Solar System's heliosphere is being pushed in" by the
// interstellar magnetic field (Wikipedia, "Voyager 2").

type Vec3 = [number, number, number]
const norm = (v: Vec3): Vec3 => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l] }
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

const CROSSINGS = {
  terminationShock: heliosphereCrossings.filter((c) => c.kind === 'terminationShock'),
  heliopause: heliosphereCrossings.filter((c) => c.kind === 'heliopause'),
}
const crossingsOf = (kind: keyof typeof CROSSINGS) => CROSSINGS[kind]
const INFLOW_LON = 255.7 * Math.PI / 180
const INFLOW_LAT = 5.04 * Math.PI / 180
const NOSE: Vec3 = [Math.cos(INFLOW_LAT) * Math.cos(INFLOW_LON), Math.cos(INFLOW_LAT) * Math.sin(INFLOW_LON), Math.sin(INFLOW_LAT)]

// Asymmetry axis: the part of the Voyager 1 → Voyager 2 difference perpendicular to the nose
// (roughly ecliptic north–south, since V1 left northward and V2 southward)
const ASYMMETRY_AXIS: Vec3 = (() => {
  const [v1, v2] = crossingsOf('heliopause').map((c) => norm(c.position))
  const d: Vec3 = [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]]
  const along = dot(d, NOSE)
  return norm([d[0] - along * NOSE[0], d[1] - along * NOSE[1], d[2] - along * NOSE[2]])
})()

// Radius profiles as a function of angle θ from the nose
const PROFILES = {
  // paraboloid-like: r = R0 * sqrt(2 / (1 + cos θ)), capped into a tail
  heliopause: (theta: number) => Math.min(Math.sqrt(2 / (1 + Math.cos(theta))), 3.2),
  // nearly spherical, somewhat farther downwind
  terminationShock: (theta: number) => 1 + 0.25 * (1 - Math.cos(theta)),
}

// r(dir) = R0 · profile(θ) · (1 + a · dir·axis), with R0 and a solved so the surface passes
// through both of that boundary's measured crossings exactly
const FITS = Object.fromEntries((Object.keys(PROFILES) as (keyof typeof PROFILES)[]).map((kind) => {
  const [c1, c2] = crossingsOf(kind).map((c) => {
    const d = norm(c.position)
    return { k: c.distanceAU / PROFILES[kind](Math.acos(dot(d, NOSE))), s: dot(d, ASYMMETRY_AXIS) }
  })
  // c1.k (1 + a s2) = c2.k (1 + a s1)
  const a = (c2.k - c1.k) / (c1.k * c2.s - c2.k * c1.s)
  return [kind, { R0: c1.k / (1 + a * c1.s), a }]
})) as Record<keyof typeof PROFILES, { R0: number; a: number }>

// Boundary distance (AU) in an ecliptic unit direction
function boundaryRadius(kind: keyof typeof PROFILES, d: Vec3) {
  const { R0, a } = FITS[kind]
  return R0 * PROFILES[kind](Math.acos(Math.max(-1, Math.min(1, dot(d, NOSE))))) * (1 + a * dot(d, ASYMMETRY_AXIS))
}

const vertex = /* glsl */ `
  varying float vRim;
  varying float vTail;
  attribute float tail;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vRim = 1.0 - abs(dot(n, normalize(-mv.xyz)));
    vTail = tail;
    gl_Position = projectionMatrix * mv;
  }
`
const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vRim;
  varying float vTail;
  void main() {
    float a = (0.08 + pow(vRim, 3.0)) * (1.0 - smoothstep(0.55, 1.0, vTail)) * uOpacity;
    gl_FragColor = vec4(uColor * a, a);
  }
`

// Orthonormal basis with z along the nose; x lies in the ecliptic plane, so the two flank
// callouts (±x) land on opposite sides of the view rather than stacked at the nose
const BASIS = (() => {
  const z = NOSE
  const helper: Vec3 = Math.abs(z[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]
  const x = norm([helper[1] * z[2] - helper[2] * z[1], helper[2] * z[0] - helper[0] * z[2], helper[0] * z[1] - helper[1] * z[0]])
  const y: Vec3 = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]]
  return { x, y, z }
})()

function buildSurface(kind: keyof typeof PROFILES, simplified: boolean): THREE.BufferGeometry {
  const { x, y, z } = BASIS
  const thetaMax = kind === 'heliopause' ? 2.6 : Math.PI
  const geom = new THREE.SphereGeometry(1, 64, 48, 0, Math.PI * 2, 0, thetaMax)
  const pos = geom.attributes.position
  const tail = new Float32Array(pos.count)
  for (let i = 0; i < pos.count; i++) {
    // SphereGeometry's +Y is the pole; treat it as the nose axis
    const ux = pos.getX(i), uy = pos.getY(i), uz = pos.getZ(i)
    const theta = Math.acos(Math.max(-1, Math.min(1, uy)))
    const dir: Vec3 = [x[0] * ux + z[0] * uy + y[0] * uz, x[1] * ux + z[1] * uy + y[1] * uz, x[2] * ux + z[2] * uy + y[2] * uz]
    const r = boundaryRadius(kind, dir)
    pos.setXYZ(i, ...eclipticToScene([dir[0] * r, dir[1] * r, dir[2] * r], simplified))
    tail[i] = theta / Math.PI
  }
  geom.setAttribute('tail', new THREE.BufferAttribute(tail, 1))
  geom.computeVertexNormals()
  return geom
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const shortDate = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
const shortProbe = (name: string) => name.replace('Voyager ', 'V')

// side: which edge of the bubble (as seen on screen) the name tag sits on
const BOUNDARIES = {
  terminationShock: { title: 'Termination shock', blurb: 'Solar wind slows below the speed of sound', side: 1 },
  heliopause: { title: 'Heliopause', blurb: 'Edge of the heliosphere: interstellar space begins', side: -1 },
} as const

// The boundary's surface point in a given scene direction from the Sun
function surfacePoint(kind: keyof typeof PROFILES, sceneDir: THREE.Vector3, simplified: boolean, out: THREE.Vector3) {
  const d: Vec3 = norm([sceneDir.x, -sceneDir.z, sceneDir.y]) // scene -> ecliptic (inverse of eclipticToScene's axes)
  const r = boundaryRadius(kind, d)
  return out.set(...eclipticToScene([d[0] * r, d[1] * r, d[2] * r], simplified))
}

const _forward = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _sideDir = new THREE.Vector3()
const _toCam = new THREE.Vector3()
const _probe = new THREE.Vector3()
const _projected = new THREE.Vector3()
const SILHOUETTE_STEPS = 36
const _surface = new THREE.Vector3()
const _toPoint = new THREE.Vector3()
const inFrontOf = (camera: THREE.Camera, p: THREE.Vector3) =>
  _toPoint.copy(p).sub(camera.position).dot(camera.getWorldDirection(_forward)) > 0

// A crossing marker, shown only while its boundary's card is open and in view
function CrossingMarker({ position, shown, children }: { position: Vec3; shown: MutableRefObject<boolean>; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const point = useMemo(() => new THREE.Vector3(...position), [position])
  useFrame(({ camera }) => {
    if (ref.current) ref.current.style.visibility = shown.current && inFrontOf(camera, point) ? 'visible' : 'hidden'
  })
  return (
    <Html position={position} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={ref} style={{ visibility: 'hidden' }}>{children}</div>
    </Html>
  )
}

function Boundary({ kind, color, simplified, showLabel }: { kind: keyof typeof PROFILES; color: string; simplified: boolean; showLabel: boolean }) {
  const geometry = useMemo(() => buildSurface(kind, simplified), [kind, simplified])
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0.5 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  }), [color])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])

  const { title, blurb, side } = BOUNDARIES[kind]
  const crossings = crossingsOf(kind)
  const crossingPositions = useMemo(() => crossings.map((c) => eclipticToScene(c.position, simplified)), [crossings, simplified])
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<THREE.Group>(null)
  const tagRef = useRef<HTMLDivElement>(null)
  const markersShown = useRef(false)

  // Keep the tag on the bubble's visible edge (its silhouette to one side of the view). It's
  // only shown while the camera is outside the boundary — from inside, the bubble isn't
  // visible as a shape, so a label on it would float in space.
  useFrame(({ camera }) => {
    if (!anchorRef.current || !tagRef.current) return
    const d = camera.position.length()
    const outside = d > surfacePoint(kind, _dir.copy(camera.position), simplified, _surface).length() * 1.02
    // The silhouette (the surface isn't a sphere, so search for it): sweep directions in the
    // plane through the Sun spanned by the camera direction and the screen's side axis, and
    // keep the one that projects farthest toward that side of the screen.
    _sideDir.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(side)
    _toCam.copy(camera.position).divideScalar(d)
    let best = -Infinity
    for (let i = 0; i <= SILHOUETTE_STEPS; i++) {
      const a = (i / SILHOUETTE_STEPS) * Math.PI
      _dir.copy(_toCam).multiplyScalar(Math.cos(a)).addScaledVector(_sideDir, Math.sin(a))
      surfacePoint(kind, _dir, simplified, _probe)
      const x = _projected.copy(_probe).project(camera).x * side
      if (x > best) { best = x; _surface.copy(_probe) }
    }
    anchorRef.current.position.copy(_surface)
    const shown = outside && inFrontOf(camera, _surface)
    tagRef.current.style.visibility = shown ? 'visible' : 'hidden'
    markersShown.current = shown && open
  })

  return (
    <>
      <mesh geometry={geometry} material={material} renderOrder={-1} />
      {/* drei <Html> ignores a hidden parent group, so labels are only mounted while shown */}
      {showLabel && (
        <>
          <group ref={anchorRef}>
            <Html zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
              <div ref={tagRef} className={`helio-tag helio-tag--${side > 0 ? 'right' : 'left'}`} style={{ '--helio-color': color, visibility: 'hidden' } as CSSProperties}>
                <button type="button" className={`helio-tag-button${open ? ' open' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                  {title}
                </button>
                {open && (
                  <div className="helio-card">
                    <div className="helio-card-blurb">{blurb}</div>
                    {crossings.map((c) => (
                      <div key={c.probe} className="helio-card-row">
                        {c.probe} crossed at {Math.round(c.distanceAU)} AU · {shortDate(c.date)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Html>
          </group>
          {/* the measured crossing points the surface is fitted through */}
          {crossings.map((c, i) => (
            <CrossingMarker key={c.probe} position={crossingPositions[i]} shown={markersShown}>
              <div className={`helio-crossing helio-crossing--${kind}`} style={{ '--helio-color': color } as CSSProperties}>
                <span className="helio-crossing-dot" />
                <span className="helio-crossing-text">{shortProbe(c.probe)} {c.date.slice(0, 4)}</span>
              </div>
            </CrossingMarker>
          ))}
        </>
      )}
    </>
  )
}

export default function Heliosphere({ useSimplifiedDistance, visible }: { useSimplifiedDistance: boolean; visible: boolean }) {
  return (
    <>
      <Boundary kind="terminationShock" color="#ffb35a" simplified={useSimplifiedDistance} showLabel={visible} />
      <Boundary kind="heliopause" color="#5aa9ff" simplified={useSimplifiedDistance} showLabel={visible} />
    </>
  )
}
