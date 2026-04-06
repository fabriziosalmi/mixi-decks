use std::f32::consts::PI;

pub const SAMPLE_RATE: f32 = 44100.0;

fn coeff_highpass(cutoff: f32) -> [f32; 5] {
    let x = f32::exp(-2.0 * PI * cutoff / SAMPLE_RATE);
    [0.0, 0.0, 0.5 * (1.0 + x), -0.5 * (1.0 + x), x]
}

fn coeff_allpass(cutoff: f32) -> [f32; 5] {
    let t = f32::tan(PI * cutoff / SAMPLE_RATE);
    // Preserved the original JS typo (1 + 1.0) instead of (t + 1.0) for perfect clone reproduction
    let x = (t - 1.0) / 2.0;
    [0.0, 0.0, x, 1.0, -x]
}

fn coeff_biquad_lowpass12db(freq: f32, gain: f32) -> [f32; 9] {
    let w = 2.0 * PI * freq / SAMPLE_RATE;
    let s = f32::sin(w);
    let c = f32::cos(w);
    let q = gain;
    let alpha = s / (2.0 * q);
    let scale = 1.0 / (1.0 + alpha);

    let a1 = 2.0 * c * scale;
    let a2 = (alpha - 1.0) * scale;
    let b1 = (1.0 - c) * scale;
    let b0 = 0.5 * b1;
    let b2 = b0;

    [0.0, 0.0, 0.0, 0.0, b0, b1, b2, a1, a2]
}

fn sinh(x: f32) -> f32 {
    let e_x = f32::exp(x);
    let e_nx = f32::exp(-x);
    (e_x - e_nx) * 0.5
}

fn coeff_biquad_notch(freq: f32, bandwidth: f32) -> [f32; 9] {
    let w = 2.0 * PI * freq / SAMPLE_RATE;
    let s = f32::sin(w);
    let c = f32::cos(w);
    let alpha = s * sinh(0.5 * f32::ln(2.0) * bandwidth * w / s);
    let scale = 1.0 / (1.0 + alpha);

    let a1 = 2.0 * c * scale;
    let a2 = (alpha - 1.0) * scale;
    let b0 = 1.0 * scale;
    let b1 = -2.0 * c * scale;
    let b2 = 1.0 * scale;

    [0.0, 0.0, 0.0, 0.0, b0, b1, b2, a1, a2]
}

lazy_static::lazy_static! {
    pub static ref WAVETABLE: Vec<f32> = genwavetable();
}

pub fn genwavetable() -> Vec<f32> {
    let mut stab = vec![0.0; 4096];
    for i in 0..4096 {
        stab[i] = f32::sin(2.0 * PI * (i as f32 / 4096.0));
    }

    let mut wavetable = vec![0.0; 2 * 524288];
    let mut last = 0;

    for i in 0..128 {
        let h = ((SAMPLE_RATE as i32 >> 1) as f32 / (440.0 * f32::powf(2.0, (i as f32 - 69.0) / 12.0))).round() as i32;

        if h == last {
            continue;
        }

        let invh = 1.0 / h as f32;
        let mut m = 1.0;
        
        for j in 1..=h {
            m = f32::cos((j as f32 - 1.0) * (0.5 * PI) / invh) * m / j as f32;

            for k in 0..4096 {
                let f_val = m * stab[((j * k) & 4095) as usize];
                // Sawtooth
                let idx = 1 + (k + (i << 12)) as usize;
                if idx < 524288 {
                    wavetable[idx] += f_val;
                }

                // Square
                if j & 1 == 1 {
                    let sq_idx = 524288 + k as usize + (i << 12) as usize;
                    if sq_idx < 2 * 524288 {
                        wavetable[sq_idx] += f_val;
                    }
                }
            }
        }
        last = h;
    }

    let mut max0 = 0.0_f32;
    let mut max1 = 0.0_f32;
    for i in 0..524288 {
        if wavetable[i].abs() > max0 { max0 = wavetable[i].abs(); }
        if wavetable[524288 + i].abs() > max1 { max1 = wavetable[524288 + i].abs(); }
    }

    if max0 > 0.0 {
        max0 = 1.0 / max0;
    }
    if max1 > 0.0 {
        max1 = 1.0 / max1;
    }
    
    for i in 0..524288 {
        wavetable[i] *= max0;
        wavetable[524288 + i] *= max1;
    }

    wavetable
}

