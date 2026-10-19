import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { buildLocalGroup, LocalGroupBody, SUN_SCENE_POSITION } from '../utils'

// Real Local Group at true relative scale: positions, distances, sizes, shapes and
// orientations from data/localGroup.ts (McConnachie catalog) + data/localGroupHosts.ts,
// turned into star clouds by utils.tsx's buildLocalGroup().

// Galaxies this bright (and the hosts) keep a permanent label; everything else names
// itself on hover.
const LABEL_MAG_LIMIT = -15;

// Points are sized in world units. Once a point would shrink below MIN_POINT_PX on screen
// it's held at that size and dimmed by the lost area instead, so distant galaxies fade
// the way their real surface brightness would rather than popping out of existence.
const MIN_POINT_PX = 1.5;

const vertexShader = /* glsl */ `
  attribute float size;
  attribute vec3 color;
  uniform float uPixelsPerUnit;
  uniform float uMinPx;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float px = size * uPixelsPerUnit / max(-mv.z, 1e-4);
    float shrink = clamp(px / uMinPx, 0.0, 1.0);
    vAlpha = max(shrink * shrink, 0.035);
    vColor = color;
    gl_PointSize = max(px, uMinPx);
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float a = exp(-dot(d, d) * 14.0) * vAlpha;
    // AdditiveBlending is SRC_ALPHA * src + dst, and the color already carries the falloff,
    // so alpha stays 1 (otherwise faint points get attenuated twice).
    gl_FragColor = vec4(vColor * a, 1.0);
  }
`

function formatDistance(kpc: number): string {
  const mly = kpc * 3261.56 / 1e6;
  return mly >= 1 ? `${mly.toFixed(2)} million ly` : `${Math.round(mly * 1000).toLocaleString()} thousand ly`;
}

function GalaxyTooltip({ body }: { body: LocalGroupBody }) {
  return (
    <div className="lg-tooltip">
      <div className="lg-tooltip-name">{body.name}{body.candidate ? ' (candidate)' : ''}</div>
      <div>{body.kind}</div>
      {body.distanceKpc > 0 && <div>{formatDistance(body.distanceKpc)} from the Sun</div>}
      {body.absMagV !== null && <div>Absolute magnitude {body.absMagV.toFixed(1)}</div>}
    </div>
  )
}

export default function GalaxyField() {
  const data = useMemo(() => buildLocalGroup(), [])
  const [hovered, setHovered] = useState<LocalGroupBody | null>(null)
  const { size } = useThree()

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(data.colors, 3))
    g.setAttribute('size', new THREE.BufferAttribute(data.sizes, 1))
    return g
  }, [data])

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uPixelsPerUnit: { value: 1 }, uMinPx: { value: MIN_POINT_PX } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  }), [])

  useFrame(({ camera }) => {
    const fov = (camera as THREE.PerspectiveCamera).fov * Math.PI / 180
    material.uniforms.uPixelsPerUnit.value = size.height / (2 * Math.tan(fov / 2))
  })

  return (
    <>
      <points geometry={geometry} material={material} frustumCulled={false} />

      {data.bodies.map(body => (
        <mesh
          key={body.name}
          position={body.center}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(body) }}
          onPointerOut={() => setHovered(h => (h === body ? null : h))}
        >
          {/* Invisible hit target, padded so tiny/distant dwarfs are still hoverable */}
          <sphereGeometry args={[Math.max(body.extent, 0.8), 12, 12]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      ))}

      {data.bodies
        .filter(b => b.absMagV !== null && b.absMagV <= LABEL_MAG_LIMIT && !b.candidate && b !== hovered)
        .map(b => (
          <Html key={b.name} position={b.center} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
            <div className={`lg-label${b.kind === 'spiral' ? ' lg-label--major' : ''}`}>{b.name}</div>
          </Html>
        ))}

      <Html position={SUN_SCENE_POSITION} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className="lg-sun-marker">Sun</div>
      </Html>

      {hovered && (
        <Html position={hovered.center} zIndexRange={[30, 20]} style={{ pointerEvents: 'none' }}>
          <GalaxyTooltip body={hovered} />
        </Html>
      )}
    </>
  )
}
