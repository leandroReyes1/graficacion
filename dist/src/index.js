import { CanvasLocal } from './canvasLocal.js';

const canvas = document.getElementById('circlechart');
const graphics = canvas.getContext('2d');
const miCanvas = new CanvasLocal(graphics, canvas);

// Inicia vacío
document.getElementById('funcInput').value = ""; 
miCanvas.paint();

document.getElementById('btnDibujar').addEventListener('click', () => {
    const formula = document.getElementById('funcInput').value;
    miCanvas.setFuncion(formula);
    miCanvas.paint();
});