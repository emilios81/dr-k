class Ball {
    static FRAMES = 16;     // cuadros de la vuelta de cada herramienta
    static frames = {};     // se dibujan una sola vez y los comparten todos

    // tool: 'cucharin' (el de siempre), 'espatula' o 'brocha' (las que suman los poderes)
    constructor(gameWidth, gameHeight, player, tool = 'cucharin') {
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.player = player;
        this.tool = tool;

        this.radius = 12; // Hitbox circular (sin cambios)
        this.speed = 350;

        this.rotation = 0;
        this.rotSpeed = 8; // rad/s

        // Límites laterales (la cara interna de los muros); los fija Game
        this.minX = 0;
        this.maxX = gameWidth;

        this.reset();
    }

    // La zaranda está arriba: el cucharín cuelga debajo y sale hacia abajo
    reset() {
        this.active = false;
        this.x = this.player.x + this.player.width / 2;
        this.y = this.player.y + this.player.height + this.radius;
        this.vx = 0;
        this.vy = 0;
    }

    launch() {
        if (!this.active) {
            this.active = true;
            this.vy = this.speed;
            this.vx = (Math.random() - 0.5) * this.speed * 0.4;
            this.normalizeVelocity();
        }
    }

    normalizeVelocity() {
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.vx = (this.vx / currentSpeed) * this.speed;
        this.vy = (this.vy / currentSpeed) * this.speed;
    }

    update(dt) {
        if (!this.active) {
            this.x = this.player.x + this.player.width / 2;
            this.y = this.player.y + this.player.height + this.radius;
            return;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += this.rotSpeed * dt;

        // Rebota en los muros; arriba no hay techo (si pasa la zaranda se pierde)
        // y abajo rebota contra el estrato siguiente (eso lo resuelve Game)
        if (this.x - this.radius < this.minX) {
            this.x = this.minX + this.radius;
            this.vx = Math.abs(this.vx);
        } else if (this.x + this.radius > this.maxX) {
            this.x = this.maxX - this.radius;
            this.vx = -Math.abs(this.vx);
        }
    }

    // Herramientas de arqueólogo en pixel art, a la escala de los estratos.
    // En vez de girar una imagen (que deforma los píxeles) se vuelven a
    // dibujar en cada ángulo, con la luz siempre desde arriba a la izquierda.
    static toolFrames(tool) {
        if (Ball.frames[tool]) return Ball.frames[tool];
        const S = 30;
        Ball.frames[tool] = [];
        for (let k = 0; k < Ball.FRAMES; k++) {
            const grid = Ball.toolGrid(tool, S, k / Ball.FRAMES * Math.PI * 2);
            Ball.frames[tool].push(PixelArt.lienzo(grid, S, S, '#1e1510', { dx: 1, dy: 2, alfa: 0.35 }));
        }
        return Ball.frames[tool];
    }

    // La herramienta en un cuadro de S x S, girada `a` (0 = punta a la
    // izquierda), achicada `escala` y con centro en (cx, cy): el color de
    // cada píxel (null = vacío). También la usan los íconos de los poderes.
    static toolGrid(tool, S, a, escala = 1, cx = S / 2, cy = S / 2) {
        const ACERO = ['#4f565c', '#7d858c', '#aab1b7', '#e2e7ea'];
        const MADERA = ['#5e3a1e', '#8a5a32', '#b07a45', '#d9a466'];
        const PINTADO = ['#4a1814', '#7a2a22', '#a8433a', '#d06a5c'];   // mango de la espátula
        const VIROLA = ['#5c4a24', '#8f7637', '#c2a052', '#ead48a'];
        const BARNIZ = ['#1e1a18', '#3a322c', '#5c5046', '#857668'];    // mango de la brocha
        const PELO = ['#8a7a5a', '#bfae88', '#e2d4b0', '#f6eeda'];
        const TIERRA = ['#5b4332', '#7c5c41'];
        const LUZ = [-0.5, -0.62, 0.6];

        // Pieza acostada: u va de la punta (-) al mango (+), v es lo ancho.
        // Cucharín: hoja romboidal, cuello, virola de bronce y mango de madera.
        // Espátula: hoja larga y angosta de punta redonda y mango pintado.
        // Brocha: pelo, virola de lata y mango de madera.
        const HOJA = [[-11.5, 0], [-4, -3.9], [-1.4, -2.7], [-0.6, 0], [-1.4, 2.7], [-4, 3.9]];
        const mango = (u, v, desde, ancho) => u >= desde && u <= 11.1 && Math.abs(v) <= ancho &&
            (u <= 11.1 - ancho || (u - 11.1 + ancho) ** 2 + v * v <= ancho * ancho);
        const formas = {
            cucharin: (u, v) => {
                if (mango(u, v, 3.6, 1.9)) return 'mango';
                if (u >= 2 && u < 3.6 && Math.abs(v) <= 1.6) return 'virola';
                if (u >= -1.2 && u < 2 && Math.abs(v) <= 0.75) return 'cuello';
                return PixelArt.enPoligono(HOJA, u, v) ? 'hoja' : null;
            },
            espatula: (u, v) => {
                if (mango(u, v, 3.4, 1.8)) return 'pintado';
                if (u >= 1.8 && u < 3.4 && Math.abs(v) <= 1.5) return 'virola';
                if (u >= -0.5 && u < 1.8 && Math.abs(v) <= 0.7) return 'cuello';
                const ancho = 1.3 + (-0.5 - u) * 0.06;   // se abre un poco hacia la punta
                if (u >= -10 && u < -0.5 && Math.abs(v) <= ancho) return 'lamina';
                return (u + 10) ** 2 + v * v <= 1.9 * 1.9 ? 'lamina' : null;
            },
            brocha: (u, v) => {
                if (mango(u, v, 0.8, 1.3)) return 'barniz';
                if (u >= -2.4 && u < 0.8 && Math.abs(v) <= 2.6) return 'aro';
                return u >= -10.5 && u < -2.4 && Math.abs(v) <= 2.7 + (-2.4 - u) * 0.07 ? 'pelo' : null;
            },
        };
        // Tono (0 a 3) de una pieza redonda: según de qué lado le da la luz
        const cilindro = (t, ex, ey) => {
            t = Math.max(-1, Math.min(1, t));
            const I = t * (ex * LUZ[0] + ey * LUZ[1]) + Math.sqrt(1 - t * t) * LUZ[2];
            return I > 0.8 ? 3 : I > 0.5 ? 2 : I > 0.15 ? 1 : 0;
        };
        const parte = formas[tool];

        const ex = -Math.sin(a), ey = Math.cos(a);   // hacia dónde apunta v en la pantalla
        const { tipo, uv } = PixelArt.rasterizar(S, a, parte, escala, cx, cy);

        // La cara de la hoja que mira hacia la luz va más clara
        const ladoClaro = (ex * LUZ[0] + ey * LUZ[1]) >= 0 ? 1 : -1;
        const grid = new Array(S * S).fill(null);
        for (let j = 0; j < S; j++) {
            for (let i = 0; i < S; i++) {
                const idx = j * S + i, p = tipo[idx];
                if (!p) continue;
                const [u, v] = uv(i, j);
                const orilla = (i > 0 && !tipo[idx - 1]) || (i < S - 1 && !tipo[idx + 1]) ||
                               (j > 0 && !tipo[idx - S]) || (j < S - 1 && !tipo[idx + S]);
                let col;
                if (p === 'hoja') {
                    const claro = (v >= 0 ? 1 : -1) === ladoClaro;
                    col = ACERO[claro ? (orilla ? 3 : 2) : 1];
                    // un reflejo largo sobre la cara clara
                    if (claro && !orilla && u > -8 && u < -3.5 && Math.abs(v) > 0.6 && Math.abs(v) < 1.7) col = ACERO[3];
                    // tierra pegada cerca de la punta
                    const r = PixelArt.ruido(Math.floor(u * 1.2), Math.floor(v * 1.2) + 10, 3);
                    if (u < -7.5 && r < 0.45) col = TIERRA[r < 0.2 ? 0 : 1];
                } else if (p === 'lamina') {
                    // hoja chata: el canto del lado de la luz brilla, el otro se apaga
                    const claro = (v >= 0 ? 1 : -1) === ladoClaro;
                    col = ACERO[orilla ? (claro ? 3 : 1) : 2];
                    if (!orilla && Math.abs(v) < 0.5 && u > -9 && u < -3) col = ACERO[3];
                } else if (p === 'pelo') {
                    let t = cilindro(v / 3.2, ex, ey);
                    // las cerdas, en hebras a lo largo
                    if (t > 0 && Math.floor(v * 1.6 + 8) % 2 === 0) t--;
                    col = PELO[t];
                } else if (p === 'cuello') {
                    col = ACERO[Math.min(1, cilindro(v / 0.75, ex, ey))];
                } else if (p === 'virola') {
                    col = VIROLA[cilindro(v / 1.6, ex, ey)];
                } else if (p === 'aro') {
                    col = ACERO[cilindro(v / 2.6, ex, ey)];
                } else {
                    const tonos = p === 'pintado' ? PINTADO : p === 'barniz' ? BARNIZ : MADERA;
                    let t = cilindro(v / (p === 'barniz' ? 1.3 : 1.9), ex, ey);
                    // vetas de la madera
                    if (p === 'mango' && t > 0 && PixelArt.ruido(Math.floor(u * 1.5), Math.round(v * 2), 7) < 0.15) t--;
                    col = tonos[t];
                }
                grid[idx] = col;
            }
        }
        return grid;
    }

    draw(ctx) {
        const frames = Ball.toolFrames(this.tool), n = frames.length;
        const f = frames[((Math.round(this.rotation / (Math.PI * 2) * n) % n) + n) % n];
        const s = f.width * 2;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        // en la grilla de 2 px, como los estratos
        ctx.drawImage(f, Math.round((this.x - s / 2) / 2) * 2, Math.round((this.y - s / 2) / 2) * 2, s, s);
        ctx.restore();
    }
}
