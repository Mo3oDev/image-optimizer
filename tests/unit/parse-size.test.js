import { describe, it, expect } from 'vitest'
import { parseTargetSize } from '../../src/utils/parse-size.js'

describe('parseTargetSize', () => {
  it('parses plain bytes (no unit)', () => {
    expect(parseTargetSize('500')).toBe(500)
  })

  it('parses explicit bytes (b suffix)', () => {
    expect(parseTargetSize('500b')).toBe(500)
    expect(parseTargetSize('500B')).toBe(500)
  })

  it('parses kilobytes', () => {
    expect(parseTargetSize('150kb')).toBe(150 * 1024)
    expect(parseTargetSize('150KB')).toBe(150 * 1024)
    expect(parseTargetSize('1kb')).toBe(1024)
  })

  it('parses megabytes', () => {
    expect(parseTargetSize('1mb')).toBe(1024 * 1024)
    expect(parseTargetSize('2MB')).toBe(2 * 1024 * 1024)
  })

  it('parses gigabytes', () => {
    expect(parseTargetSize('1gb')).toBe(1024 * 1024 * 1024)
  })

  it('parses decimal values', () => {
    expect(parseTargetSize('1.5mb')).toBe(Math.round(1.5 * 1024 * 1024))
    expect(parseTargetSize('0.5kb')).toBe(Math.round(0.5 * 1024))
  })

  it('trims surrounding whitespace', () => {
    expect(parseTargetSize('  100kb  ')).toBe(100 * 1024)
  })

  it('throws on invalid input', () => {
    expect(() => parseTargetSize('abc')).toThrow('Invalid --target-size')
    expect(() => parseTargetSize('')).toThrow()
    expect(() => parseTargetSize('100tb')).toThrow()
    expect(() => parseTargetSize('-100kb')).toThrow()
  })
})
