import sharp from 'sharp'
import { ImageFormat } from '../core/types.js'

export class SharpImageProcessor {
  constructor() {
    sharp.cache(false)
    sharp.simd(true)
    sharp.concurrency(1)
  }

  async optimize(inputPath, outputPath, format, options) {
    try {
      const pipeline = sharp(inputPath)
      
      switch (format) {
        case ImageFormat.WEBP:
          await pipeline.webp(options).toFile(outputPath)
          break
          
        case ImageFormat.AVIF:
          await pipeline.avif(options).toFile(outputPath)
          break
          
        default:
          throw new Error(`Formato no soportado: ${format}`)
      }
    } catch (error) {
      throw new Error(`Error procesando ${inputPath} a ${format}: ${error.message}`)
    }
  }

  async optimizeWithVariant(inputPath, outputPath, format, variant, options) {
    try {
      const basePipeline = sharp(inputPath)
      
      const resizeOptions = this._buildResizeOptions(variant, options)
      let pipeline = basePipeline.clone()

      if (resizeOptions) {
        pipeline = pipeline.resize(resizeOptions)
      }

      const formatOptions = this._buildFormatOptions(format, options)
      
      switch (format) {
        case ImageFormat.WEBP:
          await pipeline.webp(formatOptions).toFile(outputPath)
          break
          
        case ImageFormat.AVIF:
          await pipeline.avif(formatOptions).toFile(outputPath)
          break
          
        default:
          throw new Error(`Formato no soportado: ${format}`)
      }
    } catch (error) {
      throw new Error(`Error procesando ${inputPath} a ${format} (${variant.suffix}): ${error.message}`)
    }
  }

  _buildResizeOptions(variant, options) {
    if (!variant.width && !variant.height) {
      return null
    }

    const resizeOptions = {
      fit: options.resize?.fit || 'inside',
      withoutEnlargement: options.resize?.withoutEnlargement !== false
    }

    if (variant.width) {
      resizeOptions.width = variant.width
    }
    
    if (variant.height) {
      resizeOptions.height = variant.height
    }

    if (options.resize?.position) {
      resizeOptions.position = options.resize.position
    }

    return resizeOptions
  }

  _buildFormatOptions(format, options) {
    const formatOptions = { ...options }

    delete formatOptions.width
    delete formatOptions.height
    delete formatOptions.resize

    if (format === ImageFormat.WEBP) {
      return {
        quality: formatOptions.quality || 80,
        effort: formatOptions.effort || 4,
        lossless: formatOptions.lossless || false,
        nearLossless: formatOptions.nearLossless || false,
        smartSubsample: formatOptions.smartSubsample !== false,
        ...formatOptions
      }
    }

    if (format === ImageFormat.AVIF) {
      return {
        quality: formatOptions.quality || 65,
        effort: formatOptions.effort || 4,
        lossless: formatOptions.lossless || false,
        ...formatOptions
      }
    }

    return formatOptions
  }

  async getImageInfo(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata()
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        density: metadata.density,
        space: metadata.space,
        channels: metadata.channels,
        hasProfile: metadata.hasProfile,
        hasAlpha: metadata.hasAlpha
      }
    } catch (error) {
      throw new Error(`Error obteniendo información de ${imagePath}: ${error.message}`)
    }
  }

  async createThumbnail(inputPath, outputPath, width, height = null, options = {}) {
    try {
      const resizeOptions = {
        width,
        height,
        fit: options.fit || 'cover',
        position: options.position || 'center',
        withoutEnlargement: options.withoutEnlargement !== false
      }

      await sharp(inputPath)
        .resize(resizeOptions)
        .jpeg({ quality: options.quality || 85 })
        .toFile(outputPath)

    } catch (error) {
      throw new Error(`Error creando thumbnail ${inputPath}: ${error.message}`)
    }
  }

  static getOptimalConcurrency() {
    const cpus = require('os').cpus().length
    return Math.max(1, Math.min(cpus - 1, 3))
  }
}