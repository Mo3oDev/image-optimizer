export const VideoCodec = {
  VP9: 'vp9',
  AV1: 'av1',
  H264: 'h264'
}

export const VideoFormat = {
  WEBM: 'webm',
  MP4: 'mp4'
}

export class VideoOptimizationResult {
  constructor(inputPath, outputPath, originalSize, optimizedSize, codec, metadata = {}) {
    this.inputPath = inputPath
    this.outputPath = outputPath
    this.originalSize = originalSize
    this.optimizedSize = optimizedSize
    this.codec = codec
    this.metadata = metadata
    this.savings = originalSize - optimizedSize
    this.savingsPercentage = ((originalSize - optimizedSize) / originalSize) * 100
  }

  get format() {
    return this.codec === VideoCodec.VP9 || this.codec === VideoCodec.AV1
      ? VideoFormat.WEBM
      : VideoFormat.MP4
  }
}

export class VideoOptimizationProfile {
  constructor(name, options = {}) {
    this.name = name
    this.options = this._normalizeOptions(options)
  }

  _normalizeOptions(options) {
    return {
      enabled: options.enabled !== false,
      maxHeight: options.maxHeight || 720,
      fps: options.fps || 24,
      codec: options.codec || VideoCodec.VP9,
      bitrate: options.bitrate || '1M',
      removeAudio: options.removeAudio !== false,
      preset: options.preset || 'medium',
      crf: options.crf || 31,
      ...options
    }
  }

  getCodecOptions() {
    const { codec, crf, preset, bitrate } = this.options

    if (codec === VideoCodec.VP9) {
      return {
        codec: 'libvpx-vp9',
        videoBitrate: bitrate,
        crf: crf,
        preset: preset,
        format: VideoFormat.WEBM
      }
    }

    if (codec === VideoCodec.AV1) {
      return {
        codec: 'libaom-av1',
        videoBitrate: bitrate,
        crf: crf,
        preset: preset,
        format: VideoFormat.WEBM
      }
    }

    // Default to H264
    return {
      codec: 'libx264',
      videoBitrate: bitrate,
      crf: crf,
      preset: preset,
      format: VideoFormat.MP4
    }
  }
}
