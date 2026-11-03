// La excavación: el perfil del recinto del sitio elegido (PerfilRecinto.js,
// PerfilKancha.js) que se va excavando estrato por estrato, de arriba hacia abajo. Cada nivel es un
// estrato dividido en bloques: filas que siguen sus contactos y columnas de
// cuadrícula entre los dos muros. En el campo de juego se ve solo el estrato
// que toca (apoyado abajo); lo ya excavado queda arriba como hueco en sombra
// y lo que sigue abajo, tapado. El perfil completo se ve en la columna del
// costado (drawColumn).
class Excavation {
    static P = 2;                     // cada píxel del dibujo = 2x2 en el canvas
    static ALTO = 900;                // filas del perfil (con roca madre de sobra abajo)
    static MURO = 26;                 // ancho de cada muro, en píxeles del dibujo
    static COLS = 14;
    static FRANJA_PISO = 36;          // franja de abajo donde asoma, tapado, el estrato siguiente
    // Recorrido del cucharín: de la zaranda a la mitad del estrato. Arranca
    // largo en el primero y se acorta un poquito en cada uno de los
    // siguientes (más difícil de a poco), sin importar cuán grueso sea.
    static RECORRIDO = 315;
    static RECORRIDO_PASO = 5;
    static HUECO_MIN = 130;           // el estrato nunca queda más cerca de la zaranda
    static OBJETOS_DURO = 0.12;       // fracción de piedra, adobe o madera para que el bloque pueda ser duro
    static DUROS_MAX = 0.15;          // como mucho esta parte de los bloques es dura

    constructor(gameWidth, gameHeight) {
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.camY = 0;
        this.bricks = [];
        this.flat = [];
        this.rows = 0;
        this.cols = Excavation.COLS;
        this.activeBricks = 0;
        this.totalBricks = 0;
        this.dirty = false;
        // límites horizontales del juego: la cara interna de cada muro
        this.minX = Excavation.MURO * Excavation.P;
        this.maxX = gameWidth - Excavation.MURO * Excavation.P;
    }

    // Arma un recinto nuevo del sitio (cada campaña excava uno distinto)
    generate(seed, perfil) {
        const p = perfil.pintarPerfil(seed, Excavation.ALTO);
        this.seed = seed;
        this.W = p.width;
        this.H = p.height;
        this.base = p.data;   // dibujo intacto
        this.kind = p.kind;   // 0 cielo, 1 sedimento, 2 objeto, 3 muro, 4 roca, 5 pasto
        this.L = p.limites;   // L[i] = techo del estrato i+1 en cada x
        this.ult = this.L.length - 1;   // último estrato que se excava; abajo, la base (roca o grava)
        this.cielo = p.cielo;
        this.fondo = p.fondo || null;   // el paisaje detrás de la superficie, si el sitio lo trae
        this.fondoAlto = p.fondoAlto || 0;
        this.canvas.width = this.W;
        this.canvas.height = this.H;
        this.view = this.ctx.createImageData(this.W, this.H);
        this.view.data.set(this.base);
        this.ctx.putImageData(this.view, 0, 0);
        this.dug = new Uint8Array(this.W * this.H); // 1 = ya excavado
        this.region = null;
        this.bricks = [];
        this.flat = [];
    }

    // Altura media del contacto L[i] (el techo del estrato i+1)
    meanOf(i) {
        const a = this.L[i];
        let s = 0;
        for (let x = 0; x < a.length; x++) s += a[x];
        return s / a.length;
    }

    // Cámara: el estrato queda a la distancia de la zaranda que le toca según
    // RECORRIDO (casi siempre sube y abajo queda subsuelo tapado), igual en
    // todos los aparatos; solo si no entra, apoya sobre la franja de abajo
    // de la pantalla. Para la base (roca madre o grava) se deja ver un poco de ella.
    cameraFor(estrato) {
        const P = Excavation.P, ult = this.ult;
        const base = estrato <= ult ? this.meanOf(estrato) : this.meanOf(ult) + 110;
        const apoyado = base * P - (this.gameHeight - Excavation.FRANJA_PISO);
        const techo = this.meanOf(Math.min(estrato, ult + 1) - 1) * P;
        const grosor = estrato <= ult ? (this.meanOf(estrato) - this.meanOf(estrato - 1)) * P : 0;
        const recorrido = Excavation.RECORRIDO - Excavation.RECORRIDO_PASO * (Math.min(estrato, ult) - 1);
        const hueco = Math.max(Excavation.HUECO_MIN, recorrido - grosor / 2);
        const cerca = techo - (Player.yFor(this.gameHeight) + 18 + hueco);
        return Math.max(apoyado, cerca);
    }

