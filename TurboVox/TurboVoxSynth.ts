import { TurboVoxWasm } from 'turbovox-wasm';
import { TurboVoxStep } from './types';

export class TurboVoxSynth {
  private ctx: AudioContext;
  private processor!: ScriptProcessorNode;
  private wasmEngine!: TurboVoxWasm;
  private destination!: AudioNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.wasmEngine = new TurboVoxWasm();
    
    this.processor = ctx.createScriptProcessor(1024, 0, 1);
    
    this.processor.onaudioprocess = (e) => {
      const outputBuffer = e.outputBuffer;
      const channelData = outputBuffer.getChannelData(0);
      this.wasmEngine.process(channelData);
      
      if (outputBuffer.numberOfChannels > 1) {
         outputBuffer.getChannelData(1).set(channelData);
      }
    };
  }

  connect(destination: AudioNode) {
    this.destination = destination;
    this.processor.connect(destination);
  }

  destroy() {
    this.processor.disconnect();
    this.wasmEngine.free();
  }

  setRunning(running: boolean) { this.wasmEngine.set_running(running); }
  setTempo(tempo: number) { this.wasmEngine.set_tempo(tempo); }
  
  setPattern(steps: TurboVoxStep[]) {
    const rawPattern = steps.map(s => [s.note, s.gate]);
    this.wasmEngine.set_pattern(rawPattern);
  }

  setMorph(v: number) { this.wasmEngine.set_morph(v); }
  setVibrato(v: number) { this.wasmEngine.set_vibrato(v); }
  setGlide(v: number) { this.wasmEngine.set_glide(v); }
  setLfoRate(v: number) { this.wasmEngine.set_lfo_rate(v); }
  setAttack(v: number) { this.wasmEngine.set_attack(v); }
  setDecay(v: number) { this.wasmEngine.set_decay(v); }
}
