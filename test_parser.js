const fs = require('fs');
const path = require('path');

// Mock standard browser objects
global.CanvasRenderingContext2D = class {};
global.HTMLCanvasElement = class {};

// Import the compiled CanvasLocal
const { CanvasLocal } = require('./dist/src/canvasLocal.js');

try {
  const mockContext = {};
  const mockCanvas = { width: 800, height: 600 };
  const canvasLocalInstance = new CanvasLocal(mockContext, mockCanvas);

  const fileContent = fs.readFileSync(path.join(__dirname, 'data', 'test_blender.txt'), 'utf8');
  console.log('--- Archivo Cargado ---');
  console.log(fileContent);

  const stats = canvasLocalInstance.loadModelFromText(fileContent);
  console.log('\n--- Estadísticas de Carga ---');
  console.log(`Grupos detectados: ${JSON.stringify(stats.groups)}`);
  console.log(`Vértices detectados: ${stats.verticesCount}`);
  console.log(`Caras detectadas: ${stats.facesCount}`);

  console.log('\n--- Coordenadas Formateadas ---');
  const formatted = canvasLocalInstance.getFormattedCoordinates();
  console.log(formatted);

  // Verificaciones básicas
  if (stats.verticesCount === 11 && stats.facesCount === 7) {
    console.log('\n✅ ¡ÉXITO! El parser ha procesado correctamente el nuevo formato de Blender.');
  } else {
    console.log(`\n❌ ERROR: Se esperaban 11 vértices y 7 caras, pero se obtuvieron ${stats.verticesCount} vértices y ${stats.facesCount} caras.`);
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ ERROR AL EJECUTAR LA PRUEBA:', error);
  process.exit(1);
}
