import React, { useState, useEffect, useRef, FC } from 'react';
import { TurboGeigerEngine, DeckId } from './TurboGeigerEngine';
import { TurboGeigerSnapshot } from './types';

export interface HouseDeckProps {
  deckId: DeckId;
  color: string;
  onSwitchToTrack: () => void;
}

const Knob: FC<any> = ({ value, label, onChange }) => (
  <div className="flex flex-col items-center">
    <span className="text-[10px] text-gray-400 font-mono truncate max-w-[60px]">{label}</span>
    <input 
      type="range" min="0" max="1" step="0.01" 
      value={value} onChange={e => onChange(parseFloat(e.target.value))} 
      className="w-16 h-1 accent-[#ff5500]"
    />
  </div>
);

export const TurboGeigerDeck: FC<HouseDeckProps> = ({ deckId, color, onSwitchToTrack }) => {
  const [snapshot, setSnapshot] = useState<TurboGeigerSnapshot>({
    isPlaying: false,
    halfLife: 0.5,
    radiationType: 'alpha',
    masterVolume: 1.0,
  });

  const [blink, setBlink] = useState(false);
  const [ticks, setTicks] = useState(0); // CPS counter

  const engineRef = useRef<TurboGeigerEngine | null>(null);

  useEffect(() => {
    const engine = new TurboGeigerEngine(deckId);
    engine.init(new window.AudioContext());
    engineRef.current = engine;

    engine.onTick = () => {
      setBlink(true);
      setTicks(t => t + 1);
      setTimeout(() => setBlink(false), 50);
    };

    return () => engine.destroy();
  }, [deckId]);

  // CPS Counter reset
  useEffect(() => {
    const int = setInterval(() => setTicks(0), 1000);
    return () => clearInterval(int);
  }, []);

  if (!engineRef.current) return null;
  const engine = engineRef.current;

  const handleToggle = () => {
    if (snapshot.isPlaying) {
      engine.stop();
      setSnapshot(s => ({ ...s, isPlaying: false }));
    } else {
      engine.engage();
      setSnapshot(s => ({ ...s, isPlaying: true }));
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#1a0500] border border-orange-900 text-orange-500 rounded-lg p-4 font-mono shadow-[0_0_20px_rgba(255,85,0,0.1)]">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4 border-b border-orange-900 pb-2">
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg" style={{ color: color || '#ff5500' }}>DECK {deckId} [TurboGeiger]</span>
          <span className="text-xs uppercase px-2 bg-orange-900/50 text-orange-200">
            {snapshot.isPlaying ? 'MÜLLER TUBE ACTIVE' : 'SHIELDED'}
          </span>
        </div>
        <button onClick={onSwitchToTrack} className="text-orange-700 hover:text-orange-400">[×]</button>
      </div>

      {/* BODY */}
      <div className="flex flex-1 gap-6 p-2">
        
        {/* LEFT: CONTROLS */}
        <div className="w-1/2 flex flex-col gap-4">
           <button 
             onClick={handleToggle}
             className={`w-full py-2 font-bold transition-all border ${
               snapshot.isPlaying 
                 ? 'bg-orange-900/50 border-orange-500 text-orange-200' 
                 : 'bg-transparent border-orange-900 text-orange-700 hover:bg-orange-950'
             }`}
           >
             {snapshot.isPlaying ? 'DISABLE SENSOR' : 'EXPOSE SENSOR'}
           </button>

           <div className="flex flex-col gap-2 p-3 bg-black/50 border border-orange-900/50">
              <span className="text-[10px] text-orange-700">STOCHASTIC HALF-LIFE</span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-orange-600">{(snapshot.halfLife * 100).toFixed(0)}%</span>
                <Knob 
                  label="Density" value={snapshot.halfLife} 
                  onChange={(v: number) => { 
                    engine.halfLife = v; setSnapshot(s => ({...s, halfLife: v}));
                  }} 
                />
              </div>
           </div>

           <div className="flex flex-col gap-2 p-3 bg-black/50 border border-orange-900/50">
              <span className="text-[10px] text-orange-700">ISOTOPE TYPE</span>
              <div className="flex items-center justify-between gap-1">
                 {['alpha', 'beta', 'gamma'].map(type => (
                   <button 
                     key={type}
                     onClick={() => { const wt = type as 'alpha'|'beta'|'gamma'; engine.radiationType = wt; setSnapshot(s => ({...s, radiationType: wt})) }}
                     className={`flex-1 text-[10px] uppercase py-1 border ${snapshot.radiationType === type ? 'bg-orange-600 text-black border-orange-500' : 'bg-transparent border-orange-900 text-orange-600'}`}
                   >
                     {type}
                   </button>
                 ))}
              </div>
           </div>
        </div>

        {/* RIGHT: DOSIMETER HUD */}
        <div className="flex-1 relative bg-black border-4 border-orange-900 flex flex-col items-center justify-center overflow-hidden p-2">
            
            <span className="absolute top-2 left-2 text-[10px] text-orange-700">CPM (COUNTS/SEC)</span>
            
            {/* The giant flashing CPM counter */}
            <div className={`text-6xl font-bold font-mono transition-colors ${blink ? 'text-white' : 'text-orange-500'}`}>
               {snapshot.isPlaying ? (ticks * 60).toString().padStart(4, '0') : '0000'}
            </div>
            
            <div className="w-full mt-4 h-8 flex gap-1 items-end justify-center px-4">
               {/* Visual histogram mock */}
               {Array.from({length: 20}).map((_, i) => (
                 <div 
                   key={i} 
                   className="flex-1 bg-orange-700 transition-all duration-100"
                   style={{ 
                     height: snapshot.isPlaying ? `${Math.random() * (ticks > 0 ? 100 : 5)}%` : '5%',
                     opacity: blink ? 1 : 0.5 
                   }}
                 />
               ))}
            </div>

            {/* Radiation hazard symbol SVG background */}
            <svg viewBox="0 0 100 100" className="absolute w-40 h-40 opacity-10 pointer-events-none fill-orange-500">
               <path d="M50 0 C22.4 0 0 22.4 0 50 C0 77.6 22.4 100 50 100 C77.6 100 100 77.6 100 50 C100 22.4 77.6 0 50 0 Z M50 15 C66 15 80 26 83.5 40 L63.5 40 C61.5 32 54 26.5 45 26.5 C36 26.5 28.5 32 26.5 40 L6.5 40 C10 26 24 15 50 15 Z" />
            </svg>
        </div>

      </div>

      {/* FOOTER */}
      <div className="border-t border-orange-900/50 pt-3 flex justify-between items-center">
         <span className="text-[10px] text-orange-800 animate-pulse">POISSON DIST ALGORITHM</span>
         <div className="flex gap-4">
            <Knob 
              label="Out Vol" value={snapshot.masterVolume} 
              onChange={(v: number) => { engine.masterVolume = v; setSnapshot(s => ({...s, masterVolume: v})); }} 
            />
         </div>
      </div>
    </div>
  );
};
