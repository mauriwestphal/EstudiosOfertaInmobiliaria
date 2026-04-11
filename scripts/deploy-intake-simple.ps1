# Script simple para deployar rw-intake Worker
# Ejecutar en PowerShell

Write-Host "=== DEPLOY WORKER RW-INTAKE ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar directorio
$currentDir = Get-Location
Write-Host "Directorio: $currentDir" -ForegroundColor Yellow

# 2. Verificar archivos
if (-not (Test-Path "workers\wrangler.toml")) {
    Write-Host "ERROR: No se encuentra workers\wrangler.toml" -ForegroundColor Red
    Write-Host "Ejecuta desde: C:\dev\EstudiosOfertaInmobiliaria\" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "workers\intake-worker.js")) {
    Write-Host "ERROR: No se encuentra workers\intake-worker.js" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Archivos encontrados" -ForegroundColor Green

# 3. Verificar autenticación
Write-Host ""
Write-Host "Verificando autenticación de Wrangler..." -ForegroundColor Yellow
try {
    $whoami = wrangler whoami 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Autenticado: $whoami" -ForegroundColor Green
    } else {
        Write-Host "Wrangler no autenticado" -ForegroundColor Red
        Write-Host ""
        Write-Host "Para autenticar ejecuta:" -ForegroundColor Yellow
        Write-Host "  wrangler login" -ForegroundColor White
        Write-Host ""
        Write-Host "Esto abrirá tu navegador para login con Cloudflare"
        exit 1
    }
} catch {
    Write-Host "ERROR: Wrangler no está instalado o hay un problema" -ForegroundColor Red
    Write-Host "Instala con: npm install -g wrangler" -ForegroundColor Yellow
    exit 1
}

# 4. Deployar Worker
Write-Host ""
Write-Host "Deployando Worker rw-intake..." -ForegroundColor Yellow

try {
    # Ir al directorio workers
    Set-Location workers
    
    # Ejecutar deploy
    Write-Host "Ejecutando: wrangler deploy" -ForegroundColor Gray
    wrangler deploy
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Worker deployado exitosamente!" -ForegroundColor Green
    } else {
        Write-Host "✗ Error en deploy" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    
    # Volver al directorio original
    Set-Location ..
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# 5. Instrucciones para configurar secrets
Write-Host ""
Write-Host "=== CONFIGURAR SECRETOS ===" -ForegroundColor Cyan
Write-Host "El Worker está deployado pero necesita secrets:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. ANTHROPIC_API_KEY (de Anthropic Console):" -ForegroundColor White
Write-Host "   wrangler secret put ANTHROPIC_API_KEY --name rw-intake" -ForegroundColor Gray
Write-Host ""
Write-Host "2. ADMIN_SECRET (clave para autenticación):" -ForegroundColor White
Write-Host "   wrangler secret put ADMIN_SECRET --name rw-intake" -ForegroundColor Gray
Write-Host ""
Write-Host "Ejemplo de ADMIN_SECRET: rw-consulting-2026-secret" -ForegroundColor Gray
Write-Host ""

# 6. Información del deploy
Write-Host "=== INFORMACIÓN ===" -ForegroundColor Cyan
Write-Host "URL del Worker: https://rw-intake.rw-consulting.workers.dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Endpoints disponibles:" -ForegroundColor White
Write-Host "  • POST /analyze    - Análisis conversacional" -ForegroundColor Gray
Write-Host "  • POST /generate   - Generar estudio completo" -ForegroundColor Gray
Write-Host ""
Write-Host "Para probar:" -ForegroundColor White
Write-Host 'curl -X POST "https://rw-intake.rw-consulting.workers.dev/analyze" ^' -ForegroundColor Gray
Write-Host '  -H "Content-Type: application/json" ^' -ForegroundColor Gray
Write-Host '  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Hola\"}], \"currentData\": {\"tipo\": null}}"' -ForegroundColor Gray