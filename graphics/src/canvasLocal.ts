export interface Vertex {
  id: number;
  x: number;
  y: number;
  z: number;
  group: string;
  x_orig?: number;
  y_orig?: number;
  z_orig?: number;
}

export interface Face {
  indices: number[];
  group: string;
  color: string;
}

export interface Edge {
  v1: number;
  v2: number;
  group: string;
  color: string;
}

export class CanvasLocal {
  protected graphics: CanvasRenderingContext2D;
  protected canvas: HTMLCanvasElement;
  protected maxX: number;
  protected maxY: number;
  protected centerX: number;
  protected centerY: number;

  // Listas de datos cargados del modelo 3D
  public vertices: Vertex[] = [];
  public faces: Face[] = [];
  public edges: Edge[] = [];
  public groups: string[] = [];

  // Parámetros de Cámara y Proyección
  public camRotX: number = 20 * Math.PI / 180; // Pitch (Rotación vertical)
  public camRotY: number = -35 * Math.PI / 180; // Yaw (Rotación horizontal)
  public zoom: number = 120; // Factor de escala

  // Parámetros de Animación
  public isAnimating: boolean = true;
  public animAngle: number = 0;
  public animSpeed: number = 0.03;
  public activeAnimGroup: string = 'aspas';
  public activeAnimAxis: 'X' | 'Y' | 'Z' = 'Z';

  // Punto de Pivote para la Animación local
  public pivotX: number = 0;
  public pivotY: number = 1.2;
  public pivotZ: number = 0.35;

  public constructor(g: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    this.graphics = g;
    this.canvas = canvas;
    this.maxX = canvas.width - 1;
    this.maxY = canvas.height - 1;
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
  }

  // --- PARSEADOR DE ARCHIVOS .DAT / .TXT ---
  public loadModelFromText(text: string): { groups: string[], verticesCount: number, facesCount: number } {
    this.vertices = [];
    this.faces = [];
    this.edges = [];
    this.groups = [];

    const lines = text.split('\n');
    let inFacesSection = false;
    let activeColeccionGroup = 'default';

    lines.forEach(line => {
      let trimmed = line.trim();
      if (trimmed === '') return;

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
        const colMatch = trimmed.match(/#\s*Colección:\s*([^\s(]+)/i);
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
          } else if (lowerGroup.includes('base')) {
            color = '#2d3748';
          } else {
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
          if (color === 'base') color = '#2d3748';
          if (color === 'aspas') color = '#2d3748';
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
          if (color === 'base') color = '#2d3748';
          if (color === 'aspas') color = '#2d3748';

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
      if (line === '') return;

      const parts = line.split(/\s+/);
      const type = parts[0].toUpperCase();

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
          group = parts[5] || 'default';
        } else {
          // Formato OBJ estándar
          id = this.vertices.length + 1; // Auto-generar ID secuencial
          x = parseFloat(parts[1]);
          y = parseFloat(parts[2]);
          z = parseFloat(parts[3]);
          group = parts[4] || 'default';
        }

        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
          this.vertices.push({ id, x, y, z, group });
          if (!this.groups.includes(group)) {
            this.groups.push(group);
          }
        }
      } else if (type === 'F') {
        // Formato: F [v1] [v2] ... [grupo] [color]
        // Soporta formatos OBJ con texturas/normales como 1/1/1 o 1//1
        const idxs: number[] = [];
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
          } else {
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
      } else if (type === 'E' || type === 'L') {
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
            } else {
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
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
        if (v.z < minZ) minZ = v.z;
        if (v.z > maxZ) maxZ = v.z;
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

    // Auto-ajustar pivote para la pieza móvil por defecto
    const movingGroup = this.groups.find(g => g !== 'base' && g !== 'default' && g !== 'cubo');
    if (movingGroup) {
      this.activeAnimGroup = movingGroup;
    } else if (this.groups.length > 0) {
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
  public updateDefaultPivot() {
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

  // --- TRANSFOMACIÓN LOCAL DE LA PIEZA MOVIL ---
  public getTransformedVertex(v: Vertex): { x: number, y: number, z: number } {
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
    } else if (this.activeAnimAxis === 'Y') {
      rx = dx * cosA + dz * sinA;
      rz = -dx * sinA + dz * cosA;
    } else { // Z axis
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
  public projectPoint(x: number, y: number, z: number): { x2d: number, y2d: number, depth: number } {
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
  public getFormattedCoordinates(): string {
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

  // --- ACTUALIZAR ÁNGULO DE ANIMACIÓN ---
  public updateAnimation() {
    if (this.isAnimating) {
      this.animAngle += this.animSpeed;
      if (this.animAngle > Math.PI * 2) {
        this.animAngle -= Math.PI * 2;
      }
    }
  }

  // --- DIBUJAR ---
  public paint() {
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

    // 1. DIBUJAR LAS CARAS (Ordenadas por profundidad - Painter's Algorithm)
    interface FaceWithDepth {
      face: Face;
      avgDepth: number;
    }

    const facesWithDepth: FaceWithDepth[] = this.faces.map(f => {
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
      if (f.indices.length < 3) return;

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
          } else {
            this.graphics.lineTo(proj.x2d, proj.y2d);
          }
        }
      });

      this.graphics.closePath();

      // Relleno
      this.graphics.fillStyle = f.color;
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

    // 4. DIBUJAR EL PIVOTE EN LA PANTALLA (Para retroalimentación visual)
    const projPivot = this.projectPoint(this.pivotX, this.pivotY, this.pivotZ);
    this.graphics.beginPath();
    this.graphics.arc(projPivot.x2d, projPivot.y2d, 4, 0, Math.PI * 2);
    this.graphics.fillStyle = '#ff3333';
    this.graphics.fill();
    this.graphics.strokeStyle = '#ffffff';
    this.graphics.lineWidth = 1.5;
    this.graphics.stroke();
  }

  // --- DIBUJAR MENSAJE DE INCOMPATIBILIDAD ---
  public paintIncompatibleMessage() {
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