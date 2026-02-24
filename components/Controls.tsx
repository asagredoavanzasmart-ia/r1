import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationState } from '../types';
import { calculateScaleFactor, calculateRedshift, calculateTemperature, calculateUniverseAge } from '../utils/cosmology';

interface ControlsProps {
  state: SimulationState;
  setState: React.Dispatch<React.SetStateAction<SimulationState>>;
  hoverData: { z: number, T: number } | null;
  toggleContext: () => void;
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  onOpenInspector?: () => void;
}

// === CONSTANTS & ASSETS ===
const PLANCK_MAP_URL = "https://apod.nasa.gov/apod/image/1303/cmbr_planck_3600.jpg";
const STRUCTURE_MAP_URL = "https://pablocarlosbudassi.com/wp-content/uploads/2024/02/ouli202020SPANISH20for20social.jpg";
const WMAP_EMBED_URL = "https://sketchfab.com/models/7721055e1800494995c15e97605d7fa8/embed?autostart=1&ui_theme=dark";
const EXPANSION_MAP_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Evolucion_Universo_CMB_Timeline300_no_WMAP.jpg/1200px-Evolucion_Universo_CMB_Timeline300_no_WMAP.jpg";
const CMB_PANORAMA_URL = "https://asagredoavanzasmart-ia.github.io/r1/cmb_360_real.jpg?v=2"; // Updated to verified 360 image loaded from GitHub Pages with cache buster

type ModalType = 'PLANCK' | 'STRUCTURE' | 'WMAP' | 'EXPANSION' | 'OBSERVER_POV' | null;

// === UTILITY COMPONENTS ===

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-flex ml-2 items-center justify-center translate-y-0.5">
    <div className="w-3.5 h-3.5 rounded-full border border-slate-500 text-slate-400 text-[9px] font-serif italic flex items-center justify-center cursor-help hover:text-sky-300 hover:border-sky-300 transition-colors bg-slate-800/50">i</div>
    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-48 p-2.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] pointer-events-none transform translate-x-2 group-hover:translate-x-0">
      <p className="text-[10px] text-slate-300 font-sans leading-relaxed">{text}</p>
      <div className="absolute top-1/2 right-full -translate-y-1/2 border-[5px] border-transparent border-r-slate-700/50"></div>
    </div>
  </div>
);

