import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Environment, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { PhotonModel } from './PhotonModel';
import { calculateRedshift, getPhotonColor } from '../utils/cosmology';

interface PhotonInspectorProps {
    isOpen: boolean;
    onClose: () => void;
    currentUniverseTime: number; // 0 to 1
}

// === FIELD VIBRATION SCOPE ===
const FieldVibrationScope: React.FC<{
    progress: number;
    frequency: number;
    width?: number;
    height?: number;
}> = ({ progress, frequency, width = 300, height = 100 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let time = 0;

        const render = () => {
            time += 0.05;
            // Clear
            ctx.clearRect(0, 0, width, height);

            // Blur effect logic (cloud/vibration up to progress=0.5)
            // Blur intensity: 15px max, decreasing to 0 at progress=0.5
            const blurAmount = progress < 0.5 ? 15 * (1 - progress * 2) : 0;

            // Background grid
            ctx.strokeStyle = '#334155'; // Slate 700
            ctx.lineWidth = 0.5;
            ctx.shadowBlur = 0; // No blur for grid
            ctx.beginPath();
            ctx.moveTo(0, height / 2);
            ctx.lineTo(width, height / 2);
            ctx.stroke();

            // Amplitude scales with progress
            const amplitudeScale = (1.5 - progress * 1.3) / 1.5;
            const baseAmp = height * 0.35 * amplitudeScale;
            // Wavelength visual
            const waveLengthPx = 40 + progress * 200;

            // Common draw function for waves
            const drawWave = (color: string, isDiagonal: boolean) => {
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                if (blurAmount > 0) {
                    ctx.shadowBlur = blurAmount;
                    ctx.shadowColor = color;
                } else {
                    ctx.shadowBlur = 0;
                }

                for (let x = 0; x < width; x++) {
                    const t = x / waveLengthPx;
                    // Generic sine wave
                    const val = Math.sin(t * Math.PI * 2 - time) * baseAmp;

                    let px = x;
                    let py = height / 2;

                    if (isDiagonal) {
                        // Magnetic Field (B) - Diagonal / "Coming out of screen"
                        // x stays same (propagation), but oscillation is in Z (diagonal on 2D)
                        // Simple 2D projection: Z-axis is at -45 degrees
                        // x_screen = x_real - val * cos(45) * 0.5 (foreshortening)
                        // y_screen = y_real + val * sin(45) * 0.5
                        // Let's simplify: just add offset to X and Y based on value
                        const zFactor = 0.5; // Foreshortening
                        px = x - val * zFactor * 0.7; // Tilt left/right
                        py = height / 2 + val * zFactor * 0.7; // Tilt up/down
                    } else {
                        // Electric Field (E) - Vertical
                        py = height / 2 - val; // Up is negative Y in canvas
                    }

                    if (x === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();

                // Draw arrows/vectors for E-field (optional, improves "diagram" look)
                // Only every N pixels to avoid clutter
                if (!isDiagonal && blurAmount < 5) {
                    ctx.lineWidth = 1;
                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = 0.3;
                    for (let x = 0; x < width; x += 20) {
                        const t = x / waveLengthPx;
                        const val = Math.sin(t * Math.PI * 2 - time) * baseAmp;
                        const py = height / 2 - val;
                        ctx.beginPath();
                        ctx.moveTo(x, height / 2);
                        ctx.lineTo(x, py);
                        ctx.stroke();
                    }
                    ctx.globalAlpha = 1.0;
                }
            };

            // Draw Magnetic Field (B) - Blue, Diagonal
            drawWave('#38bdf8', true); // Sky-400

            // Draw Electric Field (E) - Red, Vertical
            drawWave('#ef4444', false); // Red-500

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationFrameId);
    }, [progress, width, height]);

    return (
        <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-2 relative overflow-hidden">
            <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-500 flex flex-col gap-1 z-10 bg-slate-950/50 p-1 rounded backdrop-blur-sm">
                <span className="text-red-400 flex items-center gap-1"><span className="w-2 h-0.5 bg-red-400"></span> CAMPO EL�CTRICO (E)</span>
                <span className="text-sky-400 flex items-center gap-1"><span className="w-2 h-0.5 bg-sky-400 transform -rotate-45"></span> CAMPO MAGN�TICO (B)</span>
            </div>
            <canvas ref={canvasRef} width={width} height={height} className="w-full h-full" />
        </div>
    );
};

// === SCIENTIFIC UTILS ===
// Formulas aproximadas para visualización didáctica
// getWavelength not used directly in render but good for formulas
const getWavelength = (progress: number) => {
    const z = calculateRedshift(1 + progress * 20);
    return 500 * (1 + z);
};

// === SPARKLINE COMPONENT ===
const Sparkline: React.FC<{
    data: number[];
    color: string;
    width?: number;
    height?: number;
}> = ({ data, color, width = 60, height = 20 }) => {
    if (data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} className="overflow-visible">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                points={points}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle
                cx={width}
                cy={height - ((data[data.length - 1] - min) / range) * height}
                r="2"
                fill={color}
            />
        </svg>
    );
};

