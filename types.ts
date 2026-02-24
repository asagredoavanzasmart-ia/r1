export interface SimulationState {
  time: number; // 0 to 1 represents flow from Recombination to Present
  isPlaying: boolean;
  playbackSpeed: number; // Multiplier: 0.5, 1, 2
  zoomLevel: number; // Camera distance from center
  showComovingGrid: boolean;
  showPhotons: boolean;
  showPhotonTails: boolean; // New: Comet-like tails for photons
  showRecedingPhotons: boolean; // Photons expanding with space (Horizon)
  showIntermediatePhotons: boolean; // Equidistant layer
  showPrimordialPlasma: boolean; // New: Photon-Baryon Plasma beyond LSS
  showSpacetimeFabric: boolean; // New: Accelerated background grid
  showObservableUniverse: boolean; // New: Solid sphere just inside receding photons
  showAcceleratedGrid: boolean; // New: Accelerated grid visualization
  showAnisotropies: boolean; // New: Toggle for CMB temperature fluctuations
  showLabels: boolean; // Global toggle for labels
  spacetimeOpacity: number; // Opacity level for Spacetime Fabric (0-1)
  geodesicOpacity: number; // Opacity level for Geodesic Grid (0-1)
}

export interface PhotonData {
  id: number;
  startPosition: [number, number, number];
  direction: [number, number, number];
}

export interface CosmologyParams {
  z_recombination: number; // Redshift at recombination (~1100)
  T_recombination: number; // Temp at recombination (~3000K)
  age_universe: number; // ~13.8 Gyr
}