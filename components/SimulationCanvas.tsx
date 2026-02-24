import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import { calculateScaleFactor, calculateRedshift, calculateTemperature, getPhotonColor } from '../utils/cosmology';
import { SimulationState } from '../types';

// Constants for the simulation scale
const INITIAL_UNIVERSE_RADIUS = 5;
const MAX_EXPANSION_SCALE = 30; // The outer edge will grow 30x
const PHOTON_COUNT = 800;

interface SimulationProps {
  state: SimulationState;
  onHoverData: (z: number, T: number) => void;
  onZoomChange?: (zoom: number) => void;
  onOpen360: () => void;
  onOpenInspector: () => void;
}

// === HELPER: CURVED CUBE GRID GEOMETRY (Normalized Cube) ===
// Generates a sphere grid made of ONLY quads (4 vertices), no poles, no diagonals.
const createCurvedCubeGrid = (radius: number, subdivisions: number) => {
  const points: number[] = [];
  const vertices: THREE.Vector3[] = []; // Store unique vertices for radial struts

  const step = 2 / subdivisions;

  // Function to project cube point to sphere using normalization
  // This creates the "Curved Cube" / Spherified Cube effect
  const project = (x: number, y: number, z: number) => {
    const v = new THREE.Vector3(x, y, z);
    v.normalize().multiplyScalar(radius);
    return v;
  };

  const lines: number[] = [];

  const faces = [
    { u: 'y', v: 'z', w: 'x', val: 1 },  // Right
    { u: 'y', v: 'z', w: 'x', val: -1 }, // Left
    { u: 'x', v: 'z', w: 'y', val: 1 },  // Top
    { u: 'x', v: 'z', w: 'y', val: -1 }, // Bottom
    { u: 'x', v: 'y', w: 'z', val: 1 },  // Front
    { u: 'x', v: 'y', w: 'z', val: -1 }, // Back
  ];

  // We need to capture vertices for the "Radial Struts" logic of Geodesic Grid
  const uniqueKeys = new Set<string>();

  faces.forEach(face => {
    for (let i = 0; i <= subdivisions; i++) {
      for (let j = 0; j <= subdivisions; j++) {
        // Current point on face plane (Cube Surface)
        const uVal = -1 + i * step;
        const vVal = -1 + j * step;

        const vec = new THREE.Vector3();
        // @ts-ignore
        vec[face.u] = uVal;
        // @ts-ignore
        vec[face.v] = vVal;
        // @ts-ignore
        vec[face.w] = face.val;

        const current = project(vec.x, vec.y, vec.z);

        // Store vertex (only corner points of the grid cells, not the curve subdivisions)
        const key = `${current.x.toFixed(3)},${current.y.toFixed(3)},${current.z.toFixed(3)}`;
        if (!uniqueKeys.has(key)) {
          uniqueKeys.add(key);
          vertices.push(current);
        }

        const CURVE_SEGMENTS = 4; // Subdivisions per grid edge for smoothness

        // Horizontal line (varying u)
        if (i < subdivisions) {
          let pPrev = current;
          const uStart = uVal;
          const uEnd = -1 + (i + 1) * step;

          for (let k = 1; k <= CURVE_SEGMENTS; k++) {
            const t = k / CURVE_SEGMENTS;
            const uCurr = uStart + (uEnd - uStart) * t;

            const tempVec = vec.clone();
            // @ts-ignore
            tempVec[face.u] = uCurr;

            const pNext = project(tempVec.x, tempVec.y, tempVec.z);
            lines.push(pPrev.x, pPrev.y, pPrev.z, pNext.x, pNext.y, pNext.z);
            pPrev = pNext;
          }
        }

        // Vertical line (varying v)
        if (j < subdivisions) {
          let pPrev = current;
          const vStart = vVal;
          const vEnd = -1 + (j + 1) * step;

          for (let k = 1; k <= CURVE_SEGMENTS; k++) {
            const t = k / CURVE_SEGMENTS;
            const vCurr = vStart + (vEnd - vStart) * t;

            const tempVec = vec.clone();
            // @ts-ignore
            tempVec[face.v] = vCurr;

            const pNext = project(tempVec.x, tempVec.y, tempVec.z);
            lines.push(pPrev.x, pPrev.y, pPrev.z, pNext.x, pNext.y, pNext.z);
            pPrev = pNext;
          }
        }
      }
    }
  });

  return { lines, vertices };
};