// === METRIC CARD COMPONENT ===
const MetricCard: React.FC<{
    label: string;
    value: string;
    unit: string;
    icon: React.ReactNode;
    color: string; // 'sky' | 'emerald' | 'amber' | 'red'
    history: number[];
}> = ({ label, value, unit, icon, color, history }) => {

    // Map color names to hex for SVG
    const outlineColor = color === 'sky' ? '#38bdf8' :
        color === 'emerald' ? '#34d399' :
            color === 'amber' ? '#fbbf24' : '#f87171';

    const textColorClass = color === 'sky' ? 'text-sky-400' :
        color === 'emerald' ? 'text-emerald-400' :
            color === 'amber' ? 'text-amber-400' : 'text-red-400';

    const borderColorClass = color === 'sky' ? 'border-sky-500/30' :
        color === 'emerald' ? 'border-emerald-500/30' :
            color === 'amber' ? 'border-amber-500/30' : 'border-red-500/30';

    return (
        <div className={`bg-slate-900/80 border ${borderColorClass} p-3 rounded-lg backdrop-blur-sm hover:bg-slate-800/80 transition-colors group`}>
            <div className="flex items-center gap-2 mb-1">
                <div className={`${textColorClass} group-hover:scale-110 transition-transform`}>{icon}</div>
                <span className={`text-xs font-bold ${textColorClass} uppercase tracking-wider`}>{label}</span>
            </div>
            <div className="flex items-end justify-between">
                <div>
                    <div className="text-xl font-mono text-white font-bold leading-none">{value}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">{unit}</div>
                </div>
                <div className="pb-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <Sparkline data={history} color={outlineColor} />
                </div>
            </div>
        </div>
    );
};

// === CAMERA CONTROLLER ===
// Smoothly zooms in when paused (close-up on photon) and zooms out when playing
const CameraController: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => {
    const { camera } = useThree();
    const targetDistance = useRef(isPlaying ? 8 : 2.5);

    useFrame(() => {
        // Lerp camera Z toward target
        const currentDist = camera.position.length();
        const desired = isPlaying ? 8 : 2.5;
        targetDistance.current = desired;

        // Smooth interpolation
        const lerpFactor = 0.05;
        const newDist = currentDist + (desired - currentDist) * lerpFactor;
        camera.position.normalize().multiplyScalar(newDist);
        camera.lookAt(0, 0, 0);
    });

    return null;
};

