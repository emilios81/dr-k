// Ayudas para dibujar sprites en pixel art por código, a la misma escala que
// los estratos: cada píxel del dibujo se ve de 2x2 en el canvas.
const PixelArt = {
    // Ruido determinista 0..1 por píxel (el mismo patrón en cada cuadro)
    ruido(x, y, s = 0) {
        let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
        h = Math.imul(h ^ (h >>> 13), 1103515245);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    },

    // [r, g, b] aclarado u oscurecido por f, como '#rrggbb'
    tono(rgb, f) {
        return '#' + rgb.map(c => Math.max(0, Math.min(255, Math.round(c * f))).toString(16).padStart(2, '0')).join('');
    },

    // ¿(x, y) está dentro del polígono [[x, y], ...]?
    enPoligono(pts, x, y) {
        let dentro = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const [xi, yi] = pts[i], [xj, yj] = pts[j];
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) dentro = !dentro;
        }
        return dentro;
    },

    // Pasa una pieza a píxeles en un cuadro de S x S, girada `angulo`,
    // achicada `escala` y con centro en (cx, cy). forma(u, v) dice qué
    // material hay en cada punto de la pieza sin girar (o null/false); cada
    // píxel toma el que más lo cubre (muestreo 4x4). Devuelve el material
    // por píxel y, para cada píxel, su punto (u, v) en la pieza.
    rasterizar(S, angulo, forma, escala = 1, cx = S / 2, cy = S / 2) {
        const co = Math.cos(angulo), si = Math.sin(angulo);
        const uv = (x, y) => [(x * co + y * si) / escala, (-x * si + y * co) / escala];
        const tipo = new Array(S * S).fill(null);
        for (let j = 0; j < S; j++) {
            for (let i = 0; i < S; i++) {
                const votos = new Map();
                let mejor = null, n = 0;
                for (let sy = 0; sy < 4; sy++) {
                    for (let sx = 0; sx < 4; sx++) {
                        const p = forma(...uv(i + (sx + 0.5) / 4 - cx, j + (sy + 0.5) / 4 - cy));
                        if (!p) continue;
                        const k = (votos.get(p) || 0) + 1;
                        votos.set(p, k);
                        if (k > n) { n = k; mejor = p; }
                    }
                }
                if (n >= 6) tipo[j * S + i] = mejor;
            }
        }
        return { tipo, uv: (i, j) => uv(i + 0.5 - cx, j + 0.5 - cy) };
    },

    // Luz desde arriba a la izquierda para cualquier silueta: canto con luz
    // arriba y a la izquierda (3), canto en sombra abajo y a la derecha (0),
    // un segundo anillo de media sombra (1) y el resto, tono medio (2)
    relieve(tipo, S, i, j) {
        const hay = (x, y) => x >= 0 && y >= 0 && x < S && y < S && tipo[y * S + x] !== null;
        if (!hay(i - 1, j) || !hay(i, j - 1)) return 3;
        if (!hay(i + 1, j) || !hay(i, j + 1)) return 0;
        if (!hay(i + 2, j) || !hay(i, j + 2) || !hay(i + 1, j + 1)) return 1;
        return 2;
    },

    // Brillo para lo especial: un anillo de píxeles por fuera del contorno
    aura(grid, W, H, color) {
        const lleno = (x, y) => x >= 0 && y >= 0 && x < W && y < H && grid[y * W + x] !== null;
        const conBorde = (x, y) => lleno(x, y) || lleno(x - 1, y) || lleno(x + 1, y) || lleno(x, y - 1) || lleno(x, y + 1);
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const ctx = c.getContext('2d');
        ctx.fillStyle = color;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                if (conBorde(x, y)) continue;
                let cerca = false;
                for (let dy = -1; dy <= 1 && !cerca; dy++) {
                    for (let dx = -1; dx <= 1; dx++) if (conBorde(x + dx, y + dy)) { cerca = true; break; }
                }
                if (cerca) ctx.fillRect(x, y, 1, 1);
            }
        }
        return c;
    },

    // Grilla de colores (null = vacío) → canvas, con contorno de 1 píxel
    // alrededor de la silueta y, si se pide, una sombra corrida {dx, dy, alfa}
    lienzo(grid, W, H, contorno, sombra) {
        const lleno = i => grid[i] !== null;
        const borde = new Uint8Array(W * H);
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const i = y * W + x;
                if (lleno(i)) continue;
                if ((x > 0 && lleno(i - 1)) || (x < W - 1 && lleno(i + 1)) ||
                    (y > 0 && lleno(i - W)) || (y < H - 1 && lleno(i + W))) borde[i] = 1;
            }
        }

        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const ctx = c.getContext('2d');
        if (sombra) {
            ctx.fillStyle = `rgba(0, 0, 0, ${sombra.alfa})`;
            for (let i = 0; i < W * H; i++) {
                if (!lleno(i) && !borde[i]) continue;
                const x = i % W + sombra.dx, y = Math.floor(i / W) + sombra.dy;
                const j = y * W + x;
                if (x < W && y < H && !lleno(j) && !borde[j]) ctx.fillRect(x, y, 1, 1);
            }
        }
        for (let i = 0; i < W * H; i++) {
            if (!lleno(i) && !borde[i]) continue;
            ctx.fillStyle = lleno(i) ? grid[i] : contorno;
            ctx.fillRect(i % W, Math.floor(i / W), 1, 1);
        }
        return c;
    },
};
