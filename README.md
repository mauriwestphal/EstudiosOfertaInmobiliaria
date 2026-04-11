# RW Consulting — Estudios de Oferta Inmobiliaria

> Sistema automatizado para generación, revisión y publicación de estudios de mercado inmobiliario

**URL producción:** https://rwconsulting.cl

---

## 🏗️ ESTRUCTURA DEL REPOSITORIO

```
EstudiosOfertaInmobiliaria/
├── 📁 public/                      # GitHub Pages (raíz del repo)
│   ├── index.html                  # Landing page - acceso por código
│   ├── portal.html                 # Portal clientes - acceso por email
│   ├── viewer.html                 # Visualizador de estudios
│   ├── intake.html                 # Formulario conversacional IA
│   ├── admin.html                  # Consola de administración
│   └── 📁 js/                      # JavaScript frontend
│       ├── admin.js
│       ├── intake.js
│       └── viewer.js
│
├── 📁 data/                        # Datos del sistema
│   ├── 📁 estudios/                # Estudios JSON (v2.0)
│   │   ├── DEMO-2026-IG-5G2W.json
│   │   ├── EST-2025-GC-8F3K.json
│   │   └── index.json              # Índice generado automáticamente
│   ├── clientes.json               # Configuración de acceso por email
│   └── plantilla.json              # Plantilla vacía v2.0
│
├── 📁 src/                         # Código fuente y lógica
│   ├── 📁 backend/                 # Cloudflare Workers
│   │   ├── workers/
│   │   │   ├── intake-worker.js    # Generación de estudios via Claude
│   │   │   ├── publish-worker.js   # Publicación + email
│   │   │   └── chat-worker.js      # Chat conversacional
│   │   ├── config/                 # Configuración Workers
│   │   └── scripts/                # Scripts de backend
│   │
│   └── 📁 docs/                    # Documentación interna
│       ├── playbook-estudio-ia.md  # Reglas para generación de estudios
│       ├── SCHEMA.md               # Esquema JSON v2.0
│       └── CLOUDFLARE_SETUP.md     # Guía de configuración
│
├── 📁 scripts/                     # Scripts de utilidad
│   ├── generate-estudios-index.js  # Genera índice de estudios
│   ├── deploy-intake.ps1           # Deploy Workers
│   └── test-e2e.sh                 # Tests end-to-end
│
├── 📁 config/                      # Configuraciones
│   ├── .env.example                # Variables de entorno
│   └── CNAME                       # Dominio personalizado
│
├── .gitignore
├── .gitattributes
├── README.md                       # Este archivo
├── TESTING.md                      # Guía de testing
└── wrangler.toml                   # Configuración principal Workers
```

---

## 🚀 FLUJO DEL SISTEMA

### 1. **Solicitud de estudio** (Cliente)
- Accede a `intake.html` (formulario conversacional)
- Responde preguntas guiadas por IA
- Sistema genera JSON v2.0 via `intake-worker.js`
- Estudio guardado en KV con estado `pendiente_revision`

### 2. **Revisión** (Administrador)
- Accede a `admin.html?admin_secret=...`
- Ve estudios pendientes en dashboard
- Revisa contenido en modal detallado
- Aprueba o rechaza

### 3. **Publicación** (Automático)
- Al aprobar: `publish-worker.js` se ejecuta
- Push del JSON al repositorio GitHub
- Email automático al cliente via Resend
- Estudio disponible en `viewer.html`

### 4. **Acceso del cliente**
- **Por código**: `index.html` → `viewer.html?codigo=XXX`
- **Por email**: `portal.html` → lista de estudios asignados

---

## 🔧 CONFIGURACIÓN

### Secrets Cloudflare (requeridos):
```bash
# intake-worker
wrangler secret put ANTHROPIC_API_KEY --name rw-intake
wrangler secret put ADMIN_SECRET --name rw-intake

# publish-worker  
wrangler secret put GITHUB_TOKEN --name rw-publish
wrangler secret put ADMIN_SECRET --name rw-publish
wrangler secret put RESEND_API_KEY --name rw-publish
wrangler secret put EMAIL_FROM --name rw-publish
```

### Variables de entorno:
```bash
GITHUB_OWNER=mauriwestphal
GITHUB_REPO=EstudiosOfertaInmobiliaria
```

### URLs Workers deployados:
- **Intake**: `https://rw-intake.rw-consulting.workers.dev`
- **Publish**: `https://rw-publish.rw-consulting.workers.dev`
- **Chat**: `https://rw-consulting-chat.rw-consulting.workers.dev`

---

## 📁 GESTIÓN DE DATOS

### Estudios JSON (v2.0)
- Ubicación: `data/estudios/`
- Esquema: ver `src/docs/SCHEMA.md`
- Índice: `data/estudios/index.json` (generado automáticamente)

### Generar índice:
```bash
node scripts/generate-estudios-index.js
```

### Clientes por email
- Configuración: `data/clientes.json`
- Permisos: `puede_ver_todos` + `excluir`
- Ejemplo cliente: `jrotter@dosa.cl` (ve todos excepto demo)

---

## 🛠️ DESARROLLO

### Servidor local:
```bash
python -m http.server 8000
# Abrir http://localhost:8000/
```

### Deploy Workers:
```bash
# Desde src/backend/workers/
wrangler deploy intake-worker.js --name rw-intake
wrangler deploy publish-worker.js --name rw-publish
```

### Testing:
- Ver `TESTING.md` para guía completa
- End-to-end: `./scripts/test-e2e.sh`

---

## 🔐 SEGURIDAD

### Autenticación:
- **Admin**: Query param `?admin_secret=...`
- **Clientes**: Email en `data/clientes.json`
- **Workers**: Secrets Cloudflare + CORS restringido

### CORS configurado:
- Producción: `https://rwconsulting.cl`
- Desarrollo: `localhost:8000`, `127.0.0.1:8000`

---

## 📈 ESTADO ACTUAL

### ✅ COMPLETADO
- [x] Sprint 1: Workers + Frontend básico
- [x] Sistema conversacional IA
- [x] Portal de acceso por email
- [x] Reestructuración del repositorio
- [x] Deploy a producción (GitHub Pages)

### 🚧 PENDIENTE
- [ ] Configurar Resend para emails
- [ ] Agregar más clientes a `clientes.json`
- [ ] Monitoreo y logs
- [ ] Backup automático de estudios

---

## 📞 CONTACTO

**Mauricio Westphal**  
RW Consulting — Estudios de Mercado Inmobiliario  
GitHub: [@mauriwestphal](https://github.com/mauriwestphal)  
Producción: https://rwconsulting.cl

---

*Última actualización: 2026-04-11*  
*Estructura v2.0 — Reorganización completa*
