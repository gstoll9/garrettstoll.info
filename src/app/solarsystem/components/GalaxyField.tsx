import Label from './Label'
import { galaxies, galaxyPosition } from '../data/galaxies'

// Real Local Group galaxies only, at real relative positions (see data/galaxies.ts).
// Superclusters/filaments are deliberately not rendered here — that's deferred until a
// real (non-illustrative) large-scale-structure dataset is identified, per the plan.
export default function GalaxyField() {
  return (
    <>
      {galaxies.map(g => {
        const pos = galaxyPosition(g);
        return (
          <group key={g.name} position={pos}>
            <mesh>
              <sphereGeometry args={[g.size, 24, 24]} />
              <meshBasicMaterial color={g.color} toneMapped={false} />
            </mesh>
            <Label text={g.name} position={[0, g.size + 2, 0]} fontSize={2.2} />
          </group>
        );
      })}
    </>
  )
}
