use std::f32::consts::PI;

pub const SAMPLE_RATE: f32 = 44100.0;

#[derive(Clone, Copy)]
pub struct Step {
    pub note: u8,
    pub gate: bool,
}

impl Default for Step {
    fn default() -> Self {
        Step { note: 60, gate: false }
    }
}

pub struct Env {
    pub attack: f32,
    pub decay: f32,
    phase: u8, // 0: Idle, 1: Attack, 2: Decay
    value: f32,
}

impl Env {
    pub fn new() -> Self {
        Env {
            attack: 0.01,
            decay: 0.2, // Default pluck
            phase: 0,
            value: 0.0,
        }
    }

    pub fn trigger(&mut self) {
        self.phase = 1;
        self.value = 0.0; // Hard reset for punchy attacks
    }

    pub fn process(&mut self) -> f32 {
        match self.phase {
            1 => { // Attack
                let rate = 1.0 / (self.attack * SAMPLE_RATE).max(1.0);
                self.value += rate;
                if self.value >= 1.0 {
                    self.value = 1.0;
                    self.phase = 2; // Auto transition to decay
                }
            }
            2 => { // Decay
                let rate = 1.0 / (self.decay * SAMPLE_RATE).max(1.0);
                self.value -= rate;
                if self.value <= 0.0 {
                    self.value = 0.0;
                    self.phase = 0;
                }
            }
            _ => {
                self.value = 0.0;
            }
        }
        self.value
    }
}

pub struct Operator {
    pub ratio: f32,
    pub level: f32,
    pub phase: f32,
    pub last_val: f32,
}

impl Operator {
    pub fn new() -> Self {
        Operator {
            ratio: 1.0,
            level: 1.0,
            phase: 0.0,
            last_val: 0.0,
        }
    }
}

pub struct TurboFM {
    pub pattern: Vec<Step>,
    pub next_pattern: Vec<Step>,
    pub tempo: f32,
    
    pub algo: u32,
    pub feedback: f32,
    
    pub ops: [Operator; 4],
    pub car_env: Env,
    pub mod_env: Env,

    pub running: bool,

    base_freq: f32,

    steplength: u32,
    samplepos: u32,
    pos: i32,
    current_gate: bool,
}

impl TurboFM {
    pub fn new() -> Self {
        let mut synth = TurboFM {
            pattern: vec![Step::default(); 32],
            next_pattern: vec![Step::default(); 32],
            tempo: 120.0,
            
            algo: 1, // Stack
            feedback: 0.0,
            
            ops: [
                Operator::new(),
                Operator::new(),
                Operator::new(),
                Operator::new(),
            ],
            
            car_env: Env::new(),
            mod_env: Env::new(),

            running: false,
            base_freq: 440.0,

            steplength: 0,
            samplepos: 1000000,
            pos: -1,
            current_gate: false,
        };
        synth.set_tempo(120.0);
        synth
    }

    pub fn set_tempo(&mut self, newtempo: f32) {
        self.tempo = newtempo;
        self.steplength = (SAMPLE_RATE * 60.0 / self.tempo / 4.0) as u32;
    }

    pub fn render(&mut self) -> f32 {
        if self.running {
            self.samplepos += 1;
            if self.samplepos >= self.steplength {
                self.samplepos = 0;
                self.pos += 1;

                if self.pos >= self.pattern.len() as i32 {
                    self.pos = 0;
                    self.pattern = self.next_pattern.clone();
                }

                if !self.pattern.is_empty() {
                    let step = self.pattern[self.pos as usize];
                    if step.gate {
                        self.base_freq = 440.0 * f32::powf(2.0, (step.note as f32 - 69.0) / 12.0);
                        self.car_env.trigger();
                        self.mod_env.trigger();
                        self.current_gate = true;
                    }
                }
            }
        }

        let e_car = self.car_env.process();
        let e_mod = self.mod_env.process();

        if e_car <= 0.0001 && !self.running {
            return 0.0;
        }

        // FM Synthesis Process
        let mut out = 0.0;
        
        let freq1 = self.base_freq * self.ops[0].ratio;
        let freq2 = self.base_freq * self.ops[1].ratio;
        let freq3 = self.base_freq * self.ops[2].ratio;
        let freq4 = self.base_freq * self.ops[3].ratio;
        
        let w1 = freq1 / SAMPLE_RATE;
        let w2 = freq2 / SAMPLE_RATE;
        let w3 = freq3 / SAMPLE_RATE;
        let w4 = freq4 / SAMPLE_RATE;

        // Feedback is applied to OP1 in Yamaha style DX synths
        let fb_mod = self.ops[0].last_val * self.feedback * 10.0; // FB scalar
        let osc1 = f32::sin(2.0 * PI * (self.ops[0].phase + fb_mod)) * self.ops[0].level * e_mod;
        self.ops[0].last_val = osc1;

        match self.algo {
            0 => { // Parallel
                let osc2 = f32::sin(2.0 * PI * self.ops[1].phase) * self.ops[1].level * e_car;
                let osc3 = f32::sin(2.0 * PI * self.ops[2].phase) * self.ops[2].level * e_car;
                let osc4 = f32::sin(2.0 * PI * self.ops[3].phase) * self.ops[3].level * e_car;
                let osc1_car = osc1 / e_mod * e_car; // osc1 is treated as carrier here
                out = (osc1_car + osc2 + osc3 + osc4) * 0.25;
            }
            1 => { // Stack (1 -> 2 -> 3 -> 4)
                let osc2 = f32::sin(2.0 * PI * (self.ops[1].phase + osc1)) * self.ops[1].level * e_mod;
                let osc3 = f32::sin(2.0 * PI * (self.ops[2].phase + osc2)) * self.ops[2].level * e_mod;
                let osc4 = f32::sin(2.0 * PI * (self.ops[3].phase + osc3)) * self.ops[3].level * e_car;
                out = osc4;
            }
            2 => { // Two Pairs (1->2) + (3->4)
                let osc2 = f32::sin(2.0 * PI * (self.ops[1].phase + osc1)) * self.ops[1].level * e_car;
                let osc3 = f32::sin(2.0 * PI * self.ops[2].phase) * self.ops[2].level * e_mod;
                let osc4 = f32::sin(2.0 * PI * (self.ops[3].phase + osc3)) * self.ops[3].level * e_car;
                out = (osc2 + osc4) * 0.5;
            }
            3 => { // One Mod, Three Carriers 1 -> (2, 3, 4)
                let osc2 = f32::sin(2.0 * PI * (self.ops[1].phase + osc1)) * self.ops[1].level * e_car;
                let osc3 = f32::sin(2.0 * PI * (self.ops[2].phase + osc1)) * self.ops[2].level * e_car;
                let osc4 = f32::sin(2.0 * PI * (self.ops[3].phase + osc1)) * self.ops[3].level * e_car;
                out = (osc2 + osc3 + osc4) * 0.333;
            }
            _ => out = 0.0,
        };

        // Advance phases
        self.ops[0].phase += w1; if self.ops[0].phase >= 1.0 { self.ops[0].phase -= 1.0; }
        self.ops[1].phase += w2; if self.ops[1].phase >= 1.0 { self.ops[1].phase -= 1.0; }
        self.ops[2].phase += w3; if self.ops[2].phase >= 1.0 { self.ops[2].phase -= 1.0; }
        self.ops[3].phase += w4; if self.ops[3].phase >= 1.0 { self.ops[3].phase -= 1.0; }

        out
    }
}
