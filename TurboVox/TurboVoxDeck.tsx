import React, { useState, useEffect, useRef, FC } from 'react';
import { TurboVoxEngine, DeckId } from './TurboVoxEngine';
import { TurboVoxSnapshot, defaultSynth, defaultFx, defaultSteps } from './types';

export interface HouseDeckProps {
  deckId: DeckId;
  color: string;
  onSwitchToTrack: () => void;
}

export interface KnobProps { value: number; label: string; onChange: (v: number) => void; size?: string; }
const Knob: FC<KnobProps> = ({ value, label, onChange, size = 'normal' }) => (
  <div className="flex flex-col items-center">
    <span className="text-[10px] text-gray-400 font-mono truncate max-w-[60px]">{label}</span>
    <input 
      type="range" min="0" max="1" step="0.01" 
      value={value} onChange={e => onChange(parseFloat(e.target.value))} 
      className={size === 'large' ? "w-24 h-2 accent-[#ff0055]" : "w-12 h-1"}
    />
  </div>
);

export const TurboVoxDeck: FC<HouseDeckProps> = ({ deckId, color, onSwitchToTrack }) => {
  const [snapshot, setSnapshot] = useState<TurboVoxSnapshot>({
    isPlaying: false,
    currentStep: -1,
    bpm: 120,
    syncToMaster: true,
    steps: defaultSteps(),
    synth: defaultSynth(),
    fx: defaultFx(),
    masterVolume: 1.0,
    swing: 0,
  });

  const engineRef = useRef<TurboVoxEngine | null>(null);

  useEffect(() => {
    const engine = new TurboVoxEngine(deckId);
    engine.init(new window.AudioContext());
    engineRef.current = engine;

    engine.onStepChange = (step) => {
      setSnapshot(s => ({ ...s, currentStep: step }));
    };

    return () => engine.destroy();
  }, [deckId]);

  if (!engineRef.current) return null;
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
          <span className="font-bold text-lg" style={{ color }}>DECK {deckId} [TurboVox]</span>
          <span>{snapshot.bpm} BPM</span>
        </div>
        <button onClick={onSwitchToTrack} className="text-gray-400 hover:text-white">[×]</button>
      </div>

      {/* SEQUENCER (32 BAR) */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex justify-between gap-1">
          {snapshot.steps.slice(0, 16).map((step, i) => (
            <div 
              key={i} onClick={() => handleStepToggle(i)}
              className={`flex-1 h-6 flex items-center justify-center cursor-pointer border ${
                snapshot.currentStep === i ? 'border-white' : 'border-gray-800'
              }`}
              style={{ backgroundColor: step.gate ? color : 'transparent' }}
            />
          ))}
        </div>
        <div className="flex justify-between gap-1">
          {snapshot.steps.slice(16, 32).map((step, i) => (
            <div 
              key={i + 16} onClick={() => handleStepToggle(i + 16)}
              className={`flex-1 h-6 flex items-center justify-center cursor-pointer border ${
                snapshot.currentStep === i + 16 ? 'border-white' : 'border-gray-800'
              }`}
              style={{ backgroundColor: step.gate ? color : 'transparent' }}
            />
          ))}
        </div>
      </div>

      {/* BODY - VOX PARAMETERS */}
      <div className="flex flex-1 gap-4 mb-4 items-center justify-center">
        
        {/* BIG MORPH KNOB */}
        <div className="flex flex-col items-center justify-center bg-black/30 p-6 rounded-full border-2 border-[#ff0055]/30 shadow-[0_0_15px_rgba(255,0,85,0.2)]">
          <div className="flex justify-between w-full text-[10px] text-gray-500 font-bold mb-1 px-2">
            <span>A</span>
            <span>E</span>
            <span>I</span>
            <span>O</span>
            <span>U</span>
          </div>
          <Knob 
            label="FORMANT MORPH" 
            size="large"
            value={snapshot.synth.morph} 
            onChange={(v: number) => { engine.setSynthParam('morph', v); setSnapshot(s => ({...s, synth: {...s.synth, morph: v}})) }} 
          />
        </div>

        <div className="flex flex-col justify-between gap-4">
          <div className="flex gap-4 p-3 bg-black/20 rounded border border-gray-800">
            <Knob label="Vibrato" value={snapshot.synth.vibrato} onChange={(v: number) => { engine.setSynthParam('vibrato', v); setSnapshot(s => ({...s, synth: {...s.synth, vibrato: v}})) }} />
            <Knob label="LFO Rate" value={snapshot.synth.lfoRate} onChange={(v: number) => { engine.setSynthParam('lfoRate', v); setSnapshot(s => ({...s, synth: {...s.synth, lfoRate: v}})) }} />
            <Knob label="Glide" value={snapshot.synth.glide} onChange={(v: number) => { engine.setSynthParam('glide', v); setSnapshot(s => ({...s, synth: {...s.synth, glide: v}})) }} />
          </div>

          <div className="flex gap-4 p-3 bg-black/20 rounded border border-gray-800">
            <Knob label="Attack" value={snapshot.synth.attack} onChange={(v: number) => { engine.setSynthParam('attack', v); setSnapshot(s => ({...s, synth: {...s.synth, attack: v}})) }} />
            <Knob label="Decay" value={snapshot.synth.decay} onChange={(v: number) => { engine.setSynthParam('decay', v); setSnapshot(s => ({...s, synth: {...s.synth, decay: v}})) }} />
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
            label="Vol" 
            value={snapshot.masterVolume} 
            onChange={(v: number) => { engine.masterVolume = v; setSnapshot(s => ({...s, masterVolume: v})) }} 
          />
          <button onClick={() => engine.clearPattern()} className="px-3 py-1 bg-red-900/50 rounded text-xs">CLR</button>
        </div>
      </div>
    </div>
  );
};
