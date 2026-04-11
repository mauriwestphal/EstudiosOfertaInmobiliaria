#!/usr/bin/env node

/**
 * Script para generar estudios/index.json
 * Este script crea un índice de todos los estudios disponibles
 * Se debe ejecutar manualmente después de agregar nuevos estudios
 */

const fs = require('fs');
const path = require('path');

const estudiosDir = path.join(__dirname, '..', 'data', 'estudios');
const outputFile = path.join(estudiosDir, 'index.json');

function generarIndice() {
  try {
    // Leer todos los archivos .json en el directorio estudios/
    const files = fs.readdirSync(estudiosDir)
      .filter(file => file.endsWith('.json') && file !== 'index.json');
    
    const estudios = [];
    
    files.forEach(file => {
      try {
        const filePath = path.join(estudiosDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const estudio = JSON.parse(content);
        
        estudios.push({
          codigo: estudio.meta?.codigo || path.basename(file, '.json'),
          fecha_creacion: estudio.meta?.fecha || null,
          proyecto: estudio.meta?.proyecto || null,
          inmobiliaria: estudio.meta?.cliente || estudio.meta?.inmobiliaria || null,
          direccion: estudio.meta?.direccion || null,
        });
      } catch (error) {
        console.warn(`Error procesando ${file}:`, error.message);
      }
    });
    
    // Ordenar por fecha (más reciente primero)
    estudios.sort((a, b) => {
      const dateA = a.fecha_creacion ? new Date(a.fecha_creacion) : new Date(0);
      const dateB = b.fecha_creacion ? new Date(b.fecha_creacion) : new Date(0);
      return dateB - dateA;
    });
    
    const indexData = {
      generado: new Date().toISOString(),
      total: estudios.length,
      estudios: estudios
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(indexData, null, 2));
    console.log(`✅ Índice generado: ${estudios.length} estudios en ${outputFile}`);
    
  } catch (error) {
    console.error('❌ Error generando índice:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generarIndice();
}

module.exports = { generarIndice };