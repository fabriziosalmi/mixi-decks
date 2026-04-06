import { JS303Bus } from './JS303Bus';
import { JS303Synth } from './JS303Synth';
import { defaultSynth, defaultFx, defaultSteps, FxKnobId, SynthParamId, JS303Step, STEP_COUNT } from './types';
// Note: useMixiStore is a fictional import conforming to user's spec
// import { useMixiStore } from '../../store'; 

export type DeckId = 'A' | 'B';

export class JS303Engine {
  readonly deckId: DeckId;
  private ctx!: AudioContext;
  
  private bus!: JS303Bus;
  private synth!: JS303Synth;

  private _playing = false;
  private _currentStep = -1;
  private _bpm = 130;
  private _syncToMaster = false;
  private _swing = 0.0;
  private _masterVolume = 1.0;

  private _steps: JS303Step[] = defaultSteps();
  private _synthParams = defaultSynth();
  private _fxParams = defaultFx();

  // Callbacks
  onStepChange?: (step: number) => void;
  onTrigger?: (step: number) => void;

  private timerId: number | null = null;
  private uiTimers: Set<number> = new Set();
  private nextStepTime = 0;

  constructor(deckId: DeckId) {
    this.deckId = deckId;
  }

  async init(ctx: AudioContext) {
    this.ctx = ctx;
    
    this.bus = new JS303Bus(this.ctx);
    this.synth = new JS303Synth(this.ctx);
    
    await this.synth.init();

    
    // Connect Synth output to Bus input
    this.synth.connect(this.bus.input);

    // Apply init states
    this.applyAllSynthParams();
    this.applyAllFxParams();
    this.synth.setPattern(this._steps);
    this.synth.setTempo(this._bpm);
  }

  destroy() {
    this.stop();
    this.synth.destroy();
    this.bus.destroy();
  }

  engage() {
    if (this._playing) return;
    
    // In a real mixi environment, apply quantization here based on other deck's beat
    this._playing = true;
    this.nextStepTime = this.ctx.currentTime;
    
    // Since our Rust 303 is self-sequencing, we tell it to run
    this.synth.setRunning(true);
    
    const TICK_MS = 25;
    this.timerId = window.setInterval(this.tick, TICK_MS);
  }

  stop() {
    this._playing = false;
    this._currentStep = -1;
    this.synth.setRunning(false);
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.uiTimers.forEach(t => window.clearTimeout(t));
    this.uiTimers.clear();
    if (this.onStepChange) this.onStepChange(-1);
  }

  private tick = () => {
    // Keep JS UI in sync with the audio thread sequencer
    const bpm = this.getSyncBpm();
    this.synth.setTempo(bpm);
    
    const stepDuration = (60 / bpm) / 4; // 16th note
    const LOOK_AHEAD_S = 0.05;
    
    while (this.nextStepTime < this.ctx.currentTime + LOOK_AHEAD_S) {
      this._currentStep = (this._currentStep + 1) % STEP_COUNT;
      
      // Notify UI
      if (this.onStepChange) {
        // UI uses setTimeout so it triggers exactly when the audio starts
        const delay = Math.max(0, this.nextStepTime - this.ctx.currentTime) * 1000;
        const stepToNotify = this._currentStep;
        const t = window.setTimeout(() => {
          this.uiTimers.delete(t);
          if (this.isPlaying && this.onStepChange) this.onStepChange(stepToNotify);
        }, delay);
        this.uiTimers.add(t);
      }
      
      // Swing logic for odd steps can be implemented by adding offset to nextStepTime
      let swingOffset = 0;
      if (this._currentStep % 2 === 1) {
        swingOffset = this._swing * stepDuration * 0.5;
      }
      
      this.nextStepTime += stepDuration + swingOffset;
    }
  };

  private getSyncBpm(): number {
    return this._bpm; // Fallback implementation. Normally reads from useMixiStore.
  }

  // --- Getters & Setters ---

  get isPlaying() { return this._playing; }
  get currentStep() { return this._currentStep; }
  get bpm() { return this._bpm; }
  get syncToMaster() { return this._syncToMaster; }
  set syncToMaster(v: boolean) { this._syncToMaster = v; }
  get swing() { return this._swing; }
  set swing(v: number) { this._swing = v; }
  
  get masterVolume() { return this._masterVolume; }
  set masterVolume(v: number) {
    this._masterVolume = v;
    // Map 0-1 to something musical
    this.bus.setVolume(v);
  }

  // --- Pattern ---

  get steps() { return this._steps; }
  
  updateStep(idx: number, stepData: Partial<JS303Step>) {
    this._steps[idx] = { ...this._steps[idx], ...stepData };
    this.synth.setPattern(this._steps);
  }

  clearPattern() {
    this._steps = this._steps.map(s => ({ ...s, gate: false }));
    this.synth.setPattern(this._steps);
  }

  resetPattern() {
    this._steps = defaultSteps();
    this.synth.setPattern(this._steps);
  }

