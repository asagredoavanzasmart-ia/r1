import React, { useState, useEffect } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import Controls from './components/Controls';
import ContextPanel from './components/ContextPanel';
import ChatBot from './components/ChatBot';
import HistoricalTimeline from './components/HistoricalTimeline';
import IntroModal from './components/IntroModal';
import TourGuide from './components/TourGuide';
import { SimulationState } from './types';
import CosmologyMonitor from './components/CosmologyMonitor';
import { PhotonInspector } from './components/PhotonInspector';

function App() {
  const [simulationState, setSimulationState] = useState<SimulationState>({
    time: 0, // 0 = Recombination, 1 = Present
    isPlaying: false,
    playbackSpeed: 1, // Default 1x
    zoomLevel: typeof window !== 'undefined' && window.innerWidth < 768 ? 45 : 30, // Default camera distance (farther on mobile)
    showComovingGrid: true,
    showPhotons: true,
    showPhotonTails: true, // Default ON
    showRecedingPhotons: true, // Default ON
    showIntermediatePhotons: true, // Default ON
    showPrimordialPlasma: true, // Default ON (Was Unobservable)
    showSpacetimeFabric: true, // Default ON
    showObservableUniverse: true, // Enable by default
    showAcceleratedGrid: true, // Default ON
    showAnisotropies: true, // Default ON - Show CMB anisotropies from start
    showLabels: true,
    spacetimeOpacity: 1.0,
    geodesicOpacity: 1.0,
  });

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isContextOpen, setIsContextOpen] = useState(false);
  // Force show intro on next load by temporarily resetting localStorage check
  const [showIntro, setShowIntro] = useState(() => {
    try {
      // Temporarily force intro to show again
      localStorage.removeItem('cmb_sim_intro_seen');
      return true;
    } catch {
      return true;
    }
  });
  const [showTour, setShowTour] = useState(false);
  const [showPhotonInspector, setShowPhotonInspector] = useState(false); // NEW: Inspector State
  const [hoverData, setHoverData] = useState<{ z: number; T: number } | null>(null);

  // Animation Loop
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      if (simulationState.isPlaying) {
        setSimulationState((prevState) => {
          // Base increment is 0.002 per frame at 60fps (~8.3 seconds total duration at 1x)
          // At 0.5x, increment is 0.001 (16.6 seconds), ensuring fluidity.
          const increment = 0.002 * prevState.playbackSpeed;

          let newTime = prevState.time + increment;
          if (newTime >= 1) {
            newTime = 1; // Stop at Present
            return { ...prevState, time: newTime, isPlaying: false };
          }
          return { ...prevState, time: newTime };
        });
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    if (simulationState.isPlaying) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [simulationState.isPlaying]);

  // Handler to sync Zoom from OrbitControls back to UI state
  const handleZoomChange = (newZoom: number) => {
    // Only update if difference is significant to avoid render loops
    setSimulationState(prev => {
      if (Math.abs(prev.zoomLevel - newZoom) > 0.5) {
        return { ...prev, zoomLevel: newZoom };
      }
      return prev;
    });
  };

  const handleIntroClose = () => {
    setShowIntro(false);
    localStorage.setItem('cmb_sim_intro_seen', 'true');
    // Start tour slightly after intro closes for smoother transition
    setTimeout(() => setShowTour(true), 500);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <SimulationCanvas
          state={simulationState}
          onHoverData={(z, T) => setHoverData(z > 0 ? { z, T } : null)}
          onZoomChange={handleZoomChange}
          onOpen360={() => setActiveModal('OBSERVER_POV')}
          onOpenInspector={() => setShowPhotonInspector(true)}
        />
      </div>

      {/* Touch gesture hint - mobile only */}
      <div className="md:hidden absolute top-[5rem] left-1/2 -translate-x-1/2 z-10 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10 text-[10px] text-white/50 pointer-events-none animate-pulse">
        Pellizca para zoom · Desliza para rotar
      </div>
      {/* Header */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none hidden md:block">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Simulador <span className="text-sky-500">Radiación Fondo de Microondas</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-md">
          Visualización de la propagación de fotones en una métrica FLRW.
        </p>
      </div>

      {/* Introductory Modal */}
      {showIntro && <IntroModal onClose={handleIntroClose} onViewPhoton={() => setShowPhotonInspector(true)} />}

      {/* Tour Guide */}
      <TourGuide start={showTour} onFinish={() => setShowTour(false)} />

      {/* UI Controls Overlay */}
      <Controls
        state={simulationState}
        setState={setSimulationState}
        hoverData={hoverData}
        toggleContext={() => setIsContextOpen(true)}
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        onOpenInspector={() => setShowPhotonInspector(true)}
      />

      {/* Historical Timeline Button (Next to Chat) */}
      <HistoricalTimeline />

      {/* AI ChatBot (Floating) */}
      <ChatBot />

      {/* Scientific Context Panel (Side Drawer) */}
      <ContextPanel
        isOpen={isContextOpen}
        toggle={() => setIsContextOpen(false)}
      />

      {/* NEW: Cosmology Monitor Layer */}
      <div className="absolute top-24 left-6 z-20 pointer-events-auto w-72 hidden md:flex flex-col gap-4">
        <CosmologyMonitor
          progress={simulationState.time}
          isPlaying={simulationState.isPlaying}
          onTogglePlay={() => setSimulationState(p => ({ ...p, isPlaying: !p.isPlaying }))}
          onRestart={() => setSimulationState(p => ({ ...p, time: 0, isPlaying: true }))}
        />
      </div>

      {/* Photon Inspector Popup */}
      <PhotonInspector
        isOpen={showPhotonInspector}
        onClose={() => setShowPhotonInspector(false)}
        currentUniverseTime={simulationState.time}
      />

    </div>
  );
}

export default App;
