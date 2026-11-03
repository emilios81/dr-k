// Perfil de excavación del recinto en pixel art, generado por código.
// Siete estratos, de la superficie actual a la roca madre, encerrados entre
// los muros del recinto. Funciona en el navegador y en Node (para exportar
// la imagen con exportar-perfil.js).
//
// Estratos:
//   1 suelo superficial con gramilla        5 piso de habitación con material
//   2 relleno de colmatación (loess, arena, 6 construcciones anteriores
//     arcilla)                              7 roca madre
//   3 techo caído (argamasa, ramillas, horcones y tirantes quemados)
//   4 relleno con muros caídos
(function (root) {
    const Pincel = typeof require !== 'undefined' ? require('./Pincel.js') : root.Pincel;
    const { hash, noise, dither, tone, C, shade, mix, mod, CARBON } = Pincel;
    const W = 360, ALTO_DIBUJO = 640; // la imagen ilustrativa; en el juego la roca sigue más abajo

    // ── Paletas ──────────────────────────────────────────────────────────────
    const S1 = C('#5b4332'), S3 = C('#3b2e26'), S4 = C('#7c5c41');
    const S5 = C('#9b7351'), S5b = C('#82613f'), S6 = C('#5d4a3b');
    const PIEDRA = ['#9a8a74', '#a8977d', '#8a7b68', '#7f7a72', '#b0a084', '#958c7f'].map(C);
    const PIEDRA_VIEJA = ['#6c7075', '#5f6368', '#787b80', '#686a6c', '#73706a'].map(C);
    const ADOBE = ['#9c5f40', '#8e5638', '#a8694a', '#94603f'].map(C);
    const ROCA = ['#6e7277', '#7a7e83', '#64686e', '#83868a', '#5c6066'].map(C);
    const PASTO = ['#5e8a3a', '#79a046', '#4b7030', '#93b85a', '#6b8f3c'].map(C);
    const BARRO = C('#4a3829'), BARRO_VIEJO = C('#3d3a36');
    const CIELO = { arriba: [118, 170, 222], abajo: [206, 226, 236], alto: 48 };

    // alto: filas del dibujo (más que ALTO_DIBUJO = más roca madre abajo)
    function pintarPerfil(seed = 7, alto = ALTO_DIBUJO) {
        const H = alto;
        const p = Pincel.crear(W, H, seed);
        const { img, kind, rnd, R, RI, pick, set, get, kindAt, dentroImg, wave } = p;
        const { filo, figura, piedra, viga, vasija, puco, tiesto, cueva, tunel, aparejo } = p;

        // ── Límites entre estratos (L[i] = techo del estrato i+1) ──
        const L = [
            wave(46, 2.5, 3),    // superficie
            wave(104, 4),        // 1 → 2: transición gradual
            wave(196, 3),        // 2 → 3: el techo cae de golpe
            wave(262, 6, 6),     // 3 → 4: irregular
            wave(372, 1),        // 4 → 5: superficie del piso, casi plana
            wave(420, 2),        // 5 → 6
            wave(530, 6, 16),    // 6 → 7: techo de la roca, quebrado
        ];
        const estrato = (x, y) => { for (let i = 6; i >= 0; i--) if (y >= L[i][x]) return i + 1; return 0; };

        // ── Estrato 2: bandas de colmatación ──
        const TIPOS2 = { loess: C('#b0906a'), arena: C('#c2a47b'), arcilla: C('#8e5e43'), limo: C('#9b7d5e') };
        const bandas = [];
        for (let d = -4; d < 112;) {
            const t = pick(['loess', 'arena', 'loess', 'arcilla', 'limo']);
            const g = t === 'arcilla' ? RI(3, 6) : RI(6, 14);
            bandas.push({ d, t, base: TIPOS2[t], k: R(-0.6, 0.6), seed: RI(1, 1e6) });
            d += g;
        }
        const banda = d => { for (let i = bandas.length - 1; i >= 0; i--) if (d >= bandas[i].d) return bandas[i]; return bandas[0]; };

        function sedimento(x, y, s) {
            const h = hash(x, y, seed + s * 31);
            switch (s) {
                case 1: {
                    if (h < 0.04) return shade(S1, -3);                    // materia orgánica
                    if (h > 0.985) return shade(S1, 2);
                    const v = noise(x, y, 6, 11) * 0.6 + noise(x, y, 2, 12) * 0.4;
                    return shade(S1, tone(v, x, y));
                }
                case 2: {
                    const d = y - L[1][x] + Math.sin(x * 0.045 + 1.3) * 2.5 + (noise(x, y, 20, 21) - 0.5) * 3;
                    const b = banda(d);
                    let k = tone(noise(x, y, b.t === 'arcilla' ? 12 : 6, b.seed) * 0.6 + 0.2, x, y);
                    if (b.t === 'arena') { if (h < 0.08) k = 2; else if (h < 0.12) k = -2; }
                    else if (b.t === 'loess') { if (hash(x, Math.floor(y / 8), b.seed) < 0.03) k -= 1.2; if (h < 0.006) k = 2.5; }
                    else if (b.t === 'arcilla') { if (Math.floor(d) % 2 === 0) k += 0.4; }
                    else if (h < 0.02) k = -2;
                    return shade(b.base, k + b.k);
                }
                case 3: {
                    if (h < 0.10) return h < 0.05 ? [26, 22, 19] : [44, 36, 30]; // carbón
                    if (h < 0.115) return [150, 72, 40];                        // barro cocido
                    let c = shade(S3, tone(noise(x, y, 4, 31), x, y) * 1.5);
                    if (noise(x, y, 11, 32) > 0.7) c = mix(c, [128, 120, 110], 0.45); // bolsones de ceniza
                    return c;
                }
                case 4: {
                    const v = noise(x, y, 5, 41) * 0.7 + noise(x, y, 1.6, 42) * 0.3;
                    let k = tone(v, x, y) * 1.2;
                    if (h < 0.03) k = -2; else if (h > 0.98) k = 2;
                    return shade(S4, k);
                }
                case 5: {
                    const d = y - L[4][x];
                    if (d < 2) return shade([184, 141, 95], d < 1 ? 1 : 0);  // superficie pisada
                    if (d < 20) {
                        let k = tone(noise(x, y, 14, 51) * 0.5 + 0.25, x, y);
                        if (Math.floor(d / 3) % 2 === 1) k -= 0.6;            // láminas de pisoteo
                        if (h < 0.01) k = -2.5;
                        return shade(S5, k);
                    }
                    return shade(S5b, h < 0.03 ? -2 : tone(noise(x, y, 5, 52), x, y));
                }
                case 6: {
                    if (h < 0.06) return shade([112, 110, 106], (hash(x, y, 9) - 0.5) * 3); // gravilla
                    return shade(S6, tone(noise(x, y, 5, 61) * 0.7 + noise(x, y, 1.5, 62) * 0.3, x, y) * 1.2);
                }
            }
            return S4;
        }

        // ── Estrato 7: roca madre en bloques (celdas de Voronoi) ──
        const G = 22, celdas = new Map();
        const celda = (gx, gy) => {
            const key = gx * 1000 + gy;
            if (!celdas.has(key)) {
                celdas.set(key, {
                    x: gx * G + 3 + hash(gx, gy, seed + 71) * (G - 6),
                    y: gy * G + 3 + hash(gx, gy, seed + 72) * (G - 6),
                    c: ROCA[Math.floor(hash(gx, gy, seed + 73) * ROCA.length)],
                });
            }
            return celdas.get(key);
        };
        function roca(x, y) {
            const gx = Math.floor(x / G), gy = Math.floor(y / G);
            let d1 = Infinity, d2 = Infinity, best = null;
            for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
                const c = celda(gx + i, gy + j);
                const d = Math.hypot(x - c.x, y - c.y);
                if (d < d1) { d2 = d1; d1 = d; best = c; } else if (d < d2) d2 = d;
            }
            const gap = d2 - d1;
            if (gap < 1.4) return [36, 38, 42];                              // fractura
            const dx = x - best.x, dy = y - best.y;
            if (gap < 2.8) return shade(best.c, dx + dy < 0 ? 1.8 : -1.6);    // bisel
            let k = tone(noise(x, y, 4, 79), x, y) * 0.7 - (dx + dy) / G * 1.2;
            if (hash(x, y, 81) < 0.04) k += 1.5;
            return shade(best.c, k);
        }

        // ── 1. Cielo con montañas lejanas ──
        const sierra = new Float32Array(W);
        for (let x = 0; x < W; x++) sierra[x] = 24 + noise(x, 0, 46, seed + 5) * 16 + noise(x, 0, 11, seed + 6) * 5;
        for (let y = 0; y < 60; y++) {
            for (let x = 0; x < W; x++) {
                const t = Math.min(1, Math.floor((y / 48 + (dither(x, y) - 0.5) * 0.12) * 8) / 8);
                let c = mix(CIELO.arriba, CIELO.abajo, t);
                if (y >= sierra[x]) c = y - sierra[x] < 2 ? [150, 160, 182] : mix([124, 136, 160], [108, 118, 140], Math.min(1, (y - sierra[x]) / 20));
                set(x, y, c, 0);
            }
        }
        for (let n = 0; n < 4; n++) {
            const cx = R(20, W - 20), cy = R(6, 18), parts = RI(3, 5);
            for (let p = 0; p < parts; p++) {
                const px = Math.round(cx + R(-14, 14)), py = Math.round(cy + R(-2, 2)), rx = R(5, 10), ry = R(2.5, 4);
                for (let dy = -Math.ceil(ry); dy <= ry; dy++) for (let dx = -Math.ceil(rx); dx <= rx; dx++) {
                    const x = px + dx, y = py + dy;
                    if ((dx / rx) ** 2 + (dy / ry) ** 2 > 1 || !dentroImg(x, y) || y >= sierra[x]) continue;
                    set(x, y, dy > ry * 0.35 ? [214, 222, 232] : [246, 248, 250]);
                }
            }
        }

        // ── 2. Sedimentos y roca ──
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const s = estrato(x, y);
                if (s === 0) continue;
                let ss = s;
                // contactos graduales: 1-2 y 3-4 se mezclan en un par de píxeles
                const d12 = y - L[1][x], d34 = y - L[3][x];
                if (Math.abs(d12) < 3 && hash(x, y, 5) < 0.5 - Math.abs(d12) / 6) ss = d12 >= 0 ? 1 : 2;
                if (Math.abs(d34) < 3 && hash(x, y, 6) < 0.5 - Math.abs(d34) / 6) ss = d34 >= 0 ? 3 : 4;
                let c = ss === 7 ? roca(x, y) : sedimento(x, y, ss);
                if (s === 7 && y - L[6][x] < 1.2) c = [36, 38, 42];          // borde de la roca
                if (s === 2 && L[2][x] - y < 1) c = shade(c, -1.5);           // contacto neto con el techo
                if (s === 5 && L[5][x] - y < 1) c = shade(c, -1.5);
                if (s === 6 && L[6][x] - y < 1.5) c = shade(c, -2);           // sombra sobre la roca
                if (s === 1 && y - L[0][x] < 1) c = shade(c, 1.5);            // superficie con luz
                set(x, y, c, s === 7 ? 4 : 1);
            }
        }

        // Adobe entero o partido, con paja
        function adobe(cx, cy, rx, ry, entero = true) {
            const base = pick(ADOBE), corte = entero ? 99 : (rx + ry) * R(0.5, 0.8), esquina = RI(0, 3);
            const dentro = (dx, dy) => {
                if (Math.abs(dx) > rx || Math.abs(dy) > ry) return false;
                const sx = esquina & 1 ? dx : -dx, sy = esquina & 2 ? dy : -dy;
                return sx + sy <= corte;
            };
            figura(cx, cy, Math.max(rx, ry) + 1, dentro, (dx, dy, borde) => {
                if (borde) return [74, 42, 28];
                if (hash(cx + dx, cy + dy, 91) < 0.07) return [190, 160, 98];   // paja
                if (filo(dentro, dx, dy - 1)) return shade(base, 1.6);
                if (filo(dentro, dx, dy + 1)) return shade(base, -1.6);
                return shade(base, tone(noise(cx + dx, cy + dy, 4, 93), cx + dx, cy + dy) * 0.6);
            });
        }

        // Haz de ramillas (cañas o ramas del techo) atado al medio
        function ramillas(cx, cy, largo, ang, n) {
            const c = Math.cos(ang), s = Math.sin(ang);
            const colores = ['#b8924c', '#a3803f', '#c9a35c'].map(C);
            for (let i = 0; i < n; i++) {
                const off = (i - (n - 1) / 2) * 1.15, l = largo * R(0.8, 1.05), col = pick(colores), sd = RI(1, 1e6);
                for (let t = -l / 2; t <= l / 2; t += 0.5) {
                    const x = cx + t * c - off * s, y = cy + t * s + off * c;
                    const quemada = hash(Math.floor(t / 3), i, sd) < 0.28;
                    set(x, y, quemada ? [58, 42, 30] : shade(col, Math.abs(t) > l / 2 - 2 ? -1.5 : 0), 2);
                }
            }
            for (let w = -n; w <= n; w++) for (let t = -1; t <= 1; t++) {
                set(cx + t * c - w * s, cy + t * s + w * c, [94, 63, 36], 2);  // atadura
            }
        }

        // Pedazo de argamasa del techo, con improntas de caña
        function argamasa(cx, cy, rx, ry) {
            const lim = (rx + ry) * 0.7;
            const dentro = (dx, dy) => Math.abs(dx) <= rx && Math.abs(dy) <= ry && Math.abs(dx) + Math.abs(dy) * 1.2 <= lim + 2;
            const base = C('#b3a891');
            figura(cx, cy, Math.max(rx, ry) + 1, dentro, (dx, dy, borde) => {
                if (borde) return [95, 87, 74];
                if (mod(dx * 0.5 + dy, 3) < 1) return shade(base, -1.4);   // impronta de caña
                if (filo(dentro, dx, dy - 1)) return shade(base, 1.5);
                return shade(base, hash(cx + dx, cy + dy, 97) < 0.1 ? -1 : 0);
            });
        }

        // Rango de y de un estrato en la columna x
        const rangoY = (s, x) => [L[s - 1][x], s < 7 ? L[s][x] : H];
        const enEstrato = (s, margen = 3, x0 = 30, x1 = W - 30) => {
            const x = Math.round(R(x0, x1)), [a, b] = rangoY(s, x);
            return [x, Math.round(R(a + margen, b - margen))];
        };

        // ── 3. Raíces del suelo actual ──
        for (let k = 0; k < 28; k++) {
            let x = RI(28, W - 28), y = Math.ceil(L[0][x]) + 1;
            const len = RI(6, 34), col = rnd() < 0.5 ? [176, 152, 114] : [62, 45, 33], gruesa = rnd() < 0.15;
            for (let s = 0; s < len; s++) {
                if (estrato(x, y) > 2 || kindAt(x, y) !== 1) break;
                set(x, y, col);
                if (gruesa && s < len * 0.4) set(x + 1, y, shade(col, -1));
                y++;
                const r = rnd();
                if (r < 0.2) x--; else if (r > 0.8) x++;
            }
        }

        // ── 4. Cuevas de animalitos ──
        for (let k = 0; k < 3; k++) { const [x, y] = enEstrato(1, 8); cueva(x, y, RI(4, 5), RI(3, 4), true); }
        { const [x, y] = enEstrato(2, 10); cueva(x, y, 5, 4, true); }
        for (let k = 0; k < 2; k++) { const [x, y] = enEstrato(2, 8); cueva(x, y, RI(4, 6), RI(3, 4), false, S1); }
        { const [x, y] = enEstrato(2, 14, 60, 200); tunel(x, y, 16, shade(S1, 1)); }
        { const [x, y] = enEstrato(4, 14, 60, 220); cueva(x, y, 5, 4, true); }
        { const [x, y] = enEstrato(4, 14, 40, 200); tunel(x, y, 14, C('#b0906a')); }
        { const [x, y] = enEstrato(6, 10, 40, 300); cueva(x, y, 4, 3, false, S4); }

        // ── 5. Piedritas y gravilla en los sedimentos ──
        [[1, 40], [2, 60], [4, 70], [6, 50]].forEach(([s, n]) => {
            for (let k = 0; k < n; k++) {
                const [x, y] = enEstrato(s, 2, 28, W - 28);
                if (kindAt(x, y) !== 1) continue;
                const c = shade(pick(PIEDRA), R(-1.5, 1));
                set(x, y, shade(c, 1.5), 2); set(x + 1, y, c, 2);
                if (rnd() < 0.5) { set(x, y + 1, shade(c, -1.5), 2); set(x + 1, y + 1, shade(c, -2), 2); }
            }
        });

        // ── 6. Estrato 6: construcción anterior (otra piedra, otro aparejo) ──
        const techo6 = x => L[5][x], techo7 = x => L[6][x];
        // muro viejo en el centro, arrasado arriba
        const tope6 = Math.min(...Array.from(L[6]).slice(64, 252)) - 40;
        aparejo(64, 252, () => tope6, techo7, PIEDRA_VIEJA, BARRO_VIEJO, 12, 15, 16, 26,
            (a, b, y, y2, fila) => (fila === 0 && rnd() < 0.6) || (fila === 1 && rnd() < 0.25));
        for (let k = 0; k < 5; k++) {
            const x = rnd() < 0.5 ? RI(36, 62) : RI(254, 300), [a, b] = rangoY(6, x);
            piedra(x, Math.round(b - R(6, 16)), RI(6, 9), RI(5, 6), pick(PIEDRA_VIEJA));
        }
        // piso de esa ocupación anterior, apoyado contra el muro viejo
        for (let x = 30; x < W - 30; x++) {
            if (x >= 64 && x < 252) continue;
            const y0 = Math.round(tope6 + 14 + Math.sin(x * 0.05) * 1.5);
            for (let y = y0; y < y0 + 3; y++) if (kindAt(x, y) === 1) set(x, y, shade([150, 116, 84], y === y0 ? 1.2 : tone(noise(x, y, 8, 66), x, y) * 0.6));
        }
        // gravilla gris y bloques sueltos del mismo tipo
        for (let k = 0; k < 10; k++) { const [x, y] = enEstrato(6, 6, 40, 320); if (kindAt(x, y) === 1) piedra(x, y, RI(3, 6), RI(2, 4), pick(PIEDRA_VIEJA)); }

        // ── 7. Piedras y adobes caídos en cada estrato ──
        const sueltas = [[1, 6, 2, 3, 0], [2, 10, 3, 5, 2], [3, 6, 3, 5, 3], [4, 22, 4, 8, 6], [5, 3, 2, 3, 0]];
        sueltas.forEach(([s, n, rMin, rMax, nAdobes]) => {
            for (let k = 0; k < n; k++) {
                const [x, y] = enEstrato(s, rMax);
                if (kindAt(x, y) !== 1) continue;
                const r = RI(rMin, rMax);
                piedra(x, y, r, Math.max(2, Math.round(r * R(0.6, 0.9))), pick(PIEDRA));
            }
            for (let k = 0; k < nAdobes; k++) {
                const [x, y] = enEstrato(s, 6);
                if (kindAt(x, y) !== 1) continue;
                adobe(x, y, RI(5, 8), RI(3, 4), rnd() < 0.5);
            }
        });
        // escombrera al pie del muro derecho: el muro se fue cayendo hacia adentro
        for (let k = 0; k < 34; k++) {
            const x = Math.round(W - 26 - Math.abs(R(-1, 1) * R(0, 1)) * 70);
            const [a, b] = rangoY(4, x);
            const y = Math.round(b - Math.abs(R(0, 1) * R(0, 1)) * (b - a) - 4);
            const r = RI(4, 9);
            if (rnd() < 0.25) adobe(x, y, r, Math.max(3, r - 3), rnd() < 0.4);
            else piedra(x, y, r, Math.max(3, Math.round(r * R(0.6, 0.85))), pick(PIEDRA));
        }
        // y algo al pie del muro izquierdo
        for (let k = 0; k < 8; k++) {
            const x = Math.round(30 + Math.abs(R(0, 1) * R(0, 1)) * 40), [a, b] = rangoY(4, x);
            piedra(x, Math.round(b - R(4, (b - a) * 0.5)), RI(3, 6), RI(3, 5), pick(PIEDRA));
        }

        // ── 8. Estrato 3: el techo caído ──
        for (let k = 0; k < 3; k++) {                                   // horcones: postes gruesos caídos en diagonal
            const [x, y] = enEstrato(3, 12, 50, 310);
            viga(x, y, R(50, 72), RI(8, 10), (rnd() < 0.5 ? 1 : -1) * R(0.35, 0.8));
        }
        for (let k = 0; k < 6; k++) {                                   // tirantes: vigas más finas, casi horizontales
            const [x, y] = enEstrato(3, 9);
            viga(x, y, R(40, 80), RI(5, 7), R(-0.22, 0.22));
        }
        for (let k = 0; k < 6; k++) { const [x, y] = enEstrato(3, 7); ramillas(x, y, R(20, 32), R(-0.45, 0.45), RI(6, 9)); }
        for (let k = 0; k < 7; k++) { const [x, y] = enEstrato(3, 6); argamasa(x, y, RI(5, 9), RI(3, 5)); }
        for (let k = 0; k < 2; k++) { const [x, y] = enEstrato(3, 10, 50, 300); vasija(x, y, RI(10, 12), RI(7, 8), true); }
        for (let k = 0; k < 8; k++) { const [x, y] = enEstrato(3, 4); tiesto(x, y); }
        for (let k = 0; k < 6; k++) { const [x, y] = enEstrato(4, 4); tiesto(x, y); }
        for (let k = 0; k < 2; k++) { const [x, y] = enEstrato(2, 4); tiesto(x, y); }

        // ── 9. Estrato 5: piso con fogón, vasijas y tiestos ──
        {
            const fx0 = RI(140, 170), fx1 = fx0 + RI(32, 40);
            for (let x = fx0; x < fx1; x++) {
                const u = (x - fx0 + 0.5) / (fx1 - fx0), prof = 8 * Math.sqrt(Math.sin(Math.PI * u)), top = Math.ceil(L[4][x]);
                for (let y = top; y < top + prof; y++) {
                    const h = hash(x, y, 33);
                    set(x, y, h < 0.16 ? CARBON : shade([142, 136, 126], tone(noise(x, y, 3, 34), x, y)), 2);
                }
                for (let y = Math.floor(top + prof); y < top + prof + 2.5; y++) set(x, y, mix(get(x, y), [176, 82, 46], 0.5)); // suelo enrojecido
            }
            const pisoY = x => Math.ceil(L[4][x]);
            const vx = RI(48, 80); vasija(vx, pisoY(vx) - 8, 13, 8, false);
            const rx = RI(220, 262); vasija(rx, pisoY(rx) - 7, 11, 7, true);
            const px = RI(100, 125); puco(px, pisoY(px) - 6, 10, 6);
            for (let k = 0; k < 9; k++) { const x = RI(34, W - 40); tiesto(x, pisoY(x) - 1); }
            for (let k = 0; k < 5; k++) { const x = RI(34, W - 40); piedra(x, pisoY(x) + RI(24, 40), RI(5, 8), 2, pick(PIEDRA)); } // contrapiso
        }

        // ── 10. Muros del recinto, con desgaste en el estrato 4 ──
        const zona4 = [Math.min(...L[3]) - 2, Math.max(...L[4]) - 6];
        const desgaste = (yc, prof) => yc < zona4[0] || yc > zona4[1] ? 0
            : prof * Math.sin(Math.PI * (yc - zona4[0]) / (zona4[1] - zona4[0]));
        // izquierdo: entero, asoma sobre la superficie
        const conAdobes = { pal: ADOBE, prob: 0.28, paja: true };
        aparejo(0, 26, () => 30, techo6, PIEDRA, BARRO, 8, 12, 9, 16, (a, b, y, y2, fila) => {
            if (fila === 0 && rnd() < 0.35) return true;
            return b > 26 - desgaste((y + y2) / 2, 6 * R(0.6, 1.3));
        }, conAdobes);
        // derecho: más caído arriba y comido por dentro donde se le cayeron piedras
        aparejo(W - 26, W, () => 64, techo6, PIEDRA, BARRO, 8, 12, 9, 16, (a, b, y, y2, fila) => {
            if (fila === 0 && rnd() < 0.5) return true;
            if (fila === 1 && rnd() < 0.2) return true;
            return a < W - 26 + desgaste((y + y2) / 2, 17 * R(0.7, 1.2));
        }, conAdobes);
        // cimientos: debajo de los muros sigue la construcción anterior
        aparejo(0, 30, techo6, techo7, PIEDRA_VIEJA, BARRO_VIEJO, 12, 15, 14, 20, () => false);
        aparejo(W - 30, W, techo6, techo7, PIEDRA_VIEJA, BARRO_VIEJO, 12, 15, 14, 20, () => false);

        // ── 11. Gramilla y plantitas en la superficie y sobre el muro ──
        for (let x = 0; x < W; x++) {
            let base = -1;
            for (let y = 26; y < 70; y++) { if (kindAt(x, y) !== 0) { base = y; break; } }
            if (base < 0 || hash(x, 3, seed) > 0.62) continue;
            const altoPasto = 2 + Math.floor(hash(x, 4, seed) * 5), lean = hash(x, 5, seed) < 0.3 ? -1 : (hash(x, 5, seed) > 0.7 ? 1 : 0);
            const col = PASTO[Math.floor(hash(x, 6, seed) * PASTO.length)];
            for (let j = 1; j <= altoPasto; j++) set(x + (j > altoPasto / 2 ? lean : 0), base - j, shade(col, j === altoPasto ? 1.2 : 0), 5);
            if (hash(x, 7, seed) < 0.05) set(x + lean, base - altoPasto - 1, hash(x, 8, seed) < 0.5 ? [242, 239, 228] : [232, 200, 74], 5); // florcita
        }

        return {
            width: W, height: H, data: img, kind,
            limites: L, // L[i] = techo del estrato i+1, para cada x
            cielo: CIELO, // color del cielo arriba y abajo, hasta la fila CIELO.alto
            estratos: L.map(a => Math.round(a.reduce((s, v) => s + v, 0) / W)), // techo medio de cada estrato
        };
    }

    const api = { pintarPerfil, W, ALTO_DIBUJO };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.PerfilRecinto = api;
})(this);
