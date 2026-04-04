mod synth;

use wasm_bindgen::prelude::*;
use synth::{TurboFM, Step};

#[wasm_bindgen]
pub struct TurboFMWasm {
    engine: TurboFM,
}

#[wasm_bindgen]
impl TurboFMWasm {
    #[wasm_bindgen(constructor)]
    pub fn new() -> TurboFMWasm {
        TurboFMWasm {
            engine: TurboFM::new(),
        }
    }

    pub fn set_tempo(&mut self, tempo: f32) { self.engine.set_tempo(tempo); }
    pub fn set_algo(&mut self, algo: u32) { self.engine.algo = algo; }
    pub fn set_feedback(&mut self, feedback: f32) { self.engine.feedback = feedback; }
    
    pub fn set_car_attack(&mut self, a: f32) { self.engine.car_env.attack = a; }
    pub fn set_car_decay(&mut self, d: f32) { self.engine.car_env.decay = d; }
    pub fn set_mod_attack(&mut self, a: f32) { self.engine.mod_env.attack = a; }
    pub fn set_mod_decay(&mut self, d: f32) { self.engine.mod_env.decay = d; }

    pub fn set_op_ratio(&mut self, op: usize, ratio: f32) { 
        if op < 4 { self.engine.ops[op].ratio = ratio; }
    }
    pub fn set_op_level(&mut self, op: usize, level: f32) { 
        if op < 4 { self.engine.ops[op].level = level; }
    }
    
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
