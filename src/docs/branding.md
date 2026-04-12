# MW Consulting — Brand Style Guide
**Versión 1.0 · Abril 2026**

> Guía de identidad visual completa para aplicar la marca MW Consulting a sitios web estáticos, dashboards embebidos, documentos, presentaciones y cualquier solución digital. Copiar en el contexto de Claude para mantener consistencia automática entre sesiones y proyectos.

---

## 1. Identidad de marca

### Quién es MW Consulting

**Mauricio Westphal** es analista y líder BI con 6+ años diseñando productos de datos. Opera bajo la marca personal **MWConsulting** (www.mwconsulting.cl), con especialización en Power BI, Power BI Embedded API, UX/UI aplicada a datos, y arquitectura de soluciones BI end-to-end.

### Posicionamiento

- **Diferenciador clave:** Intersección de desarrollo Power BI, UX/UI design thinking e integración técnica vía Power BI Embedded API
- **Tono de comunicación:** Preciso, confiado, sin exageración. Los datos hablan; el diseño los hace legibles.
- **Audiencia:** Empresas medianas en Chile y LATAM que necesitan pasar de Excel/tablas a decisiones basadas en datos reales.

### Firma visual

El punto teal al final del nombre es la firma de marca:

```html
<span class="brand-name">Mauricio Westphal<span class="brand-dot">.</span></span>
```

```css
.brand-dot {
  color: var(--teal);
  font-weight: 700;
}
```

Usar siempre en headers, footers, documentos y cualquier pieza donde aparezca el nombre completo.

---

## 2. Paleta de colores

### Variables CSS (copiar completo en `:root`)

```css
:root {
  /* Acentos principales */
  --teal:       #1D6A6A;
  --teal-mid:   #177A6C;
  --teal-light: #E0F0EF;
  --teal-dark:  #155A5A;

  /* Acentos cálidos */
  --warm:       #C49A3C;
  --warm-light: #FBF4E3;
  --warm-dark:  #96741E;

  /* Estructura */
  --deep-ink:   #2E2E38;
  --ink-mid:    #3A3A48;
  --mist:       #F7F9F9;
  --white:      #FFFFFF;

  /* Texto */
  --text-primary:   #2E2E38;
  --text-secondary: #5A6B6B;
  --text-muted:     #6A7B7B;
  --text-on-dark:   #F7F9F9;
  --text-on-teal:   #FFFFFF;

  /* Bordes */
  --border:        rgba(29, 106, 106, 0.15);
  --border-solid:  #D8E8E7;
  --border-hover:  rgba(29, 106, 106, 0.30);

  /* Sombras */
  --shadow-sm: 0 1px 3px rgba(46, 46, 56, 0.08);
  --shadow-md: 0 4px 12px rgba(46, 46, 56, 0.10);
  --shadow-lg: 0 8px 24px rgba(46, 46, 56, 0.12);
}
```

### Tabla de uso

| Token | Hex | Uso correcto |
|---|---|---|
| `--teal` | `#1D6A6A` | Botones primarios, links, íconos activos, tags, métricas destacadas, bordes de foco, líneas decorativas |
| `--teal-mid` | `#177A6C` | Hover de botones y links, transición activa |
| `--teal-light` | `#E0F0EF` | Fondo de tags/pills, cards destacadas, badges de skills, backgrounds de secciones suaves |
| `--teal-dark` | `#155A5A` | Active state de botones, bordes de énfasis fuertes |
| `--warm` | `#C49A3C` | Badges de nivel (Experto, Avanzado), highlights secundarios, acentos dorados |
| `--warm-light` | `#FBF4E3` | Fondo de badges dorados, alertas informativas suaves |
| `--warm-dark` | `#96741E` | Texto sobre fondo `--warm-light`, énfasis en badges |
| `--deep-ink` | `#2E2E38` | Headers, footers, fondos oscuros, texto principal en cuerpo |
| `--ink-mid` | `#3A3A48` | Fondos de secciones oscuras alternativas, subheaders sobre dark |
| `--mist` | `#F7F9F9` | Fondos de secciones alternas claras, stat cards, backgrounds neutros |
| `--white` | `#FFFFFF` | Fondo base del body, cards principales, modales |
| `--text-secondary` | `#5A6B6B` | Subtítulos, meta información, descripciones secundarias |
| `--text-muted` | `#6A7B7B` | Labels, placeholders, fechas, notas al pie |

