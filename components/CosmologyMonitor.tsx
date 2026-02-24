import React, { useEffect, useRef, useMemo, useState } from 'react';
import { COSMO_CONSTANTS, calculateScaleFactor } from '../utils/cosmology';

interface MonitorProps {
    progress: number;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onRestart: () => void;
}

const CosmologyMonitor: React.FC<MonitorProps> = ({ progress, isPlaying, onTogglePlay, onRestart }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const largeCanvasRef = useRef<HTMLCanvasElement>(null);

    // Pre-calculate expansion curve for the monitor graph
    const curveData = useMemo(() => {
        const points = [];
        const steps = 200; // More resolution for large graph
        for (let i = 0; i <= steps; i++) {
            const p = i / steps;
            const a = calculateScaleFactor(p);
            points.push({ p, a });
        }
        return points;
    }, []);

    // Scientific indicators based on current progress
    const current_a = calculateScaleFactor(progress);
    const z = (1 / current_a) - 1;
    const t_gyr = (COSMO_CONSTANTS.age_recombination + (COSMO_CONSTANTS.age_now - COSMO_CONSTANTS.age_recombination) * progress) / 1e9;

    // Hubble parameter H(a) as per Friedmann eq
    const H_t = 67.4 * Math.sqrt(COSMO_CONSTANTS.Omega_m * Math.pow(current_a, -3) + COSMO_CONSTANTS.Omega_lambda);

    const drawGraph = (canvas: HTMLCanvasElement | null, isLarge: boolean) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        const padding = isLarge ? 50 : 30;

        ctx.clearRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const gradSteps = 4;
        for (let i = 0; i <= gradSteps; i++) {
            const x = padding + (i / gradSteps) * (w - 2 * padding);
            const y = padding + (i / gradSteps) * (h - 2 * padding);
            ctx.moveTo(x, padding);
            ctx.lineTo(x, h - padding);
            ctx.moveTo(padding, y);
            ctx.lineTo(w - padding, y);
        }
        ctx.stroke();

        // Expansion Curve
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = isLarge ? 3 : 2;
        ctx.beginPath();
        curveData.forEach((pt, i) => {
            const x = padding + pt.p * (w - 2 * padding);
            const y = (h - padding) - (pt.a * (h - 2 * padding));
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Time Indicator Line
        const indicatorX = padding + progress * (w - 2 * padding);
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(indicatorX, padding);
        ctx.lineTo(indicatorX, h - padding);
        ctx.stroke();
        ctx.setLineDash([]);

        // Current Status Dot
        const currentY = (h - padding) - (current_a * (h - 2 * padding));
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(indicatorX, currentY, isLarge ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fbbf24';
        ctx.stroke();
        ctx.shadowBlur = 0;
    };

    useEffect(() => {
        drawGraph(canvasRef.current, false);
        if (isExpanded) drawGraph(largeCanvasRef.current, true);
    }, [progress, curveData, current_a, isExpanded]);

    return (
        <>
            <div className="flex flex-col gap-3 bg-slate-950/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl pointer-events-auto group">
                <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">Monitor Cosmográfico</span>
                        <button
                            onClick={() => setIsExpanded(true)}
                            className="w-4 h-4 rounded-full border border-sky-500/50 text-sky-400 text-[9px] flex items-center justify-center hover:bg-sky-500 hover:text-white transition-all ml-1 shadow-[0_0_5px_rgba(14,165,233,0.3)]"
                        >
                            i
                        </button>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">LCDM_STD_MODEL_1.2</span>
                </div>

                <div className="relative w-full h-32 bg-black/40 rounded-lg border border-slate-800/50 overflow-hidden cursor-crosshair">
                    <canvas ref={canvasRef} width={240} height={128} className="w-full h-full" />
                    <div className="absolute top-2 left-2 text-[8px] font-mono text-slate-500 uppercase">a(t)</div>
                    <div className="absolute bottom-1 right-2 text-[8px] font-mono text-slate-500 uppercase">Tiempo</div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono">
                    <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500 uppercase">H(t)</span>
                        <span className="text-xs text-amber-400 font-bold">{H_t.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[8px] text-slate-500 uppercase">z</span>
                        <span className="text-xs text-sky-400 font-bold">{z.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-in fade-in duration-300">
                    <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-3xl p-8 flex flex-col gap-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" />

                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">Análisis Cinematográfico del Universo</h2>
                                <p className="text-sm text-slate-500 font-mono mt-1 uppercase tracking-widest">Métrica Friedmann-Lemaître-Robertson-Walker (FLRW)</p>
                            </div>
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="p-3 bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-2xl transition-all border border-slate-800"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
                            {/* Large Graph Section */}
                            <div className="lg:col-span-2 flex flex-col gap-4">
                                <div className="relative aspect-video bg-black/50 rounded-2xl border border-slate-800 shadow-inner p-4 overflow-hidden">
                                    <canvas ref={largeCanvasRef} width={800} height={450} className="w-full h-full" />
                                    <div className="absolute top-6 left-6 flex flex-col gap-1">
                                        <span className="text-[10px] text-sky-500 font-bold tracking-widest uppercase">Factor de Escala (Expansion Factor)</span>
                                        <span className="text-xs text-slate-400">Normalizado a(t_presente) = 1.0</span>
                                    </div>
                                </div>

                                {/* Simulation Control In-Modal */}
                                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 bg-slate-900/40 p-3 md:p-4 rounded-2xl border border-slate-800/50">
                                    <button
                                        onClick={onRestart}
                                        className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg hover:scale-105 active:scale-95"
                                    >
                                        <span>REINICIAR</span>
                                    </button>
                                    <button
                                        onClick={onTogglePlay}
                                        className={`px-6 py-3 border border-slate-700 rounded-xl text-sm font-bold transition-all ${isPlaying ? 'bg-slate-800 text-slate-400' : 'bg-white text-black hover:bg-slate-100'}`}
                                    >
                                        {isPlaying ? 'PAUSAR' : 'CONTINUAR'}
                                    </button>
                                    <div className="flex-1" />
                                    <div className="px-4 py-2 bg-slate-950/80 rounded-lg border border-slate-800 font-mono text-center">
                                        <span className="text-[10px] text-slate-500 block">PROGRESO</span>
                                        <span className="text-sky-400">{(progress * 100).toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Formulas & Telemetry Section */}
                            <div className="flex flex-col gap-6">
                                <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/50 flex flex-col gap-6">
                                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Telemetría Avanzada</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end border-b border-slate-800 pb-2">
                                            <span className="text-xs text-slate-400">Hubble H(t)</span>
                                            <span className="text-xl font-mono font-bold text-amber-400">{H_t.toFixed(3)}</span>
                                        </div>
                                        <div className="flex justify-between items-end border-b border-slate-800 pb-2">
                                            <span className="text-xs text-slate-400">Edad (Gyr)</span>
                                            <span className="text-xl font-mono font-bold text-white">{t_gyr.toFixed(4)}</span>
                                        </div>
                                        <div className="flex justify-between items-end border-b border-slate-800 pb-2">
                                            <span className="text-xs text-slate-400">Escala a(t)</span>
                                            <span className="text-xl font-mono font-bold text-emerald-400">{current_a.toFixed(6)}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-col gap-4">
                                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Fundamento Teórico</h4>
                                        <div className="flex flex-col gap-3 font-mono text-xs text-slate-300 italic bg-black/40 p-4 rounded-xl border border-white/5">
                                            <div className="p-2 border-l-2 border-sky-500 bg-sky-500/5">
                                                <span className="text-sky-400 block mb-1">Friedmann (Flat Universe):</span>
                                                H² = H₀² [ Ωₘ a⁻³ + Ωᵣ a⁻⁴ + Ωᵨ ]
                                            </div>
                                            <div className="p-2 border-l-2 border-amber-500 bg-amber-500/5">
                                                <span className="text-amber-400 block mb-1">Ley de Hubble:</span>
                                                v(d) = H(t) · d
                                            </div>
                                            <div className="p-2 border-l-2 border-emerald-500 bg-emerald-500/5 opacity-60">
                                                <span className="text-emerald-400 block mb-1">Factor Escala:</span>
                                                a(t) ∝ sinh(t)^(2/3)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 p-4 border-t border-slate-800 flex justify-center">
                            <p className="text-[10px] text-slate-600 uppercase tracking-tighter">Parámetros Planck 2018: H₀=67.4 | Ωₘ=0.315 | Ωᵨ=0.685 | Universo Plano (k=0)</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CosmologyMonitor;
