# Mixi Architecture

Mixi Decks is built entirely on standard WebAudio APIs paired with high-performance Rust WebAssembly cores. 
Our philosophy is **zero external dependencies**. Every deck is a self-contained ecosystem.

## The Drop-In Pattern

A deck is composed of a single TypeScript folder containing:
- `types.ts`: Define snapshot states and config ranges.
- `[DeckName]Engine.ts`: The chronological scheduler, oscillator trigger, or polling layer for data sources.
- `[DeckName]Bus.ts`: The WebAudio Graph logic containing a final `.output` GainNode.
- `[DeckName]Deck.tsx`: A robust `React` view containing all HTML and Tailwind logic, listening via `useEffect` to the underlying Engine.

When you drop a folder into Mixi, it acts identically to an isolated VST Plugin in standard DAWs.

## Zero-State Pollution

Decks do *not* use Redux or Zustand stores to save their internal states globally. Instead, internal configurations are snapshotted in standard React Components using internal loops.

All external control (Master BPM, Deck Crossfader routing) happens by reading the `window.AudioContext` state directly or exposing pure DOM `CustomEvents` for friction-free data transport.

> [!TIP]
> Mixi utilizes a native look-ahead scheduling mechanism over `requestAnimationFrame` ensuring audio sync remains completely separated from V8 JS garbage collection lags.
