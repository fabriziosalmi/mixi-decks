# MIXI TurboDecks

A collection of ultra-low latency, Rust/WASM-powered synthesizer and FX deck plugins for [MIXI](https://github.com/fabriziosalmi/mixi), the ultimate web-based DJ & Groove platform.

## Contents

- **Turbo303**: A faithful Roland TB-303 analog clone ported to Rust, featuring highpass/allpass cascading filters, foldback distortion, and a built-in step sequencer with tied-notes and slides.
- **TurboSynth**: A 32-step basic subtractive synthesizer (Sine/Tri/Saw/Square with AR envelope and Biquad filter).

## Integration

Each directory (e.g., `Turbo303`) contains a fully self-contained React/WASM structure that implements the standard MIXI Deck Plugin architecture.

Simply move the deck folder into `src/decks/` inside the MIXI repository, and add one line to `DeckRegistry`.

---
*Created for MIXI by Fabrizio Salmi & The Antigravity Team.*
