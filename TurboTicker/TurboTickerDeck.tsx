import React, { useState, useEffect, useRef, FC } from 'react';
import { TurboTickerEngine, DeckId } from './TurboTickerEngine';
import { TurboTickerSnapshot } from './types';

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
      className="w-16 h-1 accent-[#ffaa00]"
    />
  </div>
);

export const TurboTickerDeck: FC<HouseDeckProps> = ({ deckId, color, onSwitchToTrack }) => {
  const [snapshot, setSnapshot] = useState<TurboTickerSnapshot>({
    isActive: false,
    price: 0,
    trend: 'flat',
    speedMultiplier: 1.0,
    masterVolume: 1.0,
  });

  const engineRef = useRef<TurboTickerEngine | null>(null);

  useEffect(() => {
    const engine = new TurboTickerEngine(deckId);
    engine.init(new window.AudioContext());
    engineRef.current = engine;

    engine.onTick = (price, trend) => {
      setSnapshot(s => ({ ...s, price, trend }));
    };

    return () => engine.destroy();
  }, [deckId]);

  if (!engineRef.current) return null;
  const engine = engineRef.current;

  const handleToggle = () => {
    if (snapshot.isActive) {
      engine.stop();
      setSnapshot(s => ({ ...s, isActive: false }));
    } else {
      engine.engage();
      setSnapshot(s => ({ ...s, isActive: true }));
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#110a00] border border-orange-900 text-orange-500 rounded-lg p-4 font-mono shadow-[0_0_20px_rgba(255,170,0,0.1)]">
      
      <div className="flex justify-between items-center mb-4 border-b border-orange-900 pb-2">
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg" style={{ color: color || '#ffaa00' }}>DECK {deckId} [TurboTicker]</span>
          <span className="text-xs uppercase px-2 bg-orange-900/50 text-orange-200">
            {snapshot.isActive ? 'MARKET ARBITRAGE' : 'OFFLINE'}
          </span>
        </div>
        <button onClick={onSwitchToTrack} className="text-orange-700 hover:text-orange-400">[×]</button>
      </div>

      <div className="flex flex-1 gap-6 p-2">
        <div className="w-1/2 flex flex-col gap-4">
           <button 
             onClick={handleToggle}
             className={`w-full py-2 font-bold transition-all border outline-none ${
               snapshot.isActive 
                 ? 'bg-orange-900/50 border-orange-500 text-orange-200' 
                 : 'bg-transparent border-orange-900 text-orange-700 hover:bg-orange-950'
             }`}
           >
             {snapshot.isActive ? 'CLOSE POSITIONS' : 'SHORT BTC/USD'}
           </button>

           <div className="flex flex-col gap-4 p-3 bg-black/50 border border-orange-900/50 h-full justify-center text-center">
              <span className="text-[10px] text-orange-700">ANXIETY MULTIPLIER</span>
              <Knob 
                label="Stress" value={snapshot.speedMultiplier / 5} 
                onChange={(v: number) => { 
                  const rate = Math.max(0.1, v * 5);
                  engine.speedMultiplier = rate; setSnapshot(s => ({...s, speedMultiplier: rate}));
                }} 
              />
           </div>
        </div>

        {/* RIGHT: MARKET HUD */}
        <div className="flex-1 relative bg-black border border-orange-900 flex flex-col items-center justify-center p-4">
           
           <span className="absolute top-2 left-2 text-[10px] text-orange-800">SHEPARD TONE PARADOX / BTC</span>
           
           <div className="text-5xl font-bold tracking-tight text-white mb-2">
              ${snapshot.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
           </div>
           
           {snapshot.isActive && (
              <div className={`text-xl font-bold px-4 py-1 uppercase border ${snapshot.trend === 'up' ? 'text-green-500 border-green-500' : snapshot.trend === 'down' ? 'text-red-500 border-red-500 animate-pulse' : 'text-gray-500 border-gray-500'}`}>
                {snapshot.trend === 'up' ? '▲ BULL INFLATION (Ascending)' : snapshot.trend === 'down' ? '▼ BEAR CRASH (Descending)' : 'LATERAL (Stagnation)'}
              </div>
           )}

           {/* Decorator Candlesticks */}
           <div className="absolute bottom-0 w-full h-10 flex items-end gap-[1px] opacity-20">
              {Array.from({length: 40}).map((_, i) => (
                <div key={i} className="flex-1 bg-orange-700" style={{height: `${Math.random() * 100}%`}} />
              ))}
           </div>
        </div>
      </div>

      <div className="border-t border-orange-900/50 pt-3 flex justify-between items-center">
         <span className="text-[10px] text-orange-800">PSYCHOACOUSTIC INFINITE GLISSANDO</span>
         <Knob 
           label="Gain" value={snapshot.masterVolume} 
           onChange={(v: number) => { engine.masterVolume = v; setSnapshot(s => ({...s, masterVolume: v})); }} 
         />
      </div>
    </div>
  );
};
