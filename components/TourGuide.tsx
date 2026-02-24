import React, { useState, useEffect, useRef } from 'react';

interface Step {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface TourGuideProps {
  start: boolean;
  onFinish: () => void;
}

const steps: Step[] = [
  {
    target: 'center',
    title: '🌌 Bienvenido al Simulador CMB',
    content: 'Esta es una visualización interactiva que recrea la expansión del universo y la propagación de la luz desde el Big Bang hasta el presente. Te guiaremos por todas las funcionalidades.',
    position: 'center'
  },
  {
    target: '#tour-monitor-card',
    title: '📊 Monitor Cosmográfico',
    content: 'Aquí ves datos en tiempo real: el parámetro de Hubble H(t), el redshift z, y el factor de escala a(t). Haz clic en el ícono "i" para ver el modo análisis con ecuaciones completas y controles avanzados.',
    position: 'right'
  },
  {
    target: '#tour-timeline',
    title: '⏱️ Control de Desplazamiento Temporal',
    content: 'Aquí tienes los controles de reproducción: Play/Pausa, retroceder/avanzar, y la barra de tiempo. Desliza para viajar desde la Recombinación (t=0, hace 13.8 mil millones de años) hasta el Presente (t=1). Los marcadores indican eventos clave como la formación de la Tierra.',
    position: 'top'
  },
  {
    target: 'canvas',
    title: '🎨 La Simulación 3D',
    content: 'Este canvas 3D muestra la EXPANSIÓN DEL ESPACIO en tiempo real. Los fotones amarillos/rojos representan la luz del CMB viajando. Las grillas muestran cómo el espacio mismo se estira con el tiempo. Usa el scroll para zoom y arrastra para rotar.',
    position: 'bottom' // Changed to bottom to facilitate adjacency logic
  },
  {
    target: '.absolute.right-6.top-24', // Needs ID ideally, but selector works
    title: '⚙️ Panel de Configuración de Capas',
    content: 'Este panel controla las capas visuales: Zoom, Brillo de Geodésica y Espacio-Tiempo, Fotones Recesivos/Intermedios, Plasma Primordial, Anisotropías del CMB, etc. Activa o desactiva elementos para analizar cada componente por separado.',
    position: 'left'
  },
  {
    target: '#tour-info-buttons',
    title: '🖼️ Información Complementaria',
    content: 'Estos botones te dan acceso a recursos científicos reales: imágenes del satélite Planck, el mapa logarítmico del Universo, modelos 3D de WMAP, diagramas de expansión cronológica y vistas inmersivas 360°. Compara la simulación con datos observacionales.',
    position: 'right'
  },
  {
    target: '#tour-context',
    title: '📐 Fundamentos Matemáticos',
    content: 'Haz clic aquí para abrir el panel con las ECUACIONES DE FRIEDMANN y LA LEY DE HUBBLE que gobiernan la expansión cosmológica. Todas las variables (H, a, ρ, Λ, G, k, z, T) están explicadas en detalle con notación académica.',
    position: 'right'
  },
  {
    target: '#tour-history',
    title: '📜 Línea Histórica',
    content: 'Explora la cronología de descubrimientos del CMB: desde la predicción de Gamow (1948) hasta las misiones Planck y WMAP. Cada hito científico está documentado con fechas, autores y contexto histórico.',
    position: 'left'
  },
  {
    target: '#tour-chat',
    title: '🤖 Asistente con IA',
    content: 'Conversa con nuestro Astrónomo Virtual impulsado por Gemini. Pregunta sobre física, cosmología, ecuaciones o detalles de la simulación. El asistente tiene acceso al contexto científico completo de la aplicación.',
    position: 'left'
  },
  {
    target: '#tour-play-button',
    title: '✨ ¡Listo para Explorar!',
    content: 'Ahora tienes todas las herramientas para comprender la expansión del universo. Presiona "Play", ajusta la velocidad, y observa cómo la física matemática cobra vida en 3D. ¡Disfruta el viaje cósmico!',
    position: 'top'
  }
];

const TourGuide: React.FC<TourGuideProps> = ({ start, onFinish }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [contentOpacity, setContentOpacity] = useState(1);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isMobile = windowSize.w < 768;

  // Handle Resize
  useEffect(() => {
    const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Step Change Effect: Content Fade
  useEffect(() => {
    setContentOpacity(0);
    const timer = setTimeout(() => setContentOpacity(1), 300);
    return () => clearTimeout(timer);
  }, [currentStep]);

  // Keyboard Navigation
  useEffect(() => {
    if (!start) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep < steps.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          onFinish();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStep > 0) {
          setCurrentStep(prev => prev - 1);
        }
      } else if (e.key === 'Escape') {
        onFinish();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [start, currentStep, onFinish]);

  // Calculate Target Rect with Polling for Smoothness
  useEffect(() => {
    if (!start) return;

    const step = steps[currentStep];

    const updateRect = () => {
      let rect: DOMRect | null = null;

      if (step.target === 'center') {
        const w = isMobile ? windowSize.w * 0.85 : 480;
        const h = isMobile ? 160 : 240;
        rect = {
          top: (window.innerHeight - h) / 2,
          left: (window.innerWidth - w) / 2,
          width: w,
          height: h,
          right: (window.innerWidth + w) / 2,
          bottom: (window.innerHeight + h) / 2,
          x: (window.innerWidth - w) / 2,
          y: (window.innerHeight - h) / 2,
          toJSON: () => { }
        } as DOMRect;
      } else if (step.target === 'canvas') {
        const w = isMobile ? windowSize.w * 0.7 : windowSize.w * 0.5;
        const h = isMobile ? windowSize.h * 0.4 : windowSize.h * 0.5;
        const top = (window.innerHeight - h) / 2;
        const left = (window.innerWidth - w) / 2;
        rect = {
          top, left, width: w, height: h, right: left + w, bottom: top + h, x: left, y: top, toJSON: () => { }
        } as DOMRect;
      } else {
        const el = document.querySelector(step.target);
        if (el) {
          const rawRect = el.getBoundingClientRect();
          const padding = 6;
          rect = {
            top: rawRect.top - padding,
            left: rawRect.left - padding,
            width: rawRect.width + padding * 2,
            height: rawRect.height + padding * 2,
            right: rawRect.right + padding,
            bottom: rawRect.bottom + padding,
            x: rawRect.x - padding,
            y: rawRect.y - padding,
            toJSON: () => { }
          } as DOMRect;
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      if (rect) setTargetRect(rect);
    };

    updateRect();
    const interval = setInterval(updateRect, 50); // Poll frequently for smooth updates
    return () => clearInterval(interval);
  }, [currentStep, start, windowSize]);

  if (!start || !targetRect) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  // === SMART POSITIONING LOGIC ===
  const tooltipWidth = isMobile ? Math.min(windowSize.w - 32, 320) : 380;
  const tooltipHeightEstimate = isMobile ? 240 : 320;
  const margin = 20;
  const viewportMargin = 16;

  let top = 0;
  let left = 0;
  const pos = step.position;

  if (pos === 'center') {
    top = (windowSize.h - tooltipHeightEstimate) / 2 + 100;
    left = (windowSize.w - tooltipWidth) / 2;
  } else if (step.target === 'canvas') {
    top = targetRect.bottom + margin;
    left = targetRect.right - tooltipWidth;
  } else if (pos === 'top') {
    top = targetRect.top - tooltipHeightEstimate - margin;
    left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
  } else if (pos === 'bottom') {
    top = targetRect.bottom + margin;
    left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
  } else if (pos === 'left') {
    top = targetRect.top;
    left = targetRect.left - tooltipWidth - margin;
  } else if (pos === 'right') {
    top = targetRect.top;
    left = targetRect.right + margin;
  }

  // Horizontal Clamp
  if (left < viewportMargin) left = viewportMargin;
  if (left + tooltipWidth > windowSize.w - viewportMargin) {
    left = windowSize.w - tooltipWidth - viewportMargin;
  }

  // Vertical Clamp
  if (top < viewportMargin) top = viewportMargin;
  if (top + tooltipHeightEstimate > windowSize.h - viewportMargin) {
    if ((pos === 'bottom' || step.target === 'canvas') && targetRect.top > tooltipHeightEstimate + margin + viewportMargin) {
      top = targetRect.top - tooltipHeightEstimate - margin;
    } else {
      top = windowSize.h - tooltipHeightEstimate - viewportMargin;
    }
  }

  const tooltipStyle: React.CSSProperties = {
    transform: `translate3d(${left}px, ${top}px, 0)`,
    width: tooltipWidth,
    maxHeight: `calc(100vh - ${viewportMargin * 2}px)`,
    transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease-out',
  };

  const next = () => {
    if (isLast) onFinish();
    else setCurrentStep(prev => prev + 1);
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const path = `
    M 0 0 
    H ${windowSize.w} 
    V ${windowSize.h} 
    H 0 
    Z 
    M ${targetRect.left} ${targetRect.top} 
    V ${targetRect.bottom} 
    H ${targetRect.right} 
    V ${targetRect.top} 
    Z
  `;

  return (
    <div
      className="fixed inset-0 z-[200] pointer-events-auto cursor-default overflow-hidden"
      onClick={onFinish}
    >
      {/* Backdrop with Hole */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <path
          d={path}
          fill="rgba(0, 0, 0, 0.85)"
          fillRule="evenodd"
          className="transition-all duration-700 ease-in-out"
        />
        {/* Highlight Border */}
        <rect
          x={targetRect.left}
          y={targetRect.top}
          width={targetRect.width}
          height={targetRect.height}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
          rx="12"
          className="animate-pulse shadow-[0_0_20px_rgba(56,189,232,0.5)] transition-all duration-700 ease-in-out"
        />
      </svg>

      {/* Tooltip Card */}
      <div
        ref={tooltipRef}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-0 left-0 flex flex-col p-4 md:p-6 bg-slate-900/95 backdrop-blur-xl border border-sky-500/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-left will-change-transform"
        style={tooltipStyle}
      >
        <div
          className="transition-opacity duration-300 flex flex-col h-full"
          style={{ opacity: contentOpacity }}
        >
          <div className="flex justify-between items-start mb-3 gap-3">
            <h3 className="text-base md:text-xl font-bold text-white flex-1 leading-tight tracking-tight">{step.title}</h3>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 px-2 py-1 rounded border border-cyan-800/50 whitespace-nowrap">
              {currentStep + 1} / {steps.length}
            </span>
          </div>

          <p className="text-[13px] md:text-[15px] text-slate-300 mb-4 md:mb-6 leading-relaxed font-light overflow-y-auto max-h-[100px] md:max-h-[180px] pr-2 custom-scrollbar">
            {step.content}
          </p>

          <div className="flex justify-between items-center mt-auto pt-5 border-t border-slate-700/50">
            <button
              onClick={onFinish}
              className="text-[11px] text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest font-bold"
            >
              Saltar
            </button>

            <div className="flex gap-2.5">
              <button
                onClick={prev}
                disabled={currentStep === 0}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${currentStep === 0 ? 'opacity-20 cursor-not-allowed text-slate-500 border-slate-800' : 'text-slate-300 hover:bg-slate-800 border-slate-700 hover:border-slate-500'}`}
              >
                Anterior
              </button>
              <button
                onClick={next}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/40 transition-all active:scale-95 flex items-center gap-2"
              >
                {isLast ? 'Finalizar' : <span>Siguiente <span className="text-sky-200 ml-1">↵</span></span>}
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard Hint */}
        <div className="absolute -bottom-8 left-0 right-0 text-center pointer-events-none hidden md:block">
          <span className="text-[10px] text-slate-500 font-medium tracking-wide opacity-40">Usa flechas ◀ ▶ o Enter</span>
        </div>
      </div>
    </div>
  );
};

export default TourGuide;