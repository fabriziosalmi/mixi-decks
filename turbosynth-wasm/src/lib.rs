mod synth;

use wasm_bindgen::prelude::*;
use synth::{TurboSynth, Step};

#[wasm_bindgen]
pub struct TurboSynthWasm {
    engine: TurboSynth,
}

#[wasm_bindgen]
impl TurboSynthWasm {
    #[wasm_bindgen(constructor)]
    pub fn new() -> TurboSynthWasm {
        TurboSynthWasm {
            engine: TurboSynth::new(),
        }
    }

    pub fn set_tempo(&mut self, tempo: f32) { self.engine.set_tempo(tempo); }
    pub fn set_waveform(&mut self, waveform: u32) { self.engine.waveform = waveform; }
    pub fn set_cutoff(&mut self, cutoff: f32) { self.engine.set_cutoff(cutoff); }
    pub fn set_resonance(&mut self, resonance: f32) { self.engine.set_resonance(resonance); }
    pub fn set_attack(&mut self, attack: f32) { self.engine.set_attack(attack); }
    pub fn set_release(&mut self, release: f32) { self.engine.set_release(release); }
    
    // Accepts array of [note, gate] 32 steps
    pub fn set_pattern(&mut self, steps: js_sys::Array) {
        let max_len = std::cmp::min(steps.length() as usize, 32);
        let mut new_pattern = vec![Step::default(); max_len];
        
        for i in 0..max_len {
            if let Ok(js_step) = steps.get(i as u32).dyn_into::<js_sys::Array>() {
                if js_step.length() >= 2 {
                    let note = js_step.get(0).as_f64().unwrap_or(60.0) as u8;
                    let gate_raw = js_step.get(1);
                    let gate = gate_raw.is_truthy();
                    
                    new_pattern[i] = Step { note, gate };
                }
            }
        }
        self.engine.pattern = new_pattern.clone();
        self.engine.next_pattern = new_pattern;
    }

    pub fn set_running(&mut self, running: bool) {
        self.engine.running = running;
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            *sample = self.engine.render();
        }
    }
}
