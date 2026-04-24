import { describe, it, expect } from 'vitest'
import { SrcsetGenerator } from '../../src/core/srcset-generator.js'

const gen = new SrcsetGenerator()

function makeResults(formats) {
  const results = { errors: [] }
  for (const [fmt, inputPath, outputPath] of formats) {
    if (!results[fmt]) results[fmt] = []
    results[fmt].push({ inputPath, outputPath, format: fmt })
  }
  return results
}

describe('SrcsetGenerator.generate', () => {
  it('returns empty string when there are no results', () => {
    expect(gen.generate({ errors: [] }, '/imgs')).toBe('')
  })

  it('generates a <picture> tag for each input file', () => {
    const results = makeResults([
      ['webp', '/imgs/photo.jpg', '/imgs/webp/photo.webp'],
      ['avif', '/imgs/photo.jpg', '/imgs/avif/photo.avif']
    ])
    const html = gen.generate(results, '/imgs')
    expect(html).toContain('<picture>')
    expect(html).toContain('</picture>')
    expect(html).toContain('photo.jpg')
  })

  it('orders sources: avif before webp', () => {
    const results = makeResults([
      ['webp', '/imgs/photo.jpg', '/imgs/webp/photo.webp'],
      ['avif', '/imgs/photo.jpg', '/imgs/avif/photo.avif']
    ])
    const html = gen.generate(results, '/imgs')
    const avifPos = html.indexOf('image/avif')
    const webpPos = html.indexOf('image/webp')
    expect(avifPos).toBeLessThan(webpPos)
  })

  it('orders sources: jxl first, then avif, then webp', () => {
    const results = makeResults([
      ['webp', '/imgs/photo.jpg', '/imgs/webp/photo.webp'],
      ['avif', '/imgs/photo.jpg', '/imgs/avif/photo.avif'],
      ['jxl',  '/imgs/photo.jpg', '/imgs/jxl/photo.jxl']
    ])
    const html = gen.generate(results, '/imgs')
    const jxlPos  = html.indexOf('image/jxl')
    const avifPos = html.indexOf('image/avif')
    const webpPos = html.indexOf('image/webp')
    expect(jxlPos).toBeLessThan(avifPos)
    expect(avifPos).toBeLessThan(webpPos)
  })

  it('uses relative paths from the input directory', () => {
    const results = makeResults([
      ['webp', '/imgs/photo.jpg', '/imgs/webp/photo.webp']
    ])
    const html = gen.generate(results, '/imgs')
    // Should not contain absolute paths
    expect(html).not.toContain('/imgs/webp/photo.webp')
    expect(html).toContain('webp/photo.webp')
    expect(html).toContain('photo.jpg')
  })

  it('includes loading="lazy" and decoding="async" on the img tag', () => {
    const results = makeResults([
      ['webp', '/imgs/photo.jpg', '/imgs/webp/photo.webp']
    ])
    const html = gen.generate(results, '/imgs')
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('decoding="async"')
  })

  it('generates separate picture blocks for multiple input files', () => {
    const results = makeResults([
      ['webp', '/imgs/photo1.jpg', '/imgs/webp/photo1.webp'],
      ['webp', '/imgs/photo2.jpg', '/imgs/webp/photo2.webp']
    ])
    const html = gen.generate(results, '/imgs')
    expect(html.split('<picture>').length - 1).toBe(2)
  })

  it('generates correct MIME types in source elements', () => {
    const results = makeResults([
      ['webp', '/imgs/a.jpg', '/imgs/webp/a.webp'],
      ['avif', '/imgs/a.jpg', '/imgs/avif/a.avif'],
      ['jxl',  '/imgs/a.jpg', '/imgs/jxl/a.jxl']
    ])
    const html = gen.generate(results, '/imgs')
    expect(html).toContain('type="image/webp"')
    expect(html).toContain('type="image/avif"')
    expect(html).toContain('type="image/jxl"')
  })
})
