#!/usr/bin/env node
/**
 * Script para verificar que todos los estudios funcionan con el chat IA
 */

const https = require('https');

const CHAT_URL = 'https://rw-consulting-chat.rw-consulting.workers.dev';
const HEADERS = {
    'Content-Type': 'application/json',
    'Origin': 'https://rwconsulting.cl'
};

// Lista de códigos a verificar (los 8 estudios)
const CODIGOS = [
    'EST-2025-GC-8F3K',
    'EST-2026-BC-7FQK',
    'EST-2026-EM-3K9R',
    'EST-2026-GV-9X2M',
    'EST-2026-KI-4V7P',
    'EST-2026-VK-5R2N',
    'EST-2026-VK-CASA',
    'EST-2026-VK-DEPT'
];

// Payload simple para prueba
const createPayload = (codigo) => JSON.stringify({
    codigo,
    messages: [
        {
            role: 'user',
            content: '¿Este estudio está activo?'
        }
    ],
    estudioJson: {
        meta: {
            proyecto: `Test ${codigo}`,
            codigo
        },
        competencia: []
    }
});

// Función para hacer petición
const testCodigo = (codigo) => {
    return new Promise((resolve) => {
        const payload = createPayload(codigo);
        
        const options = {
            hostname: 'rw-consulting-chat.rw-consulting.workers.dev',
            port: 443,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://rwconsulting.cl',
                'Content-Length': Buffer.byteLength(payload)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    codigo,
                    status: res.statusCode,
                    success: res.statusCode === 200,
                    data: data ? JSON.parse(data) : null
                });
            });
        });
        
        req.on('error', (error) => {
            resolve({
                codigo,
                status: 0,
                success: false,
                error: error.message
            });
        });
        
        req.write(payload);
        req.end();
    });
};

// Función principal
const main = async () => {
    console.log('🔍 Verificando chat IA para todos los estudios...\n');
    
    const resultados = [];
    
    for (const codigo of CODIGOS) {
        console.log(`  Probando ${codigo}...`);
        const resultado = await testCodigo(codigo);
        resultados.push(resultado);
        
        // Pequeña pausa entre requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Mostrar resultados
    console.log('\n📊 RESULTADOS:');
    console.log('=' .repeat(50));
    
    let exitosos = 0;
    let fallidos = 0;
    
    resultados.forEach((r, i) => {
        const icono = r.success ? '✅' : '❌';
        const estado = r.success ? 'ACTIVO' : `ERROR ${r.status}`;
        
        console.log(`${icono} ${r.codigo.padEnd(20)} ${estado}`);
        
        if (r.success) {
            exitosos++;
        } else {
            fallidos++;
            
            if (r.error) {
                console.log(`   Error: ${r.error}`);
            } else if (r.data && r.data.error) {
                console.log(`   Error: ${r.data.error}`);
            }
        }
    });
    
    console.log('=' .repeat(50));
    console.log(`\n📈 RESUMEN:`);
    console.log(`   ✅ Activos: ${exitosos}/${CODIGOS.length}`);
    console.log(`   ❌ Fallidos: ${fallidos}/${CODIGOS.length}`);
    
    if (fallidos > 0) {
        console.log('\n⚠️  Algunos códigos no funcionan. Posibles causas:');
        console.log('   1. El secreto VALID_CODES no se ha propagado completamente');
        console.log('   2. Error en el formato del JSON del secreto');
        console.log('   3. El worker tiene un problema interno');
        console.log('\n💡 Solución: Esperar 5-10 minutos y volver a probar.');
    } else {
        console.log('\n🎉 ¡TODOS los estudios están habilitados para chat IA!');
    }
    
    return { exitosos, fallidos, resultados };
};

// Ejecutar
main().catch(console.error);