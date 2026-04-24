const MULTIPLIERS = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 }

/**
 * Parses a human-readable size string into bytes.
 * @param {string} str  e.g. "150kb", "1.5mb", "500", "2gb"
 * @returns {number} bytes
 * @throws {Error} if the string is not a valid size
 */
export function parseTargetSize(str) {
  const match = String(str).trim().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i)
  if (!match) {
    throw new Error(`Invalid --target-size value: "${str}". Examples: 150kb, 1.5mb, 500`)
  }
  const num = parseFloat(match[1])
  const unit = (match[2] || 'b').toLowerCase()
  return Math.round(num * MULTIPLIERS[unit])
}
