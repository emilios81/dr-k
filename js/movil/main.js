function startGame() {
    const canvas = document.getElementById('gameCanvas');

    // El lienzo toma la forma de la pantalla: con o sin la columna del
    // perfil, y un alto lógico entre 720 y 1080 (ver GameMovil.medidas)
    const m = GameMovil.medidas();
    canvas.width = m.W;
    canvas.height = m.H;

    const game = new GameMovil(canvas);
    game.fitContainer();
    game.start();

    // Al girar la tablet o aparecer y desaparecer la barra del navegador se
    // reacomoda (y, si se estaba jugando, se pausa)
    let espera = null;
    const reacomodar = () => {
        clearTimeout(espera);
        espera = setTimeout(() => game.resize(), 150);
    };
    window.addEventListener('resize', reacomodar);
    window.addEventListener('orientationchange', reacomodar);

    // Copia para jugar sin conexión (solo si se sirve por HTTP/HTTPS, no file://)
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    startGame();
} else {
    window.addEventListener('DOMContentLoaded', startGame);
}
