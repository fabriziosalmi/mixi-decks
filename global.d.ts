interface AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare var AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new (): AudioWorkletProcessor;
};

declare function registerProcessor(
  name: string,
  processorCtor: (new (
    options?: AudioWorkletNodeOptions
  ) => AudioWorkletProcessor) & {
    parameterDescriptors?: any[];
  }
): void;

declare var sampleRate: number;
declare var currentTime: number;

declare module 'turbosynth-wasm' {
  export class TurboSynthWasm {
    free(): void;
    set_running(running: boolean): void;
    set_tempo(tempo: number): void;
    set_pattern(pattern: number[][]): void;
    set_attack(v: number): void;
    set_decay(v: number): void;
    set_sustain(v: number): void;
    set_release(v: number): void;
    set_cutoff(v: number): void;
    set_resonance(v: number): void;
    set_env_mod(v: number): void;
    set_lfo_rate(v: number): void;
    set_lfo_amount(v: number): void;
    process(output: Float32Array): void;
  }
}

declare module 'turbofm-wasm' {
  export class TurboFMWasm {
    free(): void;
    set_running(running: boolean): void;
    set_tempo(tempo: number): void;
    set_pattern(pattern: number[][]): void;
    set_algorithm(v: number): void;
    set_feedback(v: number): void;
    set_op1_ratio(v: number): void;
    set_op2_ratio(v: number): void;
    set_op3_ratio(v: number): void;
    set_op4_ratio(v: number): void;
    process(output: Float32Array): void;
  }
}

declare module 'turbovox-wasm' {
  export class TurboVoxWasm {
    free(): void;
    set_running(running: boolean): void;
    set_tempo(tempo: number): void;
    set_pattern(pattern: number[][]): void;
    set_morph(v: number): void;
    set_vibrato(v: number): void;
    set_glide(v: number): void;
    set_lfo_rate(v: number): void;
    set_attack(v: number): void;
    set_decay(v: number): void;
    process(output: Float32Array): void;
  }
}

declare module 'js303-wasm' {
  export class JS303Wasm {
    free(): void;
    set_tempo(tempo: number): void;
    set_running(running: boolean): void;
    set_waveform(waveform: number): void;
    set_cutoff(v: number): void;
    set_resonance(v: number): void;
    set_env_mod(v: number): void;
    set_decay(v: number): void;
    set_tuning(v: number): void;
    set_overdrive(v: number): void;
    set_delay_time(v: number): void;
    set_delay_feedback(v: number): void;
    set_delay_mix(v: number): void;
    set_pattern(pattern: number[][]): void;
    process(out: Float32Array): void;
  }
}
