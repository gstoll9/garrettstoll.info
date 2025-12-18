// utils/hydrogenCloud.ts

/**
 * Mathematical helper functions for solving the Schrödinger equation
 */

// Factorial function
function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// Associated Laguerre polynomial L_n^k(x)
function associatedLaguerre(x: number, n: number, k: number): number {
  if (n === 0) return 1;
  if (n === 1) return 1 + k - x;
  
  // Use recurrence relation
  let L0 = 1;
  let L1 = 1 + k - x;
  let L2 = 0;
  
  for (let i = 2; i <= n; i++) {
    L2 = ((2 * i - 1 + k - x) * L1 - (i - 1 + k) * L0) / i;
    L0 = L1;
    L1 = L2;
  }
  
  return L1;
}

// Associated Legendre polynomial P_l^m(x)
function associatedLegendre(l: number, m: number, x: number): number {
  const absM = Math.abs(m);
  
  if (absM > l) return 0;
  
  // P_m^m(x)
  let pmm = 1.0;
  if (absM > 0) {
    const somx2 = Math.sqrt((1 - x) * (1 + x));
    let fact = 1.0;
    for (let i = 1; i <= absM; i++) {
      pmm *= -fact * somx2;
      fact += 2.0;
    }
  }
  
  if (l === absM) return pmm;
  
  // P_m+1^m(x)
  let pmmp1 = x * (2 * absM + 1) * pmm;
  
  if (l === absM + 1) return pmmp1;
  
  // Use recurrence for P_l^m(x)
  let pll = 0;
  for (let ll = absM + 2; ll <= l; ll++) {
    pll = (x * (2 * ll - 1) * pmmp1 - (ll + absM - 1) * pmm) / (ll - absM);
    pmm = pmmp1;
    pmmp1 = pll;
  }
  
  return pll;
}

// Spherical harmonic Y_l^m(θ, φ)
function sphericalHarmonic(l: number, m: number, theta: number, phi: number): { real: number; imag: number } {
  const absM = Math.abs(m);
  
  // Normalization constant
  const norm = Math.sqrt(
    ((2 * l + 1) * factorial(l - absM)) / (4 * Math.PI * factorial(l + absM))
  );
  
  const P = associatedLegendre(l, absM, Math.cos(theta));
  
  // Complex exponential e^(imφ)
  const real = norm * P * Math.cos(m * phi);
  const imag = norm * P * Math.sin(m * phi);
  
  // Handle negative m
  if (m < 0 && m % 2 !== 0) {
    return { real: -real, imag: -imag };
  }
  
  return { real, imag };
}

// Radial wavefunction R_nl(r)
function radialWavefunction(n: number, l: number, r: number, Z: number = 1): number {
  const a0 = 1; // Bohr radius in atomic units
  const rho = (2 * Z * r) / (n * a0);
  
  // Normalization constant
  const norm = Math.sqrt(
    Math.pow(2 * Z / (n * a0), 3) *
    factorial(n - l - 1) /
    (2 * n * factorial(n + l))
  );
  
  const laguerre = associatedLaguerre(rho, n - l - 1, 2 * l + 1);
  const radial = norm * Math.exp(-rho / 2) * Math.pow(rho, l) * laguerre;
  
  return radial;
}

// Full wavefunction ψ_nlm(r, θ, φ)
function wavefunction(
  r: number,
  theta: number,
  phi: number,
  n: number,
  l: number,
  m: number,
  Z: number = 1
): { real: number; imag: number } {
  const R = radialWavefunction(n, l, r, Z);
  const Y = sphericalHarmonic(l, m, theta, phi);
  
  return {
    real: R * Y.real,
    imag: R * Y.imag,
  };
}

// Probability density |ψ|²
function probabilityDensity(
  r: number,
  theta: number,
  phi: number,
  n: number,
  l: number,
  m: number,
  Z: number = 1
): number {
  const psi = wavefunction(r, theta, phi, n, l, m, Z);
  return psi.real * psi.real + psi.imag * psi.imag;
}