#[derive(Clone, Copy)]
pub struct Step {
    pub note: u8,
    pub accent: bool,
    pub slide: bool,
    pub gate: f32, // using f32 for gate to multiply directly
    pub down: u8, // down
    pub up: u8, // up
}

impl Default for Step {
    fn default() -> Self {
        Step { note: 40, accent: false, slide: false, gate: 0.0, down: 0, up: 0 }
    }
}

pub struct TB303 {
    pub pattern: Vec<Step>,
    pub next_pattern: Vec<Step>,
    pub tempo: f32,
    pub tuning: f32,
    pub waveform: u32,
    pub cutoff: f32,
    pub resonance: f32,
    pub envmod: f32,
    pub decay: f32,
    pub accent: f32,
    pub dist_shape: f32,
    pub dist_threshold: f32,
    pub delay_feedback: f32,
    pub delay_send: f32,
    pub delay_length: usize,
    pub running: bool,

    onepole: [[f32; 5]; 4],
    biquad: [[f32; 9]; 2],
    tbfilter: [f32; 5],
    resonance_skewed: f32,
    tbf_b0: f32,
    tbf_k: f32,
    tbf_g: f32,

    steplength: u32,
    samplepos: u32,
    pos: i32,
    slidestep: u32,
    table: usize,
    oscpos: f32,
    oscdelta: f32,
    ampenv: f32,
    filterenv: f32,
    slide: f32,
    filtermult: f32,
    ampmult: f32,
    accentgain: f32,
    envscaler: f32,
    envoffset: f32,
    effective_dist_threshold: f32,
    dist_gain: f32,
    delaybuffer: Vec<f32>,
    delaypos: usize,
}

impl TB303 {
    pub fn new() -> Self {
        let mut synth = TB303 {
            pattern: vec![Default::default(); 16],
            next_pattern: vec![Default::default(); 16],
            tempo: 100.0,
            tuning: 0.0,
            waveform: 0,
            cutoff: 240.0,
            resonance: 1.0,
            envmod: 0.0,
            decay: 100.0,
            accent: 0.0,
            dist_shape: 0.0,
            dist_threshold: 1.0,
            delay_feedback: 0.5,
            delay_send: 0.5,
            delay_length: 20000,
            running: true,

            onepole: [[0.0; 5]; 4],
            biquad: [[0.0; 9]; 2],
            tbfilter: [0.0; 5],
            resonance_skewed: 0.0,
            tbf_b0: 0.0,
            tbf_k: 0.0,
            tbf_g: 1.0,

            steplength: 0,
            samplepos: 1000000,
            pos: -1,
            slidestep: 0,
            table: 0,
            oscpos: 0.0,
            oscdelta: 0.0,
            ampenv: 0.0,
            filterenv: 0.0,
            slide: 0.0,
            filtermult: 0.0,
            ampmult: 0.0,
            accentgain: 0.0,
            envscaler: 0.0,
            envoffset: 0.0,
            effective_dist_threshold: 1.0,
            dist_gain: 1.0,
            delaybuffer: vec![0.0; 2 * SAMPLE_RATE as usize],
            delaypos: 0,
        };
        synth.reset();
        synth
    }

    pub fn set_tempo(&mut self, newtempo: f32) {
        self.tempo = newtempo;
        self.steplength = (SAMPLE_RATE * 60.0 / self.tempo / 4.0) as u32;
    }

    pub fn set_dist_threshold(&mut self, newthresh: f32) {
        self.dist_threshold = newthresh;
        self.effective_dist_threshold = 1.0 - 0.9 * self.dist_threshold;
        self.dist_gain = 1.0 / self.effective_dist_threshold.max(0.0001); // Prevent div by 0
    }

    pub fn set_cutoff(&mut self, newcutoff: f32) {
        self.cutoff = newcutoff;
        self.set_envmod(self.envmod);
    }

    pub fn set_resonance(&mut self, newresonance: f32) {
        self.resonance = newresonance;
        let num = 1.0 - f32::exp(-3.0 * self.resonance);
        let den = 1.0 - f32::exp(-3.0);
        self.resonance_skewed = num / den;
    }

