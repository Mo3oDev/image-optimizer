import { promises as fs } from 'fs'
import path from 'path'

// Format priority for <source> ordering: best compression first
const FORMAT_PRIORITY = ['jxl', 'avif', 'webp']
const FORMAT_MIME = { jxl: 'image/jxl', avif: 'image/avif', webp: 'image/webp' }

export class SrcsetGenerator {
  /**
   * Builds HTML picture tags from optimization results.
   * @param {Object} results  - { webp: [...], avif: [...], jxl: [...], errors: [] }
   * @param {string} inputDirectory - used to compute relative paths
   * @returns {string} HTML content
   */
  generate(results, inputDirectory) {
    // Group output paths by input file: Map<inputPath, { format: outputPath }>
    const imageMap = new Map()

    for (const format of Object.keys(results)) {
      if (format === 'errors') continue
      for (const result of results[format]) {
        if (!imageMap.has(result.inputPath)) imageMap.set(result.inputPath, {})
        imageMap.get(result.inputPath)[format] = result.outputPath
      }
    }

    if (imageMap.size === 0) return ''

    const snippets = []

    for (const [inputPath, outputs] of imageMap) {
      const relInput = path.relative(inputDirectory, inputPath)

      const sources = FORMAT_PRIORITY
        .filter(fmt => outputs[fmt])
        .map(fmt => {
          const relOutput = path.relative(inputDirectory, outputs[fmt])
          return `  <source srcset="${relOutput}" type="${FORMAT_MIME[fmt]}">`
        })

      snippets.push(
        `<!-- ${relInput} -->`,
        `<picture>`,
        ...sources,
        `  <img src="${relInput}" alt="" loading="lazy" decoding="async">`,
        `</picture>`,
        ``
      )
    }

    return snippets.join('\n')
  }

  /**
   * Writes the generated HTML to a file.
   * @param {string} content
   * @param {string} outputPath
   */
  async save(content, outputPath) {
    await fs.writeFile(outputPath, content, 'utf-8')
  }
}
