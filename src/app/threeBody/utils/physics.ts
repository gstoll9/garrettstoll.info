/**
 * Three-Body Problem Physics Solver
 * Uses Newtonian gravity and RK4 numerical integration
 */

export interface Body {
  mass: number;
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
  name: string;
}

export interface SystemState {
  bodies: Body[];
  time: number;
}

// Gravitational constant (normalized units)
const G = 1.0;

/**
 * Calculate gravitational acceleration on body1 due to body2
 */
function gravitationalAcceleration(
  pos1: [number, number, number],
  pos2: [number, number, number],
  mass2: number
): [number, number, number] {
  const dx = pos2[0] - pos1[0];
  const dy = pos2[1] - pos1[1];
  const dz = pos2[2] - pos1[2];
  
  const distSq = dx * dx + dy * dy + dz * dz;
  const dist = Math.sqrt(distSq);
  
  // Prevent singularities when bodies are very close
  if (dist < 0.01) {
    return [0, 0, 0];
  }
  
  const forceMagnitude = G * mass2 / distSq;
  const accelMagnitude = forceMagnitude / dist;
  
  return [
    accelMagnitude * dx,
    accelMagnitude * dy,
    accelMagnitude * dz
  ];
}

/**
 * Calculate derivatives for the system (velocities and accelerations)
 */
function calculateDerivatives(state: SystemState): {
  velocities: [number, number, number][];
  accelerations: [number, number, number][];
} {
  const n = state.bodies.length;
  const velocities: [number, number, number][] = [];
  const accelerations: [number, number, number][] = [];
  
  for (let i = 0; i < n; i++) {
    const body = state.bodies[i];
    velocities.push([...body.velocity]);
    
    // Calculate total acceleration on this body from all others
    let ax = 0, ay = 0, az = 0;
    
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const [accX, accY, accZ] = gravitationalAcceleration(
          body.position,
          state.bodies[j].position,
          state.bodies[j].mass
        );
        ax += accX;
        ay += accY;
        az += accZ;
      }
    }
    
    accelerations.push([ax, ay, az]);
  }
  
  return { velocities, accelerations };
}

/**
 * Add two vectors
 */
function addVectors(
  v1: [number, number, number],
  v2: [number, number, number]
): [number, number, number] {
  return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
}

/**
 * Multiply vector by scalar
 */
function scaleVector(
  v: [number, number, number],
  scalar: number
): [number, number, number] {
  return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
}

/**
 * Runge-Kutta 4th order integration step
 */
export function rk4Step(state: SystemState, dt: number): SystemState {
  const n = state.bodies.length;
  
  // k1: derivatives at current state
  const k1 = calculateDerivatives(state);
  
  // k2: derivatives at midpoint using k1
  const state2: SystemState = {
    time: state.time + dt / 2,
    bodies: state.bodies.map((body, i) => ({
      ...body,
      position: addVectors(body.position, scaleVector(k1.velocities[i], dt / 2)),
      velocity: addVectors(body.velocity, scaleVector(k1.accelerations[i], dt / 2))
    }))
  };
  const k2 = calculateDerivatives(state2);
  
  // k3: derivatives at midpoint using k2
  const state3: SystemState = {
    time: state.time + dt / 2,
    bodies: state.bodies.map((body, i) => ({
      ...body,
      position: addVectors(body.position, scaleVector(k2.velocities[i], dt / 2)),
      velocity: addVectors(body.velocity, scaleVector(k2.accelerations[i], dt / 2))
    }))
  };
  const k3 = calculateDerivatives(state3);
  
  // k4: derivatives at endpoint using k3
  const state4: SystemState = {
    time: state.time + dt,
    bodies: state.bodies.map((body, i) => ({
      ...body,
      position: addVectors(body.position, scaleVector(k3.velocities[i], dt)),
      velocity: addVectors(body.velocity, scaleVector(k3.accelerations[i], dt))
    }))
  };
  const k4 = calculateDerivatives(state4);
  
  // Combine using RK4 formula
  const newBodies = state.bodies.map((body, i) => {
    const newPos = addVectors(
      body.position,
      scaleVector(
        addVectors(
          addVectors(k1.velocities[i], scaleVector(k2.velocities[i], 2)),
          addVectors(scaleVector(k3.velocities[i], 2), k4.velocities[i])
        ),
        dt / 6
      )
    );
    
    const newVel = addVectors(
      body.velocity,
      scaleVector(
        addVectors(
          addVectors(k1.accelerations[i], scaleVector(k2.accelerations[i], 2)),
          addVectors(scaleVector(k3.accelerations[i], 2), k4.accelerations[i])
        ),
        dt / 6
      )
    );
    
    return {
      ...body,
      position: newPos,
      velocity: newVel
    };
  });
  
  return {
    bodies: newBodies,
    time: state.time + dt
  };
}

