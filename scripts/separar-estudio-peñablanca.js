#!/usr/bin/env node
/**
 * Script para separar el estudio PEÑABLANCA en dos estudios:
 * 1. PEÑABLANCA - CASAS (solo proyectos de casas)
 * 2. PEÑABLANCA - DEPARTAMENTOS (solo proyectos de departamentos)
 */

const fs = require('fs');
const path = require('path');

const ESTUDIO_ORIGINAL = path.join(__dirname, '..', 'data', 'estudios', 'EST-2026-VK-5R2N.json');

// Leer el estudio original
const estudio = JSON.parse(fs.readFileSync(ESTUDIO_ORIGINAL, 'utf8'));

// Separar competencia por tipo
const competenciaCasas = estudio.competencia.filter(r => r.tipo_propiedad === 'casa');
const competenciaDeptos = estudio.competencia.filter(r => r.tipo_propiedad === 'departamento');

console.log(`📊 Estudio original: ${estudio.meta.codigo}`);
console.log(`   Total registros: ${estudio.competencia.length}`);
console.log(`   Casas: ${competenciaCasas.length}`);
console.log(`   Departamentos: ${competenciaDeptos.length}`);

// Función para crear un estudio separado
function crearEstudioSeparado(tipo, competenciaFiltrada) {
  const nuevoEstudio = JSON.parse(JSON.stringify(estudio)); // Deep clone
  
  // Actualizar metadata
  const sufijo = tipo === 'casa' ? 'CASAS' : 'DEPTOS';
  nuevoEstudio.meta.codigo = `EST-2026-VK-${tipo === 'casa' ? 'CASA' : 'DEPT'}`;
  nuevoEstudio.meta.proyecto = `Proyecto Peñablanca - ${sufijo}`;
  nuevoEstudio.meta.nota_separacion = `Separado del estudio original EST-2026-VK-5R2N para análisis específico de ${tipo === 'casa' ? 'casas' : 'departamentos'}`;
  
  // Actualizar proyecto evaluado (vacío por ahora)
  nuevoEstudio.proyecto_evaluado.tipo = tipo === 'casa' ? 'casas' : 'departamentos';
  
  // Filtrar competencia
  nuevoEstudio.competencia = competenciaFiltrada;
  
  // Actualizar resumen_mercado
  if (nuevoEstudio.resumen_mercado) {
    // Mantener solo los promedios del tipo correspondiente
    if (tipo === 'casa') {
      delete nuevoEstudio.resumen_mercado.promedio_por_tipologia_deptos;
      // Renombrar para claridad
      nuevoEstudio.resumen_mercado.promedio_por_tipologia_casas = {
        ...nuevoEstudio.resumen_mercado.promedio_por_tipologia_casas,
        nota: 'Promedios calculados solo sobre proyectos de casas'
      };
    } else {
      delete nuevoEstudio.resumen_mercado.promedio_por_tipologia_casas;
      // Renombrar para claridad
      nuevoEstudio.resumen_mercado.promedio_por_tipologia_deptos = {
        ...nuevoEstudio.resumen_mercado.promedio_por_tipologia_deptos,
        nota: 'Promedios calculados solo sobre proyectos de departamentos'
      };
    }
    
    // Actualizar por_zona
    Object.keys(nuevoEstudio.resumen_mercado.por_zona).forEach(zona => {
      const datosZona = nuevoEstudio.resumen_mercado.por_zona[zona];
      
      if (tipo === 'casa') {
        // Para estudio de casas, mantener solo datos de casas
        datosZona.tipo = 'casas';
        delete datosZona.rango_uf_m2_deptos;
        delete datosZona.disponibles_deptos;
      } else {
        // Para estudio de departamentos, mantener solo datos de departamentos
        datosZona.tipo = 'departamentos';
        delete datosZona.rango_uf_m2_casas;
        delete datosZona.disponibles_casas;
      }
    });
    
    // Actualizar observaciones
    nuevoEstudio.resumen_mercado.observaciones = tipo === 'casa' 
      ? 'Análisis específico de mercado de casas en el sector Peñablanca y zonas aledañas. Separado del estudio original que incluía también departamentos.'
      : 'Análisis específico de mercado de departamentos en Curauma, zona más cercana con oferta de departamentos. Separado del estudio original que incluía también casas.';
  }
  
  return nuevoEstudio;
}

// Crear estudios separados
const estudioCasas = crearEstudioSeparado('casa', competenciaCasas);
const estudioDeptos = crearEstudioSeparado('departamento', competenciaDeptos);

// Guardar estudios
const outputDir = path.join(__dirname, '..', 'data', 'estudios');
const fileCasas = path.join(outputDir, 'EST-2026-VK-CASA.json');
const fileDeptos = path.join(outputDir, 'EST-2026-VK-DEPT.json');

fs.writeFileSync(fileCasas, JSON.stringify(estudioCasas, null, 2), 'utf8');
fs.writeFileSync(fileDeptos, JSON.stringify(estudioDeptos, null, 2), 'utf8');

console.log(`\n✅ Estudios creados:`);
console.log(`   1. ${path.basename(fileCasas)} - ${competenciaCasas.length} proyectos de casas`);
console.log(`   2. ${path.basename(fileDeptos)} - ${competenciaDeptos.length} proyectos de departamentos`);
console.log(`\n📁 Ubicación: ${outputDir}`);

// Actualizar index.json
const indexFile = path.join(outputDir, 'index.json');
let indexData = { estudios: [] };
try {
  indexData = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  if (!indexData.estudios) indexData.estudios = [];
} catch (e) {
  console.log('⚠️  index.json no encontrado o inválido, creando nuevo');
}

// Agregar nuevos estudios al índice
const estudiosNuevos = [
  {
    codigo: estudioCasas.meta.codigo,
    fecha_creacion: estudioCasas.meta.fecha,
    proyecto: estudioCasas.meta.proyecto,
    inmobiliaria: estudioCasas.meta.cliente,
    direccion: estudioCasas.meta.direccion,
    tipo: 'casas',
    separado_de: 'EST-2026-VK-5R2N'
  },
  {
    codigo: estudioDeptos.meta.codigo,
    fecha_creacion: estudioDeptos.meta.fecha,
    proyecto: estudioDeptos.meta.proyecto,
    inmobiliaria: estudioDeptos.meta.cliente,
    direccion: estudioDeptos.meta.direccion,
    tipo: 'departamentos',
    separado_de: 'EST-2026-VK-5R2N'
  }
];

// Filtrar para no duplicar
estudiosNuevos.forEach(estudio => {
  if (!indexData.estudios.find(e => e.codigo === estudio.codigo)) {
    indexData.estudios.push(estudio);
  }
});

// Actualizar total
indexData.total = indexData.estudios.length;
indexData.generado = new Date().toISOString();

fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2), 'utf8');
console.log(`\n✅ index.json actualizado con los nuevos estudios`);