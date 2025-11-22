import React, { useState, useEffect, useRef } from 'react';
import { createAIClient, LIVE_COMPANION_SYSTEM_INSTRUCTION } from '../services/gemini';
import { Modality, LiveServerMessage } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../services/audioUtils';

export const LiveCompanion: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [volume, setVolume] = useState(0);
  
  // Refs for audio context and processing to persist across renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);

  const addLog = (msg: string) => setLog(prev => [...prev.slice(-4), msg]);

  // Visualizer loop
  useEffect(() => {
    let animationFrameId: number;
    const updateVolume = () => {
      if (analyzerRef.current) {
        const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
        analyzerRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setVolume(average);
      }
      animationFrameId = requestAnimationFrame(updateVolume);
    };
    updateVolume();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const stopSession = () => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => {
          try {
              session.close();
          } catch(e) {
              console.error("Error closing session", e);
          }
      });
      sessionPromiseRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    
    if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
    }

    if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }

    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }

    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    
    setIsActive(false);
    setIsConnecting(false);
    addLog("Session ended");
  };

  const startSession = async () => {
    try {
      setIsConnecting(true);
      addLog("Initializing audio...");
      
      // Output Audio Context
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);

      // Input Audio Context
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAudioContextRef.current = inputCtx;
      
      // Microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Analyzer for visualization
      const analyzer = inputCtx.createAnalyser();
      analyzer.fftSize = 256;
      analyzerRef.current = analyzer;

      const ai = createAIClient();
      addLog("Connecting to Gemini Live...");

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            addLog("Connected! Listening...");
            setIsActive(true);
            setIsConnecting(false);

            // Setup Audio Processing
            const source = inputCtx.createMediaStreamSource(stream);
            sourceRef.current = source;
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData);
                sessionPromise.then(session => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
            };

            source.connect(analyzer); // Connect for visualization
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                if (outputCtx.state === 'suspended') {
                    await outputCtx.resume();
                }
                
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                
                const audioBuffer = await decodeAudioData(
                    base64ToUint8Array(base64Audio),
                    outputCtx,
                    24000,
                    1
                );
                
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                source.addEventListener('ended', () => {
                    sourcesRef.current.delete(source);
                });
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
            }
            
            if (message.serverContent?.interrupted) {
                addLog("Interrupted");
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            addLog("Disconnected from server");
            stopSession();
          },
          onerror: (err) => {
            console.error(err);
            addLog("Error occurred");
            stopSession();
          }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
            },
            systemInstruction: LIVE_COMPANION_SYSTEM_INSTRUCTION
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Failed to start session", error);
      addLog("Failed to start: " + String(error));
      setIsConnecting(false);
      stopSession();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        stopSession();
    };
  }, []);

  return (
    <div className="h-full flex items-center justify-center bg-gray-950 p-8">
      <div className="w-full max-w-lg relative">
        {/* Background Glow */}
        <div className={`absolute inset-0 bg-primary-500/20 blur-[100px] rounded-full transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`} />

        <div className="relative bg-gray-900 border border-gray-800 rounded-3xl p-8 flex flex-col items-center shadow-2xl">
           <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Live Companion</h2>
              <p className="text-gray-400">Real-time voice collaboration</p>
           </div>

           {/* Visualizer Circle */}
           <div className="relative w-48 h-48 mb-12 flex items-center justify-center">
              {/* Static rings */}
              <div className={`absolute inset-0 rounded-full border-2 border-gray-800 transition-all duration-500 ${isActive ? 'scale-110 border-primary-500/30' : ''}`} />
              <div className={`absolute inset-4 rounded-full border border-gray-800 transition-all duration-500 ${isActive ? 'scale-105 border-primary-500/50' : ''}`} />
              
              {/* Dynamic Visualizer */}
              <div 
                className={`w-32 h-32 rounded-full bg-gradient-to-tr from-primary-600 to-purple-600 shadow-lg shadow-primary-500/40 transition-all duration-75 flex items-center justify-center`}
                style={{ transform: isActive ? `scale(${1 + (volume / 255) * 0.5})` : 'scale(1)' }}
              >
                 {!isActive && <svg className="w-12 h-12 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
              </div>
           </div>

           <div className="flex flex-col items-center w-full space-y-4">
              {!isActive ? (
                  <button 
                    onClick={startSession} 
                    disabled={isConnecting}
                    className="w-full py-4 rounded-xl bg-white text-gray-900 font-bold text-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-wait"
                  >
                    {isConnecting ? 'Connecting...' : 'Start Session'}
                  </button>
              ) : (
                  <button 
                    onClick={stopSession}
                    className="w-full py-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/50 font-bold text-lg hover:bg-red-500/20 transition-colors"
                  >
                    End Session
                  </button>
              )}
           </div>
           
           <div className="mt-6 h-20 w-full overflow-hidden text-center">
             {log.map((l, i) => (
                 <p key={i} className="text-xs text-gray-600 font-mono">{l}</p>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};