### Reglas de paleta

1. **No inventar colores fuera de estas variables.** Si hace falta un nuevo tono, consultar antes de añadirlo.
2. **El teal es el único color primario.** El ocre es siempre secundario/accento.
3. **Fondos oscuros (#deep-ink):** Todo el texto cambia a `--text-on-dark`; los links pasan a `--teal-light`.
4. **Nunca usar teal sobre fondo teal.** Siempre garantizar contraste suficiente (WCAG AA mínimo).
5. **El ocre/warm solo aparece en badges y acentos puntuales.** No usar como color de fondo general.

---

## 3. Tipografía

### Importar fuentes

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&family=DM+Serif+Display&display=swap" rel="stylesheet">
```

### Reglas de aplicación

```css
/* Base */
body {
  font-family: 'DM Sans', sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--white);
}

/* H1 y H2 — serif para personalidad y autoridad */
h1, h2 {
  font-family: 'DM Serif Display', serif;
  color: var(--deep-ink);
  line-height: 1.2;
}

/* H3 en adelante — sans para claridad operativa */
h3, h4, h5, h6 {
  font-family: 'DM Sans', sans-serif;
  font-weight: 700;
  color: var(--deep-ink);
  line-height: 1.3;
}

/* Escalado responsive con clamp */
h1   { font-size: clamp(1.75rem, 4vw, 3rem); }
h2   { font-size: clamp(1.25rem, 3vw, 2rem); }
h3   { font-size: clamp(1.1rem, 2.5vw, 1.5rem); }
body { font-size: clamp(0.875rem, 1.5vw, 1rem); }
```

### Jerarquía completa

| Elemento | Fuente | Peso | Tamaño | Color | Uso |
|---|---|---|---|---|---|
| H1 · Hero / título página | DM Serif Display | 400 | clamp(1.75rem, 4vw, 3rem) | `--deep-ink` | Una vez por página |
| H2 · Títulos de sección | DM Serif Display | 400 | clamp(1.25rem, 3vw, 2rem) | `--deep-ink` | Encabezados de sección |
| H3 · Subsecciones | DM Sans | 700 | clamp(1.1rem, 2.5vw, 1.5rem) | `--deep-ink` | Títulos de cards, subgrupos |
| H4 · Labels de bloque | DM Sans | 700 | 1rem | `--deep-ink` | Etiquetas de formulario, categorías |
| Body | DM Sans | 400 | 16px | `--text-primary` | Texto corrido |
| Secundario | DM Sans | 400 | 14px | `--text-secondary` | Descripciones, metadata |
| Muted / labels | DM Sans | 400 | 13px | `--text-muted` | Fechas, notas, placeholders |
| Botones | DM Sans | 500 | 14–16px | según contexto | CTAs, acciones |
| **Valores numéricos / KPIs** | **Roboto Mono** | **400/700** | variable | `--teal` o `--deep-ink` | **Métricas, porcentajes, estadísticas** |

### Valores numéricos con Roboto Mono

Los números en métricas, KPIs y datos destacados usan **Roboto Mono** — es la firma técnica de la marca:

```html
<!-- En Google Fonts, añadir Roboto Mono -->
<link href="https://fonts.googleapis.com/css2?family=...&family=Roboto+Mono:wght@400;700&display=swap" rel="stylesheet">
```

```css
.metric-value,
.kpi-number,
.stat-card__value {
  font-family: 'Roboto Mono', monospace;
}
```

---

## 4. Componentes base

### Botón primario

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--teal);
  color: var(--text-on-teal);
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s ease, transform 0.1s ease;
}
.btn-primary:hover  { background: var(--teal-mid); }
.btn-primary:active { background: var(--teal-dark); transform: scale(0.98); }
```

