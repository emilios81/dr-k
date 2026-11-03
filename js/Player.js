class Player {
    constructor(gameWidth, gameHeight) {
        this.gameWidth  = gameWidth;
        this.gameHeight = gameHeight;

        this.baseWidth = 120;
        this.width     = this.baseWidth;
        this.height    = 18;

        // Límites laterales (la cara interna de los muros); los fija Game
        this.minX = 0;
        this.maxX = gameWidth;

        this.x = gameWidth / 2 - this.width / 2;
        this.y = Player.yFor(gameHeight);
        // Hasta dónde se puede subir y bajar con la soga; los fija Game
        this.minY = this.y;
        this.maxY = this.y;

        this.speed         = 450;
        this.vSpeed        = 260;   // subiendo o bajando con ↑ ↓
        this.hitTimer      = 0;
        this.powerTimer    = 0;
        this.powerMaxTimer = 0;
        this.bump          = 0;   // sacudón al recibir el cucharín

        this.soil = [124, 92, 65];   // la tierra que se cierne: la del estrato en juego (la fija Game)
        this.sprites = {};           // zaranda dibujada en pixel art, una por ancho
    }

    // Altura normal de la zaranda, sobre la excavación (en 150 con 720 de
    // alto); de ahí se la sube o se la baja con la soga. En pantallas más
    // altas baja un poco, para que abajo no quede tanto subsuelo tapado.
    static yFor(gameHeight) {
        return 150 + Math.round((gameHeight - 720) / 4) * 2;
    }

    setSoil(rgb) {
        this.soil = rgb;
        this.sprites = {};
    }

    // Colores para la tierra que se cuela por la malla
    soilColors() {
        return [PixelArt.tono(this.soil, 0.75), PixelArt.tono(this.soil, 1), PixelArt.tono(this.soil, 1.25)];
    }

    update(dt, input) {
        if (this.hitTimer > 0) this.hitTimer -= dt;
        if (this.bump > 0) this.bump -= dt;

        if (this.powerTimer > 0) {
            this.powerTimer -= dt;
            this.width = 180;
            if (this.powerTimer <= 0) {
                this.width = this.baseWidth;
                this.x += 30;
            }
        } else {
            this.width = this.baseWidth;
        }

        const currentSpeed = (this.hitTimer > 0) ? this.speed * 0.4 : this.speed;

        if (input.pointerX !== null && input.pointerX !== undefined) {
            let target  = input.pointerX - this.width / 2;
            let maxStep = currentSpeed * dt;
            let delta   = target - this.x;
            if (delta > maxStep) delta = maxStep;
            else if (delta < -maxStep) delta = -maxStep;
            this.x += delta;
        } else {
            if (input.left)  this.x -= currentSpeed * dt;
            if (input.right) this.x += currentSpeed * dt;
        }

        if (this.x < this.minX) this.x = this.minX;
        if (this.x + this.width > this.maxX) this.x = this.maxX - this.width;

        // Altura con la soga. Si quedó más abajo de lo permitido (por ejemplo,
        // al pasar sobre bloques más altos) sube sola, de a poco
        let vy = 0;
        if (input.up) vy -= this.vSpeed;
        if (input.down) vy += this.vSpeed;
        this.y += vy * dt + input.takeDy();
        if (this.y < this.minY) this.y = this.minY;
        if (this.y > this.maxY) this.y = Math.max(this.maxY, this.y - 400 * dt);
    }

    // Zaranda en pixel art, como los estratos (cada píxel del dibujo = 2x2):
    // tabla de adelante clavada, malla de alambre vista desde arriba con un
    // montón de tierra encima y manijas a los costados. El marco ocupa las
    // filas 4-12 del dibujo (el montón sube hasta la -3); el canto de abajo
    // coincide con el de la zona de rebote.
    sieveSprite(width) {
        if (this.sprites[width]) return this.sprites[width];
        const w = Math.round(width / 2), ARRIBA = 4;
        const GW = w + 8, GH = 15 + ARRIBA;      // + manijas (3 por lado), montón y contorno
        const grid = new Array(GW * GH).fill(null);
        const put = (x, y, col) => {
            const gx = x + 4, gy = y + 1 + ARRIBA;
            if (gx >= 0 && gy >= 0 && gx < GW && gy < GH) grid[gy * GW + gx] = col;
        };
        const R = PixelArt.ruido;
        const MAD = ['#5e3a1e', '#7a4f2a', '#946236', '#b07a45', '#d9a466'];
        const ALAMBRE = '#aab1b7', ALAMBRE_OSC = '#7d858c', HUECO = '#241a13';

        // Postes del fondo y canto de atrás del marco
        for (let y = 4; y <= 7; y++) {
            put(0, y, y === 4 ? MAD[4] : MAD[3]); put(1, y, MAD[2]);
            put(w - 2, y, MAD[2]); put(w - 1, y, MAD[1]);
        }
        for (let x = 2; x < w - 2; x++) put(x, 4, MAD[0]);

        // Malla vista desde arriba
        for (let x = 2; x < w - 2; x++) {
            put(x, 5, x % 2 ? HUECO : ALAMBRE_OSC);
            put(x, 6, ALAMBRE);
            put(x, 7, x % 2 ? ALAMBRE_OSC : HUECO);
        }

        // Montón de tierra sobre la malla, como una media cúpula con la luz de
        // arriba a la izquierda; piedritas y un tiesto
        const cx = w * 0.52, hw = w * 0.3, ALTO = 8.5;
        const T = [0.58, 0.76, 0.95, 1.18].map(f => PixelArt.tono(this.soil, f));
        const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
        for (let x = Math.ceil(cx - hw); x <= Math.floor(cx + hw); x++) {
            const d = (x - cx) / hw;
            const cima = Math.round(ALTO * Math.pow(1 - d * d, 0.7) + (R(x >> 2, 1, 4) - 0.5) * 1.2);
            for (let k = 0; k < cima; k++) {
                const y = 7 - k, e = k / ALTO;
                const z = Math.sqrt(Math.max(0, 1 - d * d - e * e));
                const I = -0.5 * d + 0.6 * e + 0.62 * z + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.14;
                let col = T[I > 0.75 ? 3 : I > 0.45 ? 2 : I > 0.15 ? 1 : 0];
                if (k > 0 && k < cima - 1 && R(x, y, 9) < 0.05) col = R(x, y, 2) < 0.5 ? '#a39580' : '#7f7a72';
                put(x, y, col);
            }
        }
        const tx = Math.round(cx - hw * 0.35);
        put(tx, 4, '#a8694a'); put(tx + 1, 4, '#a8694a'); put(tx + 1, 5, '#8e5638');

        // Tabla de adelante: canto con luz, vetas, sombra abajo y clavos
        for (let x = 0; x < w; x++) {
            put(x, 8, MAD[4]);
            for (let y = 9; y <= 11; y++) put(x, y, R(Math.floor((x + y * 5) / 4), y, 5) < 0.25 ? MAD[2] : MAD[3]);
            put(x, 12, MAD[1]);
        }
        for (let y = 9; y <= 11; y++) { put(0, y, MAD[2]); put(w - 1, y, MAD[1]); }
        const clavos = w > 70 ? [2, Math.floor(w / 2), w - 3] : [2, w - 3];
        clavos.forEach(x => put(x, 10, '#d0d4d8'));

        // Manijas
        for (let k = 1; k <= 3; k++) {
            put(-k, 9, k === 3 ? MAD[2] : MAD[3]); put(-k, 10, MAD[1]);
            put(w - 1 + k, 9, k === 3 ? MAD[2] : MAD[3]); put(w - 1 + k, 10, MAD[1]);
        }

        const c = PixelArt.lienzo(grid, GW, GH, '#1e1510');
        this.sprites[width] = c;
        return c;
    }

    draw(ctx) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;

        // ── Flicker de daño ───────────────────────────────────────────────────
        if (this.hitTimer > 0 && Math.floor(this.hitTimer * 20) % 2 === 0) {
            ctx.globalAlpha = 0.6;
        }

        // En la grilla de 2 px; al recibir el cucharín se sacude un píxel
        const sprite = this.sieveSprite(this.width);
        const sx = Math.round(this.x / 2) * 2 - 8;
        const sy = Math.round(this.y / 2) * 2 + this.height - sprite.height * 2 + (this.bump > 0 ? 2 : 0);

        // Sogas: de cada manija a una argolla, y de ahí hacia arriba
        const ax = sx / 2, ay = sy / 2 + sprite.height;   // abajo a la izquierda, en píxeles del dibujo
        const anillo = [ax + Math.round(sprite.width / 2), ay - 31];
        this.rope(ctx, ax + 2, ay - 6, anillo[0] - 1, anillo[1] + 1);
        this.rope(ctx, ax + sprite.width - 3, ay - 6, anillo[0] + 1, anillo[1] + 1);
        this.rope(ctx, anillo[0], anillo[1] - 1, anillo[0], -1);
        [[0, -1, '#c4c8cc'], [-1, 0, '#9aa0a6'], [1, 0, '#6b7075'], [0, 1, '#5d646a']].forEach(([dx, dy, col]) => {
            ctx.fillStyle = col;
            ctx.fillRect((anillo[0] + dx) * 2, (anillo[1] + dy) * 2, 2, 2);
        });

        ctx.drawImage(sprite, sx, sy, sprite.width * 2, sprite.height * 2);

        // ── Power-up zaranda: el tiempo que le queda, en una barrita ──────────
        if (this.powerTimer > 0 && this.powerMaxTimer > 0) {
            const ratio = Math.max(0, this.powerTimer / this.powerMaxTimer);
            const barX = sx + 24, barY = sy - 6, barW = sprite.width * 2 - 48;
            ctx.fillStyle = '#1e1510';
            ctx.fillRect(barX - 2, barY - 2, barW + 4, 8);
            ctx.fillStyle = ratio < 0.25 ? '#c0392b' : '#e6a23c';
            ctx.fillRect(barX, barY, Math.round(barW * ratio / 2) * 2, 4);
        }

        ctx.globalAlpha = 1.0;
        ctx.restore();
    }

    // Soga de un píxel del dibujo (2x2 en el canvas), trenzada en dos tonos
    rope(ctx, x0, y0, x1, y1) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let i = 0; i <= n; i++) {
            const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
            ctx.fillStyle = (i >> 1) % 2 ? '#8f6e42' : '#c9a76d';
            ctx.fillRect(x * 2, y * 2, 2, 2);
        }
    }
}
