import { EMPLOYEES, type Employee } from '~/utils/employees'

// Dev flags (docs/patterns/dev-scenario-control.md) for the IDP import page.
// Module-scope so the page and the dev tools share them. In-memory only.
// Forces the import dropzone into an error state (dev tools): none = real behaviour.
export type IdpImportError = 'none' | 'too-large' | 'wrong-format' | 'too-many-rows'
const importError = ref<IdpImportError>('none')

// Import page scenario (dev tools): default = real behaviour; loading = step 2 stays on the
// "Generating template..." loader so it can be inspected.
export type IdpImportScenario = 'default' | 'loading'
const importScenario = ref<IdpImportScenario>('default')

// Employee pool in the step-1 picker drawer (its own dev button): default = the real seed;
// over-limit = a fabricated pool bigger than the 500-employee cap, so Load more / Select all
// can be walked past 500. Fabricated rows are tagged by id prefix (dev-scenario-emp-…).
export type IdpImportPool = 'default' | 'over-limit'
const importPool = ref<IdpImportPool>('default')
const OVER_LIMIT_POOL_SIZE = 612
const importPoolEmployees = computed<Employee[]>(() => {
  if (importPool.value === 'default') return EMPLOYEES
  return Array.from({ length: OVER_LIMIT_POOL_SIZE }, (_, i) => {
    const base = EMPLOYEES[i % EMPLOYEES.length]
    if (i < EMPLOYEES.length) return base
    return { ...base, id: `dev-scenario-emp-${i}`, name: `${base.name} ${Math.floor(i / EMPLOYEES.length) + 1}`, code: `CP${1000 + i}` }
  })
})

// Which step the import wizard is on (set by StepImportPage) so the dev tools can show step-2 controls only there.
const importStep = ref<1 | 2>(1)

export function useIdpImportFlag() {
  return { importError, importScenario, importStep, importPool, importPoolEmployees }
}