/**
 * Generate electron cloud data using rejection sampling
 */
export function generateCloudData(
  n: number,
  l: number,
  m: number,
  sampleCount = 10000,
  Z: number = 1
): number[] {
  const points: number[] = [];
  const maxRadius = n * n * 5; // Estimate max radius
  
  // Find approximate maximum probability density for rejection sampling
  let maxProb = 0;
  for (let i = 0; i < 100; i++) {
    const testR = (i / 100) * maxRadius;
    const testTheta = Math.PI / 2;
    const testPhi = 0;
    const prob = probabilityDensity(testR, testTheta, testPhi, n, l, m, Z) * testR * testR;
    if (prob > maxProb) maxProb = prob;
  }
  
  maxProb *= 1.2; // Add some margin
  
  let attempts = 0;
  const maxAttempts = sampleCount * 1000; // Prevent infinite loops
  
  while (points.length < sampleCount * 3 && attempts < maxAttempts) {
    attempts++;
    
    // Random spherical coordinates
    const r = Math.random() * maxRadius;
    const theta = Math.acos(1 - 2 * Math.random());
    const phi = 2 * Math.PI * Math.random();
    
    // Probability density with r² factor for volume element
    const prob = probabilityDensity(r, theta, phi, n, l, m, Z) * r * r;
    
    // Rejection sampling
    if (Math.random() * maxProb < prob) {
      // Convert to Cartesian coordinates
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(theta);
      
      points.push(x, y, z);
    }
  }
  
  return points;
}

/**
 * Helper function to get valid quantum states
 */
export function getValidQuantumStates(maxN: number = 4): Array<{n: number; l: number; m: number; label: string}> {
  const states: Array<{n: number; l: number; m: number; label: string}> = [];
  
  const orbitalNames = ['s', 'p', 'd', 'f', 'g'];
  
  for (let n = 1; n <= maxN; n++) {
    for (let l = 0; l < n; l++) {
      for (let m = -l; m <= l; m++) {
        const orbitalName = l < orbitalNames.length ? orbitalNames[l] : `l${l}`;
        const label = `${n}${orbitalName}${m !== 0 ? `(m=${m})` : ''}`;
        states.push({ n, l, m, label });
      }
    }
  }
  
  return states;
}

/**
 * Generate 3D grid of probability density values
 */
export function generateProbabilityGrid(
  n: number,
  l: number,
  m: number,
  gridSize: number = 64,
  Z: number = 1
): { 
  values: Float32Array; 
  gridSize: number; 
  extent: number;
} {
  const maxRadius = n * n * 5; // Increased from 3 to 5 for larger extent
  const extent = maxRadius * 2;
  const step = extent / (gridSize - 1);
  
  const values = new Float32Array(gridSize * gridSize * gridSize);
  
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      for (let k = 0; k < gridSize; k++) {
        // Cartesian coordinates
        const x = -maxRadius + i * step;
        const y = -maxRadius + j * step;
        const z = -maxRadius + k * step;
        
        // Convert to spherical
        const r = Math.sqrt(x * x + y * y + z * z);
        const theta = r > 0 ? Math.acos(z / r) : 0;
        const phi = Math.atan2(y, x);
        
        // Calculate probability density
        const prob = r > 0 ? probabilityDensity(r, theta, phi, n, l, m, Z) : 0;
        
        const index = i + j * gridSize + k * gridSize * gridSize;
        values[index] = prob;
      }
    }
  }
  
  return { values, gridSize, extent };
}

/**
 * Find the probability threshold that encloses a given percentage of total probability
 */
export function findProbabilityThreshold(
  values: Float32Array,
  targetPercentage: number = 0.9
): number {
  // Sort values in descending order
  const sorted = Array.from(values).sort((a, b) => b - a);
  
  // Calculate cumulative sum
  const totalProb = sorted.reduce((sum, val) => sum + val, 0);
  const targetSum = totalProb * targetPercentage;
  
  let cumulativeSum = 0;
  let threshold = 0;
  
  for (let i = 0; i < sorted.length; i++) {
    cumulativeSum += sorted[i];
    if (cumulativeSum >= targetSum) {
      threshold = sorted[i];
      break;
    }
  }
  
  return threshold;
}