### Botón secundario (outline)

```css
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: transparent;
  color: var(--teal);
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  border: 1.5px solid var(--teal);
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
}
.btn-secondary:hover { background: var(--teal-light); }
```

### Tags / Pills de tecnología

```css
.tag {
  display: inline-block;
  padding: 4px 12px;
  background: var(--teal-light);
  color: var(--teal);
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 500;
  border-radius: 20px;
}
.tag--warm {
  background: var(--warm-light);
  color: var(--warm-dark);
}
```

Uso: stack tecnológico de proyectos (Power BI, SQL, AWS, etc.), skills, filtros.

### Cards de proyecto / portfolio

```css
.card {
  background: var(--white);
  border: 1px solid var(--border-solid);
  border-radius: 12px;
  padding: 24px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.card--mist {
  background: var(--mist);
  border: none;
}
```

### Stat cards (métricas / KPIs)

```css
.stat-card {
  background: var(--mist);
  border-radius: 12px;
  padding: 20px 24px;
  text-align: center;
}
.stat-card__value {
  font-family: 'Roboto Mono', monospace;
  font-size: 2rem;
  color: var(--teal);
  line-height: 1;
}
.stat-card__label {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
}
```

### Badges de nivel

```css
.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 500;
}
.badge--expert   { background: var(--teal-light);  color: var(--teal); }
.badge--advanced { background: var(--warm-light);  color: var(--warm-dark); }
```

### Inputs y formularios

```css
input, textarea, select {
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  padding: 10px 14px;
  border: 1px solid var(--border-solid);
  border-radius: 8px;
  background: var(--white);
  color: var(--text-primary);
  width: 100%;
  transition: border-color 0.2s, box-shadow 0.2s;
}
input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--teal);
  box-shadow: 0 0 0 3px rgba(29, 106, 106, 0.15);
}
input::placeholder, textarea::placeholder {
  color: var(--text-muted);
}
```

---

## 5. Layout y secciones

### Patrón de alternancia de secciones

Alternar obligatoriamente entre estos tres fondos para crear ritmo visual sin necesidad de elementos decorativos:

```
Sección 1: --white    (base, sin clase extra)
Sección 2: --mist     (.section--mist)
Sección 3: --deep-ink (.section--dark)  ← usar con moderación
```

```css
.section--white { background: var(--white); }
.section--mist  { background: var(--mist); }
.section--dark  {
  background: var(--deep-ink);
  color: var(--text-on-dark);
}
.section--dark h1,
.section--dark h2,
.section--dark h3 {
  color: var(--text-on-dark);
}
.section--dark p,
.section--dark span {
  color: rgba(247, 249, 249, 0.80);
}
```

### Header oscuro

```css
.header-dark {
  background: var(--deep-ink);
  color: var(--text-on-dark);
  padding: 16px 0;
}
.header-dark a {
  color: var(--text-on-dark);
  text-decoration: none;
  transition: color 0.2s;
}
.header-dark a:hover { color: var(--teal-light); }

/* Nav link activo */
.header-dark a.active {
  color: var(--teal-light);
  border-bottom: 2px solid var(--teal);
}
```

### Footer

```css
.footer {
  background: var(--deep-ink);
  color: var(--text-on-dark);
  padding: 48px 0 24px;
}
.footer a {
  color: var(--teal-light);
  text-decoration: none;
  transition: color 0.2s;
}
.footer a:hover { color: var(--white); }
.footer__divider {
  border: none;
  border-top: 1px solid rgba(247, 249, 249, 0.10);
  margin: 24px 0;
}
```

### Contenedor base

```css
.container {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}
.section {
  padding: 80px 0;
}
@media (max-width: 768px) {
  .section { padding: 48px 0; }
  .container { padding: 0 16px; }
}
```

