# Review Cycles — Audit link mati & gap vs repo produksi

Ruang lingkup: **List** (`review-cycles/index.vue`), **Cycle details** (`[id]/index.vue`),
**Timeframe details** (`[id]/timeframe/[timeframeId].vue`), komponen `ReviewerModals.vue`.
Dibandingkan dengan repo prod `~/talenta-performance` (`List.vue`, `Detail.vue`, `DetailCycle.vue`).

Catatan routing penting: di prod, **result & reviewer list = MODAL, bukan halaman**
(`ModalResult`, `ModalReviewerList`). Jadi "View result" harusnya buka modal, bukan route baru.
Tidak ada route assessment/result terpisah di area ini.

---

## 1. LINK MATI (DEAD) — elemen ada, tapi klik tidak melakukan apa pun

### List page (`review-cycles/index.vue`)
| Line | Label | Di prod jadi apa |
|---|---|---|
| 199 | Help center | link Guidebook eksternal |
| 200 | Watch tutorial | (Help popover) |
| 201 | Contact support | (Help popover) |
| 206 | Template settings | router-link ke `settings_template` |
| 243 | Open approval settings | tombol approval settings |
| 327 | Disable auto-repeat | prod: "Update repeat date cycle" (`ModalUpdate`) + Stop/Start automatic cycle |
| 330 | Lock review result | prod: Lock/Unlock (`ModalLockReview`) |

### Cycle details (`[id]/index.vue`)
| Line | Label | Di prod jadi apa |
|---|---|---|
| 1074 | Approval settings (header) | tombol approval settings |
| 1075 | Edit cycle (header) | router-link ke `review_cycle_edit` |
| 1114 | Pencil edit "Cycle name" | inline edit nama cycle (`Modal/inline`) |
| 1212 | View details (tabel non-extended) | *(path ini tidak ter-render karena `reincludeExtended=true`)* |
| 1688 | Add employee (empty state) | Add member / Upload member |

### Timeframe details (`[id]/timeframe/[timeframeId].vue`)
| Line | Label | Di prod jadi apa |
|---|---|---|
| 416 | Import employees | Add member/upload |
| 418 | Import reviewers | `ModalUpload` (import reviewer) |
| 419 | Import reviewer weight | route `review_cycle_import_reviewer_weight` |
| 420 | Import adjustment score | import adjustment score |
| 421 | Sync discipline data | Sync attendance data |
| 425 | Add employee (header) | Add member popover |
| 453 | Edit template (info row) | `ModalViewEditTemplate` |
| 602 | Remove employee (row) | **inkonsisten** — di cycle page (L1592) sudah jalan, di sini mati |

---

## 2. SETENGAH JADI (STUB) — handler ada tapi tidak berefek nyata

| File | Line | Label | Masalah |
|---|---|---|---|
| timeframe | 474 | Status filter | `statusFilter` di-bind tapi tidak dipakai di `filteredEmployees` → memilih status tidak mengubah tabel |
| ReviewerModals | 249 | View result | hanya toast (belum ada modal/halaman result) — prod: `ModalResult` |

---

## 3. GAP vs PROD — ada di prod, belum ada sama sekali di prototype

Diurut dari yang paling penting untuk menutup gap fungsional:

1. **Result / assessment modal** (`ModalResult` + `ResultBlock`/`ReviewResultContent`/`RatingList`) —
   render review yang sudah disubmit: goals, competencies, rating, AI summary, kalkulasi akhir.
   Target dari "View result" (employee & per-reviewer di dalam reviewer list). **Gap terbesar.**
2. **Publish score** (`ModalPublish`) + lifecycle skor (status "Completed" saat published).
3. **Lock / Unlock review result** (`ModalLockReview`).
4. **Edit indicator score** (`ModalIndicatorScore`).
5. **Adjustment score** (single + upload/import).
6. **Layering / Edit layered review order** (single + bulk) (`ModalLayeringReview`).
7. **Download PDF** (single / bulk / all + pilihan bahasa) — ini mekanisme export prod (tidak ada CSV export).
8. **Sync attendance data** (single / bulk / header).
9. **View selected goals** (`ModalPickGoals`).
10. **Assign reviewer** saat belum ada reviewer (`ModalAssignReviewer`) + Edit reviewer (single/bulk/upload).
11. **Add member** (single + upload) + **Invitation** modal (`ModalInvitation`) setelah add non-ESS.
12. **Bulk actions bar** (checkbox multi-select): Assign reviewer, Upload reviewer, Adjustment score,
    Edit layered review order, Download PDF, Sync attendance, Delete member.
13. **Edit cycle / View cycle / Edit cycle name (inline) / repeat-cycle config** + **Per-timeframe Approval toggle**
    (toggle approval ada di prototype tabel non-extended L1188, tapi di prod ada per-timeframe di Detail).
14. **Delete timeframe** di row kebab cycle details (prototype belum ada; prod ada bila >1 & belum published).
15. **Stop/Start automatic cycle** & **Update repeat date** (probation).
16. **Import reviewer weights** sebagai route khusus (`review_cycle_import_reviewer_weight`).
17. **Filter bersarang** org/branch/position/level multiselect (prototype: hanya search + status-stub).

---

## 4. BUKAN gap (prod juga tidak punya — jangan ditambah)
- **Send reminder / resend invitation** — tidak ada di prod (invite hanya via `ModalInvitation` setelah add member).
- **Export CSV / generic export** — prod hanya Download PDF.
- **Duplicate cycle** — tidak ada di 3 layar ini (duplikasi hanya di dalam create flow).

---

## Ringkasan angka
- **DEAD**: 7 (list) + 5 (cycle details) + 9 (timeframe) = **21 elemen** tanpa handler.
- **STUB**: 2 (status filter, View result).
- **Broken route**: 0 — semua `to`/`router.push` menuju halaman yang ada.
- **GAP fungsional vs prod**: 17 kelompok fitur (lihat bagian 3).
