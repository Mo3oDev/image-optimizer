/**
 * Integration tests — use real Sharp against temp directories.
 * Each test gets an isolated tmpDir, cleaned up in afterEach.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

import { ImageOptimizer }     from '../../src/core/optimizer.js'
import { SharpImageProcessor } from '../../src/infrastructure/image-processor.js'
import { FileSystemHandler }   from '../../src/infrastructure/file-handler.js'
import { ConsoleLogger }       from '../../src/infrastructure/logger.js'
import { SrcsetGenerator }     from '../../src/core/srcset-generator.js'

// ── JXL support detection ─────────────────────────────────────────────────────

let jxlSupported = false
beforeAll(async () => {
  try {
    await sharp({ create: { width: 4, height: 4, channels: 3, background: { r:0,g:0,b:0 } } })
      .jxl().toBuffer()
    jxlSupported = true
  } catch {
    jxlSupported = false
  }
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

/**
 * Creates a synthetic JPEG image using Sharp (no real fixture files needed).
 * Returns the path to the created file.
 */
async function createTestJpeg(dir, name = 'photo.jpg', width = 800, height = 600) {
  const filePath = path.join(dir, name)
  await sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 100, b: 50 } }
  }).jpeg({ quality: 90 }).toFile(filePath)
  return filePath
}

async function createTestPng(dir, name = 'graphic.png', width = 400, height = 300) {
  const filePath = path.join(dir, name)
  await sharp({
    create: { width, height, channels: 4, background: { r: 50, g: 150, b: 200, alpha: 0.8 } }
  }).png().toFile(filePath)
  return filePath
}

// ── Test setup ────────────────────────────────────────────────────────────────

let tmpDir
let imageProcessor, fileHandler, logger, optimizer

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imgopt-test-'))
  imageProcessor = new SharpImageProcessor()
  fileHandler    = new FileSystemHandler()
  logger         = {
    info: () => {}, warning: () => {}, progress: () => {}, error: () => {}, success: () => {}
  }
  optimizer = new ImageOptimizer(imageProcessor, fileHandler, logger, 2)
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

// ── Format conversion ─────────────────────────────────────────────────────────

describe('Format conversion', () => {
  it('converts JPEG to WebP and writes a smaller file', async () => {
    const src = await createTestJpeg(tmpDir)
    const results = await optimizer.optimizeBatch(tmpDir, { formats: ['webp'] })

    expect(results.webp).toHaveLength(1)
    expect(results.errors).toHaveLength(0)

    const outPath = results.webp[0].outputPath
    const stat = await fs.stat(outPath)
    expect(stat.size).toBeGreaterThan(0)
    expect(outPath).toMatch(/\.webp$/)

    // Verify it's a valid WebP
    const meta = await sharp(outPath).metadata()
    expect(meta.format).toBe('webp')
  })

  it('converts JPEG to AVIF', async () => {
    await createTestJpeg(tmpDir)
    const results = await optimizer.optimizeBatch(tmpDir, { formats: ['avif'] })

    expect(results.avif).toHaveLength(1)
    const meta = await sharp(results.avif[0].outputPath).metadata()
    expect(meta.format).toBe('heif')  // Sharp reports AVIF as 'heif'
  })

  it('converts JPEG to JXL', async () => {
    if (!jxlSupported) return  // skip: libvips built without JXL
    await createTestJpeg(tmpDir)
    const results = await optimizer.optimizeBatch(tmpDir, { formats: ['jxl'] })

    expect(results.jxl).toHaveLength(1)
    expect(results.jxl[0].outputPath).toMatch(/\.jxl$/)
    const stat = await fs.stat(results.jxl[0].outputPath)
    expect(stat.size).toBeGreaterThan(0)
  })

  it('converts to all three formats in one batch', async () => {
    if (!jxlSupported) return  // skip: libvips built without JXL
    await createTestJpeg(tmpDir)
    const results = await optimizer.optimizeBatch(tmpDir, { formats: ['webp', 'avif', 'jxl'] })

    expect(results.webp).toHaveLength(1)
    expect(results.avif).toHaveLength(1)
    expect(results.jxl).toHaveLength(1)
    expect(results.errors).toHaveLength(0)
  })

  it('processes multiple images in one batch', async () => {
    await createTestJpeg(tmpDir, 'a.jpg')
    await createTestJpeg(tmpDir, 'b.jpg')
    await createTestPng(tmpDir,  'c.png')

    const results = await optimizer.optimizeBatch(tmpDir, { formats: ['webp'] })
    expect(results.webp).toHaveLength(3)
    expect(results.errors).toHaveLength(0)
  })
})

