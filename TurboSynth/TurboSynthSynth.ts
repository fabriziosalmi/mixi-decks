import { TurboSynthWasm } from 'turbosynth-wasm';
import { TurboSynthStep } from './types';

export class TurboSynthSynth {
  private ctx: AudioContext;
  private processor!: ScriptProcessorNode;
  private wasmEngine!: TurboSynthWasm;
  private destination!: AudioNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.wasmEngine = new TurboSynthWasm();
    
    // Create ScriptProcessor (1024 buffer size is better for generic synths, lower latency)
    this.processor = ctx.createScriptProcessor(1024, 0, 1);
    
    this.processor.onaudioprocess = (e) => {
      const outputBuffer = e.outputBuffer;
      const channelData = outputBuffer.getChannelData(0);
      this.wasmEngine.process(channelData);
      
      // Mono to Stereo duplication if track expects stereo
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

  setRunning(running: boolean) {
    this.wasmEngine.set_running(running);
  }

  setTempo(tempo: number) {
    this.wasmEngine.set_tempo(tempo);
  }

  setPattern(steps: TurboSynthStep[]) {
    // Array of [note, gate]
    const rawPattern = steps.map(s => [s.note, s.gate]);
    this.wasmEngine.set_pattern(rawPattern);
  }

  setWaveform(value: number) { this.wasmEngine.set_waveform(Math.round(value)); }
  setCutoff(value: number) { this.wasmEngine.set_cutoff(value); }
  setResonance(value: number) { this.wasmEngine.set_resonance(value); }
  setAttack(value: number) { this.wasmEngine.set_attack(value); }
  setRelease(value: number) { this.wasmEngine.set_release(value); }
}
