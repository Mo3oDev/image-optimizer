import sharp from 'sharp'
import { ImageFormat } from '../core/types.js'

export class SharpImageProcessor {
  constructor() {
    sharp.cache(false)
    sharp.simd(true)
    sharp.concurrency(1)
  }

  /**
   * Converts an image to the target format and writes to disk.
   * Supports optional resize, upscale, EXIF control.
   */
  async optimize(inputPath, outputPath, format, options) {
    try {
      const pipeline = await this._buildPipeline(inputPath, options)
      const formatOptions = this._buildFormatOptions(format, options)
      await this._applyFormat(pipeline, format, formatOptions).toFile(outputPath)
    } catch (error) {
      throw new Error(`Error processing ${inputPath} to ${format}: ${error.message}`)
    }
  }

  /**
   * Encodes to a Buffer instead of writing to disk.
   * Used by the binary-search target-size optimizer.
   */
  async optimizeToBuffer(inputPath, format, options) {
    try {
      const pipeline = await this._buildPipeline(inputPath, options)
      const formatOptions = this._buildFormatOptions(format, options)
      return this._applyFormat(pipeline, format, formatOptions).toBuffer()
    } catch (error) {
      throw new Error(`Error encoding ${inputPath} to ${format} buffer: ${error.message}`)
    }
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
      throw new Error(`Error getting info for ${imagePath}: ${error.message}`)
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Builds a Sharp pipeline with all geometric transforms applied.
   * Order: orient → upscale/resize → (format applied later)
   */
  async _buildPipeline(inputPath, options) {
    const pipeline = sharp(inputPath)

    // Auto-orient from EXIF before any resize
    if (options.autoOrient) {
      pipeline.rotate()
    }

    // Preserve EXIF/ICC metadata in output
    if (options.preserveExif) {
      pipeline.keepMetadata()
    }

    if (options.upscale && options.upscale > 1) {
      // AI-quality Lanczos3 upscaling — reads metadata to compute target dims
      const meta = await sharp(inputPath).metadata()
      pipeline.resize({
        width: Math.round(meta.width * options.upscale),
        height: Math.round(meta.height * options.upscale),
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: false
      })
    } else if (options.width) {
      pipeline.resize({
        width: options.width,
        fit: options.fit ?? 'inside',
        withoutEnlargement: true
      })
    }

    return pipeline
  }

  /**
   * Applies the output format to a pipeline and returns the result pipeline.
   * Does not execute — caller must chain .toFile() or .toBuffer().
   */
  _applyFormat(pipeline, format, formatOptions) {
    switch (format) {
      case ImageFormat.WEBP: return pipeline.webp(formatOptions)
      case ImageFormat.AVIF: return pipeline.avif(formatOptions)
      case ImageFormat.JXL:  return pipeline.jxl(formatOptions)
      default: throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Builds format-specific options from the shared options object.
   * Strips geometry keys so they don't leak into the Sharp format call.
   */
  _buildFormatOptions(format, options) {
    const opts = { ...options }

    // Remove geometry and pipeline control keys
    for (const key of ['width', 'height', 'fit', 'withoutEnlargement', 'resize',
                        'upscale', 'autoOrient', 'preserveExif', 'targetSize']) {
      delete opts[key]
    }

    if (format === ImageFormat.WEBP) {
      return {
        quality: opts.quality || 80,
        effort: opts.effort || 4,
        lossless: opts.lossless || false,
        nearLossless: opts.nearLossless || false,
        smartSubsample: opts.smartSubsample !== false,
        ...opts
      }
    }

    if (format === ImageFormat.AVIF) {
      return {
        quality: opts.quality || 50,
        effort: opts.effort || 4,
        lossless: opts.lossless || false,
        ...opts
      }
    }

    if (format === ImageFormat.JXL) {
      return {
        quality: opts.quality || 80,
        effort: opts.effort || 7,   // JXL effort: 3–9, higher = better compression
        lossless: opts.lossless || false,
        ...opts
      }
    }

    return opts
  }
}
