
// Simplified FLRW Physics Constants and Calculators

export const COSMO_CONSTANTS = {
  z_recombination: 1089.92,
  T_now: 2.72548, // Kelvin (Fixsen 2009)
  T_recombination: 3000,
  age_recombination: 380000, // Years
  age_now: 13787000000, // Years (Planck 2018: 13.787 Gyr)
  H0_yr: 6.89e-11, // Hubble constant in years^-1 (67.4 km/s/Mpc)
  Omega_m: 0.315, // Matter density parameter
  Omega_lambda: 0.685, // Dark energy density parameter
};

/**
 * Calculates the Scale Factor a(t) based on the exact FLRW solution 
 * for a flat universe with Matter and Lambda (Lambda-CDM).
 * a(t) = (Omega_m / Omega_L)^(1/3) * sinh^(2/3)(1.5 * sqrt(Omega_L) * H0 * t)
 * 
 * @param progress Normalized time 0 (Recombination) to 1 (Present)
 * @returns Scale factor 'a' (normalized such that a_present = 1)
 */
export const calculateScaleFactor = (progress: number): number => {
  // 1. Calculate actual cosmic time t in years
  const t = COSMO_CONSTANTS.age_recombination + (COSMO_CONSTANTS.age_now - COSMO_CONSTANTS.age_recombination) * progress;

  // 2. Constants for the formula
  const { H0_yr, Omega_m, Omega_lambda } = COSMO_CONSTANTS;

  // 3. Apply Friedmann analytic solution
  const matterLambdaRatio = Math.pow(Omega_m / Omega_lambda, 1 / 3);
  const hubbleTimeProduct = 1.5 * Math.sqrt(Omega_lambda) * H0_yr * t;

  const a = matterLambdaRatio * Math.pow(Math.sinh(hubbleTimeProduct), 2 / 3);

  return a;
};

/**
 * Calculates the estimated age of the universe for the label.
 * The age is exactly determined by our cosmic time calculation.
 */
export const calculateUniverseAge = (progress: number): string => {
  const currentYears = COSMO_CONSTANTS.age_recombination + (COSMO_CONSTANTS.age_now - COSMO_CONSTANTS.age_recombination) * progress;

  if (currentYears < 1000000) {
    return `${Math.floor(currentYears / 1000)}k años`;
  } else {
    // Format as Millions/Billions
    const millions = currentYears / 1000000;
    return `${millions.toLocaleString('es-ES', { maximumFractionDigits: 0 })} M años`;
  }
};

/**
 * Calculates Redshift z based on current scale factor
 * 1 + z = 1 / a(t) 
 */
export const calculateRedshift = (scaleFactor: number): number => {
  // Ensure we don't divide by zero and handle the start point precisely
  const a = Math.max(0.0001, scaleFactor);
  return (1.0 / a) - 1;
};

/**
 * Calculates Temperature T(z)
 * T(z) = T0 * (1 + z)
 */
export const calculateTemperature = (z: number): number => {
  return COSMO_CONSTANTS.T_now * (1 + z);
};

/**
 * Returns a color based on temperature/redshift for visualization
 * High T (Recombination) -> Orange/White
 * Medium T -> Red
 * Low T (CMB Now) -> Faint Blue/Grey (Microwaves are invisible, represented symbolically)
 */
export const getPhotonColor = (z: number): string => {
  // Logarithmic scale for better visual transition
  if (z > 500) return '#ffaa00'; // Recombination glow (Orange/White)
  if (z > 100) return '#ff4500'; // Redshifting (Deep Red)
  if (z > 10) return '#8b0000'; // Dark Red/Infrared
  if (z > 1) return '#4b0082'; // Fading to invisible/radio
  return '#3b82f6'; // Present day microwave background (Symbolic Cold Blue)
};