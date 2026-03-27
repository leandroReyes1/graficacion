export class CanvasLocal {
    constructor(g, canvas) {
        this.graphics = g;
        this.canvas = canvas;
        this.maxX = canvas.width - 1;
        this.maxY = canvas.height - 1;
        
        this.funcionActual = null;

        // Rangos iniciales (Zoom por defecto)
        this.rX = 5; 
        this.rY = 5;
        this.updateScale();
    }

    updateScale() {
        // Aseguramos una proporción 1:1 para que no se deforme la parábola
        this.pixelSize = Math.max((this.rX * 2) / this.maxX, (this.rY * 2) / this.maxY);
        this.centerX = this.maxX / 2;
        this.centerY = this.maxY / 2;
    }

    iX(x) { return Math.round(this.centerX + x / this.pixelSize); }
    iY(y) { return Math.round(this.centerY - y / this.pixelSize); }

    drawLine(x1, y1, x2, y2) {
        this.graphics.beginPath();
        this.graphics.moveTo(x1, y1);
        this.graphics.lineTo(x2, y2);
        this.graphics.stroke();
    }

    setFuncion(texto) {
        if (!texto || texto.trim() === "") {
            this.funcionActual = null;
            this.rX = 5; this.rY = 5; // Reset zoom
            this.updateScale();
            return;
        }
        try {
            this.funcionActual = new Function('x', `return ${texto};`);
            
            // Lógica de Zoom Automático (revisamos un rango amplio)
            let maxVal = 0;
            for (let x = -20; x <= 20; x += 0.5) {
                let y = Math.abs(this.funcionActual(x));
                if (isFinite(y) && y > maxVal) maxVal = y;
            }

            // Ajuste de zoom dinámico pero contenido
            if (maxVal > 5) {
                this.rY = Math.ceil(maxVal * 1.1); // 10% de margen arriba/abajo
                this.rX = Math.ceil(this.rY * (this.maxX / this.maxY)); // Mantenemos proporción del canvas
            } else {
                this.rY = 5; this.rX = 5 * (this.maxX / this.maxY); 
            }
            this.updateScale();

        } catch (e) {
            alert("Error en la fórmula.");
        }
    }

    // Función auxiliar para decidir el intervalo de la cuadrícula
    getStep(range) {
        if (range <= 10) return 1;
        if (range <= 20) return 2;
        if (range <= 50) return 5;
        if (range <= 100) return 10;
        if (range <= 200) return 20;
        return 50; // Para zooms muy grandes
    }

    paint() {
        // Limpiar fondo a blanco puro
        this.graphics.fillStyle = "white";
        this.graphics.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Decidir intervalo de líneas basado en el zoom actual
        let stepX = this.getStep(this.rX * 2);
        let stepY = this.getStep(this.rY * 2);

        // 1. DIBUJAR CUADRÍCULA (Líneas finas y gris muy claro)
        this.graphics.strokeStyle = '#e8e8e8'; // Gris muy suave
        this.graphics.lineWidth = 0.5; // Línea extra fina

        // Líneas verticales (X)
        for (let x = Math.floor(-this.rX / stepX) * stepX; x <= this.rX; x += stepX) {
            this.drawLine(this.iX(x), 0, this.iX(x), this.maxY + 1);
        }
        // Líneas horizontales (Y)
        for (let y = Math.floor(-this.rY / stepY) * stepY; y <= this.rY; y += stepY) {
            this.drawLine(0, this.iY(y), this.maxX + 1, this.iY(y));
        }

        // 2. DIBUJAR EJES PRINCIPALES (Negro, un poco más gruesos)
        this.graphics.strokeStyle = '#333'; // Casi negro
        this.graphics.lineWidth = 1.5;
        this.drawLine(this.iX(-this.rX), this.iY(0), this.iX(this.rX), this.iY(0)); // Eje X
        this.drawLine(this.iX(0), this.iY(this.rY), this.iX(0), this.iY(-this.rY)); // Eje Y

        // 3. DIBUJAR NÚMEROS (Claridad ante todo)
        this.graphics.fillStyle = "#333";
        this.graphics.font = "11px sans-serif";
        this.graphics.lineWidth = 1;

        // Números en X (debajo del eje)
        for (let x = Math.floor(-this.rX / stepX) * stepX; x <= this.rX; x += stepX) {
            if (x === 0) continue;
            let pX = this.iX(x);
            // Solo dibujar si está lejos de los bordes para no cortarse
            if (pX > 20 && pX < this.maxX - 20) {
                this.graphics.fillText(x.toString(), pX - 5, this.iY(0) + 14);
            }
        }

        // Números en Y (a la izquierda del eje)
        for (let y = Math.floor(-this.rY / stepY) * stepY; y <= this.rY; y += stepY) {
            if (y === 0) continue;
            let pY = this.iY(y);
            // Solo dibujar si está lejos de los bordes
            if (pY > 20 && pY < this.maxY - 20) {
                this.graphics.fillText(y.toString(), this.iX(0) - 25, pY + 4);
            }
        }

        // 4. DIBUJAR LA FUNCIÓN ROJA
        if (this.funcionActual) {
            this.graphics.strokeStyle = 'red';
            this.graphics.lineWidth = 2.5; // Línea de la función bien visible
            this.graphics.lineJoin = "round"; // Suaviza las esquinas de la línea

            let paso = (this.rX * 2) / 500; // Alta precisión para curvas suaves
            this.graphics.beginPath();
            
            let firstPoint = true;
            for (let x = -this.rX; x <= this.rX; x += paso) {
                try {
                    let y = this.funcionActual(x);
                    if (isFinite(y)) {
                        if (firstPoint) {
                            this.graphics.moveTo(this.iX(x), this.iY(y));
                            firstPoint = false;
                        } else {
                            this.graphics.lineTo(this.iX(x), this.iY(y));
                        }
                    } else {
                        firstPoint = true; // Reiniciar si hay discontinuidad
                    }
                } catch (e) {}
            }
            this.graphics.stroke();
        }
    }
}