import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import ts from 'typescript'

// composables/useWhatsNew.ts is a hand-edited changelog full of single-quoted prose. An unescaped
// apostrophe ("report's") breaks the whole file and the dev server answers every page with a 500,
// but nothing else imports the file in tests — so parse it here.
describe('What\'s new changelog', () => {
  it('has no syntax errors', () => {
    const source = readFileSync('composables/useWhatsNew.ts', 'utf8')
    const out = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ESNext } })
    const errors = (out.diagnostics ?? []).map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
    expect(errors).toEqual([])
  })
})
