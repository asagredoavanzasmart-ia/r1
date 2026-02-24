import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Componente del fotón con campos electromagnéticos
export const PhotonModel: React.FC<{ progress: number; isPlaying: boolean }> = ({ progress, isPlaying }) => {
    const groupRef = useRef<THREE.Group>(null);
    const headRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.PointLight>(null);

    // Física del fotón
    const isPrimordial = progress < 0.008;

    // Colores
    const startColor = new THREE.Color('#ffe1b8'); // Blanco-anaranjado
    const endColor = new THREE.Color('#8B0000'); // Rojo oscuro
    const flashColor = new THREE.Color('#FFFFFF');

    const color = isPrimordial ? flashColor : startColor.clone().lerp(endColor, progress);

    // Opacidad general del fotón - mínimo 10% siempre
    const opacity = progress < 0.7 ? 1.0 : Math.max(0.1, 1.0 - (progress - 0.7) / 0.3 * 0.9);

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
            // Modificado: Extender a lo largo del eje X (Horizontal) en lugar de Y
            // x va de -CYLINDER_LENGTH/2 a +CYLINDER_LENGTH/2
            const x = (t - 0.5) * CYLINDER_LENGTH;

            // Fase de la onda (se mueve con el tiempo)
            const phase = time * waveSpeed;

            // Calcular posición de la onda
            const waveValue = amplitude * Math.sin(t * wavelength * Math.PI * 2 - phase);

            if (axis === 'x') {
                // Campo eléctrico (Oscila en Y, propaga en X) -> Vertical en vista horizontal
                points.push(new THREE.Vector3(x, waveValue, 0));
            } else {
                // Campo magnético (Oscila en Z, propaga en X) -> Profundidad en vista horizontal
                points.push(new THREE.Vector3(x, 0, waveValue));
            }
        }

        return points;
    };

    const [electricPoints, setElectricPoints] = useState<THREE.Vector3[]>([]);
    const [magneticPoints, setMagneticPoints] = useState<THREE.Vector3[]>([]);

    // Acumulador de fase para evitar saltos cuando cambia la frecuencia
    const phaseRef = useRef(0);

    // Animación
    useFrame((state, delta) => {
        if (!groupRef.current) return;

        const time = state.clock.getElapsedTime();

        // Rotación suave del grupo (Opcional: Si queremos que rote sobre su eje de propagación X)
        // groupRef.current.rotation.x = time * 0.15; 

        // Rotar ligeramente en X para dar volumen 3D al verlo de lado
        // Antes era rotation.x, pero al estar rotado -PI/2 en el padre, el eje local cambia.
        // Si el fotón está en X, rotar sobre X es spin.
        groupRef.current.rotation.x = time * 0.2;

        // ACUMULACIÓN DE FASE INTEGRAL
        phaseRef.current += waveSpeed * delta;

        // AMPLITUD DINÁMICA (Vinculada al tamaño del fotón)
        // El usuario pide aumentar el tamaño inicial y disminuir el final
        // Inicio: 1.5x (antes ~1.0)
        // Final: 0.2x (antes 0.5)
        const currentAmplitudeScale = 1.5 - progress * 1.3; // 1.5 -> 0.2

        // Amplitud de la onda (física visual)
        // Base amplitude was 0.12. Now scaling it.
        const waveAmplitude = 0.12 * currentAmplitudeScale;

        // Actualizar campos electromagnéticos
        const createElectromagneticFieldWithPhase = (currentPhase: number, axis: 'x' | 'z') => {
            const points: THREE.Vector3[] = [];
            const segments = 200;

            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const x = (t - 0.5) * CYLINDER_LENGTH;

                const localPhase = currentPhase;

                // Usar waveAmplitude dinámica
                const waveValue = waveAmplitude * Math.sin(t * wavelength * Math.PI * 2 - localPhase);

                if (axis === 'x') {
                    points.push(new THREE.Vector3(x, waveValue, 0));
                } else {
                    points.push(new THREE.Vector3(x, 0, waveValue));
                }
            }

            return points;
        };

        const newElectricPoints = createElectromagneticFieldWithPhase(phaseRef.current, 'x');
        const newMagneticPoints = createElectromagneticFieldWithPhase(phaseRef.current, 'z');

        setElectricPoints(newElectricPoints);
        setMagneticPoints(newMagneticPoints);

        // Pulsar la cabeza
        if (headRef.current) {
            // Amplitud del pulso
            const pulseAmp = 0.08 * (1 - progress * 0.75);

            // Escala base vinculada a la amplitud
            const baseScale = currentAmplitudeScale;

            const pulse = baseScale + Math.sin(time * frequency * 2) * pulseAmp;
            headRef.current.scale.setScalar(pulse);
        }

        // Actualizar intensidad de luz (vinculada también a la amplitud/energía)
        if (glowRef.current) {
            const flicker = 1 + Math.sin(time * frequency * 4) * 0.3;
            // Mantener fulgurancia cuando está pausado
            glowRef.current.intensity = isPlaying ? glowIntensity * flicker * currentAmplitudeScale : 2.5 * flicker;
        }

        // --- PAUSE EFFECT: INFINITESIMAL HEAD ---
        if (!isPlaying) {
            if (headRef.current) headRef.current.scale.setScalar(0.08); // Visible pero pequeño
            // Fields cleared when paused
            setElectricPoints([]);
            setMagneticPoints([]);
            return; // Skip field generation
        }

        // Ensure head always has a minimum visible scale even when playing
        if (headRef.current) {
            const currentScale = headRef.current.scale.x;
            if (currentScale < 0.05) headRef.current.scale.setScalar(0.05);
        }
    });

    return (
        <group ref={groupRef}>
            {/* Luz puntual dinámica - Posición actualizada a X */}
            <pointLight
                ref={glowRef}
                position={[CYLINDER_LENGTH / 2, 0, 0]}
                color={color}
                intensity={glowIntensity}
                distance={6}
                decay={2}
            />

            {/* Cabeza esférica - Posición actualizada a punta en X */}
            <mesh
                ref={headRef}
                position={[CYLINDER_LENGTH / 2, 0, 0]}
                geometry={headGeometry}
            >
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={currentEmissiveIntensity}
                    transparent
                    opacity={opacity}
                    roughness={0.1 + progress * 0.3}
                    metalness={0.3 - progress * 0.2}
                />
            </mesh>

            {/* Campo Eléctrico (oscila en Y) */}
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

            {/* Campo Magnético (oscila en Z) */}
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
