// El HUD del celular y la tablet. En la compu los textos se dibujan sobre el
// juego, pero en una pantalla chica quedarían ilegibles: acá van en la barra
// de arriba y en capas de la página, con letra de tamaño real y botones
// grandes para el dedo. En el lienzo quedan solo los textos que saltan al
// juntar algo. La página se toca solo cuando algo cambió (ver poner).
class HUDMovil extends HUD {
    constructor(gameWidth, gameHeight, levelManager, game) {
        super(gameWidth, gameHeight, levelManager, game);
        const $ = id => document.getElementById(id);
        this.el = {
            nivel: $('b-nivel'), puntos: $('b-puntos'), record: $('b-record'), vidas: $('b-vidas'),
            letras: $('b-letras'), sonido: $('b-sonido'), capa: $('capa'),
            inicio: $('inicio'), sitio: $('i-sitio'), tarjetas: $('i-tarjetas'), excavar: $('i-excavar'),
        };
        this.visto = {};   // lo último que se puso en cada lugar
        this.tarjetasListas = false;

        this.el.excavar.addEventListener('click', () => {
            GameMovil.pantallaCompleta();
            this.game.handleAction('toque', null);
        });
        this.el.sonido.addEventListener('click', () => {
            this.game.sound.init();
            this.game.sound.toggleMute();
        });
        this.el.capa.addEventListener('click', (e) => {
            const b = e.target.closest('button[data-accion]');
            if (b) this.accion(b.dataset.accion);
        });
    }

    // Botones de las capas: seguir después de la pausa, otra campaña o volver a la portada
    accion(a) {
        const g = this.game;
        g.sound.init();
        if (a === 'seguir') {
            if (this.state === 'PAUSED') g.togglePause();
        } else if (a === 'otra') {
            g.resetGame();
            g.enterLevel();
        } else if (a === 'inicio') {
            g.sound.stopMusic();
            g.resetGame();
            this.state = 'START';
        }
    }

    // ── En el lienzo: los textos que saltan, más grandes que en la compu ──
    draw(ctx) {
        const angosto = this.canvasWidth <= this.gameWidth, k = angosto ? 1.5 : 1.25, W = this.gameWidth;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;
        this.floatingTexts.forEach(ft => {
            let size = Math.round(ft.size * k);
            ctx.font = `bold ${size}px Courier New`;
            let ancho = ctx.measureText(ft.text).width;
            if (ancho > W - 24) {                       // que entre en el campo
                size = Math.floor(size * (W - 24) / ancho);
                ctx.font = `bold ${size}px Courier New`;
                ancho = ctx.measureText(ft.text).width;
            }
            const x = Math.max(12 + ancho / 2, Math.min(W - 12 - ancho / 2, ft.x));
            ctx.fillStyle = ft.color;
            ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
            ctx.fillText(ft.text, x, ft.y);
        });
        ctx.restore();
        this.pintarPagina();
    }

    // ── En la página ──
    pintarPagina() {
        const g = this.game, enInicio = this.state === 'START';
        if (this.visto.inicio !== enInicio) {
            this.el.inicio.hidden = !enInicio;
            this.visto.inicio = enInicio;
        }
        if (enInicio) this.pintarInicio();

        const lvl = this.levelManager.getCurrentLevel(), ciclo = this.levelManager.currentCycle;
        this.poner('nivel', `${lvl.id}. ${lvl.name}` + (ciclo > 1 ? ` · camp. ${ciclo}` : ''));
        this.poner('puntos', 'Puntos ' + this.formatScore(this.score));
        this.poner('record', 'Récord ' + this.formatScore(this.highScore));
        this.poner('vidas', '♥ ' + this.lives);
        this.poner('sonido', g.sound && g.sound.muted ? '🔇' : '🔊');
        this.ponerHTML('letras', this.letrasHTML());

        const capa = this.capa();
        this.ponerHTML('capa', capa.html);
        this.el.capa.hidden = !capa.html;
        this.el.capa.className = capa.liviana ? 'liviana' : '';
    }

    poner(clave, texto) {
        if (this.visto[clave] === texto) return;
        this.el[clave].textContent = texto;
        this.visto[clave] = texto;
    }

    ponerHTML(clave, html) {
        if (this.visto[clave] === html) return;
        this.el[clave].innerHTML = html;
        this.visto[clave] = html;
    }

    // Las palabras del sitio (la que está en juego, más marcada) y el secreto dorado
    letrasHTML() {
        const g = this.game, activa = g.activeWord();
        const palabras = Object.keys(g.wordsDef).map(w =>
            `<span class="palabra${w === activa ? ' activa' : ''}">` +
            [...w].map((ch, i) => `<i${g.wordProgress[w][i] ? ' class="ok"' : ''}>${ch}</i>`).join('') + '</span>');
        const secreto = '<span class="secreto">' +
            [...this.sitio.secreto].map((ch, i) => `<i${g.secretoProgress[i] ? ' class="ok"' : ''}>${ch}</i>`).join('') + '</span>';
        return palabras.join('') + secreto;
    }

