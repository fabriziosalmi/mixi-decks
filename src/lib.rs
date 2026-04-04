mod synth;

use wasm_bindgen::prelude::*;
use synth::{TB303, Step};

#[wasm_bindgen]
pub struct JS303Wasm {
    engine: TB303,
}

#[wasm_bindgen]
impl JS303Wasm {
    #[wasm_bindgen(constructor)]
    pub fn new() -> JS303Wasm {
        JS303Wasm {
            engine: TB303::new(),
        }
    }

    pub fn set_tempo(&mut self, tempo: f32) { self.engine.set_tempo(tempo); }
    pub fn set_tuning(&mut self, tuning: f32) { self.engine.tuning = tuning; }
    pub fn set_waveform(&mut self, waveform: u32) { self.engine.waveform = waveform; }
    pub fn set_cutoff(&mut self, cutoff: f32) { self.engine.set_cutoff(cutoff); }
    pub fn set_resonance(&mut self, resonance: f32) { self.engine.set_resonance(resonance); }
    pub fn set_envmod(&mut self, envmod: f32) { self.engine.set_envmod(envmod); }
    pub fn set_decay(&mut self, decay: f32) { self.engine.decay = decay; }
    pub fn set_accent(&mut self, accent: f32) { self.engine.accent = accent; }
    pub fn set_dist_shape(&mut self, shape: f32) { self.engine.dist_shape = shape; }
    pub fn set_dist_threshold(&mut self, threshold: f32) { self.engine.set_dist_threshold(threshold); }
    
    // Allows updating a patten up to 16 steps
    pub fn set_pattern(&mut self, steps: js_sys::Array) {
        let max_len = std::cmp::min(steps.length() as usize, 16);
        let mut new_pattern = vec![Step::default(); max_len];
        
        for i in 0..max_len {
            if let Ok(js_step) = steps.get(i as u32).dyn_into::<js_sys::Array>() {
                // expecting [note, accent, slide, gate, down, up]
                if js_step.length() >= 6 {
                    let note = js_step.get(0).as_f64().unwrap_or(40.0) as u8;
                    let accent = js_step.get(1).as_bool().unwrap_or(false);
                    let slide = js_step.get(2).as_bool().unwrap_or(false);
                    
                    let gate_raw = js_step.get(3);
                    let gate = if gate_raw.is_truthy() { 1.0 } else { 0.0 };
                    
                    let down_raw = js_step.get(4);
                    let down = if down_raw.is_truthy() { 1 } else { 0 };
                    
                    let up_raw = js_step.get(5);
                    let up = if up_raw.is_truthy() { 1 } else { 0 };

                    new_pattern[i] = Step { note, accent, slide, gate, down, up };
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
