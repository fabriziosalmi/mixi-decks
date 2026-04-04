import { TurboSynthBus } from './TurboSynthBus';
import { TurboSynthSynth } from './TurboSynthSynth';
import { defaultSynth, defaultFx, defaultSteps, FxKnobId, SynthParamId, TurboSynthStep, STEP_COUNT } from './types';

export type DeckId = 'A' | 'B';

export class TurboSynthEngine {
  readonly deckId: DeckId;
  private ctx!: AudioContext;
  
  private bus!: TurboSynthBus;
  private synth!: TurboSynthSynth;

  private _playing = false;
  private _currentStep = -1;
  private _bpm = 120;
  private _syncToMaster = false;
  private _swing = 0.0;
  private _masterVolume = 1.0;

  private _steps: TurboSynthStep[] = defaultSteps();
  private _synthParams = defaultSynth();
  private _fxParams = defaultFx();

  onStepChange?: (step: number) => void;

  private timerId: number | null = null;
  private nextStepTime = 0;

  constructor(deckId: DeckId) {
    this.deckId = deckId;
  }

  init(ctx: AudioContext) {
    this.ctx = ctx;
    
    this.bus = new TurboSynthBus(this.ctx);
    this.synth = new TurboSynthSynth(this.ctx);
    
    this.synth.connect(this.bus.input);

    this.applyAllSynthParams();
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
    
    this._playing = true;
    this.nextStepTime = this.ctx.currentTime;
    
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
    if (this.onStepChange) this.onStepChange(-1);
  }

  private tick = () => {
    const bpm = this._bpm; // In reality reads from useMixiStore
    this.synth.setTempo(bpm);
    
    const stepDuration = (60 / bpm) / 4; 
    const LOOK_AHEAD_S = 0.05;
    
    while (this.nextStepTime < this.ctx.currentTime + LOOK_AHEAD_S) {
      this._currentStep = (this._currentStep + 1) % STEP_COUNT;
      
      if (this.onStepChange) {
        const delay = Math.max(0, this.nextStepTime - this.ctx.currentTime) * 1000;
        const stepToNotify = this._currentStep;
        setTimeout(() => this.onStepChange!(stepToNotify), delay);
      }
      
      this.nextStepTime += stepDuration; // Simple timing, no swing applied to WA node explicitly via scheduling since Rust takes care of sequence. 
      // If we wanted swing on Rust we would need to pass swing amount to Rust! 
    }
  };

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
    this.bus.setVolume(v);
  }

  get steps() { return this._steps; }
  
  updateStep(idx: number, stepData: Partial<TurboSynthStep>) {
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

  get synthParams() { return this._synthParams; }
  setSynthParam(id: SynthParamId, value: number) {
    this._synthParams[id] = value;
    this.applySynthParam(id, value);
  }

  get fxParams() { return this._fxParams; }
  setFx(id: FxKnobId, value: number) {
    this._fxParams[id] = value;
    // this.bus.setFx(id, value);
  }

  private applySynthParam(id: SynthParamId, norm: number) {
    switch (id) {
      case 'waveform': this.synth.setWaveform(norm * 3.0); break; // 0..3
      case 'cutoff': this.synth.setCutoff(20.0 + norm * 19980.0); break;
      case 'resonance': this.synth.setResonance(0.1 + norm * 9.9); break;
      case 'attack': this.synth.setAttack(0.001 + norm * 2.0); break;
      case 'release': this.synth.setRelease(0.001 + norm * 5.0); break;
    }
  }

  private applyAllSynthParams() {
    for (const k of Object.keys(this._synthParams)) {
      this.applySynthParam(k as SynthParamId, this._synthParams[k as SynthParamId]);
    }
  }
}
