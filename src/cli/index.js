#!/usr/bin/env node

import { Command } from 'commander'
import { ImageOptimizer } from '../core/optimizer.js'
import { getProfile } from '../core/profiles.js'
import { FileSystemHandler } from '../infrastructure/file-handler.js'
import { ConsoleLogger } from '../infrastructure/logger.js'
import { SharpImageProcessor } from '../infrastructure/image-processor.js'

const program = new Command()

program
  .name('image-optimizer')
  .description('Optimizador de imágenes parametrizable con perfiles especializados (JPEG/PNG → WebP/AVIF)')
  .version('1.0.0')

program
  .argument('<directory>', 'Directorio con imágenes (JPEG/PNG) a optimizar')
  .option('-p, --profile <name>', 'Perfil de optimización', 'default')
  .option('-c, --concurrency <number>', 'Número de tareas concurrentes (1-6)', '3')
  .option('-v, --verbose', 'Mostrar información detallada')
  .option('--dry-run', 'Simular sin procesar archivos')
  .action(async (directory, options) => {
    const logger = new ConsoleLogger()
    const fileHandler = new FileSystemHandler()
    const imageProcessor = new SharpImageProcessor()
    
    try {
      logger.info(`🚀 Iniciando optimización de imágenes`)
      
      if (options.verbose) {
        logger.info(`Directorio: ${directory}`)
        logger.info(`Perfil: ${options.profile}`)
        logger.info(`Concurrencia: ${options.concurrency}`)
      }

      const profile = getProfile(options.profile)
      const concurrency = Math.max(1, Math.min(6, parseInt(options.concurrency)))
      const optimizer = new ImageOptimizer(imageProcessor, fileHandler, logger, concurrency)
      
      if (options.dryRun) {
        logger.info('🧪 Modo simulación activado - no se procesarán archivos')
        return
      }
      
      logger.progress('Analizando directorio...')
      const results = await optimizer.optimizeBatch(directory, profile)
      
      logger.success(`✅ Optimización completada`)
      
      if (options.verbose) {
        logger.printDetailedSummary(results, fileHandler, true)
      } else {
        logger.printSummary(results, fileHandler)
      }
      
    } catch (error) {
      logger.error(`Error: ${error.message}`)
      process.exit(1)
    }
  })

program
  .command('profiles')
  .description('Listar perfiles de optimización disponibles')
  .action(() => {
    const logger = new ConsoleLogger()
    
    logger.info('📋 Perfiles disponibles:')
    console.log('')
    console.log('🎯 Perfiles especializados:')
    console.log('• thumbnail    - Miniaturas para listados (150px, 300px)')
    console.log('• product      - Catálogos de productos (800px, 1200px, 1600px)')
    console.log('• banner       - Banners y héroes (1280px, 1920px, 2560px)')
    console.log('• logo         - Logos y gráficos (100px, 200px, 400px) - Lossless')
    console.log('')
    console.log('🎯 Perfiles básicos:')
    console.log('• default      - Calidad equilibrada (800px)')
    console.log('• balanced     - Optimización balanceada (800px)')
    console.log('• aggressive   - Máxima compresión (600px)')
    console.log('• high-quality - Alta calidad (1200px)')
    console.log('')
    console.log('📝 Información:')
    console.log('• Formatos soportados: JPEG, PNG → WebP + AVIF')
    console.log('• Resize automático: fit inside/cover/contain según perfil')
    console.log('• Quality tuning optimizado por caso de uso')
    console.log('')
    console.log('Uso: image-optimizer <directorio> --profile <nombre>')
  })

program.parse()