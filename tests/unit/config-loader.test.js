import { describe, it, expect } from 'vitest'
import { ConfigLoader } from '../../src/infrastructure/config-loader.js'

describe('ConfigLoader.getDefaults', () => {
  const loader = new ConfigLoader()

  it('returns the correct image defaults', () => {
    const d = loader.getDefaults()
    expect(d.image.concurrency).toBe(3)
    expect(d.image.formats).toEqual(['webp', 'avif'])
    expect(d.image.webpQuality).toBe(80)
    expect(d.image.avifQuality).toBe(50)
    expect(d.image.effort).toBe(4)
  })

  it('returns the correct video defaults', () => {
    const d = loader.getDefaults()
    expect(d.video.maxHeight).toBe(720)
    expect(d.video.fps).toBe(24)
    expect(d.video.codec).toBe('vp9')
    expect(d.video.removeAudio).toBe(true)
    expect(d.video.preset).toBe('medium')
  })

  it('returns a deep copy — mutations do not affect the original', () => {
    const a = loader.getDefaults()
    const b = loader.getDefaults()
    a.image.formats.push('jxl')
    expect(b.image.formats).toEqual(['webp', 'avif'])
  })
})

describe('ConfigLoader.validateConfig', () => {
  const loader = new ConfigLoader()

  it('passes a fully valid config', () => {
    expect(() => loader.validateConfig({
      video: { maxHeight: 720, fps: 30, codec: 'vp9' },
      image: { concurrency: 4, formats: ['webp', 'avif'] }
    })).not.toThrow()
  })

  it('passes an empty config object', () => {
    expect(() => loader.validateConfig({})).not.toThrow()
  })

  it('throws on invalid video.maxHeight', () => {
    expect(() => loader.validateConfig({ video: { maxHeight: 100 } })).toThrow('maxHeight')
    expect(() => loader.validateConfig({ video: { maxHeight: 5000 } })).toThrow('maxHeight')
  })

  it('throws on invalid video.fps', () => {
    expect(() => loader.validateConfig({ video: { fps: 0 } })).toThrow('fps')
    expect(() => loader.validateConfig({ video: { fps: 200 } })).toThrow('fps')
  })

  it('throws on unknown video.codec', () => {
    expect(() => loader.validateConfig({ video: { codec: 'h265' } })).toThrow('codec')
  })

  it('accepts valid video codecs', () => {
    for (const codec of ['vp9', 'av1', 'h264']) {
      expect(() => loader.validateConfig({ video: { codec } })).not.toThrow()
    }
  })

  it('throws on image.concurrency out of range', () => {
    expect(() => loader.validateConfig({ image: { concurrency: 0 } })).toThrow('concurrency')
    expect(() => loader.validateConfig({ image: { concurrency: 11 } })).toThrow('concurrency')
  })

  it('throws on invalid image.formats values', () => {
    expect(() => loader.validateConfig({ image: { formats: ['webp', 'png'] } }))
      .toThrow('formats')
  })

  it('passes valid image.formats', () => {
    expect(() => loader.validateConfig({ image: { formats: ['webp'] } })).not.toThrow()
    expect(() => loader.validateConfig({ image: { formats: ['avif', 'jxl'] } })).not.toThrow()
  })
})

describe('ConfigLoader._mergeConfig', () => {
  const loader = new ConfigLoader()

  it('deep-merges user config over defaults', () => {
    const defaults = { image: { concurrency: 3, formats: ['webp', 'avif'] }, video: { fps: 24 } }
    const user     = { image: { concurrency: 6 } }
    const merged   = loader._mergeConfig(defaults, user)
    expect(merged.image.concurrency).toBe(6)
    expect(merged.image.formats).toEqual(['webp', 'avif'])  // preserved
    expect(merged.video.fps).toBe(24)                       // preserved
  })

  it('user array replaces default array (not merged element-by-element)', () => {
    const defaults = { image: { formats: ['webp', 'avif'] } }
    const user     = { image: { formats: ['jxl'] } }
    const merged   = loader._mergeConfig(defaults, user)
    expect(merged.image.formats).toEqual(['jxl'])
  })

  it('adds new keys from user config', () => {
    const merged = loader._mergeConfig({ a: 1 }, { b: 2 })
    expect(merged).toEqual({ a: 1, b: 2 })
  })
})