---

## 6. Links y transiciones globales

```css
a {
  color: var(--teal);
  text-decoration: none;
  transition: color 0.2s ease;
}
a:hover { color: var(--teal-mid); }

/* Links sobre fondo oscuro */
.on-dark a       { color: var(--teal-light); }
.on-dark a:hover { color: var(--white); }

/* Transiciones globales para elementos interactivos */
a, button, .btn-primary, .btn-secondary, .card, input, textarea {
  transition-duration: 0.2s;
  transition-timing-function: ease;
}
```

---

## 7. Línea decorativa de acento

Elemento de firma visual para títulos de sección y separadores:

```css
/* Línea teal bajo títulos de sección */
.section-title {
  position: relative;
  display: inline-block;
}
.section-title::after {
  content: '';
  display: block;
  width: 40px;
  height: 3px;
  background: var(--teal);
  margin-top: 8px;
  border-radius: 2px;
}

/* Borde izquierdo teal para citas o highlights */
.highlight-block {
  border-left: 3px solid var(--teal);
  padding-left: 16px;
  color: var(--text-secondary);
  font-style: italic;
}
```

---

## 8. Aplicación en contextos específicos

### 8.1 Dashboards Power BI

Al definir temas en Power BI (JSON de tema):

```json
{
  "name": "MWConsulting",
  "dataColors": [
    "#1D6A6A",
    "#C49A3C",
    "#177A6C",
    "#96741E",
    "#155A5A",
    "#E0F0EF",
    "#FBF4E3",
    "#2E2E38"
  ],
  "background": "#FFFFFF",
  "foreground": "#2E2E38",
  "tableAccent": "#1D6A6A",
  "visualStyles": {
    "*": {
      "*": {
        "fontFamily": [{ "value": "DM Sans" }]
      }
    }
  }
}
```

**Convenciones en dashboards:**
- KPIs principales: teal `#1D6A6A`, Roboto Mono
- KPIs secundarios / comparativos: ocre `#C49A3C`
- Valores positivos: teal; Valores negativos: `#B94A48` (rojo neutro, no parte de paleta principal)
- Fondos de cards: `#F7F9F9` (mist)
- Bordes de visualizaciones: `#D8E8E7` (border-solid)
- Tooltips: fondo `#2E2E38`, texto `#F7F9F9`

### 8.2 Presentaciones PowerPoint / Google Slides

| Elemento | Color | Fuente |
|---|---|---|
| Fondo portada | `#2E2E38` deep-ink | — |
| Título portada | `#F7F9F9` | DM Serif Display |
| Punto firma | `#1D6A6A` | — |
| Fondo slides internas | `#FFFFFF` | — |
| Fondo slides alternadas | `#F7F9F9` | — |
| Títulos de slide | `#2E2E38` | DM Serif Display / Georgia como fallback |
| Cuerpo | `#2E2E38` | DM Sans / Helvetica Neue como fallback |
| Acentos / líneas | `#1D6A6A` | — |
| KPIs / números | `#1D6A6A` | Roboto Mono / Courier New como fallback |
| Badges / highlights | `#C49A3C` sobre `#FBF4E3` | — |

### 8.3 Documentos Word / PDF

- **Colores de título:** `#2E2E38` para H1 y H2; `#1D6A6A` para H3 (opcional)
- **Línea de acento:** regla horizontal teal de 2px después del título principal
- **Tablas:** header con fondo `#2E2E38` y texto `#F7F9F9`; filas alternas `#F7F9F9`
- **Notas al pie / muted:** `#6A7B7B`
- **Hyperlinks:** `#1D6A6A` sin subrayado (cuando el formato lo permita)

### 8.4 Emails (HTML email)

