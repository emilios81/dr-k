class Drop {
    static S = 20;            // cuadro de cada dibujo, en píxeles del dibujo (se ve al doble)
    static VUELTAS = 8;       // cuadros de la vuelta de los hallazgos
    static CONTORNO = '#1e1510';
    static BRILLO = '#f6d55c';
    static cache = {};

    constructor(x, y, type, charInfo = null) {
        this.x = x;
        this.y = y;
        this.width = 16;   // Hitbox lógico (sin cambios)
        this.height = 16;
        this.type = type;
        this.charInfo = charInfo;

        this.speed = 120 + Math.random() * 60;
        // las letras suben un poco más despacio, para que se puedan agarrar;
        // las doradas, igual más rápido que el resto
        if (this.type === 'letter_normal') this.speed *= 0.85;
        if (this.type === 'letter_gold') this.speed *= 1.4;

        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 1.5);
        this.bobPhase = Math.random() * Math.PI * 2;

        this.isPowerup = false;

        switch (type) {
            case 'ceramica': this.color = '#c85a17'; this.value = 50; this.good = true; break;
            case 'punta':    this.color = '#202020'; this.value = 100; this.good = true; break;
            case 'hueso':    this.color = '#e3dac9'; this.value = 30; this.good = true; break;
            case 'inca':     this.color = '#a8432a'; this.value = 60; this.good = true; break;
            case 'maiz':     this.color = '#dca638'; this.value = 40; this.good = true; break;
            case 'terron':   this.color = '#5c4033'; this.penalty = 50; this.good = false; break;
            case 'piedra':   this.color = '#6b7074'; this.penalty = 100; this.good = false; break;

            case 'pw_zaranda':
            case 'pw_multi':
            case 'pw_triple':
            case 'pw_vida':    this.isPowerup = true; break;

            case 'letter_normal': this.color = '#e29578'; this.value = 50; this.good = true; break;
            case 'letter_gold':   this.color = '#f1c40f'; this.value = 250; this.good = true; break;
        }
    }

    // Los hallazgos suben hacia la zaranda, como la tierra que se saca en
    // baldes, dando vueltas; las letras y los poderes suben flotando
    update(dt) {
        this.y -= this.speed * dt;
        this.bobPhase += dt * 4;
        if (Drop.HALLAZGOS[this.type]) this.rotation += this.rotSpeed * dt;
    }

    draw(ctx) {
        const S = Drop.S;
        let dib, dy = 0;
        if (Drop.HALLAZGOS[this.type]) {
            const n = Drop.VUELTAS;
            const k = ((Math.round(this.rotation / (Math.PI * 2) * n) % n) + n) % n;
            dib = Drop.dibujo(this.type + k, () => Drop.dibujar(Drop.HALLAZGOS[this.type], k / n * Math.PI * 2));
        } else if (this.type === 'letter_normal' || this.type === 'letter_gold') {
            const oro = this.type === 'letter_gold', ch = this.charInfo ? this.charInfo.char : '';
            dib = Drop.dibujo(this.type + ch, () => Drop.letra(ch, oro), oro);
            dy = Math.round(Math.sin(this.bobPhase)) * 2;
        } else if (this.type === 'pw_multi' || this.type === 'pw_triple') {
            dib = Drop.dibujo(this.type, () => Drop.herramientas(this.type === 'pw_multi' ? 2 : 3), true);
            dy = Math.round(Math.sin(this.bobPhase)) * 2;
        } else if (Drop.PODERES[this.type]) {
            dib = Drop.dibujo(this.type, () => Drop.mapa(Drop.PODERES[this.type]), true);
            dy = Math.round(Math.sin(this.bobPhase)) * 2;
        } else {
            return;
        }

        // en la grilla de 2 px, como los estratos
        const x = Math.round((this.x + this.width / 2) / 2) * 2 - S;
        const y = Math.round((this.y + this.height / 2) / 2) * 2 - S + dy;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (dib.aura) {
            // lo especial titila
            ctx.globalAlpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(this.bobPhase * 2));
            ctx.drawImage(dib.aura, x, y, S * 2, S * 2);
            ctx.globalAlpha = 1;
        }
        ctx.drawImage(dib.img, x, y, S * 2, S * 2);
        ctx.restore();
    }

    // ── Dibujos en pixel art ────────────────────────────────────────────────
    // Se arman una vez (por tipo, letra y cuadro de la vuelta) y se guardan.
    static dibujo(clave, armar, conAura = false) {
        if (Drop.cache[clave]) return Drop.cache[clave];
        const S = Drop.S, grid = armar();
        return Drop.cache[clave] = {
            img: PixelArt.lienzo(grid, S, S, Drop.CONTORNO, { dx: 1, dy: 1, alfa: 0.3 }),
            aura: conAura ? PixelArt.aura(grid, S, S, Drop.BRILLO) : null,
        };
    }

    // Una pieza definida como forma(u, v) → material, girada `a`. La luz
    // viene siempre de arriba a la izquierda (PixelArt.relieve); los dibujos
    // de la superficie (deco) se calculan sobre la pieza, así giran con ella.
    static dibujar(def, a) {
        const S = Drop.S, { tipo, uv } = PixelArt.rasterizar(S, a, def.forma);
        const grid = new Array(S * S).fill(null);
        for (let j = 0; j < S; j++) {
            for (let i = 0; i < S; i++) {
                const mat = tipo[j * S + i];
                if (mat === null) continue;
                const t = PixelArt.relieve(tipo, S, i, j), [u, v] = uv(i, j);
                const tonos = (def.materiales && def.materiales[mat]) || def.tonos;
                grid[j * S + i] = (def.deco && def.deco(u, v, t, mat)) || tonos[t];
            }
        }
        return grid;
    }

    // Tonos de cada pieza: sombra, media sombra, medio y luz
    static HALLAZGOS = {
        // Tiesto pintado: zigzag y banda en negro
        ceramica: {
            tonos: ['#7a3418', '#a64a22', '#c8622e', '#e08a55'],
            forma: (u, v) => PixelArt.enPoligono([[-6.5, -4.5], [5, -6.2], [7, 2.5], [-1, 6.5], [-6, 2]], u, v),
            deco: (u, v, t) => {
                if (t === 0 || t === 3) return null;   // el canto queda limpio
                const zig = -1.6 + (Math.abs((((u + 8) % 4) + 4) % 4 - 2) - 1) * 1.3;
                return Math.abs(v - zig) < 0.6 || Math.abs(v - 2.4) < 0.5 ? '#2a1a12' : null;
            },
        },
        // Tiesto inca: engobe rojo pulido con una franja crema de rombos negros
        inca: {
            tonos: ['#6e2414', '#9a3a20', '#bf5232', '#dc7a52'],
            forma: (u, v) => PixelArt.enPoligono([[-7, -3.5], [-2, -6.5], [6.5, -4.5], [6, 4], [0, 6.5], [-6.5, 3]], u, v),
            deco: (u, v, t) => {
                if (t === 0 || t === 3) return null;   // el canto queda limpio
                const b = Math.abs(v - 0.3);
                if (b >= 2.4 && b < 3.2) return '#2a1410';
                if (b >= 2.4) return null;
                // rombos: r = 1 es el contorno, r = 0 el centro (con su punto)
                const r = Math.abs((((u + 3) % 6) + 6) % 6 - 3) / 3 + b / 2.4;
                return (r > 0.68 && r < 1.05) || r < 0.25 ? '#2a1410' : '#ead6b0';
            },
        },
        // Mazorca de maíz: granos en hileras y la chala en la punta
        maiz: {
            tonos: ['#7a4e14', '#b07a22', '#dca638', '#f4d878'],
            materiales: { chala: ['#5e5a2e', '#8a8444', '#b4ac62', '#d8d090'] },
            forma: (u, v) => {
                if ((u / 6.4) ** 2 + (v / 3.3) ** 2 <= 1 && u < 4.5) return 'grano';
                if (u >= 3.5 && u <= 8.5 && Math.abs(v) <= (8.5 - u) * 0.55 + 0.4) return 'chala';
                return null;
            },
            deco: (u, v, t, mat) => mat === 'grano' && t === 2 &&
                (Math.floor(u + 20) + Math.floor(v * 1.2 + 20)) % 2 ? '#b8821e' : null,
        },
        // Hueso largo, con las dos cabezas
        hueso: {
            tonos: ['#8c7b60', '#b8a888', '#e3d6b8', '#f8f2e2'],
            forma: (u, v) => {
                if (Math.abs(u) <= 4.6 && Math.abs(v) <= 1.3) return true;
                return [[-5.2, -1.5], [-5.2, 1.5], [5.2, -1.5], [5.2, 1.5]].some(([a, b]) => (u - a) ** 2 + (v - b) ** 2 <= 3.3);
            },
        },
        // Punta triangular de obsidiana, de base escotada, con las marcas del retoque
        punta: {
            tonos: ['#0b0b0f', '#1d1e24', '#2b2e37', '#8a96ab'],
            forma: (u, v) => PixelArt.enPoligono([[0, -7.5], [4.5, 6.5], [0, 3.6], [-4.5, 6.5]], u, v),
            deco: (u, v, t) => t === 2 && Math.floor((v + Math.abs(u) * 1.5 + 20) / 1.5) % 2 ? '#454c5e' : null,
        },
        // Terrón con una raicita y poros
        terron: {
            tonos: ['#2e2118', '#4a3527', '#6b4c36', '#8c6a4c'],
            materiales: { raiz: ['#6e5a3a', '#8f7a55', '#c9b48a', '#e6d6ae'] },
            forma: (u, v) => {
                if (v > -7.5 && v < -1 && Math.abs(u - 1 - Math.sin(v * 1.3) * 0.8) < 0.5) return 'raiz';
                const r = Math.hypot(u, v), a = Math.atan2(v, u);
                return r <= 5.6 + Math.sin(3 * a + 1) * 1.1 + Math.sin(5 * a + 2) * 0.6 ? 'tierra' : null;
            },
            deco: (u, v, t, mat) => {
                if (mat !== 'tierra' || t !== 2) return null;
                const r = PixelArt.ruido(Math.floor(u * 1.2) + 20, Math.floor(v * 1.2) + 20, 11);
                return r < 0.12 ? '#2e2118' : r < 0.17 ? '#8d9296' : null;
            },
        },
        // Piedra angulosa: cara de arriba con luz, cara derecha en sombra y pintitas
        piedra: {
            tonos: ['#3f4348', '#61666b', '#868b90', '#b4b9bd'],
            forma: (u, v) => PixelArt.enPoligono([[-7, 1], [-4, -4.5], [2, -5.5], [6.5, -2], [6, 3.5], [0, 5.5], [-5, 4.5]], u, v),
            deco: (u, v, t) => {
                if (t === 0 || t === 3) return null;
                if (v < -1 + u * 0.1) return '#b4b9bd';
                if (u > 2 + v * 0.3) return '#6f7478';
                return t === 2 && PixelArt.ruido(Math.floor(u * 1.3) + 30, Math.floor(v * 1.3) + 30, 13) < 0.08 ? '#a3a8ac' : null;
            },
        },
    };

    // Íconos de los poderes dibujados a mano: cada letra es un color, o una
    // paleta de 4 tonos que se sombrea con la luz de arriba a la izquierda
    static PODERES = {
        // Zaranda con una flecha de dos puntas: se agranda
        pw_zaranda: {
            filas: [
                '..y..........y..',
                '.wwwwwwwwwwwwww.',
                '..y..........y..',
                '................',
                '.......hh.......',
                '......hmmmd.....',
                '.....hmmmmdd....',
                '.rrrrhmmmmmddrr.',
                '.aoaoaoaoaoaoao.',
                '.LLLLLLLLLLLLLL.',
                'BBnBBBBgggBBBnBB',
                'DBBggBBBBBBggBBD',
                '.DDDDDDDDDDDDDD.',
            ],
            colores: {
                y: '#e0b84a', w: '#fff0b0',
                h: '#a07a56', m: '#7c5c41', d: '#5b4332',
                r: '#5e3a1e', a: '#aab1b7', o: '#241a13',
                L: '#d9a466', B: '#b07a45', g: '#946236', D: '#7a4f2a', n: '#d0d4d8',
            },
        },
        // Carbón para fechar: trozo de carbón vegetal, con las grietas en
        // cubitos y el brillo plateado de sus caras, y su etiqueta de muestra C14
        pw_vida: {
            filas: [
                '....KKKKKK......',
                '..KKKsKcKKKK....',
                '.KKsKKKcKKKsK...',
                '.KKKKKcKKKKKKK..',
                '.KcccccKKKKsKK..',
                '..KKKsKcKKKKKK..',
                '..KKKKKKcccKK...',
                '...KKKKKKKKKK...',
                '..LLLLLLLLLLLLL.',
                '..LtttLLtLLtLtL.',
                '..LtLLLttLLtLtL.',
                '..LtLLLLtLLtttL.',
                '..LtLLLLtLLLLtL.',
                '..LtttLtttLLLtL.',
                '..LLLLLLLLLLLLL.',
            ],
            colores: {
                c: '#060606', s: '#8e8a84', t: '#2a1a12',
                K: ['#0d0c0c', '#1f1d1c', '#33302e', '#77736e'],
                L: ['#a89c80', '#d0c6ac', '#ebe3cf', '#fffaf0'],
            },
        },
    };

    static mapa({ filas, colores }) {
        const S = Drop.S, ancho = filas[0].length;
        const x0 = Math.floor((S - ancho) / 2), y0 = Math.floor((S - filas.length) / 2);
        const tipo = new Array(S * S).fill(null);
        filas.forEach((f, y) => [...f].forEach((ch, x) => { if (ch !== '.') tipo[(y0 + y) * S + x0 + x] = ch; }));
        return tipo.map((ch, i) => {
            if (ch === null) return null;
            const col = colores[ch];
            return Array.isArray(col) ? col[PixelArt.relieve(tipo, S, i % S, Math.floor(i / S))] : col;
        });
    }

    // Poderes de herramientas extra: al cucharín se suma la espátula (y la
    // brocha, en el triple). Van parejas, en diagonal.
    static herramientas(n) {
        const S = Drop.S, grid = new Array(S * S).fill(null);
        const tools = n === 2 ? ['cucharin', 'espatula'] : ['cucharin', 'espatula', 'brocha'];
        const centros = n === 2 ? [[7.5, 12.5], [12.5, 7.5]] : [[6.5, 13.5], [10, 10], [13.5, 6.5]];
        centros.forEach(([cx, cy], k) => {
            const g = Ball.toolGrid(tools[k], S, Math.PI / 4, n === 2 ? 0.62 : 0.6, cx, cy);
            const nuevo = j => j >= 0 && j < S * S && g[j] !== null;
            // el de adelante se separa del de atrás con una línea oscura
            for (let i = 0; i < S * S; i++) {
                if (g[i] !== null || grid[i] === null) continue;
                const x = i % S;
                if ((x > 0 && nuevo(i - 1)) || (x < S - 1 && nuevo(i + 1)) || nuevo(i - S) || nuevo(i + S)) grid[i] = Drop.CONTORNO;
            }
            g.forEach((col, i) => { if (col !== null) grid[i] = col; });
        });
        return grid;
    }

    // Letras de 5x7 para las palabras y los secretos de los sitios
    static GLIFOS = {
        P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
        U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
        E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
        B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
        L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
        O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
        R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
        D: ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
        I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
        Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
        A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
        S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
        H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
        N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
        C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
        M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
        V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
        T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    };

    // Ficha de barro cocido (u oro) con la letra grabada
    static letra(ch, oro) {
        const S = Drop.S, L = 15, x0 = 3, y0 = 3;
        const T = oro ? ['#7a4e0e', '#b07d18', '#e0aa28', '#fbe27a'] : ['#7e3f22', '#a95a33', '#cf7b4b', '#eea877'];
        const tinta = oro ? '#5d2a0c' : '#3a1a10';
        const tipo = new Array(S * S).fill(null);
        for (let y = 0; y < L; y++) {
            for (let x = 0; x < L; x++) {
                const esquina = (x === 0 || x === L - 1) && (y === 0 || y === L - 1);
                if (!esquina) tipo[(y0 + y) * S + x0 + x] = true;
            }
        }
        const grid = tipo.map((m, i) => m === null ? null : T[PixelArt.relieve(tipo, S, i % S, Math.floor(i / S))]);
        const glifo = Drop.GLIFOS[ch];
        if (!glifo) return grid;
        const gx = x0 + 5, gy = y0 + 4;
        const en = (x, y) => y >= 0 && y < 7 && x >= 0 && x < 5 && glifo[y][x] === '1';
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 6; x++) {
                const i = (gy + y) * S + gx + x;
                if (en(x, y)) grid[i] = tinta;
                else if (en(x - 1, y - 1)) grid[i] = T[3];   // la luz entra en el surco grabado
            }
        }
        return grid;
    }
}
