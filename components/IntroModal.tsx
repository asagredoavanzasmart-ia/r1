import React, { useEffect, useState } from 'react';

interface IntroModalProps {
  onClose: () => void;
  onViewPhoton?: () => void;
}

const IntroModal: React.FC<IntroModalProps> = ({ onClose, onViewPhoton }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Fade-in effect on mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Wait for animation to finish before unmounting
    setTimeout(onClose, 500);
  };

  const handleViewPhoton = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
      onViewPhoton?.();
    }, 500);
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />

      {/* Card Content - Centered */}
      <div className={`relative bg-slate-900/90 border border-slate-700/50 md:rounded-2xl max-w-5xl w-full h-full md:h-auto md:max-h-[90vh] shadow-2xl overflow-y-auto md:overflow-hidden flex flex-col md:flex-row transform transition-all duration-700 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}>

        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

        {/* Left Column: Content */}
        <div className="relative z-10 flex flex-col justify-center p-5 md:p-12 md:w-1/2">

          {/* Header */}
          <div className="mb-8">
            <div className="w-20 h-1.5 bg-gradient-to-r from-transparent via-sky-500 to-transparent mb-6 rounded-full"></div>
            <h2 className="text-2xl md:text-5xl font-bold text-white tracking-tight mb-2">
              El Viaje de la Luz
            </h2>
            <span className="text-sm font-mono text-sky-400 uppercase tracking-widest">Simulación Cosmológica FLRW</span>
          </div>

          {/* Text Content */}
          <div className="space-y-3 md:space-y-6 text-slate-300 text-sm md:text-lg leading-relaxed font-light">
            <p>
              <strong className="text-white font-semibold">Cuando el universo apenas tenía unos 380.000 años</strong>, en un estado denso y ardiente, <strong className="text-sky-400 font-semibold">la luz conquistó su libertad</strong>.
            </p>

            <p>
              En ese instante de claridad, un vasto océano de fotones emprendió una odisea solitaria a través del vacío en expansión; un viaje ininterrumpido que se ha extendido por <strong className="text-white font-semibold">más de 13.800 M de años</strong>.
            </p>

            <p>
              Hoy, esos antiguos mensajeros terminan su travesía impactando contra nuestros detectores en la Tierra, dándonos el privilegio de <strong className="text-white font-semibold">mirar hacia el pasado más remoto</strong>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 md:mt-10 flex flex-col gap-3">
            <button
              onClick={handleClose}
              className="group relative px-6 py-3 md:px-10 md:py-4 bg-sky-600 hover:bg-sky-500 rounded-full shadow-[0_0_30px_rgba(14,165,233,0.3)] transition-all w-full flex items-center justify-center gap-3 md:gap-4 border border-sky-400/30 hover:scale-[1.02] active:scale-95"
            >
              <span className="text-white font-bold text-base md:text-xl tracking-wide uppercase">
                INICIAR SIMULACIÓN
              </span>
              <svg className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right Column: NASA Video - Horizontal Player Style */}
        <div className="relative md:w-1/2 bg-slate-950/50 flex flex-col items-center justify-center p-4 md:p-6 border-t md:border-t-0 md:border-l border-slate-700/30">
          <div className="w-full aspect-video max-h-[35vh] md:max-h-none rounded-xl overflow-hidden shadow-2xl border border-white/10 relative bg-black shadow-sky-900/20">
            <video
              className="w-full h-full object-contain"
              autoPlay
              loop
              muted
              playsInline
            >
              <source src="https://assets.science.nasa.gov/content/dam/science/missions/wmap/030651_Universe_Evolution_4K_comp.mp4" type="video/mp4" />
            </video>

            {/* Visual HUD overlay for "player" feel */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="px-2 py-0.5 bg-black/60 rounded border border-white/10 text-[9px] font-mono text-white/50">4K_ULTRA_HD</div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center pointer-events-none">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_red]"></div>
                <span className="text-[10px] text-white font-mono uppercase tracking-widest opacity-60">Visualizando Expansión Cósmica</span>
              </div>
              <div className="text-[10px] text-white opacity-40 font-mono tracking-tighter">NASA VISUAL DATA // WMAP</div>
            </div>
          </div>

          <div className="mt-4 md:mt-8 text-center max-w-sm px-4">
            <p className="text-xs text-slate-500 leading-relaxed font-mono uppercase tracking-tighter">
              Visualización de la evolución del universo proporcionada por el equipo científico de la NASA / WMAP.
            </p>
            <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent mt-4"></div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default IntroModal;