export class CanvasLocal {
    constructor(g, canvas) {
        this.graphics = g;
        this.canvas = canvas;
        this.rWidth = 12;
        this.rHeight = 8;
        this.maxX = canvas.width - 1;
        this.maxY = canvas.height - 1;
        this.pixelSize = Math.max(this.rWidth / this.maxX, this.rHeight / this.maxY);
        
        // Margen para etiquetas a la izquierda
        this.centerX = this.maxX / 12 * 2.5; 
        this.centerY = this.maxY / 8 * 7;
    }

    iX(x) { return Math.round(this.centerX + x / this.pixelSize); }
    iY(y) { return Math.round(this.centerY - y / this.pixelSize); }

    drawLine(x1, y1, x2, y2) {
        this.graphics.beginPath();
        this.graphics.moveTo(x1, y1);
        this.graphics.lineTo(x2, y2);
        this.graphics.stroke();
    }

    // LEE LOS DATOS DIRECTO DE LA PANTALLA
    getDatosDesdePantalla() {
        const input = document.getElementById('funcInput');
        if (input && input.value.trim() !== "") {
            return input.value.split(',').map(Number).filter(n => !isNaN(n));
        }
        return [10, 20, 30]; // Valores por defecto
    }

    maxH(h) {
        let max = Math.max(...h);
        let pot = 10;
        while (pot < max) pot *= 10;
        pot /= 10;
        return Math.ceil(max / pot) * pot;
    }

    paint() {
        this.graphics.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        let h = this.getDatosDesdePantalla();
        let maxEsc = this.maxH(h);
        let colors = ['magenta', 'red', 'green', 'yellow', 'blue', 'orange', 'cyan'];
        
        // Ejes
        this.graphics.strokeStyle = 'black';
        this.drawLine(this.iX(0), this.iY(0), this.iX(0), this.iY(6)); // Y
        this.drawLine(this.iX(0), this.iY(0), this.iX(8), this.iY(0)); // X

        // Escala numérica horizontal
        for (let i = 0; i <= 4; i++) {
            let val = (maxEsc * i) / 4;
            this.graphics.strokeText(val.toString(), this.iX((i * 8) / 4) - 10, this.iY(-0.5));
        }

        let ancho = 0.5;
        let espacio = 6 / h.length;

        h.forEach((valor, ind) => {
            let yPos = ind * espacio + 0.3;
            let largo = (valor * 8) / maxEsc;
            let colorActual = colors[ind % colors.length];

            this.graphics.fillStyle = colorActual;
            
            // CARA FRONTAL
            this.graphics.fillRect(this.iX(0), this.iY(yPos + ancho), this.iX(largo) - this.iX(0), this.iY(yPos) - this.iY(yPos + ancho));
            this.graphics.strokeRect(this.iX(0), this.iY(yPos + ancho), this.iX(largo) - this.iX(0), this.iY(yPos) - this.iY(yPos + ancho));

            // EFECTO 3D (Tapas)
            let p = 0.3;
            this.graphics.beginPath();
            this.graphics.moveTo(this.iX(largo), this.iY(yPos));
            this.graphics.lineTo(this.iX(largo + p), this.iY(yPos + p));
            this.graphics.lineTo(this.iX(largo + p), this.iY(yPos + ancho + p));
            this.graphics.lineTo(this.iX(largo), this.iY(yPos + ancho));
            this.graphics.fill();
            this.graphics.stroke();

            // ETIQUETAS
            this.graphics.fillStyle = 'black';
            this.graphics.fillText(colorActual, this.iX(-2.2), this.iY(yPos + 0.15));
            this.graphics.fillText(valor.toString(), this.iX(largo + 0.5), this.iY(yPos + 0.15));
        });
    }
}