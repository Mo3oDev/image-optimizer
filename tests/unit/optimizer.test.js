import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ImageOptimizer } from '../../src/core/optimizer.js'

// ── Minimal mocks ─────────────────────────────────────────────────────────────

function makeLogger() {
  return { info: vi.fn(), warning: vi.fn(), progress: vi.fn(), error: vi.fn() }
}

function makeFileHandler(overrides = {}) {
  return {
    findImageFiles:     vi.fn().mockResolvedValue([]),
    getFileSize:        vi.fn().mockResolvedValue(1000),
    resolveOutputDir:   vi.fn().mockReturnValue('/out/webp'),
    ensureDirectory:    vi.fn().mockResolvedValue(undefined),
    createOutputFilePath: vi.fn().mockReturnValue('/out/webp/img.webp'),
    getFileName:        vi.fn().mockReturnValue('img.jpg'),
    writeBuffer:        vi.fn().mockResolvedValue(undefined),
    ...overrides
  }
}

function makeProcessor(overrides = {}) {
  return {
    optimize:         vi.fn().mockResolvedValue(undefined),
    optimizeToBuffer: vi.fn().mockResolvedValue(Buffer.alloc(100)),
    ...overrides
  }
}

// ── _buildSharpOptions ─────────────────────────────────────────────────────────

describe('ImageOptimizer._buildSharpOptions', () => {
  const optimizer = new ImageOptimizer(makeProcessor(), makeFileHandler(), makeLogger())

  it('webp default quality is 80', () => {
    const opts = optimizer._buildSharpOptions('webp', {})
    expect(opts.quality).toBe(80)
    expect(opts.effort).toBe(4)
  })

  it('avif default quality is 50', () => {
    const opts = optimizer._buildSharpOptions('avif', {})
    expect(opts.quality).toBe(50)
  })

  it('jxl default quality is 80 and effort is 7', () => {
    const opts = optimizer._buildSharpOptions('jxl', {})
    expect(opts.quality).toBe(80)
    expect(opts.effort).toBe(7)
  })

  it('respects explicit quality override for all formats', () => {
    expect(optimizer._buildSharpOptions('webp', { quality: 65 }).quality).toBe(65)
    expect(optimizer._buildSharpOptions('avif', { quality: 35 }).quality).toBe(35)
    expect(optimizer._buildSharpOptions('jxl',  { quality: 90 }).quality).toBe(90)
  })

  it('sets width/fit/withoutEnlargement when --width is given', () => {
    const opts = optimizer._buildSharpOptions('webp', { width: 1200 })
    expect(opts.width).toBe(1200)
    expect(opts.fit).toBe('inside')
    expect(opts.withoutEnlargement).toBe(true)
  })

  it('sets upscale when --upscale is given', () => {
    const opts = optimizer._buildSharpOptions('webp', { upscale: 2 })
    expect(opts.upscale).toBe(2)
    expect(opts.width).toBeUndefined()
  })

  it('does not add width when upscale is present (upscale takes priority)', () => {
    const opts = optimizer._buildSharpOptions('webp', { upscale: 3 })
    expect(opts.width).toBeUndefined()
  })

  it('passes autoOrient and preserveExif through', () => {
    const opts = optimizer._buildSharpOptions('webp', { autoOrient: true, preserveExif: true })
    expect(opts.autoOrient).toBe(true)
    expect(opts.preserveExif).toBe(true)
  })

  it('does not set autoOrient when falsy', () => {
    const opts = optimizer._buildSharpOptions('webp', { autoOrient: false })
    expect(opts.autoOrient).toBeUndefined()
  })
})

// ── _binarySearchQuality ──────────────────────────────────────────────────────

describe('ImageOptimizer._binarySearchQuality', () => {
  it('finds highest quality that fits within target bytes', async () => {
    // quality ≤ 60 → 100 bytes (fits target 150), quality > 60 → 200 bytes (too large)
    const processor = makeProcessor({
      optimizeToBuffer: vi.fn().mockImplementation((_, __, opts) =>
        Promise.resolve(Buffer.alloc(opts.quality <= 60 ? 100 : 200))
      )
    })
    const optimizer = new ImageOptimizer(processor, makeFileHandler(), makeLogger())

    const buf = await optimizer._binarySearchQuality('/img.jpg', 'webp', 150, {})
    expect(buf.length).toBeLessThanOrEqual(150)
    // quality=60 gives 100 bytes; quality=61 gives 200 bytes (too large)
    // binary search should converge to quality 60 → 100 bytes
    expect(buf.length).toBe(100)
  })

  it('returns quality-1 buffer when nothing fits the target', async () => {
    // every quality produces 1000 bytes — way over any target
    const processor = makeProcessor({
      optimizeToBuffer: vi.fn().mockResolvedValue(Buffer.alloc(1000))
    })
    const optimizer = new ImageOptimizer(processor, makeFileHandler(), makeLogger())

    const buf = await optimizer._binarySearchQuality('/img.jpg', 'webp', 10, {})
    expect(buf.length).toBe(1000)  // fallback, best effort
  })

  it('calls optimizeToBuffer multiple times (converges in ≤ 8 iterations)', async () => {
    const optimizeToBuffer = vi.fn().mockImplementation((_, __, opts) =>
      Promise.resolve(Buffer.alloc(opts.quality * 2))  // size proportional to quality
    )
    const optimizer = new ImageOptimizer(
      makeProcessor({ optimizeToBuffer }),
      makeFileHandler(),
      makeLogger()
    )

    await optimizer._binarySearchQuality('/img.jpg', 'webp', 100, {})
    // log2(100) ≈ 7 iterations for binary search
    expect(optimizeToBuffer.mock.calls.length).toBeLessThanOrEqual(8)
  })
})

// ── optimizeBatch error handling ──────────────────────────────────────────────

describe('ImageOptimizer.optimizeBatch', () => {
  it('throws when no image files are found', async () => {
    const optimizer = new ImageOptimizer(makeProcessor(), makeFileHandler(), makeLogger())
    await expect(
      optimizer.optimizeBatch('/empty', { formats: ['webp'] })
    ).rejects.toThrow('No image files')
  })

  it('continues processing when one file fails (Promise.allSettled)', async () => {
    const fileHandler = makeFileHandler({
      findImageFiles: vi.fn().mockResolvedValue(['/a.jpg', '/b.jpg'])
    })
    const processor = makeProcessor({
      // First call fails, second succeeds
      optimize: vi.fn()
        .mockRejectedValueOnce(new Error('corrupt file'))
        .mockResolvedValue(undefined)
    })
    const optimizer = new ImageOptimizer(processor, fileHandler, makeLogger(), 1)

    const results = await optimizer.optimizeBatch('/dir', { formats: ['webp'] })
    expect(results.errors.length).toBe(1)
    expect(results.webp.length).toBe(1)
  })
})
