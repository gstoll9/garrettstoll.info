// utils/hydrogenCloud.ts

// utils/hydrogenCloud.ts

export function generateCloudData(n: number, l: number, m: number, sampleCount = 10000): number[] {
  if (n === 1 && l === 0 && m === 0) {
    return generate1sCloud(sampleCount);
  }
  if (n === 2 && l === 0 && m === 0) {
    return generate2sCloud(sampleCount);
  }
  if (n === 2 && l === 1 && m === 0) {
    return generate2p0Cloud(sampleCount);
  }

  return [];
}


function generate1sCloud(sampleCount: number): number[] {
  const points: number[] = [];
  //const a0 = 1; // Bohr radius, in atomic units

  for (let i = 0; i < sampleCount; i++) {
    let r: number;
    const theta = Math.acos(1 - 2 * Math.random());;
    const phi = 2 * Math.PI * Math.random();

    // Rejection sampling based on radial probability density: P(r) ~ r^2 * e^(-2r/a0)
    while (true) {
      const x = Math.random() * 10; // max radius range
      const y = Math.random(); // for rejection
      const p = x * x * Math.exp(-2 * x); // P(r) shape

      if (y < p / 0.2) { // scale 0.2 ≈ max of the probability density
        r = x;
        break;
      }
    }
    // Convert spherical to Cartesian
    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);

    points.push(x, y, z);
  }

  return points;
}

function generate2sCloud(sampleCount: number): number[] {
  const points: number[] = [];

  for (let i = 0; i < sampleCount; i++) {
    let r: number, theta: number, phi: number;

    while (true) {
      const x = Math.random() * 20;
      const y = Math.random();
      const p = x * x * Math.pow(1 - x / 2, 2) * Math.exp(-x);
      if (y < p / 0.09) { // Scaled to rough peak
        r = x;
        break;
      }
    }

    theta = Math.acos(1 - 2 * Math.random());
    phi = 2 * Math.PI * Math.random();

    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);

    points.push(x, y, z);
  }

  return points;
}

function generate2p0Cloud(sampleCount: number): number[] {
  const points: number[] = [];

  for (let i = 0; i < sampleCount; i++) {
    let r: number, theta: number, phi: number;

    while (true) {
      const x = Math.random() * 20;
      const y = Math.random();
      const p = Math.pow(x, 4) * Math.exp(-x);
      if (y < p / 0.35) {
        r = x;
        break;
      }
    }

    while (true) {
      theta = Math.acos(1 - 2 * Math.random());
      phi = 2 * Math.PI * Math.random();

      const yAngular = Math.pow(Math.cos(theta), 2); // |Y₁₀|² ∝ cos²(θ)
      const rand = Math.random();
      if (rand < yAngular) {
        break;
      }
    }

    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);

    points.push(x, y, z);
  }

  return points;
}
