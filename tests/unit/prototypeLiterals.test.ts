import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOTS = ['app', 'i18n']
const EXTRA = ['.output']

const FORBIDDEN = [
  /ANATARA/,
  /Iconic I/,
  /201–208/,
  /201-208/,
  /USD 13,300/,
  /13,300/,
  /paid at SCY airport/
]

const CABIN_NUMBERS = [
  /\b20[1-8]\b/,
  /\b301\b/
]

function walk(dir: string, files: Array<string> = []): Array<string> {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
    return files
  }

  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      walk(path, files)
    } else if (/\.(vue|ts|js|json|css|mjs)$/.test(name)) {
      files.push(path)
    }
  }

  return files
}

describe('prototype literals stay out of the engine', () => {
  it('does not ship retired names, cabin numbers, rates or airport-fee copy', () => {
    const files = ROOTS.flatMap(root => walk(join(process.cwd(), root)))

    for (const extra of EXTRA) {
      files.push(...walk(join(process.cwd(), extra)))
    }

    const hits: Array<string> = []

    for (const file of files) {
      const relative = file.replace(`${process.cwd()}/`, '')

      if (relative.includes('node_modules') || relative.includes('prototypeLiterals')) {
        continue
      }

      const text = readFileSync(file, 'utf8')

      for (const pattern of FORBIDDEN) {
        if (pattern.test(text)) {
          hits.push(`${relative}: ${pattern}`)
        }
      }

      const skipCabin = relative.includes('data/routeMaps')
        || relative.includes('RouteMap')
        || relative.startsWith('.output/')
      if (!skipCabin) {
        for (const pattern of CABIN_NUMBERS) {
          if (pattern.test(text)) {
            hits.push(`${relative}: ${pattern}`)
          }
        }
      }
    }

    expect(hits).toEqual([])
  })
})
