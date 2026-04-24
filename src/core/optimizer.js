import { OptimizationResult } from './types.js'
import pLimit from 'p-limit'

export class ImageOptimizer {
  constructor(imageProcessor, fileHandler, logger, concurrency = 3) {
    this.imageProcessor = imageProcessor
    this.fileHandler = fileHandler
    this.logger = logger
    this.concurrency = concurrency
    this.limit = pLimit(concurrency)
  }

  /**
   * Processes all images in a directory.
   * @param {string} inputDirectory
   * @param {Object} options - { formats, width?, quality?, upscale?, targetSize?,
   *                             autoOrient?, preserveExif?, outputDir?, flat? }
   */
  async optimizeBatch(inputDirectory, options) {
    this.logger.info(`Starting optimization in: ${inputDirectory}`)

    const imageFiles = await this.fileHandler.findImageFiles(inputDirectory)

    if (imageFiles.length === 0) {
      throw new Error('No image files (.jpg, .jpeg, .png) found in the specified directory')
    }

    const { formats } = options
    this.logger.info(`Found ${imageFiles.length} image(s), generating ${imageFiles.length * formats.length} output(s)`)

    const results = Object.fromEntries(formats.map(f => [f, []]))
    results.errors = []

    const tasks = []
    for (const filePath of imageFiles) {
      for (const format of formats) {
        tasks.push(
          this.limit(() => this.optimizeFile(filePath, inputDirectory, format, options))
        )
      }
    }

    const allResults = await Promise.allSettled(tasks)

    allResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const r = result.value
        results[r.format].push(r)
      } else {
        results.errors.push({ taskIndex: index, error: result.reason.message || result.reason })
        this.logger.warning(`Task error: ${result.reason.message}`)
      }
    })

    if (results.errors.length > 0) {
      this.logger.warning(
        `Completed ${allResults.length - results.errors.length}/${allResults.length} tasks successfully`
      )
    }

    return results
  }

  /**
   * Converts a single image to a single format.
   */
  async optimizeFile(inputPath, baseDirectory, format, options) {
    const fileName = this.fileHandler.getFileName(inputPath)
    this.logger.progress(`Processing: ${fileName} → ${format.toUpperCase()}`)

    try {
      const originalSize = await this.fileHandler.getFileSize(inputPath)

      const outputDir = this.fileHandler.resolveOutputDir(baseDirectory, format, options)
      await this.fileHandler.ensureDirectory(outputDir)
      const outputPath = this.fileHandler.createOutputFilePath(inputPath, outputDir, format)

      const sharpOptions = this._buildSharpOptions(format, options)

      if (options.targetSize) {
        const buffer = await this._binarySearchQuality(inputPath, format, options.targetSize, sharpOptions)
        await this.fileHandler.writeBuffer(outputPath, buffer)
      } else {
        await this.imageProcessor.optimize(inputPath, outputPath, format, sharpOptions)
      }

      const optimizedSize = await this.fileHandler.getFileSize(outputPath)
      return new OptimizationResult(inputPath, outputPath, originalSize, optimizedSize, format)
    } catch (error) {
      throw new Error(`Error processing ${fileName} → ${format}: ${error.message}`)
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  _buildSharpOptions(format, options) {
    const sharpOptions = {
      quality: options.quality ?? (format === 'webp' ? 80 : format === 'jxl' ? 80 : 50),
      effort: format === 'jxl' ? 7 : 4
    }

    if (options.upscale && options.upscale > 1) {
      sharpOptions.upscale = options.upscale
    } else if (options.width) {
      sharpOptions.width = options.width
      sharpOptions.fit = 'inside'
      sharpOptions.withoutEnlargement = true
    }

    if (options.autoOrient)   sharpOptions.autoOrient = true
    if (options.preserveExif) sharpOptions.preserveExif = true

    return sharpOptions
  }

  /**
   * Binary-searches quality (1–100) to produce output ≤ targetBytes.
   * Encodes to Buffer in each iteration to avoid partial files on disk.
   */
  async _binarySearchQuality(inputPath, format, targetBytes, baseOptions) {
    let low = 1
    let high = 100
    let bestBuffer = null

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const buf = await this.imageProcessor.optimizeToBuffer(
        inputPath, format, { ...baseOptions, quality: mid }
      )

      if (buf.length <= targetBytes) {
        bestBuffer = buf
        low = mid + 1  // fits — try higher quality
      } else {
        high = mid - 1 // too large — reduce quality
      }
    }

    // If even quality 1 exceeded the target, return it anyway
    return bestBuffer ?? await this.imageProcessor.optimizeToBuffer(
      inputPath, format, { ...baseOptions, quality: 1 }
    )
  }
}
