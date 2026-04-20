#!/usr/bin/env node
/**
 * Script para generar la lista de códigos válidos para el chat IA
 * Formato: ["EST-2026-KI-4V7P", "EST-2025-GC-8F3K", ...]
 */

const fs = require('fs');
const path = require('path');

const estudiosDir = path.join(__dirname, '..', 'data', 'estudios');

// Obtener todos los archivos JSON de estudios
const archivos = fs.readdirSync(estudiosDir)
  .filter(file => file.match(/^(EST|DEMO)-.*\.json$/))
  .sort();

// Extraer códigos (nombre del archivo sin .json)
const codigos = archivos.map(file => file.replace('.json', ''));

console.log('📊 Estudios encontrados:');
archivos.forEach((file, i) => {
  console.log(`   ${i + 1}. ${file.replace('.json', '')}`);
});

console.log(`\n✅ Total: ${codigos.length} estudios`);

// Generar JSON para wrangler secret
const jsonOutput = JSON.stringify(codigos, null, 2);
console.log(`\n📋 JSON para wrangler secret put VALID_CODES:`);
console.log(jsonOutput);

// Guardar en archivo para referencia
const outputFile = path.join(__dirname, '..', 'config', 'valid-codes.json');
fs.writeFileSync(outputFile, jsonOutput, 'utf8');
console.log(`\n💾 Guardado en: ${outputFile}`);

// Instrucciones para deploy
console.log('\n🚀 INSTRUCCIONES PARA DEPLOY:');
console.log('1. cd C:\\dev\\EstudiosOfertaInmobiliaria');
console.log('2. wrangler secret put VALID_CODES --name rw-consulting-chat');
console.log('3. wrangler deploy --name rw-consulting-chat');
console.log('\n📝 Copia y pega el JSON cuando wrangler lo solicite.');