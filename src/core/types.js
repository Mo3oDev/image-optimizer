export const ImageFormat = {
  WEBP: 'webp',
  AVIF: 'avif',
  JXL: 'jxl',
  JPEG: 'jpeg',
  PNG: 'png'
}

export class OptimizationResult {
  constructor(inputPath, outputPath, originalSize, optimizedSize, format) {
    this.inputPath = inputPath
    this.outputPath = outputPath
    this.originalSize = originalSize
    this.optimizedSize = optimizedSize
    this.format = format
    this.savings = originalSize - optimizedSize
    this.savingsPercentage = originalSize > 0
      ? ((originalSize - optimizedSize) / originalSize) * 100
      : 0
  }
}
