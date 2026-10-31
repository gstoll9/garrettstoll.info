import { useEffect, useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { milkyWaySystems, type StarComponent } from '../data/milkyWay'
import {
  binarySeparationAU, blackbodyColor, gaussian, mulberry32, spectralTemperature, starRadiusSun,
  type MilkyWayMarker,
} from '../utils'
import { createStarParticleMaterial, updateStarParticleMaterial } from './starParticles'

// A close-up 3D model of one Milky Way object, built from its catalogue data (data/milkyWay.ts)
// and placed at its real position. Each builder works in its own natural unit (R☉, AU, pc)
// and reports its extent in that unit; the model is then scaled into the scene:
//   real size     clusters, nebulae, remnants, satellite galaxies (pc → scene at 10 units/kpc)
//   enlarged      stars, black holes, neutron stars — physically far too small to see at this
//                 scale, so the whole model is blown up to DISPLAY_RADIUS; proportions inside
//                 it stay real (except where a minimum visible size is noted)
// Everything a model shows that isn't in the data (colours of nebular gas, particle
// placement, separations of the nearest-star pairs) is labelled "illustrative" in `notes`.

const PC = 0.01 // scene units per parsec
const DISPLAY_RADIUS = 0.002 // scene units an enlarged model is scaled to (0.2 pc)
const AU_PER_RSUN = 1 / 215.03
const RS_KM_PER_MSUN = 2.953 // Schwarzschild radius
const KM_PER_AU = 1.496e8

export type ModelPlan = {
  element: ReactElement
  radius: number // scene units, for camera framing
  enlarged: number | null // magnification over true size, when enlarged
  notes: string[]
}

// ── shared bits ─────────────────────────────────────────────────────────────

let glowTexture: THREE.Texture | null = null
function getGlowTexture() {
  if (glowTexture) return glowTexture
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.2, 'rgba(255,255,255,0.55)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.12)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  glowTexture = new THREE.CanvasTexture(c)
  return glowTexture
}

const toColor = (rgb: [number, number, number]) => new THREE.Color(rgb[0], rgb[1], rgb[2])
const starColor = (spectralClass?: string) => toColor(blackbodyColor(spectralTemperature(spectralClass) ?? 5800))
const hashSeed = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)

function Star({ radius, color, glow = 3.5 }: { radius: number; color: THREE.Color; glow?: number }) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, 32, 24]} />
        <meshBasicMaterial color={color.clone().multiplyScalar(1.15)} />
      </mesh>
      <sprite scale={[radius * glow * 2, radius * glow * 2, 1]}>
        <spriteMaterial map={getGlowTexture()} color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  )
}

// A cloud of points in model units; sizes are given in model units and converted to scene
// units by `scale` so the shared star-particle shader (world-sized points) can draw them
function Particles({ positions, colors, sizes, scale }: { positions: number[]; colors: number[]; sizes: number[]; scale: number }) {
  const { size, camera } = useThree()
  const { geometry, material } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    g.setAttribute('size', new THREE.Float32BufferAttribute(sizes.map((s) => s * scale), 1))
    return { geometry: g, material: createStarParticleMaterial(14) }
  }, [positions, colors, sizes, scale])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  useFrame(() => updateStarParticleMaterial(material, camera, size.height))
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

type Cloud = { positions: number[]; colors: number[]; sizes: number[] }
const newCloud = (): Cloud => ({ positions: [], colors: [], sizes: [] })
function push(c: Cloud, p: [number, number, number], color: THREE.Color | [number, number, number], size: number, bright = 1) {
  const rgb = color instanceof THREE.Color ? [color.r, color.g, color.b] : color
  c.positions.push(...p)
  c.colors.push(rgb[0] * bright, rgb[1] * bright, rgb[2] * bright)
  c.sizes.push(size)
}
const randomDirection = (rand: () => number): [number, number, number] => {
  const z = 2 * rand() - 1, phi = 2 * Math.PI * rand(), r = Math.sqrt(1 - z * z)
  return [r * Math.cos(phi), r * Math.sin(phi), z]
}

