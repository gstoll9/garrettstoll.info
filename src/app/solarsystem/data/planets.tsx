const distanceFactor = 12;

export const planets = [
  { 
    name: 'Mercury', 
    texture: '/solarsystemImages/MercuryTexture.jpg',
    color: '#8C7853', 

    size: 0.4, 
    distance: 10, 
    orbitSpeed: 0.8, 
    rotationalSpeed: 0.01,

    // elliptical
    orbitData: {
      semimajorAxis: 0.387 * distanceFactor,  // in AU
      eccentricity:  0.206,
      inclination: 7.005,                 // in degrees to ecliptic
      longitudeOfAscendingNode: 48.331,   // in degrees
      argumentOfPerihelion: 29.124,       // in degrees
      meanAnomaly: 174.796,               // in degrees
      orbitalPeriod: .241,                // in Julian years (sidereal)
    }
  },
  { 
    name: 'Venus',
    texture: '/solarsystemImages/VenusTexture.jpg',
    color: '#FFC649', 

    size: 0.9, 
    distance: 15, 
    orbitSpeed: 0.6, 
    rotationalSpeed: 0.004,
    
    // elliptical
    orbitData: {
      semimajorAxis: 0.723 * distanceFactor,  // in AU
      eccentricity:  0.007,
      inclination: 3.395,                 // in degrees to ecliptic
      longitudeOfAscendingNode: 76.680,   // in degrees
      argumentOfPerihelion: 54.884,       // in degrees
      meanAnomaly: 50.115,                // in degrees
      orbitalPeriod: .615,                // in Julian years (sidereal)
    }
  },
  { 
    name: 'Earth',
    texture: '/solarsystemImages/EarthTexture.jpg',
    color: '#6B93D6',

    size: 1, 
    distance: 20, 
    orbitSpeed: 0.5, 
    rotationalSpeed: 0.02, 
    textureUrl: '/solarsystemImages/EarthTexture.jpg',
    
    // elliptical
    orbitData: {
      semimajorAxis: 1 * distanceFactor,  // in AU
      eccentricity:  0.017,
      inclination: 0,                     // in degrees to ecliptic
      longitudeOfAscendingNode: -11.261,  // in degrees
      argumentOfPerihelion: 114.208,      // in degrees
      meanAnomaly: 358.617,               // in degrees
      orbitalPeriod: 1,                   // in Julian years (sidereal)
    }
  },
  { 
    name: 'Mars',
    texture: '/solarsystemImages/MarsTexture.jpg',
    color: '#CD5C5C',

    size: 0.5, 
    distance: 25, 
    orbitSpeed: 0.4, 
    rotationalSpeed: 0.018,
    
    // elliptical
    orbitData: {
      semimajorAxis: 1.524 * distanceFactor,  // in AU
      eccentricity:  0.093,
      inclination: 1.850,                 // in degrees to ecliptic
      longitudeOfAscendingNode: 49.579,   // in degrees
      argumentOfPerihelion: 286.5,        // in degrees
      meanAnomaly: 19.412,                // in degrees
      orbitalPeriod: 1.881,               // in Julian years (sidereal)
    }
  },
  { 
    name: 'Jupiter',
    texture: '/solarsystemImages/JupiterTexture.jpg',
    color: '#D8CA9D', 

    size: 3, 
    distance: 45, 
    orbitSpeed: 0.2, 
    rotationalSpeed: 0.04,
    
    // elliptical
    orbitData: {
      semimajorAxis: 5.204 * distanceFactor,  // in AU
      eccentricity:  0.049,
      inclination: 1.303,                 // in degrees to ecliptic
      longitudeOfAscendingNode: 100.464,  // in degrees
      argumentOfPerihelion: 273.867,      // in degrees
      meanAnomaly: 20.020,                // in degrees
      orbitalPeriod: 11.862,              // in Julian years (sidereal)
    }
  },
  { 
    name: 'Saturn', 
    texture: '/solarsystemImages/SaturnTexture.jpg',
    color: '#FAD5A5', 

    size: 2.5, 
    distance: 55, 
    orbitSpeed: 0.15, 
    rotationalSpeed: 0.038,
    
    // elliptical
      orbitData: {
      semimajorAxis: 9.583 * distanceFactor,  // in AU
      eccentricity:  0.057,
      inclination: 2.485,                 // in degrees to ecliptic
      longitudeOfAscendingNode: 113.665,  // in degrees
      argumentOfPerihelion: 339.392,      // in degrees
      meanAnomaly: 317.020,               // in degrees
      orbitalPeriod: 29.448,              // in Julian years (sidereal)
    }
  },
  { 
    name: 'Uranus', 
    texture: '/solarsystemImages/UranusTexture.jpg',
    color: '#4FD0E7', 

    size: 1.8, 
    distance: 65, 
    orbitSpeed: 0.1, 
    rotationalSpeed: 0.03,
    
    // elliptical
    orbitData: {
      semimajorAxis: 19.191 * distanceFactor,  // in AU
      eccentricity:  0.047,
      inclination: 0.773,                 // in degrees to ecliptic
      longitudeOfAscendingNode: 74.006,   // in degrees
      argumentOfPerihelion: 96.999,       // in degrees
      meanAnomaly: 142.284,               // in degrees
      orbitalPeriod: 84.021,              // in Julian years (sidereal)
    }
  },
  { 
    name: 'Neptune',
    texture: '/solarsystemImages/NeptuneTexture.jpg',
    color: '#4B70DD', 

    size: 1.7, 
    distance: 75, 
    orbitSpeed: 0.08, 
    rotationalSpeed: 0.032,
    
    // elliptical
    orbitData: {
      semimajorAxis: 30.07 * distanceFactor,  // in AU
      eccentricity:  0.009,
      inclination: 1.770,                 // in degrees to ecliptic
      longitudeOfAscendingNode: 131.783,  // in degrees
      argumentOfPerihelion: 273.187,      // in degrees
      meanAnomaly: 259.883,               // in degrees
      orbitalPeriod: 164.8,               // in Julian years (sidereal)
    }
  }
];