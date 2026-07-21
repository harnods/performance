// Detects whether a goal table actually needs to scroll horizontally, so
// the sticky first/last column only turns on (position:sticky + its
// boundary shadow) when it's actually pinning something during a scroll —
// not unconditionally, which made it look "stuck" even on a table that
// fully fits its container. Attach `wrapperRef` to the table's outer
// (non-scrolling) border div; this reads the first <table> inside it,
// since on accordion pages every department's table shares the same
// column widths, so checking any one of them is equivalent to checking all.
export function useTableHorizontalScroll() {
  const wrapperRef = ref<HTMLElement | null>(null)
  const hasOverflow = ref(false)

  let observer: ResizeObserver | null = null
  let observedTable: Element | null = null

  function check() {
    const wrapper = wrapperRef.value
    const table = wrapper?.querySelector('table') ?? null
    hasOverflow.value = !!wrapper && !!table && table.scrollWidth > wrapper.clientWidth

    if (table !== observedTable && observer) {
      if (observedTable) observer.unobserve(observedTable)
      if (table) observer.observe(table)
      observedTable = table
    }
  }

  onMounted(() => {
    observer = new ResizeObserver(check)
    if (wrapperRef.value) observer.observe(wrapperRef.value)
    check()
    window.addEventListener('resize', check)
  })
  onUnmounted(() => {
    observer?.disconnect()
    window.removeEventListener('resize', check)
  })

  return { wrapperRef, hasOverflow }
}
