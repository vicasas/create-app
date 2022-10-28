#!/usr/bin/env node

// Based on Vite
// https://github.com/vitejs/vite/blob/main/packages/create-vite/src/index.ts

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import chalk from 'chalk'
import gradient from 'gradient-string'
import { program } from 'commander'
import prompts from 'prompts'

type Options<T extends string> = { [id in T]: any }

type FrameworkVariant = {
  name: string
  display: string
}

type Framework = {
  name: string
  display: string
  variants: FrameworkVariant[]
}

const frameworks: Framework[] = [
  {
    name: 'node',
    display: 'Node',
    variants: [
      { name: 'node', display: 'Node Javascript' },
      { name: 'node-ts', display: 'Node Typescript' },
    ],
  },
  {
    name: 'react',
    display: 'React',
    variants: [
      { name: 'react', display: 'React Javascript' },
      { name: 'react-ts', display: 'React Typescript' },
    ],
  },
]

const cwd = process.cwd()

const caGradient = gradient('#FFFFFF', '#000000')

let targerDir = ''

const renameFiles: Record<string, string> = {
  _gitignore: '.gitignore',
}

program
  .name('create-app')
  .version('1.0.0', '-v --version')
  .description('A CLI for generate a new app with one command')
  .arguments('[project-directory]')
  .usage(`${chalk.green('<project-directory>')} [options]`)
  .action((name) => (targerDir = name))
  .option(
    '-t --template <template>',
    'specify a template for the created project'
  )
  .allowUnknownOption()
  .parse(process.argv)

const questions: prompts.PromptObject<string>[] = [
  {
    type: 'text',
    name: 'projectName',
    message: 'Project name:',
    initial: 'my-app',
    onState: (state) => (targerDir = formatTargetDir(state.value)),
  },
  {
    type: () => (isValidPackageName(targerDir) ? null : 'text'),
    name: 'packageName',
    message: 'Package name:',
    initial: () => toValidPackageName(targerDir),
    validate: (dir) => isValidPackageName(dir) || 'Invalid package.json name',
  },
  {
    type: 'select',
    name: 'framework',
    message: 'Select a template:',
    choices: frameworks.map((framework) => ({
      title: framework.display,
      value: framework,
    })),
  },
  {
    type: 'select',
    name: 'variant',
    message: 'Select a variant:',
    choices: (prev: Framework) =>
      prev.variants.map((variant) => ({
        title: variant.display,
        value: variant.name,
      })),
  },
]

async function init() {
  const options: Options<'template'> = program.opts()

  let response:
    | prompts.Answers<'projectName' | 'packageName' | 'framework' | 'variant'>
    | undefined

  console.log()
  console.log(chalk.bold(caGradient('>>> CREATE APP')))
  await new Promise((resolve) => setTimeout(resolve, 500))
  console.log()
  console.log(
    ">>> Welcome to Create App CLI! Let's start creating out first application."
  )
  console.log()

  if (!targerDir) {
    try {
      response = await prompts(questions, {
        onCancel: () => {
          throw new Error(chalk.red('✖') + ' Operation cancelled')
        },
      })
    } catch (cancelled: any) {
      console.log(cancelled.message)
      return
    }
  }

  const framework: Framework | undefined = response?.framework
  const packageName: string =
    response?.packageName || toValidPackageName(targerDir)
  const variant: string = response?.variant
  const template: string = variant || framework?.name || options.template

  // Create the app directory
  const root = path.join(cwd, targerDir)
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true })
  }

  console.log()
  console.log(`>>> Creating a new app in ${chalk.green(root)}.`)
  console.log()

  const templateDir = path.resolve(
    fileURLToPath(import.meta.url),
    '../../templates',
    `template-${template}`
  )

  const write = (file: string, content?: string) => {
    const targetPath = path.join(root, renameFiles[file] ?? file)
    if (content) {
      fs.writeFileSync(targetPath, content)
    } else {
      copy(path.join(templateDir, file), targetPath)
    }
  }

  const files = fs.readdirSync(templateDir)
  for (const file of files.filter((f) => f !== 'package.json')) {
    write(file)
  }

  const pkg = JSON.parse(
    fs.readFileSync(path.join(templateDir, `package.json`), 'utf-8')
  )

  pkg.name = packageName

  write('package.json', JSON.stringify(pkg, null, 2))

  console.log(
    `${chalk.bold(
      caGradient('>>> Done!')
    )} Created a new app at "${targerDir}".`
  )
  console.log('Now run:\n')
  if (root !== cwd) {
    console.log(`  cd ${path.relative(cwd, root)}`)
  }
  console.log('  npm install')
  console.log()
}

function formatTargetDir(targetDir: string) {
  return targetDir?.trim().replace(/\/+$/g, '')
}

function copy(src: string, dest: string) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    copyDir(src, dest)
  } else {
    fs.copyFileSync(src, dest)
  }
}

function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file)
    const destFile = path.resolve(destDir, file)
    copy(srcFile, destFile)
  }
}

function isValidPackageName(projectName: string) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(
    projectName
  )
}

function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~]+/g, '-')
}

init().catch((err) => {
  console.error(err)
  process.exit(1)
})
