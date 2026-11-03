class Input {
    constructor(canvas) {
        this.canvas = canvas;
        this.left = false;
        this.right = false;
        // Subir y bajar la zaranda con la soga: ↑ ↓ (o W S) mientras se
        // aprietan, y de a saltos con la ruedita o deslizando el dedo (dy)
        this.up = false;
        this.down = false;
        this.dy = 0;
        // Posición target absoluta del paddle en coordenadas internas del canvas
        // (null = no hay puntero/dedo activo, usar teclado).
        this.pointerX = null;
        this.fieldWidth = canvas ? canvas.width : 0; // ancho del campo (lo ajusta Game)

        // "Acción" = empezar, lanzar el cucharín o reanudar. Con la barra
        // espaciadora ('tecla') además pausa en pleno juego; tocar la
        // pantalla o hacer clic nunca pausa, para no detenerlo sin querer.
        // La pausa también va por P, Escape o el botón. El clic y el toque
        // pasan además dónde fueron (en coordenadas del canvas), para elegir
        // el sitio en la pantalla de inicio.
        this.actionCallbacks = [];
        this.muteToggleCallbacks = [];
        this.pauseCallbacks = [];
        // ← → (o A D) apretadas de a una: en la pantalla de inicio cambian de sitio
        this.navCallbacks = [];

        const gameKeys = new Set([
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'KeyA', 'KeyD', 'KeyW', 'KeyS',
            'Space', 'Enter', 'KeyM', 'KeyP', 'Escape'
        ]);

        window.addEventListener('keydown', (e) => {
            if (gameKeys.has(e.code)) e.preventDefault();

            if (e.code === 'ArrowLeft' || e.code === 'KeyA') { this.left = true; this.pointerX = null; }
            if (e.code === 'ArrowRight' || e.code === 'KeyD') { this.right = true; this.pointerX = null; }
            if (!e.repeat && (e.code === 'ArrowLeft' || e.code === 'KeyA')) this.navCallbacks.forEach(cb => cb(-1));
            if (!e.repeat && (e.code === 'ArrowRight' || e.code === 'KeyD')) this.navCallbacks.forEach(cb => cb(1));
            if (e.code === 'ArrowUp' || e.code === 'KeyW') this.up = true;
            if (e.code === 'ArrowDown' || e.code === 'KeyS') this.down = true;

            if (e.code === 'Space' && !e.repeat) {
                this.actionCallbacks.forEach(cb => cb('tecla'));
            }
            if (e.code === 'Enter' && !e.repeat) {
                this.actionCallbacks.forEach(cb => cb('enter'));
            }
            if (e.code === 'KeyM' && !e.repeat) {
                this.muteToggleCallbacks.forEach(cb => cb());
            }
            if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) {
                this.pauseCallbacks.forEach(cb => cb());
            }
        });

        window.addEventListener('keyup', (e) => {
            if (gameKeys.has(e.code)) e.preventDefault();
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.left = false;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') this.right = false;
            if (e.code === 'ArrowUp' || e.code === 'KeyW') this.up = false;
            if (e.code === 'ArrowDown' || e.code === 'KeyS') this.down = false;
        });

        if (canvas) this.bindPointer(canvas);
    }

    bindPointer(canvas) {
        const toCanvasX = (clientX) => {
            const rect = canvas.getBoundingClientRect();
            const scale = canvas.width / rect.width;
            return (clientX - rect.left) * scale;
        };
        const toCanvas = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            return { x: toCanvasX(clientX), y: (clientY - rect.top) * canvas.height / rect.height };
        };

        // Sobre el canvas, la zaranda va bajo el dedo. Desde la zona libre de
        // abajo, todo su ancho recorre el campo de punta a punta.
        const touchX = (touch, target) => {
            const zona = document.getElementById('touch-zone');
            if (zona && zona.contains(target)) {
                const r = zona.getBoundingClientRect();
                return (touch.clientX - r.left) / r.width * this.fieldWidth;
            }
            return toCanvasX(touch.clientX);
        };

        // Lo que se desliza el dedo en vertical sube o baja la zaranda
        // (en píxeles del canvas)
        let lastY = null;
        const touchDy = (touch) => {
            if (lastY !== null) {
                const rect = canvas.getBoundingClientRect();
                this.dy += (touch.clientY - lastY) * canvas.height / rect.height;
            }
            lastY = touch.clientY;
        };

        // Touch: arrastrar mueve, tocar lanza
        const onTouchStart = (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                const t = e.touches[0], zona = document.getElementById('touch-zone');
                this.pointerX = touchX(t, e.target);
                lastY = t.clientY;
                const donde = zona && zona.contains(e.target) ? null : toCanvas(t.clientX, t.clientY);
                this.actionCallbacks.forEach(cb => cb('toque', donde));
            }
        };
        const onTouchMove = (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                this.pointerX = touchX(e.touches[0], e.target);
                touchDy(e.touches[0]);
            }
        };
        const onTouchEnd = (e) => {
            e.preventDefault();
            if (e.touches.length === 0) { this.pointerX = null; lastY = null; }
        };

        // En toda la página, no solo en el canvas: en el celular vertical se
        // puede mover la zaranda desde la zona libre de abajo sin tapar el juego
        window.addEventListener('touchstart', onTouchStart, { passive: false });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd, { passive: false });
        window.addEventListener('touchcancel', onTouchEnd, { passive: false });

        // Mouse: la zaranda sigue al puntero sin apretar nada; clic lanza
        canvas.addEventListener('mousedown', (e) => {
            this.pointerX = toCanvasX(e.clientX);
            this.actionCallbacks.forEach(cb => cb('clic', toCanvas(e.clientX, e.clientY)));
        });
        canvas.addEventListener('mousemove', (e) => {
            this.pointerX = toCanvasX(e.clientX);
        });
        canvas.addEventListener('mouseleave', () => { this.pointerX = null; });
        // Ruedita: hacia abajo baja la zaranda, hacia arriba la sube
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.dy += Math.sign(e.deltaY) * 24;
        }, { passive: false });
    }

    // Lo que se pidió subir o bajar de a saltos desde la última vez
    takeDy() {
        const d = this.dy;
        this.dy = 0;
        return d;
    }

    onAction(callback) {
        this.actionCallbacks.push(callback);
    }

    onMuteToggle(callback) {
        this.muteToggleCallbacks.push(callback);
    }

    onPause(callback) {
        this.pauseCallbacks.push(callback);
    }

    onNav(callback) {
        this.navCallbacks.push(callback);
    }
}
