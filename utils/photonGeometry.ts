import * as THREE from 'three';

/**
 * Creates a photon capsule geometry (sphere head + cylindrical tail)
 * @param headRadius - Radius of the spherical head
 * @param bodyLength - Length of the cylindrical body
 * @param bodyRadius - Radius of the cylindrical body
 * @returns Combined geometry
 */
export const createPhotonCapsuleGeometry = (
    headRadius: number = 0.08,
    bodyLength: number = 0.3,
    bodyRadius: number = 0.04
): THREE.BufferGeometry => {
    // Create head (sphere)
    const headGeometry = new THREE.SphereGeometry(headRadius, 8, 8);
    headGeometry.translate(bodyLength / 2, 0, 0); // Move to front

    // Create body (cylinder)
    const bodyGeometry = new THREE.CylinderGeometry(bodyRadius, bodyRadius, bodyLength, 8);
    bodyGeometry.rotateZ(Math.PI / 2); // Rotate to horizontal

    // Merge geometries
    const mergedGeometry = new THREE.BufferGeometry();
    const headPositions = headGeometry.attributes.position;
    const bodyPositions = bodyGeometry.attributes.position;

    const totalVertices = headPositions.count + bodyPositions.count;
    const positions = new Float32Array(totalVertices * 3);

    // Copy head vertices
    for (let i = 0; i < headPositions.count; i++) {
        positions[i * 3] = headPositions.getX(i);
        positions[i * 3 + 1] = headPositions.getY(i);
        positions[i * 3 + 2] = headPositions.getZ(i);
    }

    // Copy body vertices
    const offset = headPositions.count;
    for (let i = 0; i < bodyPositions.count; i++) {
        positions[(offset + i) * 3] = bodyPositions.getX(i);
        positions[(offset + i) * 3 + 1] = bodyPositions.getY(i);
        positions[(offset + i) * 3 + 2] = bodyPositions.getZ(i);
    }

    mergedGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    mergedGeometry.computeVertexNormals();

    return mergedGeometry;
};

/**
 * Creates a sine wave geometry to represent oscillating light wave inside photon
 * @param amplitude - Wave amplitude
 * @param frequency - Number of complete waves
 * @param length - Total length of the wave
 * @param segments - Number of segments for smoothness
 * @returns Line geometry
 */
export const createWaveGeometry = (
    amplitude: number = 0.03,
    frequency: number = 5,
    length: number = 0.3,
    segments: number = 50
): THREE.BufferGeometry => {
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = (t - 0.5) * length; // Center at origin
        const y = amplitude * Math.sin(t * frequency * Math.PI * 2);
        points.push(new THREE.Vector3(x, y, 0));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
};

/**
 * Calculate photon color based on energy/wavelength
 * High energy (short wavelength) = warm white-orange #ffe1b8
 * Low energy (long wavelength) = red with reduced opacity
 */
export const getPhotonEnergyColor = (progress: number): { color: THREE.Color; opacity: number } => {
    const isPrimordial = progress < 0.008;

    if (isPrimordial) {
        // Flash white at Big Bang
        return {
            color: new THREE.Color('#F9EED7'),
            opacity: 1.0
        };
    }

    // Start with warm white-orange
    const startColor = new THREE.Color('#ffe1b8');
    // End with deep red
    const endColor = new THREE.Color('#8B0000');

    // Color progresses faster than physics (visible spectrum ends ~70%)
    const colorProgress = Math.min(1, progress * 1.5);
    const currentColor = startColor.clone().lerp(endColor, colorProgress);

    // Opacity decreases as it becomes infrared (invisible)
    // Stays at 100% until 70% progress, then drops to 50%
    const opacityFactor = progress < 0.7 ? 1.0 : 1.0 - (progress - 0.7) / 0.3 * 0.5;

    return {
        color: currentColor,
        opacity: Math.max(0.5, opacityFactor)
    };
};

/**
 * Calculate wave frequency (oscillations per unit) based on photon energy
 * High energy = high frequency (many oscillations)
 * Low energy = low frequency (few oscillations)
 */
export const getWaveFrequency = (progress: number): number => {
    // Start with high frequency (short wavelength)
    const startFreq = 8;
    // End with low frequency (long wavelength)
    const endFreq = 1;

    return startFreq - (startFreq - endFreq) * progress;
};
