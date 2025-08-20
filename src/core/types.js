export const ImageFormat = {
  WEBP: 'webp',
  AVIF: 'avif',
  JPEG: 'jpeg',
  PNG: 'png'
}

export class OptimizationResult {
  constructor(inputPath, outputPath, originalSize, optimizedSize, format, dimensions = null) {
    this.inputPath = inputPath
    this.outputPath = outputPath
    this.originalSize = originalSize
    this.optimizedSize = optimizedSize
    this.format = format
    this.dimensions = dimensions
    this.savings = originalSize - optimizedSize
    this.savingsPercentage = ((originalSize - optimizedSize) / originalSize) * 100
  }

  get variant() {
    return this.dimensions ? `${this.dimensions.width}x${this.dimensions.height}` : 'original'
  }
}

export class ImageVariant {
  constructor(width, height = null, suffix = '') {
    this.width = width
    this.height = height
    this.suffix = suffix || (height ? `${width}x${height}` : `${width}w`)
  }

  static fromWidth(width, suffix = '') {
    return new ImageVariant(width, null, suffix)
  }

  static fromDimensions(width, height, suffix = '') {
    return new ImageVariant(width, height, suffix)
  }
}

export class OptimizationProfile {
  constructor(name, webpOptions = {}, avifOptions = {}) {
    this.name = name
    this.webpOptions = this._normalizeOptions({
      quality: 80,
      effort: 4,
      lossless: false,
      ...webpOptions
    })
    this.avifOptions = this._normalizeOptions({
      quality: 65,
      effort: 4,
      lossless: false,
      ...avifOptions
    })
  }

  _normalizeOptions(options) {
    if (options.width && !Array.isArray(options.width)) {
      options.width = [options.width]
    }
    
    if (options.height && !Array.isArray(options.height)) {
      options.height = [options.height]
    }

    if (options.resize && !options.resize.fit) {
      options.resize.fit = 'inside'
    }
    
    if (options.resize && options.resize.withoutEnlargement === undefined) {
      options.resize.withoutEnlargement = true
    }

    return options
  }

  getVariants(format) {
    const options = format === ImageFormat.WEBP ? this.webpOptions : this.avifOptions
    const variants = []

    if (options.width && Array.isArray(options.width)) {
      options.width.forEach((width, index) => {
        const height = options.height && Array.isArray(options.height) 
          ? options.height[index] 
          : null
        variants.push(new ImageVariant(width, height))
      })
    } else {
      variants.push(new ImageVariant(null, null, 'original'))
    }

    return variants
  }

  getOptionsForVariant(format, variant) {
    const baseOptions = format === ImageFormat.WEBP ? { ...this.webpOptions } : { ...this.avifOptions }
    
    delete baseOptions.width
    delete baseOptions.height

    if (variant.width) {
      baseOptions.width = variant.width
    }
    if (variant.height) {
      baseOptions.height = variant.height
    }

    return baseOptions
  }
}