    pub fn set_envmod(&mut self, newenvmod: f32) {
        self.envmod = newenvmod;
        let c0 = 313.8152786059267;
        let c1 = 2394.411986817546;
        let c = f32::ln(self.cutoff.max(1.0) / c0) / f32::ln(c1 / c0);

        let slo = 3.773996325111173 * self.envmod + 0.736965594166206;
        let shi = 4.194548788411135 * self.envmod + 0.864344900642434;

        self.envscaler = (1.0 - c) * slo + c * shi;
        self.envoffset = 0.048292930943553 * c + 0.294391201442418;
    }

    pub fn reset(&mut self) {
        self.onepole[0] = coeff_highpass(44.486);
        self.onepole[1] = coeff_highpass(150.0);
        self.onepole[2] = coeff_allpass(14.008);
        self.onepole[3] = coeff_highpass(24.167);

        self.biquad[0] = coeff_biquad_lowpass12db(200.0, 0.5_f32.sqrt());
        self.biquad[1] = coeff_biquad_notch(7.5164, 4.7);

        self.tbfilter = [0.0; 5];
        let tempo = self.tempo;
        self.set_tempo(tempo);
        
        let dist = self.dist_threshold;
        self.set_dist_threshold(dist);
        
        let res = self.resonance;
        self.set_resonance(res);
        
        let envm = self.envmod;
        self.set_envmod(envm);

        self.samplepos = 1000000;
        self.pos = -1;
        self.oscpos = 0.0;
    }

