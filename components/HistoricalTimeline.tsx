import React, { useState } from 'react';

interface TimelineEvent {
  year: string;
  scientist: string;
  contribution: string;
  icon: string;
  color: string;
}

const timelineData: TimelineEvent[] = [
  {
    year: "1948",
    scientist: "Gamow, Alpher & Herman",
    contribution: "Predicción teórica del 'resplandor' del Big Bang con una temperatura estimada de 5 Kelvin.",
    icon: "📜",
    color: "bg-blue-500"
  },
  {
    year: "1965",
    scientist: "Penzias & Wilson",
    contribution: "Descubrimiento accidental del ruido de radio isotrópico. Premio Nobel de Física.",
    icon: "📡",
    color: "bg-green-500"
  },
  {
    year: "1992",
    scientist: "Satélite COBE",
    contribution: "Confirmación del espectro de cuerpo negro perfecto y detección de las primeras anisotropías (semillas de galaxias).",
    icon: "🛰️",
    color: "bg-yellow-500"
  },
  {
    year: "2003",
    scientist: "Sonda WMAP",
    contribution: "Mapa de alta precisión. Determinó la edad del universo en 13.77 mil millones de años.",
    icon: "🗺️",
    color: "bg-orange-500"
  },
  {
    year: "2013",
    scientist: "Telescopio Planck",
    contribution: "Medición ultra precisa del CMB, refinando la composición del universo (Materia Oscura/Energía Oscura).",
    icon: "🔭",
    color: "bg-purple-500"
  }
];

const HistoricalTimeline: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Toggle Button - Positioned to the top right directly */}
      <button
        id="tour-history"
        onClick={() => setIsOpen(true)}
        className="fixed top-[4.5rem] right-4 md:top-6 md:right-28 z-50 p-2.5 md:p-3 rounded-full bg-slate-800 text-slate-200 border border-slate-600 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-300 hover:scale-110 hover:bg-slate-700 hover:text-white hover:border-slate-400 group"
        title="Línea de Tiempo Histórica"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {/* Tooltip */}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Historia del CMB
        </span>
      </button>

      {/* Modal Overlay */}
      <div
        className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        ></div>

        {/* Panel Content */}
        <div className={`relative bg-slate-900 border border-slate-700 w-full max-w-lg max-h-[85vh] md:max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>

          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">⏳</span> Historia del Descubrimiento
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Scrollable List */}
          <div className="overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
            <div className="relative border-l-2 border-slate-700 ml-3 space-y-8">
              {timelineData.map((item, idx) => (
                <div key={idx} className="relative pl-8 group">
                  {/* Dot on line */}
                  <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-slate-900 ${item.color} shadow-[0_0_10px_currentColor] group-hover:scale-125 transition-transform`}></div>

                  {/* Card */}
                  <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-2xl" role="img" aria-label="icon">{item.icon}</span>
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-700">
                        {item.year}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">{item.scientist}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {item.contribution}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-950/50 border-t border-slate-800 text-center">
            <p className="text-[10px] text-slate-500">
              Datos basados en registros históricos de la NASA y la ESA.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default HistoricalTimeline;