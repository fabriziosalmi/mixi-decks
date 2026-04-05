# Mixi Decks

Mixi Decks is a strictly typed library of high-performance drop-in plugins for the Mixi web-based DJ platform. These decks function as standalone modular instruments or atmospheric audio generators designed to perfectly integrate within the Mixi master mixer and transport architecture.

The core philosophy revolves around utilizing optimal processing layers based on the synthesis complexity: computational-heavy logic (e.g., frequency-modulation, phase-distortion, formant generation) runs on Rust-compiled WebAssembly, whereas procedural or atmospheric noise engines utilize the native WebAudio ScriptProcessor nodes.

## Architecture & Integration

Each Deck is structured to expose a standardized `Engine`, `Bus`, and `Deck` component.

- **DSP Core**: Located in `<plugin-wasm>` folders (Rust) or internally managed via native TypeScript buffers.
- **Mixer Traversal**: Controlled via standard WebAudio API `GainNode` scaling, allowing the Mixi application to intercept, equalize, and crossfade each Deck without internal modifications.
- **UI & State**: Encapsulated within `React` function components ensuring zero external state pollution. Sequenced engines read from global 32-step patterns.

To integrate a new deck into the Mixi host application:
1. Move the specific `<PluginName>/` TS directory and `<plugin-wasm>` folder into `src/decks/`.
2. Assign the TS entry point within `src/decks/index.ts`.
3. Include the matching `DeckId`.

## Implemented Decks

### Turbo303
Hardware-style TB-303 emulator.
Contains full DSP porting from internal JS logic to Rust/WASM, integrating fourier-based wavetable generation, diode-ladder filter equivalents, hardware-style step sequencer, and multi-mode distortion.

### TurboSynth
Subtractive poly/mono synthesizer.
Engineered in WASM with a robust VCO (Saw, Pulse, Sine), Biquad Lowpass filter driven by discrete AR envelops, and a 32-step native sequencer.

### TurboFM
4-Operator FM synthesizer.
Real-time frequency modulation implemented in WASM utilizing phase continuous calculations across 4 selectable modulation algorithms.

### TurboVox
Synthetic vocal/formant generator.
WASM-powered vocal morphing algorithm operating across three parallel bandpass filters running extremely high Q-factors. Interpolates center frequencies to morph between classical A, E, I, O, U formant presets.

### TurboFire
Procedural ASMR ambient generator.
Bypasses WASM to run directly on the WebAudio API `ScriptProcessor`, combining Paul Kellett's algorithm for Pink Noise (routed through dynamic lowpass filters for `Warmth`), stochastic high-amplitude sparse impulses for `Crackle`, and an LFO-modulated white noise for background `Wind` turbulence.

### TurboRadio
Icecast/Shoutcast stream capturer.
Designed to mount external streams securely via CORS-bypassing `<audio>` elements directly into the Mixi processing chain via `MediaElementAudioSourceNode` for live scratching and mixing.

### TurboCam
Optical Flow Theremin sensor (Computer Vision without external dependencies).
Utilizes a native `requestAnimationFrame` loop mapping webcam RGB pixel differences across an offscreen canvas to track hand movement geometry. 
Exposes movement data via standard window events for frictionless injection into MIXI's master audio bus:
```javascript
// Listen to hand movement geometry from MIXI host:
window.addEventListener('TurboCamMotion', (e) => {
  const { deckId, x, y } = e.detail;
  // Map x and y (0.0 to 1.0) to your global Cutoff and Resonance!
});
```

### TurboBrain
Binaural beats generator for psychoacoustic brainwave entrainment. Pans pure tuning frequencies to left and right channels to trigger auditory illusions (Delta, Theta, Alpha, Beta, Gamma). Requires stereo headphones.

### TurboGeiger
Hardware-free Geiger-Müller counter simulation. Models radioactive isotope decay mathematically using Poisson processes, emitting un-quantized, stochastic bursts of percussive energy. Perfect for creating highly irregular noise structures.

### TurboWeather
Real-time API meteorological audiolizer. Feeds live temperature, wind speed, and precipitation data into the WebAudio graph. Generates windstorms from noise buffers and rain synthesis based on global terrestrial coordinates.

### TurboBoid
Flocking algorithm (Artificial Life) sequencer. Calculates multi-agent cohesive constraints on an X/Y field. When agents collide with boundaries, they trigger generative geometric tones, creating organic, non-linear arpeggios.

### TurboSonar
Deep-water sonar mapping. Impulses high-frequency oscillator pings into an abyssal 5-second synthetic ConvolverNode decay network, simulating immense subterranean depth spaces and dark ambient atmospheres.
