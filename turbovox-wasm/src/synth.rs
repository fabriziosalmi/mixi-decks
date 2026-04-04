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
    phase: u8,
    value: f32,
}

impl Env {
    pub fn new() -> Self {
        Env { attack: 0.05, decay: 0.3, phase: 0, value: 0.0 }
    }

    pub fn trigger(&mut self) {
        self.phase = 1;
        self.value = 0.0;
    }

    pub fn process(&mut self) -> f32 {
        match self.phase {
            1 => {
                let rate = 1.0 / (self.attack * SAMPLE_RATE).max(1.0);
                self.value += rate;
                if self.value >= 1.0 { self.value = 1.0; self.phase = 2; }
            }
            2 => {
                let rate = 1.0 / (self.decay * SAMPLE_RATE).max(1.0);
                self.value -= rate;
                if self.value <= 0.0 { self.value = 0.0; self.phase = 0; }
            }
            _ => self.value = 0.0,
        }
        self.value
    }
}

pub struct BPF {
    freq: f32,
    q: f32,
    b0: f32, b1: f32, b2: f32, a1: f32, a2: f32,
    x1: f32, x2: f32, y1: f32, y2: f32,
}

impl BPF {
    pub fn new() -> Self {
        BPF {
            freq: 1000.0, q: 5.0,
            b0: 0.0, b1: 0.0, b2: 0.0, a1: 0.0, a2: 0.0,
            x1: 0.0, x2: 0.0, y1: 0.0, y2: 0.0,
        }
    }

    pub fn set_params(&mut self, freq: f32, q: f32) {
        self.freq = freq.clamp(20.0, 20000.0);
        self.q = q.max(0.1);
        let w = 2.0 * PI * self.freq / SAMPLE_RATE;
        let s = f32::sin(w);
        let c = f32::cos(w);
        let alpha = s / (2.0 * self.q);
        let scale = 1.0 / (1.0 + alpha);

        self.a1 = -2.0 * c * scale;
        self.a2 = (1.0 - alpha) * scale;
        self.b1 = 0.0;
        self.b0 = alpha * scale;
        self.b2 = -self.b0;
    }

    pub fn process(&mut self, input: f32) -> f32 {
        let out = self.b0 * input + self.b1 * self.x1 + self.b2 * self.x2 - self.a1 * self.y1 - self.a2 * self.y2;
        self.x2 = self.x1; self.x1 = input;
        self.y2 = self.y1; self.y1 = out;
        out
    }
}

struct Vowel { f1: f32, f2: f32, f3: f32 }
const VOWELS: [Vowel; 5] = [
    Vowel { f1: 700.0, f2: 1200.0, f3: 2600.0 }, // A
    Vowel { f1: 400.0, f2: 1600.0, f3: 2700.0 }, // E
    Vowel { f1: 300.0, f2: 2200.0, f3: 3000.0 }, // I
    Vowel { f1: 400.0, f2:  800.0, f3: 2600.0 }, // O
    Vowel { f1: 300.0, f2:  700.0, f3: 2500.0 }, // U
];

pub struct TurboVox {
    pub pattern: Vec<Step>,
    pub next_pattern: Vec<Step>,
    pub tempo: f32,

    pub morph: f32,
    pub vibrato: f32,
    pub glide: f32,
    pub lfo_rate: f32,
    
    pub running: bool,

    pub env: Env,
    f1: BPF, f2: BPF, f3: BPF,

    phase: f32,
    lfo_phase: f32,
    current_freq: f32,
    target_freq: f32,

    steplength: u32,
    samplepos: u32,
    pos: i32,
}

impl TurboVox {
    pub fn new() -> Self {
        let mut synth = TurboVox {
            pattern: vec![Step::default(); 32],
            next_pattern: vec![Step::default(); 32],
            tempo: 120.0,
            morph: 0.0,
            vibrato: 0.0,
            glide: 0.1,
            lfo_rate: 5.0,
            running: false,

            env: Env::new(),
            f1: BPF::new(), f2: BPF::new(), f3: BPF::new(),

            phase: 0.0,
            lfo_phase: 0.0,
            current_freq: 440.0,
            target_freq: 440.0,

            steplength: 0,
            samplepos: 1000000,
            pos: -1,
        };
        synth.set_tempo(120.0);
        synth.update_formants();
        synth
    }

    pub fn set_tempo(&mut self, newtempo: f32) {
        self.tempo = newtempo;
        self.steplength = (SAMPLE_RATE * 60.0 / self.tempo / 4.0) as u32;
    }

    pub fn set_morph(&mut self, morph: f32) {
        self.morph = morph.clamp(0.0, 1.0);
        self.update_formants();
    }

    fn update_formants(&mut self) {
        let m = self.morph * 4.0;
        let idx = m.floor() as usize;
        let f = m - m.floor();

        let (v1, v2) = if idx >= 4 {
            (&VOWELS[4], &VOWELS[4])
        } else {
            (&VOWELS[idx], &VOWELS[idx + 1])
        };

        // Interpolate
        let freq1 = v1.f1 * (1.0 - f) + v2.f1 * f;
        let freq2 = v1.f2 * (1.0 - f) + v2.f2 * f;
        let freq3 = v1.f3 * (1.0 - f) + v2.f3 * f;

        // Bandwidths are generally tighter for vocal formants (Q around 5-10)
        self.f1.set_params(freq1, 5.0);
        self.f2.set_params(freq2, 8.0);
        self.f3.set_params(freq3, 10.0);
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
                        self.target_freq = 440.0 * f32::powf(2.0, (step.note as f32 - 69.0) / 12.0);
                        self.env.trigger();
                    }
                }
            }
        }

        let e_val = self.env.process();
        if e_val <= 0.0001 && !self.running { return 0.0; }

        // Glide (Portamento)
        let glide_coeff = if self.glide < 0.001 { 1.0 } else { 1.0 / (self.glide * SAMPLE_RATE) };
        self.current_freq += (self.target_freq - self.current_freq) * glide_coeff;

        // Vibrato
        self.lfo_phase += self.lfo_rate / SAMPLE_RATE;
        if self.lfo_phase >= 1.0 { self.lfo_phase -= 1.0; }
        let lfo_val = f32::sin(2.0 * PI * self.lfo_phase);
        let mod_freq = self.current_freq * (1.0 + self.vibrato * 0.05 * lfo_val);

        // Sawtooth Oscillator
        self.phase += mod_freq / SAMPLE_RATE;
        if self.phase >= 1.0 { self.phase -= 1.0; }
        let osc = 2.0 * self.phase - 1.0;

        // Parallel Formant Filters
        let out1 = self.f1.process(osc);
        let out2 = self.f2.process(osc) * 0.7; // Lower amp for higher formants
        let out3 = self.f3.process(osc) * 0.4;

        (out1 + out2 + out3) * e_val * 2.0 // Makeup gain
    }
}
