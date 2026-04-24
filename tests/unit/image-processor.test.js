import { describe, it, expect } from 'vitest'
import { SharpImageProcessor } from '../../src/infrastructure/image-processor.js'
import { ImageFormat } from '../../src/core/types.js'

const processor = new SharpImageProcessor()

describe('SharpImageProcessor._buildFormatOptions', () => {
  describe('WebP', () => {
    it('uses correct defaults', () => {
      const opts = processor._buildFormatOptions(ImageFormat.WEBP, {})
      expect(opts.quality).toBe(80)
      expect(opts.effort).toBe(4)
      expect(opts.lossless).toBe(false)
      expect(opts.nearLossless).toBe(false)
      expect(opts.smartSubsample).toBe(true)
    })

    it('respects quality override', () => {
      const opts = processor._buildFormatOptions(ImageFormat.WEBP, { quality: 65 })
      expect(opts.quality).toBe(65)
    })
  })

  describe('AVIF', () => {
    it('uses correct defaults (quality 50)', () => {
      const opts = processor._buildFormatOptions(ImageFormat.AVIF, {})
      expect(opts.quality).toBe(50)
      expect(opts.effort).toBe(4)
      expect(opts.lossless).toBe(false)
    })

    it('respects quality override', () => {
      const opts = processor._buildFormatOptions(ImageFormat.AVIF, { quality: 35 })
      expect(opts.quality).toBe(35)
    })
  })

  describe('JXL', () => {
    it('uses correct defaults (quality 80, effort 7)', () => {
      const opts = processor._buildFormatOptions(ImageFormat.JXL, {})
      expect(opts.quality).toBe(80)
      expect(opts.effort).toBe(7)
      expect(opts.lossless).toBe(false)
    })

    it('respects quality and effort overrides', () => {
      const opts = processor._buildFormatOptions(ImageFormat.JXL, { quality: 90, effort: 9 })
      expect(opts.quality).toBe(90)
      expect(opts.effort).toBe(9)
    })
  })

  describe('Geometry key stripping', () => {
    it('removes width, height, fit, withoutEnlargement, resize, upscale, autoOrient, preserveExif, targetSize', () => {
      const stripped = processor._buildFormatOptions(ImageFormat.WEBP, {
        quality: 80,
        width: 1200,
        height: 800,
        fit: 'inside',
        withoutEnlargement: true,
        resize: {},
        upscale: 2,
        autoOrient: true,
        preserveExif: true,
        targetSize: 150000
      })
      expect(stripped.width).toBeUndefined()
      expect(stripped.height).toBeUndefined()
      expect(stripped.fit).toBeUndefined()
      expect(stripped.withoutEnlargement).toBeUndefined()
      expect(stripped.resize).toBeUndefined()
      expect(stripped.upscale).toBeUndefined()
      expect(stripped.autoOrient).toBeUndefined()
      expect(stripped.preserveExif).toBeUndefined()
      expect(stripped.targetSize).toBeUndefined()
    })

    it('preserves format-relevant options after stripping', () => {
      const opts = processor._buildFormatOptions(ImageFormat.WEBP, {
        quality: 75,
        width: 800,       // should be stripped
        lossless: true    // should be kept
      })
      expect(opts.quality).toBe(75)
      expect(opts.lossless).toBe(true)
      expect(opts.width).toBeUndefined()
    })
  })
})
