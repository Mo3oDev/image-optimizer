import { spawn } from 'child_process'
import { VideoCodec } from '../core/video-types.js'

export class FFmpegVideoProcessor {
  /**
   * Gets video metadata using ffprobe
   * @param {string} videoPath - Path to video file
   * @returns {Promise<Object>} Video metadata
   */
  async getVideoInfo(videoPath) {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams',
        '-show_format',
        videoPath
      ]

      const proc = spawn('ffprobe', args)
      const chunks = []

      proc.stdout.on('data', chunk => chunks.push(chunk))
      proc.on('error', err => reject(new Error(`ffprobe not found: ${err.message}`)))
      proc.on('close', code => {
        if (code !== 0) {
          return reject(new Error(`ffprobe failed for ${videoPath}`))
        }

        try {
          const data = JSON.parse(Buffer.concat(chunks).toString())
          const videoStream = data.streams.find(s => s.codec_type === 'video')
          const audioStream = data.streams.find(s => s.codec_type === 'audio')

          if (!videoStream) {
            return reject(new Error(`No video stream found in ${videoPath}`))
          }

          resolve({
            width: videoStream.width,
            height: videoStream.height,
            fps: this._parseFps(videoStream.r_frame_rate),
            duration: parseFloat(data.format.duration),
            codec: videoStream.codec_name,
            hasAudio: !!audioStream,
            bitrate: parseInt(data.format.bit_rate),
            size: parseInt(data.format.size)
          })
        } catch (err) {
          reject(new Error(`Failed to parse ffprobe output: ${err.message}`))
        }
      })
    })
  }

  /**
   * Optimizes a video file
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output video path
   * @param {Object} options - Optimization options
   * @returns {Promise<void>}
   */
  async optimize(inputPath, outputPath, options) {
    return new Promise((resolve, reject) => {
      const args = this._buildArgs(inputPath, outputPath, options)
      const proc = spawn('ffmpeg', args)
      const stderrChunks = []

      proc.stderr.on('data', chunk => stderrChunks.push(chunk))
      proc.on('error', err => reject(new Error(`FFmpeg not found: ${err.message}`)))
      proc.on('close', code => {
        if (code === 0) return resolve()
        const stderrTail = Buffer.concat(stderrChunks).toString().slice(-300)
        reject(new Error(`FFmpeg exited with code ${code}: ${stderrTail}`))
      })
    })
  }

  /**
   * Validates FFmpeg availability
   * @returns {Promise<boolean>}
   */
  async validateFFmpeg() {
    return new Promise(resolve => {
      const proc = spawn('ffmpeg', ['-version'])
      proc.on('error', () => resolve(false))
      proc.on('close', code => resolve(code === 0))
    })
  }

  /**
   * Builds FFmpeg CLI arguments from options
   * @private
   */
  _buildArgs(inputPath, outputPath, options) {
    const codec = options.codec || VideoCodec.VP9
    const args = ['-i', inputPath, '-y']

    if (codec === VideoCodec.H264) {
      args.push('-c:v', 'libx264')
      args.push('-crf', String(options.crf ?? 23))
      args.push('-preset', options.preset ?? 'medium')
    } else if (codec === VideoCodec.AV1) {
      args.push('-c:v', 'libaom-av1')
      args.push('-crf', String(options.crf ?? 35))
      args.push('-b:v', '0')
      args.push('-cpu-used', '4')
    } else {
      // VP9 (default)
      args.push('-c:v', 'libvpx-vp9')
      args.push('-crf', String(options.crf ?? 31))
      args.push('-b:v', '0')
      args.push('-row-mt', '1')
    }

    if (options.maxHeight) {
      // -2 keeps width divisible by 2 (required by most codecs)
      args.push('-vf', `scale=-2:${options.maxHeight}`)
    }

    if (options.fps) {
      args.push('-r', String(options.fps))
    }

    if (options.removeAudio) {
      args.push('-an')
    } else {
      args.push('-c:a', 'copy')
    }

    args.push(outputPath)
    return args
  }

  /**
   * Parses FPS from fractional string (e.g., "30000/1001")
   * @private
   */
  _parseFps(fpsString) {
    if (!fpsString) return 0
    const parts = fpsString.split('/')
    if (parts.length === 2) {
      return Math.round(parseInt(parts[0]) / parseInt(parts[1]))
    }
    return parseInt(fpsString)
  }
}
