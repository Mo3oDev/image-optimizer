import { describe, it, expect } from 'vitest'
import { FFmpegVideoProcessor } from '../../src/infrastructure/video-processor.js'
import { VideoCodec } from '../../src/core/video-types.js'

const proc = new FFmpegVideoProcessor()

describe('FFmpegVideoProcessor._buildArgs', () => {
  describe('VP9 (default)', () => {
    it('uses libvpx-vp9 codec', () => {
      const args = proc._buildArgs('/in.mp4', '/out.webm', { codec: VideoCodec.VP9 })
      expect(args).toContain('-c:v')
      expect(args).toContain('libvpx-vp9')
    })

    it('sets CRF 31 by default', () => {
      const args = proc._buildArgs('/in.mp4', '/out.webm', { codec: VideoCodec.VP9 })
      const crfIdx = args.indexOf('-crf')
      expect(args[crfIdx + 1]).toBe('31')
    })

    it('respects custom CRF', () => {
      const args = proc._buildArgs('/in.mp4', '/out.webm', { codec: VideoCodec.VP9, crf: 28 })
      const crfIdx = args.indexOf('-crf')
      expect(args[crfIdx + 1]).toBe('28')
    })

    it('includes -b:v 0 and -row-mt 1', () => {
      const args = proc._buildArgs('/in.mp4', '/out.webm', { codec: VideoCodec.VP9 })
      expect(args).toContain('-b:v')
      expect(args).toContain('0')
      expect(args).toContain('-row-mt')
      expect(args).toContain('1')
    })
  })

  describe('H264', () => {
    it('uses libx264 codec', () => {
      const args = proc._buildArgs('/in.mp4', '/out.mp4', { codec: VideoCodec.H264 })
      expect(args).toContain('libx264')
    })

    it('sets CRF 23 by default', () => {
      const args = proc._buildArgs('/in.mp4', '/out.mp4', { codec: VideoCodec.H264 })
      const crfIdx = args.indexOf('-crf')
      expect(args[crfIdx + 1]).toBe('23')
    })

    it('sets preset medium by default', () => {
      const args = proc._buildArgs('/in.mp4', '/out.mp4', { codec: VideoCodec.H264 })
      const presetIdx = args.indexOf('-preset')
      expect(args[presetIdx + 1]).toBe('medium')
    })

    it('respects custom preset', () => {
      const args = proc._buildArgs('/in.mp4', '/out.mp4', { codec: VideoCodec.H264, preset: 'slow' })
      const presetIdx = args.indexOf('-preset')
      expect(args[presetIdx + 1]).toBe('slow')
    })
  })

  describe('AV1', () => {
    it('uses libaom-av1 codec', () => {
      const args = proc._buildArgs('/in.mp4', '/out.webm', { codec: VideoCodec.AV1 })
      expect(args).toContain('libaom-av1')
    })

    it('sets CRF 35 by default', () => {
      const args = proc._buildArgs('/in.mp4', '/out.webm', { codec: VideoCodec.AV1 })
      const crfIdx = args.indexOf('-crf')
      expect(args[crfIdx + 1]).toBe('35')
    })

    it('includes -cpu-used 4', () => {
      const args = proc._buildArgs('/in.mp4', '/out.webm', { codec: VideoCodec.AV1 })
      const cpuIdx = args.indexOf('-cpu-used')
      expect(args[cpuIdx + 1]).toBe('4')
    })
  })

  describe('Scaling and filters', () => {
    it('adds -vf scale=-2:<maxHeight> when maxHeight is set', () => {
      const args = proc._buildArgs('/in.mp4', '/out.webm', { codec: VideoCodec.VP9, maxHeight: 720 })
      const vfIdx = args.indexOf('-vf')
      expect(args[vfIdx + 1]).toBe('scale=-2:720')
    })

    it('does not add -vf when maxHeight is not set', () => {
      const args = proc._buildArgs('/in.mp4', '/out.webm', { codec: VideoCodec.VP9 })
      expect(args).not.toContain('-vf')
    })
  })

  describe('Framerate', () => {
    it('adds -r <fps> when fps is set', () => {
      const args = proc._buildArgs('/in.mp4', '/out.webm', { codec: VideoCodec.VP9, fps: 24 })
      const rIdx = args.indexOf('-r')
      expect(args[rIdx + 1]).toBe('24')
    })

    it('does not add -r when fps is not set', () => {
      const args = proc._buildArgs('/in.mp4', '/out.webm', { codec: VideoCodec.VP9 })
      expect(args).not.toContain('-r')
    })
  })

  describe('Audio', () => {
    it('adds -an when removeAudio is true', () => {
      const args = proc._buildArgs('/in.mp4', '/out.webm', { codec: VideoCodec.VP9, removeAudio: true })
      expect(args).toContain('-an')
    })

    it('adds -c:a copy when removeAudio is false', () => {
      const args = proc._buildArgs('/in.mp4', '/out.webm', { codec: VideoCodec.VP9, removeAudio: false })
      expect(args).not.toContain('-an')
      expect(args).toContain('-c:a')
      expect(args).toContain('copy')
    })
  })

  describe('General', () => {
    it('always includes -y (overwrite without prompt)', () => {
      const args = proc._buildArgs('/in.mp4', '/out.webm', { codec: VideoCodec.VP9 })
      expect(args).toContain('-y')
    })

    it('starts with -i <inputPath>', () => {
      const args = proc._buildArgs('/my/video.mp4', '/out.webm', { codec: VideoCodec.VP9 })
      expect(args[0]).toBe('-i')
      expect(args[1]).toBe('/my/video.mp4')
    })

    it('ends with the output path', () => {
      const args = proc._buildArgs('/in.mp4', '/my/output.webm', { codec: VideoCodec.VP9 })
      expect(args[args.length - 1]).toBe('/my/output.webm')
    })
  })
})

describe('FFmpegVideoProcessor._parseFps', () => {
  it('parses fractional FPS strings (NTSC: 30000/1001 ≈ 30)', () => {
    expect(proc._parseFps('30000/1001')).toBe(30)
  })

  it('parses fractional FPS strings (24000/1001 ≈ 24)', () => {
    expect(proc._parseFps('24000/1001')).toBe(24)
  })

  it('parses integer FPS strings', () => {
    expect(proc._parseFps('30')).toBe(30)
    expect(proc._parseFps('60')).toBe(60)
  })

  it('returns 0 for null or undefined', () => {
    expect(proc._parseFps(null)).toBe(0)
    expect(proc._parseFps(undefined)).toBe(0)
  })
})
