# Estudios de Mercado Inmobiliario — Web Viewer

Plataforma estática para publicar estudios de mercado inmobiliario como páginas web accesibles con código.

## Estructura

```
/
├── index.html              ← Landing: ingreso de código
├── viewer.html             ← Visualizador del estudio
├── estudios/
│   ├── EST-2025-GC-8F3K.json   ← Demo (Av. Alessandri)
│   └── [CODIGO].json           ← Un JSON por estudio
└── README.md
```

## Cómo agregar un nuevo estudio

1. Genera el JSON con Claude usando el prompt maestro.
2. Guárdalo en `/estudios/[CODIGO].json` donde `CODIGO` sigue el formato `EST-AAAA-XX-XXXX`.
3. Haz commit y push al repositorio.
4. Entrega el código al cliente — podrá acceder en: `https://[usuario].github.io/[repo]/?codigo=[CODIGO]`

## Formato del código de acceso

```
EST-AAAA-XX-XXXX
 |    |   |   |
 |    |   |   └─ 4 caracteres aleatorios (mayúsculas + números)
 |    |   └───── Iniciales sector (ej. GC = Gómez Carreño)
 |    └────────── Año
 └─────────────── Prefijo fijo
```

Ejemplos: `EST-2025-GC-8F3K`, `EST-2025-RN-2A9X`, `EST-2025-VD-KP4M`

## Despliegue en GitHub Pages

1. Crear repositorio en GitHub (puede ser público o privado con Pages).
2. Ir a **Settings → Pages → Source: Deploy from branch → main → / (root)**.
3. El sitio quedará en: `https://[usuario].github.io/[repositorio]/`

## Stack técnico

- HTML + CSS + JS vanilla (sin Node, sin build)
- [Chart.js](https://www.chartjs.org/) vía CDN — gráficos
- [Leaflet.js](https://leafletjs.com/) vía CDN — mapa
- Tiles: CartoDB Light (sin API key necesaria)
- Hosting: GitHub Pages (gratuito)

## Esquema JSON del estudio

```json
{
  "meta": {
    "codigo":      "EST-2025-GC-8F3K",
    "proyecto":    "Nombre del proyecto",
    "direccion":   "Dirección completa",
    "inmobiliaria":"Nombre inmobiliaria",
    "unidades":    252,
    "pisos":       "2 al 15",
    "fecha":       "Marzo 2025",
    "analista":    "Nombre analista o empresa"
  },
  "competencia": [
    {
      "proyecto":    "Nombre proyecto competidor",
      "direccion":   "Dirección",
      "inmobiliaria":"Inmobiliaria",
      "estado":      "Entrega inmediata | Pronta entrega | Venta en verde | Venta en blanco",
      "pisos":       26,
      "dorms":       "2D",
      "banos":       "2B",
      "m2_util":     46.0,
      "terraza":     5.5,
      "orientacion": "N / NO / P / S",
      "precio_uf":   2803,
      "uf_m2":       60.9,
      "lat":         -33.025,
      "lng":         -71.513,
      "fuente":      "fuente.cl"
    }
  ],
  "precios_base": [
    {
      "distribucion":  "2D2B",
      "orientacion":   "NO",
      "codigo":        "2D2B NO",
      "m2":            43.21,
      "uf_m2_min":     73.8,
      "uf_m2_medio":   75.9,
      "uf_m2_max":     78.1,
      "precio_min":    3189,
      "precio_medio":  3280,
      "precio_max":    3374,
      "base_modelo":   75.9
    }
  ],
  "ponderacion_orientacion": [
    {
      "orientacion": "Norponiente",
      "codigo":      "NO",
      "delta":       4.0,
      "justificacion": "Vista al mar, asoleación tarde.",
      "aplica":      "Todos los mix"
    }
  ],
  "notas": [
    {
      "titulo": "Alcance del estudio",
      "texto":  "Solo proyectos nuevos..."
    }
  ]
}
```

## Seguridad

El acceso es por **oscuridad de URL**: el código de acceso es simplemente el nombre del archivo JSON. No hay autenticación real. Es adecuado para:
- Estudios no altamente confidenciales
- Clientes B2B de confianza
- Flujos donde el analista controla quién recibe el código

Si se requiere mayor seguridad en el futuro, migrar a Netlify + Netlify Identity (sin backend propio).
