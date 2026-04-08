# Pruebas End-to-End
## RW Consulting — Flujo completo automatizado

Esta guía describe las pruebas para verificar el funcionamiento completo del sistema.

---

## 1. Flujo completo a probar

```
1. Cliente llena intake.html (formulario conversacional)
2. intake-worker.js genera JSON via Claude API
3. Mauricio revisa en admin.html
4. Mauricio aprueba estudio
5. publish-worker.js sube JSON a GitHub
6. publish-worker.js envía email al cliente
7. Cliente accede a viewer.html con código
```

---

## 2. Pruebas manuales

### 2.1 Prueba del formulario conversacional
**URL:** `https://rwconsulting.cl/intake.html`

**Pasos:**
1. Abrir `intake.html` en navegador
2. Seleccionar "Tengo un proyecto por construir"
3. Completar todos los campos:
   - Nombre del proyecto: `Proyecto Test E2E`
   - Dirección/Sector: `Calle Test 456, Santiago`
   - Inmobiliaria: `Test Inmobiliaria E2E`
   - Tipologías: `20 departamentos 2D+2B de 65m2`
   - Amenities: `Piscina, Gimnasio, Sala de eventos`
   - Competencia: `Proyecto Alpha, Proyecto Beta`
   - Nombre: `Cliente Test`
   - Email: `test@ejemplo.cl` (usar email real para prueba de email)
4. Revisar resumen
5. Click "Confirmar y enviar"

**Resultado esperado:**
- Mensaje "Tu solicitud fue recibida"
- Estudio generado en intake-worker
- Email de confirmación (si está configurado)

### 2.2 Prueba de consola de administración
**URL:** `https://rwconsulting.cl/admin.html?admin_secret=[SECRETO]`

**Pasos:**
1. Acceder con `admin_secret` correcto
2. Verificar que aparezcan estudios pendientes
3. Click en estudio "Proyecto Test E2E"
4. Revisar detalles y JSON generado
5. Click "Aprobar estudio"

**Resultado esperado:**
- Estudio cambia a estado "aprobado"
- JSON subido a GitHub en `estudios/EST-2026-TS-XXXX.json`
- Email enviado al cliente con código de acceso

### 2.3 Prueba de visualización
**URL:** `https://rwconsulting.cl/viewer.html?codigo=[CODIGO_GENERADO]`

**Pasos:**
1. Obtener código del email o de la consola admin
2. Acceder a `viewer.html?codigo=EST-2026-TS-XXXX`
3. Verificar que cargue el estudio correctamente
4. Probar preguntas al asistente IA

**Resultado esperado:**
- Carga completa del estudio con gráficos
- Asistente IA responde preguntas sobre el estudio
- Datos consistentes con lo ingresado en intake

---

## 3. Pruebas automatizadas (scripts)

### 3.1 Script de prueba intake-worker
```bash
# test-intake.sh
curl -X POST https://rw-intake.rw-consulting.workers.dev/generate \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "tipo1",
    "datos": {
      "nombre_proyecto": "Proyecto Test Automatizado",
      "direccion": "Av. Automatización 789",
      "inmobiliaria": "Test Automatizado SA",
      "tipologias": "15 departamentos 3D+2B de 85m2",
      "amenities": "Piscina temperada, Quincho, Lavandería",
      "competencia": "Proyecto Automatizado A, B, C",
      "contacto_nombre": "Test Automático",
      "contacto_email": "test-auto@ejemplo.cl"
    }
  }'
```

### 3.2 Script de prueba publish-worker
```bash
# test-publish.sh
curl -X POST https://rw-publish.rw-consulting.workers.dev/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -d '{
    "estudio_id": "test-e2e-"$(date +%s),
    "codigo": "EST-2026-TA-TEST",
    "json": {
      "meta": {
        "codigo": "EST-2026-TA-TEST",
        "version_esquema": "2.0",
        "proyecto": "Proyecto Test Automatizado",
        "direccion": "Av. Automatización 789",
        "cliente": "Test Automatizado SA",
        "autor": "RW Consulting",
        "fecha": "'$(date +%Y-%m-%d)'",
        "metodologia": {
          "fuente_precios": "Portales inmobiliarios",
          "criterio_precio": "Precio de lista sin estacionamiento",
          "descuento_estimado": "8%",
          "formula_ufm2": "Valor UF / (Superficie útil + Terraza / 2)",
          "tipo_proyectos": "Solo proyectos nuevos",
          "orientaciones": "Pendiente levantamiento"
        }
      },
      "proyecto_evaluado": {
        "nombre": "Proyecto Test Automatizado",
        "desarrollador": "Test Automatizado SA",
        "direccion": "Av. Automatización 789",
        "sector": "Automático",
        "distancia_centro_m": 5000,
        "pisos": 10,
        "total_unidades": 15,
        "superficie_vendible_m2": 1275,
        "superficie_promedio_m2": 85,
        "precio_promedio_uf": 2500,
        "uf_m2_neto_depto": 29.4,
        "venta_neta_total_uf": 37500,
        "amenities": ["Piscina temperada", "Quincho", "Lavandería"],
        "mix_unidades": [
          {"tipo": "3D+2B", "cantidad": 15}
        ]
      }
    },
    "email_cliente": "test-auto@ejemplo.cl",
    "cliente_nombre": "Test Automatizado SA",
    "proyecto_nombre": "Proyecto Test Automatizado"
  }'
```

