// Control con el dedo para el celular y la tablet (también anda arrastrando
// el mouse). El dedo no tiene que ir sobre la zaranda, que está arriba y lo
// taparía todo: se apoya en cualquier parte (lo natural es la zona de abajo)
// y se desliza. Hacia los costados la zaranda se mueve lo mismo que el dedo
// (un poco más, para no recorrer toda la pantalla); para arriba o para abajo
// la sube y la baja con la soga. Un toque corto lanza el cucharín, empieza
// el estrato o sigue después de la pausa. Los botones se manejan solos.
// El teclado sigue andando como en la compu (por si la tablet tiene uno).
class InputMovil extends Input {
    static GANANCIA = 1.35;   // cuánto se corre la zaranda por cada píxel que se corre el dedo
    static VERTICAL = 1.6;    // un tramo sube o baja la zaranda si va así de vertical
    static TOQUE_MOV = 14;    // un toque se mueve menos que esto (en px de pantalla)...
    static TOQUE_MS = 350;    // ...y dura menos que esto

    // Lo llama Input al crearse, en lugar de su manejo del mouse y del dedo
    bindPointer(canvas) {
        this.zaranda = null;  // la zaranda (Player), la conecta GameMovil
        let dedo = null;      // el primer dedo apoyado; los demás no cuentan
        const escala = () => canvas.width / canvas.getBoundingClientRect().width;
        const esBoton = t => t && t.closest && t.closest('button, #inicio, #girar');

        window.addEventListener('pointerdown', (e) => {
            if (dedo || esBoton(e.target) || (e.pointerType === 'mouse' && e.button !== 0)) return;
            e.preventDefault();
            const z = this.zaranda;
            dedo = {
                id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
                t0: performance.now(), lejos: 0,
                // a dónde va la zaranda: a donde ya iba o, si estaba quieta, donde está
                centro: this.pointerX !== null ? this.pointerX : (z ? z.x + z.width / 2 : null),
            };
        }, { passive: false });

        window.addEventListener('pointermove', (e) => {
            if (!dedo || e.pointerId !== dedo.id) return;
            e.preventDefault();
            const dx = e.clientX - dedo.x, dy = e.clientY - dedo.y, k = escala(), z = this.zaranda;
            dedo.x = e.clientX;
            dedo.y = e.clientY;
            dedo.lejos = Math.max(dedo.lejos, Math.hypot(e.clientX - dedo.x0, e.clientY - dedo.y0));
            if (z && dedo.centro !== null) {
                // sin pasarse de los muros, así al volver responde enseguida
                const medio = z.width / 2;
                dedo.centro = Math.max(z.minX + medio, Math.min(z.maxX - medio, dedo.centro + dx * k * InputMovil.GANANCIA));
                this.pointerX = dedo.centro;
            }
            if (Math.abs(dy) > Math.abs(dx) * InputMovil.VERTICAL) this.dy += dy * k;
        }, { passive: false });

        const soltar = (e) => {
            if (!dedo || e.pointerId !== dedo.id) return;
            const toque = e.type === 'pointerup' && dedo.lejos < InputMovil.TOQUE_MOV &&
                          performance.now() - dedo.t0 < InputMovil.TOQUE_MS;
            dedo = null;            // la zaranda termina de llegar a donde la mandó el dedo (pointerX)
            if (!toque) return;
            const r = canvas.getBoundingClientRect(), k = escala();
            const donde = { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
            this.actionCallbacks.forEach(cb => cb('toque', donde));
        };
        window.addEventListener('pointerup', soltar);
        window.addEventListener('pointercancel', soltar);

        // Ni el menú del toque largo ni la lupa del navegador
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }
}
