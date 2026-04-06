import React, { useState, useEffect, useRef, FC } from 'react';
import { JS303Engine, DeckId } from './JS303Engine';
import { JS303Snapshot, defaultSynth, defaultFx, defaultSteps } from './types';
export interface HouseDeckProps {
  deckId: DeckId;
  color: string;
  onSwitchToTrack: () => void;
}

// Mock Knob for compilation completeness
export interface KnobProps { value: number; label: string; onChange: (v: number) => void; size?: string; }
const Knob: FC<KnobProps> = ({ value, label, onChange }) => (
  <div className="flex flex-col items-center gap-1 group">
    <span className="text-[10px] text-gray-500 font-mono tracking-wider group-hover:text-gray-300 transition-colors uppercase">{label}</span>
    <input 
      type="range" min="0" max="1" step="0.01" 
      value={value} onChange={e => onChange(parseFloat(e.target.value))}
      className="w-12 h-1 bg-gray-800 rounded-full appearance-none outline-none cursor-pointer accent-white hover:accent-gray-300 transition-all"
    />
  </div>
);

export const JS303Deck: FC<HouseDeckProps> = ({ deckId, color, onSwitchToTrack }) => {
  const [snapshot, setSnapshot] = useState<JS303Snapshot>({
    isPlaying: false,
    currentStep: -1,
    bpm: 130,
    syncToMaster: true,
    steps: defaultSteps(),
    synth: defaultSynth(),
    fx: defaultFx(),
    masterVolume: 1.0,
    swing: 0,
  });

  const engineRef = useRef<JS303Engine | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const engine = new JS303Engine(deckId);
    const ctx = new window.AudioContext();
    
    let isMounted = true;
    engine.init(ctx).then(() => {
      if (isMounted) {
        engineRef.current = engine;
        
        engine.onStepChange = (step) => {
          setSnapshot(s => ({ ...s, currentStep: step }));
        };
        
        setIsReady(true);
      }
    });

    return () => {
      isMounted = false;
      engine.destroy();
      ctx.close(); // Prevent severe AudioContext leaks (Max 6 per browser tab)
    };
  }, [deckId]);

  if (!isReady || !engineRef.current) {
    return (
      <div className="flex flex-col h-full w-full bg-black/40 text-white rounded-lg p-4 font-mono items-center justify-center border border-gray-800">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-b-2" style={{ borderColor: color, animation: 'spin 1s linear infinite' }} />
          <span className="text-xs tracking-widest text-gray-500">BOOTING AUDIOWORKLET...</span>
        </div>
      </div>
    );
  }
  
  const engine = engineRef.current;

  const handlePlayToggle = () => {
    if (snapshot.isPlaying) {
      engine.stop();
      setSnapshot(s => ({ ...s, isPlaying: false }));
    } else {
      engine.engage();
      setSnapshot(s => ({ ...s, isPlaying: true }));
    }
  };

  const handleStepToggle = (idx: number) => {
    const s = snapshot.steps[idx];
    const newSteps = [...snapshot.steps];
    newSteps[idx] = { ...s, gate: !s.gate };
    engine.updateStep(idx, { gate: !s.gate });
    setSnapshot(s => ({ ...s, steps: newSteps }));
  };

  return (
    <div className="flex flex-col h-full w-full bg-black/40 text-white rounded-lg p-4 font-mono">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg" style={{ color }}>DECK {deckId} [JS303]</span>
          <span>{snapshot.bpm} BPM</span>
        </div>
        <button 
          onClick={onSwitchToTrack}
          className="text-gray-400 hover:text-white"
        >
          [×]
        </button>
      </div>

      {/* SEQUENCER */}
      <div className="flex justify-between mb-8 gap-1">
        {snapshot.steps.map((step, i) => (
          <div 
            key={i} 
            onClick={() => handleStepToggle(i)}
            className={`flex-1 h-12 flex flex-col items-center justify-center cursor-pointer border ${
              snapshot.currentStep === i ? 'border-white' : 'border-gray-800'
            } ${step.gate ? 'bg-opacity-50' : 'bg-transparent'} transition`}
            style={{ backgroundColor: step.gate ? color : undefined }}
          >
            <div className="text-xs">{i + 1}</div>
          </div>
        ))}
      </div>

      {/* BODY */}
      <div className="flex flex-1 gap-8 mb-4">
        {/* SYNTH CONTROLS */}
        <div className="grid grid-cols-4 gap-4 bg-black/20 p-4 rounded border border-gray-800">
          <Knob 
            label="Tune" value={snapshot.synth.tuning} 
            onChange={(v: number) => { engine.setSynthParam('tuning', v); setSnapshot(s => ({...s, synth: {...s.synth, tuning: v}})) }} 
          />
          <Knob 
            label="Cutoff" value={snapshot.synth.cutoff} 
            onChange={(v: number) => { engine.setSynthParam('cutoff', v); setSnapshot(s => ({...s, synth: {...s.synth, cutoff: v}})) }} 
          />
          <Knob 
            label="Resonance" value={snapshot.synth.resonance} 
            onChange={(v: number) => { engine.setSynthParam('resonance', v); setSnapshot(s => ({...s, synth: {...s.synth, resonance: v}})) }} 
          />
          <Knob 
            label="Env Mod" value={snapshot.synth.envMod} 
            onChange={(v: number) => { engine.setSynthParam('envMod', v); setSnapshot(s => ({...s, synth: {...s.synth, envMod: v}})) }} 
          />
          <Knob 
            label="Decay" value={snapshot.synth.decay} 
            onChange={(v: number) => { engine.setSynthParam('decay', v); setSnapshot(s => ({...s, synth: {...s.synth, decay: v}})) }} 
          />
          <Knob 
            label="Accent" value={snapshot.synth.accent} 
            onChange={(v: number) => { engine.setSynthParam('accent', v); setSnapshot(s => ({...s, synth: {...s.synth, accent: v}})) }} 
          />
        </div>

        {/* FX CONTROLS */}
        <div className="flex flex-col gap-4 bg-black/20 p-4 rounded border border-gray-800">
          <div className="text-sm font-bold text-gray-500">DISTORTION</div>
          <div className="flex gap-4">
             <Knob label="Shape" value={snapshot.fx.distShape} onChange={(v: number) => engine.setFx('distShape', v)} />
             <Knob label="Clip" value={snapshot.fx.distThreshold} onChange={(v: number) => engine.setFx('distThreshold', v)} />
          </div>
        </div>
      </div>

      {/* TRANSPORT */}
      <div className="flex justify-between items-center border-t border-gray-700 pt-4">
        <button 
          onClick={handlePlayToggle}
          className="px-6 py-2 border rounded font-bold"
          style={{ borderColor: snapshot.isPlaying ? color : 'gray', color: snapshot.isPlaying ? color : 'white' }}
        >
          {snapshot.isPlaying ? 'STOP' : 'ENGAGE'}
        </button>
        
        <div className="flex gap-4 items-center">
          <Knob 
            label="Volume" 
            value={snapshot.masterVolume} 
            onChange={(v: number) => { engine.masterVolume = v; setSnapshot(s => ({...s, masterVolume: v})) }} 
          />
          <button onClick={() => engine.clearPattern()} className="px-3 py-1 bg-red-900/50 rounded">CLR</button>
        </div>
      </div>
    </div>
  );
};
