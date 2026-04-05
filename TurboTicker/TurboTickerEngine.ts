import { TurboTickerBus } from './TurboTickerBus';

export type DeckId = 'A' | 'B';

export class TurboTickerEngine {
  readonly deckId: DeckId;
  private ctx!: AudioContext;
  private bus!: TurboTickerBus;

  private _isActive = false;
  private _masterVolume = 1.0;
  private _speedMultiplier = 1.0;
  
  private fetchInterval: number = 0;
  
  // Shepard Tone specifics
  private oscs: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private rAF: number = 0;
  
  private pitchShift = 0; // 0 to 1 wrapping
  private direction = 1; // 1 for UP, -1 for DOWN

  public onTick?: (price: number, trend: 'up'|'down'|'flat') => void;
  private lastPrice = 0;

  constructor(deckId: DeckId) {
    this.deckId = deckId;
  }

  init(ctx: AudioContext) {
    this.ctx = ctx;
    this.bus = new TurboTickerBus(this.ctx);
  }

  destroy() {
    this.stop();
    this.bus.destroy();
  }

  private buildShepard() {
    const minFreq = 50; 
    const octaves = 6;
    
    for (let i = 0; i < octaves; i++) {
       const osc = this.ctx.createOscillator();
       const gain = this.ctx.createGain();
       
       osc.type = 'sine';
       osc.connect(gain);
       gain.connect(this.bus.input);
       
       this.oscs.push(osc);
       this.gains.push(gain);
       
       osc.start();
    }
  }

  private sweepShepard = () => {
    if (!this._isActive || this.ctx.state !== 'running') return;

    // Movement speed
    this.pitchShift += 0.002 * this.direction * this._speedMultiplier;
    
    if (this.pitchShift >= 1) this.pitchShift -= 1;
    if (this.pitchShift < 0) this.pitchShift += 1;

    const minFreq = 50;
    const octaves = this.oscs.length;

    for (let i = 0; i < octaves; i++) {
        // Position within the octaves stack (0 to 1)
        const pos = (i + this.pitchShift) / octaves;
        
        // Exact frequency
        const freq = minFreq * Math.pow(2, pos * octaves);
        
        // Gaussian/bell-like envelope so highest and lowest are silent
        const volume = Math.sin(pos * Math.PI) * Math.sin(pos * Math.PI);
        
        this.oscs[i].frequency.setValueAtTime(freq, this.ctx.currentTime);
        this.gains[i].gain.setValueAtTime(volume * 0.2, this.ctx.currentTime);
    }
    
    this.rAF = requestAnimationFrame(this.sweepShepard);
  };

  private async fetchPrice() {
    if (!this._isActive) return;
    try {
      const res = await fetch('https://api.coindesk.com/v1/bpi/currentprice.json');
      const data = await res.json();
      const price = data.bpi.USD.rate_float;
      
      let trend: 'up'|'down'|'flat' = 'flat';
      if (this.lastPrice !== 0) {
        if (price > this.lastPrice) trend = 'up';
        if (price < this.lastPrice) trend = 'down';
      }
      this.lastPrice = price;
      
      if (trend === 'up') this.direction = 1;
      if (trend === 'down') this.direction = -1;
      
      if (this.onTick) this.onTick(price, trend);
      
    } catch(e) {
      console.warn("TurboTicker network error", e);
    }
  }

  engage() {
    if (this._isActive) return;
    this._isActive = true;
    
    this.buildShepard();
    this.sweepShepard();
    
    this.fetchPrice();
    // Poll every 10 seconds
    this.fetchInterval = window.setInterval(() => this.fetchPrice(), 10000);
  }

  stop() {
    this._isActive = false;
    clearInterval(this.fetchInterval);
    cancelAnimationFrame(this.rAF);
    
    this.oscs.forEach(o => { o.stop(); o.disconnect(); });
    this.gains.forEach(g => g.disconnect());
    this.oscs = [];
    this.gains = [];
  }

  get isActive() { return this._isActive; }
  
  get speedMultiplier() { return this._speedMultiplier; }
  set speedMultiplier(v: number) { this._speedMultiplier = v; }
  
  get masterVolume() { return this._masterVolume; }
  set masterVolume(v: number) {
    this._masterVolume = v;
    this.bus.setVolume(v);
  }
}
