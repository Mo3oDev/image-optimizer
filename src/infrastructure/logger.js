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
    
    console.log(chalk.bold('\n📊 Resumen de Optimización\n'))
    
    if (results.errors && results.errors.length > 0) {
      console.log(chalk.yellow(`⚠ ${results.errors.length} errores encontrados durante el procesamiento`))
      console.log()
    }
    
    const formats = Object.keys(results).filter(key => key !== 'errors')
    let totalOriginal = 0
    let totalOptimized = 0
    let totalVariants = 0
    
    formats.forEach(format => {
      const formatResults = results[format]
      if (formatResults.length === 0) return
      
      const formatOriginal = formatResults.reduce((sum, r) => sum + r.originalSize, 0)
      const formatOptimized = formatResults.reduce((sum, r) => sum + r.optimizedSize, 0)
      const formatSavings = ((formatOriginal - formatOptimized) / formatOriginal) * 100
      
      console.log(chalk.cyan(`${format.toUpperCase()}:`))
      console.log(`  Variantes: ${formatResults.length}`)
      console.log(`  Tamaño original: ${fileHandler.formatBytes(formatOriginal)}`)
      console.log(`  Tamaño optimizado: ${fileHandler.formatBytes(formatOptimized)}`)
      console.log(`  Ahorro: ${chalk.green(`${formatSavings.toFixed(1)}%`)}`)
      
      const variantGroups = this._groupByVariant(formatResults)
      Object.entries(variantGroups).forEach(([variant, files]) => {
        const variantSavings = files.reduce((sum, f) => sum + f.savings, 0)
        const avgSavingsPercent = files.reduce((sum, f) => sum + f.savingsPercentage, 0) / files.length
        console.log(`    ${variant}: ${files.length} archivos, ${fileHandler.formatBytes(variantSavings)} ahorrados (${avgSavingsPercent.toFixed(1)}%)`)
      })
      console.log()
      
      totalOriginal += formatOriginal
      totalOptimized += formatOptimized
      totalVariants += formatResults.length
    })
    
    if (totalOriginal > 0) {
      const totalSavings = ((totalOriginal - totalOptimized) / totalOriginal) * 100
      
      console.log(chalk.bold.green('📈 RESUMEN TOTAL:'))
      console.log(chalk.bold(`  Variantes generadas: ${totalVariants}`))
      console.log(chalk.bold(`  Tamaño original: ${fileHandler.formatBytes(totalOriginal)}`))
      console.log(chalk.bold(`  Tamaño optimizado: ${fileHandler.formatBytes(totalOptimized)}`))
      console.log(chalk.bold.green(`  Ahorro total: ${fileHandler.formatBytes(totalOriginal - totalOptimized)} (${totalSavings.toFixed(1)}%)`))
    }
  }

  _groupByVariant(results) {
    return results.reduce((groups, result) => {
      const variant = result.variant || 'original'
      if (!groups[variant]) {
        groups[variant] = []
      }
      groups[variant].push(result)
      return groups
    }, {})
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
}