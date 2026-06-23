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
  if (coordinatesDisplay) {
    coordinatesDisplay.textContent = miCanvas.getFormattedCoordinates();
  }
  miCanvas.updateDefaultPivot();
}
// --- Sincronizar el panel lateral de componentes ---
function updateAccordionUI() {
  const btnGlobalAction = <HTMLButtonElement>document.getElementById('btnGlobalAction');
  if (!btnGlobalAction) return;

  const btnOscilacionAction = <HTMLButtonElement>document.getElementById('btnOscilacionAction');

  const hasCabeza = miCanvas.groupConfigs.some(c => 
    c.name.toLowerCase().includes('cabeza') || 
    c.name.toLowerCase().includes('head') || 
    c.name.toLowerCase().includes('oscila') || 
    c.name.toLowerCase().includes('motor')
  );
  const hasAspas = miCanvas.groupConfigs.some(c => 
    c.name.toLowerCase().includes('aspa') || 
    c.name.toLowerCase().includes('fan') || 
    c.name.toLowerCase().includes('rotor')
  );

  if (hasCabeza && hasAspas) {
    // Es un ventilador: actualizar ambos botones
    const aspaConfig = miCanvas.groupConfigs.find(c => 
      c.name.toLowerCase().includes('aspa') || 
      c.name.toLowerCase().includes('fan') || 
      c.name.toLowerCase().includes('rotor')
    );
    const cabezaConfig = miCanvas.groupConfigs.find(c => 
      c.name.toLowerCase().includes('cabeza') || 
      c.name.toLowerCase().includes('head') || 
      c.name.toLowerCase().includes('oscila') || 
      c.name.toLowerCase().includes('motor')
    );

    if (aspaConfig) {
      const isSpinning = aspaConfig.speed > 0;
      btnGlobalAction.textContent = isSpinning ? 'Pausar Giro de Aspas' : 'Girar Aspas';
      btnGlobalAction.className = isSpinning ? 'btn btn-lg btn-warning fw-bold w-100 py-3 shadow mb-2' : 'btn btn-lg btn-success fw-bold w-100 py-3 shadow mb-2';
    }

    if (cabezaConfig && btnOscilacionAction) {
      const isOscillating = cabezaConfig.speed > 0;
      btnOscilacionAction.textContent = isOscillating ? 'Detener Oscilación (Fijar)' : 'Activar Oscilación';
      btnOscilacionAction.className = isOscillating ? 'btn btn-lg btn-info fw-bold w-100 py-3 shadow' : 'btn btn-lg btn-secondary fw-bold w-100 py-3 shadow';
    }
  } else {
    // Comportamiento normal para otros modelos
    const swingSlideConfigs = miCanvas.groupConfigs.filter(c => 
      (c.type === 'swing' || c.type === 'slide') && 
      !c.name.toLowerCase().includes('cabeza') && 
      !c.name.toLowerCase().includes('head') && 
      !c.name.toLowerCase().includes('oscila') &&
      !c.name.toLowerCase().includes('motor')
    );
    const spinConfigs = miCanvas.groupConfigs.filter(c => c.type === 'spin');

    if (swingSlideConfigs.length > 0) {
      const hasOpen = swingSlideConfigs.some(c => c.targetState === 'open');
      btnGlobalAction.textContent = hasOpen ? 'Cerrar' : 'Abrir';
      btnGlobalAction.className = hasOpen ? 'btn btn-lg btn-warning fw-bold w-100 py-3 shadow' : 'btn btn-lg btn-success fw-bold w-100 py-3 shadow';
      btnGlobalAction.style.display = 'block';
    } else if (spinConfigs.length > 0) {
      const isSpinning = spinConfigs.some(c => c.speed > 0);
      btnGlobalAction.textContent = isSpinning ? 'Pausar Giro' : 'Girar';
      btnGlobalAction.className = isSpinning ? 'btn btn-lg btn-warning fw-bold w-100 py-3 shadow' : 'btn btn-lg btn-success fw-bold w-100 py-3 shadow';
      btnGlobalAction.style.display = 'block';
    } else {
      btnGlobalAction.textContent = 'Modelo Estático';
      btnGlobalAction.className = 'btn btn-lg btn-secondary fw-bold w-100 py-3 disabled';
      btnGlobalAction.style.display = 'block';
    }
  }
}

