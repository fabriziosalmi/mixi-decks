import { JS303Step } from './types';

export class JS303Synth {
  private ctx: AudioContext;
  private node!: AudioWorkletNode;
  private destination!: AudioNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }
  
  async init() {
    await this.ctx.audioWorklet.addModule(new URL('./JS303Processor.ts', import.meta.url));
    this.node = new AudioWorkletNode(this.ctx, 'js303-processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2]
    });
  }

  connect(destination: AudioNode) {
    this.destination = destination;
    this.node.connect(destination);
  }

  destroy() {
    this.node.port.postMessage({ id: 'free' });
    this.node.disconnect();
  }

  setRunning(running: boolean) { this.node.port.postMessage({ id: 'setRunning', value: running }); }
  setTempo(tempo: number) { this.node.port.postMessage({ id: 'setTempo', value: tempo }); }
  setPattern(steps: JS303Step[]) {
    // Convert to js-sys compatible simple arrays
    const rawPattern = steps.map(s => [s.note, s.accent, s.slide, s.gate, s.down, s.up]);
    this.node.port.postMessage({ id: 'setPattern', value: rawPattern });
  }

  setCutoff(value: number) { this.node.port.postMessage({ id: 'setCutoff', value }); }
  setResonance(value: number) { this.node.port.postMessage({ id: 'setResonance', value }); }
  setEnvMod(value: number) { this.node.port.postMessage({ id: 'setEnvMod', value }); }
  setDecay(value: number) { this.node.port.postMessage({ id: 'setDecay', value }); }
  setAccent(value: number) { this.node.port.postMessage({ id: 'setAccent', value }); }
  setTuning(value: number) { this.node.port.postMessage({ id: 'setTuning', value }); }
  setWaveform(value: number) { this.node.port.postMessage({ id: 'setWaveform', value }); }
  
  setDistShape(value: number) { this.node.port.postMessage({ id: 'setDistShape', value }); }
  setDistThreshold(value: number) { this.node.port.postMessage({ id: 'setDistThreshold', value }); }
  setDelayFeedback(value: number) { this.node.port.postMessage({ id: 'setDelayFeedback', value }); }
  setDelaySend(value: number) { this.node.port.postMessage({ id: 'setDelaySend', value }); }
}