### 3.3 Script de prueba chat-worker
```bash
# test-chat.sh
curl -X POST https://rw-consulting-chat.rw-consulting.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{
    "codigo": "EST-2026-TA-TEST",
    "pregunta": "¿Cuál es el precio promedio por m2 de este proyecto?"
  }'
```

---

## 4. Criterios de aceptación

### 4.1 Formulario conversacional (intake.html)
- [ ] Carga sin errores en navegador
- [ ] Flujo completo funciona sin interrupciones
- [ ] Validación de email funciona
- [ ] Resumen muestra datos correctos
- [ ] Envío muestra mensaje de confirmación

### 4.2 Generación de estudio (intake-worker)
- [ ] Recibe POST y devuelve 200 OK
- [ ] Genera JSON válido según esquema 2.0
- [ ] Código generado sigue formato EST-YYYY-XX-XXXX
- [ ] Almacena temporalmente en KV namespace
- [ ] Maneja errores de Claude API apropiadamente

### 4.3 Consola de administración (admin.html)
- [ ] Acceso solo con admin_secret válido
- [ ] Lista estudios pendientes correctamente
- [ ] Modal muestra detalles y JSON completo
- [ ] Botones de aprobar/rechazar funcionan
- [ ] Estadísticas se actualizan en tiempo real

### 4.4 Publicación (publish-worker)
- [ ] Autenticación Bearer token funciona
- [ ] Sube JSON a GitHub correctamente
- [ ] Envía email via Resend
- [ ] Devuelve URLs de commit y archivo
- [ ] Maneja errores de GitHub/Resend apropiadamente

### 4.5 Visualización (viewer.html)
- [ ] Carga estudio con código válido
- [ ] Muestra todos los datos del estudio
- [ ] Gráficos se renderizan correctamente
- [ ] Asistente IA responde preguntas
- [ ] Error amigable para código inválido

---

## 5. Datos de prueba

### 5.1 Proyecto Tipo 1 (nueva oferta)
```json
{
  "tipo": "tipo1",
  "datos": {
    "nombre_proyecto": "Edificio Aurora",
    "direccion": "Av. Las Condes 1234, Las Condes",
    "inmobiliaria": "Inmobiliaria Premium",
    "tipologias": "40 departamentos: 20 de 2D+2B (75m2), 20 de 3D+2B (95m2)",
    "amenities": "Piscina, Gimnasio, Sala de cine, Quincho, Lavandería",
    "competencia": "Edificio Altura, Torre Panorámica, Condominio Vista",
    "contacto_nombre": "Juan Pérez",
    "contacto_email": "juan@inmopremium.cl"
  }
}
```

### 5.2 Proyecto Tipo 2 (posicionamiento)
```json
{
  "tipo": "tipo2",
  "datos": {
    "nombre_proyecto": "Condominio Verde",
    "direccion": "Camino La Pirámide 567, Huechuraba",
    "inmobiliaria": "Desarrolladora Norte",
    "precios_propios": "2D+2B 75m2: 2.100 UF (N), 2.150 UF (E); 3D+2B 95m2: 2.800 UF (N), 2.850 UF (E)",
    "amenities": "Áreas verdes, Juegos infantiles, Estacionamiento visitas",
    "competencia": "Parque Residencial, Villa Los Álamos, Condominio Los Prados",
    "contacto_nombre": "María González",
    "contacto_email": "maria@desarrolladoranorte.cl"
  }
}
```

---

## 6. Monitoreo post-implementación

### 6.1 Métricas a monitorear
- Tiempo de generación de estudios (intake-worker)
- Tasa de éxito/failure de Claude API
- Tiempo de publicación en GitHub
- Tasa de entrega de emails
- Uso de la consola admin

### 6.2 Alertas recomendadas
- Error rate > 5% en cualquier Worker
- Latencia > 10s en generación de estudios
- Fallas consecutivas en Claude API
- Fallas en publicación a GitHub
- Fallas en envío de emails

### 6.3 Logs a revisar
- Cloudflare Worker logs (errors, console.log)
- GitHub commit history
- Resend email delivery reports
- Claude API usage metrics

---

## 7. Rollback plan

### 7.1 Issues críticos
1. **Claude API failure:** Estudios no se generan
   - Mitigación: Mensaje amigable en intake.html
   - Rollback: Revertir a proceso manual temporal

2. **GitHub API failure:** Estudios no se publican
   - Mitigación: Almacenar en KV y reintentar
   - Rollback: Publicación manual via git push

3. **Resend API failure:** Emails no se envían
   - Mitigación: Mostrar código en admin para envío manual
   - Rollback: Envío manual de emails

### 7.2 Procedimiento de rollback
```bash
# 1. Deshabilitar intake.html temporalmente
# 2. Revertir a proceso manual con playbook
# 3. Notificar a Mauricio para revisión manual
# 4. Diagnosticar y corregir issue
# 5. Re-habilitar sistema automatizado
```

---

*Documentación de pruebas actualizada: 2026-04-07 · RW Consulting*