// ── stars (the nearest-star systems) ────────────────────────────────────────

const MIN_STAR_FRACTION = 0.05 // smallest drawn star, as a fraction of the system's largest

function StarSystem({ members, highlight, spin }: { members: (StarComponent & { r: number; drawnR: number })[]; highlight: number; spin: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (group.current && spin) group.current.rotation.y += dt * 0.25 })
  const orbit = members.length > 1 ? members.reduce((s, m) => s + m.drawnR, 0) * 1.6 : 0
  return (
    <group ref={group}>
      {members.map((m, i) => {
        const angle = (i / members.length) * Math.PI * 2
        const pos: [number, number, number] = [Math.cos(angle) * orbit, 0, Math.sin(angle) * orbit]
        return (
          <group key={i} position={pos}>
            <Star radius={m.drawnR} color={starColor(m.spectralClass)} />
            {i === highlight && members.length > 1 && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[m.drawnR * 1.6, m.drawnR * 1.75, 64]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.6} side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}

function planStars(marker: MilkyWayMarker): ModelPlan {
  const system = marker.info?.system !== undefined ? milkyWaySystems[marker.info.system] : undefined
  const raw = system?.members.length ? system.members : [{ name: marker.name, spectralClass: marker.info?.spectralClass, massSun: marker.info?.massSun }]
  const members = raw.map((m) => ({ ...m, r: starRadiusSun(m.spectralClass, m.massSun) }))
  const maxR = Math.max(...members.map((m) => m.r), 1e-3)
  const sized = members.map((m) => ({ ...m, drawnR: Math.max(m.r, maxR * MIN_STAR_FRACTION) }))
  const highlight = Math.max(0, sized.findIndex((m) => m.name === marker.name))
  const extent = sized.length > 1 ? sized.reduce((s, m) => s + m.drawnR, 0) * 1.6 + maxR * 2 : maxR * 2.5
  const notes = ['Radius and colour estimated from each star\'s spectral class and mass']
  if (sized.length > 1) notes.push(`${sized.length} stars in the system; their separations aren't in the source list, so the spacing is illustrative`)
  for (const m of sized) if (m.drawnR > m.r * 1.01) notes.push(`${m.name ?? 'A companion'} (${m.r.toFixed(3)} R☉) is drawn at a minimum visible size`)
  const scale = DISPLAY_RADIUS / extent
  return {
    element: <group scale={scale}><StarSystem members={sized} highlight={highlight} spin={sized.length > 1} /></group>,
    radius: DISPLAY_RADIUS,
    enlarged: scale / (PC / 44_400_000), // scene units per R☉ (1 pc = 44.4 million R☉)
    notes,
  }
}

// ── black holes ─────────────────────────────────────────────────────────────

const diskVertex = /* glsl */ `
  varying vec2 vPolar;
  void main() {
    vPolar = vec2(length(position.xy), atan(position.y, position.x));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const diskFragment = /* glsl */ `
  uniform float uInner;
  uniform float uOuter;
  uniform float uTime;
  varying vec2 vPolar;
  // standard thin-disk temperature profile T ∝ r^-3/4, mapped hot white-blue → cool red
  vec3 heat(float t) {
    return mix(vec3(1.0, 0.25, 0.05), mix(vec3(1.0, 0.75, 0.35), vec3(0.85, 0.9, 1.0), smoothstep(0.55, 1.0, t)), smoothstep(0.1, 0.55, t));
  }
  void main() {
    float r = vPolar.x;
    float t = pow(uInner / r, 0.75);
    float swirl = 0.88 + 0.12 * sin(vPolar.y * 3.0 - uTime * 2.0 / sqrt(r / uInner) + log(r) * 14.0); // faint turbulent streaks
    float doppler = 1.0 + 0.55 * sin(vPolar.y); // the side moving toward the viewer is brighter
    float edge = smoothstep(uInner, uInner * 1.15, r) * (1.0 - smoothstep(uOuter * 0.7, uOuter, r));
    float a = clamp(t * 1.4, 0.0, 1.0) * swirl * doppler * edge;
    gl_FragColor = vec4(heat(t) * a, a);
  }
`

function AccretionDisk({ inner, outer }: { inner: number; outer: number }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: diskVertex, fragmentShader: diskFragment,
    uniforms: { uInner: { value: inner }, uOuter: { value: outer }, uTime: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  }), [inner, outer])
  useEffect(() => () => material.dispose(), [material])
  useFrame((_, dt) => { material.uniforms.uTime.value += dt })
  return (
    <mesh material={material} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[inner, outer, 160, 12]} />
    </mesh>
  )
}

function Horizon({ radius, ringColor = '#ffb46b' }: { radius: number; ringColor?: string }) {
  return (
    <group>
      <mesh renderOrder={2}>
        <sphereGeometry args={[radius, 32, 24]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* photon ring: light bent around the hole, seen as a thin bright ring at ~2.6 rs */}
      <sprite scale={[radius * 6, radius * 6, 1]}>
        <spriteMaterial map={getGlowTexture()} color={ringColor} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  )
}

// Eggleton (1983) Roche-lobe radius as a fraction of the separation, for mass ratio q = M1/M2
const rocheLobe = (q: number) => 0.49 * Math.pow(q, 2 / 3) / (0.6 * Math.pow(q, 2 / 3) + Math.log(1 + Math.cbrt(q)))

function BlackHoleBinary({ a, bhMass, compMass, compR, compClass, horizonR, disk, stream }: {
  a: number; bhMass: number; compMass: number; compR: number; compClass?: string; horizonR: number
  disk: { inner: number; outer: number } | null; stream: boolean
}) {
  const group = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (group.current) group.current.rotation.y += dt * 0.2 })
  const total = bhMass + compMass
  const bhX = -a * compMass / total, compX = a * bhMass / total // both orbit the barycentre
  const streamLine = useMemo(() => {
    if (!stream) return null
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 40; i++) {
      const t = i / 40
      // from the companion's inner (L1) side, curving into the disk's outer edge
      const x = THREE.MathUtils.lerp(compX - compR, bhX + (disk?.outer ?? a * 0.3) * 0.8, t)
      const z = Math.sin(t * Math.PI) * a * 0.12
      pts.push(new THREE.Vector3(x, 0, z))
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts)
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#ffb070', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }))
  }, [stream, compX, compR, bhX, disk, a])
  useEffect(() => () => { streamLine?.geometry.dispose(); (streamLine?.material as THREE.Material | undefined)?.dispose() }, [streamLine])
  const orbits = useMemo(() => [Math.abs(bhX), compX].map((r) => {
    const g = new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, r, r).getPoints(128).map((p) => new THREE.Vector3(p.x, 0, p.y)))
    return new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: '#8fa6c8', transparent: true, opacity: 0.35 }))
  }), [bhX, compX])
  useEffect(() => () => orbits.forEach((o) => { o.geometry.dispose(); (o.material as THREE.Material).dispose() }), [orbits])
  return (
    <group ref={group}>
      {/* both bodies circle the barycentre (orbits drawn circular; eccentricity not shown) */}
      {orbits.map((o, i) => <primitive key={i} object={o} />)}
      <group position={[bhX, 0, 0]}>
        <Horizon radius={horizonR} />
        {disk && <AccretionDisk inner={disk.inner} outer={disk.outer} />}
      </group>
      <group position={[compX, 0, 0]}>
        <Star radius={compR} color={starColor(compClass)} glow={2.5} />
      </group>
      {streamLine && <primitive object={streamLine} />}
    </group>
  )
}

function planBlackHole(marker: MilkyWayMarker): ModelPlan {
  const info = marker.info ?? {}
  const parts = info.components ?? []
  const bh = parts.find((c) => c.spectralClass?.toUpperCase().startsWith('BH')) ?? { massSun: 10 }
  const companion = parts.find((c) => c !== bh && !c.spectralClass?.toUpperCase().startsWith('BH'))
  const bhMass = bh.massSun ?? 10
  const notes: string[] = []
  const isSgrA = /Sagittarius A/.test(marker.name)

  if (companion && info.orbitalPeriodDays) {
    // a binary at its real separation (Kepler's third law from the listed masses and period)
    const compMass = companion.massSun ?? 1
    const a = binarySeparationAU(bhMass + compMass, info.orbitalPeriodDays)
    const compRTrue = starRadiusSun(companion.spectralClass, compMass) * AU_PER_RSUN
    const compR = Math.max(compRTrue, a * 0.06)
    const lobeBH = rocheLobe(bhMass / compMass) * a
    const lobeComp = rocheLobe(compMass / bhMass) * a
    const horizonTrue = RS_KM_PER_MSUN * bhMass / KM_PER_AU
    const horizonR = Math.max(horizonTrue, a * 0.025)
    const disk = info.accreting ? { inner: horizonR * 1.6, outer: lobeBH * 0.7 } : null
    const stream = !!info.accreting && compRTrue > lobeComp * 0.6
    notes.push(`Separation ${a < 0.1 ? a.toFixed(3) : a.toFixed(2)} AU from Kepler's law (listed masses, ${info.orbitalPeriodDays} d period); companion radius estimated from its spectral class`)
    if (disk) notes.push('Accretion disk sized to ~70% of the black hole\'s Roche lobe (Eggleton 1983); its temperature profile T ∝ r^-3/4 sets the colour; the swirl is illustrative')
    else notes.push('Dormant: the companion is too far away to feed an accretion disk')
    if (stream) notes.push('The companion fills its Roche lobe, so gas streams from it onto the disk')
    notes.push(`Event horizon (${(horizonTrue * KM_PER_AU).toFixed(0)} km across ${bhMass} M☉ → rs = ${(RS_KM_PER_MSUN * bhMass).toFixed(0)} km) drawn at a minimum visible size`)
    if (compR > compRTrue * 1.01) notes.push('Companion drawn at a minimum visible size')
    const extent = a * 1.3
    const scale = DISPLAY_RADIUS / extent
    return {
      element: (
        <group scale={scale} rotation={[0.35, 0, 0]}>
          <BlackHoleBinary a={a} bhMass={bhMass} compMass={compMass} compR={compR} compClass={companion.spectralClass}
            horizonR={horizonR} disk={disk} stream={stream} />
        </group>
      ),
      radius: DISPLAY_RADIUS,
      enlarged: scale / (PC / 206265),
      notes,
    }
  }

  // single black hole: Sgr A*'s hot accretion flow, or an isolated (microlensing) one
  const rs = 1
  if (isSgrA) notes.push('Sagittarius A* accretes only a faint, hot flow; the glowing ring at ~2.6 rs is the shadow outline the Event Horizon Telescope imaged in 2022')
  else notes.push(info.accreting ? 'Accretion disk drawn from the inner edge (3 rs) outward; proportions illustrative' : 'Isolated black hole found by gravitational microlensing: nothing to light it, only the photon ring of bent background light')
  const extent = info.accreting || isSgrA ? rs * 14 : rs * 4
  const scale = DISPLAY_RADIUS / extent
  return {
    element: (
      <group scale={scale} rotation={[0.3, 0, 0.1]}>
        <Horizon radius={rs} ringColor={isSgrA ? '#ff9a3c' : '#c9d6ff'} />
        {(info.accreting || isSgrA) && <AccretionDisk inner={rs * 3} outer={rs * 14} />}
      </group>
    ),
    radius: DISPLAY_RADIUS,
    enlarged: scale / (PC / (3.086e13 / (RS_KM_PER_MSUN * bhMass))),
    notes,
  }
}

// ── neutron stars ───────────────────────────────────────────────────────────

const beamFragment = /* glsl */ `
  varying float vAlong;
  uniform vec3 uColor;
  void main() { float a = pow(vAlong, 1.5) * 1.1; gl_FragColor = vec4(uColor * a, a); } // bright at the star (cone apex), fading outward
`
const beamVertex = /* glsl */ `
  varying float vAlong;
  void main() { vAlong = clamp(position.y / 6.0 + 0.5, 0.0, 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

function NeutronStar({ magnetar, spinPeriod }: { magnetar: boolean; spinPeriod?: number }) {
  const spin = useRef<THREE.Group>(null)
  // real spin rates (up to hundreds per second) are slowed to stay visible
  const visibleRate = (2 * Math.PI) / Math.min(Math.max(spinPeriod ?? 1, 0.6), 4)
  useFrame((_, dt) => { if (spin.current) spin.current.rotation.y += dt * visibleRate })
  const beamMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: beamVertex, fragmentShader: beamFragment,
    uniforms: { uColor: { value: new THREE.Color(magnetar ? '#c58bff' : '#8fd6ff') } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  }), [magnetar])
  useEffect(() => () => beamMaterial.dispose(), [beamMaterial])
  return (
    <group ref={spin}>
      <Star radius={1} color={toColor(blackbodyColor(40000))} glow={magnetar ? 5 : 3} />
      {/* radio beams along the magnetic axis, tilted from the spin axis */}
      <group rotation={[0, 0, 0.5]}>
        {[1, -1].map((dir) => (
          <mesh key={dir} position={[0, dir * 4, 0]} rotation={[dir > 0 ? Math.PI : 0, 0, 0]} material={beamMaterial}>
            <coneGeometry args={[1.8, 6, 32, 1, true]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function planNeutronStar(marker: MilkyWayMarker): ModelPlan {
  const info = marker.info ?? {}
  const magnetar = /magnetar|sgr|axp/i.test(`${info.type ?? ''} ${marker.name}`)
  const radiusKm = info.radiusKm ?? 12
  const extent = 8
  const scale = DISPLAY_RADIUS / extent
  const notes = [
    `${radiusKm} km radius${info.radiusKm ? '' : ' (typical; not listed)'}, ~1 million K surface`,
    info.spinPeriodS ? `Spins every ${info.spinPeriodS} s — slowed down here to stay visible` : 'Beams sweep as the star spins (rate illustrative)',
  ]
  if (magnetar) notes.push('Magnetar: the strongest magnetic fields known')
  return {
    element: <group scale={scale}><NeutronStar magnetar={magnetar} spinPeriod={info.spinPeriodS} /></group>,
    radius: DISPLAY_RADIUS,
    enlarged: scale / (PC / (3.086e13 / radiusKm)),
    notes,
  }
}

// ── extended objects at real size ───────────────────────────────────────────

const OLD = new THREE.Color(1.0, 0.82, 0.58), YOUNG = new THREE.Color(0.65, 0.78, 1.0)
const H_ALPHA = new THREE.Color(1.0, 0.25, 0.38), O_III = new THREE.Color(0.25, 0.95, 0.85)

function realSize(radiusPc: number, cloud: Cloud, notes: string[]): ModelPlan {
  const scale = PC
  return { element: <group scale={scale}><Particles {...cloud} scale={scale} /></group>, radius: radiusPc * PC, enlarged: null, notes }
}

function planGlobular(marker: MilkyWayMarker): ModelPlan {
  const rand = mulberry32(hashSeed(marker.name))
  const listed = marker.info?.diameterPc
  const R = (listed ?? 30) / 2
  const a = R / 3 // Plummer scale radius: most light inside the listed diameter
  const c = newCloud()
  for (let i = 0; i < 6000; i++) {
    const m = Math.max(rand(), 1e-4)
    let r = a / Math.sqrt(Math.pow(m, -2 / 3) - 1)
    if (r > R * 1.6) r = R * 1.6 * rand()
    const d = randomDirection(rand)
    const blue = rand() < 0.03 // blue stragglers
    push(c, [d[0] * r, d[1] * r, d[2] * r], blue ? YOUNG : OLD.clone().offsetHSL((rand() - 0.5) * 0.04, 0, 0), R * 0.02, 0.55 + rand() * 0.5)
  }
  return realSize(R * 1.2, c, [listed ? `${listed.toFixed(1)} pc across (listed angular size × distance)` : 'Size not listed: drawn at a typical 30 pc',
    'Old, metal-poor stars in a Plummer profile; individual star positions illustrative'])
}

function planOpen(marker: MilkyWayMarker): ModelPlan {
  const rand = mulberry32(hashSeed(marker.name))
  const listed = marker.info?.diameterPc
  const R = (listed ?? 6) / 2
  const young = (marker.info?.ageMyr ?? 300) < 200
  const c = newCloud()
  for (let i = 0; i < 320; i++) {
    const d = randomDirection(rand)
    const r = Math.abs(gaussian(rand)) * R * 0.45
    const bright = rand() < 0.08
    push(c, [d[0] * r, d[1] * r, d[2] * r], young ? YOUNG.clone().lerp(new THREE.Color(1, 1, 1), rand() * 0.5) : new THREE.Color(1, 0.95, 0.85).lerp(OLD, rand() * 0.6),
      R * (bright ? 0.06 : 0.025), bright ? 1.2 : 0.7)
  }
  const notes = [listed ? `${listed.toFixed(1)} pc across (listed angular size × distance)` : 'Size not listed: drawn at a typical 6 pc']
  if (marker.info?.ageMyr) notes.push(`${marker.info.ageMyr} million years old — ${young ? 'still dominated by hot blue stars' : 'its hottest stars already gone'}`)
  notes.push('Individual star positions illustrative')
  return realSize(R * 1.3, c, notes)
}

function planNebula(marker: MilkyWayMarker, starForming: boolean): ModelPlan {
  const rand = mulberry32(hashSeed(marker.name))
  const listed = marker.info?.diameterPc
  const R = (listed ?? 10) / 2
  const c = newCloud()
  const blobs = Array.from({ length: 7 }, () => {
    const d = randomDirection(rand)
    const r = rand() * R * 0.5
    return { c: [d[0] * r, d[1] * r * 0.6, d[2] * r] as [number, number, number], s: R * (0.25 + rand() * 0.35) }
  })
  for (let i = 0; i < 9000; i++) {
    const b = blobs[Math.floor(rand() * blobs.length)]
    const p: [number, number, number] = [b.c[0] + gaussian(rand) * b.s, b.c[1] + gaussian(rand) * b.s * 0.7, b.c[2] + gaussian(rand) * b.s]
    const core = Math.hypot(...p) < R * 0.3
    const dust = starForming && rand() < 0.35
    const color = dust ? new THREE.Color(0.45, 0.22, 0.15) : core && rand() < 0.5 ? O_III : H_ALPHA
    push(c, p, color, R * 0.05, dust ? 0.25 : 0.32)
  }
  for (let i = 0; i < 40; i++) {
    const d = randomDirection(rand)
    const r = rand() * R * 0.4
    push(c, [d[0] * r, d[1] * r, d[2] * r], YOUNG, R * 0.04, 1.4)
  }
  return realSize(R * 1.2, c, [
    listed ? `${listed.toFixed(1)} pc across (listed angular size × distance)` : 'Size not listed: drawn at a typical 10 pc',
    'Glowing ionized hydrogen (red, Hα) and oxygen (teal, [O III]) around the hot young stars that light it; cloud shape illustrative',
    ...(starForming ? ['Dark dust lanes hide the newest stars'] : []),
  ])
}

function planPlanetary(marker: MilkyWayMarker): ModelPlan {
  const rand = mulberry32(hashSeed(marker.name))
  const listed = marker.info?.diameterPc
  const R = (listed ?? 0.6) / 2
  const c = newCloud()
  for (let i = 0; i < 7000; i++) {
    const d = randomDirection(rand)
    const shell = 0.75 + rand() * 0.25
    const outer = shell > 0.92
    push(c, [d[0] * R * shell, d[1] * R * shell * 0.75, d[2] * R * shell * 0.85], outer ? H_ALPHA : O_III, R * 0.04, 0.3)
  }
  push(c, [0, 0, 0], new THREE.Color(0.8, 0.88, 1), R * 0.12, 3)
  return realSize(R * 1.2, c, [
    listed ? `${listed.toFixed(2)} pc across (listed angular size × distance)` : 'Size not listed: drawn at a typical 0.6 pc',
    'A dying star\'s ejected shell lit by the hot white dwarf at its centre; [O III] (teal) inside, Hα (red) at the rim; shape illustrative',
  ])
}

function planRemnant(marker: MilkyWayMarker): ModelPlan {
  const rand = mulberry32(hashSeed(marker.name))
  const seen = marker.info?.firstSeen ?? ''
  const year = /^\s*(\d{3,4})\b/.exec(seen)
  // age × ~5,000 km/s (≈ 0.005 pc/yr), a typical mean expansion speed
  const age = year ? new Date().getFullYear() - parseInt(year[1]) : null
  const R = age ? Math.min(Math.max(age * 0.005, 0.5), 30) : 10
  const c = newCloud()
  for (let i = 0; i < 9000; i++) {
    const d = randomDirection(rand)
    const filament = Math.pow(Math.abs(Math.sin(d[0] * 9 + d[1] * 7) * Math.sin(d[2] * 11)), 0.3)
    const r = R * (0.88 + rand() * 0.12 * filament)
    const color = rand() < 0.5 ? H_ALPHA : rand() < 0.5 ? O_III : new THREE.Color(0.4, 0.55, 1)
    push(c, [d[0] * r, d[1] * r, d[2] * r], color, R * 0.03, 0.25 + filament * 0.25)
  }
  if (/pulsar|neutron/i.test(marker.info?.remnant ?? '')) push(c, [0, 0, 0], new THREE.Color(0.75, 0.9, 1), R * 0.06, 3)
  return realSize(R * 1.2, c, [
    age ? `Radius estimated from its age (${age} yr) at a typical 5,000 km/s expansion` : 'Size not listed: drawn at a typical 10 pc radius',
    'Shock-heated filaments of the exploded star\'s debris; colours and filament pattern illustrative',
    ...(marker.info?.supernovaType ? [`Supernova type ${marker.info.supernovaType}`] : []),
  ])
}

function planGalaxy(marker: MilkyWayMarker): ModelPlan {
  const rand = mulberry32(hashSeed(marker.name))
  const rhPc = (marker.galaxy?.halfLightKpc ?? 0.3) * 1000
  const q = 1 - (marker.galaxy?.ellipticity ?? 0)
  const c = newCloud()
  for (let i = 0; i < 6000; i++) {
    const m = Math.max(rand(), 1e-4)
    let r = rhPc / Math.sqrt(Math.pow(m, -2 / 3) - 1)
    if (r > rhPc * 5) r = rhPc * 5 * rand()
    const d = randomDirection(rand)
    push(c, [d[0] * r, d[1] * r * q, d[2] * r], rand() < 0.2 ? YOUNG : OLD, rhPc * 0.05, 0.45)
  }
  return realSize(rhPc * 4, c, [`Half-light radius ${(rhPc).toFixed(0)} pc (McConnachie catalogue); star placement illustrative`])
}

export function planModel(marker: MilkyWayMarker): ModelPlan {
  switch (marker.kind) {
    case 'nearby star': return planStars(marker)
    case 'black hole': return planBlackHole(marker)
    case 'neutron star': return planNeutronStar(marker)
    case 'globular cluster': return planGlobular(marker)
    case 'open cluster': return planOpen(marker)
    case 'nebula': return planNebula(marker, false)
    case 'star-forming region': return planNebula(marker, true)
    case 'planetary nebula': return planPlanetary(marker)
    case 'supernova remnant': return planRemnant(marker)
    case 'satellite galaxy': return planGalaxy(marker)
  }
}

export default function ObjectModel({ marker, plan }: { marker: MilkyWayMarker; plan: ModelPlan }) {
  return <group position={marker.scene}>{plan.element}</group>
}
