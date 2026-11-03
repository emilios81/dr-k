// Perfil de excavación de un recinto de kancha inca en El Shincal de
// Quimivil (Londres, Belén, Catamarca), en pixel art generado por código
// con las herramientas de Pincel.js. El recinto queda entre sus dos muros
// de pirca; de fondo, el monte de algarrobos, uno de los cerros ceremoniales
// con su escalinata y una kallanka, con el sol de la tarde. Funciona en el navegador
// y en Node (para exportar la imagen con exportar-perfil.js).
//
// Estratos:
//   1 suelo superficial con monte          5 relleno de nivelación inca
//     (hojarasca, raíces de algarrobo)       (cestadas de tierra y cantos)
//   2 derrumbe de muros (granito, cantos)  6 ocupación local anterior
//   3 techo caído (paja quemada, ceniza,     (cerámica Belén, urna con puco)
//     tirantes)                            7 gravas del cono aluvial
//   4 piso de ocupación inca (fogón, aríbalo, molino, marlos de maíz)
(function (root) {
    const Pincel = typeof require !== 'undefined' ? require('./Pincel.js') : root.Pincel;
    const { hash, noise, dither, tone, C, shade, mix, mod, CARBON } = Pincel;
    const W = 360, ALTO_DIBUJO = 640;

    // ── Paletas ──────────────────────────────────────────────────────────────
    const S1 = C('#4a3b31'), S2 = C('#8b7560'), S3 = C('#57524d'), S4 = C('#6b5240');
    const PISO = C('#b89d74'), S5 = C('#9c7a55'), S6 = C('#5c3a2c'), ARENA = C('#a39580');
    const HOJAS = ['#8a5a2e', '#6b6a3a', '#a08050', '#5e4a2c', '#b0703a'].map(C);
    const GRANITO = ['#a89a8e', '#b6a597', '#9a8d84', '#c0b0a0', '#8f857e', '#ab9c8c'].map(C);
    const CANTOS = ['#8a8c8e', '#6f7275', '#a4a29c', '#7d6f66', '#b9b2a6', '#5f5a58', '#c9c3b8', '#9a7f70'].map(C);
    const CIMIENTO = ['#7f7b76', '#8c857c', '#706c68', '#958d82', '#7a746c'].map(C);
    const BARRO = C('#5a4636'), BARRO_CIMIENTO = C('#45382e');
    const PAJA = ['#c9a95a', '#b8964a', '#d8bc6c'].map(C);
    const ROJO_INCA = ['#a8432a', '#b5502f', '#963a24'];
    const ROJO_BELEN = ['#9a4a2c', '#a8553a', '#8c4228'];
    const NEGRO = [32, 18, 12];
    const MONTE = ['#3f4c22', '#4f5e2a', '#5f6e32', '#72803c'].map(C);     // copas de algarrobo
    const JARILLA = ['#6f7d2c', '#8a9a3a', '#a4b048', '#b8c060'].map(C);
    const PASTO_SECO = ['#b8a060', '#9c8a4a', '#c8b478', '#8a7a40'].map(C);
    const CIELO = { arriba: [92, 138, 198], abajo: [238, 210, 160], alto: 44 };
    const FONDO = 60; // filas del paisaje de fondo (lo que se ve detrás de la superficie)

    // alto: filas del dibujo (más que ALTO_DIBUJO = más grava abajo)
    function pintarPerfil(seed = 7, alto = ALTO_DIBUJO) {
        const H = alto;
        const p = Pincel.crear(W, H, seed);
        const { img, kind, rnd, R, RI, pick, set, get, kindAt, dentroImg, wave } = p;
        const { filo, figura, piedra, viga, tiesto, cueva, aparejo } = p;
        const elegir = (arr, h) => arr[Math.min(arr.length - 1, Math.floor(h * arr.length))];

        // ── Límites entre estratos (L[i] = techo del estrato i+1) ──
        const L = [
            wave(48, 2, 4),      // superficie
            wave(102, 3, 5),     // 1 → 2
            wave(190, 6, 10),    // 2 → 3: el derrumbe cayó sobre el techo, irregular
            wave(246, 3, 4),     // 3 → 4
            wave(302, 0.6),      // 4 → 5: base del piso, plana (los incas nivelaron)
            wave(412, 3, 6),     // 5 → 6
            wave(522, 5, 14),    // 6 → 7: techo de las gravas
        ];
        const estrato = (x, y) => { for (let i = 6; i >= 0; i--) if (y >= L[i][x]) return i + 1; return 0; };
        const pisoY = x => L[4][x] - 9;                                   // superficie del piso inca
        const localY = x => L[5][x] + 50 + Math.sin(x * 0.03 + 1) * 2;    // superficie de la ocupación local

        // ── Estrato 5: las cestadas del relleno (lentes de tierra volcada) ──
        const cestadas = [];
        for (let k = 0; k < 46; k++) {
            const x = R(-20, W + 20), f = R(0, 1), rx = R(18, 46), ry = R(2.5, 6), ang = R(-0.3, 0.3);
            const xc = Math.max(0, Math.min(W - 1, Math.round(x)));
            cestadas.push({
                x, y: L[4][xc] + 4 + f * (L[5][xc] - L[4][xc] - 8), rx, ry, c: Math.cos(ang), s: Math.sin(ang),
                col: pick([shade(S5, 2), shade(S5, -1.8), mix(S5, [128, 100, 76], 0.7), C('#b89266'), mix(S5, S6, 0.5)]),
            });
        }

        function sedimento(x, y, s) {
            const h = hash(x, y, seed + s * 31);
            switch (s) {
                case 1: {
                    if (y - L[0][x] < 3 && h < 0.45) return elegir(HOJAS, hash(x, y, 13));   // hojarasca
                    if (h < 0.05) return shade(S1, -3);
                    if (h > 0.985) return shade(S1, 2.5);
                    return shade(S1, tone(noise(x, y, 5, 11) * 0.6 + noise(x, y, 2, 12) * 0.4, x, y));
                }
                case 2: {
                    if (h < 0.05) return shade(elegir(CANTOS, hash(x, y, 23)), -0.5);       // gravilla
                    let k = tone(noise(x, y, 7, 21) * 0.6 + noise(x, y, 2, 22) * 0.4, x, y) * 1.1;
                    if (h > 0.985) k = 2;
                    return shade(S2, k);
                }
                case 3: {
                    if (h < 0.09) return h < 0.045 ? [24, 21, 19] : [40, 35, 31];         // carbón
                    if (h < 0.10) return [168, 92, 52];                                    // barro quemado
                    let c = shade(S3, tone(noise(x, y, 4, 31), x, y) * 1.4);
                    const ce = noise(x, y, 10, 32);
                    if (ce > 0.66) c = mix(c, [176, 170, 160], 0.5);                       // ceniza blanca
                    else if (ce < 0.25) c = mix(c, [30, 26, 23], 0.45);                    // tierra quemada
                    return c;
                }
                case 4: {
                    const d = L[4][x] - y;                                                // altura sobre la base del piso
                    if (d <= 9) {
                        if (d > 8) return shade(PISO, 1.6);                               // superficie pisada
                        let k = tone(noise(x, y, 16, 41) * 0.5 + 0.25, x, y);
                        if (Math.floor(d / 2) % 2 === 1) k -= 0.7;                        // capas del apisonado
                        if (h < 0.01) k = -2.5;
                        return shade(PISO, k);
                    }
                    if (h < 0.035) return [34, 28, 24];
                    let c = shade(S4, tone(noise(x, y, 5, 42) * 0.7 + noise(x, y, 1.6, 43) * 0.3, x, y));
                    if (noise(x * 0.6, y * 1.8, 9, 44) > 0.72) c = mix(c, [150, 144, 134], 0.4); // lentes de ceniza
                    return c;
                }
                case 5: {
                    let base = S5;
                    for (const c of cestadas) {
                        const dx = x - c.x, dy = y - c.y, u = dx * c.c + dy * c.s, v = -dx * c.s + dy * c.c;
                        if ((u / c.rx) ** 2 + (v / c.ry) ** 2 <= 1) base = c.col;
                    }
                    if (h < 0.05) return shade(elegir(CANTOS, hash(x, y, 55)), -0.5);
                    return shade(base, tone(noise(x, y, 4, 51) * 0.6 + noise(x, y, 1.5, 52) * 0.4, x, y));
                }
                case 6: {
                    if (h < 0.04) return [30, 22, 18];
                    if (h > 0.99) return [176, 96, 62];                                    // pintitas de barro cocido
                    let c = shade(S6, tone(noise(x, y, 6, 61) * 0.7 + noise(x, y, 1.5, 62) * 0.3, x, y) * 1.1);
                    const d = y - localY(x);
                    if (d >= 0 && d < 2) c = shade(c, d < 1 ? 1.2 : -1.6);                // piso de esa ocupación
                    return c;
                }
            }
            return S2;
        }

        // ── Estrato 7: gravas del cono aluvial (cantos rodados en arena gruesa) ──
        const G = 13, celdas = new Map();
        const celda = (gx, gy) => {
            const key = gx * 10000 + gy;
            let c = celdas.get(key);
            if (!c) {
                const grande = hash(gx, gy, seed + 73) < 0.12;
                const rx = grande ? 8 + hash(gx, gy, seed + 74) * 3 : 3.5 + hash(gx, gy, seed + 74) * 3.5;
                c = {
                    x: gx * G + G / 2 + (hash(gx, gy, seed + 71) - 0.5) * G * 0.7,
                    y: gy * G + G / 2 + (hash(gx, gy, seed + 72) - 0.5) * G * 0.7,
                    rx, ry: rx * (0.55 + hash(gx, gy, seed + 75) * 0.3),
                    col: elegir(CANTOS, hash(gx, gy, seed + 76)),
                    vacia: hash(gx, gy, seed + 77) < 0.15,
                };
                celdas.set(key, c);
            }
            return c;
        };
        function grava(x, y) {
            const gx = Math.floor(x / G), gy = Math.floor(y / G);
            let best = null, be = 2;
            for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
                const c = celda(gx + i, gy + j);
                if (c.vacia) continue;
                const e = ((x - c.x) / c.rx) ** 2 + ((y - c.y) / c.ry) ** 2;
                if (e < be) { be = e; best = c; }
            }
            if (best && be <= 1) {
                if (be > 0.78) return shade(best.col, -3.5);                             // contorno
                const dx = (x - best.x) / best.rx, dy = (y - best.y) / best.ry;
                let k = -(dx + dy) * 1.3 + tone(noise(x, y, 3, 79), x, y) * 0.5;
                if (dx + dy < -0.9) k += 1;                                              // brillo
                return shade(best.col, k);
            }
            let c = shade(ARENA, tone(noise(x, y, 2.5, 78), x, y) * 0.9);
            if (best && be < 1.35) c = shade(c, -1.6);                                    // sombra junto al canto
            if (hash(x, y, 80) < 0.06) c = shade(c, 2);
            return c;
        }

        // ── 1. El paisaje del fondo ──
        // cielo de la tarde con el sol (Inti) sobre el cerro de la izquierda
        const sol = { x: RI(64, 100), y: RI(7, 10) };
        for (let y = 0; y < FONDO; y++) {
            for (let x = 0; x < W; x++) {
                const t = Math.min(1, Math.floor((y / CIELO.alto + (dither(x, y) - 0.5) * 0.12) * 8) / 8);
                let c = mix(CIELO.arriba, CIELO.abajo, t);
                const ds = Math.hypot(x - sol.x, y - sol.y);
                if (ds < 4.2) c = [255, 246, 214];
                else if (ds < 8 + dither(x, y) * 4) c = mix(c, [255, 232, 170], 0.45);
                set(x, y, c, 0);
            }
        }
        for (let n = 0; n < 3; n++) {                                     // nubes largas, con luz de la tarde
            const cx = R(140, W - 20), cy = R(5, 15), parts = RI(3, 5);
            for (let q = 0; q < parts; q++) {
                const px = Math.round(cx + R(-18, 18)), py = Math.round(cy + R(-1.5, 1.5)), rx = R(7, 13), ry = R(1.8, 3);
                for (let dy = -Math.ceil(ry); dy <= ry; dy++) for (let dx = -Math.ceil(rx); dx <= rx; dx++) {
                    const x = px + dx, y = py + dy;
                    if ((dx / rx) ** 2 + (dy / ry) ** 2 > 1 || !dentroImg(x, y)) continue;
                    set(x, y, dy > ry * 0.3 ? [222, 186, 164] : [252, 238, 214]);
                }
            }
        }
        // sierra lejana, azulada
        const sierra = new Float32Array(W);
        for (let x = 0; x < W; x++) sierra[x] = 17 + noise(x, 0, 52, seed + 5) * 14 + noise(x, 0, 12, seed + 6) * 5;
        for (let x = 0; x < W; x++) {
            for (let y = Math.ceil(sierra[x]); y < FONDO; y++) {
                const d = y - sierra[x];
                set(x, y, d < 1.5 ? [176, 164, 190] : mix([138, 130, 162], [120, 116, 142], Math.min(1, d / 16)), 0);
            }
        }
        // el cerro ceremonial al costado de la plaza: aplanado arriba y con su escalinata
        {
            const cx = RI(62, 92), top = RI(21, 24);
            const arriba = RI(11, 15), ancho = RI(48, 58), pie = 50, sd = RI(1, 1e6), base = C('#8a7d5c');
            for (let y = top; y < FONDO; y++) {
                const half = arriba + (ancho - arriba) * Math.sqrt(Math.min(1, (y - top) / (pie - top)));
                for (let x = Math.round(cx - half); x <= cx + half; x++) {
                    if (!dentroImg(x, y)) continue;
                    const lado = (x - cx) / half;
                    let c = shade(base, -lado * 1.6 + tone(noise(x, y, 4, sd), x, y) * 0.6);
                    if (y === top) c = shade(base, 2.2);
                    else if (Math.abs(x - cx) < 1.5) c = y % 2 ? [204, 188, 146] : [116, 102, 76];   // escalinata
                    else if (hash(x, y, sd) < 0.07) c = shade(MONTE[1], -lado);                     // arbustos en la ladera
                    set(x, y, c, 0);
                }
            }
        }
        // llano de pasto seco al pie del cerro
        for (let x = 0; x < W; x++) {
            const y0 = Math.round(38 + noise(x, 0, 30, seed + 8) * 3);
            for (let y = y0; y < FONDO; y++) {
                set(x, y, shade(C('#a49564'), tone(noise(x, y, 3, 9), x, y) * 0.8 + (y === y0 ? 1.5 : 0)), 0);
            }
        }
        // algarrobos del monte: copa ancha y achatada sobre un tronco torcido
        function algarrobo(cx, pie, s) {
            const lejos = s < 0.8, alto = Math.round(8 * s), tronco = lejos ? [104, 92, 80] : [70, 52, 38];
            for (let j = 0; j < alto + 2; j++) {
                const x = cx + Math.round(Math.sin(j * 0.7) * 0.8);
                set(x, pie - j, tronco, 0);
                if (!lejos && j < alto / 2) set(x + 1, pie - j, shade(tronco, -1), 0);
            }
            const n = RI(3, 5), copaY = pie - alto;
            for (let k = 0; k < n; k++) {
                const ex = cx + R(-9, 9) * s, ey = copaY - R(0, 3) * s, rx = R(6, 10) * s, ry = R(3, 5) * s, sd = RI(1, 1e6);
                for (let dy = -Math.ceil(ry); dy <= ry; dy++) for (let dx = -Math.ceil(rx); dx <= rx; dx++) {
                    const x = Math.round(ex + dx), y = Math.round(ey + dy);
                    if ((dx / rx) ** 2 + (dy / ry) ** 2 > 1 || !dentroImg(x, y)) continue;
                    let c = elegir(MONTE, noise(x, y, 2.2, sd) * 0.6 + (dy < 0 ? 0.4 : 0));
                    if (dy > ry * 0.5) c = shade(c, -1.5);
                    if (lejos) c = mix(c, [150, 148, 150], 0.35);
                    set(x, y, c, 0);
                }
            }
        }
        // Kallanka a lo lejos, vista de frente: la cabecera de pirca de piedras
        // del lugar, más alta en el medio (el hastial donde apoyaba el techo a
        // dos aguas), con la puerta adintelada por la que se ve el interior y el
        // caminito que entra. cx: centro; yF: pie del muro.
        function kallanka(cx, ancho, yF) {
            const half = ancho / 2, BAJO = 8, ALTO = 15, sd = RI(1, 1e6);
            const PIEDRAS = ['#c8b49a', '#b8a088', '#d6c4aa', '#a8927c', '#bfae98', '#9c8a78'].map(C), HUECO = [92, 76, 62];
            const puerta = { x0: Math.round(cx) - 2, x1: Math.round(cx) + 2, alto: 10 };
            // alto del muro en cada x: sube parejo de las puntas hacia la puerta,
            // con el borde de arriba desparejo
            const alto = x => {
                const d = Math.abs(x - cx);
                if (d <= 4) return ALTO;
                const t = Math.min(1, (d - 4) / (half * 0.85 - 4));
                return Math.round(ALTO - (ALTO - BAJO) * t) - (hash(x, 3, sd) < 0.25 ? 1 : 0);
            };
            // hiladas de 2 px con piedras de largo desparejo y huecos oscuros entre ellas
            const junta = (x, f) => hash(x, f, sd) < 0.36 && hash(x - 1, f, sd) >= 0.36;
            for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
                const h = alto(x), lado = (x - cx) / half;       // el sol, de la izquierda
                for (let j = 0; j < h; j++) {
                    const y = yF - 1 - j, f = Math.floor(j / 2);
                    if (x >= puerta.x0 && x <= puerta.x1 && j < puerta.alto) {
                        let c;
                        if (j < 2) c = shade(C('#cbb894'), 0.5);                         // el camino que entra
                        else if (j < 7 && Math.abs(x - cx) <= 1) c = [214, 200, 160];     // la puerta del otro lado, al fondo
                        else c = shade(MONTE[0], j > 7 ? -1.2 : -0.4);                    // el monte que se ve detrás
                        set(x, y, c, 0);
                        continue;
                    }
                    if (j === puerta.alto && x >= puerta.x0 - 1 && x <= puerta.x1 + 1) {  // el dintel, una laja larga
                        set(x, y, shade(PIEDRAS[2], x === puerta.x1 + 1 ? -0.5 : 1), 0);
                        continue;
                    }
                    if (junta(x, f) || (j % 2 === 0 && hash(x, j, sd + 1) < 0.08)) { set(x, y, HUECO, 0); continue; }
                    let x0 = x;
                    while (x0 > x - 6 && !junta(x0, f)) x0--;
                    set(x, y, shade(elegir(PIEDRAS, hash(x0, f + 5, sd)), (j % 2 === 1 ? 0.8 : -0.4) - lado * 0.6), 0);
                }
            }
            // sombra al pie del muro y el caminito que llega a la puerta
            for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) set(x, yF, shade(get(x, yF), -1.6), 0);
            for (let y = yF; y < FONDO; y++) {
                const a = 2.5 + (y - yF) * 0.8;
                for (let x = Math.round(cx - a); x <= Math.round(cx + a); x++) set(x, y, shade(C('#cbb894'), tone(noise(x, y, 2, sd), x, y) * 0.5), 0);
            }
        }
        // Cardón: columna con costillas y dos brazos que suben
        function cardon(cx, pie, alto) {
            const V = ['#3c5528', '#56753a', '#729450'].map(C);
            const columna = (x, y0, y1) => {
                for (let y = y0; y <= y1; y++) { set(x - 1, y, V[2], 0); set(x, y, V[1], 0); set(x + 1, y, V[0], 0); }
                set(x, y0 - 1, V[2], 0);
            };
            const b1 = pie - Math.round(alto * 0.4), b2 = pie - Math.round(alto * 0.55);
            for (let x = cx - 4; x <= cx - 1; x++) { set(x, b1, V[1], 0); set(x, b1 + 1, V[0], 0); }
            for (let x = cx + 1; x <= cx + 4; x++) { set(x, b2, V[1], 0); set(x, b2 + 1, V[0], 0); }
            columna(cx - 4, b1 - 6, b1);
            columna(cx + 4, b2 - 5, b2);
            columna(cx, pie - alto, pie);
        }
        for (let k = 0; k < 4; k++) algarrobo(RI(20, W - 20), RI(39, 41), 0.6);   // lejanos, detrás de la kallanka
        {
            // la kallanka, con su muro de adelante siempre sobre la superficie
            const ancho = RI(86, 96), kx = RI(262, 276), x0 = Math.round(kx - ancho / 2);
            let tope = Infinity;
            for (let x = x0 - 14; x <= x0 + ancho + 8; x++) tope = Math.min(tope, L[0][x]);
            kallanka(kx, ancho, Math.floor(tope) - 2);
            cardon(x0 - RI(8, 12), Math.floor(tope) - 1, RI(12, 15));
        }
        algarrobo(RI(36, 60), RI(44, 46), 1);
        algarrobo(RI(140, 185), RI(44, 46), 1);
        // lo que queda detrás de la superficie: se ve donde se saca la jarilla o el pasto
        const fondo = img.slice(0, W * FONDO * 4);

        // ── 2. Sedimentos y gravas ──
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const s = estrato(x, y);
                if (s === 0) continue;
                let ss = s;
                const d12 = y - L[1][x];                                   // el suelo pasa de a poco al derrumbe
                if (Math.abs(d12) < 3 && hash(x, y, 5) < 0.5 - Math.abs(d12) / 6) ss = d12 >= 0 ? 1 : 2;
                let c = ss === 7 ? grava(x, y) : sedimento(x, y, ss);
                if (s === 1 && y - L[0][x] < 1) c = shade(c, 1.5);           // superficie con luz
                if (s === 3 && y - L[2][x] < 1) c = shade(c, -1.5);          // contacto neto con el derrumbe
                if (s === 5 && y - L[4][x] < 1) c = shade(c, -1.8);          // bajo el piso
                if (s === 6 && L[6][x] - y < 1.5) c = shade(c, -2);          // sombra sobre la grava
                set(x, y, c, s === 7 ? 4 : 1);
            }
        }

        // Rango de y de un estrato en la columna x
        const rangoY = (s, x) => [L[s - 1][x], s < 7 ? L[s][x] : H];
        const enEstrato = (s, margen = 3, x0 = 30, x1 = W - 30) => {
            const x = Math.round(R(x0, x1)), [a, b] = rangoY(s, x);
            return [x, Math.round(R(a + margen, b - margen))];
        };

        // ── Figuras propias del sitio ──
        // Manojo de paja del techo, a medio quemar
        function paja(cx, cy, largo, ang, n) {
            const s = Math.sin(ang), c = Math.cos(ang), sd = RI(1, 1e6);
            for (let i = 0; i < n; i++) {
                const off = (i - (n - 1) / 2) * 0.9 + R(-0.3, 0.3), l = largo * R(0.7, 1.1), a2 = ang + R(-0.12, 0.12);
                const cc = Math.cos(a2), ss = Math.sin(a2), col = pick(PAJA);
                for (let t = -l / 2; t <= l / 2; t += 0.5) {
                    const q = hash(Math.floor(t / 2.5), i, sd);
                    set(cx + t * cc - off * s, cy + t * ss + off * c, q < 0.4 ? [44, 34, 26] : (q < 0.5 ? [120, 92, 52] : col), 2);
                }
            }
        }

        // Vasija torneada, vista de frente: radio(v) da el ancho a cada altura
        // (v = 0 en la boca, A en la base). Sombreado de cilindro con la luz de
        // la izquierda y el brillo del pulido; pintura(nx, v, k) da el color de
        // la decoración (nx de -1 a 1 de un borde al otro) o null para el
        // engobe liso. apendice(u, v) dibuja asas, tapas y botones con su color.
        function torneada(cx, pie, A, radio, base, pintura, apendice = () => null) {
            const off = Math.round(A / 2), cy = pie - off;
            const cuerpo = (u, v) => v >= 0 && v <= A && Math.abs(u) <= radio(v);
            const dentro = (dx, dy) => cuerpo(dx, dy + off) || !!apendice(dx, dy + off);
            let ancho = 0;
            for (let v = 0; v <= A; v++) ancho = Math.max(ancho, radio(v));
            figura(cx, cy, Math.ceil(Math.max(ancho + 4, off + 8)), dentro, (dx, dy, borde) => {
                const u = dx, v = dy + off;
                if (!cuerpo(u, v)) return apendice(u, v);
                if (borde) return shade(base, -5.5);
                const nx = u / Math.max(0.5, radio(v));
                let k = -nx * 1.7 - (v > A * 0.78 ? 0.8 : 0);
                if (nx > -0.62 && nx < -0.38 && v > A * 0.3 && v < A * 0.62) k += 1.4;   // brillo del pulido
                return pintura(nx, v, k) || shade(base, k);
            });
        }
        const angulo = nx => Math.asin(Math.max(-1, Math.min(1, nx)));   // alrededor del eje de la vasija

        // Aríbalo inca, parado: labio evertido con dos orejitas, cuello largo que
        // se abre en el hombro (con su botón modelado), cuerpo ovoide, dos asas
        // abajo y base cónica. Engobe rojo pulido y, al frente, un panel crema
        // con rombos concéntricos negros entre fajas negras.
        function aribalo(cx, pie) {
            const A = 42, ROJO = C('#a8432a'), CREMA = C('#e6d3b0');
            const radio = v => {
                if (v < 2) return 6.5;
                if (v < 3) return 5;
                if (v < 9) return 3.3;
                const cuello = 3.3 + (v - 9) * 0.5;
                const panza = Math.abs(v - 24) < 11.5 ? 12.6 * Math.sqrt(1 - ((v - 24) / 11.5) ** 2) : 0;
                const cono = v >= 27 ? (A - v) * 0.7 : 0;
                return Math.max(cuello < 6 ? cuello : 0, panza, cono);
            };
            const rAsa = Math.round(radio(29));
            const apendice = (u, v) => {
                const a = Math.abs(u);
                if (v >= 26 && v <= 32 && a > rAsa && a <= rAsa + 2) {                // asas verticales
                    if (v === 26 || v === 32 || a === rAsa + 2) return [62, 22, 14];
                    return v > 26 && v < 32 && a === rAsa + 1 ? [40, 16, 10] : shade(ROJO, -1);
                }
                if (v >= 3 && v <= 4 && a > 3.3 && a <= 5) return v === 3 ? shade(ROJO, 1) : [62, 22, 14]; // orejitas
                return null;
            };
            torneada(cx, pie, A, radio, ROJO, (nx, v, k) => {
                const th = angulo(nx), a = Math.abs(th);
                if (v === 0) return shade(ROJO, 1.8);                                // canto del labio
                if (v === 9 || v === 10) return NEGRO;                               // faja en la base del cuello
                if (Math.abs(nx) < 0.17 && v === 15) return shade(ROJO, 2.4);        // botón modelado
                if (Math.abs(nx) < 0.17 && v === 16) return shade(ROJO, -2.5);
                if (v >= 18 && v <= 33) {
                    if (a <= 0.62) {                                                 // panel de rombos
                        if (a > 0.5 || v === 18 || v === 33) return NEGRO;
                        const r = a / 0.42 + Math.abs(mod(v - 18, 7.5) - 3.75) / 3.4;
                        return (r > 0.7 && r < 1.06) || r < 0.26 ? NEGRO : shade(CREMA, k * 0.35);
                    }
                    if (a > 0.76 && a < 0.9) return NEGRO;                          // fajas a los costados
                }
                return null;
            }, apendice);
        }

        // Olla inca de pie, tiznada por el fuego, con un asa al costado
        function olla(cx, pie) {
            const A = 22, BASE = C('#8a5a3c'), sd = RI(1, 1e6);
            const radio = v => {
                if (v < 1.5) return 6.5;
                if (v < 4) return 5.5;
                const panza = Math.abs(v - 11) < 7.5 ? 9 * Math.sqrt(1 - ((v - 11) / 7.5) ** 2) : 0;
                return Math.max(panza, v >= 17 ? 4 + (v - 17) * 0.25 : 0);          // pie
            };
            torneada(cx, pie, A, radio, BASE, (nx, v) => {
                if (v === 0) return shade(BASE, 1.6);
                if (v > 9 && v < 19 && noise(nx * 9 + 20, v, 2.5, sd) > 0.45 - (v - 9) * 0.03) return v % 2 ? [40, 32, 28] : [56, 44, 38]; // tizne
                return null;
            }, (u, v) => {
                if (u >= 6 && u <= 8 && v >= 3 && v <= 9) {                          // asa
                    if (u === 8 || v === 3 || v === 9) return [44, 28, 18];
                    return u === 7 && v > 3 && v < 9 ? [30, 20, 14] : shade(BASE, -0.8);
                }
                return null;
            });
        }

        // Plato inca playo, de perfil: el asa en cabecita de pato a un lado y
        // un botoncito al otro; engobe rojo con un filete negro bajo el borde
        function plato(cx, cy) {
            const ROJO = C('#b5502f');
            const cabeza = (dx, dy) => dx >= 10 && dx <= 13 && dy >= -3 && dy < 0 && !(dx === 10 && dy === -3) && !(dx === 13 && dy === -3);
            const dentro = (dx, dy) => (dy >= 0 && dy <= 4 && Math.abs(dx) <= 11 - dy * 1.5) || cabeza(dx, dy) || (dx === -12 && dy === 0);
            figura(cx, cy, 14, dentro, (dx, dy, borde) => {
                if (cabeza(dx, dy)) {
                    if (dx === 13 && dy === -1) return [214, 156, 64];               // pico
                    if (dx === 12 && dy === -2) return NEGRO;                        // ojo
                    return borde ? [62, 22, 14] : shade(ROJO, 0.6);
                }
                if (borde) return [62, 22, 14];
                if (dy === 0) return shade(ROJO, 1.6);                              // borde
                if (dy === 1) return NEGRO;
                return shade(ROJO, -dx / 11 * 1.4 + (dy === 4 ? -1 : 0));
            });
        }

        // Molino (conana) de granito, gastado en el medio, con su mano encima
        function molino(cx, pie) {
            const top = dx => -6 + (Math.abs(dx) < 11 ? 2 * Math.cos(dx / 11 * Math.PI / 2) : 0);
            const dentro = (dx, dy) => Math.abs(dx) <= 15 && dy <= 0 && dy >= top(dx) && !(Math.abs(dx) >= 14 && dy <= -5);
            const base = GRANITO[2], sd = RI(1, 1e6);
            figura(cx, pie - 1, 16, dentro, (dx, dy, borde) => {
                if (borde) return shade(base, -4.5);
                if (filo(dentro, dx, dy - 1)) return shade(base, 2);
                return shade(base, tone(noise(dx + 40, dy + 40, 3, sd), dx & 7, dy & 7) * 0.7 - (dy > -2 ? 1.2 : 0));
            });
            piedra(cx + RI(-4, 4), pie - 7, 5, 2, C('#8a8c8e'), true);
        }

        // Marlo de maíz carbonizado, con los alvéolos de los granos
        function marlo(cx, cy, ang) {
            const c = Math.cos(ang), s = Math.sin(ang);
            const dentro = (dx, dy) => { const u = dx * c + dy * s, v = -dx * s + dy * c; return (u / 4.6) ** 2 + (v / 1.9) ** 2 <= 1; };
            figura(cx, cy, 6, dentro, (dx, dy, borde) => {
                if (borde) return [18, 14, 12];
                return mod(Math.round(dx * c + dy * s) + dy, 2) ? [46, 36, 28] : [88, 68, 44];
            });
        }

        // Huesito largo con sus dos cabezas
        function huesito(cx, cy, ang) {
            const l = RI(3, 5), c = Math.cos(ang), s = Math.sin(ang);
            for (let t = -l; t <= l; t += 0.5) set(cx + t * c, cy + t * s, [222, 210, 184], 2);
            set(cx - l * c, cy - l * s - 1, [196, 184, 156], 2);
            set(cx + l * c, cy + l * s - 1, [196, 184, 156], 2);
        }

        // Tiesto Belén: rojo con un trazo negro
        function tiestoBelen(x, y) {
            tiesto(x, y, ROJO_BELEN);
            set(x, y, NEGRO, 2);
        }

        // Urna Belén con su puco de tapa: cuello alto y evertido, cuerpo ovoide
        // con dos asitas y base plana. Negro sobre rojo: una víbora en zigzag
        // en el cuello, reticulado en los hombros y dientes colgantes debajo.
        function urna(cx, pie) {
            const A = 44, ROJO = C('#a2482c');
            const radio = v => {
                if (v < 1.5) return 12.5;
                const cuello = 8.4 + 4 * ((13 - Math.min(v, 13)) / 11.5) ** 2;
                const panza = Math.abs(v - 29) < 14.5 ? 14.6 * Math.sqrt(1 - ((v - 29) / 14.5) ** 2) : 0;
                return Math.max(v < 18 ? cuello : 0, panza, v > 36 && v <= A - 1 ? 7.5 : 0);
            };
            const tapa = (u, v) => v < 0 && v >= -6 && (u / 13.5) ** 2 + ((v + 0.5) / 5.5) ** 2 <= 1;
            const rAsa = Math.round(radio(34.5));
            const apendice = (u, v) => {
                if (tapa(u, v)) {                                                    // puco boca abajo
                    if (!tapa(u, v - 1) || !tapa(u - 1, v) || !tapa(u + 1, v)) return [58, 24, 14];
                    if (v === -1) return NEGRO;
                    if (v === -3 && mod(u, 3) === 0) return NEGRO;
                    return shade(C('#9a4a2c'), -u / 13 * 1.6 + (v < -4 ? 1.2 : 0));
                }
                const a = Math.abs(u);
                if (v >= 33 && v <= 36 && a > rAsa && a <= rAsa + 2) {               // asitas
                    return v === 33 || v === 36 || a === rAsa + 2 ? [58, 24, 14] : shade(ROJO, -1);
                }
                return null;
            };
            torneada(cx, pie, A, radio, ROJO, (nx, v) => {
                const th = angulo(nx), col = Math.round(th * 9);
                if (v === 0) return shade(ROJO, 1.6);                               // labio
                if (v === 2 || v === 13 || v === 17 || v === 26) return NEGRO;      // bandas
                if (v > 2 && v < 13) {                                              // víbora en zigzag
                    const zig = 7.5 + (Math.abs(mod(th * 4 + 20, 4) - 2) - 1) * 2.6;
                    return Math.abs(v - zig) < 1 ? NEGRO : null;
                }
                if (v > 17 && v < 26) return mod(col + v, 3) === 0 || mod(col - v, 3) === 0 ? NEGRO : null; // reticulado
                if (v >= 27 && v <= 31) {                                           // dientes colgantes
                    return Math.abs(mod(th * 6, 1) - 0.5) * 2 <= 1 - (v - 26.5) / 4.5 ? NEGRO : null;
                }
                return null;
            }, apendice);
        }

        // ── 3. Raíces del monte ──
        for (let k = 0; k < 5; k++) {                                     // raíces gruesas de algarrobo, casi horizontales
            let x = RI(40, W - 40), y = Math.ceil(L[0][x]) + RI(6, 30);
            const dir = rnd() < 0.5 ? -1 : 1, len = RI(40, 90), col = [92, 66, 44];
            for (let s = 0; s < len; s++) {
                if (kindAt(x, y) !== 1 || estrato(x, y) > 2) break;
                set(x, y, shade(col, 1.2)); set(x, y + 1, col);
                if (s < len * 0.6) set(x, y + 2, shade(col, -1.5));
                x += dir;
                if (rnd() < 0.25) y += rnd() < 0.6 ? 1 : -1;
            }
        }
        for (let k = 0; k < 30; k++) {                                    // raicillas
            let x = RI(28, W - 28), y = Math.ceil(L[0][x]) + 1;
            const len = RI(6, 40), col = rnd() < 0.5 ? [168, 146, 110] : [70, 52, 38];
            for (let s = 0; s < len; s++) {
                if (estrato(x, y) > 2 || kindAt(x, y) !== 1) break;
                set(x, y, col);
                y++;
                const r = rnd();
                if (r < 0.2) x--; else if (r > 0.8) x++;
            }
        }

        // ── 4. Cuevas de animalitos ──
        for (let k = 0; k < 2; k++) { const [x, y] = enEstrato(1, 8); cueva(x, y, RI(4, 5), RI(3, 4), true); }
        { const [x, y] = enEstrato(2, 10, 80, 280); cueva(x, y, 5, 4, false, S1); }
        { const [x, y] = enEstrato(5, 12, 60, 300); cueva(x, y, 4, 3, false, S4); }

        // ── 5. Derrumbe: bloques de granito y cantos que cayeron de los muros
        // hacia adentro, amontonados al pie de cada muro ──
        for (let k = 0; k < 44; k++) {
            const lado = rnd() < 0.5, lejos = Math.abs(R(0, 1) * R(0, 1)) * 150;
            const x = Math.round(lado ? W - 28 - lejos : 28 + lejos), [a, b] = rangoY(2, x);
            const y = Math.round(b - Math.abs(R(0, 1) * R(0, 1)) * (b - a - 8) - 5), r = RI(4, 10);
            if (rnd() < 0.3) piedra(x, y, r - 1, Math.max(3, Math.round((r - 1) * R(0.6, 0.85))), pick(CANTOS), true);
            else piedra(x, y, r, Math.max(3, Math.round(r * R(0.55, 0.8))), pick(GRANITO));
        }
        for (let k = 0; k < 14; k++) { const [x, y] = enEstrato(2, 6); piedra(x, y, RI(3, 6), RI(2, 4), pick(GRANITO)); }
        for (let k = 0; k < 30; k++) {                                    // piedritas sueltas en el suelo
            const [x, y] = enEstrato(1, 2, 28, W - 28);
            if (kindAt(x, y) !== 1) continue;
            const c = shade(pick(CANTOS), R(-1.5, 1));
            set(x, y, shade(c, 1.5), 2); set(x + 1, y, c, 2);
        }

        // ── 6. Techo caído: soleras y tirantes quemados entre la paja ──
        for (let k = 0; k < 2; k++) { const [x, y] = enEstrato(3, 10, 60, 300); viga(x, y, R(60, 90), RI(7, 9), R(-0.18, 0.18)); }
        for (let k = 0; k < 6; k++) { const [x, y] = enEstrato(3, 7); viga(x, y, R(30, 60), RI(4, 5), (rnd() < 0.5 ? 1 : -1) * R(0.1, 0.5)); }
        for (let k = 0; k < 18; k++) { const [x, y] = enEstrato(3, 4); paja(x, y, R(10, 22), R(-0.35, 0.35), RI(4, 8)); }
        for (let k = 0; k < 5; k++) { const [x, y] = enEstrato(3, 4); tiesto(x, y, ROJO_INCA); }

        // ── 7. Piso de ocupación inca ──
        {
            // fogón cavado en el piso: ceniza y carbones, el borde enrojecido,
            // la ceniza desparramada alrededor y dos piedras a los lados
            const fx0 = RI(150, 185), fx1 = fx0 + RI(30, 38);
            for (let x = fx0; x < fx1; x++) {
                const u = (x - fx0 + 0.5) / (fx1 - fx0), prof = 7 * Math.sqrt(Math.sin(Math.PI * u)), top = Math.ceil(pisoY(x));
                for (let y = top; y < top + prof; y++) set(x, y, hash(x, y, 33) < 0.2 ? CARBON : shade([150, 144, 134], tone(noise(x, y, 3, 34), x, y)), 2);
                for (let y = Math.floor(top + prof); y < top + prof + 2.5; y++) set(x, y, mix(get(x, y), [184, 84, 44], 0.55));
                for (let y = top - 1; y >= top - 3 + Math.abs(u - 0.5) * 4; y--) {
                    if (kindAt(x, y) === 1) set(x, y, shade([140, 134, 124], tone(noise(x, y, 2, 35), x, y)));
                }
            }
            piedra(fx0 - 4, Math.round(pisoY(fx0)) - 3, 4, 3, pick(GRANITO));
            piedra(fx1 + 3, Math.round(pisoY(fx1)) - 3, 4, 3, pick(GRANITO));
            const sobre = x => Math.round(pisoY(x));
            const ax = RI(48, 62); aribalo(ax, sobre(ax) + 2);
            const px = RI(105, 130); plato(px, sobre(px) - 4);
            const mx = RI(250, 285); molino(mx, sobre(mx));
            for (let k = 0; k < 9; k++) {                                  // marlos junto al fogón y al molino
                const x = k < 5 ? RI(fx0 - 14, fx1 + 14) : RI(mx - 30, mx + 28);
                marlo(x, sobre(x) - 2 - RI(0, 3), R(-0.5, 0.5));
            }
            for (let k = 0; k < 10; k++) { const x = RI(34, W - 40); tiesto(x, sobre(x) - 1, ROJO_INCA); }
            for (let k = 0; k < 4; k++) { const x = RI(80, W - 60); huesito(x, sobre(x) - 2, R(-0.3, 0.3)); }
            for (let k = 0; k < 6; k++) { const [x, y] = enEstrato(4, 4); tiesto(x, Math.min(y, sobre(x) - 6), ROJO_INCA); }
            const ox = Math.min(fx1 + RI(14, 20), mx - 28); olla(ox, sobre(ox) + 1);
        }

        // ── 8. Relleno de nivelación: cantos rodados y algún tiesto Belén arrastrado ──
        for (let k = 0; k < 70; k++) {
            const [x, y] = enEstrato(5, 3, 28, W - 28);
            if (kindAt(x, y) !== 1) continue;
            const r = RI(2, 5);
            piedra(x, y, r, Math.max(2, Math.round(r * R(0.6, 0.9))), pick(CANTOS), true);
        }
        for (let k = 0; k < 7; k++) { const [x, y] = enEstrato(5, 8); piedra(x, y, RI(6, 8), RI(4, 5), pick(CANTOS), true); }
        for (let k = 0; k < 5; k++) { const [x, y] = enEstrato(5, 4); tiestoBelen(x, y); }

        // ── 9. Ocupación local anterior ──
        {
            // fogón chato sobre el piso de esa ocupación
            const fx0 = RI(60, 100), fx1 = fx0 + RI(26, 34);
            for (let x = fx0; x < fx1; x++) {
                const u = (x - fx0 + 0.5) / (fx1 - fx0), g = 3.5 * Math.sin(Math.PI * u), y0 = Math.round(localY(x));
                for (let y = y0 - Math.round(g); y < y0; y++) set(x, y, hash(x, y, 63) < 0.3 ? CARBON : shade([128, 120, 110], tone(noise(x, y, 2, 64), x, y)), 2);
                set(x, y0, mix(get(x, y0), [176, 82, 46], 0.5));
            }
            // la urna, en su pozo cavado desde ese piso hasta casi la grava
            const ux = RI(215, 250);
            let pie = Infinity;
            for (let x = ux - 14; x <= ux + 14; x++) pie = Math.min(pie, L[6][x]);
            pie = Math.round(pie) - 4;
            const boca = Math.round(localY(ux)), fondoPozo = pie + 2, sd = RI(1, 1e6);
            for (let y = boca; y <= fondoPozo; y++) {
                const t = (y - boca) / (fondoPozo - boca), redondo = Math.max(0, (t - 0.6) / 0.4);
                const half = (19 - 3 * t) * Math.sqrt(1 - redondo * redondo * 0.85);
                for (let x = Math.round(ux - half); x <= ux + half; x++) {
                    if (kindAt(x, y) !== 1) continue;
                    const borde = Math.abs(x - ux) > half - 1.2 || y === fondoPozo;
                    set(x, y, borde ? shade(S6, -2.2) : shade(mix(S6, S5, 0.4), tone(noise(x, y, 3, sd), x, y)));
                }
            }
            urna(ux, pie);
            for (let k = 0; k < 7; k++) { const [x, y] = enEstrato(6, 4); if (Math.abs(x - ux) > 20) tiestoBelen(x, y); }
            for (let k = 0; k < 3; k++) { const [x, y] = enEstrato(6, 6, 40, 200); huesito(x, y, R(-0.5, 0.5)); }
            for (let k = 0; k < 8; k++) { const [x, y] = enEstrato(6, 6); if (Math.abs(x - ux) > 20) piedra(x, y, RI(3, 5), RI(2, 4), pick(CANTOS), true); }
        }

        // ── 10. Muros de la kancha: pirca de granito asentada en barro y, bajo
        // el piso, los cimientos de piedras más grandes apoyados en la grava ──
        const caraMuro = x => Math.ceil(pisoY(x)), techo7 = x => L[6][x];
        const zona2 = [Math.min(...L[1]) + 4, Math.max(...L[2]) - 4];
        const desgaste = (yc, prof) => yc < zona2[0] || yc > zona2[1] ? 0
            : prof * Math.sin(Math.PI * (yc - zona2[0]) / (zona2[1] - zona2[0]));
        const conCantos = { pal: CANTOS, prob: 0.16 };
        // izquierdo: entero, asoma sobre la superficie
        aparejo(0, 26, () => 22, caraMuro, GRANITO, BARRO, 9, 12, 10, 18, (a, b, y, y2, fila) => {
            if (fila === 0 && rnd() < 0.3) return true;
            return b > 26 - desgaste((y + y2) / 2, 5 * R(0.6, 1.3));
        }, conCantos);
        // derecho: arrasado bajo la superficie y comido donde se le cayeron piedras
        aparejo(W - 26, W, () => 58, caraMuro, GRANITO, BARRO, 9, 12, 10, 18, (a, b, y, y2, fila) => {
            if (fila === 0 && rnd() < 0.45) return true;
            return a < W - 26 + desgaste((y + y2) / 2, 12 * R(0.7, 1.2));
        }, conCantos);
        aparejo(0, 29, caraMuro, techo7, CIMIENTO, BARRO_CIMIENTO, 12, 16, 14, 22, () => false);
        aparejo(W - 29, W, caraMuro, techo7, CIMIENTO, BARRO_CIMIENTO, 12, 16, 14, 22, () => false);

        // ── 11. Monte bajo sobre la superficie y el muro: pasto seco y jarillas ──
        const sup = new Int16Array(W).fill(-1);
        for (let x = 0; x < W; x++) for (let y = 16; y < 72; y++) { if (kind[y * W + x] !== 0) { sup[x] = y; break; } }
        for (let x = 0; x < W; x++) {
            if (sup[x] < 0 || hash(x, 3, seed) > 0.38) continue;
            const alto = 1 + Math.floor(hash(x, 4, seed) * 4), lean = hash(x, 5, seed) < 0.3 ? -1 : (hash(x, 5, seed) > 0.7 ? 1 : 0);
            const col = elegir(PASTO_SECO, hash(x, 6, seed));
            for (let j = 1; j <= alto; j++) set(x + (j > alto / 2 ? lean : 0), sup[x] - j, shade(col, j === alto ? 1.2 : 0), 5);
        }
        for (let k = 0; k < 6; k++) {
            const cx = RI(36, W - 36), hw = R(4, 6), h = RI(4, 7), base = sup[cx], sd = RI(1, 1e6);
            if (base < 0) continue;
            for (let dy = -h; dy <= 0; dy++) for (let dx = -Math.ceil(hw); dx <= hw; dx++) {
                const x = cx + dx, y = base - 1 + dy;
                if ((dx / hw) ** 2 + (dy / h) ** 2 > 1 || !dentroImg(x, y)) continue;
                if (dy > -2 && Math.abs(dx) % 2 === 1) { set(x, y, [88, 70, 44], 5); continue; }  // ramitas al pie
                if (hash(x, y, sd) > 0.78) continue;
                set(x, y, shade(elegir(JARILLA, noise(x, y, 2, sd)), dy < -h * 0.5 ? 1 : 0), 5);
            }
        }

        return {
            width: W, height: H, data: img, kind,
            limites: L, // L[i] = techo del estrato i+1, para cada x
            estratos: L.map(a => Math.round(a.reduce((s, v) => s + v, 0) / W)), // techo medio de cada estrato
            cielo: CIELO,                   // color del cielo arriba y abajo, hasta la fila CIELO.alto
            fondo, fondoAlto: FONDO,        // el paisaje de fondo, sin la superficie ni el monte bajo
        };
    }

    const api = { pintarPerfil, W, ALTO_DIBUJO };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.PerfilKancha = api;
})(this);
