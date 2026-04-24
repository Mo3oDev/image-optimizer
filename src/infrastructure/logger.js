import chalk from 'chalk'
import ora from 'ora'

export class ConsoleLogger {
  constructor() {
    this.spinner = null
  }

  info(message) {
    this.stopSpinner()
    console.log(chalk.blue('ℹ'), message)
  }

  success(message) {
    this.stopSpinner()
    console.log(chalk.green('✓'), message)
  }

  error(message) {
    this.stopSpinner()
    console.error(chalk.red('✗'), message)
  }

  warning(message) {
    this.stopSpinner()
    console.warn(chalk.yellow('⚠'), message)
  }

  progress(message) {
    if (this.spinner) {
      this.spinner.text = message
    } else {
      this.spinner = ora(message).start()
    }
  }

  stopSpinner() {
    if (this.spinner) {
      this.spinner.stop()
      this.spinner = null
    }
  }

  printSummary(results, fileHandler) {
    this.stopSpinner()

    console.log(chalk.bold('\nOptimization Summary\n'))

    if (results.errors && results.errors.length > 0) {
      console.log(chalk.yellow(`  ${results.errors.length} error(s) during processing`))
      console.log()
    }

    const formats = Object.keys(results).filter(key => key !== 'errors')
    let totalOriginal = 0
    let totalOptimized = 0
    let totalFiles = 0

    formats.forEach(format => {
      const items = results[format]
      if (!items.length) return

      const orig = items.reduce((sum, r) => sum + r.originalSize, 0)
      const opt = items.reduce((sum, r) => sum + r.optimizedSize, 0)
      const pct = orig > 0 ? ((orig - opt) / orig * 100).toFixed(1) : '0.0'

      console.log(chalk.cyan(`${format.toUpperCase()}:`))
      console.log(`  Files:    ${items.length}`)
      console.log(`  Original: ${fileHandler.formatBytes(orig)}`)
      console.log(`  Output:   ${fileHandler.formatBytes(opt)}`)
      console.log(`  Saved:    ${chalk.green(pct + '%')}`)
      console.log()

      totalOriginal += orig
      totalOptimized += opt
      totalFiles += items.length
    })

    if (totalOriginal > 0) {
      const totalPct = ((totalOriginal - totalOptimized) / totalOriginal * 100).toFixed(1)
      console.log(chalk.bold.green('TOTAL:'))
      console.log(chalk.bold(`  Files processed: ${totalFiles}`))
      console.log(chalk.bold(`  Saved: ${fileHandler.formatBytes(totalOriginal - totalOptimized)} (${totalPct}%)`))
    }
  }

  printDetailedSummary(results, fileHandler, verbose = false) {
    this.printSummary(results, fileHandler)

    if (verbose && results.errors && results.errors.length > 0) {
      console.log(chalk.red('\n❌ Errores detallados:'))
      results.errors.forEach((error, index) => {
        console.log(chalk.red(`  ${index + 1}. ${error.error}`))
      })
    }
  }

  printVideoSummary(results, fileHandler) {
    this.stopSpinner()

    console.log(chalk.bold('\n🎬 Resumen de Optimización de Videos\n'))

    if (results.errors && results.errors.length > 0) {
      console.log(chalk.yellow(`⚠ ${results.errors.length} errores encontrados durante el procesamiento`))
      console.log()
    }

    if (results.videos.length === 0) {
      console.log('No se procesaron videos')
      return
    }

    const totalOriginal = results.videos.reduce((sum, r) => sum + r.originalSize, 0)
    const totalOptimized = results.videos.reduce((sum, r) => sum + r.optimizedSize, 0)
    const totalSavings = ((totalOriginal - totalOptimized) / totalOriginal) * 100

    console.log(chalk.cyan('VIDEOS:'))
    console.log(`  Archivos procesados: ${results.videos.length}`)
    console.log(`  Tamaño original: ${fileHandler.formatBytes(totalOriginal)}`)
    console.log(`  Tamaño optimizado: ${fileHandler.formatBytes(totalOptimized)}`)
    console.log(`  Ahorro: ${chalk.green(`${totalSavings.toFixed(1)}%`)}`)

    if (results.videos.length > 0) {
      console.log('\n  Detalles por archivo:')
      results.videos.forEach(video => {
        const fileName = fileHandler.getFileName(video.inputPath)
        console.log(`    • ${fileName}: ${fileHandler.formatBytes(video.savings)} ahorrados (${video.savingsPercentage.toFixed(1)}%)`)
      })
    }

    console.log()
  }
}