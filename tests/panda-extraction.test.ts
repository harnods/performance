// Guards against Panda silently skipping a file's styles.
//
// @mekari/pixel3-postcss only generates CSS for the css() calls Panda's parser
// finds. Panda reads a Vue <script> as TSX, so syntax that is fine for Vue but
// not for TSX (e.g. an arrow generic `const f = <T>(v: T) => v`, which TSX reads
// as a JSX tag) cuts the parse short: every css() call after it is dropped with
// no error, and the page renders with missing classes (the template builder
// lost its side-by-side layout this way). See docs/README.md → Styling.
//
// For each .vue file, every `const x = css({` declaration must be extracted.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadConfigAndCreateContext } from '@pandacss/node'

const root = resolve(__dirname, '..')
const files = execSync('git ls-files "*.vue"', { cwd: root }).toString().trim().split('\n').filter(Boolean)

const cases = files
  .map(file => ({ file, declared: (readFileSync(resolve(root, file), 'utf8').match(/^const \w+ = css\(\{/gm) || []).length }))
  .filter(c => c.declared > 0)

describe('Panda extracts every css() declaration', () => {
  let ctx: Awaited<ReturnType<typeof loadConfigAndCreateContext>>
  beforeAll(async () => {
    ctx = await loadConfigAndCreateContext({ cwd: root, configPath: resolve(root, 'tests/panda-extraction.config.mjs') })
  }, 120_000)

  it.each(cases)('$file', ({ file, declared }) => {
    const extracted = [...(ctx.project.parseSourceFile(resolve(root, file))?.css ?? [])].length
    expect(extracted, `${file}: Panda found ${extracted} css() calls but the script declares ${declared}. Look for TSX-hostile syntax such as \`<T>(v) =>\` (use \`function f<T>()\` instead).`).toBeGreaterThanOrEqual(declared)
  })
})
