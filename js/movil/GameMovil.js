// El juego en el celular y la tablet: la misma excavación que en la compu
// (Game), con el control con el dedo (InputMovil), el HUD en la página
// (HUDMovil) y la pantalla repartida en tres franjas: barra arriba, juego en
// el medio y zona para el pulgar abajo.
//
// En el celular parado no entra la columna del perfil al costado (el juego
// quedaría chiquito): el lienzo es solo el campo y la estratigrafía completa
// va en una tira angosta sobre el muro derecho, que no es zona de juego. En
// la tablet sí entra, como en la compu.
class GameMovil extends Game {
    static ANGOSTO = 0.62;     // con la zona más angosta que esto (ancho / alto) no entra la columna
    static PAD_CELULAR = 150;  // alto mínimo de la zona del pulgar (px de pantalla)
    static PAD_TABLET = 110;
    static TIRA_W = 34;        // ancho de la tira del perfil, en px del lienzo

    crearInput(canvas) {
        return new InputMovil(canvas);
    }

    crearHUD() {
        return new HUDMovil(this.width, this.height, this.levelManager, this);
    }

    constructor(canvas) {
        super(canvas);
        this.input.zaranda = this.player;
        this.estadoVisto = null;
        this.vidasVistas = this.hud.lives;
        this.bloqueo = null;   // para que la pantalla no se apague mientras se juega
        document.addEventListener('visibilitychange', () => this.mantenerPantalla());
    }

    // Cómo repartir la pantalla: si entra la columna del perfil, el alto lógico
    // del lienzo (como en la compu, entre 720 y 1080) y su tamaño en la pantalla
    static medidas() {
        const zona = document.getElementById('zona');
        const vw = zona.clientWidth, vh = zona.clientHeight;
        const apaisada = vw > vh, angosto = vw / vh < GameMovil.ANGOSTO;
        const pad = apaisada ? 0 : (angosto ? GameMovil.PAD_CELULAR : GameMovil.PAD_TABLET);
        const W = angosto ? Game.FIELD_W : Game.CANVAS_W, libre = Math.max(200, vh - pad);
        const H = Math.max(720, Math.min(1080, Math.round(W * libre / vw / 8) * 8));
        const k = Math.min(vw / W, libre / H);
        return { W, H, ancho: Math.floor(W * k), alto: Math.floor(H * k), sobra: vh - Math.floor(H * k) };
    }

    fitContainer() {
        const m = GameMovil.medidas(), cont = this.canvas.parentElement;
        cont.style.width = m.ancho + 'px';
        cont.style.height = m.alto + 'px';
        document.getElementById('pad').classList.toggle('chico', m.sobra < 70);
    }

    // La pantalla cambió (se giró la tablet, apareció la barra del navegador...)
    resize() {
        const m = GameMovil.medidas();
        if (m.W !== this.canvasWidth) {
            this.canvas.width = m.W;   // con o sin la columna del perfil
            this.canvasWidth = this.hud.canvasWidth = m.W;
        }
        if (m.H !== this.height) {
            if (this.hud.state === 'TRANSITION') this.pendingHeight = m.H;
            else this.applyHeight(m.H);
        }
        this.fitContainer();
    }

    drawPanel(ctx) {
        if (this.canvasWidth > this.width) super.drawPanel(ctx);
        else if (this.hud.state !== 'START') this.drawTira(ctx);
    }

    // Tira del perfil sobre el muro derecho: una franja del medio del recinto,
    // de la superficie a la base, con el estrato en juego recuadrado
    drawTira(ctx) {
        const ex = this.excavation, L = ex.L, w = GameMovil.TIRA_W;
        const x = this.width - w - 7, y = 10, h = this.height - 20;
        const top = Math.max(0, Math.floor(Math.min(...L[0])) - 6);
        const bottom = Math.min(ex.H, Math.ceil(ex.meanOf(ex.ult)) + 40);
        const s = h / (bottom - top), cropW = w / s;
        const e = this.levelManager.getCurrentLevel().estrato;
        const a = y + (ex.meanOf(e - 1) - top) * s, b = y + (ex.meanOf(e) - top) * s;
        ctx.save();
        ctx.fillStyle = 'rgba(10, 7, 5, 0.85)';
        ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(ex.canvas, (ex.W - cropW) / 2, top, cropW, bottom - top, x, y, w, h);
        ctx.fillStyle = 'rgba(10, 7, 5, 0.45)';            // lo que no está en juego, más apagado
        ctx.fillRect(x, y, w, a - y);
        ctx.fillRect(x, b, w, y + h - b);
        ctx.strokeStyle = '#ffcc99';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 1.5, a, w + 3, b - a);
        ctx.restore();
    }

    update(dt) {
        super.update(dt);
        const vidas = this.hud.lives;
        if (vidas < this.vidasVistas) GameMovil.vibrar([45, 35, 70]);   // se perdió el cucharín
        else if (vidas > this.vidasVistas) GameMovil.vibrar([20, 40, 20]);
        this.vidasVistas = vidas;
        if (this.hud.state !== this.estadoVisto) {
            this.estadoVisto = this.hud.state;
            this.mantenerPantalla();
        }
    }

    // Cada estrato y cada campaña arrancan con la zaranda en el medio: se
    // olvida a dónde la había mandado el dedo
    startNextLevel() {
        super.startNextLevel();
        this.input.pointerX = null;
    }

    resetGame() {
        super.resetGame();
        this.input.pointerX = null;
    }

    catchPowerup(d) {
        super.catchPowerup(d);
        GameMovil.vibrar(18);
    }

    // Mientras se juega, la pantalla no se apaga sola
    async mantenerPantalla() {
        const jugando = !document.hidden && ['PLAYING', 'START_LEVEL', 'TRANSITION'].includes(this.hud.state);
        try {
            if (jugando && !this.bloqueo && navigator.wakeLock) {
                this.bloqueo = await navigator.wakeLock.request('screen');
                this.bloqueo.addEventListener('release', () => { this.bloqueo = null; });
            } else if (!jugando && this.bloqueo) {
                await this.bloqueo.release();
                this.bloqueo = null;
            }
        } catch (e) { /* sin permiso: la pantalla se apaga como siempre */ }
    }

    static vibrar(patron) {
        try { if (navigator.vibrate) navigator.vibrate(patron); } catch (e) { /* sin vibración */ }
    }

    // Al empezar, pantalla completa en celulares y tablets (si el navegador
    // deja; instalada como app ya lo está) y, en el celular, siempre parado
    static pantallaCompleta() {
        const instalada = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
        if (instalada || !matchMedia('(pointer: coarse)').matches || document.fullscreenElement) return;
        const el = document.documentElement;
        if (!el.requestFullscreen) return;
        el.requestFullscreen({ navigationUI: 'hide' }).then(() => {
            if (Math.min(screen.width, screen.height) < 600 && screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('portrait').catch(() => {});
            }
        }).catch(() => {});
    }
}
