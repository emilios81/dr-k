class Game {
    // El canvas tiene el campo de juego a la izquierda y, a la derecha, la
    // columna con el perfil completo. El alto se adapta a la pantalla.
    static FIELD_W = 720;
    static PANEL_W = 180;
    static CANVAS_W = Game.FIELD_W + Game.PANEL_W;
    static BASE_BALL_SPEED = 350;
    // El cucharín acelera hasta este extra a medida que se excava el nivel
    static SPEED_RAMP = 0.20;
    static TRANSITION_TIME = 2.5; // segundos de "ESTRATO LIMPIO" (la cámara baja al siguiente)
    // Con este resto de bloques (o menos) los últimos titilan para encontrarlos,
    // y si pasan FINISH_WAIT segundos sin romper ninguno se retiran "con brocha"
    static FINISH_FRACTION = 0.04;
    static FINISH_WAIT = 12;
    // La zaranda se sube hasta SUBIR_MAX px sobre su altura normal y se baja
    // hasta quedar a HOLGURA px de lo que tenga debajo
    static SUBIR_MAX = 40;
    static HOLGURA = 80;
    // Lo importante sale seguro en cada estrato, repartido a lo largo de la
    // excavación (ver planEstrato): letras de la palabra en juego, una letra
    // dorada del secreto (PPQ, INTI), la zaranda amplia y un poder de herramientas (dos en los
    // estratos grandes, de más de PLAN_BLOQUES_EXTRA bloques)
    static PLAN_LETRAS = 3;
    static PLAN_BLOQUES_EXTRA = 60;
    // Además, al azar, alguna letra suelta entre los hallazgos
    static LETTER_CHANCE = 0.12;
    // El carbón para C14 (+1 vida) sale como mucho una vez por estrato, con esta probabilidad
    static LIFE_CHANCE = 0.6;
    // Tras estos estratos seguidos sin juntar una vida, el equipo recupera una
    static LIFE_REGEN_LEVELS = 2;
    // La portada (title_bg) se corta a esta altura, justo debajo del rombo:
    // más abajo trae escrito "Pueblo Perdido de la Quebrada"
    static TITULO_CORTE = 518 / 720;

    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvasWidth = canvas.width;   // campo + columna del perfil
        this.width = Game.FIELD_W;         // solo el campo de juego
        this.height = canvas.height;
        this.pendingHeight = null;

        this.assets = new Assets();
        this.assetsLoaded = false;
        this.assetsProgress = 0;

        this.input = this.crearInput(canvas);
        this.input.fieldWidth = Game.FIELD_W;
        this.levelManager = new LevelManager();
        this.hud = this.crearHUD();
        this.hud.canvasWidth = this.canvasWidth;
        this.particles = new ParticleSystem(); // NUEVO: Game Feel kinestésico
        this.player = new Player(this.width, this.height);
        this.sound = new SoundManager();

        // Un recinto del sitio elegido que se excava de arriba hacia abajo;
        // cada campaña, uno nuevo (ver Sitios.js y usarSitio)
        this.excavation = new Excavation(this.width, this.height);
        this.player.minX = this.excavation.minX;
        this.player.maxX = this.excavation.maxX;
        this.miniaturas = {};   // perfil chico de cada sitio, para elegirlo en la portada
        this.usarSitio(Sitios.elegido());

        this.lastTime = 0;
        this.transitionTimer = 0;

        this.input.onAction((source, donde) => this.handleAction(source, donde));
        this.input.onNav((paso) => { if (this.hud.state === 'START') this.cambiarSitio(paso); });
        this.input.onMuteToggle(() => {
            if (this.sound) this.sound.toggleMute();
        });
        this.input.onPause(() => this.togglePause());

        // Auto-pausa al perder foco (cambio de pestaña, minimizar)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.hud.state === 'PLAYING') {
                this.hud.state = 'PAUSED';
                if (this.sound) this.sound.stopMusic();
                if (this.hud.rollTrivia) this.hud.rollTrivia();
            }
        });

        // Botón de pausa visual (móvil)
        this.pauseBtn = document.getElementById('pauseBtn');
        if (this.pauseBtn) {
            const pauseHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.pauseBtn.blur();   // que la barra espaciadora no lo vuelva a apretar
                this.togglePause();
            };
            this.pauseBtn.addEventListener('click', pauseHandler);
            this.pauseBtn.addEventListener('touchstart', pauseHandler, { passive: false });
        }
    }

    // El control y el HUD; la app para celular y tablet (Dr. K movil) los
    // cambia por los suyos, para el dedo
    crearInput(canvas) {
        return new Input(canvas);
    }

    crearHUD() {
        return new HUD(this.width, this.height, this.levelManager, this);
    }

    // Prepara una campaña en el sitio: sus niveles, sus palabras y un recinto nuevo
    usarSitio(sitio) {
        this.sitio = sitio;
        this.levelManager.usar(sitio.niveles);
        this.hud.usarSitio(sitio);
        this.wordsDef = {};
        sitio.palabras.forEach(w => { this.wordsDef[w] = w; });
        this.resetProgress();
        this.excavation.generate(Game.newSeed(), sitio.perfil);
        this.initLevel();
        this.balls = [this.newBall()];
        this.drops = [];
    }

    // En la portada: elegir otro sitio (con ← → se pasa al de al lado)
    elegirSitio(sitio) {
        if (sitio === this.sitio) return;
        Sitios.recordar(sitio.id);
        this.usarSitio(sitio);
    }

    cambiarSitio(paso) {
        const orden = Sitios.orden, i = orden.indexOf(this.sitio.id);
        this.elegirSitio(Sitios[orden[(i + paso + orden.length) % orden.length]]);
    }

    // Perfil chico del sitio (siempre el mismo recinto), para su tarjeta en la portada
    miniatura(sitio) {
        if (!this.miniaturas[sitio.id]) {
            const p = sitio.perfil.pintarPerfil(7, sitio.perfil.ALTO_DIBUJO);
            const canvas = document.createElement('canvas');
            canvas.width = p.width;
            canvas.height = p.height;
            const ctx = canvas.getContext('2d'), img = ctx.createImageData(p.width, p.height);
            img.data.set(p.data);
            ctx.putImageData(img, 0, 0);
            this.miniaturas[sitio.id] = { canvas, estratos: p.estratos };
        }
        return this.miniaturas[sitio.id];
    }

    // Progreso de letras y estadísticas de la partida (se reinician al perder)
    resetProgress() {
        this.wordProgress = {};
        for (let w in this.wordsDef) {
            this.wordProgress[w] = Array(this.wordsDef[w].length).fill(false);
        }
        this.secretoProgress = Array(this.sitio.secreto.length).fill(false); // letras doradas (PPQ, INTI...)
        this.stats = { words: 0, secretos: 0, finds: {} };
        this.estratosSinVida = 0;   // estratos terminados seguidos sin juntar una vida
        this.vidaTomada = false;    // ¿se juntó una vida en este estrato?
    }

    static newSeed() {
        return Math.floor(Math.random() * 1e6);
    }

    // Prepara el estrato del nivel actual como bloques
    initLevel() {
        const lvl = this.levelManager.getCurrentLevel();
        this.excavation.loadStratum(lvl.estrato, lvl);
        this.sinRomper = 0;   // segundos jugando sin sacar un bloque
        // en la zaranda se ve la tierra del estrato que se está excavando
        this.player.setSoil(this.excavation.soilColor());
        this.planEstrato();
    }

    // Lo importante de este estrato, cada cosa en un punto del avance de la
    // excavación (fracción de bloques sacados). Van en orden al azar, sin
    // dos poderes uno detrás del otro, y repartidas parejo entre el 5 % y
    // el 90 %, así nunca salen dos seguidas.
    planEstrato() {
        const plan = [];
        for (let i = 0; i < Game.PLAN_LETRAS; i++) plan.push('letra');
        plan.push('oro', 'pw_zaranda', Math.random() < 0.65 ? 'pw_multi' : 'pw_triple');
        if (this.excavation.totalBricks > Game.PLAN_BLOQUES_EXTRA) plan.push(Math.random() < 0.5 ? 'pw_zaranda' : 'pw_multi');
        if (Math.random() < Game.LIFE_CHANCE) plan.push('pw_vida');
        const pegados = () => plan.some((t, i) => i > 0 && t.startsWith('pw_') && plan[i - 1].startsWith('pw_'));
        for (let intento = 0; intento < 50 && (intento === 0 || pegados()); intento++) {
            for (let i = plan.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [plan[i], plan[j]] = [plan[j], plan[i]];
            }
        }
        this.plan = plan.map((tipo, i) => ({ tipo, en: 0.05 + 0.85 * (i + 0.35 + Math.random() * 0.3) / plan.length }));
    }

    // Velocidad del cucharín: sube por ciclo y, dentro del nivel, a medida que se excava
    ballSpeed() {
        return Game.BASE_BALL_SPEED * this.levelManager.getBallSpeedMultiplier() *
            (1 + Game.SPEED_RAMP * this.excavation.clearedFraction());
    }

    newBall(tool) {
        let ball = new Ball(this.width, this.height, this.player, tool);
        ball.speed = this.ballSpeed();
        ball.minX = this.excavation.minX;
        ball.maxX = this.excavation.maxX;
        return ball;
    }

    // Muestra la tarjeta del nivel (nombre + dato curioso) antes de lanzar
    enterLevel() {
        this.hud.pickLevelTrivia(this.levelManager.getCurrentLevel());
        this.hud.state = 'START_LEVEL';
    }

    togglePause() {
        if (this.hud.state === 'PLAYING') {
            this.hud.state = 'PAUSED';
            if (this.sound) this.sound.stopMusic();
            if (this.hud.rollTrivia) this.hud.rollTrivia();
        } else if (this.hud.state === 'PAUSED') {
            this.hud.state = 'PLAYING';
            if (this.sound) this.sound.startMusic();
        }
    }

    // ESPACIO, clic o toque: empezar, lanzar o reanudar. En pleno juego, la
    // barra espaciadora además pausa; el clic y el toque no, para no frenar
    // el juego sin querer. En la portada, tocar un sitio lo elige y arranca
    // ahí; después de perder se vuelve a la portada (para cambiar de sitio).
    handleAction(source, donde) {
        if (this.sound) this.sound.init(); // Inicializar contexto de audio por interacción

        let state = this.hud.state;
        if (state === 'START') {
            const tocado = donde ? this.hud.sitioEn(donde.x, donde.y) : null;
            if (tocado) this.elegirSitio(tocado);
            this.enterLevel();
        } else if (state === 'GAMEOVER') {
            this.resetGame();
            this.hud.state = 'START';
        } else if (state === 'START_LEVEL') {
            this.hud.state = 'PLAYING';
            this.hud.levelNote = null;
            this.balls.forEach(b => b.launch());
            if (this.sound) this.sound.startMusic();
        } else if (state === 'PLAYING') {
            let attachedBall = this.balls.find(b => !b.active);
            if (attachedBall) attachedBall.launch();
            else if (source === 'tecla') this.togglePause();
        } else if (state === 'PAUSED') {
            this.togglePause();
        }
    }

    resetGame() {
        this.hud.score = 0;
        this.hud.lives = 3;
        this.hud.floatingTexts = [];
        this.hud.brushFinish = false;
        this.hud.levelNote = null;
        this.hud.runStartHighScore = this.hud.highScore;
        this.particles.particles = [];
        this.player.powerTimer = 0;
        this.player.width = this.player.baseWidth;
        this.player.x = this.width / 2 - this.player.baseWidth / 2;
        this.player.y = Player.yFor(this.height);

        // Campaña nueva en el mismo sitio: otro recinto, y palabras, letras y
        // estadísticas desde cero
        this.usarSitio(this.sitio);
    }

    checkDrops(dt) {
        for (let i = this.drops.length - 1; i >= 0; i--) {
            let d = this.drops[i];
            d.update(dt);

            let caught = d.y + d.height >= this.player.y && d.y <= this.player.y + this.player.height &&
                         d.x + d.width >= this.player.x && d.x <= this.player.x + this.player.width;

            if (caught) {
                this.catchDrop(d);
                this.drops.splice(i, 1);
            } else if (d.y + d.height < 0) {
                this.drops.splice(i, 1);
            }
        }
    }

    catchDrop(d) {
        if (d.type === 'letter_normal') {
            this.catchLetter(d);
        } else if (d.type === 'letter_gold') {
            this.catchGoldLetter(d);
        } else if (d.isPowerup) {
            this.catchPowerup(d);
        } else if (d.good) {
            if (this.sound) this.sound.letterNormalCatch();
            this.hud.score += d.value;
            this.stats.finds[d.type] = (this.stats.finds[d.type] || 0) + 1;
            this.hud.addFloatingText('+' + d.value, d.x, this.player.y + this.player.height + 30, '#2ecc71');
        } else {
            if (this.sound) this.sound.loseLife();
            this.hud.score -= d.penalty;
            if (this.hud.score < 0) this.hud.score = 0;
            this.player.hitTimer = 0.4;
            this.hud.addFloatingText('-' + d.penalty, d.x, this.player.y + this.player.height + 30, '#e74c3c');
            this.particles.spawn(this.player.x + this.player.width/2, this.player.y + this.player.height, 15, [d.color, '#3a281c', '#111']);
        }
    }

    // Las palabras del sitio se juntan en orden (PUEBLO → PERDIDO → QUEBRADA).
    // Cada una queda encendida al completarse; con todas hay bonus y se reinician.
    catchLetter(d) {
        this.hud.score += d.value;
        if (this.sound) this.sound.letterNormalCatch();

        let info = d.charInfo;
        if (!info || this.wordProgress[info.word][info.index]) return;

        this.wordProgress[info.word][info.index] = true;
        this.hud.addFloatingText('Letra ' + info.char, d.x, this.player.y + this.player.height + 30, '#e29578');
        if (!this.wordProgress[info.word].every(Boolean)) return;

        this.stats.words++;
        this.hud.score += 500;
        if (this.sound) this.sound.wordComplete();
        this.hud.addFloatingText('¡' + info.word + ' COMPLETADO! +500 Pts', this.width / 2, this.height / 2, '#3498db', 24, 2.0);
        this.particles.spawn(this.player.x + this.player.width/2, this.player.y + this.player.height, 40, ['#3498db', '#e29578', '#ffcc99']);

        let allWords = Object.values(this.wordProgress).every(p => p.every(Boolean));
        if (allWords) {
            this.hud.score += 1500;
            if (this.sound) this.sound.ppqComplete();
            this.hud.addFloatingText('¡' + this.sitio.frase + '! +1500', this.width / 2, this.height / 2 + 34, '#f1c40f', 22, 2.5);
            for (let w in this.wordProgress) this.wordProgress[w].fill(false);
        }
    }

    catchGoldLetter(d) {
        this.hud.score += d.value;
        if (this.sound) this.sound.letterGoldCatch();

        let info = d.charInfo;
        if (!info || this.secretoProgress[info.index]) return;

        this.secretoProgress[info.index] = true;
        this.hud.addFloatingText('¡RARA: ' + info.char + '!', d.x, this.player.y + this.player.height + 30, '#f1c40f');
        if (!this.secretoProgress.every(Boolean)) return;

        this.stats.secretos++;
        this.hud.lives++;
        this.vidaTomada = true;
        this.hud.score += 2000;
        if (this.sound) this.sound.ppqComplete();
        this.hud.addFloatingText('¡SECRETO ' + this.sitio.secreto + '! +2000 Pts y +1 Vida', this.width / 2, this.height / 2 - 30, '#f1c40f', 28, 2.5);
        this.secretoProgress.fill(false);
        this.particles.spawn(this.player.x + this.player.width/2, this.player.y + this.player.height, 80, ['#f1c40f', '#e67e22', '#ffffff']);
    }

    catchPowerup(d) {
        if (this.sound) this.sound.powerupCatch();
        let activeBall = this.balls.find(b => b.active);

        if (d.type === 'pw_multi' || d.type === 'pw_triple') {
            // si el cucharín todavía colgaba de la zaranda, sale junto con las otras
            if (!activeBall && this.balls.length) {
                activeBall = this.balls[0];
                activeBall.launch();
            }
        }

        if (d.type === 'pw_multi') {
            if (activeBall) this.spawnExtraBall(activeBall, -activeBall.vx || 150, 'espatula');
            this.hud.addFloatingText('¡LLEGA LA ESPÁTULA!', d.x, this.player.y + this.player.height + 30, '#f39c12');

        } else if (d.type === 'pw_triple') {
            if (activeBall) {
                this.spawnExtraBall(activeBall, activeBall.vx + 150, 'espatula');
                this.spawnExtraBall(activeBall, activeBall.vx - 150, 'brocha');
            }
            this.hud.addFloatingText('¡ESPÁTULA Y BROCHA!', d.x, this.player.y + this.player.height + 30, '#e74c3c');

        } else if (d.type === 'pw_zaranda') {
            let wasBase = this.player.width === this.player.baseWidth;
            let dur = 10 * this.levelManager.getPowerupDurationMultiplier();
            this.player.powerTimer = dur;
            this.player.powerMaxTimer = dur;
            if (wasBase) {
                this.player.x -= 30;
            }
            if (this.player.x < 0) this.player.x = 0;
            if (this.player.x + 180 > this.width) this.player.x = this.width - 180;
            this.hud.addFloatingText('¡ZARANDA AMPLIA!', d.x, this.player.y + this.player.height + 30, '#e67e22');

        } else if (d.type === 'pw_vida') {
            this.hud.lives++;
            this.vidaTomada = true;
            this.hud.addFloatingText('¡CARBÓN PARA C14! +1 VIDA', d.x, this.player.y + this.player.height + 30, '#2ecc71');
        }
    }

    // Herramienta extra que sale desde otra, para el mismo lado (arriba o
    // abajo) y a la misma velocidad, abriéndose en ángulo como en el Arkanoid
    spawnExtraBall(from, vx, tool) {
        let ball = this.newBall(tool);
        ball.x = from.x;
        ball.y = from.y;
        ball.vx = vx;
        ball.vy = from.vy || ball.speed;
        ball.active = true;
        ball.normalizeVelocity();
        this.balls.push(ball);
    }

    // Primera palabra a la que todavía le faltan letras
    activeWord() {
        return Object.keys(this.wordsDef).find(w => !this.wordProgress[w].every(Boolean)) || null;
    }

    // ¿Ya está cayendo esa letra? (para no soltar dos iguales a la vez)
    isLetterFalling(type, index, word) {
        return this.drops.some(d => d.type === type && d.charInfo &&
            d.charInfo.index === index && (!word || d.charInfo.word === word));
    }

    spawnDrop(b, lvl) {
        // lo importante del estrato, cuando la excavación llega a su punto
        // (si ahora no se puede, por ejemplo porque las letras que faltan ya
        // están subiendo, queda para el bloque siguiente)
        const sig = this.plan[0];
        if (sig && this.excavation.clearedFraction() >= sig.en && this.dropEspecial(b, sig.tipo)) {
            this.plan.shift();
            return;
        }

        if (Math.random() >= lvl.dropChance) return;
        if (Math.random() < Game.LETTER_CHANCE && this.dropEspecial(b, 'letra')) return;

        // en cada campaña nueva hay un poco más de terrones y piedras
        let loots = [...lvl.loots];
        for (let i = 1; i < this.levelManager.currentCycle; i++) loots.push('terron', 'piedra');
        this.addDrop(b, loots[Math.floor(Math.random() * loots.length)], null);
    }

    // Suelta desde el bloque una letra de la palabra en juego ('letra'), una
    // del secreto ('oro') o un poder. Devuelve false si ahora no hay letra posible.
    dropEspecial(b, tipo) {
        if (tipo === 'letra') {
            const word = this.activeWord();
            if (!word) return false;
            const missing = [];
            this.wordProgress[word].forEach((has, idx) => {
                if (!has && !this.isLetterFalling('letter_normal', idx, word)) missing.push(idx);
            });
            if (!missing.length) return false;
            const idx = missing[Math.floor(Math.random() * missing.length)];
            this.addDrop(b, 'letter_normal', { word: word, index: idx, char: this.wordsDef[word][idx] });
        } else if (tipo === 'oro') {
            const secreto = this.sitio.secreto;
            const missing = [...secreto].map((ch, idx) => idx)
                .filter(idx => !this.secretoProgress[idx] && !this.isLetterFalling('letter_gold', idx));
            if (!missing.length) return false;
            const pick = missing[Math.floor(Math.random() * missing.length)];
            this.addDrop(b, 'letter_gold', { char: secreto[pick], index: pick });
        } else {
            this.addDrop(b, tipo, null);
        }
        return true;
    }

    addDrop(b, type, charInfo) {
        let drop = new Drop(b.x + b.width/2 - 8, b.y + b.height/2 - 8, type, charInfo);
        drop.speed *= this.levelManager.getDropSpeedMultiplier();
        this.drops.push(drop);
    }

    checkCollisions() {
        let lvl = this.levelManager.getCurrentLevel();
        this.balls.forEach(ball => {
            if (!ball.active) return;
            this.checkPaddle(ball);
            this.checkFloor(ball);
            this.checkBricks(ball, lvl);
        });
    }

    // La zaranda está arriba: devuelve hacia abajo el cucharín que sube
    checkPaddle(ball) {
        let crossingPaddle =
            ball.vy < 0 &&
            ball.y - ball.radius <= this.player.y + this.player.height &&
            ball.y + ball.radius >= this.player.y &&
            ball.x + ball.radius >= this.player.x &&
            ball.x - ball.radius <= this.player.x + this.player.width;

        if (crossingPaddle) {
            let hitPoint = ball.x - (this.player.x + this.player.width / 2);
            let ratio = hitPoint / (this.player.width / 2);

            ball.vy = Math.abs(ball.vy);
            ball.vx = ratio * ball.speed * 1.2;
            ball.normalizeVelocity();
            ball.y = this.player.y + this.player.height + ball.radius;

            // la zaranda se sacude y se cuela un poco de tierra por la malla
            this.player.bump = 0.08;
            this.particles.sift(this.player.x + 8, this.player.x + this.player.width - 8,
                this.player.y + this.player.height, 6, this.player.soilColors());

            if (this.sound) this.sound.paddleHit();
        }
    }

    // Abajo, el estrato siguiente hace de fondo: ahí rebota
    checkFloor(ball) {
        let floor = this.excavation.floorY(ball.x);
        if (ball.vy > 0 && ball.y + ball.radius > floor) {
            ball.vy = -Math.abs(ball.vy);
            ball.y = floor - ball.radius;
        }
    }

    checkBricks(ball, lvl) {
        // De los bloques que toca se queda con el de centro más cercano: las
        // capas se superponen un poco y así no rompe uno que está "detrás".
        let hit = null, best = Infinity, hitDX = 0, hitDY = 0;
        let r2 = ball.radius * ball.radius;

        for (let r = 0; r < this.excavation.rows; r++) {
            for (let c = 0; c < this.excavation.cols; c++) {
                let b = this.excavation.bricks[r][c];
                if (b.status !== 1) continue;

                let testX = Math.max(b.x, Math.min(ball.x, b.x + b.width));
                let testY = Math.max(b.y, Math.min(ball.y, b.y + b.height));
                let distX = ball.x - testX;
                let distY = ball.y - testY;
                if (distX * distX + distY * distY > r2) continue;

                let cx = b.x + b.width / 2 - ball.x;
                let cy = b.y + b.height / 2 - ball.y;
                let centerDist = cx * cx + cy * cy;
                if (centerDist < best) {
                    best = centerDist;
                    hit = b;
                    hitDX = distX;
                    hitDY = distY;
                }
            }
        }

        if (!hit) return;
        this.bounceOffBrick(ball, hit, hitDX, hitDY);
        this.hitBrick(hit, lvl);
    }

    // Rebota y saca el cucharín fuera del bloque, para que no lo golpee dos
    // veces seguidas ni quede atrapado adentro de un bloque duro
    bounceOffBrick(ball, b, dx, dy) {
        let r = ball.radius;
        if (dx === 0 && dy === 0) {
            // El centro quedó adentro del bloque: sale por el lado más cercano
            let left = ball.x - b.x, right = b.x + b.width - ball.x;
            let up = ball.y - b.y, down = b.y + b.height - ball.y;
            let m = Math.min(left, right, up, down);
            if (m === left) dx = -1;
            else if (m === right) dx = 1;
            else if (m === up) dy = -1;
            else dy = 1;
        }

        if (Math.abs(dx) > Math.abs(dy)) {
            ball.vx = dx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
            ball.x = dx > 0 ? b.x + b.width + r : b.x - r;
        } else {
            ball.vy = dy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
            ball.y = dy > 0 ? b.y + b.height + r : b.y - r;
        }
    }

    hitBrick(b, lvl) {
        if (this.sound) this.sound.brickHit();

        if (this.excavation.damage(b)) {
            this.sinRomper = 0;
            this.hud.score += 5;
            this.particles.spawn(b.x + b.width/2, b.y + b.height/2, 8, [b.color, '#8b6448', 'rgba(0,0,0,0.4)']);
            this.spawnDrop(b, lvl);

            // A medida que se excava, el cucharín acelera
            let speed = this.ballSpeed();
            this.balls.forEach(ball => {
                ball.speed = speed;
                if (ball.active) ball.normalizeVelocity();
            });
        } else {
            // Partial hit: small dust burst, no drop
            this.hud.score += 1;
            this.particles.spawn(b.x + b.width/2, b.y + b.height/2, 4, [b.color, '#8b6448']);
        }
    }

    update(dt) {
        if (this.hud.state === 'TRANSITION') {
            this.particles.update(dt); // el polvo del último golpe sigue cayendo
            this.transitionTimer -= dt;
            // la cámara baja suave hasta el estrato siguiente
            let t = 1 - Math.max(0, this.transitionTimer) / Game.TRANSITION_TIME;
            let e = t * t * (3 - 2 * t);
            this.excavation.camY = this.camFrom + (this.camTo - this.camFrom) * e;
            if (this.transitionTimer <= 0) this.startNextLevel();
            return;
        }
        if (this.hud.state === 'GAMEOVER' || this.hud.state === 'PAUSED') return;

        // Permite mover la zaranda y apuntar la bola inactiva antes de lanzarla (START_LEVEL etc)
        this.limitesZaranda();
        this.player.update(dt, this.input);
        this.balls.forEach(b => {
            if (!b.active) {
                b.x = this.player.x + this.player.width / 2;
                b.y = this.player.y + this.player.height + b.radius;
            }
        });

        if (this.hud.state !== 'PLAYING') return;

        this.particles.update(dt);
        this.hud.update(dt);
        this.checkDrops(dt);

        // El cucharín avanza en pasos cortos (máx. 6 px) para no atravesar
        // capas finas ni la zaranda cuando va rápido o un cuadro se demora
        let fastest = 0;
        this.balls.forEach(b => { if (b.active && b.speed > fastest) fastest = b.speed; });
        let steps = Math.max(1, Math.ceil(fastest * dt / 6));
        for (let s = 0; s < steps && this.excavation.activeBricks > 0; s++) {
            this.balls.forEach(b => { if (b.active) b.update(dt / steps); });
            this.checkCollisions();
        }

        // Si con muy pocos bloques pasa un buen rato sin sacar ninguno, se
        // retiran solos, para no pasar minutos persiguiendo el último
        if (this.balls.some(b => b.active)) this.sinRomper += dt;
        if (this.pocosBloques() && this.sinRomper >= Game.FINISH_WAIT) {
            this.finishWithBrush();
        }

        // El cucharín que pasó la zaranda subiendo ya no vuelve: se pierde
        // enseguida (si la zaranda bajó por debajo de uno que venía bajando,
        // ese sigue en juego)
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const b = this.balls[i];
            if ((b.vy < 0 && b.y + b.radius < this.player.y - 60) || b.y + b.radius < -40) {
                this.balls.splice(i, 1);
            }
        }

        if (this.balls.length === 0) {
            // Efecto violento al perder una vida
            this.particles.spawn(this.player.x + this.player.width/2, this.player.y + this.player.height, 25, ['#e74c3c', '#ffffff', '#3a281c']);

            this.hud.lives--;
            if (this.hud.lives <= 0) {
                this.hud.state = 'GAMEOVER';
                if (this.sound) { this.sound.stopMusic(); this.sound.gameOver(); }
            } else {
                if (this.sound) this.sound.loseLife();
                this.player.powerTimer = 0;
                this.player.width = this.player.baseWidth;
                this.balls = [this.newBall()];
            }
        }

        if (this.excavation.activeBricks === 0 && this.hud.state === 'PLAYING') {
            this.hud.state = 'TRANSITION';
            this.transitionTimer = Game.TRANSITION_TIME;
            // después del último estrato la cámara llega a la roca madre
            this.camFrom = this.excavation.camY;
            const siguiente = this.levelManager.getCurrentLevel().estrato + 1;
            this.camTo = this.excavation.cameraFor(siguiente);
            // mientras baja, se destapa el estrato siguiente
            this.excavation.tapadoDesde = siguiente;
            this.drops = [];
            this.balls.forEach(b => b.active = false);
            if (this.sound) { this.sound.stopMusic(); this.sound.victory(); }
        }
    }

    // Hasta dónde sube y baja la zaranda: un poco más arriba de su altura
    // normal, y hacia abajo hasta HOLGURA px sobre lo que tenga debajo (los
    // bloques que quedan en esas columnas o, si no hay, el fondo)
    limitesZaranda() {
        const p = this.player, normal = Player.yFor(this.height);
        const x0 = p.x - 30, x1 = p.x + p.width + 30, ex = this.excavation;
        let frente = Math.min(ex.floorY(x0), ex.floorY((x0 + x1) / 2), ex.floorY(x1));
        ex.flat.forEach(b => {
            if (b.status === 1 && b.x < x1 && b.x + b.width > x0 && b.y < frente) frente = b.y;
        });
        p.minY = normal - Game.SUBIR_MAX;
        p.maxY = Math.max(normal, frente - Game.HOLGURA - p.height);
    }

    // ¿Quedan tan pocos bloques que hay que ayudar a encontrarlos?
    pocosBloques() {
        const r = this.excavation.activeBricks;
        return r > 0 && r <= Math.ceil(this.excavation.totalBricks * Game.FINISH_FRACTION);
    }

    // Los últimos bloques titilan con un borde, para encontrarlos fácil
    drawUltimos(ctx) {
        const a = 0.45 + 0.45 * Math.sin(performance.now() / 160);
        ctx.fillStyle = `rgba(255, 214, 140, ${a})`;
        this.excavation.bricks.flat().forEach(b => {
            if (b.status !== 1) return;
            const x = Math.round(b.x / 2) * 2, y = Math.round(b.y / 2) * 2;
            const w = Math.round(b.width / 2) * 2, h = Math.round(b.height / 2) * 2;
            ctx.fillRect(x, y, w, 2);
            ctx.fillRect(x, y + h - 2, w, 2);
            ctx.fillRect(x, y, 2, h);
            ctx.fillRect(x + w - 2, y, 2, h);
        });
    }

    finishWithBrush() {
        this.excavation.bricks.flat().forEach(b => {
            if (b.status !== 1) return;
            while (!this.excavation.damage(b)) { /* hasta retirarlo */ }
            this.hud.score += 5;
            this.particles.spawn(b.x + b.width/2, b.y + b.height/2, 12, [b.color, '#8b6448', '#ffcc99']);
        });
        this.hud.brushFinish = true;
    }

    // ── Alto de pantalla ────────────────────────────────────────────────────
    // Alto lógico según la ventana: 720 en compu y tablet apaisada, hasta
    // 1080 en pantallas verticales (más alto haría el juego lento: el
    // cucharín tardaría mucho en ir y volver). El ancho es siempre CANVAS_W.
    static heightFor(viewW, viewH) {
        const h = Math.round(Game.CANVAS_W * viewH / viewW / 8) * 8;
        return Math.max(720, Math.min(1080, h));
    }

    // Escala el canvas para que entre en la ventana sin deformarse. Si sobra
    // mucho alto (celular vertical), abajo queda una zona para mover la
    // zaranda con el dedo sin tapar el juego.
    fitContainer() {
        const cont = this.canvas.parentElement;
        if (!cont) return;
        const vw = window.innerWidth - 16, vh = window.innerHeight - 16;
        const k = Math.min(vw / this.canvasWidth, vh / this.height);
        const h = Math.floor(this.height * k);
        cont.style.width = Math.floor(this.canvasWidth * k) + 'px';
        cont.style.height = h + 'px';
        const zona = document.getElementById('touch-zone');
        if (zona) {
            const sobra = vh - h - 8;
            zona.style.display = sobra > 110 ? 'flex' : 'none';
            zona.style.height = Math.max(0, sobra) + 'px';
            zona.style.width = cont.style.width;
        }
    }

    // La ventana cambió (o se giró el celular): nuevo alto y pausa
    resize() {
        const h = Game.heightFor(window.innerWidth - 16, window.innerHeight - 16);
        if (h !== this.height) {
            if (this.hud.state === 'TRANSITION') this.pendingHeight = h; // se aplica al llegar al estrato
            else this.applyHeight(h);
        }
        this.fitContainer();
    }

    applyHeight(h) {
        this.canvas.height = h;
        this.height = h;
        this.hud.gameHeight = h;
        this.player.y = Player.yFor(h);
        // lo que está en el campo se mueve junto con el estrato
        const delta = this.excavation.relayout(h);
        this.balls.forEach(b => { if (b.active) b.y -= delta; });
        this.drops.forEach(d => { d.y -= delta; });
        this.particles.particles.forEach(p => { p.y -= delta; });
        if (this.hud.state === 'PLAYING') this.togglePause();
        this.fitContainer();
    }

    startNextLevel() {
        if (this.pendingHeight) {
            this.canvas.height = this.height = this.hud.gameHeight = this.pendingHeight;
            this.excavation.gameHeight = this.pendingHeight;
            this.player.y = Player.yFor(this.pendingHeight);
            this.pendingHeight = null;
            this.fitContainer();
        }
        this.levelManager.nextLevel();
        // Campaña terminada (se llegó a la base): otro recinto del sitio, más rápido
        if (this.levelManager.currentLevel === 0) this.excavation.generate(Game.newSeed(), this.sitio.perfil);
        this.player.x = this.width / 2 - this.player.baseWidth / 2;
        this.player.y = Player.yFor(this.height);   // cada estrato arranca con la zaranda a su altura normal
        this.player.width = this.player.baseWidth;
        this.player.powerTimer = 0;

        // Tras dos estratos seguidos sin juntar una vida, el equipo descansa y recupera una
        this.estratosSinVida = this.vidaTomada ? 0 : this.estratosSinVida + 1;
        this.vidaTomada = false;
        if (this.estratosSinVida >= Game.LIFE_REGEN_LEVELS) {
            this.estratosSinVida = 0;
            this.hud.lives++;
            this.hud.levelNote = '+1 VIDA: el equipo descansó entre estratos';
        }

        this.initLevel();
        this.balls = [this.newBall()];
        this.hud.brushFinish = false;
        this.enterLevel();
    }

    draw() {
        // Pantalla de carga inicial
        if (!this.assetsLoaded) {
            this.drawLoadingScreen();
            return;
        }

        // Cursor oculto mientras se juega activamente
        if (this.hud.state === 'PLAYING') {
            if (!this.canvas.classList.contains('playing-hide-cursor')) {
                this.canvas.classList.add('playing-hide-cursor');
            }
        } else {
            if (this.canvas.classList.contains('playing-hide-cursor')) {
                this.canvas.classList.remove('playing-hide-cursor');
            }
        }

        // Botón de pausa solo visible mientras hay partida en curso
        if (this.pauseBtn) {
            let visible = (this.hud.state === 'PLAYING' || this.hud.state === 'PAUSED');
            this.pauseBtn.style.display = visible ? 'block' : 'none';
            this.pauseBtn.textContent = (this.hud.state === 'PAUSED') ? '▶' : 'II';
        }

        this.ctx.save();

        // Screen shake al recibir golpe
        if (this.player.hitTimer > 0) {
            let shakeMag = (this.player.hitTimer / 0.4) * 3.5;
            let dx = (Math.random() - 0.5) * shakeMag;
            let dy = (Math.random() - 0.5) * shakeMag;
            this.ctx.translate(dx, dy);
        }

        // El campo: solo el estrato en juego (lo excavado en sombra, lo de abajo tapado)
        this.excavation.draw(this.ctx);
        if (this.hud.state === 'PLAYING' && this.pocosBloques()) this.drawUltimos(this.ctx);
        // Al costado, la estratigrafía completa
        this.drawPanel(this.ctx);

        if (this.hud.state === 'START') {
            // Portada: la imagen del título arriba, cortada bajo el rombo (el
            // nombre del sitio elegido lo escribe el HUD debajo)
            let title = this.assets.get('title_bg');
            this.hud.tituloAlto = 0;
            if (title) {
                const srcH = title.height * Game.TITULO_CORTE;
                let w = this.canvasWidth, h = w * srcH / title.width;
                if (h > this.height * 0.36) { h = this.height * 0.36; w = h * title.width / srcH; }
                this.hud.tituloAlto = h;
                this.ctx.fillStyle = '#120d0a';
                this.ctx.fillRect(0, 0, this.canvasWidth, h);
                this.ctx.drawImage(title, 0, 0, title.width, srcH, (this.canvasWidth - w) / 2, 0, w, h);
                let fade = this.ctx.createLinearGradient(0, h - 60, 0, h);
                fade.addColorStop(0, 'rgba(0,0,0,0)');
                fade.addColorStop(1, 'rgba(0,0,0,0.6)');
                this.ctx.fillStyle = fade;
                this.ctx.fillRect(0, h - 60, this.canvasWidth, 60);
            }
        } else {
            this.drops.forEach(d => d.draw(this.ctx));
            this.particles.draw(this.ctx);
            this.player.draw(this.ctx);
            if (this.hud.state !== 'TRANSITION') this.balls.forEach(b => b.draw(this.ctx));
        }

        this.hud.draw(this.ctx);

        this.ctx.restore();
    }

    // Columna del costado: el perfil completo del recinto
    drawPanel(ctx) {
        const x0 = this.width, w = Game.PANEL_W;
        ctx.fillStyle = '#17110d';
        ctx.fillRect(x0, 0, w, this.height);
        ctx.fillStyle = '#3a2a1e';
        ctx.fillRect(x0, 0, 2, this.height);

        let lvl = this.levelManager.getCurrentLevel();
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffcc99';
        ctx.font = 'bold 15px Courier New';
        ctx.fillText('PERFIL', x0 + 14, 28);
        ctx.fillStyle = '#bdae9a';
        ctx.font = '13px Courier New';
        ctx.fillText(`Estrato ${lvl.estrato}/${this.levelManager.levels.length}`, x0 + 14, 50);

        this.excavation.drawColumn(ctx, x0 + 12, 76, w - 24, this.height - 92, lvl.estrato);
    }

    loop(timestamp) {
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        if (dt > 0.1) dt = 0.1;

        this.update(dt);
        this.draw();

        requestAnimationFrame((ts) => this.loop(ts));
    }

    start() {
        this.lastTime = performance.now();
        // Disparamos la carga de assets en paralelo. El loop arranca igual y
        // el draw() pinta loading screen mientras tanto.
        this.assets.loadAll((loaded, total) => {
            this.assetsProgress = loaded / total;
        }).then(() => {
            Sitios.orden.forEach(id => this.miniatura(Sitios[id]));
            this.assetsLoaded = true;
        });
        requestAnimationFrame((ts) => this.loop(ts));
    }

    drawLoadingScreen() {
        let ctx = this.ctx, cx = this.canvasWidth / 2;
        ctx.fillStyle = '#1a1512';
        ctx.fillRect(0, 0, this.canvasWidth, this.height);

        ctx.fillStyle = '#e29578';
        ctx.font = 'bold 28px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('Excavando...', cx, this.height / 2 - 20);

        // Barra de progreso
        let barW = 360;
        let barH = 14;
        let barX = cx - barW / 2;
        let barY = this.height / 2 + 10;
        ctx.strokeStyle = '#4a3424';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);
        ctx.fillStyle = '#c85a17';
        ctx.fillRect(barX + 2, barY + 2, (barW - 4) * this.assetsProgress, barH - 4);

        ctx.fillStyle = '#7f8c8d';
        ctx.font = '12px Courier New';
        ctx.fillText(Math.round(this.assetsProgress * 100) + '%', cx, barY + barH + 22);
    }
}
