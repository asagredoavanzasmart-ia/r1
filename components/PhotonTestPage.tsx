import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// Componente del fotón con campos electromagnéticos
const PhotonModel: React.FC<{ progress: number }> = ({ progress }) => {
    const groupRef = useRef<THREE.Group>(null);
    const headRef = useRef<THREE.Mesh>(null);
    const electricFieldRef = useRef<THREE.Line>(null);
    const magneticFieldRef = useRef<THREE.Line>(null);
    const glowRef = useRef<THREE.PointLight>(null);

    // Física del fotón
    const isPrimordial = progress < 0.008;

    // Colores
    const startColor = new THREE.Color('#ffe1b8'); // Blanco-anaranjado
    const endColor = new THREE.Color('#8B0000'); // Rojo oscuro
    const flashColor = new THREE.Color('#FFFFFF');

    const color = isPrimordial ? flashColor : startColor.clone().lerp(endColor, progress);

    // Opacidad general del fotón
    const opacity = progress < 0.7 ? 1.0 : 1.0 - (progress - 0.7) / 0.3 * 0.2; // Menos transparente al final

    // Frecuencia electromagnética (oscilaciones por segundo)
    // Al inicio: 22.5 Hz (50% más rápido), al final: 0.5 Hz (lento)
    const frequency = 22.5 - progress * 22;

    // Longitud de onda (distancia entre picos)
    // Al inicio: muy corta (muchos períodos/picos), al final: muy larga (pocos períodos)
    const wavelength = 9 - progress * 8; // 9 → 1 períodos

    // Velocidad de propagación de la onda
    const waveSpeed = frequency * 3;

    // Amplitud de oscilación
    const amplitude = 0.12;

    // Intensidad del brillo (PointLight)
    // Al final (progress 1) debe ser casi 0 para que no fulgure
    const glowIntensity = Math.max(0, (1 - progress) * 4);

    // Intensidad emisiva (Materiales)
    // Al final debe ser 0.0 para que sea vidrio oscuro y no luz
    // Inicio: 3.0 (brillante), Final: 0.0 (opaco/vidrio)
    const currentEmissiveIntensity = Math.max(0.0, (1 - progress) * 3);

    // Configuración de Bloom dinámico
    const bloomIntensity = Math.max(0, (1 - progress) * 3);
    const bloomThreshold = 0.2 + progress * 0.8; // Threshold muy alto al final

    // LONGITUD VARIABLE DEL CILINDRO
    const BASE_LENGTH = 2.5;
    const MIN_LENGTH = BASE_LENGTH * 0.1;
    const MAX_LENGTH = BASE_LENGTH * 2.3;
    const CYLINDER_LENGTH = MIN_LENGTH + progress * (MAX_LENGTH - MIN_LENGTH);

    // Geometría de la cabeza
    const headGeometry = useMemo(() => {
        return new THREE.SphereGeometry(0.20, 32, 32);
    }, []);

    // Crear campo electromagnético (onda sinusoidal)
    const createElectromagneticField = (time: number, axis: 'x' | 'z') => {
        const points: THREE.Vector3[] = [];
        const segments = 200;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const y = (t - 0.5) * CYLINDER_LENGTH;

            // Fase de la onda (se mueve con el tiempo)
            const phase = time * waveSpeed;

            // Calcular posición de la onda
            const waveValue = amplitude * Math.sin(t * wavelength * Math.PI * 2 - phase);

            if (axis === 'x') {
                // Campo eléctrico (oscila en X)
                points.push(new THREE.Vector3(waveValue, y, 0));
            } else {
                // Campo magnético (oscila en Z, perpendicular)
                points.push(new THREE.Vector3(0, y, waveValue));
            }
        }

        return points;
    };

    const [electricPoints, setElectricPoints] = useState<THREE.Vector3[]>([]);
    const [magneticPoints, setMagneticPoints] = useState<THREE.Vector3[]>([]);

    const electricGeometry = useMemo(() => {
        return new THREE.BufferGeometry().setFromPoints(electricPoints.length ? electricPoints : [new THREE.Vector3()]);
    }, [electricPoints]);

    const magneticGeometry = useMemo(() => {
        return new THREE.BufferGeometry().setFromPoints(magneticPoints.length ? magneticPoints : [new THREE.Vector3()]);
    }, [magneticPoints]);

    // Animación
    useFrame((state) => {
        if (!groupRef.current) return;

        const time = state.clock.getElapsedTime();

        // Rotación suave del grupo
        groupRef.current.rotation.y = time * 0.15;

        // Actualizar campos electromagnéticos
        const newElectricPoints = createElectromagneticField(time, 'x');
        const newMagneticPoints = createElectromagneticField(time, 'z');

        setElectricPoints(newElectricPoints);
        setMagneticPoints(newMagneticPoints);

        // Pulsar la cabeza (reducido al final para evitar efecto fulgurante)
        if (headRef.current) {
            // Amplitud del pulso se reduce con progress (0.08 -> 0.02)
            const pulseAmp = 0.08 * (1 - progress * 0.75);
            const pulse = 1 + Math.sin(time * frequency * 2) * pulseAmp;
            headRef.current.scale.setScalar(pulse);
        }

        // Actualizar intensidad de luz (flicker rápido al inicio)
        if (glowRef.current) {
            const flicker = 1 + Math.sin(time * frequency * 4) * 0.3;
            glowRef.current.intensity = glowIntensity * flicker;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Luz puntual dinámica */}
            <pointLight
                ref={glowRef}
                position={[0, CYLINDER_LENGTH / 2, 0]}
                color={color}
                intensity={glowIntensity}
                distance={6}
                decay={2}
            />

            {/* Cabeza esférica - Vidrio tintado al final */}
            <mesh
                ref={headRef}
                position={[0, CYLINDER_LENGTH / 2, 0]}
                geometry={headGeometry}
            >
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={currentEmissiveIntensity}
                    transparent
                    opacity={opacity}
                    roughness={0.1 + progress * 0.3} // Más opaco (mate) al final
                    metalness={0.3 - progress * 0.2} // Menos metálico al final
                />
            </mesh>

            {/* Cilindro ELIMINADO por solicitud del usuario */}

            {/* Campo Eléctrico (oscila en X) - COLOR DEL FOTÓN */}
            {electricPoints.length > 0 && (
                <mesh>
                    <tubeGeometry args={[
                        new THREE.CatmullRomCurve3(electricPoints),
                        200,
                        0.022,
                        8,
                        false
                    ]} />
                    <meshStandardMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={currentEmissiveIntensity}
                        transparent
                        opacity={opacity * 0.9}
                    />
                </mesh>
            )}

            {/* Campo Magnético (oscila en Z, perpendicular) - COLOR DEL FOTÓN */}
            {magneticPoints.length > 0 && (
                <mesh>
                    <tubeGeometry args={[
                        new THREE.CatmullRomCurve3(magneticPoints),
                        200,
                        0.022,
                        8,
                        false
                    ]} />
                    <meshStandardMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={currentEmissiveIntensity}
                        transparent
                        opacity={opacity * 0.9}
                    />
                </mesh>
            )}
        </group>
    );
};

