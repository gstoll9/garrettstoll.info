import pandas as pd
import numpy as np
from scipy.special import assoc_laguerre, sph_harm

a0 = 5.291772108e-11  # Bohr radius in meters
radialFunctions = pd.DataFrame({
    'n': [1, 2, 2, 3, 3, 3],
    'l': [0, 0, 1, 0, 1, 2],
    'm': [0, 0, -1, 0, 1, 0],
    'Z': [1] * 6
})

def R(r, n, l, Z):
    rho = 2 * Z * r / (n * a0)
    return np.exp(-rho / 2) * (rho**l) * assoc_laguerre(rho, n - l - 1, 2 * l + 1)

def wavefunction(r, theta, phi, n, l, m, Z):
    C = np.sqrt((2 / (n * a0))**3 * (np.math.factorial(n - l - 1) / (2 * n * np.math.factorial(n + l))))
    R_nl = R(r, n, l, Z)
    Y_lm = sph_harm(m, n, phi, theta)
    return C * R_nl * Y_lm

def electron_cloud(n, l, m, Z, sampleSize=1000):
    points = []
    for i in range(sampleSize):
        
        r = np.random.uniform(0, 5 * a0)
        theta = np.random.uniform(0, np.pi)
        phi = np.random.uniform(0, 2 * np.pi)
        
        psi = wavefunction(r, theta, phi, n, l, m, Z)
        if np.abs(psi)**2 > 0.9:
            points.append((r, theta, phi))

    return points