// === Geodesic Metric Grid (Curved Cubes / Spherified Cube) ===
// Replaces the Icosahedral logic with Normalized Cube logic for 4-vertex quads.
const GeodesicMetricGrid: React.FC<{
  progress: number;
  visualGrowth: number;
  initialRadius: number;
  show: boolean;
  opacity: number;
}> = ({ progress, visualGrowth, initialRadius, show, opacity }) => {
  const numLayers = 8;
  const radialPower = 2.2;
  const subdivisions = 4; // 16 quads per face

  const expansionFactor = visualGrowth;

  // 1. Generate Base Grid (Normalized Radius 1)
  const { lines, vertices } = useMemo(() => createCurvedCubeGrid(1, subdivisions), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    return geo;
  }, [lines]);

  const strutGeometry = useMemo(() => {
    const points: number[] = [];
    vertices.forEach(v => {
      points.push(0, 0, 0); // Origin
      points.push(v.x, v.y, v.z); // Surface
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, [vertices]);

  const layersRef = useRef<THREE.Group>(null);
  const strutsRef = useRef<THREE.LineSegments>(null);

  useFrame(() => {
    if (!show || !layersRef.current || !strutsRef.current) return;

    // Unified Global Boost: 20^(progress^3) + 1.2 * progress^2
    // No temporal limits (6 Gyr removed). Start at t=0, boost from 4876 years.
    const RAD_THRESHOLD = 4876 / 13800000000;
    const radProgress = progress > RAD_THRESHOLD ? progress : 0;
    const unifiedBoost = Math.pow(20, Math.pow(progress, 3)) + 1.2 * Math.pow(radProgress, 2);

    layersRef.current.children.forEach((mesh, i) => {
      const normalizedStep = (i + 1) / numLayers;

      // Layers start boosting from index 3 (4th layer)
      // Distribute the asymptotic power to create an aggressive radial expansion
      const layerPower = Math.max(0, i - 3) / 4;
      const geometricBoost = Math.pow(unifiedBoost, layerPower);

      const radius = initialRadius * Math.pow(normalizedStep, radialPower) * expansionFactor * geometricBoost;
      mesh.scale.setScalar(radius);

      // Dynamic Opacity: Gradually fade to match SpacetimeFabric's final brightness (0.03 * opacity)
      if ((mesh as any).material) {
        // Starts at 0.15, ends at 0.03 (1 - 0.8 = 0.2 -> 0.15 * 0.2 = 0.03)
        const layerFade = 1 - progress * 0.8;
        (mesh as any).material.opacity = 0.15 * opacity * layerFade;
      }
    });

    // Struts must follow the outermost accelerated layer for continuity
    const outerBoost = Math.pow(unifiedBoost, (numLayers - 1 - 3) / 4);
    const maxRadius = initialRadius * Math.pow(1, radialPower) * expansionFactor * outerBoost;

    strutsRef.current.scale.setScalar(maxRadius);
    const strutMaterial = strutsRef.current.material as THREE.LineBasicMaterial;
    // Starts at 0.08, ends at 0.03 (1 - 0.625 = 0.375 -> 0.08 * 0.375 = 0.03)
    const strutFade = 1 - progress * 0.625;
    strutMaterial.opacity = 0.08 * opacity * strutFade;
  });

  if (!show) return null;

  return (
    <group>
      {/* Concentric Cube-Sphere Layers */}
      <group ref={layersRef}>
        {Array.from({ length: numLayers }).map((_, i) => (
          <lineSegments key={i} geometry={geometry}>
            <lineBasicMaterial
              color="#06b6d4"
              transparent
              opacity={0.15 * opacity} // Increased base opacity slightly for better visibility
              depthWrite={false}
            />
          </lineSegments>
        ))}
      </group>

      {/* Radial Struts connecting the corners */}
      <lineSegments ref={strutsRef} geometry={strutGeometry}>
        <lineBasicMaterial
          color="#06b6d4"
          transparent
          opacity={0.08 * opacity}
          depthWrite={false}
        />
      </lineSegments>

    </group>
  );
};

// === Spacetime Fabric (Geometric/Logarithmic Metric) ===
const SpacetimeFabric: React.FC<{
  progress: number;
  visualGrowth: number;
  initialRadius: number;
  show: boolean;
  opacity: number;
}> = ({ progress, visualGrowth, initialRadius, show, opacity }) => {
  const lineRef = useRef<THREE.LineSegments>(null);
  const expansionFactor = visualGrowth;

  const initialPositions = useMemo(() => {
    const points: number[] = [];
    const R = initialRadius;
    const spacing = 0.5;

    const addLine = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
      points.push(x1, y1, z1);
      points.push(x2, y2, z2);
    };

    const range = Math.floor(R / spacing);

    for (let y = -range; y <= range; y++) {
      for (let z = -range; z <= range; z++) {
        const yPos = y * spacing;
        const zPos = z * spacing;
        if (yPos * yPos + zPos * zPos < R * R) {
          const xLimit = Math.sqrt(R * R - (yPos * yPos + zPos * zPos));
          addLine(-xLimit, yPos, zPos, xLimit, yPos, zPos);
        }
      }
    }

    for (let x = -range; x <= range; x++) {
      for (let z = -range; z <= range; z++) {
        const xPos = x * spacing;
        const zPos = z * spacing;
        if (xPos * xPos + zPos * zPos < R * R) {
          const yLimit = Math.sqrt(R * R - (xPos * xPos + zPos * zPos));
          addLine(xPos, -yLimit, zPos, xPos, yLimit, zPos);
        }
      }
    }

    for (let x = -range; x <= range; x++) {
      for (let y = -range; y <= range; y++) {
        const xPos = x * spacing;
        const yPos = y * spacing;
        if (xPos * xPos + yPos * yPos < R * R) {
          const zLimit = Math.sqrt(R * R - (xPos * xPos + yPos * yPos));
          addLine(xPos, yPos, -zLimit, xPos, yPos, zLimit);
        }
      }
    }

    return new Float32Array(points);
  }, [initialRadius]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(initialPositions), 3));
    return geo;
  }, [initialPositions]);

  useFrame(() => {
    if (!lineRef.current || !show) return;

    const positions = lineRef.current.geometry.attributes.position.array as Float32Array;
    const count = initialPositions.length / 3;

    // Unified Global Boost: 20^(progress^3) + 1.2 * progress^2
    const RAD_THRESHOLD = 4876 / 13800000000;
    const radProgress = progress > RAD_THRESHOLD ? progress : 0;
    const unifiedBoost = Math.pow(20, Math.pow(progress, 3)) + 1.2 * Math.pow(radProgress, 2);

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      const x0 = initialPositions[ix];
      const y0 = initialPositions[iy];
      const z0 = initialPositions[iz];

      const dist = Math.sqrt(x0 * x0 + y0 * y0 + z0 * z0);
      const normalizedDist = dist / initialRadius;

      const distPower = Math.max(0, (normalizedDist * 7) - 3) / 4;
      const geometricBoost = Math.pow(unifiedBoost, distPower);

      const expansionFactor = visualGrowth * geometricBoost;

      positions[ix] = x0 * expansionFactor;
      positions[iy] = y0 * expansionFactor;
      positions[iz] = z0 * expansionFactor;
    }

    // Dynamic Opacity: Smoothly fade as it projects to infinity
    if (lineRef.current.material) {
      const lineMaterial = lineRef.current.material as THREE.LineBasicMaterial;
      // Smooth opacity fade towards the end of the simulation
      const lateStageFade = Math.max(0.4, 1 - progress * 0.6);
      lineMaterial.opacity = 0.075 * opacity * lateStageFade;
    }

    lineRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!show) return null;

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        color="#06b6d4"
        transparent
        opacity={0.075 * opacity}
        linewidth={1}
        depthWrite={false}
      />
    </lineSegments>
  );
};

