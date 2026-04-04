import { JS303Wasm } from 'js303-wasm';
import { JS303Step } from './types';

export class JS303Synth {
  private ctx: AudioContext;
  private processor!: ScriptProcessorNode;
  private wasmEngine!: JS303Wasm;
  private destination!: AudioNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.wasmEngine = new JS303Wasm();
    
    // Create ScriptProcessor (4096 buffer size, 0 inputs, 1 output)
    this.processor = ctx.createScriptProcessor(4096, 0, 1);
    
    this.processor.onaudioprocess = (e) => {
      const outputBuffer = e.outputBuffer;
      const channelData = outputBuffer.getChannelData(0);
      this.wasmEngine.process(channelData);
      
      // Mono to Stereo duplication if needed
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

  setPattern(steps: JS303Step[]) {
    // Convert to js-sys compatible simple arrays
    const rawPattern = steps.map(s => [s.note, s.accent, s.slide, s.gate, s.down, s.up]);
    this.wasmEngine.set_pattern(rawPattern);
  }

  setCutoff(value: number) { this.wasmEngine.set_cutoff(value); }
  setResonance(value: number) { this.wasmEngine.set_resonance(value); }
  setEnvMod(value: number) { this.wasmEngine.set_envmod(value); }
  setDecay(value: number) { this.wasmEngine.set_decay(value); }
  setAccent(value: number) { this.wasmEngine.set_accent(value); }
  setTuning(value: number) { this.wasmEngine.set_tuning(value); }
  setWaveform(value: number) { this.wasmEngine.set_waveform(value); }
  
  setDistShape(value: number) { this.wasmEngine.set_dist_shape(value); }
  setDistThreshold(value: number) { this.wasmEngine.set_dist_threshold(value); }
  setDelayFeedback(value: number) { this.wasmEngine.set_delay_feedback(value); }
  setDelaySend(value: number) { this.wasmEngine.set_delay_send(value); }
}
