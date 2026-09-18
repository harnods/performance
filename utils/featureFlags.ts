// ─────────────────────────────────────────────────────────────────────────────
// Build-time switches for features that are finished in code but not yet meant
// to be seen. Flip one to `true` to bring the feature back — nothing else needs
// touching, and the feature's own files stay in the repo (and under test) so it
// doesn't rot while it's hidden.
//
// These are NOT runtime/per-user flags: there's no backend here to serve them.
// Keep the list short, and delete a flag once its feature ships for good.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Talent directory pools — the pool tabs, "+ Add pool", PxAddPoolDrawer
 * (Describe/Build criteria builder), the "Showing …" summary strip, the AI
 * match-score column and PxMatchScoreDrawer.
 *
 * Hidden while the design is still being reviewed. With this off, the Talent
 * directory is just the "All talents" list: the tab bar isn't rendered at all,
 * so `activeTab` can never leave 'all' and every pool-only branch below it
 * (match score column, bulk-select checkboxes, summary strip, empty state) is
 * unreachable by construction rather than by a second flag check.
 */
export const TALENT_POOLS_ENABLED = false
