import {existsSync, readFileSync, writeFileSync} from 'fs'
import {join, resolve} from 'path'
import {fileURLToPath} from 'url'
import {dirname} from 'path'
import {input, confirm} from '@inquirer/prompts'
import {expandTilde} from '../utils.js'
import theme from '../theme.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Initialize DocFu configuration with interactive prompts
 * Creates a customized docfu.yml file in the source directory
 * @param {string} source - Optional source directory path (if not provided, prompts user)
 * @param {Object} options - Command options (workspace, dist, yes)
 * @param {Object} packageJson - Package.json object containing version info
 * @returns {Promise<void>}
 * @example
 * await initCommand('./docs', {}, packageJson)
 * await initCommand('./docs', {workspace: '.workspace', dist: '.dist', yes: true}, packageJson)
 */
export default async function initCommand(source, options = {}, packageJson) {
  try {
    console.log(theme.primary(`DocFu v${packageJson.version}`))
    console.log(theme.info('Initialize DocFu configuration'))
    console.log()

    const sourceDir = expandTilde(
      source ||
        (await input({
          message: 'Where are your markdown docs?',
          default: './docs',
        }))
    )

    const workspaceDir =
      options.workspace ||
      (options.yes
        ? '.docfu/workspace'
        : await input({
            message: 'Workspace directory?',
            default: '.docfu/workspace',
          }))

    const distDir =
      options.dist ||
      (options.yes
        ? '.docfu/dist'
        : await input({
            message: 'Build output directory?',
            default: '.docfu/dist',
          }))

    const configPath = join(resolve(sourceDir), 'docfu.yml')
    if (existsSync(configPath) && !options.yes) {
      console.log()
      console.log(theme.warning(`⚠ ${configPath} already exists`))
      const overwrite = await confirm({
        message: 'Overwrite existing configuration?',
        default: false,
      })

      if (!overwrite) {
        console.log(theme.muted('Cancelled.'))
        return
      }
    }

    const templatePath = join(__dirname, '../../../docfu.example.yml')
    let template = readFileSync(templatePath, 'utf-8')

    template = template
      .replace('workspace: .docfu/workspace', `workspace: ${workspaceDir}`)
      .replace('dist: .docfu/dist', `dist: ${distDir}`)

    writeFileSync(configPath, template, 'utf-8')

    console.log()
    console.log(theme.success(`✓ Created ${configPath}`))
    console.log()
    console.log(theme.muted('Next steps:'))
    console.log(theme.muted(`  1. Edit ${configPath} to customize your site`))
    console.log(theme.muted(`  2. Run: docfu build ${sourceDir}`))
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      console.log()
      console.log(theme.muted('Cancelled.'))
      return
    }
    console.error(theme.danger(`✗ Init failed: ${error.message}`))
    process.exit(1)
  }
}