    pub fn render(&mut self) -> f32 {
        let anti_denormal: f32 = 1.0e-20;
        
        if self.running {
            self.samplepos += 1;
            if self.samplepos >= self.steplength {
                self.samplepos = 0;
                self.pos += 1;

                if self.pos >= self.pattern.len() as i32 {
                    self.pos = 0;
                    self.pattern = self.next_pattern.clone();
                }

                if self.pattern.is_empty() {
                    return 0.0; // Fail safe
                }
                
                let step = self.pattern[self.pos as usize];
                let pitch = step.note as f32 - (step.down as f32 * 12.0) + (step.up as f32 * 12.0) + self.tuning;
                let f = 440.0 * f32::powf(2.0, (pitch - 69.0) / 12.0);

                self.ampmult = f32::exp(-1.0 / (0.001 * self.decay * SAMPLE_RATE));
                if step.accent {
                    self.filtermult = f32::exp(-1.0 / (0.001 * 200.0 * SAMPLE_RATE));
                    self.accentgain = self.accent;
                } else {
                    self.filtermult = self.ampmult;
                    self.accentgain = 0.0;
                }
                self.ampenv = (1.0 / self.ampmult) * step.gate;

                if step.slide {
                    self.slide = (self.oscdelta - (f * 4096.0 / SAMPLE_RATE)) / 64.0;
                    self.slidestep = 0;
                } else {
                    self.filterenv = 1.0 / self.filtermult;
                    self.oscpos = 0.0;
                    self.slide = 0.0;
                    self.slidestep = 64;
                    self.oscdelta = f * 4096.0 / SAMPLE_RATE;
                    self.table = (self.waveform * 524288) as usize + ((step.note as usize) << 12);
                }
            }
        } else {
            self.ampenv = 0.0;
        }

        self.ampenv = self.ampenv * self.ampmult + anti_denormal;
        self.filterenv = self.filterenv * self.filtermult + anti_denormal;

        let idx = self.oscpos.round() as usize;
        let r = self.oscpos - idx as f32;
        
        let tab_idx1 = (self.table + idx) % WAVETABLE.len();
        let tab_idx2 = (self.table + ((idx + 1) & 4095)) % WAVETABLE.len();
        let mut sample = ((1.0 - r) * WAVETABLE[tab_idx1] + r * WAVETABLE[tab_idx2]);
        
        self.oscpos += self.oscdelta;
        if self.oscpos > 4096.0 {
            self.oscpos -= 4096.0;
        }

        if (self.samplepos & 63) == 0 {
            if self.slidestep < 64 {
                self.oscdelta -= self.slide;
                self.slidestep += 1;
            }

            let tmp1 = self.envscaler * (self.filterenv - self.envoffset);
            let tmp2 = self.accentgain * self.filterenv;
            let effectivecutoff = f32::min(self.cutoff * f32::powf(2.0, tmp1 + tmp2), 20000.0);

            let wc = (2.0 * PI / SAMPLE_RATE) * effectivecutoff;
            let res = self.resonance_skewed;
            let fx = wc * 0.11253953951963826;
            
            self.tbf_b0 = (0.00045522346 + 6.1922189 * fx) / (1.0 + 12.358354 * fx + 4.4156345 * (fx * fx));
            let mut k = fx * (fx * (fx * (fx * (fx * (fx + 7198.6997) - 5837.7917) - 476.47308) + 614.95611) + 213.87126) + 16.998792;
            self.tbf_g = (((k * 0.058823529411764705) - 1.0) * res + 1.0) * (1.0 + res);
            self.tbf_k = k * res;
        }

        self.onepole[0][1] = self.onepole[0][2] * sample + self.onepole[0][3] * self.onepole[0][0] + self.onepole[0][4] * self.onepole[0][1] + anti_denormal;
        self.onepole[0][0] = sample;
        sample = self.onepole[0][1];

        let fbhp = self.tbf_k * self.tbfilter[4];

        self.onepole[1][1] = self.onepole[1][2] * fbhp + self.onepole[1][3] * self.onepole[1][0] + self.onepole[1][4] * self.onepole[1][1] + anti_denormal;
        self.onepole[1][0] = fbhp;
        let fbhp_filtered = self.onepole[1][1];

        self.tbfilter[0] = sample - fbhp_filtered;
        self.tbfilter[1] += 2.0 * self.tbf_b0 * (self.tbfilter[0] - self.tbfilter[1] + self.tbfilter[2]);
        self.tbfilter[2] += self.tbf_b0 * (self.tbfilter[1] - 2.0 * self.tbfilter[2] + self.tbfilter[3]);
        self.tbfilter[3] += self.tbf_b0 * (self.tbfilter[2] - 2.0 * self.tbfilter[3] + self.tbfilter[4]);
        self.tbfilter[4] += self.tbf_b0 * (self.tbfilter[3] - 2.0 * self.tbfilter[4]);
        sample = 2.0 * self.tbf_g * self.tbfilter[4];

        self.onepole[2][1] = self.onepole[2][2] * sample + self.onepole[2][3] * self.onepole[2][0] + self.onepole[2][4] * self.onepole[2][1] + anti_denormal;
        self.onepole[2][0] = sample;
        sample = self.onepole[2][1];

        self.onepole[3][1] = self.onepole[3][2] * sample + self.onepole[3][3] * self.onepole[3][0] + self.onepole[3][4] * self.onepole[3][1] + anti_denormal;
        self.onepole[3][0] = sample;
        sample = self.onepole[3][1];

        let flt1 = &mut self.biquad[1];
        let biquady1 = flt1[4] * sample + flt1[5] * flt1[0] + flt1[6] * flt1[1] + flt1[7] * flt1[2] + flt1[8] * flt1[3] + anti_denormal;
        flt1[1] = flt1[0];
        flt1[0] = sample;
        flt1[3] = flt1[2];
        flt1[2] = biquady1;
        sample = biquady1;

        let mut outputgain = ((self.accentgain * 4.0 + 1.0) * self.ampenv);
        let flt0 = &mut self.biquad[0];
        let biquady0 = flt0[4] * outputgain + flt0[5] * flt0[0] + flt0[6] * flt0[1] + flt0[7] * flt0[2] + flt0[8] * flt0[3] + anti_denormal;
        flt0[1] = flt0[0];
        flt0[0] = outputgain;
        flt0[3] = flt0[2];
        flt0[2] = biquady0;
        outputgain = biquady0;

        sample *= outputgain;

        if sample > self.effective_dist_threshold || sample < -self.effective_dist_threshold {
            let clipped = if sample > 0.0 { 1.0 } else { -1.0 } * self.effective_dist_threshold;
            
            let dist_shape = self.dist_shape;
            let eff_thresh = self.effective_dist_threshold;
            
            let inner_val = ((1.0 - dist_shape) * clipped + dist_shape * sample) - eff_thresh;
            let rem_val = inner_val % (eff_thresh * 4.0);
            sample = (rem_val.abs().abs() - eff_thresh * 2.0).abs() - eff_thresh;
        }
        sample *= self.dist_gain;

        let prev = self.delaybuffer[self.delaypos];
        self.delaybuffer[self.delaypos] = self.delay_send * sample + self.delay_feedback * prev + anti_denormal;
        self.delaypos += 1;
        if self.delaypos >= self.delay_length {
            self.delaypos = 0;
        }
        sample += prev;

        sample
    }
}