/**
 * Calculate total energy of the system (kinetic + potential)
 */
export function calculateEnergy(state: SystemState): number {
  let kinetic = 0;
  let potential = 0;
  
  // Kinetic energy
  for (const body of state.bodies) {
    const vSq = body.velocity[0] ** 2 + body.velocity[1] ** 2 + body.velocity[2] ** 2;
    kinetic += 0.5 * body.mass * vSq;
  }
  
  // Potential energy (pairwise)
  for (let i = 0; i < state.bodies.length; i++) {
    for (let j = i + 1; j < state.bodies.length; j++) {
      const dx = state.bodies[j].position[0] - state.bodies[i].position[0];
      const dy = state.bodies[j].position[1] - state.bodies[i].position[1];
      const dz = state.bodies[j].position[2] - state.bodies[i].position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (dist > 0.01) {
        potential -= G * state.bodies[i].mass * state.bodies[j].mass / dist;
      }
    }
  }
  
  return kinetic + potential;
}

/**
 * Preset configurations for the three-body problem
 */
export const presets = {
  figure8: {
    name: "Figure-8",
    bodies: [
      {
        mass: 1,
        position: [-0.97000436, 0.24308753, 0] as [number, number, number],
        velocity: [0.4662036850, 0.4323657300, 0] as [number, number, number],
        color: "#ff4444",
        name: "Body 1"
      },
      {
        mass: 1,
        position: [0, 0, 0] as [number, number, number],
        velocity: [-0.93240737, -0.86473146, 0] as [number, number, number],
        color: "#44ff44",
        name: "Body 2"
      },
      {
        mass: 1,
        position: [0.97000436, -0.24308753, 0] as [number, number, number],
        velocity: [0.4662036850, 0.4323657300, 0] as [number, number, number],
        color: "#4444ff",
        name: "Body 3"
      }
    ]
  },
  
  sunEarthMoon: {
    name: "Sun-Earth-Moon",
    bodies: [
      {
        mass: 100,
        position: [0, 0, 0] as [number, number, number],
        velocity: [0, 0, 0] as [number, number, number],
        color: "#ffff00",
        name: "Sun"
      },
      {
        mass: 1,
        position: [10, 0, 0] as [number, number, number],
        velocity: [0, 3.16, 0] as [number, number, number],
        color: "#4444ff",
        name: "Earth"
      },
      {
        mass: 0.1,
        position: [10.5, 0, 0] as [number, number, number],
        velocity: [0, 3.66, 0] as [number, number, number],
        color: "#888888",
        name: "Moon"
      }
    ]
  },
  
  chaotic: {
    name: "Chaotic Triple",
    bodies: [
      {
        mass: 1,
        position: [-1, 0, 0] as [number, number, number],
        velocity: [0, 0.5, 0.2] as [number, number, number],
        color: "#ff4444",
        name: "Body 1"
      },
      {
        mass: 1,
        position: [1, 0, 0] as [number, number, number],
        velocity: [0, -0.5, -0.2] as [number, number, number],
        color: "#44ff44",
        name: "Body 2"
      },
      {
        mass: 1,
        position: [0, 1, 0] as [number, number, number],
        velocity: [-0.5, 0, 0] as [number, number, number],
        color: "#4444ff",
        name: "Body 3"
      }
    ]
  },
  
  lagrangeL4: {
    name: "Lagrange L4",
    bodies: [
      {
        mass: 10,
        position: [-0.5, 0, 0] as [number, number, number],
        velocity: [0, -1.5, 0] as [number, number, number],
        color: "#ffaa00",
        name: "Star 1"
      },
      {
        mass: 10,
        position: [0.5, 0, 0] as [number, number, number],
        velocity: [0, 1.5, 0] as [number, number, number],
        color: "#ff00aa",
        name: "Star 2"
      },
      {
        mass: 0.01,
        position: [0, 0.866, 0] as [number, number, number],
        velocity: [1.732, 0, 0] as [number, number, number],
        color: "#00aaff",
        name: "Asteroid"
      }
    ]
  }
};
