import * as THREE from 'three'

// Shared by the Local Group and Milky Way star clouds: additive points sized in world
// units. Once a point would shrink below MIN_POINT_PX on screen
// it's held at that size and dimmed by the lost area instead, so distant galaxies fade
// the way their real surface brightness would rather than popping out of existence.
const MIN_POINT_PX = 1.5;

const vertexShader = /* glsl */ `
  attribute float size;
  attribute vec3 color;
  uniform float uPixelsPerUnit;
  uniform float uMinPx;
  uniform float uMaxPx;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float px = size * uPixelsPerUnit / max(-mv.z, 1e-4);
    float shrink = clamp(px / uMinPx, 0.0, 1.0);
    vAlpha = max(shrink * shrink, 0.035);
    vColor = color;
    gl_PointSize = clamp(px, uMinPx, uMaxPx);
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

// maxPx caps how large a point can grow when the camera is close: each Milky Way particle
// stands in for a whole patch of stars, so zoomed in on the Sun it should stay a point
// rather than swell into a blob
export function createStarParticleMaterial(maxPx = 4096): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uPixelsPerUnit: { value: 1 }, uMinPx: { value: MIN_POINT_PX }, uMaxPx: { value: maxPx } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  })
}

export function updateStarParticleMaterial(material: THREE.ShaderMaterial, camera: THREE.Camera, viewportHeight: number) {
  const fov = (camera as THREE.PerspectiveCamera).fov * Math.PI / 180
  material.uniforms.uPixelsPerUnit.value = viewportHeight / (2 * Math.tan(fov / 2))
}
