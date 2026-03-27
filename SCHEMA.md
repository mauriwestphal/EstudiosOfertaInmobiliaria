# Formato JSON V2 — Estudios de Oferta Inmobiliaria MW Consulting

## Versión

`version_esquema: "2.0"`

---

## Estructura general

```json
{
  "meta": { ... },
  "proyecto_evaluado": { ... },
  "competencia": [ ... ],
  "precios_base": [ ... ],
  "ponderacion_orientacion": [ ... ],
  "resumen_mercado": { ... },
  "notas": [ ... ]
}
```

Las secciones `meta` y `competencia` son **obligatorias**. El resto es **opcional** según el alcance del estudio.

---

## Sección `meta` (obligatoria)

Metadatos de identificación del estudio.

| Campo             | Tipo   | Requerido | Descripción                                                  |
|-------------------|--------|-----------|--------------------------------------------------------------|
| `codigo`          | string | Sí        | Identificador único del estudio. Formato: `EST-AAAA-XX-XXXX` |
| `version_esquema` | string | Sí        | Versión del esquema JSON. Debe ser `"2.0"`                   |
| `proyecto`        | string | Sí        | Nombre del proyecto evaluado                                 |
| `direccion`       | string | No        | Dirección del proyecto evaluado                              |
| `inmobiliaria`    | string | No        | Nombre de la inmobiliaria del proyecto evaluado              |
| `unidades`        | number | No        | Total de unidades del proyecto evaluado                      |
| `pisos`           | string | No        | Rango o descripción de pisos del proyecto evaluado           |
| `fecha`           | string | No        | Fecha del estudio (ej: `"Marzo 2025"` o `"2026-03-26"`)     |
| `analista`        | string | No        | Nombre del analista o empresa que elaboró el estudio         |
| `cliente`         | string | No        | Cliente para el que se elaboró el estudio                    |
| `autor`           | string | No        | Autor o empresa responsable del estudio                      |
| `metodologia`     | object | No        | Descripción de metodología (ver sub-campos)                  |

### Sub-campos de `meta.metodologia`

| Campo                  | Tipo     | Descripción                                             |
|------------------------|----------|---------------------------------------------------------|
| `fuente_precios`       | string   | Portales y fuentes usadas para levantar precios         |
| `criterio_precio`      | string   | Qué incluye/excluye el precio publicado                 |
| `descuento_estimado`   | string   | Porcentaje de descuento estimado sobre precio de lista  |
| `formula_ufm2`         | string   | Fórmula usada para calcular UF/m²                       |
| `tipo_proyectos`       | string   | Criterio de inclusión/exclusión de proyectos            |
| `orientaciones`        | string   | Notas sobre levantamiento de orientaciones              |
| `notas`                | string[] | Lista de observaciones metodológicas                    |

---

## Sección `proyecto_evaluado` (opcional)

Ficha detallada del proyecto que se está evaluando (el propio cliente).

| Campo                    | Tipo     | Requerido | Descripción                                              |
|--------------------------|----------|-----------|----------------------------------------------------------|
| `nombre`                 | string   | Sí        | Nombre del proyecto                                      |
| `desarrollador`          | string   | No        | Inmobiliaria(s) desarrolladoras                          |
| `direccion`              | string   | No        | Dirección                                                |
| `sector`                 | string   | No        | Sector o barrio del proyecto                             |
| `distancia_centro_m`     | number   | No        | Distancia al centro de la ciudad en metros               |
| `pisos`                  | number   | No        | Número de pisos del edificio                             |
| `total_unidades`         | number   | No        | Total de unidades del proyecto                           |
| `superficie_vendible_m2` | number   | No        | Total de m² vendibles                                    |
| `superficie_promedio_m2` | number   | No        | Superficie promedio por unidad                           |
| `precio_promedio_uf`     | number   | No        | Precio promedio por unidad en UF                         |
| `uf_m2_neto_depto`       | number   | No        | UF/m² neto (sin estacionamiento ni bodega)               |
| `venta_neta_total_uf`    | number   | No        | Monto total de venta del proyecto en UF                  |
| `amenities`              | string[] | No        | Lista de amenities del proyecto                          |
| `estacionamientos`       | number   | No        | Número de estacionamientos del proyecto                  |
| `bodegas`                | number   | No        | Número de bodegas del proyecto                           |
| `mix_unidades`           | object[] | No        | Lista de tipos de unidades con su cantidad               |

