# Script para deployar rw-intake Worker via Wrangler CLI
# Ejecutar en PowerShell como administrador

Write-Host "=== DEPLOY WORKER RW-INTAKE ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar que estamos en el directorio correcto
$currentDir = Get-Location
Write-Host "Directorio actual: $currentDir" -ForegroundColor Yellow

# 2. Verificar que wrangler.toml existe
$wranglerPath = "workers\wrangler.toml"
if (-not (Test-Path $wranglerPath)) {
    Write-Host "ERROR: No se encuentra $wranglerPath" -ForegroundColor Red
    Write-Host "Asegúrate de estar en C:\dev\EstudiosOfertaInmobiliaria\" -ForegroundColor Yellow
    exit 1
}

# 3. Verificar que intake-worker.js existe
$workerPath = "workers\intake-worker.js"
if (-not (Test-Path $workerPath)) {
    Write-Host "ERROR: No se encuentra $workerPath" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Archivos de configuración encontrados" -ForegroundColor Green

# 4. Verificar autenticación de Wrangler
Write-Host ""
Write-Host "Verificando autenticación de Wrangler..." -ForegroundColor Yellow
try {
    $authCheck = wrangler whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Wrangler no está autenticado" -ForegroundColor Red
        Write-Host ""
        Write-Host "Para autenticar, ejecuta:" -ForegroundColor Yellow
        Write-Host "  wrangler login" -ForegroundColor White
        Write-Host ""
        Write-Host "Esto abrirá tu navegador para autenticarte con Cloudflare"
        exit 1
    }
    Write-Host "✓ Wrangler autenticado: $authCheck" -ForegroundColor Green
} catch {
    Write-Host "ERROR: No se puede verificar autenticación" -ForegroundColor Red
    Write-Host "Asegúrate de que Wrangler CLI esté instalado: npm install -g wrangler" -ForegroundColor Yellow
    exit 1
}

# 5. Configurar secrets (preguntar al usuario)
Write-Host ""
Write-Host "=== CONFIGURAR SECRETOS ===" -ForegroundColor Cyan

# ANTHROPIC_API_KEY
$anthropicKey = Read-Host "Ingresa tu ANTHROPIC_API_KEY (de Anthropic Console)"
if (-not $anthropicKey) {
    Write-Host "ERROR: ANTHROPIC_API_KEY es requerida" -ForegroundColor Red
    exit 1
}

# ADMIN_SECRET
$adminSecret = Read-Host "Ingresa ADMIN_SECRET (clave para autenticación, ej: rw-consulting-2026-secret)"
if (-not $adminSecret) {
    Write-Host "ERROR: ADMIN_SECRET es requerida" -ForegroundColor Red
    exit 1
}

# 6. Configurar secrets en Cloudflare
Write-Host ""
Write-Host "Configurando secrets en Cloudflare..." -ForegroundColor Yellow

try {
    # ANTHROPIC_API_KEY
    Write-Host "Configurando ANTHROPIC_API_KEY..." -ForegroundColor Gray
    wrangler secret put ANTHROPIC_API_KEY --name rw-intake
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR al configurar ANTHROPIC_API_KEY" -ForegroundColor Red
        exit 1
    }
    
    # ADMIN_SECRET
    Write-Host "Configurando ADMIN_SECRET..." -ForegroundColor Gray
    wrangler secret put ADMIN_SECRET --name rw-intake
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR al configurar ADMIN_SECRET" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Secrets configurados correctamente" -ForegroundColor Green
} catch {
    Write-Host "ERROR al configurar secrets: $_" -ForegroundColor Red
    exit 1
}

# 7. Deployar el Worker
Write-Host ""
Write-Host "=== DEPLOY WORKER ===" -ForegroundColor Cyan
Write-Host "Deployando rw-intake..." -ForegroundColor Yellow

try {
    # Navegar al directorio workers
    Set-Location workers
    
    # Deploy con wrangler
    Write-Host "Ejecutando: wrangler deploy" -ForegroundColor Gray
    wrangler deploy
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR en deploy" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    
    Write-Host "✓ Worker deployado correctamente!" -ForegroundColor Green
    
    # Volver al directorio original
    Set-Location ..
    
} catch {
    Write-Host "ERROR en deploy: $_" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# 8. Verificar deploy
Write-Host ""
Write-Host "=== VERIFICAR DEPLOY ===" -ForegroundColor Cyan

Write-Host "URL del Worker: https://rw-intake.rw-consulting.workers.dev" -ForegroundColor Yellow
Write-Host ""

Write-Host "Para probar el endpoint /analyze:" -ForegroundColor White
Write-Host 'curl -X POST "https://rw-intake.rw-consulting.workers.dev/analyze" ^' -ForegroundColor Gray
Write-Host '  -H "Content-Type: application/json" ^' -ForegroundColor Gray
Write-Host '  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Hola\"}], \"currentData\": {\"tipo\": null}}"' -ForegroundColor Gray

Write-Host ""
Write-Host "=== COMPLETADO ===" -ForegroundColor Green
Write-Host "El Worker rw-intake está deployado y listo para usar." -ForegroundColor White