// === COSMOLOGICAL GRID ===
const CosmologicalGrid: React.FC<{ progress: number }> = ({ progress }) => {
    // Escala del universo
    // Inicial: p=0 -> z=20. Factor a=1 (Relativo visual)
    // Final: p=1 -> z=0. Factor a=21 (Relativo visual)
    const z = calculateRedshift(1 + progress * 20);
    const scaleFactor = (1 + 20) / (1 + z);

    // Efecto de "Creación de Espacio":
    // El usuario quiere ver celdas pequeñas emergiendo del centro.
    // Usaremos múltiples capas de grilla que se escalan exponencialmente.

    // Componente interno para capa de grilla
    const GridLayer: React.FC<{ scale: number, opacity: number, divisions: number }> = ({ scale, opacity, divisions }) => (
        <group scale={scale}>
            <gridHelper
                args={[20, divisions]}
                position={[0, -1, 0]}
                rotation={[0, 0, 0]}
            >
                <lineBasicMaterial attach="material" color="#06b6d4" transparent opacity={opacity} />
            </gridHelper>
            <gridHelper
                args={[20, divisions]}
                position={[0, 0, -5]}
                rotation={[Math.PI / 2, 0, 0]}
            >
                <lineBasicMaterial attach="material" color="#0891b2" transparent opacity={opacity * 0.8} />
            </gridHelper>
            {/* Ejes visuales en mismo color que la grilla (cian) */}
            <primitive object={(() => {
                const axes = new THREE.AxesHelper(2);
                // Override all axis colors to match grid cyan
                const colors = axes.geometry.attributes.color;
                for (let i = 0; i < colors.count; i++) {
                    colors.setXYZ(i, 0.024, 0.714, 0.831); // #06b6d4 cyan
                }
                colors.needsUpdate = true;
                return axes;
            })()} />
        </group>
    );

    return (
        <group>
            {/* Grilla Principal (Macro) - Opacidad reducida 30% */}
            <GridLayer scale={scaleFactor} opacity={0.2} divisions={20} />

            {/* Grilla Secundaria (Meso - Espacio "Nuevo") */}
            {scaleFactor > 2 && (
                <GridLayer scale={scaleFactor * 0.1} opacity={0.1} divisions={10} />
            )}

            {/* Grilla Terciaria (Micro - Origen de expansión) */}
            {scaleFactor > 10 && (
                <GridLayer scale={scaleFactor * 0.01} opacity={0.07} divisions={10} />
            )}
        </group>
    );
};

