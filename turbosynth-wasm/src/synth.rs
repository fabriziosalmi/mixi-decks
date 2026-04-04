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
    pub release: f32,
    phase: u8, // 0: Idle, 1: Attack, 2: Release
    value: f32,
}

impl Env {
    pub fn new() -> Self {
        Env {
            attack: 0.01,
            release: 0.1,
            phase: 0,
            value: 0.0,
        }
    }

    pub fn trigger(&mut self) {
        self.phase = 1;
    }

    pub fn release_trigger(&mut self) {
        if self.phase != 0 {
            self.phase = 2;
        }
    }

    pub fn process(&mut self) -> f32 {
        match self.phase {
            1 => { // Attack
                let rate = 1.0 / (self.attack * SAMPLE_RATE).max(1.0);
                self.value += rate;
                if self.value >= 1.0 {
                    self.value = 1.0;
                    self.phase = 2; // Auto release for simple AR envelope, OR wait for gate off?
                }
            }
            2 => { // Release
                let rate = 1.0 / (self.release * SAMPLE_RATE).max(1.0);
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

pub struct TurboSynth {
    pub pattern: Vec<Step>,
    pub next_pattern: Vec<Step>,
    pub tempo: f32,
    pub waveform: u32, // 0 = Sine, 1 = Tri, 2 = Saw, 3 = Square
    pub cutoff: f32,
    pub resonance: f32,
    pub running: bool,

    envelope: Env,
    
    // Osc state
    phase: f32,
    freq: f32,

    // Filter state
    b0: f32, b1: f32, b2: f32, a1: f32, a2: f32,
    x1: f32, x2: f32, y1: f32, y2: f32,

    // Sequencer state
    steplength: u32,
    samplepos: u32,
    pos: i32,
    current_gate: bool,
}

impl TurboSynth {
    pub fn new() -> Self {
        let mut synth = TurboSynth {
            pattern: vec![Step::default(); 32],
            next_pattern: vec![Step::default(); 32],
            tempo: 120.0,
            waveform: 2, // Saw
            cutoff: 5000.0,
            resonance: 0.707,
            running: false,

            envelope: Env::new(),
            
            phase: 0.0,
            freq: 440.0,

            b0: 0.0, b1: 0.0, b2: 0.0, a1: 0.0, a2: 0.0,
            x1: 0.0, x2: 0.0, y1: 0.0, y2: 0.0,

            steplength: 0,
            samplepos: 1000000,
            pos: -1,
            current_gate: false,
        };
        synth.update_filter();
        synth.set_tempo(120.0);
        synth
    }

    pub fn set_tempo(&mut self, newtempo: f32) {
        self.tempo = newtempo;
        // 16th note step length
        self.steplength = (SAMPLE_RATE * 60.0 / self.tempo / 4.0) as u32;
    }

    pub fn set_cutoff(&mut self, cutoff: f32) {
        self.cutoff = cutoff.clamp(20.0, 20000.0);
        self.update_filter();
    }

    pub fn set_resonance(&mut self, res: f32) {
        self.resonance = res.clamp(0.1, 10.0);
        self.update_filter();
    }

    pub fn set_attack(&mut self, attack: f32) {
        self.envelope.attack = attack.max(0.001);
    }

    pub fn set_release(&mut self, release: f32) {
        self.envelope.release = release.max(0.001);
    }

    fn update_filter(&mut self) {
        let w = 2.0 * PI * self.cutoff / SAMPLE_RATE;
        let s = f32::sin(w);
        let c = f32::cos(w);
        let alpha = s / (2.0 * self.resonance);
        let scale = 1.0 / (1.0 + alpha);

        self.a1 = -2.0 * c * scale;
        self.a2 = (1.0 - alpha) * scale;
        self.b1 = (1.0 - c) * scale;
        self.b0 = 0.5 * self.b1;
        self.b2 = self.b0;
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
                        self.freq = 440.0 * f32::powf(2.0, (step.note as f32 - 69.0) / 12.0);
                        self.envelope.trigger();
                        self.current_gate = true;
                    } else if self.current_gate {
                        // For a step sequencer, release when gate goes low
                        // Or we can just let it auto-release per step
                        // self.envelope.release_trigger();
                        // self.current_gate = false;
                    }
                }
            }
        }

        let env_val = self.envelope.process();
        if env_val <= 0.0001 && !self.running {
            return 0.0;
        }

        // Advance oscillator
        let phase_inc = self.freq / SAMPLE_RATE;
        self.phase += phase_inc;
        if self.phase >= 1.0 { self.phase -= 1.0; }

        let osc_out = match self.waveform {
            0 => f32::sin(2.0 * PI * self.phase), // Sine
            1 => 2.0 * (self.phase * 2.0 - 1.0).abs() - 1.0, // Triangle
            2 => 2.0 * self.phase - 1.0, // Saw
            3 => if self.phase < 0.5 { 1.0 } else { -1.0 }, // Square
            _ => 0.0,
        };

        // Filter
        let x0 = osc_out;
        let y0 = self.b0 * x0 + self.b1 * self.x1 + self.b2 * self.x2 - self.a1 * self.y1 - self.a2 * self.y2;
        
        self.x2 = self.x1;
        self.x1 = x0;
        self.y2 = self.y1;
        self.y1 = y0;

        y0 * env_val
    }
}
