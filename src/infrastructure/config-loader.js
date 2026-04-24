import { promises as fs } from 'fs'
import path from 'path'

export class ConfigLoader {
  constructor() {
    this.defaultConfig = {
      image: {
        concurrency: 3,
        formats: ['webp', 'avif'],
        webpQuality: 80,
        avifQuality: 50,
        effort: 4
      },
      video: {
        maxHeight: 720,
        fps: 24,
        codec: 'vp9',
        removeAudio: true,
        preset: 'medium'
      }
    }
  }

  /**
   * Loads configuration from a file
   * @param {string} configPath - Path to config file
   * @returns {Promise<Object>} Configuration object
   */
  async loadConfig(configPath) {
    try {
      const configContent = await fs.readFile(configPath, 'utf-8')
      const userConfig = JSON.parse(configContent)
      return this._mergeConfig(this.defaultConfig, userConfig)
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Config file doesn't exist, return defaults
        return this.defaultConfig
      }
      throw new Error(`Error loading config from ${configPath}: ${error.message}`)
    }
  }

  /**
   * Searches for config file in standard locations
   * @param {string} baseDirectory - Base directory to search from
   * @returns {Promise<Object>} Configuration object
   */
  async findAndLoadConfig(baseDirectory = process.cwd()) {
    const configNames = [
      'image-optimizer.json',
      '.image-optimizer.json',
      'image-optimizer.config.json'
    ]

    for (const configName of configNames) {
      const configPath = path.join(baseDirectory, configName)
      try {
        await fs.access(configPath)
        return await this.loadConfig(configPath)
      } catch {
        // File doesn't exist, try next
        continue
      }
    }

    // No config file found, return defaults
    return this.defaultConfig
  }

  /**
   * Merges user config with defaults (deep merge)
   * @private
   */
  _mergeConfig(defaults, userConfig) {
    const merged = { ...defaults }

    for (const key in userConfig) {
      if (userConfig[key] && typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
        merged[key] = this._mergeConfig(defaults[key] || {}, userConfig[key])
      } else {
        merged[key] = userConfig[key]
      }
    }

    return merged
  }

  /**
   * Validates configuration object
   * @param {Object} config - Configuration to validate
   * @returns {boolean} True if valid
   * @throws {Error} If configuration is invalid
   */
  validateConfig(config) {
    if (config.video) {
      if (config.video.maxHeight != null && (config.video.maxHeight < 144 || config.video.maxHeight > 4320)) {
        throw new Error('video.maxHeight must be between 144 and 4320')
      }

      if (config.video.fps != null && (config.video.fps < 1 || config.video.fps > 120)) {
        throw new Error('video.fps must be between 1 and 120')
      }

      const validCodecs = ['vp9', 'av1', 'h264']
      if (config.video.codec && !validCodecs.includes(config.video.codec)) {
        throw new Error(`video.codec must be one of: ${validCodecs.join(', ')}`)
      }
    }

    if (config.image) {
      if (config.image.concurrency != null && (config.image.concurrency < 1 || config.image.concurrency > 10)) {
        throw new Error('image.concurrency must be between 1 and 10')
      }

      if (config.image.formats) {
        const validFormats = ['webp', 'avif', 'jxl']
        const invalid = config.image.formats.filter(f => !validFormats.includes(f))
        if (invalid.length) {
          throw new Error(`image.formats contains invalid values: ${invalid.join(', ')}`)
        }
      }
    }

    return true
  }

  /**
   * Gets default configuration
   * @returns {Object} Default configuration
   */
  getDefaults() {
    return JSON.parse(JSON.stringify(this.defaultConfig))
  }
}
