# Image & Video Optimizer

Conversor de imágenes y videos a formatos modernos con control total de calidad. Convierte JPEG/PNG a WebP, AVIF y JPEG XL, y videos a WebM/MP4, con soporte para upscaling, target de tamaño de archivo, modo watch, control EXIF y generación automática de snippets HTML.

## Instalación

```bash
npm install
```

Para procesar videos, FFmpeg debe estar instalado en el sistema:

```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Windows — descarga desde https://ffmpeg.org/download.html
```

## Uso rápido

```bash
# Conversión básica: genera webp/ y avif/ en el mismo directorio
node src/cli/index.js ./imagenes

# Especificar formato de salida
node src/cli/index.js ./imagenes --format webp
node src/cli/index.js ./imagenes --format avif
node src/cli/index.js ./imagenes --format webp,avif,jxl

# Reducir ancho máximo a 1200px (mantiene proporción, nunca agranda)
node src/cli/index.js ./imagenes --width 1200

# Agrandar imágenes 2x con kernel Lanczos3
node src/cli/index.js ./imagenes --upscale 2

# Forzar tamaño máximo de archivo (búsqueda binaria en calidad)
node src/cli/index.js ./imagenes --target-size 150kb
node src/cli/index.js ./imagenes --target-size 1.5mb

# Procesar videos también
node src/cli/index.js ./media --video
node src/cli/index.js ./media --video --codec h264

# Ver qué se procesaría sin escribir nada
node src/cli/index.js ./imagenes --dry-run
```

## Todas las opciones

```
Arguments:
  <directory>                   Directorio con archivos a optimizar

Formato y calidad:
  -f, --format <formats>        Formatos de salida: webp, avif, jxl, o separados
                                por comas (default: webp,avif)
  -q, --quality <number>        Calidad 1-100 (defaults: webp=80, avif=50, jxl=80)

Geometría:
  -w, --width <pixels>          Ancho máximo en píxeles, mantiene proporción
                                (solo reduce, nunca agranda)
  --upscale <factor>            Ampliar por factor usando Lanczos3 (ej: 2, 3, 4)
                                No compatible con --width

Metadatos EXIF:
  --preserve-exif               Conservar metadatos EXIF/ICC en los archivos de salida
  --auto-orient                 Rotar según orientación EXIF antes de convertir

Target de tamaño:
  --target-size <size>          Tamaño máximo por archivo (ej: 150kb, 1.5mb, 500)
                                Hace búsqueda binaria en calidad. Anula --quality

Directorio de salida:
  -o, --output <dir>            Directorio de salida personalizado (default: subdirs
                                dentro del directorio de entrada)
  --flat                        Escribir archivos junto a los originales, sin subdirs
                                por formato

Video:
  --video                       Activar procesamiento de videos (requiere FFmpeg)
  --codec <name>                Codec de video: h264, vp9, av1 (default: vp9)

Flujo:
  --watch                       Modo watch: procesa archivos existentes y luego
                                monitorea el directorio para nuevos archivos
  --srcset                      Genera srcset.html con etiquetas <picture> listas
                                para usar tras el procesamiento

General:
  -c, --concurrency <number>    Tareas concurrentes 1-10 (default: 3)
  -v, --verbose                 Mostrar información detallada
  --dry-run                     Previsualizar sin escribir archivos
  --config <path>               Ruta a archivo de configuración JSON

Comandos:
  init-config                   Genera un archivo de configuración de ejemplo
```

## Ejemplos por caso de uso

### Conversión simple de un directorio

```bash
# WebP + AVIF con calidad por defecto
node src/cli/index.js ./fotos

# Solo WebP con calidad alta
node src/cli/index.js ./fotos --format webp --quality 90
```

### Preparar imágenes para web responsive

```bash
# Convertir sin redimensionar — el navegador elige el formato
node src/cli/index.js ./imagenes

# Redimensionar a 1200px max y convertir
node src/cli/index.js ./imagenes --width 1200

# Generar snippets HTML <picture> listos para pegar
node src/cli/index.js ./imagenes --srcset
```

