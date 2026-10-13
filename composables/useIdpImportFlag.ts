// Dev flags (docs/patterns/dev-scenario-control.md) for the IDP import page.
// Module-scope so the page and the dev tools share them. In-memory only.
// Forces the import dropzone into an error state (dev tools): none = real behaviour.
export type IdpImportError = 'none' | 'too-large' | 'wrong-format'
const importError = ref<IdpImportError>('none')

// Import page scenario (dev tools): default = real behaviour; loading = step 2 stays on the
// "Generating template..." loader so it can be inspected.
export type IdpImportScenario = 'default' | 'loading'
const importScenario = ref<IdpImportScenario>('default')

// Which step the import wizard is on (set by StepImportPage) so the dev tools can show step-2 controls only there.
const importStep = ref<1 | 2>(1)

export function useIdpImportFlag() {
  return { importError, importScenario, importStep }
}