// === Standard CMB Photons (Successful Arrival) ===
const Photons: React.FC<{
  progress: number;
  scaleFactor: number;
  showLabels: boolean;
  showTails: boolean;
  showAnisotropies: boolean;
  onHover: (z: number, T: number) => void;
  onOpen360: () => void;
  onOpenInspector: () => void;
}> = ({ progress, scaleFactor, showLabels, showTails, showAnisotropies, onHover, onOpen360, onOpenInspector }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tailMeshRef = useRef<THREE.InstancedMesh>(null);
  const labelGroupRef = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const HERO_PHOTON_INDEX = 10;
  const isNearEnd = progress > 0.95;

  const photonData = useMemo(() => {
    const data = [];
    for (let i = 0; i < PHOTON_COUNT; i++) {
      const phi = Math.acos(-1 + (2 * i) / PHOTON_COUNT);
      const theta = Math.sqrt(PHOTON_COUNT * Math.PI) * phi;

      const ux = Math.sin(phi) * Math.cos(theta);
      const uy = Math.sin(phi) * Math.sin(theta);
      const uz = Math.cos(phi);

      // Anisotropy Generation (Color Data Only)
      const frequencyLow = 2.5;
      const frequencyHigh = 6.0;

      const structure = (
        Math.sin(ux * frequencyLow) * Math.cos(uy * frequencyLow) +
        Math.sin(uz * frequencyLow) +
        0.5 * Math.sin(ux * frequencyHigh + uy * frequencyHigh)
      );

      const rawNoise = (structure * 0.7) + ((Math.random() - 0.5) * 0.6);
      const anisotropy = Math.max(-1, Math.min(1, rawNoise));

      const x = INITIAL_UNIVERSE_RADIUS * ux;
      const y = INITIAL_UNIVERSE_RADIUS * uy;
      const z = INITIAL_UNIVERSE_RADIUS * uz;

      data.push({
        vec: new THREE.Vector3(x, y, z),
        anisotropy: anisotropy
      });
    }
    return data;
  }, []);

  const tailGeometry = useMemo(() => {
    const height = 5.25;
    const geo = new THREE.CylinderGeometry(0, 0.4, height, 8);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -height / 2);
    return geo;
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const travelProgress = progress;

    // === COLOR LOGIC ===
    // Start: Intense Bright Yellow
    // End (No Aniso): Bright Red
    const startColor = new THREE.Color('#FFFF00');
    const endColor = new THREE.Color('#FF3333');

    // Planck Palette Colors
    const cColdDeep = new THREE.Color('#001060'); // Deep Navy Blue
    const cColdMid = new THREE.Color('#33ccff');  // Bright Cyan/Light Blue
    const cHotMid = new THREE.Color('#ffcc00');   // Bright Yellow/Orange
    const cHotDeep = new THREE.Color('#aa0000');  // Dark Red

    // Accelerated color transition: Reach end color by 70% progress (approx 10,000 M years)
    // 1 / 0.7 approx 1.4. We use 1.5 to be safe.
    const colorProgress = Math.min(1, travelProgress * 1.5);

    photonData.forEach((p, i) => {
      // NOTE: Strictly use p.vec (perfect sphere) to ensure equidistance at t=0
      const startPos = p.vec;

      // TARGET LOGIC:
      // Instead of going to 0,0,0, we go to a small sphere of radius 0.15 around the center.
      // This ensures that at t=1, the photons form a visible cluster/sphere of color.
      const targetPos = startPos.clone().normalize().multiplyScalar(0.15);

      dummy.position.copy(startPos).lerp(targetPos, travelProgress);

      const particleSize = 0.05 * (1 + travelProgress * 0.5);
      dummy.scale.set(particleSize, particleSize, particleSize);
      dummy.lookAt(0, 0, 0);
      dummy.updateMatrix();

      meshRef.current!.setMatrixAt(i, dummy.matrix);

      // Color Interpolation
      const instanceColor = startColor.clone().lerp(endColor, colorProgress);

      if (showAnisotropies) {
        const val = p.anisotropy; // Range -1 to 1

        if (val < 0) {
          // Cold Sector: Dark Blue (-1) -> Cyan (0)
          // We remap -1..0 to 0..1 for lerping
          const t = (val + 1);
          // Use power to tweak the gradient curve to match image contrast
          instanceColor.copy(cColdDeep).lerp(cColdMid, Math.pow(t, 0.8));
        } else {
          // Hot Sector: Yellow (0) -> Dark Red (1)
          const t = val;
          instanceColor.copy(cHotMid).lerp(cHotDeep, t);
        }
      }

      meshRef.current!.setColorAt(i, instanceColor);

      // Update Tails - SAME COLOR
      if (showTails && tailMeshRef.current) {
        tailMeshRef.current.setColorAt(i, instanceColor);
        const dist = dummy.position.length();

        let fadeScale = 1.0;
        if (dist < 1.5) {
          fadeScale = Math.max(0, (dist - 0.3) / 1.2);
          fadeScale = fadeScale * fadeScale * fadeScale;
        }

        const tailWidth = particleSize * fadeScale;
        const tailLength = fadeScale;

        dummy.scale.set(tailWidth, tailWidth, tailWidth * tailLength);
        dummy.updateMatrix();
        tailMeshRef.current.setMatrixAt(i, dummy.matrix);
      }

      if (i === HERO_PHOTON_INDEX && labelGroupRef.current) {
        labelGroupRef.current.position.copy(dummy.position);
      }
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.instanceColor!.needsUpdate = true;
    if (tailMeshRef.current && showTails) {
      tailMeshRef.current.instanceMatrix.needsUpdate = true;
      tailMeshRef.current.instanceColor!.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, PHOTON_COUNT]}
        onPointerOver={() => {
          const z = calculateRedshift(scaleFactor);
          const T = calculateTemperature(z);
          const fluctuation = (Math.random() - 0.5) * (T / 10000);
          onHover(z, T + fluctuation);
        }}
        onPointerOut={() => onHover(0, 0)}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.8} />
      </instancedMesh>

      {showTails && (
        <instancedMesh ref={tailMeshRef} args={[undefined, undefined, PHOTON_COUNT]} geometry={tailGeometry}>
          <meshBasicMaterial transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
        </instancedMesh>
      )}

      {showLabels && (
        <group ref={labelGroupRef}>
          <Html
            zIndexRange={[100, 0]}
            style={{ pointerEvents: 'auto' }}
          >
            <div className="relative">
              <svg className="overflow-visible absolute top-0 left-0 pointer-events-none" width="1" height="1">
                <defs>
                  <filter id="glow-line" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <path
                  d="M0,0 L30,-50 L240,-50"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  fill="none"
                  filter="url(#glow-line)"
                  strokeOpacity="0.8"
                />
                <circle cx="0" cy="0" r="3" fill="white" filter="url(#glow-line)" />
              </svg>

              <div
                className="absolute"
                style={{
                  left: '30px',
                  top: '-50px',
                  transform: 'translateY(-50%)'
                }}
              >
                <div className="bg-slate-950/80 backdrop-blur-md border border-sky-500/30 px-4 py-3 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.6)] ml-2 text-left min-w-[240px] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-500/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]"></div>
                  <div className="flex items-center gap-2 mb-1.5 border-b border-sky-500/20 pb-1.5 relative z-10">
                    <div className="w-2 h-2 bg-sky-400 rounded-full shadow-[0_0_8px_#38bdf8] animate-pulse"></div>
                    <span className="text-[10px] text-sky-400 font-bold uppercase tracking-widest">Fotón CMB</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white leading-snug relative z-10 mb-1">
                    Radiación de fondo cósmico<br />de microondas (CMB)
                  </h3>

                  {isNearEnd && (
                    <div className="flex flex-col gap-2 mt-2 w-full animate-in fade-in slide-in-from-top-2 duration-500">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen360();
                        }}
                        className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded shadow-lg shadow-sky-900/50 flex items-center justify-center gap-2 transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Ver en 360° / VR
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenInspector();
                        }}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2 transition-all border border-emerald-400/30"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                        Ver un fotón
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Html>
        </group>
      )}
    </>
  );
};

