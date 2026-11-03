class Assets {
    constructor() {
        this.images = {};
        this.loaded = 0;
        this.total = 0;
        this.ready = false;
    }

    // Imágenes a precargar. El resto (cucharín, zaranda, hallazgos, poderes
    // y letras) se dibuja por código en pixel art: ver PixelArt.js.
    static MANIFEST = [
        // Título
        'title_bg',
    ];

    loadAll(onProgress) {
        const list = Assets.MANIFEST;
        this.total = list.length;
        this.loaded = 0;

        return Promise.all(list.map(name => this.loadOne(name, onProgress)))
            .then(() => { this.ready = true; });
    }

    // Los fondos van en JPG (no tienen transparencia y pesan mucho menos);
    // el resto en PNG. Ver herramientas/achicar-imagenes.ps1.
    static fileFor(name) {
        let isBackground = name.startsWith('bg_') || name === 'title_bg';
        return 'assets/' + name + (isBackground ? '.jpg' : '.png');
    }

    loadOne(name, onProgress) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.images[name] = img;
                this.loaded++;
                if (onProgress) onProgress(this.loaded, this.total, name);
                resolve();
            };
            img.onerror = () => {
                console.warn('No se pudo cargar:', name);
                this.images[name] = null;
                this.loaded++;
                if (onProgress) onProgress(this.loaded, this.total, name);
                resolve();
            };
            img.src = Assets.fileFor(name);
        });
    }

    get(name) {
        return this.images[name];
    }

    has(name) {
        return !!this.images[name];
    }
}
