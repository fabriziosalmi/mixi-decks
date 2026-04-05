export class TurboFireSynth {
  private ctx: AudioContext;
  private processor: ScriptProcessorNode;
  private destination!: AudioNode;

  private isRunning = false;
  
  // Params
  private warmth = 0.5;
  private crackle = 0.6;
  private wind = 0.2;

  // State
  private b0 = 0;
  private b1 = 0;
  private b2 = 0;
  private b3 = 0;
  private b4 = 0;
  private b5 = 0;
  private b6 = 0;

  private windPhase = 0;
  private lpfState = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.processor = ctx.createScriptProcessor(2048, 0, 1);

    this.processor.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      
      for (let i = 0; i < output.length; i++) {
        if (!this.isRunning) {
          output[i] = 0;
          continue;
        }

        // 1. Pink Noise (Paul Kellett's algorithm)
        const white = Math.random() * 2 - 1;
        this.b0 = 0.99886 * this.b0 + white * 0.0555179;
        this.b1 = 0.99332 * this.b1 + white * 0.0750759;
        this.b2 = 0.96900 * this.b2 + white * 0.1538520;
        this.b3 = 0.86650 * this.b3 + white * 0.3104856;
        this.b4 = 0.55000 * this.b4 + white * 0.5329522;
        this.b5 = -0.7616 * this.b5 - white * 0.0168980;
        let pink = this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362;
        this.b6 = white * 0.115926;
        
        // Warmth filter (simple LPF on pink noise)
        const cutoff = 100 + this.warmth * 600; // 100Hz - 700Hz
        const alpha = cutoff / this.ctx.sampleRate;
        this.lpfState += alpha * (pink - this.lpfState);
        let fireRoar = this.lpfState * 0.3; // Base scale

        // 2. Crackle (Random sparse impulses)
        const crackleThreshold = 1.0 - (this.crackle * 0.005); // e.g. 0.995 to 0.999
        let crack = 0;
        if (Math.random() > crackleThreshold) {
          crack = (Math.random() * 2 - 1) * this.crackle;
        }

        // 3. Wind (Sweeping noise)
        this.windPhase += (0.2 + Math.random() * 0.1) / this.ctx.sampleRate; // slow LFO
        const windScale = (Math.sin(this.windPhase * Math.PI * 2) * 0.5 + 0.5) * this.wind;
        const windNoise = white * windScale * 0.15;

        output[i] = fireRoar + crack + windNoise;
      }

      if (e.outputBuffer.numberOfChannels > 1) {
        e.outputBuffer.getChannelData(1).set(output);
      }
    };
  }

  connect(destination: AudioNode) {
    this.destination = destination;
    this.processor.connect(destination);
  }

  destroy() {
    this.processor.disconnect();
  }

  setRunning(r: boolean) { this.isRunning = r; }
  setWarmth(v: number) { this.warmth = v; }
  setCrackle(v: number) { this.crackle = v; }
  setWind(v: number) { this.wind = v; }
}
