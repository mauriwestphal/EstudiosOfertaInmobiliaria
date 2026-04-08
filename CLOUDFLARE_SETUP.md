# Configuración de Workers en Cloudflare
## RW Consulting — Estudios de Oferta Inmobiliaria

Esta guía describe los pasos para configurar los Workers en Cloudflare para el sistema automatizado de estudios.

---

## 1. Workers requeridos

| Worker | Función | Endpoint |
|---|---|---|
| `rw-intake` | Genera estudios via Claude API | `POST /generate` |
| `rw-publish` | Publica estudios en GitHub + envía emails | `POST /publish` |
| `rw-consulting-chat` | Asistente IA para viewer (existente) | - |

---

## 2. Secretos requeridos por Worker

### 2.1 rw-intake
```
ANTHROPIC_API_KEY=sk-ant-...           # API key de Anthropic
ESTUDIOS_KV=                           # KV namespace ID para almacenamiento temporal
ADMIN_SECRET=                          # Clave para autenticación (usar misma que admin.html)
```

### 2.2 rw-publish
```
GITHUB_TOKEN=ghp_...                   # Personal Access Token con permisos repo:write
GITHUB_OWNER=mauriwestphal             # Dueño del repo
GITHUB_REPO=EstudiosOfertaInmobiliaria # Nombre del repo
RESEND_API_KEY=re_...                  # API key de Resend
EMAIL_FROM=estudios@rwconsulting.cl    # Email remitente (verificar en Resend)
ADMIN_SECRET=                          # Misma clave que rw-intake y admin.html
```

### 2.3 rw-consulting-chat (existente)
```
ANTHROPIC_API_KEY=sk-ant-...           # Misma que rw-intake
VALID_CODES=EST-2026-KI-4V7P,EST-2026-GV-9X2M,... # Códigos válidos separados por coma
```

---

## 3. Pasos de configuración

### 3.1 Crear KV namespace
1. Ir a **Workers & Pages** → **KV**
2. Click **Create namespace**
3. Nombre: `ESTUDIOS_KV`
4. Copiar el **ID** generado

### 3.2 Configurar rw-intake
1. Ir a **Workers & Pages** → **Overview**
2. Click **Create application** → **Create Worker**
3. Nombre: `rw-intake`
4. **Quick edit** → Pegar contenido de `workers/intake-worker.js`
5. **Settings** → **Variables** → **Environment Variables**:
   - Agregar los secretos de la sección 2.1
6. **Settings** → **KV** → **Add binding**:
   - Variable name: `ESTUDIOS_KV`
   - KV namespace: `ESTUDIOS_KV` (creado en 3.1)
7. **Save and deploy**

### 3.3 Configurar rw-publish
1. Ir a **Workers & Pages** → **Overview**
2. Click **Create application** → **Create Worker**
3. Nombre: `rw-publish`
4. **Quick edit** → Pegar contenido de `workers/publish-worker.js`
5. **Settings** → **Variables** → **Environment Variables**:
   - Agregar los secretos de la sección 2.2
6. **Save and deploy**

### 3.4 Verificar rw-consulting-chat (existente)
1. Ir a **Workers & Pages** → **Overview**
2. Seleccionar `rw-consulting-chat`
3. **Settings** → **Variables** → **Environment Variables**:
   - Verificar que `ANTHROPIC_API_KEY` esté configurada
   - Actualizar `VALID_CODES` con los códigos de estudios existentes

---

## 4. URLs de producción

Una vez configurados, los Workers estarán disponibles en:

- **Intake (formulario):** `https://rw-intake.rw-consulting.workers.dev`
- **Publish (admin):** `https://rw-publish.rw-consulting.workers.dev`
- **Chat (viewer):** `https://rw-consulting-chat.rw-consulting.workers.dev`

---

## 5. Pruebas de funcionamiento

### 5.1 Probar intake-worker
```bash
curl -X POST https://rw-intake.rw-consulting.workers.dev/generate \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "tipo1",
    "datos": {
      "nombre_proyecto": "Proyecto Test",
      "direccion": "Calle Test 123",
      "inmobiliaria": "Test Inmobiliaria",
      "tipologias": "10 departamentos 2D+2B",
      "amenities": "Piscina, Gimnasio",
      "competencia": "Proyecto A, Proyecto B",
      "contacto_nombre": "Nombre Test",
      "contacto_email": "test@ejemplo.cl"
    }
  }'
```

### 5.2 Probar publish-worker
```bash
curl -X POST https://rw-publish.rw-consulting.workers.dev/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [ADMIN_SECRET]" \
  -d '{
    "estudio_id": "test-id",
    "codigo": "EST-2026-TS-TEST",
    "json": {
      "meta": {
        "codigo": "EST-2026-TS-TEST",
        "version_esquema": "2.0",
        "proyecto": "Proyecto Test",
        "direccion": "Calle Test 123",
        "cliente": "Test Inmobiliaria",
        "autor": "RW Consulting",
        "fecha": "2026-04-07"
      }
    },
    "email_cliente": "test@ejemplo.cl",
    "cliente_nombre": "Test Inmobiliaria",
    "proyecto_nombre": "Proyecto Test"
  }'
```

---

## 6. Configuración de admin.html

El archivo `admin.html` requiere el parámetro `admin_secret` en la URL:

```
https://rwconsulting.cl/admin.html?admin_secret=[ADMIN_SECRET]
```

**Nota:** Usar el mismo `ADMIN_SECRET` en:
- Variables de entorno de `rw-intake`
- Variables de entorno de `rw-publish`
- Query param de `admin.html`

---

## 7. Monitoreo y logs

### 7.1 Logs de Workers
- **Workers & Pages** → Seleccionar Worker → **Logs**
- Ver requests, errores, y tiempos de ejecución

### 7.2 Analytics
- **Workers & Pages** → Seleccionar Worker → **Analytics**
- Métricas de uso, errores, y latencia

### 7.3 Alertas (opcional)
- **Notifications** → **Create**
- Configurar alertas por errores o alto volumen

---

## 8. Troubleshooting

### 8.1 Error 401/403
- Verificar `ADMIN_SECRET` en headers/query params
- Confirmar que el token en `Authorization: Bearer [token]` sea correcto

### 8.2 Error 500 en Claude API
- Verificar `ANTHROPIC_API_KEY` en variables de entorno
- Confirmar que la key tenga créditos disponibles
- Revisar logs del Worker para mensaje de error específico

### 8.3 Error en GitHub API
- Verificar `GITHUB_TOKEN` tiene permisos `repo:write`
- Confirmar que el repo `mauriwestphal/EstudiosOfertaInmobiliaria` existe
- Revisar que el branch `main` sea el correcto

### 8.4 Error en Resend API
- Verificar `RESEND_API_KEY` en variables de entorno
- Confirmar que `EMAIL_FROM` esté verificado en Resend
- Revisar límite de emails gratuitos (3.000/mes)

---

## 9. Mantenimiento

### 9.1 Actualizar Workers
1. Modificar código local en `workers/`
2. Subir cambios a GitHub (`git push origin main`)
3. En Cloudflare: **Quick edit** → Pegar nuevo código → **Save and deploy**

### 9.2 Rotar secretos
1. Generar nuevas keys en cada servicio
2. Actualizar en Cloudflare: **Settings** → **Variables**
3. Actualizar `admin_secret` en bookmarks/links

### 9.3 Backup KV
- Los datos en KV son temporales (hasta aprobación)
- Una vez aprobados, los estudios se guardan en GitHub
- No se requiere backup específico de KV

---

*Documentación actualizada: 2026-04-07 · RW Consulting*