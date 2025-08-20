import { ImageFormat, OptimizationResult } from './types.js'
import pLimit from 'p-limit'

export class ImageOptimizer {
  constructor(imageProcessor, fileHandler, logger, concurrency = 3) {
    this.imageProcessor = imageProcessor
    this.fileHandler = fileHandler
    this.logger = logger
    this.concurrency = concurrency
    this.limit = pLimit(concurrency)
  }

  async optimizeBatch(inputDirectory, profile) {
    this.logger.info(`Iniciando optimización en: ${inputDirectory}`)
    
    const imageFiles = await this.fileHandler.findImageFiles(inputDirectory)
    
    if (imageFiles.length === 0) {
      throw new Error('No se encontraron archivos de imagen (.jpg, .jpeg, .png) en el directorio especificado')
    }

    this.logger.info(`Encontrados ${imageFiles.length} archivos de imagen`)

    const webpVariants = profile.getVariants(ImageFormat.WEBP)
    const avifVariants = profile.getVariants(ImageFormat.AVIF)
    
    const totalVariants = imageFiles.length * (webpVariants.length + avifVariants.length)
    this.logger.info(`Generando ${totalVariants} variantes totales`)

    const results = {
      webp: [],
      avif: [],
      errors: []
    }

    const tasks = []

    for (const filePath of imageFiles) {
      for (const variant of webpVariants) {
        tasks.push(
          this.limit(() => this.optimizeToVariant(
            filePath, 
            inputDirectory, 
            ImageFormat.WEBP, 
            variant,
            profile
          ))
        )
      }

      for (const variant of avifVariants) {
        tasks.push(
          this.limit(() => this.optimizeToVariant(
            filePath, 
            inputDirectory, 
            ImageFormat.AVIF, 
            variant,
            profile
          ))
        )
      }
    }

    const allResults = await Promise.allSettled(tasks)
    
    allResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const optimizationResult = result.value
        if (optimizationResult.format === ImageFormat.WEBP) {
          results.webp.push(optimizationResult)
        } else {
          results.avif.push(optimizationResult)
        }
      } else {
        results.errors.push({
          taskIndex: index,
          error: result.reason.message || result.reason
        })
        this.logger.warning(`Error en tarea ${index}: ${result.reason.message}`)
      }
    })

    if (results.errors.length > 0) {
      this.logger.warning(`Se completaron ${allResults.length - results.errors.length}/${allResults.length} tareas exitosamente`)
    }

    return results
  }

  async optimizeToVariant(inputPath, baseDirectory, format, variant, profile) {
    const fileName = this.fileHandler.getFileName(inputPath)
    const variantSuffix = variant.suffix === 'original' ? '' : `_${variant.suffix}`
    
    this.logger.progress(`Procesando: ${fileName} → ${format.toUpperCase()}${variantSuffix}`)
    
    try {
      const originalSize = await this.fileHandler.getFileSize(inputPath)
      
      const outputDirectory = this.fileHandler.createOutputPath(baseDirectory, format)
      await this.fileHandler.ensureDirectory(outputDirectory)
      
      const outputPath = this.fileHandler.createVariantPath(
        inputPath, 
        outputDirectory, 
        format, 
        variant
      )

      const options = profile.getOptionsForVariant(format, variant)
      await this.imageProcessor.optimizeWithVariant(inputPath, outputPath, format, variant, options)
      
      const optimizedSize = await this.fileHandler.getFileSize(outputPath)
      const dimensions = variant.width || variant.height 
        ? { width: variant.width, height: variant.height }
        : null

      return new OptimizationResult(
        inputPath,
        outputPath,
        originalSize,
        optimizedSize,
        format,
        dimensions
      )

    } catch (error) {
      throw new Error(`Error procesando ${fileName} → ${format} (${variant.suffix}): ${error.message}`)
    }
  }

  async optimizeToFormat(inputPath, baseDirectory, format, options) {
    const originalSize = await this.fileHandler.getFileSize(inputPath)
    
    const outputDirectory = this.fileHandler.createOutputPath(baseDirectory, format)
    await this.fileHandler.ensureDirectory(outputDirectory)
    
    const outputPath = this.fileHandler.changeExtension(
      this.fileHandler.moveToDirectory(inputPath, outputDirectory), 
      format
    )

    await this.imageProcessor.optimize(inputPath, outputPath, format, options)
    
    const optimizedSize = await this.fileHandler.getFileSize(outputPath)
    
    return new OptimizationResult(
      inputPath,
      outputPath,
      originalSize,
      optimizedSize,
      format
    )
  }
}