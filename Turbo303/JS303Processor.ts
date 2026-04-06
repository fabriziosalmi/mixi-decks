import { JS303Wasm } from 'js303-wasm';

class JS303Processor extends AudioWorkletProcessor {
  private wasmEngine: JS303Wasm;

  constructor() {
    super();
    this.wasmEngine = new JS303Wasm();

    this.port.onmessage = (event) => {
      const { id, value } = event.data;
      switch (id) {
        case 'setRunning': this.wasmEngine.set_running(value); break;
        case 'setTempo': this.wasmEngine.set_tempo(value); break;
        case 'setPattern': this.wasmEngine.set_pattern(value); break;
        case 'setCutoff': this.wasmEngine.set_cutoff(value); break;
        case 'setResonance': this.wasmEngine.set_resonance(value); break;
        case 'setEnvMod': this.wasmEngine.set_envmod(value); break;
        case 'setDecay': this.wasmEngine.set_decay(value); break;
        case 'setAccent': this.wasmEngine.set_accent(value); break;
        case 'setTuning': this.wasmEngine.set_tuning(value); break;
        case 'setWaveform': this.wasmEngine.set_waveform(value); break;
        case 'setDistShape': this.wasmEngine.set_dist_shape(value); break;
        case 'setDistThreshold': this.wasmEngine.set_dist_threshold(value); break;
        case 'setDelayFeedback': this.wasmEngine.set_delay_feedback(value); break;
        case 'setDelaySend': this.wasmEngine.set_delay_send(value); break;
        case 'free': this.wasmEngine.free(); break;
      }
    };
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    
    const channelData = output[0];
    
    // The Rust WASM engine processes exactly this buffer directly
    this.wasmEngine.process(channelData);
    
    // Copy Mono output to any additional channels for Stereo pan capabilities down the chain
    for (let c = 1; c < output.length; c++) {
      output[c].set(channelData);
    }
    
    return true;
  }
}

registerProcessor('js303-processor', JS303Processor);
