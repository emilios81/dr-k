// Herramientas para pintar perfiles de excavación en pixel art, compartidas
// por los sitios (PerfilRecinto.js, PerfilKancha.js). Funciona en el
// navegador y en Node (para exportar la imagen con exportar-perfil.js).
//
// Pincel.crear(W, H, seed) arma un lienzo vacío con su generador al azar
// determinista y las figuras que se pintan sobre él (piedras, vigas,
// vasijas, cuevas, muros de hiladas...). Cada píxel guarda además qué hay
// ahí: 0 cielo, 1 sedimento, 2 objeto, 3 muro, 4 roca o base, 5 pasto.
(function (root) {
    // ── Ruido determinista y tramado ─────────────────────────────────────────
    function hash(x, y, s) {
        let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
        h = Math.imul(h ^ (h >>> 13), 1103515245);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    }

    function noise(x, y, scale, s) {
        const fx = x / scale, fy = y / scale;
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        const tx = fx - x0, ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s);
        const c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
        return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }

    function mulberry32(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const dither = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

    // Valor continuo → uno de tres tonos (-1, 0, 1) con tramado ordenado
    function tone(v, x, y) {
        const q = v * 3 + (dither(x, y) - 0.5) * 0.9;
        return q < 1 ? -1 : (q < 2 ? 0 : 1);
    }

    const C = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    const shade = (c, k) => { const f = 1 + 0.07 * k; return [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)]; };
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const mod = (a, n) => ((a % n) + n) % n;
    const CARBON = [30, 25, 22];

    function crear(W, H, seed) {
        const rnd = mulberry32(seed * 9973 + 1);
        const R = (a, b) => a + rnd() * (b - a);
        const RI = (a, b) => Math.floor(R(a, b + 1));
        const pick = arr => arr[Math.floor(rnd() * arr.length)];

        const img = new Uint8ClampedArray(W * H * 4);
        const kind = new Uint8Array(W * H);
        const dentroImg = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
        const set = (x, y, c, k) => {
            x |= 0; y |= 0;
            if (!dentroImg(x, y)) return;
            const o = (y * W + x) * 4;
            img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; img[o + 3] = 255;
            if (k !== undefined) kind[y * W + x] = k;
        };
        const get = (x, y) => { const o = (y * W + x) * 4; return [img[o], img[o + 1], img[o + 2]]; };
        const kindAt = (x, y) => dentroImg(x, y) ? kind[y * W + x] : 0;

        // Contacto ondulado entre estratos: una altura por columna x
        const wave = (base, amp, irregular = 0) => {
            const f1 = R(1, 2.5), f2 = R(3, 6), p1 = R(0, 6.28), p2 = R(0, 6.28), s = RI(1, 1e6);
            const a = new Float32Array(W);
            for (let x = 0; x < W; x++) {
                a[x] = base + Math.sin(x / W * 6.283 * f1 + p1) * amp + Math.sin(x / W * 6.283 * f2 + p2) * amp * 0.35
                     + (irregular ? (noise(x, 0, 9, s) - 0.5) * irregular : 0);
            }
            return a;
        };

        // ── Formas: pinta una figura con contorno, bisel y sombra ──
        const filo = (dentro, dx, dy) => dentro(dx, dy) && (!dentro(dx - 1, dy) || !dentro(dx + 1, dy) || !dentro(dx, dy - 1) || !dentro(dx, dy + 1));
        function figura(cx, cy, ext, dentro, color, k = 2, sombra = true) {
            cx = Math.round(cx); cy = Math.round(cy);
            for (let dy = -ext; dy <= ext; dy++) for (let dx = -ext; dx <= ext; dx++) {
                if (!dentro(dx, dy) || !dentroImg(cx + dx, cy + dy)) continue;
                set(cx + dx, cy + dy, color(dx, dy, filo(dentro, dx, dy)), k);
            }
            if (sombra) {
                for (let dy = -ext; dy <= ext + 1; dy++) for (let dx = -ext; dx <= ext; dx++) {
                    if (dentro(dx, dy) || !dentro(dx, dy - 1)) continue;
                    if (kindAt(cx + dx, cy + dy) === 1) set(cx + dx, cy + dy, shade(get(cx + dx, cy + dy), -1.8));
                }
            }
        }

        // Piedra angulosa (de muro) o redondeada (canto)
        function piedra(cx, cy, rx, ry, base, redonda = false) {
            const cuts = [rnd() < 0.7, rnd() < 0.6, rnd() < 0.6, rnd() < 0.7], lim = (rx + ry) * R(0.55, 0.75);
            const dentro = redonda
                ? (dx, dy) => (dx * dx) / (rx * rx + 0.4) + (dy * dy) / (ry * ry + 0.4) <= 1
                : (dx, dy) => Math.abs(dx) <= rx && Math.abs(dy) <= ry &&
                    !(cuts[0] && -dx - dy > lim) && !(cuts[1] && dx - dy > lim) &&
                    !(cuts[2] && -dx + dy > lim) && !(cuts[3] && dx + dy > lim);
            const s = RI(1, 1e6);
            figura(cx, cy, Math.max(rx, ry) + 1, dentro, (dx, dy, borde) => {
                if (borde) return shade(base, -4.5);
                let k = tone(noise(dx + 50, dy + 50, 3, s), dx & 7, dy & 7) * 0.7;
                if (filo(dentro, dx, dy - 1)) k += 2;
                else if (filo(dentro, dx - 1, dy)) k += 1;
                else if (filo(dentro, dx, dy + 1)) k -= 1.8;
                else if (filo(dentro, dx + 1, dy)) k -= 1.2;
                return shade(base, k);
            });
        }

        // Horcón o tirante quemado, en cualquier ángulo
        function viga(cx, cy, largo, grosor, ang) {
            const c = Math.cos(ang), s = Math.sin(ang), hl = largo / 2, ht = grosor / 2, sd = RI(1, 1e6);
            const uv = (dx, dy) => [dx * c + dy * s, -dx * s + dy * c];
            const dentro = (dx, dy) => {
                const [u, v] = uv(dx, dy);
                const roto = (hash(Math.round(v * 2), u > 0 ? 1 : 2, sd) - 0.5) * 5;  // puntas astilladas
                return Math.abs(v) <= ht && Math.abs(u) <= hl - Math.max(0, roto);
            };
            figura(cx, cy, Math.ceil(hl + ht) + 1, dentro, (dx, dy, borde) => {
                if (borde) return [20, 15, 12];
                const [u, v] = uv(dx, dy);
                if (Math.abs(u) > hl - 5) return hash(cx + dx, cy + dy, sd) < 0.3 ? [52, 40, 32] : CARBON; // punta carbonizada
                if (mod(Math.floor(u / 4) * 3 + Math.floor(v + 9), 5) === 0 && hash(Math.floor(u / 4), 0, sd) < 0.5) return [26, 20, 16]; // grietas del carbón
                if (v < -ht + 1.5) return [96, 70, 50];                                                    // canto con luz
                const veta = Math.floor(v * 1.2 + noise(u, 0, 6, sd) * 2);
                return veta % 2 ? [70, 50, 36] : [58, 41, 30];
            });
        }

        // Vasija acostada (entera o rota) y puco
        function vasija(cx, cy, rx, ry, rota) {
            const base = C('#a5562f'), boca = rx - 2;
            const dentro = (dx, dy) => (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1 &&
                !(rota && dx > -rx * 0.1 && dy < -ry * 0.1 && hash(dx, dy, 5) < 0.85);
            figura(cx, cy, rx + 1, dentro, (dx, dy, borde) => {
                if (borde) return [70, 34, 18];
                if (dx >= boca && Math.abs(dy) < ry * 0.45) return [58, 28, 16];                 // boca
                if (dx >= boca - 2 && Math.abs(dy) < ry * 0.6) return shade(base, 1.8);         // labio
                if (rota && dx > -rx * 0.3 && dy < 0 && (dx * dx) / ((rx - 2) ** 2) + (dy * dy) / ((ry - 2) ** 2) <= 1) return [64, 32, 20]; // interior a la vista
                return shade(base, dy < -ry * 0.4 ? 1.6 : (dy > ry * 0.5 ? -1.4 : 0));
            });
        }
        function puco(cx, cy, rx, ry, color = '#9c4f2b') {
            const base = C(color);
            const dentro = (dx, dy) => dy >= 0 && (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
            figura(cx, cy, rx + 1, dentro, (dx, dy, borde) => {
                if (borde) return [66, 31, 17];
                if (dy === 1 && Math.abs(dx) < rx - 1) return [60, 30, 18];                    // interior
                return shade(base, dy === 2 ? 1.4 : (dy >= ry - 1 ? -1.2 : 0));
            });
        }
        function tiesto(cx, cy, colores = ['#a5562f', '#8a4a2c', '#b8683c']) {
            const l = RI(2, 4), col = pick(colores.map(C)), curva = rnd() < 0.5 ? 1 : -1;
            for (let i = -l; i <= l; i++) {
                const y = cy + (Math.abs(i) > l - 1 ? curva : 0);
                set(cx + i, y, col, 2);
                if (kindAt(cx + i, y + 1) === 1) set(cx + i, y + 1, shade(get(cx + i, y + 1), -1.5));
            }
        }

        // Cueva de animalito: abierta (agujero) o rellena de otro sedimento
        function cueva(cx, cy, rx, ry, abierta, relleno) {
            cx = Math.round(cx); cy = Math.round(cy);
            for (let dy = -ry - 2; dy <= ry + 2; dy++) for (let dx = -rx - 2; dx <= rx + 2; dx++) {
                const e = (dx / rx) ** 2 + (dy / ry) ** 2, x = cx + dx, y = cy + dy;
                if (!dentroImg(x, y) || kindAt(x, y) !== 1) continue;
                if (e <= 1) {
                    if (abierta) set(x, y, dy < -ry * 0.35 ? [16, 12, 10] : (dy > ry * 0.45 ? [52, 39, 30] : [28, 21, 17]));
                    else set(x, y, shade(relleno, tone(noise(x, y, 2.5, 7), x, y) + (e > 0.75 ? -1 : 0)));
                } else if (e <= 1.45) {
                    set(x, y, shade(get(x, y), abierta && dy > 0 ? 1.2 : -1.3));                  // borde
                }
            }
        }
        function tunel(x, y, pasos, relleno) {
            for (let i = 0; i < pasos; i++) {
                cueva(x, y, 3, 2.5, false, relleno);
                x += R(1, 2.5) * (rnd() < 0.5 ? 1 : -1) * 0.6 + 1.2;
                y += R(-1.2, 1.4);
            }
        }

        // Muro de hiladas de piedras: cada celda deja 1 px de junta abajo y a
        // la derecha. yTop / yBot: funciones de x que limitan el muro arriba y
        // abajo. faltan(x0, x1, y0, y1, fila) dice qué piedras ya se cayeron.
        // mezcla { pal, prob, paja }: algunas piezas de otro material (adobes
        // con paja, cantos...) entre las piedras.
        function aparejo(x0, x1, yTop, yBot, pal, mortero, hMin, hMax, wMin, wMax, faltan, mezcla = null) {
            let y = W, yMax = 0;
            for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) { y = Math.min(y, Math.floor(yTop(x))); yMax = Math.max(yMax, yBot(x)); }
            let fila = 0;
            while (y < yMax) {
                const h = RI(hMin, hMax);
                let x = x0 - RI(0, Math.floor(wMin / 2));
                while (x < x1) {
                    const w = RI(wMin, wMax);
                    if (!faltan(x, x + w, y, y + h, fila)) {
                        const base = pick(pal), adb = mezcla && rnd() < mezcla.prob ? pick(mezcla.pal) : null, color = adb || base;
                        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
                            if (xx < x0 || xx >= x1 || !dentroImg(xx, yy) || yy < yTop(xx) || yy >= yBot(xx)) continue;
                            const lx = xx - x, ly = yy - y;
                            const esquina = (lx === 0 || lx === w - 2) && (ly === 0 || ly === h - 2);
                            if (lx === w - 1 || ly === h - 1 || esquina) { set(xx, yy, mortero, 3); continue; }
                            let k = tone(noise(xx, yy, 3, x * 7 + y), xx, yy) * (adb ? 0.5 : 0.8);
                            if (ly === 0) k = 2; else if (lx === 0) k = 1; else if (ly === h - 2) k = -2; else if (lx === w - 2) k = -1.4;
                            if (adb && mezcla.paja && hash(xx, yy, 91) < 0.06) { set(xx, yy, [190, 160, 98], 3); continue; }
                            set(xx, yy, shade(color, k), 3);
                        }
                    }
                    x += w;
                }
                y += h; fila++;
            }
        }

        return {
            W, H, img, kind, rnd, R, RI, pick,
            set, get, kindAt, dentroImg, wave,
            filo, figura, piedra, viga, vasija, puco, tiesto, cueva, tunel, aparejo,
        };
    }

    const api = { hash, noise, mulberry32, dither, tone, C, shade, mix, mod, CARBON, crear };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.Pincel = api;
})(this);