// Toggle Switch Component
const ToggleSwitch = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <div onClick={onClick} className="flex items-center justify-between py-2.5 px-3 hover:bg-slate-800/40 rounded-lg cursor-pointer transition-colors group">
    <span className="text-[11px] font-medium text-slate-300 group-hover:text-white">{label}</span>
    <div className={`relative w-10 h-5 rounded-full transition-all duration-300 ${active ? 'bg-sky-500' : 'bg-slate-700'}`}>
      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-md ${active ? 'translate-x-5' : 'translate-x-0'}`}></div>
    </div>
  </div>
);

// Slider Control Component
const SliderControl = ({ label, value, onChange, min = 0, max = 100, step = 1 }: { label: string; value: number; onChange: (val: number) => void; min?: number; max?: number; step?: number }) => (
  <div className="py-2.5 px-3">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-[11px] font-mono text-sky-400">{value}%</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400"
    />
  </div>
);

// Mode Button (Left Panel)
const ModeButton = ({ icon, label, sublabel, onClick }: { icon: React.ReactNode; label: string; sublabel: string; onClick: () => void }) => (
  <button onClick={onClick} className="w-full text-left bg-slate-900/40 hover:bg-slate-800/60 backdrop-blur-md border border-slate-800/50 hover:border-sky-500/30 p-3 rounded-xl group transition-all duration-300 flex items-center gap-3">
    <div className="w-9 h-9 rounded-lg bg-slate-950/50 group-hover:bg-sky-900/20 flex items-center justify-center text-slate-400 group-hover:text-sky-400 transition-colors border border-slate-800 group-hover:border-sky-500/20 shadow-inner">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[11px] font-bold text-slate-200 group-hover:text-white leading-tight truncate">{label}</div>
      <div className="text-[9px] text-slate-500 group-hover:text-sky-200/60 truncate">{sublabel}</div>
    </div>
    <svg className="w-3 h-3 text-slate-600 group-hover:text-sky-500/50 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
  </button>
);

// Simple Error Boundary for R3F
class ErrorBoundary extends React.Component<{ children: React.ReactNode, fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const PanoramaViewer = ({ url }: { url: string }) => {
  const texture = useTexture(url);
  return (
    <mesh>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
};

const PanoramaCanvas = ({ url }: { url: string }) => (
  <div className="w-full h-full relative bg-black group rounded-xl overflow-hidden shadow-inner">
    <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }}>
      <ambientLight intensity={1} />
      <ErrorBoundary fallback={<Html center><div className="text-red-400 text-xs">Error de carga VR</div></Html>}>
        <Suspense fallback={<Html center><span className="text-sky-400 text-xs animate-pulse">Cargando experiencia VR...</span></Html>}>
          <PanoramaViewer url={url} />
        </Suspense>
      </ErrorBoundary>
      <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={-0.5} />
    </Canvas>
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur px-3 py-1 rounded-full border border-white/5 text-[9px] text-white/70">Arrastra para girar</div>
  </div>
);

const UniversalModal = ({ type, onClose }: { type: ModalType, onClose: () => void }) => {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const isImg = ['PLANCK', 'STRUCTURE', 'EXPANSION'].includes(type || '');
  const config = {
    PLANCK: { t: "Fondo Cósmico (Planck)", s: "ESA / Planck", d: "Mapa de temperatura del universo temprano.", u: PLANCK_MAP_URL, l: PLANCK_MAP_URL },
    STRUCTURE: { t: "Estructura Universo", s: "Pablo Carlos Budassi", d: "Mapa logarítmico del universo conocido.", u: STRUCTURE_MAP_URL, l: STRUCTURE_MAP_URL },
    WMAP: { t: "Modelo 3D (WMAP)", s: "NASA / Sketchfab", d: "Modelo interactivo de la esfera celeste.", u: WMAP_EMBED_URL, l: "https://sketchfab.com/3d-models/universe-wmap-7721055e1800494995c15e97605d7fa8" },
    EXPANSION: { t: "Cronología Expansión", s: "NASA", d: "Evolución desde el Big Bang.", u: EXPANSION_MAP_URL, l: EXPANSION_MAP_URL },
    OBSERVER_POV: { t: "Vista del Observador", s: "NASA / WMAP", d: "Proyección completa del cielo.", u: CMB_PANORAMA_URL, l: "https://map.gsfc.nasa.gov/media/121238/index.html" }
  }[type || 'PLANCK'];

  const wheel = (e: React.WheelEvent) => { if (!isImg) return; setScale(Math.max(0.5, Math.min(8, scale - e.deltaY * 0.002))); };
  const down = (e: React.MouseEvent) => { if (!isImg) return; setDragging(true); setStartPan({ x: e.clientX - pos.x, y: e.clientY - pos.y }); };
  const move = (e: React.MouseEvent) => { if (dragging && isImg) setPos({ x: e.clientX - startPan.x, y: e.clientY - startPan.y }); };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full h-full md:max-w-5xl md:h-[85vh] bg-slate-950/90 border-0 md:border border-slate-800 md:rounded-2xl flex flex-col overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-500/20 text-white/50 hover:text-red-400 rounded-full transition-colors z-50 border border-white/5">✕</button>

        <div ref={ref} className="flex-grow relative bg-black/50 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
          onWheel={wheel} onMouseDown={down} onMouseMove={move} onMouseUp={() => setDragging(false)} onMouseLeave={() => setDragging(false)}>
          {isImg ? (
            <img src={config.u} alt={config.t} className="max-w-none shadow-2xl transition-transform duration-75 ease-linear" style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }} draggable={false} />
          ) : type === 'OBSERVER_POV' ? <PanoramaCanvas url={config.u} /> : (
            <iframe title={config.t} src={config.u} className="w-full h-full border-0" allowFullScreen></iframe>
          )}
          {isImg && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur border border-white/10 px-4 py-2 rounded-full flex items-center gap-3 md:gap-4 shadow-xl z-50">
              <button onClick={() => setScale(s => Math.max(0.2, s - 0.5))} className="text-white hover:text-sky-400 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-lg font-bold transition-colors">-</button>
              <span className="text-xs font-mono text-slate-400 w-12 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(8, s + 0.5))} className="text-white hover:text-sky-400 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-lg font-bold transition-colors">+</button>
              <button onClick={() => { setScale(1); setPos({ x: 0, y: 0 }); }} className="text-[10px] uppercase font-bold text-sky-400 ml-1 hover:text-white transition-colors">RESET</button>
            </div>
          )}
        </div>

        <div className="p-3 md:p-4 bg-slate-900/50 border-t border-slate-800 flex flex-col gap-2 md:flex-row md:justify-between md:items-center backdrop-blur-md">
          <div><h3 className="text-white font-bold text-sm md:text-base">{config.t}</h3><p className="text-[10px] md:text-xs text-slate-500">{config.s}</p></div>
          <a href={config.l} target="_blank" rel="noreferrer" className="px-4 py-2 bg-slate-800 hover:bg-sky-600 text-sky-400 hover:text-white border border-slate-700 hover:border-sky-500 rounded-lg text-xs font-bold transition-all text-center">Ver Fuente</a>
        </div>
      </div>
    </div>
  );
};

// === MAIN COMPONENT ===

const Controls: React.FC<ControlsProps> = ({ state, setState, hoverData, toggleContext, activeModal, setActiveModal, onOpenInspector }) => {
  const [showSpeed, setShowSpeed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true); // Abierto por defecto (desktop)
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  // REMOVED LOCAL STATE for brightness - using state.spacetimeOpacity and state.geodesicOpacity

  // Data calculations
  const scale_a = calculateScaleFactor(state.time);
  const z = hoverData?.z || calculateRedshift(scale_a);
  const T = hoverData?.T || calculateTemperature(z);
  const age = calculateUniverseAge(state.time);

  const markers = [
    { p: 0, l: 'RECOMBINACIÓN', h: 2, mobileHidden: false },
    { p: 3, l: '1RAS ESTRELLAS', h: 4, mobileHidden: true },
    { p: 10, l: 'GALAXIAS', h: 0.73, mobileHidden: true },
    { p: 36, l: 'VÍA LÁCTEA', h: 0.73, mobileHidden: false },
    { p: 65, l: 'FORMACIÓN TIERRA', h: 0.73, mobileHidden: false },
    { p: 100, l: 'PRESENTE', h: 0.81, mobileHidden: false },
  ];

  const handleTime = (e: React.ChangeEvent<HTMLInputElement>) => setState(p => ({ ...p, time: parseFloat(e.target.value), isPlaying: false }));
  const togglePlay = () => setState(p => p.time >= 1 ? { ...p, time: 0, isPlaying: true } : { ...p, isPlaying: !p.isPlaying });
  const skipBack = () => setState(p => ({ ...p, time: Math.max(0, p.time - 0.1) }));
  const skipForward = () => setState(p => ({ ...p, time: Math.min(1, p.time + 0.1) }));

  return (
    <>
      <div className="absolute inset-0 pointer-events-none z-10 select-none overflow-hidden">

        {/* === HEADER (Mobile Only) === */}
        <div className="md:hidden absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/90 via-black/60 to-transparent z-20 pointer-events-auto">
          <div className="flex justify-between items-center text-white">
            <button id="tour-mobile-left-btn" onClick={() => setMobileLeftOpen(true)} className="p-2 -ml-1 hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-bold tracking-tight">CMB</h1>
              <div className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${state.isPlaying ? 'bg-green-900/40 border-green-500 text-green-400' : 'bg-slate-800/60 border-slate-600'}`}>
                {state.isPlaying ? 'LIVE' : 'PAUSED'}
              </div>
            </div>
            <button id="tour-mobile-right-btn" onClick={() => setMobileRightOpen(true)} className="p-2 -mr-1 hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>
        </div>

        {/* === MOBILE LEFT DRAWER === */}
        {mobileLeftOpen && (
          <div className="md:hidden fixed inset-0 z-[80] pointer-events-auto">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileLeftOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-72 bg-slate-950/95 backdrop-blur-xl border-r border-slate-800 overflow-y-auto p-4 flex flex-col gap-3 animate-in slide-in-from-left duration-200">
              <div className="flex justify-between items-center border-b border-slate-800/50 pb-3 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Datos & Modos</span>
                <button onClick={() => setMobileLeftOpen(false)} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Data Card */}
              <div className="bg-slate-950/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex flex-col gap-3 shadow-2xl">
                <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Datos Tiempo Real</span>
                  <div className={`w-2 h-2 rounded-full ${state.isPlaying ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-slate-600'}`}></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 mb-0.5">Redshift (z)</span>
                      <span className="text-xl font-mono font-bold text-sky-400 tracking-tighter">{(hoverData?.z || calculateRedshift(calculateScaleFactor(state.time))).toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] text-slate-400 mb-0.5">Temp (K)</span>
                      <span className="text-lg font-mono font-bold text-amber-400 tracking-tighter">{(hoverData?.T || calculateTemperature(hoverData?.z || calculateRedshift(calculateScaleFactor(state.time)))).toFixed(2)} K</span>
                    </div>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-800/50 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500">Factor Escala (a)</span>
                    <span className="text-xs font-mono text-emerald-400">{calculateScaleFactor(state.time).toFixed(4)}</span>
                  </div>
                </div>
              </div>

              {/* Mode Buttons */}
              <div className="flex flex-col gap-2">
                <ModeButton icon={<span>📷</span>} label="Foto Planck (4K)" sublabel="Fondo Cósmico Real" onClick={() => { setMobileLeftOpen(false); setActiveModal('PLANCK'); }} />
                <ModeButton icon={<span>🌌</span>} label="Estructura Universo" sublabel="Mapa Logarítmico" onClick={() => { setMobileLeftOpen(false); setActiveModal('STRUCTURE'); }} />
                <ModeButton icon={<span>🧊</span>} label="Modelo 3D" sublabel="Esfera Celeste WMAP" onClick={() => { setMobileLeftOpen(false); setActiveModal('WMAP'); }} />
                <ModeButton icon={<span>📈</span>} label="Diagrama Expansión" sublabel="Cronología Visual" onClick={() => { setMobileLeftOpen(false); setActiveModal('EXPANSION'); }} />
                <ModeButton icon={<span>👀</span>} label="Vista Observador" sublabel="VR 360 Grados" onClick={() => { setMobileLeftOpen(false); setActiveModal('OBSERVER_POV'); }} />
                <ModeButton icon={<span>⚡</span>} label="Ver un Fotón" sublabel="Análisis Individual" onClick={() => { setMobileLeftOpen(false); onOpenInspector?.(); }} />
              </div>

              <button onClick={() => { setMobileLeftOpen(false); toggleContext(); }} className="mt-2 w-full py-3 bg-gradient-to-r from-sky-900/60 to-blue-900/60 hover:from-sky-800/80 hover:to-blue-800/80 border border-sky-500/30 hover:border-sky-400/50 rounded-xl text-xs font-bold text-sky-100 flex items-center justify-center gap-2 transition-all shadow-lg">
                <span>📐 Explicación Matemática</span>
              </button>
            </div>
          </div>
        )}

        {/* === MOBILE RIGHT DRAWER === */}
        {mobileRightOpen && (
          <div className="md:hidden fixed inset-0 z-[80] pointer-events-auto">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileRightOpen(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-72 bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 overflow-y-auto p-4 flex flex-col gap-2 animate-in slide-in-from-right duration-200">
              <div className="flex justify-between items-center border-b border-slate-800/50 pb-3 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Configuración</span>
                <button onClick={() => setMobileRightOpen(false)} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <SliderControl label="Zoom" value={Math.round((state.zoomLevel / 80) * 100)} onChange={(val) => setState(p => ({ ...p, zoomLevel: (val / 100) * 80 }))} />
              <div className="h-px bg-slate-800/50 my-1"></div>
              <SliderControl label="Brillo Tejido E-T" value={Math.round(state.spacetimeOpacity * 100)} onChange={(val) => setState(p => ({ ...p, spacetimeOpacity: val / 100 }))} />
              <SliderControl label="Brillo Red Geodésica" value={Math.round(state.geodesicOpacity * 100)} onChange={(val) => setState(p => ({ ...p, geodesicOpacity: val / 100 }))} />
              <div className="h-px bg-slate-800/50 my-1"></div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 px-3">Capas Visuales</div>
              <ToggleSwitch label="Red Comóvil" active={state.showComovingGrid} onClick={() => setState(p => ({ ...p, showComovingGrid: !p.showComovingGrid }))} />
              <ToggleSwitch label="Tejido Espacio-Tiempo" active={state.showSpacetimeFabric} onClick={() => setState(p => ({ ...p, showSpacetimeFabric: !p.showSpacetimeFabric }))} />
              <ToggleSwitch label="Red Geodésica" active={state.showAcceleratedGrid} onClick={() => setState(p => ({ ...p, showAcceleratedGrid: !p.showAcceleratedGrid }))} />
              <ToggleSwitch label="Fotones CMB" active={state.showIntermediatePhotons} onClick={() => setState(p => ({ ...p, showIntermediatePhotons: !p.showIntermediatePhotons }))} />
              <ToggleSwitch label="Estela Fotones" active={state.showPhotonTails} onClick={() => setState(p => ({ ...p, showPhotonTails: !p.showPhotonTails }))} />
              <ToggleSwitch label="Fotones Recesión" active={state.showRecedingPhotons} onClick={() => setState(p => ({ ...p, showRecedingPhotons: !p.showRecedingPhotons }))} />
              <ToggleSwitch label="Plasma Primordial" active={state.showPrimordialPlasma} onClick={() => setState(p => ({ ...p, showPrimordialPlasma: !p.showPrimordialPlasma }))} />
              <ToggleSwitch label="Universo Observable" active={state.showObservableUniverse} onClick={() => setState(p => ({ ...p, showObservableUniverse: !p.showObservableUniverse }))} />
              <ToggleSwitch label="Anisotropías" active={state.showAnisotropies} onClick={() => setState(p => ({ ...p, showAnisotropies: !p.showAnisotropies }))} />
              <ToggleSwitch label="Etiquetas" active={state.showLabels} onClick={() => setState(p => ({ ...p, showLabels: !p.showLabels }))} />
            </div>
          </div>
        )}

        {/* === LEFT PANEL (Desktop) === */}
        <div className="hidden md:flex flex-col gap-4 absolute left-6 top-24 bottom-36 w-72 pointer-events-auto z-20">

          {/* Data Card - Glassmorphism style (40% opacity + extra blur) */}
          <div id="tour-monitor-card" className="bg-slate-950/40 backdrop-blur-xl border border-white/10 p-5 rounded-2xl flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800/50 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Datos Tiempo Real</span>
              <div className={`w-2 h-2 rounded-full ${state.isPlaying ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-slate-600'}`}></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 mb-0.5">Redshift (z)</span>
                  <span className="text-2xl font-mono font-bold text-sky-400 tracking-tighter">{z.toFixed(2)}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-slate-400 mb-0.5">Temp (K)</span>
                  <span className="text-xl font-mono font-bold text-amber-400 tracking-tighter">{T.toFixed(2)} K</span>
                </div>
              </div>

              <div className="col-span-2 pt-2 border-t border-slate-800/50 flex justify-between items-center">
                <span className="text-[10px] text-slate-500">Factor Escala (a)</span>
                <span className="text-xs font-mono text-emerald-400">{scale_a.toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* Modes Menu */}
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar pb-4 pr-1">
            <div id="tour-info-buttons" className="flex flex-col gap-2">
              <ModeButton icon={<span>📷</span>} label="Foto Planck (4K)" sublabel="Fondo Cósmico Real" onClick={() => setActiveModal('PLANCK')} />
              <ModeButton icon={<span>🌌</span>} label="Estructura Universo" sublabel="Mapa Logarítmico" onClick={() => setActiveModal('STRUCTURE')} />
              <ModeButton icon={<span>🧊</span>} label="Modelo 3D" sublabel="Esfera Celeste WMAP" onClick={() => setActiveModal('WMAP')} />
              <ModeButton icon={<span>📈</span>} label="Diagrama Expansión" sublabel="Cronología Visual" onClick={() => setActiveModal('EXPANSION')} />
              <ModeButton icon={<span>👀</span>} label="Vista Observador" sublabel="VR 360 Grados" onClick={() => setActiveModal('OBSERVER_POV')} />
              <ModeButton icon={<span>⚡</span>} label="Ver un Fotón" sublabel="Análisis Individual" onClick={onOpenInspector} />
            </div>

            <button id="tour-context" onClick={toggleContext} className="mt-2 w-full py-3 bg-gradient-to-r from-sky-900/60 to-blue-900/60 hover:from-sky-800/80 hover:to-blue-800/80 border border-sky-500/30 hover:border-sky-400/50 rounded-xl text-xs font-bold text-sky-100 flex items-center justify-center gap-2 transition-all shadow-lg group">
              <span>📐 Explicación Matemática</span>
            </button>

            {/* Removed pulsing version at end of animation per user request */}
          </div>
        </div>

        {/* === RIGHT PANEL (Controls & Settings) === */}
        <div className={`hidden md:flex flex-col absolute right-6 top-24 bottom-24 w-72 pointer-events-auto z-20 transition-all duration-300 ${rightPanelOpen ? 'translate-x-0' : 'translate-x-[calc(100%+1.5rem)]'}`}>

          {/* Toggle Button - Increased Transparency */}
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="absolute -left-10 top-1/2 -translate-y-1/2 w-10 h-20 bg-slate-900/70 backdrop-blur-md border border-slate-800/50 rounded-l-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors border-r-0 shadow-lg">
            <svg className={`w-5 h-5 transition-transform ${rightPanelOpen ? 'rotate-0' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Panel Content - Explicit Transparency (60% opacity per user request) */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/40 p-5 rounded-2xl flex flex-col gap-2 h-full overflow-y-auto no-scrollbar shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800/50 pb-3 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Configuración</span>
            </div>

            {/* Zoom Control */}
            <SliderControl
              label="Zoom"
              value={Math.round((state.zoomLevel / 80) * 100)}
              onChange={(val) => setState(p => ({ ...p, zoomLevel: (val / 100) * 80 }))}
            />

            <div className="h-px bg-slate-800/50 my-2"></div>

            {/* Brightness Controls - Connected to Global State */}
            <SliderControl
              label="Brillo Tejido E-T"
              value={Math.round(state.spacetimeOpacity * 100)}
              onChange={(val) => setState(p => ({ ...p, spacetimeOpacity: val / 100 }))}
            />

            <SliderControl
              label="Brillo Red Geodésica"
              value={Math.round(state.geodesicOpacity * 100)}
              onChange={(val) => setState(p => ({ ...p, geodesicOpacity: val / 100 }))}
            />

            <div className="h-px bg-slate-800/50 my-2"></div>

            {/* Toggle Switches */}
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 px-3">Capas Visuales</div>

            <ToggleSwitch label="Red Comóvil" active={state.showComovingGrid} onClick={() => setState(p => ({ ...p, showComovingGrid: !p.showComovingGrid }))} />
            <ToggleSwitch label="Tejido Espacio-Tiempo" active={state.showSpacetimeFabric} onClick={() => setState(p => ({ ...p, showSpacetimeFabric: !p.showSpacetimeFabric }))} />
            <ToggleSwitch label="Red Geodésica" active={state.showAcceleratedGrid} onClick={() => setState(p => ({ ...p, showAcceleratedGrid: !p.showAcceleratedGrid }))} />
            <ToggleSwitch label="Fotones CMB" active={state.showIntermediatePhotons} onClick={() => setState(p => ({ ...p, showIntermediatePhotons: !p.showIntermediatePhotons }))} />
            <ToggleSwitch label="Estela Fotones" active={state.showPhotonTails} onClick={() => setState(p => ({ ...p, showPhotonTails: !p.showPhotonTails }))} />
            <ToggleSwitch label="Fotones Recesión" active={state.showRecedingPhotons} onClick={() => setState(p => ({ ...p, showRecedingPhotons: !p.showRecedingPhotons }))} />
            <ToggleSwitch label="Plasma Primordial" active={state.showPrimordialPlasma} onClick={() => setState(p => ({ ...p, showPrimordialPlasma: !p.showPrimordialPlasma }))} />
            <ToggleSwitch label="Universo Observable" active={state.showObservableUniverse} onClick={() => setState(p => ({ ...p, showObservableUniverse: !p.showObservableUniverse }))} />
            <ToggleSwitch label="Anisotropías" active={state.showAnisotropies} onClick={() => setState(p => ({ ...p, showAnisotropies: !p.showAnisotropies }))} />
            <ToggleSwitch label="Etiquetas" active={state.showLabels} onClick={() => setState(p => ({ ...p, showLabels: !p.showLabels }))} />
          </div>
        </div>


        {/* === BOTTOM CONTROLS BAR === */}
        <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-auto bg-gradient-to-t from-black via-black/90 to-transparent">

          {/* Age Badge — mobile: inline compact strip, desktop: floating absolute */}
          <div className="md:hidden flex items-center justify-center py-1">
            <div className="bg-slate-900/90 backdrop-blur px-3 py-0.5 rounded-full border border-slate-700 shadow-xl flex items-center gap-2">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Edad</span>
              <span className="text-[10px] font-mono font-bold text-white">{age}</span>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between px-2 pb-6 pt-1 md:pb-8 md:pt-4 md:px-8 gap-1 md:gap-6 md:max-w-4xl md:mx-auto w-full">

            {/* Left: Speed + Playback Controls */}
            <div className="flex items-center gap-1 md:gap-3 shrink-0">

              {/* Speed selector — leftmost in mobile to avoid overlap with FABs */}
              <div className="relative md:hidden">
                <button onClick={() => setShowSpeed(!showSpeed)} className="h-7 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 backdrop-blur border border-slate-700 text-[9px] text-white font-bold transition-all flex items-center gap-1 shadow-lg">
                  <span>{state.playbackSpeed}x</span>
                  <svg className="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {showSpeed && (
                  <div className="absolute bottom-full left-0 mb-2 w-16 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-xl flex flex-col">
                    {[0.5, 1, 2, 5].map(s => (
                      <button key={s} onClick={() => { setState(p => ({ ...p, playbackSpeed: s })); setShowSpeed(false); }} className={`py-2 text-[10px] font-bold hover:bg-slate-800 ${state.playbackSpeed === s ? 'text-sky-400' : 'text-slate-400'}`}>{s}x</button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={skipBack} className="w-7 h-7 md:w-10 md:h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 backdrop-blur border border-slate-700 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg group">
                <svg className="w-3 h-3 md:w-4 md:h-4 group-hover:-translate-x-0.5 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" /></svg>
              </button>

              <button id="tour-play-button" onClick={togglePlay} className={`w-9 h-9 md:w-14 md:h-14 rounded-full bg-slate-100 hover:bg-white text-slate-900 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-40 ${!state.isPlaying && state.time === 0 ? 'animate-pulse shadow-[0_0_30px_rgba(255,255,255,0.6)]' : 'shadow-[0_0_20px_rgba(255,255,255,0.4)]'}`}>
                {state.isPlaying ? (
                  <svg className="w-4 h-4 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                ) : (
                  <svg className="w-4 h-4 md:w-6 md:h-6 ml-0.5 md:ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>

              <button onClick={skipForward} className="w-7 h-7 md:w-10 md:h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 backdrop-blur border border-slate-700 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg group">
                <svg className="w-3 h-3 md:w-4 md:h-4 group-hover:translate-x-0.5 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" /></svg>
              </button>
            </div>

            {/* Center: Timeline Track */}
            <div id="tour-timeline" className="flex-1 relative h-6 md:h-12 flex items-center group mx-1 md:mx-0">

              {/* Age Badge — desktop only, floating above */}
              <div className="hidden md:flex absolute -top-24 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur px-5 py-2 rounded-full border border-slate-700 shadow-xl items-center gap-3 z-50">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider whitespace-nowrap font-bold">EDAD UNIVERSO</span>
                <div className="h-4 w-px bg-slate-700"></div>
                <span className="text-sm font-mono font-bold text-white min-w-[80px] text-center">{age}</span>
              </div>

              {/* Leader Lines (Above — desktop only) */}
              <div className="absolute bottom-6 left-0 right-0 h-24 pointer-events-none hidden md:block">
                {markers.map((m, i) => {
                  const displayClass = m.mobileHidden ? 'hidden md:flex' : 'flex';
                  const height = `${m.h * 1.5}rem`;
                  let alignClass = "-translate-x-1/2 items-center";
                  if (m.p === 0) alignClass = "translate-x-0 items-start";
                  if (m.p === 100) alignClass = "items-end -translate-x-full";
                  return (
                    <div key={i} className={`absolute bottom-0 flex-col ${displayClass} ${alignClass} transition-opacity duration-300`} style={{ left: `${m.p}%` }}>
                      <div className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded bg-black/60 backdrop-blur border border-white/10 whitespace-nowrap mb-1 ${Math.abs(state.time * 100 - m.p) < 2 ? 'text-sky-300 border-sky-500/50' : 'text-slate-400'}`}>{m.l}</div>
                      <div className="w-px bg-gradient-to-t from-slate-600 to-transparent" style={{ height: height }}></div>
                      <div className="w-1 h-1 rounded-full bg-slate-500"></div>
                    </div>
                  );
                })}
              </div>

              {/* The Track */}
              <div className="w-full h-1.5 bg-slate-800/60 rounded-full overflow-hidden backdrop-blur border border-slate-700/50 relative cursor-pointer group-hover:h-2.5 transition-all">
                <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-sky-600 to-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.5)] w-full origin-left transition-transform duration-75 ease-out" style={{ transform: `scaleX(${state.time})` }}></div>
              </div>

              {/* Range Input Overlay */}
              <input type="range" min="0" max="1" step="0.001" value={state.time} onChange={handleTime} className="absolute inset-0 w-full opacity-0 cursor-pointer z-50 h-full" />
            </div>

            {/* Right: Speed — desktop only (mobile speed is left-side) */}
            <div className="hidden md:flex items-center shrink-0">
              <div className="relative">
                <button onClick={() => setShowSpeed(!showSpeed)} className="h-9 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 backdrop-blur border border-slate-700 text-xs text-white font-bold transition-all flex items-center gap-2 shadow-lg">
                  <span>{state.playbackSpeed}x</span>
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {showSpeed && (
                  <div className="absolute bottom-full right-0 mb-2 w-16 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-xl flex flex-col">
                    {[0.5, 1, 2, 5].map(s => (
                      <button key={s} onClick={() => { setState(p => ({ ...p, playbackSpeed: s })); setShowSpeed(false); }} className={`py-2 text-[10px] font-bold hover:bg-slate-800 ${state.playbackSpeed === s ? 'text-sky-400' : 'text-slate-400'}`}>{s}x</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {activeModal && activeModal !== 'OBSERVER_POV' && <UniversalModal type={activeModal as ModalType} onClose={() => setActiveModal(null)} />}
      {activeModal === 'OBSERVER_POV' && <UniversalModal type="OBSERVER_POV" onClose={() => setActiveModal(null)} />}
    </>
  );
};

export default Controls;
