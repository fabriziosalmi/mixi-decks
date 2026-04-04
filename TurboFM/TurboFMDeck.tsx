import React, { useState, useEffect, useRef, FC } from 'react';
import { TurboFMEngine, DeckId } from './TurboFMEngine';
import { TurboFMSnapshot, defaultSynth, defaultFx, defaultSteps } from './types';

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
      className="w-12 h-1"
    />
  </div>
);

export const TurboFMDeck: FC<HouseDeckProps> = ({ deckId, color, onSwitchToTrack }) => {
  const [snapshot, setSnapshot] = useState<TurboFMSnapshot>({
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

  const engineRef = useRef<TurboFMEngine | null>(null);

  useEffect(() => {
    const engine = new TurboFMEngine(deckId);
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
          <span className="font-bold text-lg" style={{ color }}>DECK {deckId} [TurboFM]</span>
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

      {/* BODY - FM MATRIX */}
      <div className="flex flex-1 gap-4 mb-4">
        
        {/* GLOBAL ENVELOPES & ALGO */}
        <div className="flex flex-col gap-4 bg-black/20 p-3 rounded border border-gray-800 w-1/4">
          <div className="text-[10px] font-bold text-gray-400 border-b border-gray-800 pb-1">GLOBAL</div>
          <div className="grid grid-cols-2 gap-2">
            <Knob label="Algo" value={snapshot.synth.algo} onChange={(v: number) => { engine.setSynthParam('algo', v); setSnapshot(s => ({...s, synth: {...s.synth, algo: v}})) }} />
            <Knob label="Feedback" value={snapshot.synth.feedback} onChange={(v: number) => { engine.setSynthParam('feedback', v); setSnapshot(s => ({...s, synth: {...s.synth, feedback: v}})) }} />
            <Knob label="Car Attck" value={snapshot.synth.carAttack} onChange={(v: number) => { engine.setSynthParam('carAttack', v); setSnapshot(s => ({...s, synth: {...s.synth, carAttack: v}})) }} />
            <Knob label="Car Decay" value={snapshot.synth.carDecay} onChange={(v: number) => { engine.setSynthParam('carDecay', v); setSnapshot(s => ({...s, synth: {...s.synth, carDecay: v}})) }} />
            <Knob label="Mod Attck" value={snapshot.synth.modAttack} onChange={(v: number) => { engine.setSynthParam('modAttack', v); setSnapshot(s => ({...s, synth: {...s.synth, modAttack: v}})) }} />
            <Knob label="Mod Decay" value={snapshot.synth.modDecay} onChange={(v: number) => { engine.setSynthParam('modDecay', v); setSnapshot(s => ({...s, synth: {...s.synth, modDecay: v}})) }} />
          </div>
        </div>

        {/* OPERATORS */}
        <div className="flex flex-col gap-2 bg-black/20 p-3 rounded border border-gray-800 flex-1">
          <div className="text-[10px] font-bold text-gray-400 border-b border-gray-800 pb-1">OPERATORS</div>
          <div className="grid grid-cols-4 gap-2 flex-1">
            <div className="flex flex-col gap-2 border-r border-gray-800 pr-2">
              <span className="text-center text-[10px] text-gray-500">OP1</span>
              <Knob label="Ratio" value={snapshot.synth.op1Ratio} onChange={(v: number) => { engine.setSynthParam('op1Ratio', v); setSnapshot(s => ({...s, synth: {...s.synth, op1Ratio: v}})) }} />
              <Knob label="Level" value={snapshot.synth.op1Level} onChange={(v: number) => { engine.setSynthParam('op1Level', v); setSnapshot(s => ({...s, synth: {...s.synth, op1Level: v}})) }} />
            </div>
            <div className="flex flex-col gap-2 border-r border-gray-800 pr-2">
              <span className="text-center text-[10px] text-gray-500">OP2</span>
              <Knob label="Ratio" value={snapshot.synth.op2Ratio} onChange={(v: number) => { engine.setSynthParam('op2Ratio', v); setSnapshot(s => ({...s, synth: {...s.synth, op2Ratio: v}})) }} />
              <Knob label="Level" value={snapshot.synth.op2Level} onChange={(v: number) => { engine.setSynthParam('op2Level', v); setSnapshot(s => ({...s, synth: {...s.synth, op2Level: v}})) }} />
            </div>
            <div className="flex flex-col gap-2 border-r border-gray-800 pr-2">
              <span className="text-center text-[10px] text-gray-500">OP3</span>
              <Knob label="Ratio" value={snapshot.synth.op3Ratio} onChange={(v: number) => { engine.setSynthParam('op3Ratio', v); setSnapshot(s => ({...s, synth: {...s.synth, op3Ratio: v}})) }} />
              <Knob label="Level" value={snapshot.synth.op3Level} onChange={(v: number) => { engine.setSynthParam('op3Level', v); setSnapshot(s => ({...s, synth: {...s.synth, op3Level: v}})) }} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-center text-[10px] text-gray-500">OP4</span>
              <Knob label="Ratio" value={snapshot.synth.op4Ratio} onChange={(v: number) => { engine.setSynthParam('op4Ratio', v); setSnapshot(s => ({...s, synth: {...s.synth, op4Ratio: v}})) }} />
              <Knob label="Level" value={snapshot.synth.op4Level} onChange={(v: number) => { engine.setSynthParam('op4Level', v); setSnapshot(s => ({...s, synth: {...s.synth, op4Level: v}})) }} />
            </div>
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