// === Receding Photons (Stopped at Emission - Matter/Electrons Left Behind) ===
const RecedingPhotons: React.FC<{
  initialRadius: number;
  count: number;
  opacity: number;
  showLabels: boolean;
  showTails: boolean;
  progress: number;
}> = ({ initialRadius, count, opacity, showLabels, showTails, progress }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tailMeshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const initialPositions = useMemo(() => {
    const positions = [];
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const x = initialRadius * Math.sin(phi) * Math.cos(theta);
      const y = initialRadius * Math.sin(phi) * Math.sin(theta);
      const z = initialRadius * Math.cos(phi);
      positions.push(new THREE.Vector3(x, y, z));
    }
    return positions;
  }, [count, initialRadius]);

  const tailGeometry = useMemo(() => {
    const height = 5.25;
    const geo = new THREE.CylinderGeometry(0, 0.4, height, 8);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -height / 2);
    return geo;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;

    // === COLOR TRANSITION LOGIC ===
    // At t=0 (Chaos/Plasma State): Force Flash White #F9EED7
    // Then smooth transition to Standard Redshift

    // Extended threshold to 0.008 to make the transition perceptible upon play
    const isPrimordial = progress < 0.008;
    const startColor = new THREE.Color('#FFFF00');
    const endColor = new THREE.Color('#FF0000');
    const flashColor = new THREE.Color('#F9EED7');

    // Accelerated color transition for standard mode
    const colorProgress = Math.min(1, progress * 1.5);
    const standardColor = startColor.clone().lerp(endColor, colorProgress);

    // Mix flash color based on progress (instant switch for now, or smooth)
    // We want PURE white at 0.
    const meshColor = isPrimordial ? flashColor : standardColor;

    if (materialRef.current) {
      materialRef.current.opacity = opacity; // Keep opacity steady for receding (as requested implies only intermediate loses opacity)
    }

    const time = state.clock.getElapsedTime();
    // Final state is exactly 1.1 * initial radius
    const currentScale = 1 + (progress * 0.1);

    // Tail Growth Logic:
    // Grow up to 5x proportionally with distance
    const tailGrowthFactor = 1 + (progress * 4); // 1 + 4 = 5x

    // Wave damping factor: 0 at progress=0, 1 at progress=0.1+
    // Ensures perfect sphere at t=0
    const waveDamping = Math.min(1, progress * 10);

    initialPositions.forEach((pos, i) => {
      dummy.position.copy(pos).multiplyScalar(currentScale);
      dummy.position.y += Math.sin(time + i) * 0.02 * waveDamping; // Dampened wave

      const particleSize = 0.04;
      dummy.scale.set(particleSize, particleSize, particleSize);
      dummy.lookAt(0, 0, 0);
      dummy.updateMatrix();

      meshRef.current!.setMatrixAt(i, dummy.matrix);

      // FLICKERING LOGIC AT T=0
      // If primordial, random visibility to simulate chaos
      if (isPrimordial) {
        const flicker = Math.random() > 0.5 ? 1 : 0; // 50% chance visible
        // Scale to 0 if hidden, else normal size
        if (flicker === 0) {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          meshRef.current!.setMatrixAt(i, dummy.matrix);
        }
        // Force color overwrite just in case
        meshRef.current!.setColorAt(i, flashColor);
      } else {
        meshRef.current!.setColorAt(i, meshColor);
      }

      if (showTails && tailMeshRef.current) {
        tailMeshRef.current.setColorAt(i, meshColor); // Ensure same color

        dummy.scale.set(particleSize, particleSize, particleSize * tailGrowthFactor);
        dummy.updateMatrix();
        tailMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    if (tailMeshRef.current && showTails) {
      tailMeshRef.current.instanceMatrix.needsUpdate = true;
      tailMeshRef.current.instanceColor!.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial ref={materialRef} transparent opacity={opacity} depthWrite={false} />
      </instancedMesh>

      {showTails && (
        <instancedMesh ref={tailMeshRef} args={[undefined, undefined, count]} geometry={tailGeometry}>
          <meshBasicMaterial transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
        </instancedMesh>
      )}

      {showLabels && (
        <Billboard position={[0, (-initialRadius * (1 + progress * 0.1)) - 1, 0]}>
          <Text
            fontSize={0.4}
            color="#ef4444"
            outlineColor="#000"
            outlineWidth={0.02}
            fillOpacity={1 - progress}
            outlineOpacity={1 - progress}
          >
            Punto de Emisión (Recesión)
          </Text>
        </Billboard>
      )}
    </>
  );
};

// === Intermediate Photons (Equidistant Layer) ===
const IntermediatePhotons: React.FC<{
  initialRadius: number;
  visualGrowth: number;
  progress: number;
  count: number;
  opacity: number;
  showLabels: boolean;
  showTails: boolean;
}> = ({ initialRadius, visualGrowth, progress, count, opacity, showLabels, showTails }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tailMeshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const initialPositions = useMemo(() => {
    const positions = [];
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const x = initialRadius * Math.sin(phi) * Math.cos(theta);
      const y = initialRadius * Math.sin(phi) * Math.sin(theta);
      const z = initialRadius * Math.cos(phi);
      positions.push(new THREE.Vector3(x, y, z));
    }
    return positions;
  }, [count, initialRadius]);

  const tailGeometry = useMemo(() => {
    const height = 5.25;
    const geo = new THREE.CylinderGeometry(0, 0.4, height, 8);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -height / 2);
    return geo;
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;

    // === COLOR & OPACITY TRANSITION ===

    // === COLOR & OPACITY TRANSITION ===

    // At t=0 (Chaos/Plasma State): Force Flash White #F9EED7

    // Extended threshold to 0.008 to make the transition perceptible upon play
    const isPrimordial = progress < 0.008;
    const startColor = new THREE.Color('#FFFF00');
    const endColor = new THREE.Color('#FF0000');
    const flashColor = new THREE.Color('#F9EED7');

    const colorProgress = Math.min(1, progress * 1.5);
    const standardColor = startColor.clone().lerp(endColor, colorProgress);
    const meshColor = isPrimordial ? flashColor : standardColor;

    // Opacity Fade: Loses 50% opacity by end (1.0 -> 0.5 factor relative to base opacity)
    if (materialRef.current) {
      materialRef.current.opacity = opacity * (1 - progress * 0.5);
    }

    // Tail Growth: Up to 10x
    const tailGrowthFactor = 1 + (progress * 9); // 1 + 9 = 10x

    const surfaceRadius = initialRadius * visualGrowth;
    const midRadius = (initialRadius + surfaceRadius) / 2;
    const midScale = midRadius / initialRadius;

    initialPositions.forEach((pos, i) => {
      dummy.position.copy(pos).multiplyScalar(midScale);

      const particleSize = 0.045;
      dummy.scale.set(particleSize, particleSize, particleSize);
      dummy.lookAt(0, 0, 0);
      dummy.updateMatrix();

      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      // FLICKERING LOGIC AT T=0 for Intermediate Photons
      if (isPrimordial) {
        const flicker = Math.random() > 0.3 ? 1 : 0; // 70% visible for density
        if (flicker === 0) {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          meshRef.current!.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current!.setColorAt(i, flashColor);
      } else {
        meshRef.current!.setColorAt(i, meshColor);
      }

      if (showTails && tailMeshRef.current) {
        tailMeshRef.current.setColorAt(i, meshColor);
        // Stretched tail
        dummy.scale.set(particleSize, particleSize, particleSize * tailGrowthFactor);
        dummy.updateMatrix();
        tailMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    if (tailMeshRef.current && showTails) {
      tailMeshRef.current.instanceMatrix.needsUpdate = true;
      tailMeshRef.current.instanceColor!.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial ref={materialRef} color="#ffffff" transparent opacity={opacity} depthWrite={false} />
      </instancedMesh>

      {showTails && (
        <instancedMesh ref={tailMeshRef} args={[undefined, undefined, count]} geometry={tailGeometry}>
          <meshBasicMaterial transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
        </instancedMesh>
      )}
    </>
  );
};

// === Primordial Plasma (Beyond LSS) ===
const PrimordialPlasma: React.FC<{
  initialRadius: number;
  expansionFactor: number;
  progress: number;
  count: number;
  showLabels: boolean;
}> = ({ initialRadius, expansionFactor, progress, count, showLabels }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const colors = useMemo(() => {
    const c = [];
    const palette = [
      new THREE.Color("#1e293b"), // Slate-900 (Dense/Solid)
      new THREE.Color("#1e3a8a"), // Blue-900
      new THREE.Color("#312e81"), // Indigo-900
      new THREE.Color("#111827"), // Gray-900
    ];
    for (let i = 0; i < count; i++) {
      c.push(palette[Math.floor(Math.random() * palette.length)]);
    }
    return c;
  }, [count]);

  const initialOffsets = useMemo(() => {
    const offsets = [];
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      // Volumetric positioning: fill the inner sphere for a "cloud" effect
      const depth = Math.random() * 1.05;
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);
      offsets.push({ vec: new THREE.Vector3(x, y, z), depth });
    }
    return offsets;
  }, [count]);

  const lssRadius = initialRadius * expansionFactor;
  // Instant fade upon play (within 1% of progress)
  const fadeDuration = 0.005; // Even faster fade
  const fadeFactor = Math.max(0, 1 - (progress / fadeDuration));
  const particleOpacity = 0.4 * fadeFactor; // Reduced base opacity to see photons better
  const labelOpacity = fadeFactor;

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();

    initialOffsets.forEach((offset, i) => {
      const currentDistance = lssRadius * offset.depth;
      dummy.position.copy(offset.vec).multiplyScalar(currentDistance);

      // Boiling Agitation: Ultra-high frequency vibrations for "soup/liquid" look
      const jitterAmount = 0.15 * expansionFactor;
      const speed = 40.0; // Boiling frequency
      dummy.position.x += Math.sin(time * speed + i * 0.4) * jitterAmount;
      dummy.position.y += Math.cos(time * speed * 1.1 + i * 0.5) * jitterAmount;
      dummy.position.z += Math.sin(time * speed * 0.9 + i * 0.6) * jitterAmount;

      const particleSize = 0.15 * expansionFactor; // Large enough to overlap
      dummy.scale.set(particleSize, particleSize, particleSize);
      dummy.updateMatrix();

      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, colors[i]);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  if (fadeFactor <= 0.01) return null;

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 4, 4]} />
        <meshStandardMaterial
          transparent
          opacity={particleOpacity}
          depthWrite={false}
          roughness={0.7}
          metalness={0.2}
        />
      </instancedMesh>

      {showLabels && (
        <Billboard position={[lssRadius * 1.5, lssRadius * 0.5, 0]}>
          <Text
            fontSize={Math.max(1, lssRadius * 0.08)}
            color="#94a3b8"
            fillOpacity={labelOpacity}
            outlineColor="#000000"
            outlineWidth={0.02}
            outlineOpacity={labelOpacity}
            anchorX="left"
            font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
          >
            Plasma Primordial Primigenio
          </Text>
        </Billboard>
      )}
    </>
  );
};

// The Grid represents the Surface of Last Scattering container
const ExpandingGrid: React.FC<{ progress: number; visualGrowth: number; show: boolean; showLabels: boolean }> = ({ progress, visualGrowth, show, showLabels }) => {
  // Use the same Curved Cube logic for the Comoving Grid to ensure 4-vertex quads without diagonals
  // Standard sphere wireframe has diagonals (triangles), which the user explicitly wanted removed.
  const { lines } = useMemo(() => createCurvedCubeGrid(INITIAL_UNIVERSE_RADIUS, 12), []); // Higher subdivision for background grid

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    return geo;
  }, [lines]);

  if (!show) return null;

  // Grid fades out smoothly towards the end of the simulation
  const gridOpacity = Math.max(0, 0.15 * (1 - progress));
  // Label disappears quickly after play (within first 10% of progress)
  const labelOpacity = Math.max(0, 1 - progress / 0.1);

  if (gridOpacity <= 0 && labelOpacity <= 0) return null;

  return (
    <group scale={[visualGrowth, visualGrowth, visualGrowth]}>
      {/* 1. Surface of Last Scattering (The distinct "Wall" that moves away) */}
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color="#334155" transparent opacity={gridOpacity} depthWrite={false} />
      </lineSegments>

      {showLabels && labelOpacity > 0 && (
        <Billboard position={[0, INITIAL_UNIVERSE_RADIUS + 0.5, 0]}>
          <Text fontSize={0.5} color="#94a3b8" outlineColor="#000" outlineWidth={0.02} fillOpacity={labelOpacity} outlineOpacity={labelOpacity}>
            Superficie de Última Dispersión
          </Text>
        </Billboard>
      )}
    </group>
  );
};

// Component: Observable Universe Sphere
const ObservableUniverseSphere: React.FC<{ show: boolean; showLabels: boolean; progress: number }> = ({ show, showLabels, progress }) => {
  if (!show || progress < 0.65) return null;

  // Normalized progress from Earth formation (0.65) to Present (1.0)
  const t_rel = (progress - 0.65) / 0.35;
  // Quadratic Ease-Out for deceleration effect
  const easeOut = 1 - Math.pow(1 - t_rel, 2);

  // Radius and scale logic:
  // Starts at scale 0 at p=0.65
  // Ends at 1.096 * INITIAL_UNIVERSE_RADIUS to leave a 2-pixel gap with photons at 1.1
  const radius = INITIAL_UNIVERSE_RADIUS;
  const currentScale = easeOut * 1.096;
  const sphereOpacity = 0.08 * t_rel; // Smooth fade in

  return (
    <group scale={[currentScale, currentScale, currentScale]}>
      <mesh>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshBasicMaterial
          color="#a5b4fc"
          transparent
          opacity={sphereOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {showLabels && (
        <Billboard position={[0, radius - 1, 0]}>
          <Text fontSize={0.4} color="#818cf8" outlineColor="#000" outlineWidth={0.02}>
            Universo Observable
          </Text>
        </Billboard>
      )}
    </group>
  );
};

// Component: Observer (Center)
const Observer: React.FC<{ showLabels: boolean }> = ({ showLabels }) => {
  return (
    <group position={[0, 0, 0]}>
      <mesh>
        {/* Ultra-reduced Observer Radius for cosmic scale: 0.01 (infinitesimal) */}
        <sphereGeometry args={[0.01, 32, 32]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
      {showLabels && (
        <Billboard position={[0, 0.4, 0]}>
          <Text fontSize={0.3} color="#38bdf8" outlineColor="#000" outlineWidth={0.02}>
            Observador
          </Text>
        </Billboard>
      )}
    </group>
  );
};

// Camera Controller
const CameraController: React.FC<{ zoomLevel: number; onZoomChange?: (zoom: number) => void }> = ({ zoomLevel, onZoomChange }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!camera || !controlsRef.current) return;
    const currentDist = camera.position.length();
    if (Math.abs(currentDist - zoomLevel) > 1) {
      const currentDir = new THREE.Vector3().copy(camera.position).normalize();
      const safeZoom = Math.max(1, Math.min(300, zoomLevel));
      camera.position.copy(currentDir.multiplyScalar(safeZoom));
      controlsRef.current.update();
    }
  }, [zoomLevel, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      minDistance={1}
      maxDistance={300}
      onChange={(e) => {
        if (e?.target?.object?.position && onZoomChange) {
          const dist = e.target.object.position.length();
          onZoomChange(dist);
        }
      }}
    />
  );
};

const SceneContent: React.FC<SimulationProps> = ({ state, onHoverData, onZoomChange, onOpen360, onOpenInspector }) => {
  const scaleFactor = calculateScaleFactor(state.time);
  const a_start = calculateScaleFactor(0);
  const a_end = calculateScaleFactor(1);

  // Normalize expansion to range [1, 20] while preserving Lambda-CDM curvatue
  // At progress=0: visualGrowth = 1
  // At progress=1: visualGrowth = 20
  const visualGrowth = 1 + ((scaleFactor - a_start) / (a_end - a_start)) * 19;

  return (
    <>
      <CameraController zoomLevel={state.zoomLevel} onZoomChange={onZoomChange} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      <Observer showLabels={state.showLabels} />

      <ExpandingGrid progress={state.time} visualGrowth={visualGrowth} show={state.showComovingGrid} showLabels={state.showLabels} />

      {/* Spacetime Fabric (Geometric Expansion) */}
      <SpacetimeFabric
        progress={state.time}
        visualGrowth={visualGrowth}
        initialRadius={INITIAL_UNIVERSE_RADIUS}
        show={state.showSpacetimeFabric}
        opacity={state.spacetimeOpacity}
      />

      {/* New: Geodesic Metric Grid (Power Law Icosahedral Lattice) */}
      <GeodesicMetricGrid
        progress={state.time}
        visualGrowth={visualGrowth}
        initialRadius={INITIAL_UNIVERSE_RADIUS}
        show={state.showAcceleratedGrid}
        opacity={state.geodesicOpacity}
      />

      <ObservableUniverseSphere
        show={state.showObservableUniverse}
        showLabels={state.showLabels}
        progress={state.time}
      />

      {state.showPhotons && (
        <Photons
          progress={state.time}
          scaleFactor={scaleFactor}
          showLabels={state.showLabels}
          showTails={state.showPhotonTails}
          showAnisotropies={state.showAnisotropies}
          onHover={onHoverData}
          onOpen360={onOpen360}
          onOpenInspector={onOpenInspector}
        />
      )}

      {state.showRecedingPhotons && (
        <RecedingPhotons
          initialRadius={INITIAL_UNIVERSE_RADIUS}
          count={400}
          opacity={0.8}
          showLabels={state.showLabels}
          showTails={state.showPhotonTails}
          progress={state.time} // Scaled growth
        />
      )}

      {state.showIntermediatePhotons && (
        <IntermediatePhotons
          initialRadius={INITIAL_UNIVERSE_RADIUS}
          visualGrowth={visualGrowth}
          progress={state.time}
          count={400}
          opacity={0.8}
          showLabels={state.showLabels}
          showTails={state.showPhotonTails}
        />
      )}

      {state.showPrimordialPlasma && (
        <PrimordialPlasma
          initialRadius={INITIAL_UNIVERSE_RADIUS}
          expansionFactor={visualGrowth}
          progress={state.time}
          count={5000} // Extreme density for cloud/soup effect
          showLabels={state.showLabels}
        />
      )}
    </>
  );
};

const SimulationCanvas: React.FC<SimulationProps> = (props) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const cameraPos: [number, number, number] = isMobile ? [30, 22, 30] : [20, 15, 20];
  return (
    <Canvas camera={{ position: cameraPos, fov: isMobile ? 50 : 45 }} dpr={[1, 2]}>
      <SceneContent {...props} />
    </Canvas>
  );
};

export default SimulationCanvas;