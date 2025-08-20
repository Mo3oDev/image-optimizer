import { OptimizationProfile } from './types.js'

export const profiles = {
  // Miniaturas (thumbnails) — listados, grids
  thumbnail: new OptimizationProfile('thumbnail',
    {
      quality: 70,
      effort: 3,
      lossless: false,
      width: [150, 300],
      resize: { fit: 'inside', withoutEnlargement: true }
    }, // WebP
    {
      quality: 55,
      effort: 4,
      lossless: false,
      width: [150, 300],
      resize: { fit: 'inside', withoutEnlargement: true }
    } // AVIF
  ),

  // Productos — detalle, galería, zoom razonable
  product: new OptimizationProfile('product',
    {
      quality: 80,
      effort: 4,
      lossless: false,
      width: [800, 1200, 1600],
      resize: { fit: 'inside', withoutEnlargement: true }
    }, // WebP
    {
      quality: 65,
      effort: 5,
      lossless: false,
      width: [800, 1200, 1600],
      resize: { fit: 'inside', withoutEnlargement: true }
    } // AVIF
  ),

  // Banners / Fondos / Hero — full-width visuales
  banner: new OptimizationProfile('banner',
    {
      quality: 70,
      effort: 4,
      lossless: false,
      width: [1280, 1920, 2560],
      resize: { fit: 'cover', withoutEnlargement: true }
    }, // WebP
    {
      quality: 60,
      effort: 5,
      lossless: false,
      width: [1280, 1920, 2560],
      resize: { fit: 'cover', withoutEnlargement: true }
    } // AVIF
  ),

  // Logos — preferible SVG (vector). Si raster: mantener nitidez → lossless
  logo: new OptimizationProfile('logo',
    {
      quality: 100,
      effort: 4,
      lossless: true,
      width: [100, 200, 400],
      resize: { fit: 'contain', withoutEnlargement: true }
    }, // WebP
    {
      quality: 90,
      effort: 5,
      lossless: true,
      width: [100, 200, 400],
      resize: { fit: 'contain', withoutEnlargement: true }
    } // AVIF
  ),

  // Fallbacks genéricos: uso rápido si no se especifica tipo
  default: new OptimizationProfile('default',
    {
      quality: 80,
      effort: 4,
      lossless: false,
      width: [800],
      resize: { fit: 'inside', withoutEnlargement: true }
    },
    {
      quality: 65,
      effort: 4,
      lossless: false,
      width: [800],
      resize: { fit: 'inside', withoutEnlargement: true }
    }
  ),

  highQuality: new OptimizationProfile('high-quality',
    { 
      quality: 90, 
      effort: 5, 
      lossless: false,
      width: [1200], 
      resize: { fit: 'inside', withoutEnlargement: true }
    },
    { 
      quality: 80, 
      effort: 5, 
      lossless: false,
      width: [1200], 
      resize: { fit: 'inside', withoutEnlargement: true }
    }
  ),

  balanced: new OptimizationProfile('balanced',
    { 
      quality: 75, 
      effort: 4, 
      lossless: false,
      width: [800], 
      resize: { fit: 'inside', withoutEnlargement: true }
    },
    { 
      quality: 60, 
      effort: 4, 
      lossless: false,
      width: [800], 
      resize: { fit: 'inside', withoutEnlargement: true }
    }
  ),

  aggressive: new OptimizationProfile('aggressive',
    { 
      quality: 60, 
      effort: 3, 
      lossless: false,
      width: [600], 
      resize: { fit: 'inside', withoutEnlargement: true }
    },
    { 
      quality: 45, 
      effort: 3, 
      lossless: false,
      width: [600], 
      resize: { fit: 'inside', withoutEnlargement: true }
    }
  )
}

export function getProfile(name) {
  const profile = profiles[name]
  if (!profile) {
    throw new Error(`Perfil '${name}' no encontrado. Perfiles disponibles: ${Object.keys(profiles).join(', ')}`)
  }
  return profile
}