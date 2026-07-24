import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { simulationState } from '../utils'
import {
  AU_TO_SCENE_UNITS,
  HELIOPAUSE_AU,
  SOLAR_WIND_SLOW_KM_S,
  SOLAR_WIND_FAST_KM_S,
  SUN_SIDEREAL_ROTATION_DAYS,
} from '../data/heliosphere'

const PARTICLE_COUNT = 2200;
const KM_PER_AU = 1.495978707e8;
const UNITS_PER_KM = AU_TO_SCENE_UNITS / KM_PER_AU;
const ROTATION_OMEGA = (2 * Math.PI) / (SUN_SIDEREAL_ROTATION_DAYS * 86400); // rad/s

// Real solar wind speeds are ~400-750 km/s — a few AU per *day*, not per second. At the
// site's default "Live" time speed this is nearly motionless (matching how planets barely
// move at Live speed too); cranking up the Orbital Speed slider makes the flow visible,
// same control that speeds up planetary motion. What *is* visible immediately, even
// stationary, is the Parker spiral shape itself: each particle only ever moves radially
// outward at constant speed, but its fixed launch angle was set by the Sun's rotation at
// the moment it was "emitted" — stagger enough launch times and the spiral emerges purely
// from that, with no spiral formula hard-coded anywhere.
type ParticleSeed = {
  speedUnitsPerSec: number;
  maxAge: number; // real seconds to travel from the Sun to the heliopause at this speed
  phase: number; // random offset into [0, maxAge) so particles are staggered along their path
  launchLongitude: number; // this particle's fixed angular offset from the rotating "source"
  latitude: number; // fixed polar angle offset, biased toward the equatorial plane
  isFast: boolean;
};

export default function SolarWind() {
  const pointsRef = useRef<THREE.Points>(null!)

  const heliopauseRadius = HELIOPAUSE_AU * AU_TO_SCENE_UNITS;

  const seeds = useMemo<ParticleSeed[]>(() => {
    const out: ParticleSeed[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const isFast = Math.random() < 0.5;
      const speedKmS = isFast ? SOLAR_WIND_FAST_KM_S : SOLAR_WIND_SLOW_KM_S;
      const speedUnitsPerSec = speedKmS * UNITS_PER_KM;
      const maxAge = heliopauseRadius / speedUnitsPerSec;
      // Latitude biased toward the equatorial plane (where the classic spiral is clearest)
      // via a squared random value, while still covering the full sphere of directions.
      const latSign = Math.random() < 0.5 ? -1 : 1;
      const latitude = latSign * (Math.PI / 2) * Math.pow(Math.random(), 2.2);
      out.push({
        speedUnitsPerSec,
        maxAge,
        phase: Math.random() * maxAge,
        launchLongitude: Math.random() * 2 * Math.PI,
        latitude,
        isFast,
      });
    }
    return out;
  }, [heliopauseRadius]);

  const { positions, colors } = useMemo(() => {
    return {
      positions: new Float32Array(PARTICLE_COUNT * 3),
      colors: new Float32Array(PARTICLE_COUNT * 3),
    };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  // A small soft circular sprite so particles read as glowing plasma dots rather than
  // the flat squares THREE.Points renders by default.
  const spriteTexture = useMemo(() => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  useFrame(() => {
    const t = simulationState.elapsed;
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = geometry.attributes.color as THREE.BufferAttribute;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const s = seeds[i];
      const age = ((t + s.phase) % s.maxAge + s.maxAge) % s.maxAge;
      const launchTime = t - age;
      const longitude = s.launchLongitude + ROTATION_OMEGA * launchTime;
      const radius = s.speedUnitsPerSec * age;

      const cosLat = Math.cos(s.latitude);
      const x = radius * cosLat * Math.cos(longitude);
      const z = radius * cosLat * Math.sin(longitude);
      const y = radius * Math.sin(s.latitude);

      posAttr.setXYZ(i, x, y, z);

      // Fade with distance (real plasma density falls off ~1/r^2) and tint fast/slow wind.
      const falloff = Math.max(0.08, 1 - age / s.maxAge);
      const [r, g, b] = s.isFast ? [0.55, 0.78, 1.0] : [1.0, 0.82, 0.55];
      colorAttr.setXYZ(i, r * falloff, g * falloff, b * falloff);
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={1.1}
        map={spriteTexture}
        alphaMap={spriteTexture}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
