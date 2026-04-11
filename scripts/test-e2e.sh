#!/bin/bash
# Script de prueba End-to-End para RW Consulting
# Ejecutar después de configurar Workers en Cloudflare

set -e  # Exit on error

echo "========================================="
echo "RW Consulting - Prueba End-to-End"
echo "========================================="
echo ""

# Configuración
ADMIN_SECRET=${ADMIN_SECRET:-"tu_clave_secreta_aqui"}
TEST_EMAIL="test-$(date +%s)@ejemplo.cl"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

echo "📅 Timestamp: $TIMESTAMP"
echo "📧 Email de prueba: $TEST_EMAIL"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funciones de ayuda
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_step() {
    echo ""
    echo "========================================="
    echo "$1"
    echo "========================================="
}

# Verificar dependencias
check_deps() {
    print_step "Verificando dependencias"
    
    if ! command -v curl &> /dev/null; then
        print_error "curl no encontrado. Instalar con: apt-get install curl"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_warning "jq no encontrado. Las respuestas JSON no se formatearán."
        JQ_AVAILABLE=false
    else
        JQ_AVAILABLE=true
    fi
    
    print_success "Dependencias verificadas"
}

# Test 1: intake-worker
test_intake_worker() {
    print_step "Prueba 1: intake-worker (generación de estudio)"
    
    local payload=$(cat <<EOF
{
    "tipo": "tipo1",
    "datos": {
        "nombre_proyecto": "Proyecto Test E2E $TIMESTAMP",
        "direccion": "Calle Test E2E 123, Santiago",
        "inmobiliaria": "Test E2E Inmobiliaria",
        "tipologias": "25 departamentos 2D+2B de 70m2",
        "amenities": "Piscina, Gimnasio, Sala de eventos, Quincho",
        "competencia": "Proyecto Alpha, Proyecto Beta, Proyecto Gamma",
        "contacto_nombre": "Cliente Test E2E",
        "contacto_email": "$TEST_EMAIL"
    }
}
EOF
)
    
    echo "Enviando solicitud a intake-worker..."
    local response=$(curl -s -w "\n%{http_code}" -X POST https://rw-intake.rw-consulting.workers.dev/generate \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        print_success "intake-worker respondió 200 OK"
        
        if [ "$JQ_AVAILABLE" = true ]; then
            echo "Respuesta:"
            echo "$body" | jq '.'
            
            # Extraer datos para siguientes tests
            ESTUDIO_ID=$(echo "$body" | jq -r '.estudio_id')
            CODIGO=$(echo "$body" | jq -r '.codigo')
            
            echo ""
            echo "📋 Datos extraídos:"
            echo "   Estudio ID: $ESTUDIO_ID"
            echo "   Código: $CODIGO"
        else
            echo "Respuesta: $body"
        fi
    else
        print_error "intake-worker falló con código: $http_code"
        echo "Respuesta: $body"
        return 1
    fi
}

# Test 2: publish-worker
test_publish_worker() {
    print_step "Prueba 2: publish-worker (publicación y email)"
    
    if [ -z "$CODIGO" ]; then
        print_warning "Saltando prueba publish-worker (no hay código de estudio)"
        return 0
    fi
    
    local payload=$(cat <<EOF
{
    "estudio_id": "$ESTUDIO_ID",
    "codigo": "$CODIGO",
    "json": {
        "meta": {
            "codigo": "$CODIGO",
            "version_esquema": "2.0",
            "proyecto": "Proyecto Test E2E $TIMESTAMP",
            "direccion": "Calle Test E2E 123, Santiago",
            "cliente": "Test E2E Inmobiliaria",
            "autor": "RW Consulting",
            "fecha": "$(date +%Y-%m-%d)",
            "metodologia": {
                "fuente_precios": "Portales inmobiliarios",
                "criterio_precio": "Precio de lista sin estacionamiento",
                "descuento_estimado": "8% sobre precio de lista",
                "formula_ufm2": "Valor UF / (Superficie útil + Terraza / 2)",
                "tipo_proyectos": "Solo proyectos nuevos",
                "orientaciones": "Pendiente levantamiento en terreno"
            }
        },
        "proyecto_evaluado": {
            "nombre": "Proyecto Test E2E $TIMESTAMP",
            "desarrollador": "Test E2E Inmobiliaria",
            "direccion": "Calle Test E2E 123, Santiago",
            "sector": "Test",
            "distancia_centro_m": 5000,
            "pisos": 8,
            "total_unidades": 25,
            "superficie_vendible_m2": 1750,
            "superficie_promedio_m2": 70,
            "precio_promedio_uf": 2100,
            "uf_m2_neto_depto": 30.0,
            "venta_neta_total_uf": 52500,
            "amenities": ["Piscina", "Gimnasio", "Sala de eventos", "Quincho"],
            "mix_unidades": [
                {"tipo": "2D+2B", "cantidad": 25}
            ]
        }
    },
    "email_cliente": "$TEST_EMAIL",
    "cliente_nombre": "Test E2E Inmobiliaria",
    "proyecto_nombre": "Proyecto Test E2E $TIMESTAMP"
}
EOF
)
    
    echo "Enviando solicitud a publish-worker..."
    local response=$(curl -s -w "\n%{http_code}" -X POST https://rw-publish.rw-consulting.workers.dev/publish \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_SECRET" \
        -d "$payload")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        print_success "publish-worker respondió 200 OK"
        
        if [ "$JQ_AVAILABLE" = true ]; then
            echo "Respuesta:"
            echo "$body" | jq '.'
        else
            echo "Respuesta: $body"
        fi
    else
        print_error "publish-worker falló con código: $http_code"
        echo "Respuesta: $body"
        return 1
    fi
}

# Test 3: chat-worker (existente)
test_chat_worker() {
    print_step "Prueba 3: chat-worker (asistente IA)"
    
    if [ -z "$CODIGO" ]; then
        print_warning "Saltando prueba chat-worker (no hay código de estudio)"
        return 0
    fi
    
    local payload=$(cat <<EOF
{
    "codigo": "$CODIGO",
    "pregunta": "¿Cuál es el precio promedio por m2 de este proyecto?"
}
EOF
)
    
    echo "Enviando pregunta a chat-worker..."
    local response=$(curl -s -w "\n%{http_code}" -X POST https://rw-consulting-chat.rw-consulting.workers.dev/chat \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        print_success "chat-worker respondió 200 OK"
        
        if [ "$JQ_AVAILABLE" = true ]; then
            echo "Respuesta:"
            echo "$body" | jq '.'
        else
            echo "Respuesta: $body"
        fi
    else
        print_warning "chat-worker respondió código: $http_code"
        echo "Esto puede ser normal si el código no está en VALID_CODES"
        echo "Respuesta: $body"
    fi
}

# Test 4: Verificar archivo en GitHub
test_github_file() {
    print_step "Prueba 4: Verificar archivo en GitHub"
    
    if [ -z "$CODIGO" ]; then
        print_warning "Saltando verificación GitHub (no hay código)"
        return 0
    fi
    
    echo "Verificando si el archivo existe en GitHub..."
    local url="https://raw.githubusercontent.com/mauriwestphal/EstudiosOfertaInmobiliaria/main/estudios/$CODIGO.json"
    
    local response=$(curl -s -w "\n%{http_code}" "$url")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        print_success "Archivo encontrado en GitHub: $url"
        
        if [ "$JQ_AVAILABLE" = true ]; then
            echo "Primeras líneas del JSON:"
            echo "$body" | jq '.' | head -20
        else
            echo "Primeros 500 caracteres:"
            echo "$body" | head -c 500
            echo "..."
        fi
    else
        print_warning "Archivo no encontrado en GitHub (código: $http_code)"
        echo "Esto puede ser normal si:"
        echo "1. El publish-worker no está configurado"
        echo "2. El archivo aún no se ha propagado"
        echo "3. El token de GitHub no tiene permisos"
    fi
}

# Test 5: URLs del sitio
test_site_urls() {
    print_step "Prueba 5: Verificar URLs del sitio"
    
    local urls=(
        "https://rwconsulting.cl/"
        "https://rwconsulting.cl/intake.html"
        "https://rwconsulting.cl/viewer.html"
        "https://rwconsulting.cl/admin.html"
    )
    
    for url in "${urls[@]}"; do
        echo -n "Probando $url ... "
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
        
        if [ "$http_code" -eq 200 ]; then
            print_success "✅"
        else
            print_error "❌ (código: $http_code)"
        fi
    done
}

# Main execution
main() {
    echo "🚀 Iniciando pruebas End-to-End"
    echo ""
    
    # Verificar que ADMIN_SECRET esté configurado
    if [ "$ADMIN_SECRET" = "tu_clave_secreta_aqui" ]; then
        print_warning "ADMIN_SECRET no configurado. Usar:"
        echo "  export ADMIN_SECRET=tu_clave_real"
        echo "  o"
        echo "  ./test-e2e.sh con ADMIN_SECRET como variable de entorno"
        echo ""
        read -p "¿Continuar con pruebas que no requieren ADMIN_SECRET? (s/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            echo "Pruebas canceladas."
            exit 0
        fi
    fi
    
    check_deps
    
    # Ejecutar pruebas
    local tests_passed=0
    local tests_failed=0
    
    if test_intake_worker; then ((tests_passed++)); else ((tests_failed++)); fi
    if test_publish_worker; then ((tests_passed++)); else ((tests_failed++)); fi
    if test_chat_worker; then ((tests_passed++)); else ((tests_failed++)); fi
    if test_github_file; then ((tests_passed++)); else ((tests_failed++)); fi
    if test_site_urls; then ((tests_passed++)); else ((tests_failed++)); fi
    
    # Resumen
    print_step "Resumen de pruebas"
    echo ""
    echo -e "${GREEN}Pruebas exitosas: $tests_passed${NC}"
    
    if [ $tests_failed -gt 0 ]; then
        echo -e "${RED}Pruebas fallidas: $tests_failed${NC}"
    else
        echo -e "${GREEN}Todas las pruebas completadas exitosamente! 🎉${NC}"
    fi
    
    echo ""
    echo "📋 Pasos siguientes:"
    echo "1. Revisar email en $TEST_EMAIL (si se configuró Resend)"
    echo "2. Verificar archivo en GitHub: estudios/$CODIGO.json"
    echo "3. Probar admin.html con: ?admin_secret=$ADMIN_SECRET"
    echo "4. Probar viewer.html con: ?codigo=$CODIGO"
    
    if [ $tests_failed -gt 0 ]; then
        exit 1
    fi
}

# Ejecutar main
main