// Página de prueba
const PhotonTestPage: React.FC = () => {
    const [progress, setProgress] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [showBloom, setShowBloom] = useState(true);

    React.useEffect(() => {
        if (!isAnimating) return;

        const interval = setInterval(() => {
            setProgress(p => {
                const newP = p + 0.001;
                if (newP >= 1) {
                    setIsAnimating(false);
                    return 0;
                }
                return newP;
            });
        }, 20);

        return () => clearInterval(interval);
    }, [isAnimating]);

    const energyPercent = ((1 - progress) * 100).toFixed(0);
    const frequency = (22.5 - progress * 22).toFixed(2);
    const wavelength = (9 - progress * 8).toFixed(2);
    const photonLength = (0.25 + progress * 5.5).toFixed(2); // 0.25 → 5.75
    const wavelengthType = progress < 0.3 ? 'UV/Visible (λ muy corta)' : progress < 0.7 ? 'Visible/IR (λ media)' : 'Infrarrojo (λ muy larga)';

    // Variables dinámicas para el EffectComposer pasadas como props o variables globales en este scope no funcionan directo en JSX
    // Calculamos aquí para usar en el componente Bloom
    const bloomIntensity = Math.max(0, (1 - progress) * 3);
    const bloomThreshold = 0.2 + progress * 0.6; // Sube hasta 0.8

    return (
        <div className="w-full h-screen bg-black flex flex-col md:flex-row">
            {/* Canvas 3D */}
            <div className="flex-1 relative">
                <Canvas camera={{ position: [0, 0, 5], fov: 50 }} gl={{ antialias: true }}>
                    <color attach="background" args={['#000000']} />

                    <ambientLight intensity={0.08} />

                    <PhotonModel progress={progress} />

                    {showBloom && (
                        <EffectComposer>
                            <Bloom
                                luminanceThreshold={bloomThreshold}
                                luminanceSmoothing={0.9}
                                intensity={bloomIntensity}
                                radius={0.85}
                                maxDistance={10}
                            />
                        </EffectComposer>
                    )}
                    <OrbitControls
                        enablePan={false}
                        minDistance={2.5}
                        maxDistance={10}
                    />
                </Canvas>

                <div className="absolute top-4 left-4 bg-black/90 p-4 rounded-lg border border-emerald-500/50 backdrop-blur-sm">
                    <h2 className="text-emerald-400 font-bold mb-2">Fotón Electromagnético CMB</h2>
                    <p className="text-slate-400 text-xs mb-3">Arrastra para rotar • Scroll para zoom</p>

                    <div className="space-y-2 text-xs text-slate-300">
                        <p>• <strong>Dos campos perpendiculares</strong></p>
                        <p>• Oscilando en X y Z</p>
                        <p>• Mismo color del fotón</p>
                        <p>• Visibles a través del cilindro</p>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={showBloom}
                            onChange={(e) => setShowBloom(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <span className="text-white text-xs">Bloom (Resplandor)</span>
                    </div>
                </div>
            </div>

            {/* Panel de control */}
            <div className="w-full md:w-96 bg-slate-900 p-6 overflow-y-auto border-t md:border-t-0 md:border-l border-slate-700">
                <h1 className="text-2xl font-bold text-white mb-4">⚡ Campos Electromagnéticos</h1>

                {/* Métricas */}
                <div className="space-y-3 mb-6">
                    <div className="flex justify-between p-3 bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 rounded border border-emerald-700/50">
                        <span className="text-emerald-200 text-sm font-medium">Energía</span>
                        <span className="text-emerald-400 font-mono font-bold text-lg">{energyPercent}%</span>
                    </div>

                    <div className="flex justify-between p-3 bg-slate-800 rounded border border-slate-700">
                        <span className="text-slate-400 text-sm">Frecuencia (ν)</span>
                        <span className="text-cyan-400 font-mono">{frequency} Hz</span>
                    </div>

                    <div className="flex justify-between p-3 bg-slate-800 rounded border border-slate-700">
                        <span className="text-slate-400 text-sm">Períodos (λ)</span>
                        <span className="text-magenta-400 font-mono">{wavelength}</span>
                    </div>

                    <div className="flex justify-between p-3 bg-slate-800 rounded border border-slate-700">
                        <span className="text-slate-400 text-sm">Longitud Fotón</span>
                        <span className="text-yellow-400 font-mono">{photonLength} u</span>
                    </div>

                    <div className="flex justify-between p-3 bg-slate-800 rounded border border-slate-700">
                        <span className="text-slate-400 text-sm">Tipo</span>
                        <span className="text-purple-400 text-xs font-medium">{wavelengthType}</span>
                    </div>

                    <div className="flex justify-between p-3 bg-slate-800 rounded border border-slate-700">
                        <span className="text-slate-400 text-sm">Opacidad</span>
                        <span className="text-orange-400 font-mono">
                            {(progress < 0.7 ? 100 : (100 - (progress - 0.7) / 0.3 * 50)).toFixed(0)}%
                        </span>
                    </div>
                </div>

                {/* Slider */}
                <div className="mb-6">
                    <label className="block text-white font-medium mb-2 text-sm">
                        Redshift (z) - Expansión Cósmica
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.001"
                        value={progress}
                        onChange={(e) => setProgress(parseFloat(e.target.value))}
                        className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                        <span>t=380,000 años</span>
                        <span className="text-white font-mono">{(progress * 100).toFixed(1)}%</span>
                        <span>Hoy (t=13.8 Ga)</span>
                    </div>
                </div>

                {/* Controles */}
                <div className="space-y-3 mb-6">
                    <button
                        onClick={() => setIsAnimating(!isAnimating)}
                        className={`w-full py-3 rounded-lg font-bold transition-all shadow-lg ${isAnimating
                            ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
                            : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white'
                            }`}
                    >
                        {isAnimating ? '⏸ Pausar' : '▶ Animar Redshift'}
                    </button>

                    <button
                        onClick={() => setProgress(0)}
                        className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                    >
                        ↺ Reset
                    </button>
                </div>

                {/* Info */}
                <div className="space-y-3 text-xs">
                    <div className="p-3 bg-gradient-to-br from-emerald-900/20 to-slate-900/20 border border-emerald-700/30 rounded-lg">
                        <h3 className="text-white font-bold mb-2">⚡ Ondas Electromagnéticas</h3>
                        <ul className="space-y-1 text-slate-300">
                            <li>• <strong>Campo E:</strong> Oscila en eje X</li>
                            <li>• <strong>Campo B:</strong> Oscila en eje Z</li>
                            <li>• Perpendiculares entre sí (90°)</li>
                            <li>• Se propagan en eje Y</li>
                            <li>• Mismo color del fotón</li>
                            <li>• Alta frecuencia = zumbido rápido</li>
                            <li>• Baja frecuencia = oscilación lenta</li>
                        </ul>
                    </div>

                    <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg">
                        <h3 className="text-emerald-400 font-bold mb-2">🔧 Características Dinámicas</h3>
                        <ul className="space-y-1 text-slate-400">
                            <li>• Longitud variable (10% → 230%)</li>
                            <li>• Inicio: 0.25u, Final: 5.75u</li>
                            <li>• Cola con fade-out en último 20%</li>
                            <li>• Frecuencia: 22.5 Hz → 0.5 Hz</li>
                            <li>• Cilindro color del fotón (18% opacidad)</li>
                            <li>• Ondas visibles a través del tubo</li>
                            <li>• Bloom effect dinámico</li>
                            <li>• Flicker según frecuencia</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhotonTestPage;
