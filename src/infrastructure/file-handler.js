import { promises as fs } from 'fs'
import path from 'path'

export class FileSystemHandler {
  async findJpegFiles(directory) {
    try {
      const files = await fs.readdir(directory)
      const jpegFiles = files
        .filter(file => /\.(jpg|jpeg)$/i.test(file))
        .map(file => path.join(directory, file))
      
      return jpegFiles
    } catch (error) {
      throw new Error(`Error leyendo directorio ${directory}: ${error.message}`)
    }
  }

  async findImageFiles(directory) {
    try {
      const files = await fs.readdir(directory)
      const imageFiles = files
        .filter(file => /\.(jpg|jpeg|png)$/i.test(file))
        .map(file => path.join(directory, file))
      
      return imageFiles
    } catch (error) {
      throw new Error(`Error leyendo directorio ${directory}: ${error.message}`)
    }
  }

  async findPngFiles(directory) {
    try {
      const files = await fs.readdir(directory)
      const pngFiles = files
        .filter(file => /\.png$/i.test(file))
        .map(file => path.join(directory, file))
      
      return pngFiles
    } catch (error) {
      throw new Error(`Error leyendo directorio ${directory}: ${error.message}`)
    }
  }

  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath)
      return stats.size
    } catch (error) {
      throw new Error(`Error obteniendo tamaño de ${filePath}: ${error.message}`)
    }
  }

  async ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true })
    } catch (error) {
      throw new Error(`Error creando directorio ${dirPath}: ${error.message}`)
    }
  }

  getFileName(filePath) {
    return path.basename(filePath)
  }

  createOutputPath(baseDirectory, format) {
    return path.join(baseDirectory, format)
  }

  moveToDirectory(filePath, newDirectory) {
    const fileName = path.basename(filePath)
    return path.join(newDirectory, fileName)
  }

  changeExtension(filePath, newExtension) {
    const dir = path.dirname(filePath)
    const baseName = path.basename(filePath, path.extname(filePath))
    return path.join(dir, `${baseName}.${newExtension}`)
  }

  createVariantPath(inputPath, outputDirectory, format, variant) {
    const baseName = path.basename(inputPath, path.extname(inputPath))
    const suffix = variant.suffix === 'original' ? '' : `_${variant.suffix}`
    const fileName = `${baseName}${suffix}.${format}`
    return path.join(outputDirectory, fileName)
  }

  getBaseNameWithoutExtension(filePath) {
    return path.basename(filePath, path.extname(filePath))
  }

  sanitizeFileName(fileName) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  async createUniqueFileName(basePath, extension) {
    const dir = path.dirname(basePath)
    const baseName = path.basename(basePath, path.extname(basePath))
    
    let counter = 1
    let newPath = `${dir}/${baseName}.${extension}`
    
    while (await this.fileExists(newPath)) {
      newPath = `${dir}/${baseName}_${counter}.${extension}`
      counter++
    }
    
    return newPath
  }
}