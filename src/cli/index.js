#!/usr/bin/env node

import path from 'path'
import { Command } from 'commander'
import { ImageOptimizer } from '../core/optimizer.js'
import { VideoOptimizer } from '../core/video-optimizer.js'
import { SrcsetGenerator } from '../core/srcset-generator.js'
import { VideoOptimizationProfile } from '../core/video-types.js'
import { FileSystemHandler } from '../infrastructure/file-handler.js'
import { ConsoleLogger } from '../infrastructure/logger.js'
import { SharpImageProcessor } from '../infrastructure/image-processor.js'
import { FFmpegVideoProcessor } from '../infrastructure/video-processor.js'
import { ConfigLoader } from '../infrastructure/config-loader.js'
import { parseTargetSize } from '../utils/parse-size.js'

const program = new Command()

program
  .name('image-optimizer')
  .description('Image and video format converter with quality optimization')
  .version('1.0.0')

program
  .argument('<directory>', 'Directory with files to optimize')

  // ── Format & quality ──────────────────────────────────────────────────────
  .option('-f, --format <formats>',     'Output format(s): webp, avif, jxl, or comma-separated (default: webp,avif)')
  .option('-q, --quality <number>',     'Quality 1-100 (per-format defaults: webp=80, avif=50, jxl=80)')

  // ── Geometry ─────────────────────────────────────────────────────────────
  .option('-w, --width <pixels>',       'Max width in pixels, maintains aspect ratio (downscale only)')
  .option('--upscale <factor>',         'Scale up by factor using Lanczos3 (e.g. 2, 3, 4). Cannot be combined with --width')

  // ── EXIF ─────────────────────────────────────────────────────────────────
  .option('--preserve-exif',            'Keep EXIF/ICC metadata in output files')
  .option('--auto-orient',              'Auto-rotate image based on EXIF orientation before converting')

  // ── Target size ───────────────────────────────────────────────────────────
  .option('--target-size <size>',       'Target output file size per format (e.g. 150kb, 1.5mb). Overrides --quality')

  // ── Output layout ─────────────────────────────────────────────────────────
  .option('-o, --output <dir>',         'Custom output directory (default: subdirs inside input directory)')
  .option('--flat',                     'Output files alongside originals without format subdirectories')

  // ── Video ─────────────────────────────────────────────────────────────────
  .option('--video',                    'Enable video processing (requires FFmpeg)')
  .option('--codec <name>',             'Video codec: h264, vp9, av1 (default: vp9)')

  // ── Workflow ──────────────────────────────────────────────────────────────
  .option('--watch',                    'Keep running and process new files as they appear')
  .option('--srcset',                   'Generate srcset.html with <picture> tags after processing')

  // ── General ───────────────────────────────────────────────────────────────
  .option('-c, --concurrency <number>', 'Concurrent tasks 1-10 (default: 3)')
  .option('-v, --verbose',              'Show detailed output and errors')
  .option('--dry-run',                  'Preview what would be processed without writing files')
  .option('--config <path>',            'Path to JSON config file')

  .action(async (directory, options) => {
    const logger = new ConsoleLogger()
    const fileHandler = new FileSystemHandler()
    const configLoader = new ConfigLoader()

    try {
      // ── Config ─────────────────────────────────────────────────────────
      const config = options.config
        ? await configLoader.loadConfig(options.config)
        : await configLoader.findAndLoadConfig(directory)

      configLoader.validateConfig(config)

      // ── Formats ────────────────────────────────────────────────────────
      const rawFormats = options.format ?? 'webp,avif'
      const formats = rawFormats.split(',').map(f => f.trim().toLowerCase())
      const validFormats = ['webp', 'avif', 'jxl']
      const invalidFormats = formats.filter(f => !validFormats.includes(f))
      if (invalidFormats.length) {
        throw new Error(`Invalid format(s): ${invalidFormats.join(', ')}. Valid: webp, avif, jxl`)
      }

      // ── Quality ────────────────────────────────────────────────────────
      const quality = options.quality ? parseInt(options.quality) : undefined
      if (quality !== undefined && (isNaN(quality) || quality < 1 || quality > 100)) {
        throw new Error('--quality must be between 1 and 100')
      }

      // ── Geometry ───────────────────────────────────────────────────────
      const width = options.width ? parseInt(options.width) : undefined
      if (width !== undefined && (isNaN(width) || width <= 0)) {
        throw new Error('--width must be a positive integer')
      }

      const upscale = options.upscale ? parseFloat(options.upscale) : undefined
      if (upscale !== undefined && (isNaN(upscale) || upscale <= 1)) {
        throw new Error('--upscale must be a number greater than 1 (e.g. 2)')
      }
      if (width && upscale) {
        throw new Error('--width and --upscale cannot be used together')
      }

      // ── Target size ────────────────────────────────────────────────────
      const targetSize = options.targetSize ? parseTargetSize(options.targetSize) : undefined

      // ── Concurrency ────────────────────────────────────────────────────
      const concurrency = Math.max(1, Math.min(10, parseInt(options.concurrency ?? '3')))

      // ── Verbose summary ────────────────────────────────────────────────
      if (options.verbose) {
        logger.info(`Directory:   ${directory}`)
        logger.info(`Formats:     ${formats.join(', ')}`)
        if (width)      logger.info(`Max width:   ${width}px`)
        if (upscale)    logger.info(`Upscale:     ${upscale}x (Lanczos3)`)
        if (quality)    logger.info(`Quality:     ${quality}`)
        if (targetSize) logger.info(`Target size: ${options.targetSize}`)
        if (options.flat)          logger.info('Output:      flat (no subdirs)')
        if (options.output)        logger.info(`Output dir:  ${options.output}`)
        if (options.preserveExif)  logger.info('EXIF:        preserved')
        if (options.autoOrient)    logger.info('Auto-orient: enabled')
        logger.info(`Concurrency: ${concurrency}`)
        logger.info(`Video:       ${options.video ? 'enabled' : 'disabled'}`)
      }

      // ── Dry-run ────────────────────────────────────────────────────────
      if (options.dryRun) {
        const imageFiles = await fileHandler.findImageFiles(directory)
        logger.info(`Dry-run: ${imageFiles.length} image(s) → ${imageFiles.length * formats.length} output(s)`)
        if (options.video) {
          const videoFiles = await fileHandler.findVideoFiles(directory)
          logger.info(`Dry-run: ${videoFiles.length} video(s) found`)
        }
        return
      }

      logger.info('Starting optimization')

      // ── Shared image options ───────────────────────────────────────────
      const imageOptions = {
        formats,
        quality,
        width,
        upscale,
        targetSize,
        autoOrient:   options.autoOrient   || false,
        preserveExif: options.preserveExif || false,
        outputDir:    options.output,
        flat:         options.flat         || false
      }

      const imageProcessor = new SharpImageProcessor()

      // ── Image batch processing ─────────────────────────────────────────
      let imageResults = null

      const imageFiles = await fileHandler.findImageFiles(directory)
      if (imageFiles.length > 0) {
        const optimizer = new ImageOptimizer(imageProcessor, fileHandler, logger, concurrency)
        imageResults = await optimizer.optimizeBatch(directory, imageOptions)
      } else {
        logger.warning('No image files found in directory')
      }

      // ── Video processing ───────────────────────────────────────────────
      let videoResults = null
      if (options.video) {
        logger.info('Starting video processing')
        const videoProcessor = new FFmpegVideoProcessor()
        const ffmpegAvailable = await videoProcessor.validateFFmpeg()

        if (!ffmpegAvailable) {
          logger.warning('FFmpeg not found. Install it to enable video: https://ffmpeg.org/')
        } else {
          const videoProfile = new VideoOptimizationProfile('cli', {
            ...config.video,
            codec: options.codec ?? config.video.codec ?? 'vp9'
          })
          const videoOptimizer = new VideoOptimizer(
            videoProcessor,
            fileHandler,
            logger,
            Math.max(1, Math.min(4, Math.floor(concurrency / 2)))
          )
          videoResults = await videoOptimizer.optimizeBatch(directory, videoProfile)
        }
      }

      // ── Results output ─────────────────────────────────────────────────
      logger.success('Optimization complete')

      if (imageResults) {
        options.verbose
          ? logger.printDetailedSummary(imageResults, fileHandler, true)
          : logger.printSummary(imageResults, fileHandler)
      }

      if (videoResults?.videos.length > 0) {
        logger.printVideoSummary(videoResults, fileHandler)
      }

      // ── Srcset generation ──────────────────────────────────────────────
      if (options.srcset && imageResults) {
        const generator = new SrcsetGenerator()
        const html = generator.generate(imageResults, directory)
        const outputFile = path.join(options.output ?? directory, 'srcset.html')
        await generator.save(html, outputFile)
        logger.success(`Srcset file written: ${outputFile}`)
      }

      // ── Watch mode ─────────────────────────────────────────────────────
      if (options.watch) {
        const { default: chokidar } = await import('chokidar')
        const optimizer = new ImageOptimizer(imageProcessor, fileHandler, logger, concurrency)

        // Compute paths to ignore (output dirs)
        const outputBase = options.output ? path.resolve(options.output) : path.resolve(directory)
        const ignoredPaths = options.flat
          ? []
          : validFormats.map(f => path.join(outputBase, f))

        const watcher = chokidar.watch(directory, {
          ignored: (filePath) => {
            if (/(^|[/\\])\.[^./]/.test(filePath)) return true  // hidden files
            return ignoredPaths.some(dir => filePath.startsWith(dir))
          },
          ignoreInitial: true,  // already processed above
          awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 }
        })

        watcher.on('add', async (filePath) => {
          if (!/\.(jpg|jpeg|png)$/i.test(filePath)) return
          logger.info(`New file detected: ${path.basename(filePath)}`)
          try {
            const inputDir = path.dirname(filePath)
            for (const format of formats) {
              await optimizer.optimizeFile(filePath, inputDir, format, imageOptions)
            }

            if (options.srcset && imageResults) {
              // Rebuild srcset after each new file
              const allResults = await collectCurrentResults(directory, formats, fileHandler)
              const generator = new SrcsetGenerator()
              const html = generator.generate(allResults, directory)
              const outputFile = path.join(options.output ?? directory, 'srcset.html')
              await generator.save(html, outputFile)
            }
          } catch (err) {
            logger.error(`Failed to process ${path.basename(filePath)}: ${err.message}`)
            if (options.verbose) console.error(err)
          }
        })

        logger.info('Watching for new files... Press Ctrl+C to stop')
      }

    } catch (error) {
      logger.error(`Error: ${error.message}`)
      if (options.verbose) console.error(error)
      process.exit(1)
    }
  })