```html
<!-- Paleta inline para clientes de email -->
<style>
  body        { font-family: 'DM Sans', Arial, sans-serif; color: #2E2E38; background: #F7F9F9; }
  h1, h2      { font-family: Georgia, serif; color: #2E2E38; }
  a           { color: #1D6A6A; }
  .btn        { background: #1D6A6A; color: #FFFFFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; }
  .metric     { font-family: 'Roboto Mono', 'Courier New', monospace; color: #1D6A6A; }
  .footer-bg  { background: #2E2E38; color: #F7F9F9; }
</style>
```

---

## 9. Responsive y breakpoints

```css
/* Mobile-first */
:root { --gap: 16px; }

@media (min-width: 480px)  { :root { --gap: 20px; } }
@media (min-width: 768px)  { :root { --gap: 24px; } }
@media (min-width: 1024px) { :root { --gap: 32px; } }

/* Grids responsivos */
.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--gap);
}
.grid-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--gap);
}

/* Touch targets mínimos en mobile */
@media (max-width: 768px) {
  .btn-primary, .btn-secondary { min-height: 44px; }
  .tag { padding: 6px 14px; font-size: 13px; }
}
```

---

## 10. Confidencialidad en proyectos de portfolio

Cuando se muestren proyectos reales de clientes, incluir siempre este disclaimer:

> *"Los proyectos presentados corresponden a desarrollos reales. Tanto los datos como el diseño visual han sido adaptados para fines demostrativos, resguardando la confidencialidad de cada cliente."*

```html
<p class="portfolio-disclaimer">
  Los proyectos presentados corresponden a desarrollos reales. 
  Tanto los datos como el diseño visual han sido adaptados para fines demostrativos, 
  resguardando la confidencialidad de cada cliente.
</p>
```

```css
.portfolio-disclaimer {
  font-size: 13px;
  color: var(--text-muted);
  font-style: italic;
  border-left: 2px solid var(--border-solid);
  padding-left: 12px;
  margin-top: 16px;
}
```

---

## 11. Instrucciones para Claude

Al recibir este archivo como contexto, aplicar la identidad MW Consulting de la siguiente manera:

1. **Copiar variables CSS** de la sección 2 dentro de `:root` en el CSS principal del proyecto
2. **Agregar Google Fonts** en el `<head>`: DM Serif Display + DM Sans + Roboto Mono
3. **Aplicar tipografía base** al body, headings y elementos numéricos según la jerarquía de la sección 3
4. **Reemplazar cualquier color hardcoded** por las variables correspondientes usando la tabla de uso
5. **Usar los componentes** de la sección 4 como base — no reinventar botones, cards ni badges
6. **Respetar la alternancia de secciones** (sección 5): white → mist → deep-ink, en ese orden
7. **Dark sections:** cambiar texto a `--text-on-dark` y links a `--teal-light` automáticamente
8. **Firma visual:** añadir el punto teal (`.brand-dot`) siempre que aparezca el nombre completo
9. **KPIs y números:** usar Roboto Mono y color `--teal`
10. **No inventar colores nuevos.** Si el diseño parece requerir uno, consultar primero.
11. **Contexto específico (dashboard, email, PPT):** aplicar las convenciones de la sección 8 según corresponda
12. **Disclaimer de portfolio:** incluir siempre en proyectos con datos de clientes reales (sección 10)

---

## 12. Checklist de QA visual

Antes de entregar cualquier implementación, verificar:

- [ ] Google Fonts cargando correctamente (DM Serif Display en H1/H2, DM Sans en resto)
- [ ] Roboto Mono en todos los valores numéricos y KPIs
- [ ] Variables CSS de paleta aplicadas (sin hexadecimales hardcoded)
- [ ] Punto teal (`.brand-dot`) en el nombre del autor/marca
- [ ] Alternancia de fondos: white → mist → dark
- [ ] Links sobre fondos oscuros usando `--teal-light`
- [ ] Touch targets ≥ 44px en mobile
- [ ] Disclaimer de confidencialidad en cards de portfolio con datos de clientes
- [ ] Sin colores fuera de la paleta definida

---

*MW Consulting · Mauricio Westphal · www.mwconsulting.cl*