    // Lo que va sobre el juego en cada momento ({ html, liviana })
    capa() {
        const dato = t => t ? `<div class="dato"><b>¿Sabías qué?</b>${HUDMovil.texto(t)}</div>` : '';
        switch (this.state) {
            case 'START_LEVEL': {
                const lvl = this.levelManager.getCurrentLevel();
                return { html: `<h2>${lvl.name}</h2>` +
                    (this.levelNote ? `<p class="nota">${HUDMovil.texto(this.levelNote)}</p>` : '') +
                    dato(this.levelTrivia) + '<p class="pista">Tocá la pantalla para lanzar el cucharín</p>' };
            }
            case 'PAUSED':
                return { html: '<h2>Pausa</h2>' + dato(this.currentTrivia) +
                    '<div class="botonera"><button type="button" class="principal" data-accion="seguir">▶ Seguir</button>' +
                    '<button type="button" data-accion="inicio">Salir al inicio</button></div>' };
            case 'TRANSITION': {
                const ultimo = this.levelManager.isLastLevel();
                return { liviana: true, html: (ultimo
                    ? `<h2 class="oro">${this.sitio.fin}</h2><p class="sub">Excavación terminada · ¡campaña completa!</p>`
                    : '<h2 class="verde">Estrato limpio</h2><p class="sub">Bajando al estrato siguiente...</p>') +
                    (this.brushFinish ? '<p class="sub">Los últimos restos se retiraron con brocha</p>' : '') };
            }
            case 'GAMEOVER':
                return { html: '<h2 class="rojo">Excavación fallida</h2>' + this.resumenHTML() +
                    '<div class="botonera"><button type="button" class="principal" data-accion="otra">Otra campaña</button>' +
                    '<button type="button" data-accion="inicio">Volver al inicio</button></div>' };
        }
        return { html: '' };
    }

    resumenHTML() {
        const g = this.game, lvl = this.levelManager.getCurrentLevel(), ciclo = this.levelManager.currentCycle;
        const nuevo = Math.floor(this.highScore) > Math.floor(this.runStartHighScore);
        const finds = g.stats.finds;
        return '<div class="resumen">' +
            `<div class="total">Puntaje final: ${this.formatScore(this.score)}</div>` +
            `<div>Récord: ${this.formatScore(this.highScore)}${nuevo ? ' <span class="nuevo">¡nuevo récord!</span>' : ''}</div>` +
            `<div>Último estrato: ${lvl.id} · ${lvl.name}${ciclo > 1 ? ` (campaña ${ciclo})` : ''}</div>` +
            `<div>Palabras: ${g.stats.words} · Secretos ${this.sitio.secreto}: ${g.stats.secretos}</div>` +
            '<div>' + this.sitio.hallazgos.map(([t, nombre]) => `${finds[t] || 0} ${nombre}`).join(' · ') + '</div>' +
            '</div>';
    }

    // ── La portada: una tarjeta por sitio, con el perfil de su recinto en chico ──
    pintarInicio() {
        if (!this.tarjetasListas) this.armarTarjetas();
        this.poner('sitio', this.sitio.nombre);
        const clave = this.sitio.id + ':' + Sitios.orden.map(id => this.recordDe(Sitios[id])).join(',');
        if (this.visto.tarjetas === clave) return;
        this.visto.tarjetas = clave;
        this.el.tarjetas.querySelectorAll('.tarjeta').forEach(b => {
            const s = Sitios[b.dataset.sitio];
            b.classList.toggle('elegida', s === this.sitio);
            b.setAttribute('aria-pressed', s === this.sitio ? 'true' : 'false');
            b.querySelector('.t-record').textContent = 'Récord: ' + this.formatScore(this.recordDe(s));
        });
    }

    armarTarjetas() {
        this.tarjetasListas = true;
        Sitios.orden.forEach(id => {
            const s = Sitios[id], b = document.createElement('button');
            b.type = 'button';
            b.className = 'tarjeta';
            b.dataset.sitio = id;
            b.innerHTML = '<canvas width="222" height="408"></canvas><span class="t-texto">' +
                `<span class="t-nombre">${s.lineas.join('<br>')}</span>` +
                `<span class="t-detalle">${s.detalle.join('<br>')}</span><span class="t-record"></span></span>`;
            // el perfil completo del recinto, de la superficie a la base
            const m = this.game.miniatura(s), c = b.querySelector('canvas'), ctx = c.getContext('2d'), est = m.estratos;
            const top = Math.max(0, est[0] - 14), bottom = Math.min(m.canvas.height, est[est.length - 1] + 40);
            const k = c.height / (bottom - top);
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(m.canvas, 0, top, c.width / k, bottom - top, 0, 0, c.width, c.height);
            b.addEventListener('click', () => {
                this.game.sound.init();
                this.game.elegirSitio(s);
            });
            this.el.tarjetas.appendChild(b);
        });
    }

    // Texto común como HTML (los datos curiosos traen saltos de línea pensados para la compu)
    static texto(t) {
        return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, ' ');
    }
}