    // La pantalla cambió de alto: reubica la cámara y los bloques.
    // Devuelve cuánto se corrió la cámara, para mover lo demás igual.
    relayout(gameHeight) {
        this.gameHeight = gameHeight;
        if (!this.estrato) return 0;
        const delta = this.cameraFor(this.estrato) - this.camY;
        this.camY += delta;
        this.flat.forEach(b => { b.y -= delta; });
        return delta;
    }

    // Prepara el estrato como nivel: bloques, dureza y grietas
    loadStratum(estrato, level) {
        // que el estrato anterior quede dibujado como hueco antes de cambiar de región
        if (this.dirty && this.region) this.composite();
        const W = this.W, P = Excavation.P, M = Excavation.MURO, COLS = Excavation.COLS;
        const top = this.L[estrato - 1], bot = this.L[estrato];
        const rows = level.rows;
        const colW = (W - 2 * M) / COLS;
        this.estrato = estrato;
        this.tapadoDesde = estrato;   // lo que está debajo de este estrato no se ve
        this.camY = this.cameraFor(estrato);
        this.rows = rows;

        // filas del dibujo que ocupa el estrato (más el pasto de la superficie)
        let y0 = Infinity, y1 = 0;
        for (let x = 0; x < W; x++) {
            y0 = Math.min(y0, Math.floor(top[x]) - 8);
            y1 = Math.max(y1, Math.ceil(bot[x]) + 1);
        }
        y0 = Math.max(0, y0);
        this.region = [y0, y1];

        const N = (y1 - y0) * W, B = rows * COLS;
        const brickAt = new Int16Array(N).fill(-1);
        const total = new Int32Array(B), objetos = new Int32Array(B), muro = new Int32Array(B);
        const minY = new Int32Array(B).fill(1e9), maxY = new Int32Array(B).fill(-1);
        const rgb = new Float64Array(B * 3);

        for (let x = 0; x < W; x++) {
            const cRaw = Math.floor((x - M) / colW);
            const enMuro = cRaw < 0 || cRaw >= COLS;
            const c = Math.max(0, Math.min(COLS - 1, cRaw));
            const t = top[x], b = bot[x];
            for (let y = y0; y < y1; y++) {
                const k = this.kind[y * W + x];
                let r;
                if (k === 5) {
                    // pasto: se va con la primera fila
                    if (enMuro || y < t - 8 || y >= t) continue;
                    r = 0;
                } else {
                    if (k === 0 || k === 4 || y < Math.ceil(t) || y >= Math.ceil(b)) continue;
                    if (enMuro && k === 3) continue;  // los muros del recinto quedan en pie
                    r = Math.min(rows - 1, Math.max(0, Math.floor((y - t) / (b - t) * rows)));
                }
                const bi = r * COLS + c;
                brickAt[(y - y0) * W + x] = bi;
                total[bi]++;
                if (k === 2) objetos[bi]++;
                if (k === 3) muro[bi]++;   // construcción anterior dentro del recinto
                if (y < minY[bi]) minY[bi] = y;
                if (y > maxY[bi]) maxY[bi] = y;
                const o = (y * W + x) * 4;
                rgb[bi * 3] += this.base[o]; rgb[bi * 3 + 1] += this.base[o + 1]; rgb[bi * 3 + 2] += this.base[o + 2];
            }
        }

        // Bloques duros: los que tienen más piedras, adobes o madera, pero solo
        // en la mitad de arriba del estrato (abajo, lejos de la zaranda, todo
        // sale de un golpe), como mucho DUROS_MAX de los bloques y nunca dos
        // pegados, así quedan salteados
        const duro = new Uint8Array(B), arriba = Math.ceil(rows / 2);
        let cupo = Math.round(Array.from(total).filter(n => n > 0).length * Excavation.DUROS_MAX);
        const candidatos = [];
        for (let bi = 0; bi < arriba * COLS; bi++) {
            const f = total[bi] ? (objetos[bi] + muro[bi]) / total[bi] : 0;
            if (f > Excavation.OBJETOS_DURO) candidatos.push([f, bi]);
        }
        candidatos.sort((a, b) => b[0] - a[0]);
        for (const [, bi] of candidatos) {
            if (cupo <= 0) break;
            const r = Math.floor(bi / COLS), c = bi % COLS;
            const pegado = (c > 0 && duro[bi - 1]) || (c < COLS - 1 && duro[bi + 1]) ||
                           (r > 0 && duro[bi - COLS]) || (r < rows - 1 && duro[bi + COLS]);
            if (pegado) continue;
            duro[bi] = 1;
            cupo--;
        }

        this.bricks = [];
        this.flat = [];
        this.activeBricks = 0;
        for (let r = 0; r < rows; r++) {
            this.bricks[r] = [];
            for (let c = 0; c < COLS; c++) {
                const bi = r * COLS + c, n = total[bi];
                const hp = duro[bi] ? level.hardHp : level.baseHp;
                const hex = v => Math.round(v / Math.max(1, n)).toString(16).padStart(2, '0');
                const brick = {
                    status: n ? 1 : 0, hp, maxHp: hp, r, c,
                    isHard: hp > level.baseHp,
                    x: (M + c * colW) * P, width: colW * P,
                    y: minY[bi] * P - this.camY, height: Math.max(8, (maxY[bi] + 1 - minY[bi]) * P),
                    color: '#' + hex(rgb[bi * 3]) + hex(rgb[bi * 3 + 1]) + hex(rgb[bi * 3 + 2]),
                };
                if (n) this.activeBricks++;
                this.bricks[r][c] = brick;
                this.flat[bi] = brick;
            }
        }
        this.totalBricks = this.activeBricks;
        this.brickAt = brickAt;

        // Grietas que aparecen con cada golpe en los bloques duros
        const rnd = this.rng(this.seed * 31 + estrato);
        const crackAt = new Uint8Array(N);
        this.flat.forEach((brick, bi) => {
            for (let k = 1; k < brick.maxHp; k++) {
                let x = Math.floor(M + brick.c * colW + 2 + rnd() * (colW - 4));
                let y = minY[bi] - y0;
                const len = (maxY[bi] - minY[bi]) * (0.55 + rnd() * 0.4);
                for (let s = 0; s < len; s++) {
                    const j = y * W + x;
                    if (j >= 0 && j < N && brickAt[j] === bi && !crackAt[j]) crackAt[j] = k;
                    y++;
                    const step = rnd();
                    if (step < 0.3) x--; else if (step > 0.7) x++;
                }
            }
        });
        this.crackAt = crackAt;
        this.dirty = true;
        return this.bricks;
    }

