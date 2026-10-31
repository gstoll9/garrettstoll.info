import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useLoader } from '@react-three/fiber'

// Surface/atmosphere effects for the focused planet's close-up, all lit by the real Sun
// direction (`sunDir`: world-space unit vector from the planet toward the Sun, updated by
// Planet.tsx every frame):
//   AtmosphereGlow   a rim of scattered light around planets with an atmosphere, brighter on
//                    the day side. Colours approximate each planet's limb/sky colour
//                    (illustrative); thickness is exaggerated so it reads at this scale.
//   EarthLayers      NASA Blue Marble cloud cover and Black Marble 2016 city lights (both
//                    public domain, public/solarsystemImages/), the lights showing only on the
//                    night side. Both follow the cutaway, like the crust, and share its
//                    longitude offset (`uvOffset`, see Planet.tsx) so the day/night line falls
//                    where it really is for the simulation date. The cloud map is a single
//                    2002 composite, not today's weather.

export const ATMOSPHERE_GLOW: Record<string, { color: string; thickness: number }> = {
  Venus: { color: '#f2d7a0', thickness: 0.05 },
  Earth: { color: '#5fa0ff', thickness: 0.035 },
  Mars: { color: '#e0a27a', thickness: 0.025 },
  Jupiter: { color: '#e8d2a8', thickness: 0.025 },
  Saturn: { color: '#f0e0b0', thickness: 0.025 },
  Uranus: { color: '#9fe6f0', thickness: 0.03 },
  Neptune: { color: '#6e92ff', thickness: 0.03 },
}

// The canvas uses a logarithmic depth buffer (UniverseCanvas.tsx), so every custom shader here
// includes three's logdepthbuf chunks — without them their depth doesn't match the built-in
// materials' and the cloud/city-light shells fail the depth test against the crust.
const glowVertex = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
    #include <logdepthbuf_vertex>
  }
`
const glowFragment = /* glsl */ `
  #include <logdepthbuf_pars_fragment>
  uniform vec3 uColor;
  uniform vec3 uSunDir;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    #include <logdepthbuf_fragment>
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    // back faces of a slightly larger sphere: brightest just outside the planet's limb
    float rim = pow(clamp(1.0 + dot(vWorldNormal, viewDir), 0.0, 1.0), 3.0);
    float day = smoothstep(-0.35, 0.5, dot(vWorldNormal, uSunDir));
    float a = rim * (0.12 + 0.88 * day);
    gl_FragColor = vec4(uColor * a * 1.6, a);
  }
`

export function AtmosphereGlow({ radius, planet, sunDir }: { radius: number; planet: string; sunDir: { value: THREE.Vector3 } }) {
  const spec = ATMOSPHERE_GLOW[planet]
  const material = useMemo(() => spec && new THREE.ShaderMaterial({
    vertexShader: glowVertex, fragmentShader: glowFragment,
    uniforms: { uColor: { value: new THREE.Color(spec.color) }, uSunDir: sunDir },
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }), [spec, sunDir])
  useEffect(() => () => material?.dispose(), [material])
  if (!spec || !material) return null
  return (
    <mesh material={material} scale={radius * (1 + spec.thickness)}>
      <sphereGeometry args={[1, 64, 32]} />
    </mesh>
  )
}

// The two partial spheres the cutaway crust is made of (Planet.tsx), with the same UV
// remapping so equirectangular maps line up with the crust texture
export function cutawaySphereGeometries(radius: number): THREE.SphereGeometry[] {
  const upper = new THREE.SphereGeometry(radius, 64, 32, 0, Math.PI * 1.5, 0, Math.PI / 2)
  const lower = new THREE.SphereGeometry(radius, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)
  const uu = upper.attributes.uv
  for (let i = 0; i < uu.count; i++) uu.setXY(i, uu.getX(i) * 0.75, uu.getY(i) * 0.5 + 0.5)
  const lu = lower.attributes.uv
  for (let i = 0; i < lu.count; i++) lu.setY(i, lu.getY(i) * 0.5)
  return [upper, lower]
}

const surfaceVertex = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  uniform float uOffset;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    vUv = vec2(uv.x + uOffset, uv.y);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`
const nightFragment = /* glsl */ `
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D uMap;
  uniform vec3 uSunDir;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    #include <logdepthbuf_fragment>
    float night = smoothstep(0.1, -0.2, dot(vWorldNormal, uSunDir));
    vec3 lights = texture2D(uMap, vUv).rgb; // linear light: a bright city is only ~0.1–0.2
    float l = max(lights.r, max(lights.g, lights.b));
    lights *= smoothstep(0.02, 0.15, l) * 4.5; // drop the faint land relief, keep the cities
    gl_FragColor = vec4(lights * night * vec3(1.0, 0.85, 0.6), 1.0);
  }
`
const cloudFragment = /* glsl */ `
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D uMap;
  uniform vec3 uSunDir;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    #include <logdepthbuf_fragment>
    float cover = texture2D(uMap, vUv).r;
    float sun = dot(vWorldNormal, uSunDir);
    float light = clamp(sun * 1.1 + 0.15, 0.03, 1.0);
    // unlit clouds are nearly invisible from space, and mustn't hide the city lights below
    float alpha = cover * mix(0.15, 0.9, smoothstep(-0.25, 0.2, sun));
    gl_FragColor = vec4(vec3(light), alpha);
  }
`

export function EarthLayers({ radius, sunDir, uvOffset, showClouds }: { radius: number; sunDir: { value: THREE.Vector3 }; uvOffset: { value: number }; showClouds: boolean }) {
  const [clouds, night] = useLoader(THREE.TextureLoader, ['/solarsystemImages/EarthClouds.jpg', '/solarsystemImages/EarthNightLights.jpg'])
  night.colorSpace = THREE.SRGBColorSpace
  night.wrapS = clouds.wrapS = THREE.RepeatWrapping
  const nightGeoms = useMemo(() => cutawaySphereGeometries(radius * 1.0008), [radius])
  const cloudGeoms = useMemo(() => cutawaySphereGeometries(radius * 1.006), [radius])
  const { nightMat, cloudMat } = useMemo(() => ({
    nightMat: new THREE.ShaderMaterial({
      vertexShader: surfaceVertex, fragmentShader: nightFragment, uniforms: { uMap: { value: night }, uSunDir: sunDir, uOffset: uvOffset },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    }),
    cloudMat: new THREE.ShaderMaterial({
      vertexShader: surfaceVertex, fragmentShader: cloudFragment, uniforms: { uMap: { value: clouds }, uSunDir: sunDir, uOffset: uvOffset },
      transparent: true, depthWrite: false, side: THREE.FrontSide,
    }),
  }), [night, clouds, sunDir, uvOffset])
  useEffect(() => () => {
    nightGeoms.forEach((g) => g.dispose()); cloudGeoms.forEach((g) => g.dispose())
    nightMat.dispose(); cloudMat.dispose()
  }, [nightGeoms, cloudGeoms, nightMat, cloudMat])
  return (
    <>
      {nightGeoms.map((g, i) => <mesh key={`n${i}`} geometry={g} material={nightMat} />)}
      {showClouds && cloudGeoms.map((g, i) => <mesh key={`c${i}`} geometry={g} material={cloudMat} renderOrder={1} />)}
    </>
  )
}
