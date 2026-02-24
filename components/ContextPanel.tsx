import React from 'react';

interface ContextPanelProps {
  isOpen: boolean;
  toggle: () => void;
}

const ContextPanel: React.FC<ContextPanelProps> = ({ isOpen, toggle }) => {
  return (
    <div
      className={`fixed top-0 right-0 h-full bg-slate-900/95 backdrop-blur-md border-l border-slate-700 w-full md:w-[520px] transition-transform duration-300 z-50 overflow-y-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="p-8 text-slate-200">
        <button
          onClick={toggle}
          className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 className="text-2xl font-bold text-sky-400 mb-2 mt-2">Fundamentos Matemáticos</h2>
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-8 font-mono">Cosmología FLRW & Ecuaciones de Friedmann-Lemaître</p>

        <div className="space-y-8">

          {/* Section 1: Introduction */}
          <section>
            <p className="text-base leading-relaxed text-slate-300">
              El <strong className="text-white">Fondo Cósmico de Microondas (CMB)</strong> es la evidencia directa de un universo en expansión regido por la métrica de <em className="text-sky-300">Friedmann-Lemaître-Robertson-Walker (FLRW)</em>. Las siguientes ecuaciones describen matemáticamente la dinámica del cosmos.
            </p>
          </section>

          {/* Section 2: Friedmann Equation */}
          <section className="bg-slate-800/50 p-5 rounded-lg border border-sky-700/50">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              1. Ecuación de Friedmann
            </h3>
            <p className="text-sm text-slate-400 mb-3">
              Describe la evolución temporal del factor de escala <span className="font-serif italic text-sky-400">a(t)</span> en función del contenido energético del universo.
            </p>
            <div className="font-mono text-sm bg-black/60 p-4 rounded text-center text-emerald-400 mb-4 border border-emerald-900/50">
              H² = (ȧ/a)² = (8πG/3)ρ - k/a² + Λ/3
            </div>
            <ul className="list-disc pl-4 text-sm text-slate-300 space-y-2">
              <li><strong className="text-sky-400">H</strong>: Parámetro de Hubble (velocidad de expansión).</li>
              <li><strong className="text-sky-400">ȧ</strong>: Derivada temporal del factor de escala a(t).</li>
              <li><strong className="text-sky-400">a(t)</strong>: Factor de escala (distancia relativa entre puntos comóviles).</li>
              <li><strong className="text-sky-400">G</strong>: Constante gravitacional universal (6.674×10⁻¹¹ m³/(kg·s²)).</li>
              <li><strong className="text-sky-400">ρ</strong>: Densidad de energía total del universo (materia + radiación).</li>
              <li><strong className="text-sky-400">k</strong>: Curvatura espacial (-1: hiperbólico, 0: plano, +1: esférico).</li>
              <li><strong className="text-sky-400">Λ</strong>: Constante cosmológica (energía oscura).</li>
            </ul>
            <p className="text-xs text-slate-500 mt-4 italic border-l-2 border-sky-700 pl-3">
              *Para un universo plano (k=0), como indica Planck 2018, esta ecuación se simplifica al equilibrio entre expansión (H²) y densidad total (materia + energía oscura).
            </p>
          </section>

          {/* Section 3: Hubble's Law */}
          <section className="bg-slate-800/50 p-5 rounded-lg border border-orange-700/50">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              2. Ley de Hubble
            </h3>
            <p className="text-sm text-slate-400 mb-3">
              Relaciona la velocidad de recesión de galaxias con su distancia al observador, demostrando la expansión del universo.
            </p>
            <div className="font-mono text-sm bg-black/60 p-4 rounded text-center text-orange-400 mb-4 border border-orange-900/50">
              v = H₀ · d
            </div>
            <ul className="list-disc pl-4 text-sm text-slate-300 space-y-2">
              <li><strong className="text-orange-400">v</strong>: Velocidad de recesión (km/s).</li>
              <li><strong className="text-orange-400">H₀</strong>: Constante de Hubble en el presente (~67.4 km/s/Mpc).</li>
              <li><strong className="text-orange-400">d</strong>: Distancia propia al objeto (Mpc = megaparsec).</li>
            </ul>
            <p className="text-xs text-slate-500 mt-4 italic border-l-2 border-orange-700 pl-3">
              *Esta relación lineal es válida localmente. A grandes distancias cosmológicas, la evolución de H(t) con el tiempo debe considerarse mediante la ecuación de Friedmann.
            </p>
          </section>

          {/* Section 4: Scale Factor */}
          <section className="bg-slate-800/50 p-5 rounded-lg border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              3. Factor de Escala <span className="font-serif italic text-sky-400">a(t)</span>
            </h3>
            <p className="text-sm text-slate-400 mb-3">
              Cuantifica cómo cambia la separación física entre puntos comóviles a lo largo del tiempo cósmico.
            </p>
            <div className="font-mono text-sm bg-black/40 p-3 rounded text-center text-green-400 mb-3">
              d(t) = a(t) · d₀
            </div>
            <ul className="list-disc pl-4 text-sm text-slate-300 space-y-1">
              <li><strong className="text-white">a(t)</strong>: Factor de escala adimensional.</li>
              <li><strong className="text-white">d₀</strong>: Distancia comóvil (constante, coordenada de referencia).</li>
              <li><strong className="text-white">d(t)</strong>: Distancia física propia (observable).</li>
            </ul>
            <p className="text-xs text-slate-500 mt-3 italic">
              *Convencionalmente, a(t₀) = 1 en el presente. En la recombinación (z≈1100), a(t) ≈ 1/1100 ≈ 0.000909.
            </p>
          </section>

          {/* Section 5: Redshift */}
          <section className="bg-slate-800/50 p-5 rounded-lg border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              4. Redshift Cosmológico <span className="font-serif italic text-red-400">z</span>
            </h3>
            <p className="text-sm text-slate-400 mb-3">
              La luz se "estira" (enrojece) porque el espacio mismo se expande. No es efecto Doppler clásico.
            </p>
            <div className="font-mono text-sm bg-black/40 p-3 rounded text-center text-orange-400 mb-3">
              1 + z = a(t₀) / a(t)
            </div>
            <div className="text-sm text-slate-300">
              <p className="mb-2">Relación con la longitud de onda:</p>
              <div className="font-mono text-xs text-center text-slate-400">
                λ_obs = λ_emit · (1 + z)
              </div>
            </div>
          </section>

          {/* Section 6: Temperature */}
          <section className="bg-slate-800/50 p-5 rounded-lg border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              5. Evolución de la Temperatura <span className="font-serif italic text-yellow-400">T(z)</span>
            </h3>
            <p className="text-sm text-slate-400 mb-3">
              La expansión adiabática reduce la densidad energética de la radiación, enfriando el CMB proporcionalmente al redshift.
            </p>
            <div className="font-mono text-sm bg-black/40 p-3 rounded text-center text-sky-400 mb-3">
              T(z) = T₀ · (1 + z)
            </div>
            <ul className="list-disc pl-4 text-sm text-slate-300 space-y-1">
              <li><strong className="text-white">T₀</strong>: 2.725 K (Temperatura actual del CMB).</li>
              <li><strong className="text-white">z ≈ 1100</strong>: Recombinación (última dispersión).</li>
              <li><strong className="text-white">T(z=1100)</strong>: ≈ 3000 K (Plasma ionizado H⁺ + e⁻).</li>
            </ul>
          </section>

          {/* Section 7: Summary Table */}
          <section>
            <h3 className="text-lg font-bold text-white mb-4">Resumen de Épocas Cosmológicas</h3>
            <div className="border border-slate-700 rounded overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-800 text-slate-200">
                  <tr>
                    <th className="p-3 font-semibold">Evento</th>
                    <th className="p-3 font-semibold">Tiempo</th>
                    <th className="p-3 font-semibold">Temp (K)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 text-slate-300">
                  <tr className="bg-slate-900/50">
                    <td className="p-3">Big Bang</td>
                    <td className="p-3">0</td>
                    <td className="p-3">∞</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-sky-300 font-medium">Recombinación</td>
                    <td className="p-3">380k años</td>
                    <td className="p-3">3000 K</td>
                  </tr>
                  <tr className="bg-slate-900/50">
                    <td className="p-3">Edad Oscura</td>
                    <td className="p-3">~10 M años</td>
                    <td className="p-3">~100 K</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-green-400 font-medium">Presente</td>
                    <td className="p-3">13.800 M</td>
                    <td className="p-3">2.725 K</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default ContextPanel;