---

## Sección `competencia` (obligatoria)

Array de proyectos competidores levantados en terreno/portales. Cada objeto representa **una unidad o tipología** comparable.

| Campo                | Tipo         | Requerido | Descripción                                                        |
|----------------------|--------------|-----------|--------------------------------------------------------------------|
| `proyecto`           | string       | Sí        | Nombre del proyecto competidor (incluye tipología si aplica)       |
| `direccion`          | string       | No        | Dirección del proyecto                                             |
| `inmobiliaria`       | string       | No        | Nombre de la inmobiliaria                                          |
| `zona`               | string\|null | No        | Zona geográfica (ej: `"centro"`, `"costa"`)                        |
| `sector`             | string\|null | No        | Sector o barrio específico                                         |
| `distancia_centro_m` | number\|null | No        | Distancia al centro de la ciudad en metros                         |
| `estado`             | string       | No        | Estado del proyecto (`"Venta en verde"`, `"Pronta entrega"`, etc.) |
| `pisos`              | number       | No        | Número de pisos del edificio                                       |
| `dorms`              | string       | No        | Número de dormitorios (ej: `"2D"`)                                 |
| `banos`              | string       | No        | Número de baños (ej: `"2B"`)                                       |
| `m2_util`            | number       | No        | Superficie útil en m²                                              |
| `terraza`            | number       | No        | Superficie de terraza en m²                                        |
| `orientacion`        | string       | No        | Orientación(es) de la unidad                                       |
| `vista_principal`    | string\|null | No        | Vista principal (ej: `"Lago y Volcán"`, `"Urbano"`)               |
| `amenities`          | array\|null  | No        | Lista de amenities del proyecto competidor                         |
| `disponibles`        | number\|null | No        | Unidades disponibles al momento del levantamiento                  |
| `total_unidades`     | number\|null | No        | Total de unidades del proyecto                                     |
| `precio_lista_uf`    | number       | Sí        | Precio de lista publicado en UF                                    |
| `precio_dcto_uf`     | number\|null | No        | Precio con descuento estimado en UF (`null` si no disponible)     |
| `uf_m2_lista`        | number       | Sí        | UF/m² calculado sobre precio de lista                             |
| `uf_m2_dcto`         | number\|null | No        | UF/m² calculado sobre precio con descuento (`null` si no disponible) |
| `estacionamiento_uf` | number\|null | No        | Precio del estacionamiento en UF (`null` si incluido o no aplica) |
| `bodega_uf`          | number\|null | No        | Precio de la bodega en UF (`null` si incluida o no aplica)        |
| `lat`                | number       | No        | Latitud geográfica                                                 |
| `lng`                | number       | No        | Longitud geográfica                                                |
| `fuente`             | string       | No        | Fuente de donde se obtuvo el precio                                |

---

## Sección `precios_base` (opcional)

Tabla de precios recomendados por distribución y orientación para el proyecto evaluado.

| Campo           | Tipo   | Requerido | Descripción                                      |
|-----------------|--------|-----------|--------------------------------------------------|
| `distribucion`  | string | Sí        | Distribución (ej: `"2D2B"`, `"1D1B"`)           |
| `orientacion`   | string | Sí        | Orientación cardinal abreviada (ej: `"NO"`, `"S"`) |
| `codigo`        | string | No        | Código compuesto distribución + orientación      |
| `m2`            | number | Sí        | Superficie útil en m²                            |
| `uf_m2_min`     | number | Sí        | UF/m² mínimo recomendado                         |
| `uf_m2_medio`   | number | Sí        | UF/m² medio recomendado (base del modelo)        |
| `uf_m2_max`     | number | Sí        | UF/m² máximo recomendado                         |
| `precio_min`    | number | Sí        | Precio mínimo en UF                              |
| `precio_medio`  | number | Sí        | Precio medio en UF                               |
| `precio_max`    | number | Sí        | Precio máximo en UF                              |
| `base_modelo`   | number | No        | Valor UF/m² usado como base en el modelo         |

---

## Sección `ponderacion_orientacion` (opcional)

Tabla de ajustes de precio por orientación, expresados como delta porcentual sobre el precio base.

