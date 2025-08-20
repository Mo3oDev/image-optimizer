# 🖼️ Image Optimizer

Optimizador de imágenes parametrizable con perfiles especializados que convierte imágenes JPEG/PNG a formatos modernos WebP y AVIF, con soporte para redimensionado automático y generación de variantes específicas por caso de uso.

## ✨ Características

- 🔄 **Conversión moderna**: JPEG/PNG → WebP + AVIF
- 📐 **Redimensionado inteligente**: Múltiples variantes por imagen
- 🎯 **Perfiles especializados**: Optimizados para diferentes casos de uso
- ⚡ **Concurrencia controlada**: Procesamiento eficiente con p-limit
- 📊 **Reportes detallados**: Ahorro de espacio por variante y formato
- 🛠️ **CLI intuitivo**: Fácil de usar con múltiples opciones
- 🔧 **Manejo robusto de errores**: Continúa el proceso aunque fallen algunas imágenes
- 🎨 **Fit modes inteligentes**: inside/cover/contain según el caso de uso

## 🚀 Instalación

```bash
npm install
```

## 📖 Uso

### Comando básico
```bash
node src/cli/index.js ./ruta/a/imagenes
```

### Con perfil especializado
```bash
node src/cli/index.js ./ruta/a/imagenes --profile product
```

### Control de concurrencia
```bash
node src/cli/index.js ./ruta/a/imagenes --profile banner --concurrency 2
```

### Modo verbose con detalles
```bash
node src/cli/index.js ./ruta/a/imagenes --profile thumbnail --verbose
```

### Simulación (dry-run)
```bash
node src/cli/index.js ./ruta/a/imagenes --profile logo --dry-run
```

### Ver perfiles disponibles
```bash
node src/cli/index.js profiles
```

## 📋 Perfiles Disponibles

### 🎯 Perfiles Especializados

#### **`thumbnail`** - Miniaturas para Listados
- **Variantes**: 150px, 300px
- **Fit mode**: `inside` (mantiene proporciones)
- **Uso**: Listados de productos, grids, previews

#### **`product`** - Catálogos de Productos  
- **Variantes**: 800px, 1200px, 1600px
- **Fit mode**: `inside` (mantiene proporciones)
- **Uso**: Páginas de producto, galerías, zoom

#### **`banner`** - Banners y Fondos Hero
- **Variantes**: 1280px, 1920px, 2560px  
- **Fit mode**: `cover` (llena el área completamente)
- **Uso**: Headers, fondos de sección, héroes

#### **`logo`** - Logos y Gráficos
- **Variantes**: 100px, 200px, 400px
- **Fit mode**: `contain` (mantiene logo completo)
- **Compresión**: Lossless para máxima nitidez
- **Uso**: Logos, iconos, gráficos vectoriales rasterizados

### 🎯 Perfiles Básicos

- **`default`**: Calidad equilibrada (800px)
- **`balanced`**: Optimización balanceada (800px)  
- **`aggressive`**: Máxima compresión (600px)
- **`high-quality`**: Alta calidad (1200px)

## 📁 Estructura de Output

```
tu-directorio/
├── imagen1.jpg
├── imagen2.png
├── webp/
│   ├── imagen1.webp          (original)
│   ├── imagen1_800w.webp     (variante)
│   ├── imagen1_1200w.webp    (variante)
│   ├── imagen1_1600w.webp    (variante)
│   ├── imagen2.webp
│   ├── imagen2_800w.webp
│   └── imagen2_1200w.webp
└── avif/
    ├── imagen1.avif
    ├── imagen1_800w.avif
    ├── imagen1_1200w.avif
    ├── imagen1_1600w.avif
    ├── imagen2.avif
    ├── imagen2_800w.avif
    └── imagen2_1200w.avif
```

## 🏗️ Arquitectura

El proyecto sigue una **mini Clean Architecture**:

- `src/core/` - Lógica de negocio pura
  - `optimizer.js` - Orquestador principal con concurrencia
  - `types.js` - Tipos, variantes y perfiles
  - `profiles.js` - Perfiles especializados predefinidos
- `src/infrastructure/` - Adaptadores externos
  - `image-processor.js` - Sharp con clonado y fit modes
  - `file-handler.js` - Sistema de archivos con naming inteligente
  - `logger.js` - Logging colorido con detalles de variantes
- `src/cli/` - Interfaz de línea de comandos
  - `index.js` - Commander.js con opciones avanzadas

## 🔧 Opciones de CLI

```bash
Arguments:
  directory                   Directorio con imágenes (JPEG/PNG) a optimizar

Options:
  -p, --profile <name>        Perfil de optimización (default: "default")
  -c, --concurrency <number>  Número de tareas concurrentes 1-6 (default: "3")
  -v, --verbose               Mostrar información detallada
  --dry-run                   Simular sin procesar archivos
  -h, --help                  Mostrar ayuda
```

