class SoundManager {
    constructor() {
        this.baseVolume = 0.2;
        this.muted = localStorage.getItem('arkeonoid_muted') === '1';

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.muted ? 0 : this.baseVolume;
            this.masterGain.connect(this.ctx.destination);

            this.musicPlaying = false;
            this.musicTimeout = null;
        } catch(e) {
            console.error("Web Audio API no soportada");
        }
    }

    init() {
        if(this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        if (!this.ctx) return;
        this.muted = !this.muted;
        this.masterGain.gain.value = this.muted ? 0 : this.baseVolume;
        try { localStorage.setItem('arkeonoid_muted', this.muted ? '1' : '0'); } catch(e) {}
    }

    playTone(freq, type, duration, vol=1, slideFreq=null) {
        if (!this.ctx) return;
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        
        osc.type = type; 
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slideFreq) {
            osc.frequency.exponentialRampToValueAtTime(slideFreq, this.ctx.currentTime + duration);
        }
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // --- SFX (Efectos de sonido 8-bit) ---
    paddleHit() { this.playTone(800, 'square', 0.1, 0.4); }
    brickHit() { this.playTone(400, 'square', 0.1, 0.4); }
    powerupCatch() { this.playTone(600, 'square', 0.3, 0.5, 1200); }
    letterNormalCatch() { this.playTone(900, 'triangle', 0.15, 0.5, 1100); }
    letterGoldCatch() { this.playTone(1200, 'square', 0.4, 0.7, 2000); }
    
    wordComplete() { 
        this.playTone(440, 'square', 0.1, 0.6); 
        setTimeout(() => this.playTone(554, 'square', 0.1, 0.6), 100);
        setTimeout(() => this.playTone(659, 'square', 0.3, 0.6), 200);
    }
    
    ppqComplete() {
        this.playTone(523.25, 'square', 0.15, 0.7); 
        setTimeout(() => this.playTone(659.25, 'square', 0.15, 0.7), 150); 
        setTimeout(() => this.playTone(783.99, 'square', 0.15, 0.7), 300); 
        setTimeout(() => this.playTone(1046.50, 'square', 0.4, 0.7), 450); 
    }
    
    loseLife() { this.playTone(150, 'sawtooth', 0.5, 0.8, 50); }
    gameOver() {
        this.playTone(300, 'sawtooth', 0.3, 0.8, 100);
        setTimeout(() => this.playTone(250, 'sawtooth', 0.3, 0.8, 80), 300);
        setTimeout(() => this.playTone(200, 'sawtooth', 0.8, 0.8, 50), 600);
    }
    victory() {
        this.playTone(440, 'square', 0.2, 0.8);
        setTimeout(() => this.playTone(554, 'square', 0.2, 0.8), 200);
        setTimeout(() => this.playTone(659, 'square', 0.2, 0.8), 400);
        setTimeout(() => this.playTone(880, 'square', 0.6, 0.8), 600);
    }

    // --- Arpegiador de Fondo 8-bit ---
    startMusic() {
        if (this.musicPlaying || !this.ctx) return;
        this.musicPlaying = true;
        
        // Escala menor andina (Pueblo Perdido)
        const notes = [110.00, 130.81, 164.81, 174.61, 164.81, 130.81, 110.00, 98.00];
        let idx = 0;
        
        let playNextNote = () => {
            if (!this.musicPlaying) return;
            this.playTone(notes[idx] * 2, 'triangle', 0.3, 0.15); 
            idx = (idx + 1) % notes.length;
            this.musicTimeout = setTimeout(playNextNote, 250); 
        };
        
        playNextNote();
    }

    stopMusic() {
        this.musicPlaying = false;
        clearTimeout(this.musicTimeout);
    }
}
