import { TurboFireBus } from './TurboFireBus';
import { TurboFireSynth } from './TurboFireSynth';
import { defaultSynth, defaultFx, FxKnobId, SynthParamId } from './types';

export type DeckId = 'A' | 'B';

export class TurboFireEngine {
  readonly deckId: DeckId;
  private ctx!: AudioContext;
  
  private bus!: TurboFireBus;
  private synth!: TurboFireSynth;

  private _playing = false;
  private _masterVolume = 1.0;

  private _synthParams = defaultSynth();
  private _fxParams = defaultFx();

  constructor(deckId: DeckId) {
    this.deckId = deckId;
  }

  init(ctx: AudioContext) {
    this.ctx = ctx;
    this.bus = new TurboFireBus(this.ctx);
    this.synth = new TurboFireSynth(this.ctx);
    this.synth.connect(this.bus.input);
    this.applyAllSynthParams();
  }

  destroy() {
    this.stop();
    this.synth.destroy();
    this.bus.destroy();
  }

  engage() {
    if (this._playing) return;
    this._playing = true;
    this.synth.setRunning(true);
  }

  stop() {
    this._playing = false;
    this.synth.setRunning(false);
  }

  get isPlaying() { return this._playing; }
  
  get masterVolume() { return this._masterVolume; }
  set masterVolume(v: number) {
    this._masterVolume = v;
    this.bus.setVolume(v);
  }

  get synthParams() { return this._synthParams; }
  setSynthParam(id: SynthParamId, value: number) {
    this._synthParams[id] = value;
    this.applySynthParam(id, value);
  }

  get fxParams() { return this._fxParams; }
  setFx(id: FxKnobId, value: number) {
    this._fxParams[id] = value;
  }

  private applySynthParam(id: SynthParamId, norm: number) {
    switch (id) {
      case 'warmth': this.synth.setWarmth(norm); break;
      case 'crackle': this.synth.setCrackle(norm); break;
      case 'wind': this.synth.setWind(norm); break;
    }
  }

  private applyAllSynthParams() {
    for (const k of Object.keys(this._synthParams)) {
      this.applySynthParam(k as SynthParamId, this._synthParams[k as SynthParamId]);
    }
  }
}
