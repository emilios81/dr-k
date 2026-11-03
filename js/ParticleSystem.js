class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 120; // Expansión horizontal
        this.vy = (Math.random() - 0.5) * 100 - 40; // Ligero salto hacia arriba
        this.size = Math.random() < 0.6 ? 2 : 4; // granos de 1 o 2 píxeles del dibujo, como los estratos
        this.color = color;
        this.life = 1.0; 
        this.decay = Math.random() * 1.5 + 1.0; // Desaparición en ~0.5 a 1 segundo
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 300 * dt; // Gravedad afectando el polvo
        this.life -= this.decay * dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        // en la grilla de 2 px
        ctx.fillRect(Math.round(this.x / 2) * 2, Math.round(this.y / 2) * 2, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    spawn(x, y, amount, colorPool) {
        for (let i = 0; i < amount; i++) {
            let color = colorPool[Math.floor(Math.random() * colorPool.length)];
            this.particles.push(new Particle(x, y, color));
        }
    }

    // Tierra que se cuela por la malla de la zaranda: cae sin saltar
    sift(x0, x1, y, amount, colorPool) {
        for (let i = 0; i < amount; i++) {
            let color = colorPool[Math.floor(Math.random() * colorPool.length)];
            let p = new Particle(x0 + Math.random() * (x1 - x0), y, color);
            p.vx = (Math.random() - 0.5) * 20;
            p.vy = 30 + Math.random() * 50;
            p.size = 2;
            p.decay = 0.8 + Math.random() * 0.6;
            this.particles.push(p);
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.update(dt);
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }
}
