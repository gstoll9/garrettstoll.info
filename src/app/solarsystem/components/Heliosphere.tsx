import * as THREE from 'three'
import Label from './Label'
import { AU_TO_SCENE_UNITS, TERMINATION_SHOCK_AU, HELIOPAUSE_AU } from '../data/heliosphere'

// The heliosphere is enormous compared to the planets (the heliopause is ~120 AU out,
// roughly 4x further than Neptune) — at the default camera distance the viewer sits well
// inside both boundary shells, so they're rendered with BackSide materials (visible from
// inside, like a skybox) rather than as nearby solid objects. That reads as a faint,
// distant "edge of the solar system" glow, which is the physically honest result of the
// real scale difference rather than something to fake around.
export default function Heliosphere() {
  const terminationShockRadius = TERMINATION_SHOCK_AU * AU_TO_SCENE_UNITS;
  const heliopauseRadius = HELIOPAUSE_AU * AU_TO_SCENE_UNITS;

  return (
    <group>
      {/* Termination shock: solar wind abruptly slows from supersonic to subsonic here */}
      <mesh>
        <sphereGeometry args={[terminationShockRadius, 48, 32]} />
        <meshBasicMaterial
          color="#ffb066"
          side={THREE.BackSide}
          transparent
          opacity={0.045}
          depthWrite={false}
        />
      </mesh>
      <Label text="Termination Shock" position={[terminationShockRadius, 0, 0]} fontSize={terminationShockRadius * 0.02} />

      {/* Heliopause: outer edge of the heliosphere, where solar wind pressure balances
          the interstellar medium — the actual boundary of the Sun's bubble */}
      <mesh>
        <sphereGeometry args={[heliopauseRadius, 48, 32]} />
        <meshBasicMaterial
          color="#6fb8ff"
          side={THREE.BackSide}
          transparent
          opacity={0.05}
          depthWrite={false}
        />
      </mesh>
      <Label text="Heliopause" position={[heliopauseRadius, 0, 0]} fontSize={heliopauseRadius * 0.02} />
    </group>
  )
}