## 🧪 Ejemplos de Uso por Caso

### E-commerce
```bash
# Thumbnails para listados
node src/cli/index.js ./productos --profile thumbnail --verbose

# Imágenes de producto completas
node src/cli/index.js ./productos --profile product --concurrency 4

# Banners promocionales
node src/cli/index.js ./banners --profile banner --concurrency 2
```

### Blog/CMS
```bash
# Contenido general
node src/cli/index.js ./articulos --profile default --verbose

# Imágenes destacadas
node src/cli/index.js ./destacadas --profile banner
```

### Branding
```bash
# Logos (lossless)
node src/cli/index.js ./logos --profile logo --verbose
```

## 📊 Ejemplo de Output

```
📊 Resumen de Optimización

WEBP:
  Variantes: 9
  Tamaño original: 4.2 MB
  Tamaño optimizado: 1.8 MB
  Ahorro: 57.1%
    800w: 3 archivos, 680.45 KB ahorrados (58.2%)
    1200w: 3 archivos, 520.12 KB ahorrados (56.8%)
    1600w: 3 archivos, 790.67 KB ahorrados (56.4%)

AVIF:
  Variantes: 9
  Tamaño original: 4.2 MB
  Tamaño optimizado: 1.2 MB
  Ahorro: 71.4%
    800w: 3 archivos, 890.23 KB ahorrados (72.1%)
    1200w: 3 archivos, 720.45 KB ahorrados (71.2%)
    1600w: 3 archivos, 1.1 MB ahorrados (70.9%)

📈 RESUMEN TOTAL:
  Variantes generadas: 18
  Tamaño original: 8.4 MB
  Tamaño optimizado: 3.0 MB
  Ahorro total: 5.4 MB (64.3%)
```

## 📦 Tecnologías

- **Node.js** - Runtime (>= 18.0.0)
- **Sharp** - Procesamiento de imágenes con optimizaciones de memoria
- **Commander.js** - CLI framework con subcomandos
- **p-limit** - Control de concurrencia inteligente
- **Chalk** - Colores en terminal
- **Ora** - Indicadores de progreso

## ⚡ Optimizaciones Implementadas

### Rendimiento
- **Sharp.clone()**: Evita reabrir archivos para cada variante
- **p-limit**: Control de concurrencia inteligente (1-6 tareas)
- **sharp.cache(false)**: Previene acumulación de memoria en batch grandes
- **SIMD habilitado**: Utiliza instrucciones vectoriales del CPU

### Calidad
- **Fit modes específicos**: inside/cover/contain según el caso de uso
- **Quality tuning**: Ajustado por formato y caso de uso específico
- **Lossless para gráficos**: Preserva nitidez en logos e iconos
- **Effort optimization**: Balanceado por velocidad vs compresión

### Robustez
- **Promise.allSettled**: Error handling que no detiene todo el proceso
- **Suffix naming**: Nomenclatura clara para responsive design
- **Batch resiliente**: Continúa procesando aunque fallen imágenes individuales

## 🎯 Casos de Uso Recomendados

### Thumbnail Profile
✅ **Ideal para**: Listados de productos, grids, previews, carruseles  
✅ **Características**: Tamaños pequeños, carga rápida, responsive  
✅ **Formatos**: Ambos JPEG/PNG → WebP/AVIF  

### Product Profile  
✅ **Ideal para**: Páginas de producto, galerías, lightbox, zoom  
✅ **Características**: Balance calidad/peso, múltiples resoluciones  
✅ **Formatos**: Ambos JPEG/PNG → WebP/AVIF  

### Banner Profile
✅ **Ideal para**: Headers, héroes, fondos de sección, promocionales  
✅ **Características**: Cover completo, alta resolución, optimizado peso  
✅ **Formatos**: Principalmente JPEG → WebP/AVIF  

### Logo Profile
✅ **Ideal para**: Logos, iconos, gráficos simples  
✅ **Características**: Lossless, máxima nitidez, tamaños precisos  
✅ **Formatos**: Principalmente PNG → WebP/AVIF (lossless)  

## 🚀 Extensibilidad

El diseño modular permite:

- ✅ Agregar nuevos perfiles especializados
- ✅ Crear fit modes personalizados  
- ✅ Integrar nuevos formatos de salida
- ✅ Extender el CLI con más comandos
- ✅ Implementar backends de almacenamiento (S3, CDN)

## 📝 Notas Importantes

- **Fit modes** están optimizados por caso de uso (inside/cover/contain)  
- **Lossless mode** se usa solo para logos/gráficos donde la nitidez es crítica
- **PNG transparency** se preserva correctamente en WebP/AVIF
- **Concurrencia** recomendada: 2-4 para mejores resultados CPU/memoria
- **Quality settings** han sido tuneados específicamente por perfil y formato