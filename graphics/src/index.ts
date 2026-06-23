import { CanvasLocal } from './canvasLocal.js';

let canvas: HTMLCanvasElement;
let graphics: CanvasRenderingContext2D;

canvas = <HTMLCanvasElement>document.getElementById('circlechart');
graphics = canvas.getContext('2d')!;

const miCanvas = new CanvasLocal(graphics, canvas);

// --- Elementos de la Interfaz ---
const fileInput = <HTMLInputElement>document.getElementById('fileInput');
const coordinatesDisplay = <HTMLDivElement>document.getElementById('coordinatesDisplay');

const camRotXSlider = <HTMLInputElement>document.getElementById('camRotX');
const camRotYSlider = <HTMLInputElement>document.getElementById('camRotY');
const zoomSlider = <HTMLInputElement>document.getElementById('zoomSlider');

const btnPlayPause = <HTMLButtonElement>document.getElementById('btnPlayPause');
const speedSlider = <HTMLInputElement>document.getElementById('speedSlider');

// --- Actualizar Interfaz con Datos del Modelo ---
function updateUIFromModel() {
  // Mostrar coordenadas actualizadas
  if (coordinatesDisplay) {
    coordinatesDisplay.textContent = miCanvas.getFormattedCoordinates();
  }

  // Ajustar pivote por defecto
  miCanvas.updateDefaultPivot();
}

// --- Evento Carga de Archivos ---
if (fileInput) {
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const stats = miCanvas.loadModelFromText(text);
      
      if (stats.verticesCount === 0) {
        // Mostrar mensaje de archivo incompatible
        if (coordinatesDisplay) {
          coordinatesDisplay.textContent = "ERROR: El archivo no es compatible.\n\nEl archivo cargado no contiene vértices válidos (líneas con prefijo 'V' o con formato estructurado de Blender/Python).\nPor favor, verifica el formato de tu archivo.";
          coordinatesDisplay.style.setProperty('color', '#fc8181', 'important');
        }
        miCanvas.vertices = [];
        miCanvas.faces = [];
        miCanvas.edges = [];
        miCanvas.paintIncompatibleMessage();
      } else {
        if (coordinatesDisplay) {
          coordinatesDisplay.style.setProperty('color', '#68d391', 'important');
        }
        updateUIFromModel();
        miCanvas.paint();
      }
    };
    reader.readAsText(file);
  });
}

// --- Controles de Cámara por Slider ---
if (camRotXSlider) {
  camRotXSlider.addEventListener('input', () => {
    miCanvas.camRotX = parseFloat(camRotXSlider.value) * Math.PI / 180;
    const lbl = document.getElementById('lblCamRotX');
    if (lbl) lbl.textContent = camRotXSlider.value;
    miCanvas.paint();
  });
}
if (camRotYSlider) {
  camRotYSlider.addEventListener('input', () => {
    miCanvas.camRotY = parseFloat(camRotYSlider.value) * Math.PI / 180;
    const lbl = document.getElementById('lblCamRotY');
    if (lbl) lbl.textContent = camRotYSlider.value;
    miCanvas.paint();
  });
}
if (zoomSlider) {
  zoomSlider.addEventListener('input', () => {
    miCanvas.zoom = parseFloat(zoomSlider.value);
    miCanvas.paint();
  });
}

// --- Controles de Animación (Play/Pause y Velocidad) ---
if (btnPlayPause) {
  btnPlayPause.addEventListener('click', () => {
    miCanvas.isAnimating = !miCanvas.isAnimating;
    btnPlayPause.textContent = miCanvas.isAnimating ? 'Pausar' : 'Reanudar';
    btnPlayPause.className = miCanvas.isAnimating ? 'btn btn-primary fw-bold' : 'btn btn-success fw-bold';
  });
}

if (speedSlider) {
  speedSlider.addEventListener('input', () => {
    const val = parseInt(speedSlider.value, 10);
    // Mapeo: 30 de slider es la velocidad original 0.03.
    miCanvas.animSpeed = val * 0.001; 
    const lbl = document.getElementById('lblSpeed');
    if (lbl) {
      lbl.textContent = `${(val / 30).toFixed(1)}x`;
    }
  });
}

// --- Arrastre de Mouse para Rotación del Canvas (3D Orbit) ---
let isDragging = false;
let prevMousePos = { x: 0, y: 0 };

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  prevMousePos = { x: e.clientX, y: e.clientY };
  canvas.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;

  const dx = e.clientX - prevMousePos.x;
  const dy = e.clientY - prevMousePos.y;

  // Ajustar rotaciones (Yaw y Pitch)
  miCanvas.camRotY += dx * 0.006;
  miCanvas.camRotX += dy * 0.006;

  // Limitar pitch vertical para evitar inversiones de cámara
  const pitchLimit = 85 * Math.PI / 180;
  if (miCanvas.camRotX > pitchLimit) miCanvas.camRotX = pitchLimit;
  if (miCanvas.camRotX < -pitchLimit) miCanvas.camRotX = -pitchLimit;

  // Sincronizar Sliders y Etiquetas de la interfaz
  if (camRotXSlider) camRotXSlider.value = Math.round(miCanvas.camRotX * 180 / Math.PI).toString();
  if (camRotYSlider) camRotYSlider.value = Math.round(miCanvas.camRotY * 180 / Math.PI).toString();

  const lblX = document.getElementById('lblCamRotX');
  if (lblX) lblX.textContent = Math.round(miCanvas.camRotX * 180 / Math.PI).toString();
  const lblY = document.getElementById('lblCamRotY');
  if (lblY) lblY.textContent = Math.round(miCanvas.camRotY * 180 / Math.PI).toString();

  prevMousePos = { x: e.clientX, y: e.clientY };
  miCanvas.paint();
});

window.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    canvas.style.cursor = 'grab';
  }
});

// --- Bucle de Animación ---
function animationLoop() {
  if (miCanvas.isAnimating) {
    miCanvas.updateAnimation();
    miCanvas.paint();
    // Actualizar coordenadas en tiempo real al animar
    if (coordinatesDisplay) {
      coordinatesDisplay.textContent = miCanvas.getFormattedCoordinates();
    }
  }
  requestAnimationFrame(animationLoop);
}

// Inicialización
canvas.style.cursor = 'grab';
updateUIFromModel();
miCanvas.paint();
animationLoop();