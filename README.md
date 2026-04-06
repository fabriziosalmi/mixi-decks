# Mixi Decks

![License](https://img.shields.io/badge/license-MIT-blue)
![Architecture](https://img.shields.io/badge/architecture-Rust/WASM+WebAudio-orange)
![Version](https://img.shields.io/badge/version-v0.3.0-brightgreen)
![Zero Dependencies](https://img.shields.io/badge/dependencies-Zero-brightgreen)

Mixi Decks is a strictly typed library of high-performance drop-in plugins for the Mixi web-based DJ platform. These decks function as standalone modular instruments, generative synthesizers, and esoteric data audiolizers designed to perfectly integrate within the Mixi master mixer and transport architecture.

---

## Quick Navigation

- [Deck Directory](#deck-directory)
- [Architecture & Integration](#architecture--integration)
- [Architectural Innovations](#architectural-innovations)

---

## Deck Directory

Here is the complete list of available Mixi Decks categorized by domain. Click on any deck name to navigate to its source code.

### I. The Core Synthesis Collection
| Deck | Description | Architecture |
|---|---|---|
| **[Turbo303](./Turbo303)** | Hardware-style TB-303 emulator | Rust / WASM |
| **[TurboSynth](./TurboSynth)** | Subtractive poly/mono synthesizer | Rust / WASM |
| **[TurboFM](./TurboFM)** | 4-Operator FM synthesizer | Rust / WASM |
| **[TurboVox](./TurboVox)** | Synthetic vocal/formant generator | Rust / WASM |

### II. The Generative Ambient Collection
| Deck | Description | Architecture |
|---|---|---|
| **[TurboFire](./TurboFire)** | Procedural ASMR ambient fire generator | Native WebAudio |
| **[TurboRadio](./TurboRadio)** | Icecast/Shoutcast stream capturer | Native WebAudio |
| **[TurboCam](./TurboCam)** | Optical Flow Theremin movement sensor | Computer Vision |
| **[TurboNews](./TurboNews)** | Cyberpunk text marquee and RSS scraper | DOM / Fetch |

### III. The Absurd Collection
| Deck | Description | Architecture |
|---|---|---|
| **[TurboBrain](./TurboBrain)** | Binaural beats psychoacoustic generator | Native WebAudio |
| **[TurboGeiger](./TurboGeiger)** | Hardware-free radioactive Geiger counter | Poisson Subroutine |
| **[TurboWeather](./TurboWeather)** | Real-time API meteorological audiolizer | Native WebAudio |
| **[TurboBoid](./TurboBoid)** | Flocking algorithm (Artificial Life) sequencer | Math / Geometry |
| **[TurboSonar](./TurboSonar)** | Deep-water abyssal sonar mapping | Native Convolver |

### IV. The Multi-Domain Avant-Garde Collection
| Deck | Description | Architecture |
|---|---|---|
| **[TurboPulsar](./TurboPulsar)** | Astrophysical neutron star metronome | Native WebAudio |
| **[TurboGenome](./TurboGenome)** | Biological sequence DNA arpeggiator | Markov Chains |
| **[TurboMorse](./TurboMorse)** | Cryptography war transmitter | Math / Oscillator |
| **[TurboFractal](./TurboFractal)** | Non-linear Mandelbrot drone generator | Math / Geometry |

---

## Architecture & Integration

The core philosophy revolves around utilizing optimal processing layers based on synthesis complexity: computational-heavy logic (e.g., frequency-modulation, phase-distortion) runs on Rust-compiled WebAssembly, whereas procedural, atmospheric, and mathematical engines utilize modern native WebAudio `AudioWorklet` nodes to achieve zero external dependencies.

Each Deck is structured to expose a standardized `Engine`, `Bus`, and `Deck` UI component.

- **DSP Core**: Located in `<plugin-wasm>` folders (Rust) or internally managed via native TypeScript buffers.
- **Mixer Traversal**: Controlled via standard WebAudio API `GainNode` scaling, allowing the Mixi application to intercept, equalize, and crossfade each Deck without internal modifications.
- **UI & State**: Encapsulated within strictly typed `React` function components ensuring zero external state pollution. Sequenced engines read from global 32-step patterns.

**To integrate a new deck into the Mixi host application:**
1. Move the specific `<PluginName>/` TS directory and its associated `<plugin-wasm>` folder into `src/decks/`.
2. Assign the TS entry point within `src/decks/index.ts`.
3. Include the matching `DeckId`.

---

## Architectural Innovations

### Stochastic Generative Intelligence (Phase 4)
All engines implement mathematical randomized algorithms to generate cohesive sequences and synthesis parameter mutations on the fly (accessed via the `DICE` system). Methods employed include Euclidean rhythm division, Markov chain scale walks, pentatonic restraints for FM fractional ratios, and deterministic Poisson point process models for radioactive decay intervals.

### Translucent Rendering Pipeline (Phase 5)
The user interface utilizes an advanced translucent glassmorphism design system. Relying heavily on hardware-accelerated CSS `backdrop-blur`, the components enforce an immersive, overlay-ready aesthetic. The DOM structure separates dynamic gradients and micro-animations into distinct layers to prohibit Main-Thread rendering jank and maintain strict WebAudio clock priority.

---

> *"There is no boundary between data and sound. There is only an AudioContext."*
