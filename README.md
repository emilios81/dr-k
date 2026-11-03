# Dr. K — para celular y tablet

Juego arqueológico: excavá estrato por estrato el **Pueblo Perdido de la Quebrada** (cultura Aguada) o un recinto de una kancha de **El Shincal de Quimivil** (inca), en Catamarca. Con la zaranda devolvés el cucharín, que va sacando la tierra de cada estrato, y juntás hallazgos, las letras de las palabras de cada sitio y su secreto dorado.

**Jugar:** https://emilios81.github.io/dr-k/

Se instala como app desde el navegador (Chrome: ⋮ → *Agregar a la pantalla principal*; Safari: Compartir → *Agregar a inicio*) y después anda sin conexión.

**Con el dedo:** apoyalo en cualquier parte de la pantalla y deslizalo. Hacia los costados mueve la zaranda; para arriba o para abajo la sube y la baja con la soga. Un toque corto lanza el cucharín.

Los estratos, los hallazgos y las herramientas se dibujan por código en pixel art; la única imagen es la portada.

Creador: Dr. Emilio A. Villafañez — LATDAA, Escuela de Arqueología, Universidad Nacional de Catamarca · Fundación Azara.

## Para actualizarla

El núcleo del juego (`js/`, salvo `js/movil/`, y `assets/`) es el mismo del juego de escritorio y se copia desde allá con `node herramientas/sincronizar-movil.js`, que además actualiza la versión de la copia sin conexión (`sw.js`). No se edita acá. Lo propio de la app está en `js/movil/`, `index.html`, `css/` e `iconos/`.
