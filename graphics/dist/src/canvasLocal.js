export class CanvasLocal {
    constructor(g, canvas) {
        this.graphics = g;
        this.maxX = canvas.width - 1;
        this.maxY = canvas.height - 1;
        this.centerX = this.maxX / 2;
        this.centerY = this.maxY / 2;
    }

    // Transformación para centrar y ajustar coordenadas (opcional, pero ayuda)
    // En este caso, usaremos coordenadas directas del canvas para simplificar
    iX(x) { return Math.round(x); }
    iY(y) { return this.maxY - Math.round(y); } // Invierte el eje Y para que suba

    drawLine(x1, y1, x2, y2) {
        this.graphics.beginPath();
        this.graphics.moveTo(x1, y1);
        this.graphics.lineTo(x2, y2);
        this.graphics.stroke();
    }

    paint() {
    let side = Math.min(this.maxX, this.maxY) * 0.8;
    let offset = (this.maxX - side) / 2;
    
    // 1. Vértices del cuadrado inicial
    let xA = offset,        yA = offset;
    let xB = offset + side, yB = offset;
    let xC = offset + side, yC = offset + side;
    let xD = offset,        yD = offset + side;

    let q = 0.05; // Factor de desplazamiento
    let p = 1 - q;

    for (let i = 0; i < 10; i++) {
        // 2. Dibujar las 4 líneas del cuadrado actual
        this.drawLine(xA, yA, xB, yB);
        this.drawLine(xB, yB, xC, yC);
        this.drawLine(xC, yC, xD, yD);
        this.drawLine(xD, yD, xA, yA);

        // 3. Calcular nuevos vértices (Interpolación lineal)
        let xA1 = p * xA + q * xB;
        let yA1 = p * yA + q * yB;
        
        let xB1 = p * xB + q * xC;
        let yB1 = p * yB + q * yC;
        
        let xC1 = p * xC + q * xD;
        let yC1 = p * yC + q * yD;
        
        let xD1 = p * xD + q * xA;
        let yD1 = p * yD + q * yA;

        // Actualizar para la siguiente vuelta
        xA = xA1; yA = yA1;
        xB = xB1; yB = yB1;
        xC = xC1; yC = yC1;
        xD = xD1; yD = yD1;
    }
}
}