### Control estricto de tamaño de archivo

```bash
# Cada imagen de salida pesa como máximo 100kb
node src/cli/index.js ./fotos --target-size 100kb --format webp

# Útil para galerías con restricciones de CDN
node src/cli/index.js ./galeria --target-size 200kb --format webp,avif
```

### Restaurar o mejorar imágenes pequeñas

```bash
# Duplicar resolución con Lanczos3
node src/cli/index.js ./thumbs --upscale 2

# Triplicar y convertir a AVIF
node src/cli/index.js ./thumbs --upscale 3 --format avif
```

### Preservar metadatos para fotografía

```bash
# Mantener EXIF (cámara, GPS, fecha) en los archivos convertidos
node src/cli/index.js ./fotos --preserve-exif

# Corregir orientación según EXIF y descartar el resto
node src/cli/index.js ./fotos --auto-orient
```

### Directorio de salida personalizado

```bash
# Salida en dist/ manteniendo subdirs por formato: dist/webp/, dist/avif/
node src/cli/index.js ./imagenes --output ./dist

# Salida plana en dist/ sin subdirs
node src/cli/index.js ./imagenes --output ./dist --flat

# Archivos junto a los originales (misma carpeta, extensión diferente)
node src/cli/index.js ./imagenes --flat
```

### Procesamiento de videos

```bash
# VP9 → WebM (default)
node src/cli/index.js ./videos --video

# H264 → MP4 (máxima compatibilidad)
node src/cli/index.js ./videos --video --codec h264

# AV1 → WebM (mejor compresión, encoding más lento)
node src/cli/index.js ./videos --video --codec av1

# Imágenes y videos juntos
node src/cli/index.js ./media --video --format webp,avif
```

### Modo watch para flujos de trabajo continuos

```bash
# Procesar archivos existentes y quedarse monitoreando
node src/cli/index.js ./imagenes --watch

# Watch con todas las opciones activas
node src/cli/index.js ./imagenes --watch --format webp --width 1200 --srcset
```

### Configuración avanzada con opciones combinadas

```bash
# Pipeline completo para producción
node src/cli/index.js ./media \
  --format webp,avif \
  --width 1600 \
  --quality 82 \
  --output ./dist \
  --video --codec h264 \
  --srcset \
  --concurrency 6 \
  --verbose
```

## Estructura de salida

Por defecto se crea un subdirectorio por formato dentro del directorio de entrada:

```
tu-directorio/
├── foto1.jpg
├── foto2.png
├── webp/
│   ├── foto1.webp
│   └── foto2.webp
└── avif/
    ├── foto1.avif
    └── foto2.avif
```

Con `--flat` los archivos se escriben junto a los originales:

```
tu-directorio/
├── foto1.jpg
├── foto1.webp
├── foto1.avif
├── foto2.png
├── foto2.webp
└── foto2.avif
```

Con `--srcset` se añade `srcset.html` al directorio de salida:

```html
<!-- foto1.jpg -->
<picture>
  <source srcset="avif/foto1.avif" type="image/avif">
  <source srcset="webp/foto1.webp" type="image/webp">
  <img src="foto1.jpg" alt="" loading="lazy" decoding="async">
</picture>
```

## Archivo de configuración

Genera una plantilla con `node src/cli/index.js init-config`, que crea `image-optimizer.json`:

```json
{
  "image": {
    "concurrency": 3,
    "formats": ["webp", "avif"],
    "webpQuality": 80,
    "avifQuality": 50,
    "effort": 4
  },
  "video": {
    "maxHeight": 720,
    "fps": 24,
    "codec": "vp9",
    "removeAudio": true,
    "preset": "medium"
  }
}
```