  mutateSequence() {
    // Intelligent Acid Pattern Generator
    const scales = [
      [0, 3, 5, 7, 10], // Minor Pentatonic
      [0, 2, 3, 5, 7, 8, 10], // Natural Minor
      [0, 1, 4, 5, 7, 8, 11] // Phrygian Dominant (exotic acid)
    ];
    const scale = scales[Math.floor(Math.random() * scales.length)];
    const root = 36 + Math.floor(Math.random() * 12); // Base octave (C2-B2)

    this._steps = this._steps.map((_, i) => {
      // 60% chance of note, 40% rest
      const isGate = Math.random() > 0.4;
      
      // Accents primarily on upbeats or randomly
      const isAccent = isGate && (i % 2 !== 0 ? Math.random() > 0.3 : Math.random() > 0.8);
      
      // Slides often connect two active notes
      const isSlide = isGate && Math.random() > 0.7;

      // Select random note from scale
      const degree = scale[Math.floor(Math.random() * scale.length)];
      
      // Octave jumps (up or down)
      let octave = 0;
      const oRand = Math.random();
      if (oRand > 0.8) octave = 12; // Up one octave
      else if (oRand > 0.95) octave = 24; // Up two
      else if (oRand < 0.1) octave = -12; // Down one
      
      return {
        note: root + degree + octave,
        accent: isAccent,
        slide: isSlide,
        gate: isGate,
        down: octave < 0,
        up: octave > 0
      };
    });
    this.synth.setPattern(this._steps);
  }

  mutateParams() {
    // Acid Parameter Sweet Spots
    const type = Math.random();
    
    if (type < 0.33) {
      // Classic Squely Acid: Low cutoff, high res, high env mod, fast decay
      this.setSynthParam('cutoff', Math.random() * 0.2); 
      this.setSynthParam('resonance', 0.8 + Math.random() * 0.2);
      this.setSynthParam('envMod', 0.7 + Math.random() * 0.3);
      this.setSynthParam('decay', 0.1 + Math.random() * 0.3);
      this.setSynthParam('waveform', Math.random() > 0.5 ? 1 : 0);
    } else if (type < 0.66) {
      // Smooth Bass: Low/Mid cutoff, low res, low env mod, medium decay
      this.setSynthParam('cutoff', 0.2 + Math.random() * 0.3); 
      this.setSynthParam('resonance', Math.random() * 0.4);
      this.setSynthParam('envMod', Math.random() * 0.3);
      this.setSynthParam('decay', 0.4 + Math.random() * 0.4);
      this.setSynthParam('waveform', 1); // Square usually better for solid bass
    } else {
      // Hollow/Laser: Mid cutoff, absolute max res, negative or short env, long decay
      this.setSynthParam('cutoff', 0.4 + Math.random() * 0.4); 
      this.setSynthParam('resonance', 0.9 + Math.random() * 0.1);
      this.setSynthParam('envMod', 0.4 + Math.random() * 0.5);
      this.setSynthParam('decay', 0.6 + Math.random() * 0.4);
    }
  }

  // --- Parameters ---

  get synthParams() { return this._synthParams; }
  setSynthParam(id: SynthParamId, value: number) {
    this._synthParams[id] = value;
    this.applySynthParam(id, value);
  }

  get fxParams() { return this._fxParams; }
  setFx(id: FxKnobId, value: number) {
    this._fxParams[id] = value;
    this.applyFxParam(id, value);
  }

  private applySynthParam(id: SynthParamId, norm: number) {
    switch (id) {
      case 'cutoff': this.synth.setCutoff(200 + norm * 19800); break;
      case 'resonance': this.synth.setResonance(norm); break;
      case 'envMod': this.synth.setEnvMod(norm); break;
      case 'decay': this.synth.setDecay(100 + norm * 1900); break;
      case 'accent': this.synth.setAccent(norm); break;
      case 'tuning': this.synth.setTuning(-12 + norm * 24); break;
      case 'waveform': this.synth.setWaveform(norm > 0.5 ? 1 : 0); break;
    }
  }

  private applyFxParam(id: FxKnobId, norm: number) {
    switch (id) {
      case 'distShape': this.synth.setDistShape(norm); break;
      case 'distThreshold': this.synth.setDistThreshold(norm); break;
      case 'delayFeedback': this.synth.setDelayFeedback(norm); break;
      case 'delaySend': this.synth.setDelaySend(norm); break;
    }
  }

  private applyAllSynthParams() {
    for (const k of Object.keys(this._synthParams)) {
      this.applySynthParam(k as SynthParamId, this._synthParams[k as SynthParamId]);
    }
  }
  
  private applyAllFxParams() {
    for (const k of Object.keys(this._fxParams)) {
      this.applyFxParam(k as FxKnobId, this._fxParams[k as FxKnobId]);
    }
  }
  
  get busOutput() {
    return this.bus.output;
  }
}
