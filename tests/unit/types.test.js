import { describe, it, expect } from 'vitest'
import { ImageFormat, OptimizationResult } from '../../src/core/types.js'

describe('ImageFormat', () => {
  it('defines webp, avif, jxl, jpeg, png values', () => {
    expect(ImageFormat.WEBP).toBe('webp')
    expect(ImageFormat.AVIF).toBe('avif')
    expect(ImageFormat.JXL).toBe('jxl')
    expect(ImageFormat.JPEG).toBe('jpeg')
    expect(ImageFormat.PNG).toBe('png')
  })
})

describe('OptimizationResult', () => {
  it('computes savings and savingsPercentage correctly', () => {
    const r = new OptimizationResult('/in/img.jpg', '/out/img.webp', 1000, 600, 'webp')
    expect(r.savings).toBe(400)
    expect(r.savingsPercentage).toBeCloseTo(40)
  })

  it('stores all constructor properties', () => {
    const r = new OptimizationResult('/a', '/b', 2000, 1500, 'avif')
    expect(r.inputPath).toBe('/a')
    expect(r.outputPath).toBe('/b')
    expect(r.originalSize).toBe(2000)
    expect(r.optimizedSize).toBe(1500)
    expect(r.format).toBe('avif')
  })

  it('handles zero originalSize without NaN (division guard)', () => {
    const r = new OptimizationResult('/a', '/b', 0, 0, 'webp')
    expect(r.savings).toBe(0)
    expect(r.savingsPercentage).toBe(0)
    expect(Number.isNaN(r.savingsPercentage)).toBe(false)
  })

  it('allows savings to be negative (output larger than input)', () => {
    const r = new OptimizationResult('/a', '/b', 500, 800, 'avif')
    expect(r.savings).toBe(-300)
    expect(r.savingsPercentage).toBeCloseTo(-60)
  })

  it('computes 100% savings when optimizedSize is 0', () => {
    const r = new OptimizationResult('/a', '/b', 1000, 0, 'webp')
    expect(r.savingsPercentage).toBeCloseTo(100)
  })
})
