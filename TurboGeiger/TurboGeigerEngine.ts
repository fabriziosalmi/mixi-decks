import { TurboGeigerBus } from './TurboGeigerBus';

export type DeckId = 'A' | 'B';

export class TurboGeigerEngine {
  readonly deckId: DeckId;
  private ctx!: AudioContext;
  private bus!: TurboGeigerBus;

  private _isPlaying = false;
  private _halfLife = 0.5; 
  private _radiationType: 'alpha' | 'beta' | 'gamma' = 'alpha';
  private _masterVolume = 1.0;

  private processor!: ScriptProcessorNode;
  
  // DSP State
  private decayEnvelope = 0.0;
  public onTick?: () => void;

  constructor(deckId: DeckId) {
    this.deckId = deckId;
  }

  init(ctx: AudioContext) {
    this.ctx = ctx;
    this.bus = new TurboGeigerBus(this.ctx);

    // 2048 to balance latency vs performance
    this.processor = this.ctx.createScriptProcessor(2048, 0, 1);
    
    this.processor.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      const isStereo = e.outputBuffer.numberOfChannels > 1;
      let outR = isStereo ? e.outputBuffer.getChannelData(1) : null;
      
      let localTickOccurred = false;

      // Probability mapping: halfLife 0 = extremely sparse, 1 = dense chaos
      // We map this logarithmically or linearly. 
      const lambda = 0.00001 + (this._halfLife * this._halfLife * 0.015);

      for (let i = 0; i < output.length; i++) {
        if (!this._isPlaying) {
          output[i] = 0;
          this.decayEnvelope = 0;
          continue;
        }

        // Poisson-like distribution simulated with random threshold
        if (Math.random() < lambda) {
          localTickOccurred = true;
          this.decayEnvelope = 1.0; // Trigger impulse
        }

        let sample = 0;
        if (this.decayEnvelope > 0.001) {
           switch (this._radiationType) {
             case 'alpha':
               // Sharp snap, single polarity
               sample = this.decayEnvelope;
               this.decayEnvelope *= 0.8; // Very fast decay
               break;
             case 'beta':
               // Noisy burst
               sample = (Math.random() * 2 - 1) * this.decayEnvelope;
               this.decayEnvelope *= 0.95; // Medium decay
               break;
             case 'gamma':
               // Dense low-frequency thud + noise
               sample = (Math.random() * 2 - 1) * this.decayEnvelope;
               this.decayEnvelope *= 0.995; // Slow decay tail
               break;
           }
        } else {
           this.decayEnvelope = 0;
        }

        output[i] = sample;
        if (outR) outR[i] = sample;
      }

      if (localTickOccurred && this.onTick) {
         // Fire tick on main thread for UI
         setTimeout(() => { if (this.onTick) this.onTick(); }, 0);
      }
    };

    this.processor.connect(this.bus.input);
  }

  destroy() {
    this.stop();
    if (this.processor) {
      this.processor.disconnect();
    }
    this.bus.destroy();
  }

  engage() {
    this._isPlaying = true;
  }

  stop() {
    this._isPlaying = false;
  }

  get isPlaying() { return this._isPlaying; }
  
  get halfLife() { return this._halfLife; }
  set halfLife(v: number) { this._halfLife = v; }

  get radiationType() { return this._radiationType; }
  set radiationType(v: 'alpha' | 'beta' | 'gamma') { this._radiationType = v; }
  
  get masterVolume() { return this._masterVolume; }
  set masterVolume(v: number) {
    this._masterVolume = v;
    this.bus.setVolume(v);
  }
}
