import { TurboFMWasm } from 'turbofm-wasm';
import { TurboFMStep } from './types';

export class TurboFMSynth {
  private ctx: AudioContext;
  private processor!: ScriptProcessorNode;
  private wasmEngine!: TurboFMWasm;
  private destination!: AudioNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.wasmEngine = new TurboFMWasm();
    
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
  setPattern(steps: TurboFMStep[]) {
    const rawPattern = steps.map(s => [s.note, s.gate]);
    this.wasmEngine.set_pattern(rawPattern);
  }

  setAlgo(algo: number) { this.wasmEngine.set_algo(algo); }
  setFeedback(fb: number) { this.wasmEngine.set_feedback(fb); }
  setCarAttack(a: number) { this.wasmEngine.set_car_attack(a); }
  setCarDecay(d: number) { this.wasmEngine.set_car_decay(d); }
  setModAttack(a: number) { this.wasmEngine.set_mod_attack(a); }
  setModDecay(d: number) { this.wasmEngine.set_mod_decay(d); }
  setOpRatio(op: number, r: number) { this.wasmEngine.set_op_ratio(op, r); }
  setOpLevel(op: number, l: number) { this.wasmEngine.set_op_level(op, l); }
}
