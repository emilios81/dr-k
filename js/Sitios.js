// Los sitios que se pueden excavar. La mecánica es la misma en todos; cada
// uno trae su perfil (el dibujo de los estratos, con su paisaje de fondo),
// sus niveles, las palabras que se juntan letra por letra, el secreto de
// letras doradas, los hallazgos del resumen y sus datos curiosos.
//
// Niveles: cada uno es un estrato del recinto, de la superficie hacia la
// base (que cierra la campaña). rows: filas de bloques. baseHp: golpes del
// sedimento. hardHp: golpes de los bloques duros (con piedras, adobes o
// madera; pocos y salteados, ver Excavation). dropChance y loots: con qué
// probabilidad un bloque suelta un hallazgo de puntos y cuál (terrón y
// piedra restan; más o menos un tercio). Letras y poderes van aparte, en el
// plan de cada estrato (Game.planEstrato). trivia: índices de `trivias`.
const Sitios = {
    orden: ['ppq', 'shincal'],
    CLAVE: 'drk_sitio',   // el último sitio elegido, para la próxima vez

    ppq: {
        id: 'ppq',
        nombre: 'Pueblo Perdido de la Quebrada',
        lineas: ['Pueblo Perdido', 'de la Quebrada'],
        detalle: ['Cultura Aguada', 'Recinto de piedra'],
        perfil: PerfilRecinto,
        palabras: ['PUEBLO', 'PERDIDO', 'QUEBRADA'],
        frase: 'PUEBLO PERDIDO DE LA QUEBRADA',
        secreto: 'PPQ',
        fin: 'ROCA MADRE',
        record: 'arkeonoid_highscore',
        hallazgos: [['ceramica', 'tiestos'], ['punta', 'puntas'], ['hueso', 'huesos']],
        niveles: [
            { id: 1, estrato: 1, name: "Suelo superficial", rows: 4, baseHp: 1, hardHp: 2, dropChance: 0.13, loots: ['ceramica', 'ceramica', 'hueso', 'terron', 'piedra'], trivia: [6, 0] },
            { id: 2, estrato: 2, name: "Relleno", rows: 6, baseHp: 1, hardHp: 2, dropChance: 0.12, loots: ['ceramica', 'ceramica', 'punta', 'terron', 'piedra'], trivia: [10, 1] },
            { id: 3, estrato: 3, name: "Techo caído", rows: 4, baseHp: 1, hardHp: 2, dropChance: 0.20, loots: ['ceramica', 'ceramica', 'hueso', 'hueso', 'terron'], trivia: [11, 2] },
            { id: 4, estrato: 4, name: "Muros caídos", rows: 6, baseHp: 1, hardHp: 3, dropChance: 0.18, loots: ['ceramica', 'ceramica', 'hueso', 'punta', 'piedra', 'terron'], trivia: [2] },
            { id: 5, estrato: 5, name: "Piso de habitación", rows: 3, baseHp: 1, hardHp: 3, dropChance: 0.35, loots: ['ceramica', 'ceramica', 'punta', 'punta', 'hueso', 'hueso'], trivia: [8, 4, 5] },
            { id: 6, estrato: 6, name: "Construcción anterior", rows: 6, baseHp: 1, hardHp: 3, dropChance: 0.20, loots: ['punta', 'ceramica', 'ceramica', 'hueso', 'piedra'], trivia: [12, 3] },
        ],
        trivias: [
            "Sabías que fue el Dr. Kriscautzky quien descubrió el\nPueblo Perdido de la Quebrada en los años 80 del siglo pasado.",
            "El Pueblo Perdido es un sitio de la cultura Aguada\nque habitó este valle hace más de 1500 años.",
            "El sitio arqueológico cuenta con más de 40 recintos\nconstruidos íntegramente en piedra, barro y cardón.",
            "La cultura Aguada se distinguió por una iconografía\ncompleja: el felino moteado y el sacrificador.",
            "Las puntas de proyectil halladas indican\ntécnicas de talla por presión muy refinadas.",
            "Los huesos de camélidos sugieren un manejo\nde rebaños de llamas en corrales tapiados.",
            "La estratigrafía es la lectura del tiempo en el suelo:\ncada capa, una historia distinta de ocupación.",
            "Los montículos no son colinas naturales:\nson rellenos constructivos de comunidades enteras.",
            "El tiesto cerámico es el hallazgo más común;\nsu pasta y decoración fechan el sitio.",
            "El Espacio Ceremonial suele ser estéril en hallazgos:\nse mantenía limpio por su función ritual.",
            "Cuando un sitio se abandona, el viento y el agua\nlo van rellenando de loess, arena y arcilla.",
            "La madera casi nunca se conserva: del techo quedan\nfragmentos de horcones y tirantes quemados.",
            "Debajo de un recinto puede haber construcciones\nanteriores; la roca madre marca el final."
        ],
    },

    shincal: {
        id: 'shincal',
        nombre: 'El Shincal de Quimivil',
        lineas: ['El Shincal', 'de Quimivil'],
        detalle: ['Inca, siglo XV', 'Recinto de una kancha'],
        perfil: PerfilKancha,
        palabras: ['SHINCAL', 'QUIMIVIL'],
        frase: 'EL SHINCAL DE QUIMIVIL',
        secreto: 'INTI',
        fin: 'GRAVA ESTÉRIL',
        record: 'drk_record_shincal',
        hallazgos: [['inca', 'tiestos incas'], ['maiz', 'marlos'], ['ceramica', 'tiestos Belén'], ['hueso', 'huesos']],
        niveles: [
            { id: 1, estrato: 1, name: "Suelo superficial con monte", rows: 4, baseHp: 1, hardHp: 2, dropChance: 0.13, loots: ['inca', 'ceramica', 'hueso', 'terron', 'piedra'], trivia: [0, 11, 12] },
            { id: 2, estrato: 2, name: "Derrumbe de muros", rows: 6, baseHp: 1, hardHp: 2, dropChance: 0.12, loots: ['inca', 'inca', 'hueso', 'terron', 'piedra'], trivia: [3, 2, 10] },
            { id: 3, estrato: 3, name: "Techo caído", rows: 4, baseHp: 1, hardHp: 2, dropChance: 0.20, loots: ['inca', 'maiz', 'maiz', 'hueso', 'terron'], trivia: [4, 1] },
            { id: 4, estrato: 4, name: "Piso de ocupación inca", rows: 4, baseHp: 1, hardHp: 3, dropChance: 0.32, loots: ['inca', 'inca', 'maiz', 'maiz', 'hueso', 'punta'], trivia: [5, 6] },
            { id: 5, estrato: 5, name: "Relleno de nivelación", rows: 6, baseHp: 1, hardHp: 3, dropChance: 0.16, loots: ['inca', 'ceramica', 'hueso', 'terron', 'piedra'], trivia: [7] },
            { id: 6, estrato: 6, name: "Ocupación local anterior", rows: 6, baseHp: 1, hardHp: 3, dropChance: 0.22, loots: ['ceramica', 'ceramica', 'punta', 'hueso', 'maiz', 'piedra'], trivia: [8, 9, 13] },
        ],
        trivias: [
            "El Shincal de Quimivil, en Londres (Belén, Catamarca),\nfue una de las principales cabeceras incas del Kollasuyu.",
            "En el centro de la gran plaza se alza el ushnu:\nuna plataforma de piedra para las ceremonias del Estado.",
            "Dos cerros a los lados de la plaza fueron aplanados\nen la cima y tienen escalinatas de piedra.",
            "Una kancha es un conjunto de recintos alrededor de un\npatio, encerrado por un muro: la vivienda inca típica.",
            "Los techos incas eran de paja sobre tirantes de madera;\nal quemarse dejan ceniza, carbón y paja carbonizada.",
            "Con el maíz se hacía la chicha que el Inca convidaba\nen las fiestas y en los trabajos colectivos.",
            "El aríbalo es la vasija inca típica: cuello largo,\nbase cónica y asas; se usaba para la chicha.",
            "Antes de construir, los incas nivelaban el terreno\ncon rellenos de tierra y cantos rodados.",
            "Antes de los incas vivían aquí pueblos de la cultura\nBelén, de cerámica pintada en negro sobre rojo.",
            "Los Belén enterraban a veces a sus difuntos en urnas\ntapadas con un puco boca abajo.",
            "El Qhapaq Ñan, el camino del Inca, unía El Shincal\ncon el Cusco y el resto del imperio.",
            "Cada junio, El Shincal celebra el Inti Raymi,\nla fiesta del Sol del solsticio de invierno.",
            "La estratigrafía es la lectura del tiempo en el suelo:\ncada capa, una historia distinta de ocupación.",
            "Debajo de todo están las gravas que dejó el río:\nsedimento estéril, sin rastros de gente."
        ],
    },

    // El sitio que quedó elegido la última vez (o el primero)
    elegido() {
        let id = null;
        try { id = localStorage.getItem(Sitios.CLAVE); } catch (e) { /* sin almacenamiento */ }
        return Sitios[Sitios.orden.includes(id) ? id : Sitios.orden[0]];
    },

    recordar(id) {
        try { localStorage.setItem(Sitios.CLAVE, id); } catch (e) { /* sin almacenamiento */ }
    },
};
