export class CanvasLocal {
    constructor(g, canvas) {
        // Listas de datos cargados del modelo 3D
        this.vertices = [];
        this.faces = [];
        this.edges = [];
        this.groups = [];
        this.groupConfigs = [];
        // Parámetros de Cámara y Proyección
        this.camRotX = 20 * Math.PI / 180; // Pitch (Rotación vertical)
        this.camRotY = -35 * Math.PI / 180; // Yaw (Rotación horizontal)
        this.zoom = 120; // Factor de escala
        // Parámetros de Animación
        this.isAnimating = true;
        this.animAngle = 0;
        this.animSpeed = 0.03;
        this.activeAnimGroup = 'aspas';
        this.activeAnimAxis = 'Z';
        // Punto de Pivote para la Animación local
        this.pivotX = 0;
        this.pivotY = 1.2;
        this.pivotZ = 0.35;
        this.graphics = g;
        this.canvas = canvas;
        this.maxX = canvas.width - 1;
        this.maxY = canvas.height - 1;
        this.centerX = canvas.width / 2;
        this.centerY = canvas.height / 2;
    }
    // --- PARSEADOR DE ARCHIVOS .DAT / .TXT ---
    loadModelFromText(text, filename = '') {
        this.vertices = [];
        this.faces = [];
        this.edges = [];
        this.groups = [];
        const lines = text.split('\n');
        let inFacesSection = false;
        let activeColeccionGroup = 'default';
        lines.forEach(line => {
            let trimmed = line.trim();
            if (trimmed === '')
                return;
            const upperTrimmed = trimmed.toUpperCase();
            // --- CASO 0: FORMATO ESTRUCTURADO BLENDER/PYTHON ---
            // Detectar inicio de sección de caras
            if (upperTrimmed === 'FACES:') {
                inFacesSection = true;
                return;
            }
            // Detectar fin de sección de caras
            if (upperTrimmed.startsWith('# FIN DE CARAS')) {
                inFacesSection = false;
                return;
            }
            // Detectar comentarios y grupos de colección
            if (trimmed.startsWith('#')) {
                const colMatch = trimmed.match(/#\s*Colecci[oó]n:\s*([^\s(]+)/i);
                if (colMatch) {
                    activeColeccionGroup = colMatch[1];
                    if (!this.groups.includes(activeColeccionGroup)) {
                        this.groups.push(activeColeccionGroup);
                    }
                }
                if (trimmed.match(/#\s*Fin de\s+/i)) {
                    activeColeccionGroup = 'default';
                }
                return;
            }
            // Si estamos en la sección de caras del nuevo formato
            if (inFacesSection) {
                // Formato: 1 2 3 4. (con punto final opcional)
                const cleaned = trimmed.replace(/\.+$/, '').trim();
                const parts = cleaned.split(/\s+/);
                const idxs = parts.map(s => parseInt(s, 10)).filter(n => !isNaN(n));
                if (idxs.length >= 3) {
                    // Obtener grupo del primer vértice
                    const firstVertexId = idxs[0];
                    const firstVertex = this.vertices.find(v => v.id === firstVertexId);
                    const group = firstVertex ? firstVertex.group : 'default';
                    let color = '#4a5568';
                    const lowerGroup = group.toLowerCase();
                    if (lowerGroup.includes('aspa')) {
                        color = '#ff5555';
                    }
                    else if (lowerGroup.includes('base')) {
                        color = '#2d3748';
                    }
                    else {
                        // Color dinámico a partir del grupo
                        let hash = 0;
                        for (let idx = 0; idx < group.length; idx++) {
                            hash = group.charCodeAt(idx) + ((hash << 5) - hash);
                        }
                        const h = Math.abs(hash % 360);
                        color = `hsl(${h}, 65%, 45%)`;
                    }
                    this.faces.push({ indices: idxs, group, color });
                }
                return;
            }
            // Si la línea empieza con un dígito, es un vértice en el nuevo formato (id x y z)
            if (/^\d/.test(trimmed)) {
                const parts = trimmed.split(/\s+/);
                if (parts.length >= 4) {
                    const id = parseInt(parts[0], 10);
                    const x = parseFloat(parts[1]);
                    const y = parseFloat(parts[2]);
                    const z = parseFloat(parts[3]);
                    if (!isNaN(id) && !isNaN(x) && !isNaN(y) && !isNaN(z)) {
                        const group = activeColeccionGroup;
                        this.vertices.push({ id, x, y, z, group });
                        if (!this.groups.includes(group)) {
                            this.groups.push(group);
                        }
                        return;
                    }
                }
            }
            // --- CASO 1: FORMATO VISOR DE COORDENADAS (COPIADO Y PEGADO DESDE EL VISOR) ---
            if (upperTrimmed.startsWith('VÉRTICE') || upperTrimmed.startsWith('VERTICE')) {
                const idMatch = trimmed.match(/(?:Vértice|Vertice)\s+(\d+)/i);
                const groupMatch = trimmed.match(/\[Grupo:\s*([^\]\s]+)/i);
                const coordMatch = trimmed.match(/Original:\s*\(([^)]+)\)/i);
                if (coordMatch) {
                    const coords = coordMatch[1].replace(/,/g, ' ').trim().split(/\s+/);
                    const id = idMatch ? parseInt(idMatch[1], 10) : (this.vertices.length + 1);
                    const group = groupMatch ? groupMatch[1] : 'default';
                    const x = parseFloat(coords[0]);
                    const y = parseFloat(coords[1]);
                    const z = parseFloat(coords[2]);
                    if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                        this.vertices.push({ id, x, y, z, group });
                        if (!this.groups.includes(group)) {
                            this.groups.push(group);
                        }
                    }
                }
                return;
            }
            if (upperTrimmed.startsWith('CARA')) {
                const groupMatch = trimmed.match(/\[Grupo:\s*([^\]\s]+)/i);
                const verticesMatch = trimmed.match(/(?:Vértices|Vertices):\s*\[([^\]]+)\]/i);
                const colorMatch = trimmed.match(/Color:\s*([#a-zA-Z0-9_]+)/i);
                if (verticesMatch) {
                    const idxs = verticesMatch[1].replace(/,/g, ' ').trim().split(/\s+/).map(s => parseInt(s, 10)).filter(n => !isNaN(n));
                    const group = groupMatch ? groupMatch[1] : 'default';
                    let color = colorMatch ? colorMatch[1] : '#4a5568';
                    if (color === 'base')
                        color = '#2d3748';
                    if (color === 'aspas')
                        color = '#ff5555';
                    if (idxs.length >= 3) {
                        this.faces.push({ indices: idxs, group, color });
                    }
                }
                return;
            }
            if (upperTrimmed.startsWith('ARISTA')) {
                const groupMatch = trimmed.match(/\[Grupo:\s*([^\]\s]+)/i);
                const v1Match = trimmed.match(/(?:Vértice|Vertice)\s+(\d+)\s+a\s+(?:Vértice|Vertice)\s+(\d+)/i);
                const colorMatch = trimmed.match(/Color:\s*([#a-zA-Z0-9_]+)/i);
                if (v1Match) {
                    const v1 = parseInt(v1Match[1], 10);
                    const v2 = parseInt(v1Match[2], 10);
                    const group = groupMatch ? groupMatch[1] : 'default';
                    let color = colorMatch ? colorMatch[1] : '#ffffff';
                    if (color === 'base')
                        color = '#2d3748';
                    if (color === 'aspas')
                        color = '#ff5555';
                    if (!isNaN(v1) && !isNaN(v2)) {
                        this.edges.push({ v1, v2, group, color });
                    }
                }
                return;
            }
            // --- CASO 2: FORMATO ESTÁNDAR (.DAT / .OBJ / .TXT) ---
            // Normalizar comas y tabulaciones a espacios
            line = line.replace(/,/g, ' ').replace(/;/g, ' ');
            // Eliminar comentarios (# o //)
            const commentIdx = line.indexOf('#');
            if (commentIdx !== -1) {
                line = line.substring(0, commentIdx);
            }
            const commentDoubleSlashIdx = line.indexOf('//');
            if (commentDoubleSlashIdx !== -1) {
                line = line.substring(0, commentDoubleSlashIdx);
            }
            line = line.trim();
            if (line === '')
                return;
            const parts = line.split(/\s+/);
            const type = parts[0].toUpperCase();
            if (type === 'O' || type === 'G') {
                if (parts[1]) {
                    activeColeccionGroup = parts[1].trim();
                    if (!this.groups.includes(activeColeccionGroup)) {
                        this.groups.push(activeColeccionGroup);
                    }
                }
                return;
            }
            if (type === 'V') {
                // Formato flexible:
                // Caso A: V [id] [x] [y] [z] [grupo]
                // Caso B: V [x] [y] [z] [grupo] (formato OBJ estándar/sin ID)
                let id = 0;
                let x = 0;
                let y = 0;
                let z = 0;
                let group = 'default';
                // Determinar si hay ID
                // Si hay al menos 5 tokens en la línea y parts[4] es numérico, tiene ID
                const token4IsNum = parts[4] !== undefined && !isNaN(Number(parts[4]));
                if (token4IsNum) {
                    id = parseInt(parts[1], 10);
                    x = parseFloat(parts[2]);
                    y = parseFloat(parts[3]);
                    z = parseFloat(parts[4]);
                    group = parts[5] || activeColeccionGroup;
                }
                else {
                    // Formato OBJ estándar
                    id = this.vertices.length + 1; // Auto-generar ID secuencial
                    x = parseFloat(parts[1]);
                    y = parseFloat(parts[2]);
                    z = parseFloat(parts[3]);
                    group = parts[4] || activeColeccionGroup;
                }
                if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                    this.vertices.push({ id, x, y, z, group });
                    if (!this.groups.includes(group)) {
                        this.groups.push(group);
                    }
                }
            }
            else if (type === 'F') {
                // Formato: F [v1] [v2] ... [grupo] [color]
                // Soporta formatos OBJ con texturas/normales como 1/1/1 o 1//1
                const idxs = [];
                let i = 1;
                while (i < parts.length) {
                    const firstPart = parts[i].split('/')[0];
                    const idx = parseInt(firstPart, 10);
                    if (isNaN(idx)) {
                        break;
                    }
                    idxs.push(idx);
                    i++;
                }
                let group = 'default';
                let color = '#4a5568';
                if (i < parts.length) {
                    if (parts[i].startsWith('#') || parts[i].match(/^[a-zA-Z0-9]+$/)) {
                        color = parts[i];
                        i++;
                    }
                    else {
                        group = parts[i];
                        i++;
                        if (i < parts.length) {
                            color = parts[i];
                        }
                    }
                }
                if (idxs.length >= 3) {
                    this.faces.push({ indices: idxs, group, color });
                }
            }
            else if (type === 'E' || type === 'L') {
                // Formato: E/L [v1] [v2] [grupo] [color]
                if (parts[1] && parts[2]) {
                    const firstPart1 = parts[1].split('/')[0];
                    const firstPart2 = parts[2].split('/')[0];
                    const v1 = parseInt(firstPart1, 10);
                    const v2 = parseInt(firstPart2, 10);
                    let group = 'default';
                    let color = '#ffffff';
                    if (parts.length > 3) {
                        if (parts[3].startsWith('#') || parts[3].match(/^[a-zA-Z0-9]+$/)) {
                            color = parts[3];
                        }
                        else {
                            group = parts[3];
                            if (parts.length > 4) {
                                color = parts[4];
                            }
                        }
                    }
                    if (!isNaN(v1) && !isNaN(v2)) {
                        this.edges.push({ v1, v2, group, color });
                    }
                }
            }
        });
        // Auto-escalado y auto-centrado para encajar en el área de visualización
        if (this.vertices.length > 0) {
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;
            this.vertices.forEach(v => {
                if (v.x < minX)
                    minX = v.x;
                if (v.x > maxX)
                    maxX = v.x;
                if (v.y < minY)
                    minY = v.y;
                if (v.y > maxY)
                    maxY = v.y;
                if (v.z < minZ)
                    minZ = v.z;
                if (v.z > maxZ)
                    maxZ = v.z;
            });
            const cx = (minX + maxX) / 2;
            const cy = (minY + maxY) / 2;
            const cz = (minZ + maxZ) / 2;
            const dx = maxX - minX;
            const dy = maxY - minY;
            const dz = maxZ - minZ;
            const maxSpan = Math.max(dx, dy, dz);
            if (maxSpan > 0.001) {
                const scale = 3.0 / maxSpan;
                this.vertices.forEach(v => {
                    v.x_orig = v.x;
                    v.y_orig = v.y;
                    v.z_orig = v.z;
                    v.x = (v.x - cx) * scale;
                    v.y = (v.y - cy) * scale;
                    v.z = (v.z - cz) * scale;
                });
            }
        }
        // --- AUTODETECCIÓN Y SEPARACIÓN DE COMPONENTES POR CONECTIVIDAD SI HAY UN SOLO GRUPO ---
        const uniqueGroups = Array.from(new Set(this.vertices.map(v => v.group)));
        // Solo auto-separar si el nombre del archivo sugiere que es un modelo interactivo conocido (puerta, ventana, ventilador, etc.)
        const lowerFilename = filename.toLowerCase();
        const isAnimatableModel = lowerFilename.includes('puerta') || lowerFilename.includes('door') ||
            lowerFilename.includes('ventana') || lowerFilename.includes('window') ||
            lowerFilename.includes('ventilador') || lowerFilename.includes('fan') ||
            lowerFilename.includes('molino') || lowerFilename.includes('aspa') ||
            lowerFilename.includes('cajon') || lowerFilename.includes('drawer') ||
            lowerFilename.includes('sillon') || lowerFilename.includes('chair') ||
            lowerFilename.includes('silla');
        if (uniqueGroups.length <= 1 && this.vertices.length > 0 && this.faces.length > 0 && isAnimatableModel) {
            // 1. Construir grafo de adyacencia de vértices a partir de las caras
            const adj = new Map();
            this.vertices.forEach(v => adj.set(v.id, new Set()));
            this.faces.forEach(face => {
                for (let i = 0; i < face.indices.length; i++) {
                    for (let j = i + 1; j < face.indices.length; j++) {
                        const v1 = face.indices[i];
                        const v2 = face.indices[j];
                        if (adj.has(v1) && adj.has(v2)) {
                            adj.get(v1).add(v2);
                            adj.get(v2).add(v1);
                        }
                    }
                }
            });
            // 2. Encontrar componentes conectados usando BFS
            const visited = new Set();
            const components = [];
            this.vertices.forEach(v => {
                if (!visited.has(v.id)) {
                    const comp = [];
                    const queue = [v.id];
                    visited.add(v.id);
                    while (queue.length > 0) {
                        const curr = queue.shift();
                        comp.push(curr);
                        const neighbors = adj.get(curr);
                        if (neighbors) {
                            neighbors.forEach(n => {
                                if (!visited.has(n)) {
                                    visited.add(n);
                                    queue.push(n);
                                }
                            });
                        }
                    }
                    components.push(comp);
                }
            });
            // 3. Si hay múltiples componentes, separarlos inteligentemente en 'marco' e interactivo ('puerta' o 'aspas')
            if (components.length >= 2) {
                // Encontrar límites globales del modelo
                let globalMinX = Infinity, globalMaxX = -Infinity;
                let globalMinY = Infinity, globalMaxY = -Infinity;
                let globalMinZ = Infinity, globalMaxZ = -Infinity;
                this.vertices.forEach(v => {
                    if (v.x < globalMinX)
                        globalMinX = v.x;
                    if (v.x > globalMaxX)
                        globalMaxX = v.x;
                    if (v.y < globalMinY)
                        globalMinY = v.y;
                    if (v.y > globalMaxY)
                        globalMaxY = v.y;
                    if (v.z < globalMinZ)
                        globalMinZ = v.z;
                    if (v.z > globalMaxZ)
                        globalMaxZ = v.z;
                });
                const sizeX = globalMaxX - globalMinX;
                const sizeY = globalMaxY - globalMinY;
                const sizeZ = globalMaxZ - globalMinZ;
                // Tolerancias para determinar si un componente toca el borde exterior (5% del tamaño o un mínimo de 0.02)
                const epsX = Math.max(0.02, sizeX * 0.05);
                const epsY = Math.max(0.02, sizeY * 0.05);
                const lowerFilename = filename.toLowerCase();
                let movingGroupName = 'puerta';
                if (lowerFilename.includes('ventilador') || lowerFilename.includes('fan') || lowerFilename.includes('molino') || lowerFilename.includes('aspa')) {
                    movingGroupName = 'aspas';
                }
                else if (lowerFilename.includes('ventana') || lowerFilename.includes('window')) {
                    movingGroupName = 'ventana';
                }
                else if (lowerFilename.includes('cajon') || lowerFilename.includes('drawer')) {
                    movingGroupName = 'cajon';
                }
                else if (lowerFilename.includes('sillon') || lowerFilename.includes('chair') || lowerFilename.includes('silla')) {
                    movingGroupName = 'sillon';
                }
                // Asignar grupo a los vértices de cada componente
                this.groups = ['marco', movingGroupName];
                const vertexMap = new Map();
                this.vertices.forEach(v => vertexMap.set(v.id, v));
                components.forEach(comp => {
                    // Límites locales de este componente
                    let compMinX = Infinity, compMaxX = -Infinity;
                    let compMinY = Infinity, compMaxY = -Infinity;
                    let compMinZ = Infinity, compMaxZ = -Infinity;
                    comp.forEach(vid => {
                        const v = vertexMap.get(vid);
                        if (v) {
                            if (v.x < compMinX)
                                compMinX = v.x;
                            if (v.x > compMaxX)
                                compMaxX = v.x;
                            if (v.y < compMinY)
                                compMinY = v.y;
                            if (v.y > compMaxY)
                                compMaxY = v.y;
                            if (v.z < compMinZ)
                                compMinZ = v.z;
                            if (v.z > compMaxZ)
                                compMaxZ = v.z;
                        }
                    });
                    // Regla de clasificación:
                    let isStatic = false;
                    if (movingGroupName === 'aspas') {
                        // Para ventiladores, la base toca el fondo (Y minimo)
                        isStatic = (compMinY <= globalMinY + epsY);
                    }
                    else {
                        // Para puertas, ventanas, etc., el marco toca los bordes izquierdo/derecho exteriores
                        isStatic = (compMinX <= globalMinX + epsX) || (compMaxX >= globalMaxX - epsX);
                    }
                    const assignedGroup = isStatic ? 'marco' : movingGroupName;
                    // Actualizar vértices del componente
                    comp.forEach(vid => {
                        const v = vertexMap.get(vid);
                        if (v) {
                            v.group = assignedGroup;
                        }
                    });
                });
                // Actualizar grupos en las caras a partir de sus vértices
                this.faces.forEach(face => {
                    if (face.indices.length > 0) {
                        const firstVertex = vertexMap.get(face.indices[0]);
                        if (firstVertex) {
                            face.group = firstVertex.group;
                        }
                    }
                });
            }
        }
        // Inicializar configuraciones de grupos y autodetectar perfiles de animación
        this.groupConfigs = [];
        this.groups.forEach(group => {
            // Calcular pivote por defecto para este grupo (centro de masa)
            const groupVertices = this.vertices.filter(v => v.group === group);
            let px = 0, py = 0, pz = 0;
            if (groupVertices.length > 0) {
                let sumX = 0, sumY = 0, sumZ = 0;
                groupVertices.forEach(v => {
                    sumX += v.x;
                    sumY += v.y;
                    sumZ += v.z;
                });
                px = sumX / groupVertices.length;
                py = sumY / groupVertices.length;
                pz = sumZ / groupVertices.length;
            }
            // Autodetectar perfil de animación según convención de nombres
            const lowerGroup = group.toLowerCase();
            let type = 'none';
            let axis = 'Y';
            let speed = 0.04;
            let maxVal = 90;
            // 1. Componentes de giro continuo (aspas, ruedas, etc.)
            if (lowerGroup.includes('aspa') || lowerGroup.includes('fan') || lowerGroup.includes('rotor') || lowerGroup.includes('molino') || lowerGroup.includes('giro') || lowerGroup.includes('spin') || lowerGroup.includes('rueda') || lowerGroup.includes('wheel')) {
                type = 'spin';
                axis = 'Z';
                speed = 0.03;
                maxVal = 360;
            }
            // 2. Manecillas de reloj (girar sobre Z, horas más lento)
            else if (lowerGroup.includes('manecilla') || lowerGroup.includes('hand') || lowerGroup.includes('needle') || lowerGroup.includes('minuto') || lowerGroup.includes('minute') || lowerGroup.includes('hora') || lowerGroup.includes('hour') || lowerGroup.includes('segundo') || lowerGroup.includes('second')) {
                type = 'spin';
                axis = 'Z';
                speed = (lowerGroup.includes('hora') || lowerGroup.includes('hour')) ? 0.002 : 0.024;
                maxVal = 360;
            }
            // 3. Componentes de oscilación (cabeza de ventilador, etc.)
            else if (lowerGroup.includes('cabeza') || lowerGroup.includes('head') || lowerGroup.includes('oscila') || lowerGroup.includes('motor')) {
                type = 'swing';
                axis = 'Y';
                speed = 0.015;
                maxVal = 60;
            }
            // 4. Componentes de deslizamiento (cajones, etc.)
            else if (lowerGroup.includes('cajon') || lowerGroup.includes('drawer') || lowerGroup.includes('gaveta') || lowerGroup.includes('desliza') || lowerGroup.includes('slide')) {
                type = 'slide';
                axis = 'Z';
                speed = 0.02;
                maxVal = 0.8;
            }
            // 5. Sillones y sillas plegables (swing sobre X)
            else if (lowerGroup.includes('sillon') || lowerGroup.includes('plegable') || lowerGroup.includes('chair') || lowerGroup.includes('fold') || lowerGroup.includes('silla')) {
                type = 'swing';
                axis = 'X';
                speed = 0.04;
                maxVal = 90;
            }
            // 6. Puertas y ventanas abatibles (swing sobre Y)
            else if (lowerGroup.includes('puerta') || lowerGroup.includes('door') || lowerGroup.includes('ventana') || lowerGroup.includes('window') || lowerGroup.includes('abatible') || lowerGroup.includes('swing')) {
                type = 'swing';
                axis = 'Y';
                speed = 0.04;
                maxVal = 90;
            }
            // 7. Por defecto, cualquier otro grupo es ESTÁTICO (evita que se muevan piezas por error)
            else {
                type = 'none';
            }
            // Detectar eje explícito en el nombre (ej. puerta_X o aspa_z)
            if (lowerGroup.includes('_x'))
                axis = 'X';
            else if (lowerGroup.includes('_y'))
                axis = 'Y';
            else if (lowerGroup.includes('_z'))
                axis = 'Z';
            // Ajustar pivote para puertas/ventanas de tipo swing (deben rotar sobre una bisagra lateral)
            if (type === 'swing' && axis === 'Y') {
                let gMinX = Infinity, gMaxX = -Infinity;
                let gMinY = Infinity, gMaxY = -Infinity;
                let gMinZ = Infinity, gMaxZ = -Infinity;
                groupVertices.forEach(v => {
                    if (v.x < gMinX)
                        gMinX = v.x;
                    if (v.x > gMaxX)
                        gMaxX = v.x;
                    if (v.y < gMinY)
                        gMinY = v.y;
                    if (v.y > gMaxY)
                        gMaxY = v.y;
                    if (v.z < gMinZ)
                        gMinZ = v.z;
                    if (v.z > gMaxZ)
                        gMaxZ = v.z;
                });
                // Contar densidad en la mitad izquierda vs mitad derecha.
                // Si hay una concentración desigual (por ejemplo, manijas detalladas), la bisagra estará en el extremo opuesto.
                const midX = (gMinX + gMaxX) / 2;
                let leftCount = 0;
                let rightCount = 0;
                groupVertices.forEach(v => {
                    if (v.x < midX)
                        leftCount++;
                    else
                        rightCount++;
                });
                px = (leftCount > rightCount) ? gMaxX : gMinX;
                py = (gMinY + gMaxY) / 2;
                pz = (gMinZ + gMaxZ) / 2;
            }
            else if (type === 'swing' && axis === 'X') {
                let gMinY = Infinity, gMaxY = -Infinity;
                let gMinZ = Infinity, gMaxZ = -Infinity;
                groupVertices.forEach(v => {
                    if (v.y < gMinY)
                        gMinY = v.y;
                    if (v.y > gMaxY)
                        gMaxY = v.y;
                    if (v.z < gMinZ)
                        gMinZ = v.z;
                    if (v.z > gMaxZ)
                        gMaxZ = v.z;
                });
                py = gMinY;
                pz = (gMinZ + gMaxZ) / 2;
            }
            // Ajustar pivote para manecillas de reloj para que giren exactamente en el centro (0,0,0) de la esfera
            if (lowerGroup.includes('manecilla') || lowerGroup.includes('hand') || lowerGroup.includes('needle') || lowerGroup.includes('minuto') || lowerGroup.includes('minute') || lowerGroup.includes('hora') || lowerGroup.includes('hour') || lowerGroup.includes('segundo') || lowerGroup.includes('second')) {
                px = 0;
                py = 0;
                pz = 0;
            }
            this.groupConfigs.push({
                name: group,
                type,
                axis,
                speed,
                maxVal,
                currentVal: 0,
                targetState: (lowerGroup.includes('cabeza') || lowerGroup.includes('oscila') || lowerGroup.includes('head') || lowerGroup.includes('motor')) ? 'open' : 'closed',
                pivotX: px,
                pivotY: py,
                pivotZ: pz
            });
        });
        // Autodetectar jerarquías Padre-Hijo (ej. manija de puerta)
        this.groupConfigs.forEach(config => {
            const lowerName = config.name.toLowerCase();
            // No parentar si el componente es estático/estructural por definición
            if (config.type === 'none') {
                return;
            }
            if (lowerName.includes('manija') || lowerName.includes('handle') || lowerName.includes('pomo') || lowerName.includes('perilla') || lowerName.includes('cerradura') || lowerName.includes('picaporte')) {
                const parent = this.groupConfigs.find(c => {
                    const cl = c.name.toLowerCase();
                    return cl !== lowerName && (cl.includes('puerta') || cl.includes('door') || cl.includes('ventana') || cl.includes('window') || cl.includes('cajon') || cl.includes('drawer'));
                });
                if (parent) {
                    config.parentName = parent.name;
                }
            }
            if (config.name.includes('_')) {
                const parts = config.name.split('_');
                const parentCandidate = parts[parts.length - 1];
                const parent = this.groupConfigs.find(c => c.name.toLowerCase() === parentCandidate.toLowerCase());
                if (parent && parent.name !== config.name) {
                    config.parentName = parent.name;
                }
            }
            // Si es aspa/rotor y hay una cabeza/motor, la cabeza es el padre de las aspas
            if (lowerName.includes('aspa') || lowerName.includes('rotor') || lowerName.includes('blade') || lowerName.includes('fan')) {
                const parent = this.groupConfigs.find(c => {
                    const cl = c.name.toLowerCase();
                    return cl.includes('cabeza') || cl.includes('motor') || cl.includes('head');
                });
                if (parent) {
                    config.parentName = parent.name;
                }
            }
        });
        const movingGroup = this.groups.find(g => g !== 'base' && g !== 'default' && g !== 'cubo');
        if (movingGroup) {
            this.activeAnimGroup = movingGroup;
        }
        else if (this.groups.length > 0) {
            this.activeAnimGroup = this.groups[0];
        }
        this.updateDefaultPivot();
        return {
            groups: this.groups,
            verticesCount: this.vertices.length,
            facesCount: this.faces.length
        };
    }
    // --- AUTO-CALCULAR PIVOTE ---
    updateDefaultPivot() {
        const animGroupVertices = this.vertices.filter(v => v.group === this.activeAnimGroup);
        if (animGroupVertices.length > 0) {
            let sumX = 0;
            let sumY = 0;
            let sumZ = 0;
            animGroupVertices.forEach(v => {
                sumX += v.x;
                sumY += v.y;
                sumZ += v.z;
            });
            this.pivotX = sumX / animGroupVertices.length;
            this.pivotY = sumY / animGroupVertices.length;
            this.pivotZ = sumZ / animGroupVertices.length;
        }
    }
    // --- TRANSFOMACIÓN JERÁRQUICA DE UN PUNTO ---
    getTransformedPoint(x, y, z, groupName) {
        const config = this.groupConfigs.find(c => c.name === groupName);
        if (!config) {
            return { x, y, z };
        }
        let rx = x;
        let ry = y;
        let rz = z;
        if (config.type !== 'none') {
            // 1. Trasladar al origen del pivote local
            const dx = x - config.pivotX;
            const dy = y - config.pivotY;
            const dz = z - config.pivotZ;
            let tx = dx;
            let ty = dy;
            let tz = dz;
            // 2. Aplicar la animación (Rotación o Traslación)
            if (config.type === 'spin' || config.type === 'swing') {
                const cosA = Math.cos(config.currentVal);
                const sinA = Math.sin(config.currentVal);
                if (config.axis === 'X') {
                    ty = dy * cosA - dz * sinA;
                    tz = dy * sinA + dz * cosA;
                }
                else if (config.axis === 'Y') {
                    tx = dx * cosA + dz * sinA;
                    tz = -dx * sinA + dz * cosA;
                }
                else { // Z
                    tx = dx * cosA - dy * sinA;
                    ty = dx * sinA + dy * cosA;
                }
            }
            else if (config.type === 'slide') {
                if (config.axis === 'X') {
                    tx = dx + config.currentVal;
                }
                else if (config.axis === 'Y') {
                    ty = dy + config.currentVal;
                }
                else { // Z
                    tz = dz + config.currentVal;
                }
            }
            // 3. Regresar del pivote
            rx = tx + config.pivotX;
            ry = ty + config.pivotY;
            rz = tz + config.pivotZ;
        }
        // 4. Aplicar recursivamente la transformación del grupo padre
        if (config.parentName && config.parentName !== 'none' && config.parentName !== 'default' && config.parentName !== groupName) {
            return this.getTransformedPoint(rx, ry, rz, config.parentName);
        }
        return { x: rx, y: ry, z: rz };
    }
    // --- TRANSFOMACIÓN LOCAL DE LA PIEZA MOVIL ---
    getTransformedVertex(v) {
        if (this.groupConfigs.length > 0) {
            return this.getTransformedPoint(v.x, v.y, v.z, v.group);
        }
        if (v.group !== this.activeAnimGroup) {
            return { x: v.x, y: v.y, z: v.z };
        }
        // Trasladar al origen del pivote
        const dx = v.x - this.pivotX;
        const dy = v.y - this.pivotY;
        const dz = v.z - this.pivotZ;
        let rx = dx, ry = dy, rz = dz;
        const cosA = Math.cos(this.animAngle);
        const sinA = Math.sin(this.animAngle);
        // Rotar según el eje seleccionado
        if (this.activeAnimAxis === 'X') {
            ry = dy * cosA - dz * sinA;
            rz = dy * sinA + dz * cosA;
        }
        else if (this.activeAnimAxis === 'Y') {
            rx = dx * cosA + dz * sinA;
            rz = -dx * sinA + dz * cosA;
        }
        else { // Z axis
            rx = dx * cosA - dy * sinA;
            ry = dx * sinA + dy * cosA;
        }
        // Regresar al pivote
        return {
            x: rx + this.pivotX,
            y: ry + this.pivotY,
            z: rz + this.pivotZ
        };
    }
    // --- PROYECCIÓN PERSPECTIVA 3D A 2D ---
    projectPoint(x, y, z) {
        // 1. Rotación de Cámara Y (Yaw)
        const cosY = Math.cos(this.camRotY);
        const sinY = Math.sin(this.camRotY);
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        // 2. Rotación de Cámara X (Pitch)
        const cosX = Math.cos(this.camRotX);
        const sinX = Math.sin(this.camRotX);
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        // 3. Proyección de Perspectiva
        const cameraDistance = 6.0;
        const viewZ = z2 + cameraDistance;
        // Evitar división por cero
        const safeViewZ = viewZ < 0.1 ? 0.1 : viewZ;
        const fov = 3.5; // Factor de campo visual
        const factor = fov / safeViewZ;
        const x2d = this.centerX + x1 * factor * this.zoom;
        const y2d = this.centerY - y2 * factor * this.zoom;
        // Distancia Euclidiana del punto a la cámara (profundidad absoluta)
        const depth = Math.sqrt(x1 * x1 + y2 * y2 + safeViewZ * safeViewZ);
        return { x2d, y2d, depth };
    }
    // --- OBTENER CADENA FORMATEADA DE COORDENADAS ---
    getFormattedCoordinates() {
        if (this.vertices.length === 0) {
            return "Sin archivo cargado. Sube un archivo .dat o .txt para ver sus coordenadas.";
        }
        let result = "--- VÉRTICES (COORDENADAS ORIGINALES) ---\n";
        this.vertices.forEach(v => {
            const origX = v.x_orig !== undefined ? v.x_orig : v.x;
            const origY = v.y_orig !== undefined ? v.y_orig : v.y;
            const origZ = v.z_orig !== undefined ? v.z_orig : v.z;
            const trans = this.getTransformedVertex(v);
            result += `Vértice ${v.id.toString().padStart(2, '0')} [Grupo: ${v.group.padEnd(8, ' ')}] -> `;
            result += `Original: (${origX.toFixed(2)}, ${origY.toFixed(2)}, ${origZ.toFixed(2)})\n`;
        });
        result += "\n--- CARAS (POLÍGONOS) ---\n";
        this.faces.forEach((f, idx) => {
            result += `Cara ${(idx + 1).toString().padStart(2, '0')} [Grupo: ${f.group.padEnd(8, ' ')}] -> Vértices: [${f.indices.join(', ')}] | Color: ${f.color}\n`;
        });
        if (this.edges.length > 0) {
            result += "\n--- ARISTAS (LÍNEAS) ---\n";
            this.edges.forEach((e, idx) => {
                result += `Arista ${(idx + 1).toString().padStart(2, '0')} [Grupo: ${e.group.padEnd(8, ' ')}] -> Vértice ${e.v1} a Vértice ${e.v2} | Color: ${e.color}\n`;
            });
        }
        return result;
    }
    // --- OBTENER CONFIGURACIÓN DE UN GRUPO ---
    getGroupConfig(name) {
        return this.groupConfigs.find(c => c.name === name);
    }
    // --- CONMUTAR ESTADO DE ANIMACIÓN DE UN GRUPO ---
    toggleGroupState(groupName) {
        let config = this.getGroupConfig(groupName);
        if (!config)
            return;
        const lowerName = groupName.toLowerCase();
        // Permitir control independiente
        if (lowerName.includes('aspa') || lowerName.includes('fan') || lowerName.includes('rotor')) {
            config.speed = config.speed === 0 ? 0.03 : 0;
            return;
        }
        if (lowerName.includes('cabeza') || lowerName.includes('head') || lowerName.includes('oscila') || lowerName.includes('motor')) {
            config.speed = config.speed === 0 ? 0.015 : 0;
            return;
        }
        // Propagar al grupo padre si este grupo es estático
        while (config && config.type === 'none' && config.parentName && config.parentName !== 'none') {
            const parent = this.getGroupConfig(config.parentName);
            if (parent) {
                config = parent;
            }
            else {
                break;
            }
        }
        if (config) {
            if (config.type === 'swing' || config.type === 'slide') {
                config.targetState = config.targetState === 'open' ? 'closed' : 'open';
            }
            else if (config.type === 'spin') {
                // Alternar el giro: si está girando, pausarlo (speed = 0). Si está pausado, reanudarlo (speed = 0.03).
                config.speed = config.speed === 0 ? 0.03 : 0;
            }
        }
    }
    // --- ACTUALIZAR ÁNGULO DE ANIMACIÓN ---
    updateAnimation() {
        if (this.isAnimating) {
            this.animAngle += this.animSpeed;
            if (this.animAngle > Math.PI * 2) {
                this.animAngle -= Math.PI * 2;
            }
        }
        // Factor de multiplicación de velocidad (con base en la velocidad original 0.03)
        const multiplier = this.animSpeed / 0.03;
        // Actualizar cada grupo de forma independiente
        this.groupConfigs.forEach(config => {
            if (config.type === 'spin') {
                config.currentVal += config.speed * multiplier;
                if (config.currentVal > Math.PI * 2) {
                    config.currentVal -= Math.PI * 2;
                }
            }
            else if (config.type === 'swing') {
                const maxValRad = config.maxVal * Math.PI / 180;
                const targetVal = config.targetState === 'open' ? maxValRad : 0;
                const step = config.speed * multiplier;
                if (config.currentVal < targetVal) {
                    config.currentVal += step;
                    if (config.currentVal > targetVal)
                        config.currentVal = targetVal;
                }
                else if (config.currentVal > targetVal) {
                    config.currentVal -= step;
                    if (config.currentVal < targetVal)
                        config.currentVal = targetVal;
                }
                // --- AUTOMATIC OSCILLATION BOUNCE FOR HEADS ---
                if (config.name.toLowerCase().includes('cabeza') || config.name.toLowerCase().includes('oscila') || config.name.toLowerCase().includes('head') || config.name.toLowerCase().includes('motor')) {
                    if (config.currentVal === targetVal) {
                        config.targetState = config.targetState === 'open' ? 'closed' : 'open';
                    }
                }
            }
            else if (config.type === 'slide') {
                const targetVal = config.targetState === 'open' ? config.maxVal : 0;
                const step = config.speed * multiplier;
                if (config.currentVal < targetVal) {
                    config.currentVal += step;
                    if (config.currentVal > targetVal)
                        config.currentVal = targetVal;
                }
                else if (config.currentVal > targetVal) {
                    config.currentVal -= step;
                    if (config.currentVal < targetVal)
                        config.currentVal = targetVal;
                }
            }
        });
    }
    // --- DIBUJAR ---
    paint() {
        // Limpiar canvas
        this.graphics.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Si no hay modelo, pintar aviso
        if (this.vertices.length === 0) {
            this.graphics.fillStyle = '#a0aec0';
            this.graphics.font = '16px Outfit, sans-serif';
            this.graphics.textAlign = 'center';
            this.graphics.fillText('Carga un archivo .dat o .txt para comenzar', this.centerX, this.centerY);
            return;
        }
        const facesWithDepth = this.faces.map(f => {
            let sumDepth = 0;
            let validCount = 0;
            f.indices.forEach(idx => {
                const v = this.vertices.find(vert => vert.id === idx);
                if (v) {
                    const trans = this.getTransformedVertex(v);
                    const proj = this.projectPoint(trans.x, trans.y, trans.z);
                    sumDepth += proj.depth;
                    validCount++;
                }
            });
            return {
                face: f,
                avgDepth: validCount > 0 ? sumDepth / validCount : 0
            };
        });
        // Ordenar de mayor profundidad (más lejano) a menor (más cercano)
        facesWithDepth.sort((a, b) => b.avgDepth - a.avgDepth);
        // Dibujar caras
        facesWithDepth.forEach(fd => {
            const f = fd.face;
            if (f.indices.length < 3)
                return;
            this.graphics.beginPath();
            let first = true;
            f.indices.forEach(idx => {
                const v = this.vertices.find(vert => vert.id === idx);
                if (v) {
                    const trans = this.getTransformedVertex(v);
                    const proj = this.projectPoint(trans.x, trans.y, trans.z);
                    if (first) {
                        this.graphics.moveTo(proj.x2d, proj.y2d);
                        first = false;
                    }
                    else {
                        this.graphics.lineTo(proj.x2d, proj.y2d);
                    }
                }
            });
            this.graphics.closePath();
            // Relleno: Los componentes estáticos (como el marco o muros) se dibujan semitransparentes para que no tapen el vacío al abrir la puerta
            const config = this.getGroupConfig(f.group);
            if (config && config.type === 'none') {
                this.graphics.fillStyle = 'rgba(255, 255, 255, 0.03)';
            }
            else {
                this.graphics.fillStyle = f.color;
            }
            this.graphics.fill();
            // Contorno suave para destacar caras 3D
            this.graphics.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            this.graphics.lineWidth = 1;
            this.graphics.stroke();
        });
        // 2. DIBUJAR LAS ARISTAS (Líneas que complementan el diseño)
        this.edges.forEach(e => {
            const v1 = this.vertices.find(vert => vert.id === e.v1);
            const v2 = this.vertices.find(vert => vert.id === e.v2);
            if (v1 && v2) {
                const trans1 = this.getTransformedVertex(v1);
                const trans2 = this.getTransformedVertex(v2);
                const proj1 = this.projectPoint(trans1.x, trans1.y, trans1.z);
                const proj2 = this.projectPoint(trans2.x, trans2.y, trans2.z);
                this.graphics.beginPath();
                this.graphics.moveTo(proj1.x2d, proj1.y2d);
                this.graphics.lineTo(proj2.x2d, proj2.y2d);
                this.graphics.strokeStyle = e.color;
                this.graphics.lineWidth = 2.5;
                this.graphics.stroke();
            }
        });
        // 3. DIBUJAR VÉRTICES COMO PUNTOS SI NO HAY CARAS NI ARISTAS
        if (this.faces.length === 0 && this.edges.length === 0) {
            this.vertices.forEach(v => {
                const trans = this.getTransformedVertex(v);
                const proj = this.projectPoint(trans.x, trans.y, trans.z);
                this.graphics.beginPath();
                this.graphics.arc(proj.x2d, proj.y2d, 3.5, 0, Math.PI * 2);
                this.graphics.fillStyle = '#68d391';
                this.graphics.fill();
                this.graphics.strokeStyle = '#2d3748';
                this.graphics.lineWidth = 1;
                this.graphics.stroke();
            });
        }
        // 4. EL PIVOTE YA NO SE DIBUJA PARA EVITAR CONFUSIONES CON LA GEOMETRÍA DEL MODELO
    }
    // --- DETECTAR SI UN PUNTO ESTÁ DENTRO DE UN POLÍGONO 2D (PNPOLY) ---
    isPointInPolygon(px, py, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            const intersect = ((yi > py) !== (yj > py))
                && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
            if (intersect)
                inside = !inside;
        }
        return inside;
    }
    // --- DISTANCIA DE UN PUNTO A UN SEGMENTO DE RECTA ---
    distanceToSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const l2 = dx * dx + dy * dy;
        if (l2 === 0)
            return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
        let t = ((px - x1) * dx + (py - y1) * dy) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.sqrt((px - (x1 + t * dx)) * (px - (x1 + t * dx)) + (py - (y1 + t * dy)) * (py - (y1 + t * dy)));
    }
    // --- DETECTAR QUÉ GRUPO FUE SELECCIONADO POR CLIC (PICKING) ---
    pickGroup(mouseX, mouseY) {
        if (this.vertices.length === 0)
            return null;
        const facesWithDepth = [];
        this.faces.forEach(f => {
            let sumDepth = 0;
            let validCount = 0;
            const poly2d = [];
            f.indices.forEach(idx => {
                const v = this.vertices.find(vert => vert.id === idx);
                if (v) {
                    const trans = this.getTransformedVertex(v);
                    const proj = this.projectPoint(trans.x, trans.y, trans.z);
                    sumDepth += proj.depth;
                    validCount++;
                    poly2d.push({ x: proj.x2d, y: proj.y2d });
                }
            });
            if (validCount >= 3) {
                facesWithDepth.push({
                    face: f,
                    avgDepth: sumDepth / validCount,
                    poly2d
                });
            }
        });
        // 2. Ordenar las caras por profundidad ascendente (la más cercana/menor profundidad primero)
        facesWithDepth.sort((a, b) => a.avgDepth - b.avgDepth);
        // 3. Evaluar si el clic está dentro de alguna cara (comenzando por la más cercana)
        for (const fd of facesWithDepth) {
            if (this.isPointInPolygon(mouseX, mouseY, fd.poly2d)) {
                return fd.face.group;
            }
        }
        // 4. Si no hay caras (ej. wireframe puro) o no se tocó ninguna cara, probar con las aristas
        let closestEdgeGroup = null;
        let minDistance = 8.0; // Píxeles de tolerancia
        this.edges.forEach(e => {
            const v1 = this.vertices.find(vert => vert.id === e.v1);
            const v2 = this.vertices.find(vert => vert.id === e.v2);
            if (v1 && v2) {
                const trans1 = this.getTransformedVertex(v1);
                const trans2 = this.getTransformedVertex(v2);
                const proj1 = this.projectPoint(trans1.x, trans1.y, trans1.z);
                const proj2 = this.projectPoint(trans2.x, trans2.y, trans2.z);
                const dist = this.distanceToSegment(mouseX, mouseY, proj1.x2d, proj1.y2d, proj2.x2d, proj2.y2d);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestEdgeGroup = e.group;
                }
            }
        });
        if (closestEdgeGroup) {
            return closestEdgeGroup;
        }
        // 5. Probar con vértices individuales (si no hay caras ni aristas)
        if (this.faces.length === 0 && this.edges.length === 0) {
            let closestVertexGroup = null;
            let minVertDist = 10.0; // Píxeles de tolerancia
            this.vertices.forEach(v => {
                const trans = this.getTransformedVertex(v);
                const proj = this.projectPoint(trans.x, trans.y, trans.z);
                const dist = Math.sqrt((mouseX - proj.x2d) * (mouseX - proj.x2d) + (mouseY - proj.y2d) * (mouseY - proj.y2d));
                if (dist < minVertDist) {
                    minVertDist = dist;
                    closestVertexGroup = v.group;
                }
            });
            if (closestVertexGroup) {
                return closestVertexGroup;
            }
        }
        return null;
    }
    // --- DIBUJAR MENSAJE DE INCOMPATIBILIDAD ---
    paintIncompatibleMessage() {
        this.graphics.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.graphics.fillStyle = '#fc8181'; // Rojo suave
        this.graphics.font = 'bold 16px Outfit, sans-serif';
        this.graphics.textAlign = 'center';
        this.graphics.fillText('El archivo cargado no es compatible', this.centerX, this.centerY - 10);
        this.graphics.fillStyle = '#a0aec0'; // Gris
        this.graphics.font = '14px Outfit, sans-serif';
        this.graphics.fillText('Asegúrate de definir los vértices con líneas que empiecen con "V".', this.centerX, this.centerY + 15);
    }
}
