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

  const handleMutateSeq = () => {
    if (!engineRef.current) return;
    engineRef.current.mutateSequence();
    setSnapshot(s => ({ ...s, steps: [...engineRef.current!.steps] }));
  };

  const handleMutateSynth = () => {
    if (!engineRef.current) return;
    engineRef.current.mutateParams();
    setSnapshot(s => ({ ...s, synth: { ...engineRef.current!.synthParams } }));
  };

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
    <div className="flex flex-col h-full w-full bg-[#0a0a0c]/60 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-white rounded-xl p-4 font-mono relative overflow-hidden group transition-all">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      {/* HEADER */}
      <div className="relative z-10 flex justify-between items-center mb-4 border-b border-white/10 pb-3">
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
      <div className="flex justify-between mb-8 gap-1 relative z-10">
        {snapshot.steps.map((step, i) => (
          <div 
            key={i} 
            onClick={() => handleStepToggle(i)}
            className={`flex-1 h-12 flex flex-col items-center justify-center cursor-pointer transition-all border ${
              snapshot.currentStep === i ? 'border-white scale-105 shadow-[0_0_15px_rgba(255,255,255,0.4)] z-10' : 'border-white/10 hover:bg-white/5'
            } ${step.gate ? 'bg-opacity-80 shadow-inner' : 'bg-black/30'}`}
            style={{ backgroundColor: step.gate ? color : undefined }}
          >
            <div className="text-[10px] opacity-70 font-bold">{i + 1}</div>
            {step.accent && <div className="absolute top-0 w-full h-1 bg-white/70" />}
            {step.slide && <div className="absolute bottom-0 w-full h-1 bg-white/50" />}
          </div>
        ))}
      </div>

      {/* BODY */}
      <div className="relative z-10 flex flex-1 gap-8 mb-4 border border-white/10 p-3 rounded-lg bg-black/20 backdrop-blur shadow-inner">
        {/* SYNTH CONTROLS */}
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
            <span className="text-[10px] tracking-widest font-bold text-gray-400">ANALOG CIRCUIT</span>
            <button 
              onClick={handleMutateSynth} 
              className="text-[9px] text-[#00ffcc] hover:text-white px-2 py-1 rounded border border-[#00ffcc]/30 bg-[#00ffcc]/10 font-bold transition tracking-wider"
            >
              DICE SYNTH
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4 p-2">
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
        </div>

        {/* FX CONTROLS */}
        <div className="flex flex-col gap-4 p-3 bg-white/5 border-l border-white/10 rounded-r-lg">
          <div className="text-[10px] tracking-widest font-bold text-gray-400 border-b border-white/5 pb-2">DISTORTION</div>
          <div className="flex gap-4">
             <Knob label="Shape" value={snapshot.fx.distShape} onChange={(v: number) => engine.setFx('distShape', v)} />
             <Knob label="Clip" value={snapshot.fx.distThreshold} onChange={(v: number) => engine.setFx('distThreshold', v)} />
          </div>
        </div>
      </div>

      {/* TRANSPORT */}
      <div className="relative z-10 flex justify-between items-center border-t border-white/10 pt-4 mt-auto">
        <button 
          onClick={handlePlayToggle}
          className="px-8 py-2 border rounded-lg font-bold tracking-widest shadow-lg transition-all"
          style={{ 
            borderColor: snapshot.isPlaying ? color : 'rgba(255,255,255,0.2)', 
            color: snapshot.isPlaying ? color : '#aaa',
            backgroundColor: snapshot.isPlaying ? `${color}20` : 'transparent',
            boxShadow: snapshot.isPlaying ? `0 0 20px ${color}40` : 'none'
          }}
        >
          {snapshot.isPlaying ? 'RUNNING' : 'START'}
        </button>
        
        <div className="flex gap-4 items-center bg-black/40 p-2 rounded-lg border border-white/5 backdrop-blur">
          <Knob 
            label="Volume" 
            value={snapshot.masterVolume} 
            onChange={(v: number) => { engine.masterVolume = v; setSnapshot(s => ({...s, masterVolume: v})) }} 
          />
          <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
          <button onClick={() => engine.clearPattern()} className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded text-[10px] hover:bg-red-500/20 transition-colors">CLR</button>
          <button onClick={handleMutateSeq} className="px-3 py-1 bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/30 rounded text-[10px] font-bold hover:bg-[#00ffcc]/20 transition-colors tracking-wider">DICE SEQ</button>
        </div>
      </div>
    </div>
  );
};
