// Shared row-selection state for the goal-listing tables (All/Company/
// Organization/Team/Individual goals) — same shape reused on every page so
// the bulk-action bar behaves identically everywhere. The Select column
// itself is always rendered (no toggle) — this just tracks which ids are
// checked.
export function useGoalBulkSelect() {
  const selectedIds = ref<Set<string>>(new Set())
  const selectedCount = computed(() => selectedIds.value.size)

  function isSelected(id: string) {
    return selectedIds.value.has(id)
  }
  function toggleSelect(id: string) {
    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }
  function isAllSelected(ids: string[]) {
    return ids.length > 0 && ids.every(id => selectedIds.value.has(id))
  }
  function toggleSelectAll(ids: string[]) {
    selectedIds.value = isAllSelected(ids) ? new Set() : new Set(ids)
  }
  function clearSelection() {
    selectedIds.value = new Set()
  }

  return {
    selectedIds,
    selectedCount,
    isSelected,
    toggleSelect,
    isAllSelected,
    toggleSelectAll,
    clearSelection,
  }
}
