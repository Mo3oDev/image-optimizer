import { describe, it, expect } from 'vitest'
import path from 'path'
import { FileSystemHandler } from '../../src/infrastructure/file-handler.js'

const h = new FileSystemHandler()

describe('FileSystemHandler.resolveOutputDir', () => {
  const inputDir = '/project/images'

  it('default: appends format subdir to input directory', () => {
    expect(h.resolveOutputDir(inputDir, 'webp', {})).toBe('/project/images/webp')
    expect(h.resolveOutputDir(inputDir, 'avif', {})).toBe('/project/images/avif')
    expect(h.resolveOutputDir(inputDir, 'jxl',  {})).toBe('/project/images/jxl')
  })

  it('--flat: returns input directory without format subdir', () => {
    expect(h.resolveOutputDir(inputDir, 'webp', { flat: true })).toBe(inputDir)
    expect(h.resolveOutputDir(inputDir, 'avif', { flat: true })).toBe(inputDir)
  })

  it('--output: uses custom base directory with format subdir', () => {
    expect(h.resolveOutputDir(inputDir, 'webp', { outputDir: '/custom/dist' }))
      .toBe(path.resolve('/custom/dist/webp'))
  })

  it('--output --flat: uses custom base without format subdir', () => {
    expect(h.resolveOutputDir(inputDir, 'webp', { outputDir: '/custom/dist', flat: true }))
      .toBe(path.resolve('/custom/dist'))
  })
})

describe('FileSystemHandler.createOutputFilePath', () => {
  it('replaces extension with the target format', () => {
    const result = h.createOutputFilePath('/imgs/photo.jpg', '/imgs/webp', 'webp')
    expect(result).toBe('/imgs/webp/photo.webp')
  })

  it('works with png input', () => {
    const result = h.createOutputFilePath('/imgs/logo.png', '/imgs/avif', 'avif')
    expect(result).toBe('/imgs/avif/logo.avif')
  })

  it('works with uppercase extension', () => {
    const result = h.createOutputFilePath('/imgs/IMG.JPEG', '/out', 'webp')
    expect(result).toBe('/out/IMG.webp')
  })
})

describe('FileSystemHandler.formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(h.formatBytes(0)).toBe('0 B')
  })

  it('formats bytes', () => {
    expect(h.formatBytes(512)).toBe('512 B')
  })

  it('formats kilobytes', () => {
    expect(h.formatBytes(1024)).toBe('1 KB')
    expect(h.formatBytes(1536)).toBe('1.5 KB')
  })

  it('formats megabytes', () => {
    expect(h.formatBytes(1024 * 1024)).toBe('1 MB')
  })

  it('formats gigabytes', () => {
    expect(h.formatBytes(1024 * 1024 * 1024)).toBe('1 GB')
  })
})

describe('FileSystemHandler.changeExtension', () => {
  it('replaces extension', () => {
    expect(h.changeExtension('/imgs/photo.jpg', 'webp')).toBe('/imgs/photo.webp')
  })

  it('handles files with no extension', () => {
    expect(h.changeExtension('/imgs/photo', 'avif')).toBe('/imgs/photo.avif')
  })
})

describe('FileSystemHandler.getFileName', () => {
  it('returns the basename', () => {
    expect(h.getFileName('/path/to/image.jpg')).toBe('image.jpg')
  })
})

describe('FileSystemHandler.getBaseNameWithoutExtension', () => {
  it('strips extension', () => {
    expect(h.getBaseNameWithoutExtension('/path/to/image.jpg')).toBe('image')
  })
})