| Campo           | Tipo   | Requerido | Descripción                                                    |
|-----------------|--------|-----------|----------------------------------------------------------------|
| `orientacion`   | string | Sí        | Nombre completo de la orientación (ej: `"Norponiente"`)       |
| `codigo`        | string | Sí        | Abreviatura usada en `precios_base.orientacion` (ej: `"NO"`) |
| `delta`         | number | Sí        | Ajuste en % sobre el precio base (positivo = prima, negativo = descuento) |
| `justificacion` | string | No        | Explicación del ajuste                                         |
| `aplica`        | string | No        | A qué tipos de distribución aplica                            |

---

## Sección `resumen_mercado` (opcional)

Indicadores agregados del mercado para el sector analizado.

| Campo              | Tipo   | Requerido | Descripción                                      |
|--------------------|--------|-----------|--------------------------------------------------|
| `uf_m2_min`        | number | No        | UF/m² mínimo observado en competencia            |
| `uf_m2_max`        | number | No        | UF/m² máximo observado en competencia            |
| `uf_m2_promedio`   | number | No        | UF/m² promedio observado en competencia          |
| `precio_min_uf`    | number | No        | Precio mínimo en UF observado en competencia     |
| `precio_max_uf`    | number | No        | Precio máximo en UF observado en competencia     |
| `n_proyectos`      | number | No        | Número de proyectos relevados                    |
| `n_tipologias`     | number | No        | Número de tipologías relevadas                   |
| `notas`            | string | No        | Observaciones adicionales sobre el mercado       |

---

## Sección `notas` (opcional)

Array de notas aclaratorias del estudio.

| Campo     | Tipo   | Requerido | Descripción                         |
|-----------|--------|-----------|-------------------------------------|
| `titulo`  | string | Sí        | Título o categoría de la nota       |
| `texto`   | string | Sí        | Contenido de la nota                |

---

## Ejemplo mínimo (JSON V2)

```json
{
  "meta": {
    "codigo": "EST-2025-XX-0000",
    "version_esquema": "2.0",
    "proyecto": "Nombre del Proyecto",
    "fecha": "2025-01-01",
    "analista": "MW Consulting"
  },
  "competencia": [
    {
      "proyecto": "Edificio Ejemplo — 2D2B",
      "direccion": "Calle Ejemplo 123, Ciudad",
      "inmobiliaria": "Inmobiliaria Ejemplo",
      "zona": null,
      "sector": null,
      "distancia_centro_m": null,
      "estado": "Venta en verde",
      "pisos": 12,
      "dorms": "2D",
      "banos": "2B",
      "m2_util": 50.0,
      "terraza": 6.0,
      "orientacion": "N",
      "vista_principal": null,
      "amenities": null,
      "disponibles": null,
      "total_unidades": null,
      "precio_lista_uf": 3500,
      "precio_dcto_uf": null,
      "uf_m2_lista": 70.0,
      "uf_m2_dcto": null,
      "estacionamiento_uf": null,
      "bodega_uf": null,
      "lat": -33.0000,
      "lng": -71.0000,
      "fuente": "portalinmobiliario.com"
    }
  ]
}
```

---

## Notas de migración desde V1

| Campo V1      | Campo V2           | Cambio                        |
|---------------|--------------------|-------------------------------|
| `precio_uf`   | `precio_lista_uf`  | Renombrado para mayor claridad |
| `uf_m2`       | `uf_m2_lista`      | Renombrado para mayor claridad |
| —             | `precio_dcto_uf`   | Campo nuevo, `null` en V1→V2  |
| —             | `uf_m2_dcto`       | Campo nuevo, `null` en V1→V2  |
| —             | `zona`             | Campo nuevo, `null` en V1→V2  |
| —             | `sector`           | Campo nuevo, `null` en V1→V2  |
| —             | `distancia_centro_m` | Campo nuevo, `null` en V1→V2 |
| —             | `vista_principal`  | Campo nuevo, `null` en V1→V2  |
| —             | `amenities`        | Campo nuevo, `null` en V1→V2  |
| —             | `disponibles`      | Campo nuevo, `null` en V1→V2  |
| —             | `total_unidades`   | Campo nuevo, `null` en V1→V2  |
| —             | `estacionamiento_uf` | Campo nuevo, `null` en V1→V2 |
| —             | `bodega_uf`        | Campo nuevo, `null` en V1→V2  |