// --- Generación Dinámica del Panel de Componentes ---
function rebuildComponentsPanel() {
  const componentsPanel = document.getElementById('componentsPanel');
  if (!componentsPanel) return;

  componentsPanel.innerHTML = '';

  if (miCanvas.groupConfigs.length === 0) {
    componentsPanel.innerHTML = '<p class="text-muted small text-center py-3">Carga un modelo estructurado para ver sus componentes.</p>';
    return;
  }

  const hasCabeza = miCanvas.groupConfigs.some(c => 
    c.name.toLowerCase().includes('cabeza') || 
    c.name.toLowerCase().includes('head') || 
    c.name.toLowerCase().includes('oscila') || 
    c.name.toLowerCase().includes('motor')
  );
  const hasAspas = miCanvas.groupConfigs.some(c => 
    c.name.toLowerCase().includes('aspa') || 
    c.name.toLowerCase().includes('fan') || 
    c.name.toLowerCase().includes('rotor')
  );

  const divContainer = document.createElement('div');
  divContainer.className = 'py-2 d-flex flex-column gap-2';

  const button = document.createElement('button');
  button.id = 'btnGlobalAction';
  button.className = 'btn btn-lg btn-success fw-bold w-100 py-3 shadow';
  button.textContent = 'Acción';
  divContainer.appendChild(button);

  let btnOscilacion: HTMLButtonElement | null = null;

  if (hasCabeza && hasAspas) {
    btnOscilacion = document.createElement('button');
    btnOscilacion.id = 'btnOscilacionAction';
    btnOscilacion.className = 'btn btn-lg btn-secondary fw-bold w-100 py-3 shadow';
    btnOscilacion.textContent = 'Oscilar Cabeza';
    divContainer.appendChild(btnOscilacion);

    btnOscilacion.addEventListener('click', () => {
      const cabezaConfig = miCanvas.groupConfigs.find(c => 
        c.name.toLowerCase().includes('cabeza') || 
        c.name.toLowerCase().includes('head') || 
        c.name.toLowerCase().includes('oscila') || 
        c.name.toLowerCase().includes('motor')
      );
      if (cabezaConfig) {
        cabezaConfig.speed = cabezaConfig.speed === 0 ? 0.015 : 0;
      }
      miCanvas.paint();
      updateUIFromModel();
      updateAccordionUI();
    });
  }

  componentsPanel.appendChild(divContainer);

  button.addEventListener('click', () => {
    if (hasCabeza && hasAspas) {
      const aspaConfig = miCanvas.groupConfigs.find(c => 
        c.name.toLowerCase().includes('aspa') || 
        c.name.toLowerCase().includes('fan') || 
        c.name.toLowerCase().includes('rotor')
      );
      if (aspaConfig) {
        aspaConfig.speed = aspaConfig.speed === 0 ? 0.03 : 0;
      }
    } else {
      const swingSlideConfigs = miCanvas.groupConfigs.filter(c => 
        (c.type === 'swing' || c.type === 'slide') && 
        !c.name.toLowerCase().includes('cabeza') && 
        !c.name.toLowerCase().includes('head') && 
        !c.name.toLowerCase().includes('oscila') &&
        !c.name.toLowerCase().includes('motor')
      );
      const spinConfigs = miCanvas.groupConfigs.filter(c => c.type === 'spin');

      if (swingSlideConfigs.length > 0) {
        const hasOpen = swingSlideConfigs.some(c => c.targetState === 'open');
        const nextState = hasOpen ? 'closed' : 'open';
        swingSlideConfigs.forEach(c => {
          c.targetState = nextState;
        });
      } else if (spinConfigs.length > 0) {
        miCanvas.toggleGroupState(spinConfigs[0].name);
      }
    }

    miCanvas.paint();
    updateUIFromModel();
    updateAccordionUI();
  });

  updateAccordionUI();
}
// --- Evento Carga de Archivos ---
if (fileInput) {
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const stats = miCanvas.loadModelFromText(text, file.name);
      
      if (stats.verticesCount === 0) {
        if (coordinatesDisplay) {
          coordinatesDisplay.textContent = "ERROR: El archivo no es compatible.\n\nEl archivo cargado no contiene vértices válidos (líneas con prefijo 'V' o con formato estructurado de Blender/Python).\nPor favor, verifica el formato de tu archivo.";
          coordinatesDisplay.style.setProperty('color', '#fc8181', 'important');
        }
        miCanvas.vertices = [];
        miCanvas.faces = [];
        miCanvas.edges = [];
        miCanvas.groupConfigs = [];
        miCanvas.paintIncompatibleMessage();
        rebuildComponentsPanel();
      } else {
        if (coordinatesDisplay) {
          coordinatesDisplay.style.setProperty('color', '#68d391', 'important');
        }
        updateUIFromModel();
        rebuildComponentsPanel();
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

// --- Arrastre de Mouse para Rotación del Canvas (3D Orbit) e Interacción ---
let isDragging = false;
let prevMousePos = { x: 0, y: 0 };
let mouseDownPos = { x: 0, y: 0 };
let mouseDownTime = 0;

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  prevMousePos = { x: e.clientX, y: e.clientY };
  mouseDownPos = { x: e.clientX, y: e.clientY };
  mouseDownTime = Date.now();
  canvas.style.cursor = 'grabbing';
});

