# The Generative Ambient Collection

The Generative Ambient collection focuses on bypassing traditional oscillators and sequence boundaries, favoring real-world data interpolation, procedural noise, and raw DOM canvas abstractions.

---

## TurboFire
Procedural ASMR ambient generator.

Bypasses WASM to run directly on the WebAudio API `ScriptProcessor` using low-level bitwise operations.
* **Implementation:** Combines Paul Kellett's algorithm for Pink Noise (routed through dynamic lowpass filters for `Warmth`), stochastic high-amplitude sparse impulses for `Crackle`, and an LFO-modulated white noise for background `Wind` turbulence.
* **Use Case:** Ambient padding or background noise to fill the spectrum of a mix.

---

## TurboRadio
External Icecast/Shoutcast Stream capturing.

* **Implementation:** Mounts internet radio streams securely via CORS-bypassing `<audio>` tags.
* **Routing:** Directs external stream bytes via a `MediaElementAudioSourceNode` into the standard zero-copy Mixi audio graph, allowing local EQs to process remote music data without touching the server's HTTP config.

---

## TurboCam
Optical Flow Theremin sensor.

A computer vision tracker built with strictly **zero external dependencies**.
* **Engine:** Utilizes a high-speed `requestAnimationFrame` loop mapping RGB pixel differences across a hidden offscreen `<canvas>`.
* **Motion:** The system generates normalized `X/Y` coordinate pairs sent directly into global Mixi `CustomEvents` for driving EQs, delays, or filter parameters dynamically.

---

## TurboNews
Cyberpunk text marquee and RSS scraper.

A massive, fullscreen, terminal-style news aggregator.
* **Implementation:** Pulls down XML data from massive RSS feeds (NYT, BBC), async parses into clean HTML, and displays as a silent visual prop over the DJ table.
* **Use Case:** Adds instant dystopic context and visual kinetic energy to live sets.
