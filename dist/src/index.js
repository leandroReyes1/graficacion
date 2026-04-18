import { CanvasLocal } from './canvasLocal.js';

const canvas = document.getElementById('circlechart');
const graphics = canvas.getContext('2d');
const miCanvas = new CanvasLocal(graphics, canvas);

// Dibujo inicial al cargar la página
miCanvas.paint();

// Evento para el botón
document.getElementById('btnDibujar').addEventListener('click', () => {
    // Simplemente llamamos a paint, la clase ya sabe leer el input
    miCanvas.paint();
});