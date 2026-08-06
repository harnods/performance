# Avatar

## Size beside an employee identity block → `size="lg"`

Whenever an `MpAvatar` sits next to a person's **full identity block** — their
**name + employee ID + job position + organization/department** (stacked lines, or
`id · title · dept` / `id | title | dept`, typically via `employeeMeta(e)`) — it is
**`size="lg"`**. No exceptions.

```vue
<MpFlex align="center" gap="2">
  <MpAvatar :id="e.id" :name="e.name" :src="e.photo" size="lg" variant-color="gray" />
  <MpFlex direction="column" gap="0">
    <span :class="personName">{{ e.name }}</span>
    <span :class="personMeta">{{ employeeMeta(e) }}</span>   <!-- id · title · dept -->
  </MpFlex>
</MpFlex>
```

Canonical examples: `SelectEmployeesDrawer.vue`, `EmployeeDirectoryModal.vue`,
`ReviewerModals.vue`, `GoalCategoryLinkedGoals.vue`, `AddGoalDrawer.vue` (goal members
& contributor), `goal-cycles/[id]/index.vue` (owner accordion header).

## When the lg rule does NOT apply

- **Name only / name + a single attribute** (e.g. `Name (code)` inline, or name + id only,
  or name + title only) — not the full block. Size is context-driven; `md` is common. Don't
  force `lg`.
- **Avatar-only stacks / `MpAvatarGroup`** summarising a collection (no per-person identity
  beside each avatar) — keep the group's own size (`md`/`sm`).
- **Table cell with just a name**, matrix markers, the profile **hero** header (`xl`), and the
  global user menu (already `lg`).

## Rule

- Avatar + full identity block (name + id + job + org) → `size="lg"`.
- Otherwise size follows the local context; don't blanket-apply `lg`.
