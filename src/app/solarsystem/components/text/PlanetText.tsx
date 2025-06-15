import { PlanetProps } from '../Planet';

export default function PlanetText(planet: PlanetProps) {
    return (
        <div className="planetText-container">
            <h1>{planet.name}</h1>
            <h2>Orbit</h2>
            <h2>Rotation</h2>
            <h2>Magnetic Field</h2>
            <h2>Rings</h2>
            <h2>Moons</h2>
            {planet.name === 'Earth'&& <>
            <h2>Satelites</h2>
            <p>list of man-made satelites</p>
            </>}
            <h2>Atmosphere</h2>
            <h2>Surface</h2>
            {Object.entries(planet).map(([key, value]) => (
                <p key={key}>
                    <strong>{key}</strong>: {
                    typeof value === 'object' && value !== null
                        ? JSON.stringify(value)
                        : typeof value === 'function'
                        ? '[function]'
                        : value
                    }
                </p>
            ))}
        </div>
    );
}