program
  .command('init-config')
  .description('Generate an example configuration file')
  .option('-o, --output <path>', 'Output path', './image-optimizer.json')
  .action(async (options) => {
    const logger = new ConsoleLogger()
    const configLoader = new ConfigLoader()
    const { promises: fs } = await import('fs')
    try {
      const defaultConfig = configLoader.getDefaults()
      await fs.writeFile(options.output, JSON.stringify(defaultConfig, null, 2), 'utf-8')
      logger.success(`Config file created: ${options.output}`)
      logger.info('Edit the file to customize optimization settings')
    } catch (error) {
      logger.error(`Error creating config: ${error.message}`)
      process.exit(1)
    }
  })

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Scans output directories to rebuild a results object for srcset regeneration.
 */
async function collectCurrentResults(directory, formats, fileHandler) {
  const results = Object.fromEntries(formats.map(f => [f, []]))
  results.errors = []

  const imageFiles = await fileHandler.findImageFiles(directory)
  for (const format of formats) {
    const outputDir = fileHandler.resolveOutputDir(directory, format, {})
    for (const inputPath of imageFiles) {
      const outputPath = fileHandler.createOutputFilePath(inputPath, outputDir, format)
      if (await fileHandler.fileExists(outputPath)) {
        const originalSize = await fileHandler.getFileSize(inputPath)
        const optimizedSize = await fileHandler.getFileSize(outputPath)
        results[format].push({ inputPath, outputPath, originalSize, optimizedSize, format })
      }
    }
  }

  return results
}

program.parse()
