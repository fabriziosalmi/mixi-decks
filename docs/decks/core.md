# The Core Synthesis Collection

The Core Collection serves as the bedrock of traditional analog and digital synthesis inside the Mixi framework.
These plugins focus heavily on mathematical approximations of physical hardware, compiled to high-speed WebAssembly routines.

---

## Turbo303
The TB-303 Baseline Synthesizer emulator.

Turbo303 accurately ports internal Javascript Logic into Rust/WASM, resulting in a virtually zero-CPU cost emulation of diode-ladder equivalent filters and hardware step-sequencing.
* **Architecture:** Fourier-based analog waveform generation.
* **Timbre:** Native square and sawtooth wave selections paired with aggressive resonance paths.
* **Features:** A robust distortion circuit built on multiple polynomial mappings to simulate overdrive clipping.

---

## TurboSynth
Polyphonic / Monophonic Subtractive Synthesizer.

A traditional dual-oscillator subtractive engine with deep modulation capabilities.
* **Architecture:** Standard VCO architectures ported to Rust.
* **Filtration:** Utilizes high-precision discrete AR (Attack/Release) envelops driving a cascading Biquad Lowpass filter array.
* **Features:** Global sequencing grid natively supporting custom glides and slide-times per hardware step.

---

## TurboFM
4-Operator Algorithmic FM Synthesizer.

Emulates vintage 80s arcade and studio FM synths through raw phase-modulation math.
* **Architecture:** Phase continuous math algorithms to avoid zipper-noise and aliasing during deep frequency modulation.
* **Matrix:** Four distinct operator algorithms letting users cascade sine waves into each other for bell, brass, and deep sub sounds.

---

## TurboVox
Vocal Formant Morphing Synthesizer.

TurboVox speaks using synthetic human vocal cords.
* **Architecture:** Injects high-gain oscillator drones into three parallel, aggressively narrow Bandpass filters.
* **Operation:** Smoothly interpolates the cutoff center frequencies among specific, mathematically known human formants (A, E, I, O, U) creating distinct artificial vocal inflections.