export const PhotonInspector: React.FC<PhotonInspectorProps> = ({ isOpen, onClose, currentUniverseTime }) => {
    const [progress, setProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [bloomIntensity] = useState(1.5);

    // History Data
    const [historyData, setHistoryData] = useState<{
        freq: number[];
        wave: number[];
        energy: number[];
        ampl: number[];
    }>({ freq: [], wave: [], energy: [], ampl: [] });

    // Sync state on open - FORCE RESET TO 0 (0.0004 Ga approx) per user request
    useEffect(() => {
        if (isOpen) {
            // User requested initial state to be 0.0004 Ga ~ 380k years -> progress 0
            setProgress(0);
            setIsPlaying(true); // Auto-start animation
        }
    }, [isOpen]);

    // Generate history data once
    useEffect(() => {
        const steps = 30;
        const fH = [], wH = [], eH = [], aH = [];
        for (let i = 0; i <= steps; i++) {
            const p = i / steps;
            const z = calculateRedshift(1 + p * 29);
            const wl = 500 * (1 + z);
            const f = 2.998e8 / (wl * 1e-9);
            const e = 4.136e-15 * f;

            // Amplitude metric matching visual scaling (arbitrary units relative to initial)
            // 100% at start, dropping to ~13% at end (0.2/1.5)
            const a = (1.5 - p * 1.3) / 1.5 * 100;

            fH.push(f);
            wH.push(wl);
            eH.push(e);
            aH.push(a);
        }
        setHistoryData({ freq: fH, wave: wH, energy: eH, ampl: aH });
    }, []);

    // Animation Loop
    useEffect(() => {
        let animationId: number;
        let lastTime = performance.now();

        const animate = (time: number) => {
            if (!isPlaying) return;
            const deltaTime = (time - lastTime) / 1000;
            lastTime = time;

            setProgress((prev) => {
                const next = prev + deltaTime * 0.1; // 10s duration
                if (next >= 1) {
                    setIsPlaying(false);
                    return 1;
                }
                return next;
            });
            animationId = requestAnimationFrame(animate);
        };

        if (isPlaying) {
            lastTime = performance.now();
            animationId = requestAnimationFrame(animate);
        }

        return () => cancelAnimationFrame(animationId);
    }, [isPlaying]);

    // Real-time metrics
    const z = calculateRedshift(1 + progress * 29);
    const wavelength = 500 * (1 + z);
    const frequency = 2.998e8 / (wavelength * 1e-9);
    const energy = 4.136e-15 * frequency;
    const amplitudeMetric = (1.5 - progress * 1.3) / 1.5 * 100;

    // Formatting
    const fmtFreq = frequency > 1e12 ? `${(frequency / 1e12).toFixed(2)} THz` : `${(frequency / 1e9).toFixed(2)} GHz`;
    const fmtWave = wavelength > 1e6 ? `${(wavelength / 1e6).toFixed(2)} mm` : `${wavelength.toFixed(0)} nm`;
    const fmtEnergy = energy.toFixed(4);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />

            <div className="relative w-full h-full md:max-w-6xl md:aspect-[16/9] bg-slate-950 border border-slate-800 md:rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto">

                {/* Header */}
                <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-start p-3 md:p-6 bg-gradient-to-b from-slate-950/90 to-transparent pointer-events-none">
                    <div className="pointer-events-auto">
                        <h2 className="text-lg md:text-2xl font-bold text-white flex items-center gap-2 md:gap-3">
                            <span className="w-2 h-8 bg-sky-500 rounded-full shadow-[0_0_15px_#0ea5e9]"></span>
                            Laboratorio de Fotones
                        </h2>
                        <p className="text-slate-400 text-[10px] md:text-sm font-mono mt-1 ml-5">
                            AN�LISIS ESPECTRAL DE FOT�N INDIVIDUAL
                        </p>
                    </div>

                    {/* Photon Time Explanation Badge */}
                    <div className="hidden md:flex pointer-events-auto mr-4 ml-auto">
                        <div className="bg-slate-900/60 border border-amber-500/30 rounded-xl px-4 py-3 backdrop-blur-md shadow-lg max-w-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span
                                    className="text-xs font-bold text-amber-100 uppercase tracking-wider outline-none cursor-text hover:text-white transition-colors"
                                    contentEditable={true}
                                    suppressContentEditableWarning={true}
                                >
                                    Paradoja Temporal
                                </span>
                            </div>
                            <p
                                className="text-[11px] text-slate-300 leading-relaxed outline-none cursor-text hover:text-white transition-colors"
                                contentEditable={true}
                                suppressContentEditableWarning={true}
                            >
                                Este fot�n ha viajado durante <span className="text-white font-bold">13.8 mil millones de a�os</span> desde nuestra perspectiva.
                                Sin embargo, al viajar a la velocidad de la luz, <span className="text-amber-300 font-bold">el tiempo no existe para �l</span>.
                                Su nacimiento y detecci�n ocurren en el mismo instante de su tiempo propio.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="pointer-events-auto p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* 3D Viewport */}
                <div className="flex-1 relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">

                    {/* Grid Background */}
                    <div className="absolute inset-0 opacity-20"
                        style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                    </div>

                    <Canvas shadows dpr={[1, 2]}>
                        <PerspectiveCamera makeDefault position={[5, 2, 8]} fov={35} />
                        {/* Controles Libres */}
                        <OrbitControls
                            enablePan={true}
                            enableZoom={true}
                            minDistance={2}
                            maxDistance={50}
                            target={[0, 0, 0]}
                        />`r`n`r`n                         {/* Camera zoom-in on pause, zoom-out on play */}`r`n                         <CameraController isPlaying={isPlaying} />

                        <color attach="background" args={['#020617']} />
                        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                        <ambientLight intensity={0.2} />
                        <pointLight position={[10, 10, 10]} intensity={0.5} color="#ffffff" />
                        <pointLight position={[-10, -5, -10]} intensity={0.2} color="#38bdf8" />

                        <CosmologicalGrid progress={progress} />

                        {/* Alineación horizontal directa (Eje X) */}
                        <group rotation={[0, 0, 0]}>
                            <PhotonModel progress={progress} isPlaying={isPlaying} />
                        </group>

                        <EffectComposer>
                            <Bloom
                                luminanceThreshold={0.0}   // Todo el fotón recibe bloom (umbral mínimo)
                                luminanceSmoothing={0.95}  // Muy suave/difuso
                                height={150}               // Baja resolución = bloom más difuso/borroso
                                // Blur hasta el 90% de la animación, en pausa mantiene halo visible
                                intensity={
                                    !isPlaying
                                        ? 3.5  // En pausa: halo fuerte para que el punto sea visible
                                        : progress < 0.9
                                            ? 6.0 * (1 - progress / 0.9)  // Inicio muy borroso (6.0), baja a 0 en p=0.9
                                            : 0
                                }
                            />
                        </EffectComposer>

                        <Environment preset="city" />
                    </Canvas>

                    {/* Overlay Info */}
                    <div className="absolute bottom-3 md:bottom-8 left-3 md:left-8 text-[9px] md:text-xs font-mono text-slate-500 pointer-events-none">
                        COORDENADAS: LOCAL<br />
                        MARCO DE REFERENCIA: COMÓVIL
                    </div>
                    {/* Touch gesture hint - mobile only */}
                    <div className="md:hidden absolute bottom-3 right-3 bg-black/50 backdrop-blur px-2 py-1 rounded-full border border-white/10 text-[9px] text-white/60 pointer-events-none">
                        Pellizca para zoom · Desliza para rotar
                    </div>
                </div>

                {/* Control Panel */}
                <div className="h-auto min-h-0 md:min-h-[14rem] bg-slate-900 border-t border-slate-800 p-3 md:p-6 flex flex-col gap-3 md:gap-6 z-20 overflow-y-auto max-h-[40vh] md:max-h-none">

                    {/* Top Row: Metrics and Graph */}
                    <div className="flex flex-col lg:flex-row gap-3 md:gap-6 md:h-auto lg:h-32">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 flex-1">
                            <MetricCard
                                label="Frecuencia"
                                value={fmtFreq}
                                unit="Hz"
                                color="emerald"
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                                history={historyData.freq}
                            />
                            <MetricCard
                                label="Longitud Onda"
                                value={fmtWave}
                                unit="Metros"
                                color="amber"
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
                                history={historyData.wave}
                            />
                            <MetricCard
                                label="Energ�a Fot�n"
                                value={fmtEnergy}
                                unit="eV"
                                color="sky"
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                                history={historyData.energy}
                            />
                            <MetricCard
                                label="Amplitud"
                                value={`${amplitudeMetric.toFixed(1)}%`}
                                unit="Relativa"
                                color="red"
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                                history={historyData.ampl}
                            />
                        </div>

                        {/* Field Scope Graph */}
                        <div className="w-full md:w-[300px] shrink-0">
                            <FieldVibrationScope progress={progress} frequency={frequency} height={124} width={300} />
                        </div>
                    </div>

                    {/* Timeline Controls (Bottom) */}
                    <div className="flex flex-col justify-center gap-2">
                        <div className="flex justify-between text-[10px] md:text-xs font-mono text-slate-400">
                            <span>PUNTO DE EMISI�N (t=380k a�os)</span>
                            <span>PRESENTE (t=13.8M a�os)</span>
                        </div>

                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.001"
                            value={progress}
                            onChange={(e) => {
                                setProgress(parseFloat(e.target.value));
                                setIsPlaying(false);
                            }}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400 transition-all"
                        />

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-4">
                            <button
                                onClick={() => {
                                    if (progress >= 1) {
                                        setProgress(0);
                                        setIsPlaying(true);
                                    } else {
                                        setIsPlaying(!isPlaying);
                                    }
                                }}
                                className={`px-6 py-2 rounded-md font-bold text-sm transition-all flex items-center gap-2 ${isPlaying ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-sky-500/20 text-sky-400 hover:bg-sky-500/30'}`}
                            >
                                {isPlaying ? (
                                    <>
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg> PAUSAR
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg> REPRODUCIR
                                    </>
                                )}
                            </button>

                            <div className="text-white font-mono text-sm whitespace-nowrap">
                                EDAD: <span className="text-sky-400 font-bold">{(0.00038 + progress * 13.8).toFixed(4)} Ga</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