El archivo se busca automáticamente como `image-optimizer.json`, `.image-optimizer.json` o `image-optimizer.config.json` en el directorio de entrada. Las opciones del CLI siempre tienen prioridad sobre el archivo de configuración.

### Opciones de imagen

| Opción | Tipo | Descripción |
|--------|------|-------------|
| `concurrency` | número (1-10) | Tareas paralelas |
| `formats` | array | Formatos de salida: `webp`, `avif`, `jxl` |
| `webpQuality` | número (1-100) | Calidad por defecto para WebP |
| `avifQuality` | número (1-100) | Calidad por defecto para AVIF |
| `effort` | número | Esfuerzo de compresión (WebP: 0-6, AVIF: 0-9, JXL: 3-9) |

### Opciones de video

| Opción | Tipo | Descripción |
|--------|------|-------------|
| `maxHeight` | número (144-4320) | Altura máxima en píxeles |
| `fps` | número (1-120) | Frames por segundo de salida |
| `codec` | string | `vp9`, `av1`, `h264` |
| `removeAudio` | boolean | Eliminar la pista de audio |
| `preset` | string | Velocidad de encoding: `ultrafast` → `veryslow` |

## Calidades de referencia por formato

| Formato | Calidad por defecto | Rango recomendado | Notas |
|---------|--------------------|--------------------|-------|
| WebP | 80 | 75-90 | Excelente soporte en todos los navegadores modernos |
| AVIF | 50 | 40-65 | Mejor compresión que WebP. Calidad 50 ≈ WebP 80 visualmente |
| JXL | 80 | 70-90 | Requiere libvips con soporte JXL compilado |

## CRF de video por codec

| Codec | CRF por defecto | Rango recomendado | Contenedor |
|-------|----------------|-------------------|------------|
| VP9 | 31 | 28-36 | WebM |
| H264 | 23 | 18-28 | MP4 |
| AV1 | 35 | 28-40 | WebM |

CRF más bajo = mayor calidad y mayor tamaño de archivo.

## Arquitectura

```
src/
├── cli/
│   └── index.js              Interfaz CLI (Commander.js)
├── core/
│   ├── optimizer.js          Orquestador de imágenes con p-limit
│   ├── video-optimizer.js    Orquestador de videos
│   ├── srcset-generator.js   Generador de snippets HTML <picture>
│   ├── types.js              ImageFormat, OptimizationResult
│   └── video-types.js        VideoCodec, VideoOptimizationProfile
├── infrastructure/
│   ├── image-processor.js    Wrapper de Sharp (resize, upscale, EXIF, formatos)
│   ├── video-processor.js    Wrapper de FFmpeg via child_process.spawn()
│   ├── file-handler.js       Operaciones de sistema de archivos
│   ├── logger.js             Salida en consola con chalk/ora
│   └── config-loader.js      Carga y validación de configuración JSON
└── utils/
    └── parse-size.js         Parser de tamaños (150kb, 1.5mb...)
```

El proyecto sigue una mini Clean Architecture: el CLI delega en los orquestadores del core, que usan los adaptadores de infraestructura. El procesador de imagen y el procesador de video son intercambiables.

## Tests

```bash
# Ejecutar todos los tests
npm test

# Modo watch durante desarrollo
npm run test:watch

# Con reporte de cobertura
npm run test:coverage
```

120 tests en total: 99 unitarios + 21 de integración con Sharp real sobre directorios temporales. Los tests de JXL se saltan automáticamente si la instalación de libvips no tiene soporte JXL compilado.

## Tecnologías

- **Node.js** ≥ 18.0.0 — ES modules
- **Sharp** — Procesamiento de imagen con SIMD y cache desactivado para batches grandes
- **FFmpeg** (externo) — Procesamiento de video vía `child_process.spawn()`
- **Commander.js** — CLI framework
- **p-limit** — Control de concurrencia
- **chokidar** — Watch de sistema de archivos
- **Chalk + Ora** — Salida colorida y spinners
- **Vitest** — Tests unitarios e integración