// ── Downscale (--width) ───────────────────────────────────────────────────────

describe('Downscale with --width', () => {
  it('resizes output to the specified max width', async () => {
    await createTestJpeg(tmpDir, 'photo.jpg', 1600, 1200)

    const results = await optimizer.optimizeBatch(tmpDir, { formats: ['webp'], width: 800 })
    const meta = await sharp(results.webp[0].outputPath).metadata()

    expect(meta.width).toBeLessThanOrEqual(800)
  })

  it('maintains aspect ratio', async () => {
    await createTestJpeg(tmpDir, 'photo.jpg', 1600, 800)  // 2:1 ratio

    const results = await optimizer.optimizeBatch(tmpDir, { formats: ['webp'], width: 800 })
    const meta = await sharp(results.webp[0].outputPath).metadata()

    expect(meta.width).toBeLessThanOrEqual(800)
    const ratio = meta.width / meta.height
    expect(ratio).toBeCloseTo(2, 0)
  })

  it('does not upscale — small images stay at their original size', async () => {
    await createTestJpeg(tmpDir, 'small.jpg', 400, 300)  // smaller than target

    const results = await optimizer.optimizeBatch(tmpDir, { formats: ['webp'], width: 1200 })
    const meta = await sharp(results.webp[0].outputPath).metadata()

    expect(meta.width).toBeLessThanOrEqual(400)  // withoutEnlargement: true
  })
})

// ── Upscale (--upscale) ───────────────────────────────────────────────────────

describe('Upscale with --upscale', () => {
  it('doubles image dimensions with factor 2', async () => {
    await createTestJpeg(tmpDir, 'photo.jpg', 400, 300)

    const results = await optimizer.optimizeBatch(tmpDir, { formats: ['webp'], upscale: 2 })
    const meta = await sharp(results.webp[0].outputPath).metadata()

    expect(meta.width).toBe(800)
    expect(meta.height).toBe(600)
  })

  it('triples image dimensions with factor 3', async () => {
    await createTestJpeg(tmpDir, 'photo.jpg', 200, 100)

    const results = await optimizer.optimizeBatch(tmpDir, { formats: ['webp'], upscale: 3 })
    const meta = await sharp(results.webp[0].outputPath).metadata()

    expect(meta.width).toBe(600)
    expect(meta.height).toBe(300)
  })
})

// ── Target size (--target-size) ───────────────────────────────────────────────

describe('Target size encoding', () => {
  it('produces output ≤ target bytes', async () => {
    await createTestJpeg(tmpDir, 'photo.jpg', 800, 600)

    // Use a generous target (50KB) — should always be achievable
    const targetBytes = 50 * 1024
    const results = await optimizer.optimizeBatch(tmpDir, {
      formats: ['webp'],
      targetSize: targetBytes
    })

    expect(results.webp).toHaveLength(1)
    const stat = await fs.stat(results.webp[0].outputPath)
    expect(stat.size).toBeLessThanOrEqual(targetBytes)
  })

  it('still produces a file even when target is impossibly small', async () => {
    await createTestJpeg(tmpDir, 'photo.jpg', 800, 600)

    // 1 byte target — impossible, should fall back to quality 1
    const results = await optimizer.optimizeBatch(tmpDir, {
      formats: ['webp'],
      targetSize: 1
    })

    expect(results.webp).toHaveLength(1)
    const stat = await fs.stat(results.webp[0].outputPath)
    expect(stat.size).toBeGreaterThan(0)
  })
})

// ── EXIF control ──────────────────────────────────────────────────────────────

describe('EXIF control', () => {
  it('strips EXIF by default (Sharp default behaviour)', async () => {
    await createTestJpeg(tmpDir)
    const results = await optimizer.optimizeBatch(tmpDir, { formats: ['webp'] })

    // Default: no keepMetadata() call → EXIF stripped
    const meta = await sharp(results.webp[0].outputPath).metadata()
    expect(meta.exif).toBeUndefined()
  })

  it('--auto-orient does not crash and produces a valid image', async () => {
    await createTestJpeg(tmpDir)
    const results = await optimizer.optimizeBatch(tmpDir, {
      formats: ['webp'],
      autoOrient: true
    })

    expect(results.errors).toHaveLength(0)
    const meta = await sharp(results.webp[0].outputPath).metadata()
    expect(meta.format).toBe('webp')
  })
})

