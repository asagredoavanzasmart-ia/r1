import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Message {
  role: 'user' | 'model';
  text: string;
}

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: '¡Hola! Soy tu asistente astronómico. Puedo explicarte detalles sobre la radiación de fondo, la métrica FLRW o la expansión del universo. ¿Qué te gustaría saber?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ref to store the chat session instance
  const chatRef = useRef<any>(null);

  // Initialize Chat Session on mount
  useEffect(() => {
    try {
      // Robust detection of API Key from Vite defines or import.meta.env
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY;

      if (!apiKey) {
        console.warn("Gemini API Key not found. Chat will be disabled.");
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: "Eres un astrónomo experto y físico cosmólogo integrado en una aplicación de visualización 3D del Fondo Cósmico de Microondas (CMB). Tu objetivo es explicar conceptos complejos como la métrica FLRW, el redshift cosmológico, la superficie de última dispersión y la expansión del universo de forma clara, fascinante y educativa. Responde de manera concisa (máximo 3 párrafos cortos) ya que estás en una ventana de chat. Usa formato Markdown simple si es necesario.",
      });

      chatRef.current = model.startChat({
        history: [],
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
        },
      });
    } catch (error) {
      console.error("Error initializing Gemini API:", error);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !chatRef.current) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const result = await chatRef.current.sendMessage(userMsg);
      const response = await result.response;
      const responseText = response.text() || "Lo siento, no pude procesar esa pregunta astronómica en este momento.";

      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: `Error de conexión: ${error.message || 'Error desconocido'}. Verifica tu API Key o cuota.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button (Floating Action Button) */}
      <button
        id="tour-chat"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-[4.5rem] right-3 md:bottom-6 md:right-6 z-40 p-3 md:p-4 rounded-full shadow-[0_0_20px_rgba(14,165,233,0.5)] transition-all duration-300 hover:scale-110 group ${isOpen ? 'bg-slate-800 text-white rotate-90' : 'bg-sky-600 text-white'}`}
        title="Preguntar al Astrónomo AI"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        )}
        {/* Pulse effect when closed */}
        {!isOpen && <span className="absolute inset-0 rounded-full border border-sky-400 animate-ping opacity-75"></span>}
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-32 right-1 md:bottom-48 md:right-8 w-[calc(100vw-8px)] md:w-96 h-[55vh] md:h-[500px] bg-slate-900/95 backdrop-blur-xl border border-sky-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 origin-bottom-right z-30 ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 border-b border-sky-900/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Astrónomo IA</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] text-sky-300 font-mono">Gemini 2.5 Flash</span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-md ${msg.role === 'user'
                  ? 'bg-sky-600 text-white rounded-tr-sm'
                  : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'
                  }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 border border-slate-700 flex gap-1">
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Pregunta sobre el cosmos..."
              className="w-full bg-slate-950/50 text-white text-sm rounded-full pl-4 pr-12 py-3 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all placeholder:text-slate-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-1.5 p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-full disabled:opacity-50 disabled:hover:bg-sky-600 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
          <div className="text-[10px] text-center text-slate-600 mt-2">
            La IA puede cometer errores. Verifica la información importante.
          </div>
        </form>
      </div>
    </>
  );
};

export default ChatBot;