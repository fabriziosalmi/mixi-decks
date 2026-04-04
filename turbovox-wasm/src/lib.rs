mod synth;

use wasm_bindgen::prelude::*;
use synth::{TurboVox, Step};

#[wasm_bindgen]
pub struct TurboVoxWasm {
    engine: TurboVox,
}

#[wasm_bindgen]
impl TurboVoxWasm {
    #[wasm_bindgen(constructor)]
    pub fn new() -> TurboVoxWasm {
        TurboVoxWasm { engine: TurboVox::new() }
    }

    pub fn set_tempo(&mut self, tempo: f32) { self.engine.set_tempo(tempo); }
    pub fn set_morph(&mut self, morph: f32) { self.engine.set_morph(morph); }
    pub fn set_vibrato(&mut self, vibrato: f32) { self.engine.vibrato = vibrato; }
    pub fn set_glide(&mut self, glide: f32) { self.engine.glide = glide; }
    pub fn set_lfo_rate(&mut self, rate: f32) { self.engine.lfo_rate = rate; }
    
    pub fn set_attack(&mut self, a: f32) { self.engine.env.attack = a; }
    pub fn set_decay(&mut self, d: f32) { self.engine.env.decay = d; }

    pub fn set_pattern(&mut self, steps: js_sys::Array) {
        let max_len = std::cmp::min(steps.length() as usize, 32);
        let mut new_pattern = vec![Step::default(); max_len];
        
        for i in 0..max_len {
            if let Ok(js_step) = steps.get(i as u32).dyn_into::<js_sys::Array>() {
                if js_step.length() >= 2 {
                    let note = js_step.get(0).as_f64().unwrap_or(60.0) as u8;
                    let gate_raw = js_step.get(1);
                    new_pattern[i] = Step { note, gate: gate_raw.is_truthy() };
                }
            }
        }
        self.engine.pattern = new_pattern.clone();
        self.engine.next_pattern = new_pattern;
    }

    pub fn set_running(&mut self, running: bool) { self.engine.running = running; }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            *sample = self.engine.render();
        }
    }
}