/**
 * Marching Cubes implementation for isosurface extraction
 * Simplified version for orbital visualization
 */
export function marchingCubes(
  values: Float32Array,
  gridSize: number,
  extent: number,
  isovalue: number
): { positions: number[]; indices: number[] } {
  const positions: number[] = [];
  const indices: number[] = [];
  const vertexMap = new Map<string, number>();
  
  const step = extent / (gridSize - 1);
  const offset = -extent / 2;
  
  // Edge table for marching cubes (which edges are intersected)
  const edgeTable = [
    0x0, 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c,
    0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
    0x190, 0x99, 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c,
    0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
    0x230, 0x339, 0x33, 0x13a, 0x636, 0x73f, 0x435, 0x53c,
    0xa3c, 0xb35, 0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30,
    0x3a0, 0x2a9, 0x1a3, 0xaa, 0x7a6, 0x6af, 0x5a5, 0x4ac,
    0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0,
    0x460, 0x569, 0x663, 0x76a, 0x66, 0x16f, 0x265, 0x36c,
    0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60,
    0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0xff, 0x3f5, 0x2fc,
    0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0,
    0x650, 0x759, 0x453, 0x55a, 0x256, 0x35f, 0x55, 0x15c,
    0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
    0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc,
    0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0,
    0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc,
    0xcc, 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9, 0x7c0,
    0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c,
    0x15c, 0x55, 0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650,
    0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc,
    0x2fc, 0x3f5, 0xff, 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
    0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c,
    0x36c, 0x265, 0x16f, 0x66, 0x76a, 0x663, 0x569, 0x460,
    0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af, 0xaa5, 0xbac,
    0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa, 0x1a3, 0x2a9, 0x3a0,
    0xd30, 0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c,
    0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x33, 0x339, 0x230,
    0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c,
    0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x99, 0x190,
    0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c,
    0x70c, 0x605, 0x50f, 0x406, 0x30a, 0x203, 0x109, 0x0
  ];
  
  // Triangle table (which triangles to generate)
  const triTable = [
    [], [0, 8, 3], [0, 1, 9], [1, 8, 3, 9, 8, 1], [1, 2, 10], [0, 8, 3, 1, 2, 10],
    [9, 2, 10, 0, 2, 9], [2, 8, 3, 2, 10, 8, 10, 9, 8], [3, 11, 2], [0, 11, 2, 8, 11, 0],
    [1, 9, 0, 2, 3, 11], [1, 11, 2, 1, 9, 11, 9, 8, 11], [3, 10, 1, 11, 10, 3],
    [0, 10, 1, 0, 8, 10, 8, 11, 10], [3, 9, 0, 3, 11, 9, 11, 10, 9],
    [9, 8, 10, 10, 8, 11], [4, 7, 8], [4, 3, 0, 7, 3, 4], [0, 1, 9, 8, 4, 7],
    [4, 1, 9, 4, 7, 1, 7, 3, 1], [1, 2, 10, 8, 4, 7], [3, 4, 7, 3, 0, 4, 1, 2, 10],
    [9, 2, 10, 9, 0, 2, 8, 4, 7], [2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4],
    [8, 4, 7, 3, 11, 2], [11, 4, 7, 11, 2, 4, 2, 0, 4], [9, 0, 1, 8, 4, 7, 2, 3, 11],
    [4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1], [3, 10, 1, 3, 11, 10, 7, 8, 4],
    [1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4], [4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3],
    [4, 7, 11, 4, 11, 9, 9, 11, 10], [9, 5, 4], [9, 5, 4, 0, 8, 3],
    [0, 5, 4, 1, 5, 0], [8, 5, 4, 8, 3, 5, 3, 1, 5], [1, 2, 10, 9, 5, 4],
    [3, 0, 8, 1, 2, 10, 4, 9, 5], [5, 2, 10, 5, 4, 2, 4, 0, 2],
    [2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8], [9, 5, 4, 2, 3, 11],
    [0, 11, 2, 0, 8, 11, 4, 9, 5], [0, 5, 4, 0, 1, 5, 2, 3, 11],
    [2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5], [10, 3, 11, 10, 1, 3, 9, 5, 4],
    [4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10], [5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3],
    [5, 4, 8, 5, 8, 10, 10, 8, 11], [9, 7, 8, 5, 7, 9], [9, 3, 0, 9, 5, 3, 5, 7, 3],
    [0, 7, 8, 0, 1, 7, 1, 5, 7], [1, 5, 3, 3, 5, 7], [9, 7, 8, 9, 5, 7, 10, 1, 2],
    [10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3], [8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2],
    [2, 10, 5, 2, 5, 3, 3, 5, 7], [7, 9, 5, 7, 8, 9, 3, 11, 2],
    [9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11], [2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7],
    [11, 2, 1, 11, 1, 7, 7, 1, 5], [9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11],
    [5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0],
    [11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0], [11, 10, 5, 7, 11, 5],
    [10, 6, 5], [0, 8, 3, 5, 10, 6], [9, 0, 1, 5, 10, 6],
    [1, 8, 3, 1, 9, 8, 5, 10, 6], [1, 6, 5, 2, 6, 1], [1, 6, 5, 1, 2, 6, 3, 0, 8],
    [9, 6, 5, 9, 0, 6, 0, 2, 6], [5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8],
    [2, 3, 11, 10, 6, 5], [11, 0, 8, 11, 2, 0, 10, 6, 5], [0, 1, 9, 2, 3, 11, 5, 10, 6],
    [5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11], [6, 3, 11, 6, 5, 3, 5, 1, 3],
    [0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6], [3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9],
    [6, 5, 9, 6, 9, 11, 11, 9, 8], [5, 10, 6, 4, 7, 8], [4, 3, 0, 4, 7, 3, 6, 5, 10],
    [1, 9, 0, 5, 10, 6, 8, 4, 7], [10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4],
    [6, 1, 2, 6, 5, 1, 4, 7, 8], [1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7],
    [8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6], [7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9],
    [3, 11, 2, 7, 8, 4, 10, 6, 5], [5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11],
    [0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6], [9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6],
    [8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6], [5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11],
    [0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7], [6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9],
    [10, 4, 9, 6, 4, 10], [4, 10, 6, 4, 9, 10, 0, 8, 3], [10, 0, 1, 10, 6, 0, 6, 4, 0],
    [8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10], [1, 4, 9, 1, 2, 4, 2, 6, 4],
    [3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4], [0, 2, 4, 4, 2, 6], [8, 3, 2, 8, 2, 4, 4, 2, 6],
    [10, 4, 9, 10, 6, 4, 11, 2, 3], [0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6],
    [3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10], [6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1],
    [9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3], [8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1],
    [3, 11, 6, 3, 6, 0, 0, 6, 4], [6, 4, 8, 11, 6, 8], [7, 10, 6, 7, 8, 10, 8, 9, 10],
    [0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10], [10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0],
    [10, 6, 7, 10, 7, 1, 1, 7, 3], [1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7],
    [2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9], [7, 8, 0, 7, 0, 6, 6, 0, 2],
    [7, 3, 2, 6, 7, 2], [2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7],
    [2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7], [1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11],
    [11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1], [8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6],
    [0, 9, 1, 11, 6, 7], [7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0], [7, 11, 6],
    [7, 6, 11], [3, 0, 8, 11, 7, 6], [0, 1, 9, 11, 7, 6], [8, 1, 9, 8, 3, 1, 11, 7, 6],
    [10, 1, 2, 6, 11, 7], [1, 2, 10, 3, 0, 8, 6, 11, 7], [2, 9, 0, 2, 10, 9, 6, 11, 7],
    [6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8], [7, 2, 3, 6, 2, 7], [7, 0, 8, 7, 6, 0, 6, 2, 0],
    [2, 7, 6, 2, 3, 7, 0, 1, 9], [1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6],
    [10, 7, 6, 10, 1, 7, 1, 3, 7], [10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8],
    [0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7], [7, 6, 10, 7, 10, 8, 8, 10, 9],
    [6, 8, 4, 11, 8, 6], [3, 6, 11, 3, 0, 6, 0, 4, 6], [8, 6, 11, 8, 4, 6, 9, 0, 1],
    [9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6], [6, 8, 4, 6, 11, 8, 2, 10, 1],
    [1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6], [4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9],
    [10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3], [8, 2, 3, 8, 4, 2, 4, 6, 2],
    [0, 4, 2, 4, 6, 2], [1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8], [1, 9, 4, 1, 4, 2, 2, 4, 6],
    [8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1], [10, 1, 0, 10, 0, 6, 6, 0, 4],
    [4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3], [10, 9, 4, 6, 10, 4], [4, 9, 5, 7, 6, 11],
    [0, 8, 3, 4, 9, 5, 11, 7, 6], [5, 0, 1, 5, 4, 0, 7, 6, 11],
    [11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5], [9, 5, 4, 10, 1, 2, 7, 6, 11],
    [6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5], [7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2],
    [3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6], [7, 2, 3, 7, 6, 2, 5, 4, 9],
    [9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7], [3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0],
    [6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8], [9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7],
    [1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4], [4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10],
    [7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10], [6, 9, 5, 6, 11, 9, 11, 8, 9],
    [3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5], [0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11],
    [6, 11, 3, 6, 3, 5, 5, 3, 1], [1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6],
    [0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10], [11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5],
    [6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3], [5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2],
    [9, 5, 6, 9, 6, 0, 0, 6, 2], [1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8],
    [1, 5, 6, 2, 1, 6], [1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6],
    [10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0], [0, 3, 8, 5, 6, 10], [10, 5, 6], [11, 5, 10, 7, 5, 11],
    [11, 5, 10, 11, 7, 5, 8, 3, 0], [5, 11, 7, 5, 10, 11, 1, 9, 0],
    [10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1], [11, 1, 2, 11, 7, 1, 7, 5, 1],
    [0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11], [9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7],
    [7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2], [2, 5, 10, 2, 3, 5, 3, 7, 5],
    [8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5], [9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2],
    [9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2], [1, 3, 5, 3, 7, 5],
    [0, 8, 7, 0, 7, 1, 1, 7, 5], [9, 0, 3, 9, 3, 5, 5, 3, 7], [9, 8, 7, 5, 9, 7],
    [5, 8, 4, 5, 10, 8, 10, 11, 8], [5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0],
    [0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5], [10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4],
    [2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8], [0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11],
    [0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5], [9, 4, 5, 2, 11, 3],
    [2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4], [5, 10, 2, 5, 2, 4, 4, 2, 0],
    [3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9], [5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2],
    [8, 4, 5, 8, 5, 3, 3, 5, 1], [0, 4, 5, 1, 0, 5], [8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5],
    [9, 4, 5], [4, 11, 7, 4, 9, 11, 9, 10, 11], [0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11],
    [1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11], [3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4],
    [4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2], [9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3],
    [11, 7, 4, 11, 4, 2, 2, 4, 0], [11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4],
    [2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9], [9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7],
    [3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10], [1, 10, 2, 8, 7, 4],
    [4, 9, 1, 4, 1, 7, 7, 1, 3], [4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1], [4, 0, 3, 7, 4, 3],
    [4, 8, 7], [9, 10, 8, 10, 11, 8], [3, 0, 9, 3, 9, 11, 11, 9, 10], [0, 1, 10, 0, 10, 8, 8, 10, 11],
    [3, 1, 10, 11, 3, 10], [1, 2, 11, 1, 11, 9, 9, 11, 8], [3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9],
    [0, 2, 11, 8, 0, 11], [3, 2, 11], [2, 3, 8, 2, 8, 10, 10, 8, 9], [9, 10, 2, 0, 9, 2],
    [2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8], [1, 10, 2], [1, 3, 8, 9, 1, 8], [0, 9, 1],
    [0, 3, 8], []
  ];
  
  function getGridValue(x: number, y: number, z: number): number {
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize || z < 0 || z >= gridSize) {
      return 0;
    }
    return values[x + y * gridSize + z * gridSize * gridSize];
  }
  
  function interpVertex(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    v1: number, v2: number
  ): [number, number, number] {
    const t = (isovalue - v1) / (v2 - v1 + 1e-10);
    return [
      offset + (x1 + t * (x2 - x1)) * step,
      offset + (y1 + t * (y2 - y1)) * step,
      offset + (z1 + t * (z2 - z1)) * step
    ];
  }
  
  // Process each cube in the grid
  for (let z = 0; z < gridSize - 1; z++) {
    for (let y = 0; y < gridSize - 1; y++) {
      for (let x = 0; x < gridSize - 1; x++) {
        // Get cube corner values
        const cubeVals = [
          getGridValue(x, y, z),
          getGridValue(x + 1, y, z),
          getGridValue(x + 1, y + 1, z),
          getGridValue(x, y + 1, z),
          getGridValue(x, y, z + 1),
          getGridValue(x + 1, y, z + 1),
          getGridValue(x + 1, y + 1, z + 1),
          getGridValue(x, y + 1, z + 1)
        ];
        
        // Calculate cube index
        let cubeIndex = 0;
        for (let i = 0; i < 8; i++) {
          if (cubeVals[i] > isovalue) cubeIndex |= (1 << i);
        }
        
        // Skip if cube is entirely inside or outside
        if (cubeIndex === 0 || cubeIndex === 255) continue;
        
        // Get edge intersections
        const edgeVerts: Array<[number, number, number]> = [];
        const edges = edgeTable[cubeIndex];
        
        const edgeConnections = [
          [[x, y, z], [x + 1, y, z]],
          [[x + 1, y, z], [x + 1, y + 1, z]],
          [[x + 1, y + 1, z], [x, y + 1, z]],
          [[x, y + 1, z], [x, y, z]],
          [[x, y, z + 1], [x + 1, y, z + 1]],
          [[x + 1, y, z + 1], [x + 1, y + 1, z + 1]],
          [[x + 1, y + 1, z + 1], [x, y + 1, z + 1]],
          [[x, y + 1, z + 1], [x, y, z + 1]],
          [[x, y, z], [x, y, z + 1]],
          [[x + 1, y, z], [x + 1, y, z + 1]],
          [[x + 1, y + 1, z], [x + 1, y + 1, z + 1]],
          [[x, y + 1, z], [x, y + 1, z + 1]]
        ];
        
        for (let i = 0; i < 12; i++) {
          if (edges & (1 << i)) {
            const [[x1, y1, z1], [x2, y2, z2]] = edgeConnections[i];
            const v1 = getGridValue(x1, y1, z1);
            const v2 = getGridValue(x2, y2, z2);
            edgeVerts[i] = interpVertex(x1, y1, z1, x2, y2, z2, v1, v2);
          }
        }
        
        // Create triangles
        const tris = triTable[cubeIndex];
        for (let i = 0; i < tris.length; i += 3) {
          const v0 = edgeVerts[tris[i]];
          const v1 = edgeVerts[tris[i + 1]];
          const v2 = edgeVerts[tris[i + 2]];
          
          if (v0 && v1 && v2) {
            const baseIdx = positions.length / 3;
            positions.push(...v0, ...v1, ...v2);
            indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
          }
        }
      }
    }
  }
  
  return { positions, indices };
}