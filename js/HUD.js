class HUD {
    constructor(gameWidth, gameHeight, levelManager, game) {
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.levelManager = levelManager;
        this.game = game;
        this.score = 0;
        this.highScore = 0;          // récord del sitio elegido (ver usarSitio)
        this.runStartHighScore = 0;  // para saber si hubo récord nuevo
        this.records = {};           // récords de los otros sitios, para sus tarjetas
        this.lives = 3;
        this.state = 'START';

        this.floatingTexts = [];
        this.trivias = [];           // datos curiosos del sitio elegido
        this.currentTrivia = "";
        this.levelTrivia = "";
        this.brushFinish = false; // el nivel terminó retirando los últimos bloques solos
        this.levelNote = null;    // aviso en la tarjeta del estrato (p. ej., una vida de regalo)
        this.tituloAlto = 0;      // alto de la imagen del título en la portada (lo fija Game)
        this.tarjetas = [];       // dónde quedó cada tarjeta de sitio en la portada, para tocarla
    }

    // El sitio elegido: sus datos curiosos y su récord (cada sitio tiene el suyo)
    usarSitio(sitio) {
        this.sitio = sitio;
        this.trivias = sitio.trivias;
        this.highScore = HUD.leerRecord(sitio);
        this.runStartHighScore = this.highScore;
        this.records = {};
    }

    static leerRecord(sitio) {
        try { return parseInt(localStorage.getItem(sitio.record), 10) || 0; } catch (e) { return 0; }
    }

    recordDe(sitio) {
        if (sitio === this.sitio) return this.highScore;
        if (!(sitio.id in this.records)) this.records[sitio.id] = HUD.leerRecord(sitio);
        return this.records[sitio.id];
    }

    // ¿Qué sitio está en ese punto de la portada?
    sitioEn(x, y) {
        const t = this.tarjetas.find(t => x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h);
        return t ? t.sitio : null;
    }

    rollTrivia() {
        this.currentTrivia = this.trivias[Math.floor(Math.random() * this.trivias.length)];
    }

    // Dato curioso ligado al nivel, para la tarjeta de entrada
    pickLevelTrivia(level) {
        let options = (level && level.trivia && level.trivia.length) ? level.trivia : null;
        this.levelTrivia = options
            ? this.trivias[options[Math.floor(Math.random() * options.length)]]
            : this.trivias[Math.floor(Math.random() * this.trivias.length)];
    }

    addFloatingText(text, x, y, color, size = 14, duration = 1.0) {
        this.floatingTexts.push({ text, x, y, color, size: size, life: duration, maxLife: duration });
    }

    formatScore(n) {
        return Math.floor(n).toLocaleString('es-AR');
    }

    update(dt) {
        // Actualizar HighScore Dinámicamente y persitirlo
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try { localStorage.setItem(this.sitio.record, Math.floor(this.highScore)); } catch (e) { /* sin almacenamiento */ }
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            let ft = this.floatingTexts[i];
            ft.y -= 40 * dt; 
            ft.life -= dt;
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        // En la portada no van la barra superior ni las palabras: solo el
        // título y la elección del sitio.
        if (this.state === 'START') {
            this.drawStartScreen(ctx);
            return;
        }

        const W = this.gameWidth;

        // --- 1. Franja superior (se lee igual sobre el cielo o el hueco) ---
        ctx.fillStyle = 'rgba(10, 7, 5, 0.65)';
        ctx.fillRect(0, 0, W, 96);

        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f1c40f'; // Color Dorado para Récord Histórico
        ctx.fillText('RÉCORD: ' + this.formatScore(this.highScore), 16, 28);
        ctx.fillStyle = '#ffcc99'; // Tono terroso/luz
        ctx.fillText('ACTUAL: ' + this.formatScore(this.score), 16, 50);

        // Nivel (centro): estrato y campaña
        ctx.textAlign = 'center';
        let lvl = this.levelManager.getCurrentLevel();
        let cycle = this.levelManager.currentCycle;
        ctx.fillText(`Nivel ${lvl.id} · ${lvl.name}`, W / 2, 28);
        if (cycle > 1) {
            ctx.font = '13px Courier New';
            ctx.fillStyle = '#bdae9a';
            ctx.fillText(`Campaña ${cycle}`, W / 2, 50);
        }

        // Vidas (derecha del campo; el botón de pausa queda sobre la columna del perfil)
        ctx.font = 'bold 16px Courier New';
        ctx.fillStyle = '#ffcc99';
        ctx.textAlign = 'right';
        let rightX = W - 16;
        ctx.fillText('VIDAS: ' + this.lives, rightX, 28);

        // Indicador discreto de mute
        if (this.game && this.game.sound && this.game.sound.muted) {
            ctx.font = '11px Courier New';
            ctx.fillStyle = '#7f8c8d';
            ctx.fillText('🔇 M', rightX, 50);
        }

        // --- 2. Feedback Corto (Floating texts) ---
        ctx.textAlign = 'center';
        this.floatingTexts.forEach(ft => {
            ctx.font = `bold ${ft.size}px Courier New`;
            ctx.fillStyle = ft.color;
            ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.globalAlpha = 1.0;
        });

        // --- 2.5 Progreso de Letras ---
        if (this.game && this.game.wordProgress) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Las palabras van una detrás de otra, centradas a la izquierda de
            // la cajita del secreto. Se completan en orden: la que está en
            // juego se ve más marcada que las que vienen después.
            const PASO = 18, HUECO = 30, yPos = 78;
            const words = Object.keys(this.game.wordsDef), secreto = this.sitio.secreto;
            const cajaW = secreto.length * 20 + 10, cajaX = W - 16 - cajaW;
            const largo = words.reduce((s, w) => s + w.length * PASO, 0) + HUECO * (words.length - 1);
            let letterX = (cajaX - 16) / 2 - largo / 2 + PASO / 2;
            let activeWord = this.game.activeWord ? this.game.activeWord() : null;

            words.forEach(w => {
                let wordChars = this.game.wordsDef[w];
                let progress = this.game.wordProgress[w];
                let isActive = (w === activeWord);

                for (let i = 0; i < wordChars.length; i++, letterX += PASO) {
                    if (progress[i]) {
                        ctx.fillStyle = '#e29578'; // Color terracota pastel
                        ctx.font = 'bold 18px Courier New';
                        ctx.fillText(wordChars[i], letterX, yPos);
                    } else {
                        ctx.fillStyle = isActive ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.18)';
                        ctx.font = '14px Courier New';
                        ctx.fillText(wordChars[i], letterX, yPos);

                        // Una rayita abajo para mostrar "hueco"
                        ctx.fillStyle = isActive ? 'rgba(226, 149, 120, 0.6)' : 'rgba(255, 255, 255, 0.1)';
                        ctx.fillRect(letterX - 6, yPos + 8, 12, 2);
                    }
                }
                letterX += HUECO;
            });

            let secretoProgress = this.game.secretoProgress;

            ctx.fillStyle = 'rgba(241, 196, 15, 0.1)';
            ctx.strokeStyle = 'rgba(241, 196, 15, 0.5)';
            ctx.lineWidth = 1;
            ctx.fillRect(cajaX, yPos - 12, cajaW, 24);
            ctx.strokeRect(cajaX, yPos - 12, cajaW, 24);

            for (let i = 0; i < secreto.length; i++) {
                let x = cajaX + 15 + i * 20;
                if (secretoProgress[i]) {
                    ctx.fillStyle = '#f1c40f'; // Gold
                    ctx.font = 'bold 18px Courier New';
                    ctx.shadowColor = '#f39c12';
                    ctx.shadowBlur = 5;
                } else {
                    ctx.fillStyle = 'rgba(241, 196, 15, 0.2)';
                    ctx.font = '16px Courier New';
                    ctx.shadowBlur = 0;
                }
                ctx.fillText(secreto[i], x, yPos);
            }
            ctx.restore();
        }

        // --- 3. Superposiciones Textuales Limpias ---
        if (this.state === 'GAMEOVER') {
            this.drawOverlay(ctx, 'EXCAVACIÓN FALLIDA', 'ESPACIO, clic o toque para volver al inicio', '#e74c3c');
            this.drawGameOverSummary(ctx);
        } else if (this.state === 'PAUSED') {
            this.drawOverlay(ctx, 'PAUSA', 'ESPACIO, P o clic para reanudar', '#3498db');
            if (this.currentTrivia) this.drawTriviaBox(ctx, this.currentTrivia);
        } else if (this.state === 'TRANSITION') {
            // Velo liviano: se tiene que ver cómo la cámara baja al estrato siguiente
            let last = this.levelManager.isLastLevel();
            this.drawOverlay(ctx, last ? this.sitio.fin : 'ESTRATO LIMPIO',
                last ? 'Excavación terminada · ¡campaña completa!' : 'Bajando al estrato siguiente...',
                last ? '#f1c40f' : '#2ecc71', 0.25);
            if (this.brushFinish) {
                ctx.fillStyle = '#ffcc99';
                ctx.font = '15px Courier New';
                ctx.fillText('Los últimos restos se retiraron con brocha', W / 2, 440);
            }
        } else if (this.state === 'START_LEVEL') {
            let nextLvl = this.levelManager.getCurrentLevel();
            this.drawOverlay(ctx, nextLvl.name, 'ESPACIO, clic o toque para lanzar', '#ffcc99', 0.55);
            if (this.levelNote) {
                ctx.fillStyle = '#2ecc71';
                ctx.font = 'bold 17px Courier New';
                ctx.fillText(this.levelNote, W / 2, 422);
            }
            if (this.levelTrivia) this.drawTriviaBox(ctx, this.levelTrivia);
        }
    }

    drawTriviaBox(ctx, text) {
        const W = this.gameWidth, y = 450;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(40, y, W - 80, 110);
        ctx.strokeStyle = '#e29578';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, y, W - 80, 110);

        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 18px Courier New';
        ctx.fillText('¿SABÍAS QUÉ?', W / 2, y + 30);

        ctx.fillStyle = '#ecf0f1';
        ctx.font = '16px Courier New';
        let lines = text.split('\n');
        lines.forEach((l, idx) => {
            ctx.fillText(l, W / 2, y + 62 + (idx * 22));
        });
    }

    // Portada: debajo del título, el nombre del sitio elegido y una tarjeta
    // por sitio, con su perfil en chico, para elegir dónde excavar. Al pie,
    // las instrucciones y los créditos.
    drawStartScreen(ctx) {
        const W = this.canvasWidth || this.gameWidth, H = this.gameHeight, th = this.tituloAlto;
        ctx.textAlign = 'center';

        // velo bajo el título: el campo de atrás no distrae
        ctx.fillStyle = 'rgba(12, 8, 6, 0.85)';
        ctx.fillRect(0, th, W, H - th);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#e8b860';
        ctx.font = 'bold 24px Courier New';
        ctx.fillText(this.sitio.nombre, W / 2, th + 30);
        ctx.shadowBlur = 0;

        const sitios = Sitios.orden.map(id => Sitios[id]);
        const pie = H - 150, gap = 24;
        const cw = (W - gap * (sitios.length + 1)) / sitios.length;
        const libre = pie - (th + 50) - 44;          // 44: el renglón de ayuda bajo las tarjetas
        const ch = Math.max(150, Math.min(340, libre));
        const cy = th + 50 + Math.max(0, (libre - ch) / 2);
        this.tarjetas = sitios.map((s, i) => ({ sitio: s, x: gap + i * (cw + gap), y: cy, w: cw, h: ch }));
        this.tarjetas.forEach(t => this.drawTarjeta(ctx, t.sitio, t.x, t.y, t.w, t.h, t.sitio === this.sitio));

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffcc99';
        ctx.font = 'bold 16px Courier New';
        ctx.fillText('← → o tocá un sitio  ·  ESPACIO o clic para excavar', W / 2, cy + ch + 30);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, pie, W, H - pie);

        ctx.fillStyle = '#cccccc';
        ctx.font = '14px Courier New';
        ctx.fillText('Mover: ← →, mouse o dedo  ·  Lanzar: ESPACIO o clic', W / 2, H - 125);
        ctx.fillText('Subir y bajar la zaranda: ↑ ↓, ruedita o deslizando el dedo', W / 2, H - 103);
        ctx.fillText('ESPACIO o P pausa  ·  M sonido', W / 2, H - 81);

        ctx.fillStyle = '#aaaaaa';
        ctx.font = '13px Courier New';
        ctx.fillText('Creador Dr. Emilio A. Villafañez — LATDAA, Escuela de Arqueología', W / 2, H - 55);
        ctx.fillText('Universidad Nacional de Catamarca · Fundación Azara', W / 2, H - 33);
    }

    // Tarjeta de un sitio: el perfil completo de su recinto en chico, el
    // nombre, la cultura y el récord. La elegida queda resaltada.
    drawTarjeta(ctx, sitio, x, y, w, h, elegida) {
        ctx.save();
        ctx.fillStyle = elegida ? 'rgba(52, 36, 24, 0.95)' : 'rgba(26, 18, 13, 0.9)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = elegida ? '#ffcc99' : '#4a3424';
        ctx.lineWidth = elegida ? 3 : 2;
        ctx.strokeRect(x, y, w, h);

        const m = this.game.miniatura(sitio), est = m.estratos;
        const top = Math.max(0, est[0] - 14), bottom = Math.min(m.canvas.height, est[est.length - 1] + 40);
        const ph = h - 20, s = ph / (bottom - top), pw = Math.min(w * 0.34, m.canvas.width * s);
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = elegida ? 1 : 0.55;
        ctx.drawImage(m.canvas, 0, top, pw / s, bottom - top, x + 10, y + 10, pw, ph);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 10.5, y + 10.5, pw - 1, ph - 1);

        const tx = x + pw + 28;
        ctx.textAlign = 'left';
        ctx.fillStyle = elegida ? '#ffcc99' : '#bdae9a';
        ctx.font = 'bold 19px Courier New';
        sitio.lineas.forEach((l, k) => ctx.fillText(l, tx, y + 32 + k * 24));
        ctx.fillStyle = elegida ? '#d8c4a8' : '#8f8170';
        ctx.font = '14px Courier New';
        sitio.detalle.forEach((l, k) => ctx.fillText(l, tx, y + 86 + k * 20));
        ctx.fillStyle = elegida ? '#f1c40f' : '#9a8240';
        ctx.fillText('Récord: ' + this.formatScore(this.recordDe(sitio)), tx, y + h - 40);
        if (elegida) {
            ctx.fillStyle = '#2ecc71';
            ctx.font = 'bold 15px Courier New';
            ctx.fillText('▶ EXCAVAR', tx, y + h - 16);
        }
        ctx.restore();
    }

    drawGameOverSummary(ctx) {
        ctx.textAlign = 'center';
        if (!this.game) return;

        const W = this.gameWidth, y = 470;
        let lvl = this.levelManager.getCurrentLevel();
        let cycle = this.levelManager.currentCycle;
        let beat = Math.floor(this.highScore) > Math.floor(this.runStartHighScore);
        let stats = this.game.stats;
        let finds = stats.finds;

        ctx.font = 'bold 18px Courier New';
        ctx.fillStyle = '#ecf0f1';
        ctx.fillText(`Puntaje final: ${this.formatScore(this.score)}`, W / 2, y);

        ctx.font = '14px Courier New';
        ctx.fillStyle = '#bdc3c7';
        ctx.fillText(`Récord: ${this.formatScore(this.highScore)}` + (beat ? '   ¡NUEVO RÉCORD!' : ''), W / 2, y + 28);
        ctx.fillText(`Último estrato: ${lvl.id} · ${lvl.name}` + (cycle > 1 ? ` (campaña ${cycle})` : ''), W / 2, y + 53);
        ctx.fillText(`Palabras completadas: ${stats.words}   ·   Secretos ${this.sitio.secreto}: ${stats.secretos}`, W / 2, y + 78);
        ctx.fillText('Hallazgos: ' + this.sitio.hallazgos.map(([t, nombre]) => `${finds[t] || 0} ${nombre}`).join(' · '), W / 2, y + 103);
    }

    drawOverlay(ctx, title, sub, color, alpha = 0.7) {
        const W = this.gameWidth;
        // el velo tapa solo el campo: el perfil del costado sigue a la vista
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(-20, -20, W + 20, this.gameHeight + 40);

        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = color;
        ctx.font = 'bold 36px Courier New';
        ctx.fillText(title, W / 2, 340);

        ctx.fillStyle = '#dddddd';
        ctx.font = '18px Courier New';
        ctx.fillText(sub, W / 2, 385);
        ctx.shadowBlur = 0;
    }
}