// Cambiar cursor a 'pointer' al pasar sobre componentes interactivos
canvas.addEventListener('mousemove', (e) => {
  if (isDragging) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const hoveredGroup = miCanvas.pickGroup(mouseX, mouseY);
  if (hoveredGroup) {
    const config = miCanvas.getGroupConfig(hoveredGroup);
    let isInteractive = false;
    if (config) {
      let current: any = config;
      while (current) {
        if (current.type !== 'none') {
          isInteractive = true;
          break;
        }
        current = current.parentName ? miCanvas.getGroupConfig(current.parentName) : undefined;
      }
    }
    canvas.style.cursor = isInteractive ? 'pointer' : 'grab';
  } else {
    canvas.style.cursor = 'grab';
  }
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

window.addEventListener('mouseup', (e) => {
  if (isDragging) {
    isDragging = false;
    canvas.style.cursor = 'grab';

    // Determinar si fue un clic corto sin arrastre
    const dx = e.clientX - mouseDownPos.x;
    const dy = e.clientY - mouseDownPos.y;
    const dragDistance = Math.sqrt(dx * dx + dy * dy);
    const duration = Date.now() - mouseDownTime;

    if (dragDistance < 5 && duration < 300) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const clickedGroup = miCanvas.pickGroup(mouseX, mouseY);
      if (clickedGroup) {
        miCanvas.toggleGroupState(clickedGroup);
        miCanvas.paint();
        updateUIFromModel();
        updateAccordionUI();
      }
    }
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

// Inicialización y Carga de Modelo por Defecto (Ventilador)
canvas.style.cursor = 'grab';

fetch('./ventilador_estructurado_limpio.txt')
  .then(response => {
    if (!response.ok) {
      throw new Error('No se pudo cargar el modelo por defecto');
    }
    return response.text();
  })
  .then(text => {
    miCanvas.loadModelFromText(text, 'ventilador_estructurado_limpio.txt');
    updateUIFromModel();
    rebuildComponentsPanel();
    miCanvas.paint();
  })
  .catch(err => {
    console.warn('Advertencia al cargar modelo por defecto:', err);
    updateUIFromModel();
    miCanvas.paint();
  });

animationLoop();