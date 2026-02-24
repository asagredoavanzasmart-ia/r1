import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

const AudioNarrator: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start loading immediately
  const [hasLoaded, setHasLoaded] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  // Initialize Audio Context and Auto-Generate
  useEffect(() => {
    generateAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const generateAudio = async () => {
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Script adaptado: Chileno nativo, 30 años, formal, dinámica y alegre (Voz Erinome).
      const script = `
        ¡Hola a todos! Les doy la bienvenida al Explorador del Fondo Cósmico. 
        Lo que tenemos acá es realmente fascinante: es la luz más antigua de todo el universo, liberada apenas 380 mil años después del Big Bang. 
        Esta visualización es totalmente interactiva, así que los invito a tomar el control del tiempo. 
        Fíjense bien cómo se expande la superficie y cómo los fotones viajan a través del espacio-tiempo. Notarán que se van enfriando, pasando de un naranjo intenso hasta convertirse en las microondas invisibles que detectamos hoy en día.
        Usen los controles de abajo para recorrer la historia del cosmos, y el menú de la derecha si quieren profundizar en los datos científicos. ¡Que disfruten mucho esta experiencia!
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: { parts: [{ text: script }] },
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              // 'Erinome': Professional, mid-range female voice.
              prebuiltVoiceConfig: { voiceName: 'Erinome' } 
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (base64Audio) {
        // 1. Decode Base64 to binary string
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // 2. Initialize Audio Context with correct sample rate (usually 24000Hz for Gemini TTS)
        const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
        const tempCtx = new CtxClass({ sampleRate: 24000 });
        
        // 3. Manual PCM Decoding: Convert Raw Int16 to AudioBuffer (Float32)
        // Gemini TTS returns raw PCM 16-bit Little Endian.
        const dataInt16 = new Int16Array(bytes.buffer);
        const numChannels = 1; // Usually Mono
        const frameCount = dataInt16.length / numChannels;
        
        // Create an AudioBuffer
        const buffer = tempCtx.createBuffer(numChannels, frameCount, 24000);

        // Fill the buffer
        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                // Normalize 16-bit integer (-32768 to 32767) to Float32 (-1.0 to 1.0)
                channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
            }
        }
        
        audioBufferRef.current = buffer;
        audioContextRef.current = tempCtx;
        
        setHasLoaded(true);
      }
    } catch (error) {
      console.error("Error generating audio:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = () => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    // Browser Autoplay Policy check
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }

    // Create nodes
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;
    
    const gainNode = audioContextRef.current.createGain();
    gainNode.gain.value = isMuted ? 0 : 1;

    source.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    // Handle resume from pause logic
    const offset = pauseTimeRef.current % audioBufferRef.current.duration;
    source.start(0, offset);
    startTimeRef.current = audioContextRef.current.currentTime - offset;

    sourceNodeRef.current = source;
    gainNodeRef.current = gainNode;
    
    source.onended = () => {
        // Only reset if it finished naturally
        if (audioContextRef.current && audioContextRef.current.currentTime > startTimeRef.current + audioBufferRef.current!.duration - 0.1) {
             setIsPlaying(false);
             pauseTimeRef.current = 0;
        }
    };

    setIsPlaying(true);
  };

  const pauseAudio = () => {
    if (sourceNodeRef.current && audioContextRef.current) {
      sourceNodeRef.current.stop();
      pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (isLoading) return; // Ignore clicks while generating

    if (!hasLoaded) {
      // Retry generation if it failed or wasn't ready (edge case)
      generateAudio();
    } else {
      if (isPlaying) {
        pauseAudio();
      } else {
        playAudio();
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newMuteState ? 0 : 1;
    }
  };

  return (
    <div className="absolute top-24 left-6 z-40 flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
            onClick={togglePlay}
            disabled={isLoading && !hasLoaded}
            className={`flex items-center gap-3 px-4 py-2 rounded-full border border-slate-700/50 backdrop-blur-md shadow-lg transition-all duration-300 group ${
                isPlaying 
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50' 
                : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:border-sky-500/30'
            }`}
        >
            {isLoading ? (
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-bold uppercase tracking-wider">Cargando voz...</span>
                </div>
            ) : isPlaying ? (
                <>
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    <span className="text-xs font-bold uppercase tracking-wider">Escuchando</span>
                </>
            ) : (
                <>
                    <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <span className="text-xs font-bold uppercase tracking-wider">Escuchar Intro</span>
                </>
            )}
        </button>

        {/* Mute Button (Only visible if loaded) */}
        {hasLoaded && (
             <button
                onClick={toggleMute}
                className="p-2 rounded-full bg-slate-900/60 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={isMuted ? "Activar sonido" : "Silenciar"}
             >
                 {isMuted ? (
                     <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                 ) : (
                     <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                 )}
             </button>
        )}
    </div>
  );
};

export default AudioNarrator;