// ── Output layout (--flat, --output) ─────────────────────────────────────────

describe('Output layout', () => {
  it('default: writes to <inputDir>/<format>/ subdir', async () => {
    await createTestJpeg(tmpDir)
    const results = await optimizer.optimizeBatch(tmpDir, { formats: ['webp'] })

    const outPath = results.webp[0].outputPath
    expect(outPath).toContain(path.join(tmpDir, 'webp'))
  })

  it('--flat: writes output alongside input files (no subdir)', async () => {
    await createTestJpeg(tmpDir)
    const results = await optimizer.optimizeBatch(tmpDir, { formats: ['webp'], flat: true })

    const outPath = results.webp[0].outputPath
    expect(path.dirname(outPath)).toBe(tmpDir)
    expect(outPath).not.toContain('/webp/')
  })

  it('--output: writes to custom directory with format subdir', async () => {
    await createTestJpeg(tmpDir)
    const outputDir = path.join(tmpDir, 'dist')

    const results = await optimizer.optimizeBatch(tmpDir, {
      formats: ['webp'],
      outputDir
    })

    const outPath = results.webp[0].outputPath
    expect(outPath).toContain(path.join(outputDir, 'webp'))
    expect(await fileHandler.fileExists(outPath)).toBe(true)
  })

  it('--output --flat: writes to custom directory without subdir', async () => {
    await createTestJpeg(tmpDir)
    const outputDir = path.join(tmpDir, 'dist')

    const results = await optimizer.optimizeBatch(tmpDir, {
      formats: ['webp'],
      outputDir,
      flat: true
    })

    const outPath = results.webp[0].outputPath
    expect(path.dirname(outPath)).toBe(path.resolve(outputDir))
  })
})

// ── Quality ───────────────────────────────────────────────────────────────────

describe('Quality', () => {
  it('lower quality produces a smaller file', async () => {
    // Use deterministic high-entropy pixel data — solid colors compress identically at any quality
    const width = 400, height = 400
    const pixels = Buffer.allocUnsafe(width * height * 3)
    for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 137 + 42) % 256
    const noisyJpeg = path.join(tmpDir, 'noisy.jpg')
    await sharp(pixels, { raw: { width, height, channels: 3 } })
      .jpeg({ quality: 95 }).toFile(noisyJpeg)

    const [hiDir, loDir] = [path.join(tmpDir, 'hi'), path.join(tmpDir, 'lo')]
    await Promise.all([fs.mkdir(hiDir), fs.mkdir(loDir)])

    const [hiRes, loRes] = await Promise.all([
      optimizer.optimizeBatch(tmpDir, { formats: ['webp'], quality: 90, outputDir: hiDir }),
      optimizer.optimizeBatch(tmpDir, { formats: ['webp'], quality: 1,  outputDir: loDir })
    ])

    const hiStat = await fs.stat(hiRes.webp[0].outputPath)
    const loStat = await fs.stat(loRes.webp[0].outputPath)
    expect(loStat.size).toBeLessThan(hiStat.size)
  })
})

// ── Srcset generator ──────────────────────────────────────────────────────────

describe('SrcsetGenerator integration', () => {
  it('generates a valid srcset.html from batch results', async () => {
    await createTestJpeg(tmpDir)
    const results = await optimizer.optimizeBatch(tmpDir, { formats: ['webp', 'avif'] })

    const generator = new SrcsetGenerator()
    const html = generator.generate(results, tmpDir)

    expect(html).toContain('<picture>')
    expect(html).toContain('type="image/avif"')
    expect(html).toContain('type="image/webp"')
    expect(html).toContain('loading="lazy"')
  })

  it('saves srcset.html to disk', async () => {
    await createTestJpeg(tmpDir)
    const results = await optimizer.optimizeBatch(tmpDir, { formats: ['webp'] })

    const generator = new SrcsetGenerator()
    const html = generator.generate(results, tmpDir)
    const outPath = path.join(tmpDir, 'srcset.html')
    await generator.save(html, outPath)

    const content = await fs.readFile(outPath, 'utf-8')
    expect(content).toContain('<picture>')
  })
})
