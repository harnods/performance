// Dev flag (docs/patterns/dev-scenario-control.md): whether the IDP list shows the
// Import button. Hidden by default; toggled from the IDP list dev tools.
// Module-scope so the page and the dev tools share it. In-memory only.
const showImport = ref(false)
// Forces the import dropzone into an error state (dev tools): none = real behaviour.
export type IdpImportError = 'none' | 'too-large' | 'wrong-format'
const importError = ref<IdpImportError>('none')

export function useIdpImportFlag() {
  return { showImport, importError }
}