    rng(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    // Aplica un golpe al bloque. Devuelve true si quedó excavado.
    damage(b) {
        b.hp--;
        this.dirty = true;
        if (b.hp <= 0 && b.status === 1) {
            b.status = 0;
            this.activeBricks--;
            return true;
        }
        return false;
    }

    // Color medio de la tierra del estrato en juego, como [r, g, b]
    soilColor() {
        const s = [0, 0, 0];
        let n = 0;
        this.flat.forEach(b => {
            if (b.status !== 1) return;
            for (let k = 0; k < 3; k++) s[k] += parseInt(b.color.slice(1 + 2 * k, 3 + 2 * k), 16);
            n++;
        });
        return n ? s.map(v => v / n) : [124, 92, 65];
    }

    clearedFraction() {
        return this.totalBricks > 0 ? 1 - this.activeBricks / this.totalBricks : 0;
    }

    // y de pantalla del fondo donde rebota el cucharín: el techo del estrato de abajo
    floorY(xScreen) {
        const x = Math.max(0, Math.min(this.W - 1, Math.floor(xScreen / Excavation.P)));
        return this.L[this.estrato][x] * Excavation.P - this.camY;
    }

    // Rehace los píxeles del estrato en juego: huecos, grietas y bordes del corte
    composite() {
        const W = this.W, [y0, y1] = this.region, N = (y1 - y0) * W;
        const d = this.view.data, src = this.base, brickAt = this.brickAt, flat = this.flat, crackAt = this.crackAt;
        const gone = j => j >= 0 && j < N && brickAt[j] >= 0 && flat[brickAt[j]].status === 0;
        const solid = j => j >= 0 && j < N && (brickAt[j] >= 0 ? flat[brickAt[j]].status === 1 : this.kind[y0 * W + j] !== 0 && !this.isVoid(y0 * W + j));

        for (let j = 0; j < N; j++) {
            const bi = brickAt[j];
            if (bi < 0) continue;
            const g = y0 * W + j, o = g * 4, b = flat[bi];

            if (b.status === 0) {
                this.dug[g] = 1;
                if (this.kind[g] === 5) {
                    // donde había pasto queda el paisaje del fondo o, si no hay, el cielo
                    const y = Math.floor(g / W);
                    if (this.fondo && y < this.fondoAlto) {
                        d[o] = this.fondo[o]; d[o + 1] = this.fondo[o + 1]; d[o + 2] = this.fondo[o + 2];
                    } else {
                        const { arriba: a, abajo: b, alto } = this.cielo, t = Math.min(1, y / alto);
                        d[o] = a[0] + (b[0] - a[0]) * t; d[o + 1] = a[1] + (b[1] - a[1]) * t; d[o + 2] = a[2] + (b[2] - a[2]) * t;
                    }
                } else {
                    // el fondo de la excavación, en sombra: apenas se adivina el perfil
                    // de atrás, y más oscuro bajo lo que sigue arriba
                    let f = 0.14;
                    if (solid(j - W)) f = 0.06;
                    else if (solid(j - 2 * W)) f = 0.1;
                    d[o] = src[o] * f + 20; d[o + 1] = src[o + 1] * f + 15; d[o + 2] = src[o + 2] * f + 13;
                }
                continue;
            }

            let f = 1;
            const dmg = b.maxHp - b.hp;
            if (dmg > 0 && crackAt[j] && crackAt[j] <= dmg) f = 0.42;
            else if (dmg > 0 && crackAt[j - 1] && crackAt[j - 1] <= dmg) f = 1.15;
            else if (gone(j - 1) || gone(j + 1) || gone(j - W) || gone(j + W)) f = 0.78; // borde del corte
            d[o] = Math.min(255, src[o] * f); d[o + 1] = Math.min(255, src[o + 1] * f); d[o + 2] = Math.min(255, src[o + 2] * f);
        }
        this.ctx.putImageData(this.view, 0, 0, 0, y0, W, y1 - y0);
    }

    // ¿Ese píxel ya fue excavado en un nivel anterior?
    isVoid(g) {
        return this.dug[g] === 1;
    }

    draw(ctx) {
        if (this.dirty && this.region) {
            this.composite();
            this.dirty = false;
        }
        const P = Excavation.P;
        const sy = this.camY / P;
        // por encima del dibujo sigue el cielo
        if (sy < 0) {
            ctx.fillStyle = `rgb(${this.cielo.arriba.join(',')})`;
            ctx.fillRect(0, 0, this.gameWidth, Math.ceil(-sy * P) + 1);
        }
        const srcY = Math.max(0, sy);
        const dstY = (srcY - sy) * P;
        const h = Math.min(this.H - srcY, (this.gameHeight - dstY) / P);
        if (h <= 0) return;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.canvas, 0, srcY, this.W, h, 0, dstY, this.W * P, h * P);

        // Lo que sigue más abajo todavía no se excavó: queda tapado (se ve en la columna del costado)
        const t = this.tapadoDesde;
        if (t >= 1 && t <= this.ult) {
            ctx.fillStyle = 'rgba(14, 10, 8, 0.82)';
            ctx.beginPath();
            ctx.moveTo(0, this.gameHeight);
            for (let x = 0; x <= this.W; x += 2) {
                ctx.lineTo(x * P, this.L[t][Math.min(this.W - 1, x)] * P - this.camY);
            }
            ctx.lineTo(this.W * P, this.gameHeight);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    // Columna con el perfil completo, de la superficie a la roca madre: lo
    // excavado se ve en sombra y el estrato en juego, recuadrado.
    drawColumn(ctx, x, y, w, h, actual) {
        const L = this.L;
        const top = Math.max(0, Math.floor(Math.min(...L[0])) - 10);
        const ult = this.ult;
        const bottom = Math.min(this.H, Math.ceil(this.meanOf(ult)) + 60);
        const range = bottom - top;
        let s = h / range, cropW = w / s;
        if (cropW > this.W) { cropW = this.W; s = w / cropW; }
        const dh = range * s, dy = y + (h - dh) / 2;
        const cw = Math.max(1, Math.floor(cropW));
        const toY = v => dy + (v - top) * s;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.canvas, 0, top, cropW, range, x, dy, w, dh);

        // número de cada estrato, al costado derecho
        ctx.font = 'bold 12px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let e = 1; e <= ult + 1; e++) {
            const a = toY(this.meanOf(e - 1)), b = e <= ult ? toY(this.meanOf(e)) : dy + dh;
            const cy = (a + b) / 2, esActual = e === actual;
            ctx.fillStyle = esActual ? '#ffcc99' : 'rgba(10, 7, 5, 0.75)';
            ctx.fillRect(x + w - 20, cy - 9, 18, 18);
            ctx.fillStyle = esActual ? '#2a1a10' : '#d8c4a8';
            ctx.fillText(String(e), x + w - 11, cy + 1);
        }

        // recuadro del estrato en juego, siguiendo sus contactos
        if (actual >= 1 && actual <= ult) {
            let a = Infinity, b = -Infinity;
            for (let i = 0; i < cw; i++) { a = Math.min(a, L[actual - 1][i]); b = Math.max(b, L[actual][i]); }
            ctx.strokeStyle = '#ffcc99';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, toY(a) - 1, w - 2, (b - a) * s + 2);
        }
        ctx.restore();
    }
}
