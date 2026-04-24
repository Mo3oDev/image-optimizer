import { VideoOptimizationResult } from './video-types.js'
import pLimit from 'p-limit'

export class VideoOptimizer {
  constructor(videoProcessor, fileHandler, logger, concurrency = 2) {
    this.videoProcessor = videoProcessor
    this.fileHandler = fileHandler
    this.logger = logger
    this.concurrency = concurrency
    this.limit = pLimit(concurrency)
  }

  async optimizeBatch(inputDirectory, profile) {
    this.logger.info(`Iniciando optimización de videos en: ${inputDirectory}`)

    const videoFiles = await this.fileHandler.findVideoFiles(inputDirectory)

    if (videoFiles.length === 0) {
      this.logger.warning('No se encontraron archivos de video en el directorio especificado')
      return { videos: [], errors: [] }
    }

    this.logger.info(`Encontrados ${videoFiles.length} archivos de video`)

    const results = {
      videos: [],
      errors: []
    }

    const tasks = videoFiles.map(filePath =>
      this.limit(() => this.optimizeVideo(filePath, inputDirectory, profile))
    )

    const allResults = await Promise.allSettled(tasks)

    allResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.videos.push(result.value)
      } else {
        results.errors.push({
          file: videoFiles[index],
          error: result.reason.message || result.reason
        })
        this.logger.warning(`Error procesando video ${index}: ${result.reason.message}`)
      }
    })

    if (results.errors.length > 0) {
      this.logger.warning(
        `Se completaron ${allResults.length - results.errors.length}/${allResults.length} videos exitosamente`
      )
    }

    return results
  }

  async optimizeVideo(inputPath, baseDirectory, profile) {
    const fileName = this.fileHandler.getFileName(inputPath)
    this.logger.progress(`Procesando video: ${fileName}`)

    try {
      // Get original video info
      const videoInfo = await this.videoProcessor.getVideoInfo(inputPath)
      const originalSize = await this.fileHandler.getFileSize(inputPath)

      // Create output directory
      const codecOptions = profile.getCodecOptions()
      const outputDirectory = this.fileHandler.createOutputPath(
        baseDirectory,
        codecOptions.format
      )
      await this.fileHandler.ensureDirectory(outputDirectory)

      // Create output path
      const outputPath = this.fileHandler.changeExtension(
        this.fileHandler.moveToDirectory(inputPath, outputDirectory),
        codecOptions.format
      )

      // Optimize video
      await this.videoProcessor.optimize(inputPath, outputPath, profile.options)

      // Get optimized size
      const optimizedSize = await this.fileHandler.getFileSize(outputPath)

      return new VideoOptimizationResult(
        inputPath,
        outputPath,
        originalSize,
        optimizedSize,
        profile.options.codec,
        {
          originalInfo: videoInfo,
          targetHeight: profile.options.maxHeight,
          targetFps: profile.options.fps
        }
      )
    } catch (error) {
      throw new Error(`Error procesando ${fileName}: ${error.message}`)
    }
  }
}
