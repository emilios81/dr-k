class LevelManager {
    constructor() {
        this.currentLevel = 0;
        this.currentCycle = 1;

        // Cada nivel es un estrato del recinto del sitio elegido (ver Sitios.js)
        this.levels = [];
    }

    // Niveles del sitio elegido; la campaña arranca de nuevo
    usar(niveles) {
        this.levels = niveles;
        this.currentLevel = 0;
        this.currentCycle = 1;
    }

    getCurrentLevel() {
        return this.levels[this.currentLevel];
    }

    isLastLevel() {
        return this.currentLevel === this.levels.length - 1;
    }

    nextLevel() {
        this.currentLevel++;
        if (this.currentLevel >= this.levels.length) {
            this.currentLevel = 0;
            this.currentCycle++;
        }
    }

    getBallSpeedMultiplier() {
        return 1.0 + (this.currentCycle - 1) * 0.15;
    }

    getDropSpeedMultiplier() {
        return 1.0 + (this.currentCycle - 1) * 0.10;
    }

    getPowerupDurationMultiplier() {
        // En ciclos más altos, los efectos temporales pueden durar un poco menos (nunca menos del 50%)
        return Math.max(0.5, 1.0 - (this.currentCycle - 1) * 0.15);
    }
}
