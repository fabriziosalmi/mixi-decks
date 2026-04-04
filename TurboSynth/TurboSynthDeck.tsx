import React, { useState, useEffect, useRef, FC } from 'react';
import { TurboSynthEngine, DeckId } from './TurboSynthEngine';
import { TurboSynthSnapshot, defaultSynth, defaultFx, defaultSteps } from './types';

export interface HouseDeckProps {
  deckId: DeckId;
  color: string;
  onSwitchToTrack: () => void;
}

const Knob: FC<any> = ({ value, label, onChange }) => (
  <div className="flex flex-col items-center">
    <span className="text-xs text-gray-400">{label}</span>
    <input 
      type="range" min="0" max="1" step="0.01" 
      value={value} onChange={e => onChange(parseFloat(e.target.value))} 
    />
  </div>
);

export const TurboSynthDeck: FC<HouseDeckProps> = ({ deckId, color, onSwitchToTrack }) => {
  const [snapshot, setSnapshot] = useState<TurboSynthSnapshot>({
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

  const engineRef = useRef<TurboSynthEngine | null>(null);

  useEffect(() => {
    const engine = new TurboSynthEngine(deckId);
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
          <span className="font-bold text-lg" style={{ color }}>DECK {deckId} [TurboSynth]</span>
          <span>{snapshot.bpm} BPM</span>
        </div>
        <button onClick={onSwitchToTrack} className="text-gray-400 hover:text-white">[×]</button>
      </div>

      {/* SEQUENCER (32 BAR, splits in 2 rows of 16 for UI) */}
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex justify-between gap-1">
          {snapshot.steps.slice(0, 16).map((step, i) => (
            <div 
              key={i} onClick={() => handleStepToggle(i)}
              className={`flex-1 h-8 flex items-center justify-center cursor-pointer border ${
                snapshot.currentStep === i ? 'border-white' : 'border-gray-800'
              }`}
              style={{ backgroundColor: step.gate ? color : 'transparent' }}
            >
              <div className="text-[10px] opaciy-50">{i + 1}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-between gap-1">
          {snapshot.steps.slice(16, 32).map((step, i) => (
            <div 
              key={i + 16} onClick={() => handleStepToggle(i + 16)}
              className={`flex-1 h-8 flex items-center justify-center cursor-pointer border ${
                snapshot.currentStep === i + 16 ? 'border-white' : 'border-gray-800'
              }`}
              style={{ backgroundColor: step.gate ? color : 'transparent' }}
            >
              <div className="text-[10px] opaciy-50">{i + 17}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 gap-8 mb-4">
        {/* SYNTH CONTROLS */}
        <div className="grid grid-cols-5 gap-4 bg-black/20 p-4 rounded border border-gray-800 w-full">
          <Knob 
            label="Wave" value={snapshot.synth.waveform} 
            onChange={(v: number) => { engine.setSynthParam('waveform', v); setSnapshot(s => ({...s, synth: {...s.synth, waveform: v}})) }} 
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
            label="Attack" value={snapshot.synth.attack} 
            onChange={(v: number) => { engine.setSynthParam('attack', v); setSnapshot(s => ({...s, synth: {...s.synth, attack: v}})) }} 
          />
          <Knob 
            label="Release" value={snapshot.synth.release} 
            onChange={(v: number) => { engine.setSynthParam('release', v); setSnapshot(s => ({...s, synth: {...s.synth, release: v}})) }} 
          />
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
