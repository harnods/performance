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

## Overlapping stack with per-avatar hover card

When each avatar in a collection needs its own hover card, **hand-roll the stack — do
not use `MpAvatarGroup`**: it clones its direct children to inject size/spacing/border,
which breaks once every avatar is wrapped in its own `MpPopover` trigger.

```ts
const avatarStack = css({ display: 'flex', alignItems: 'center' })
const avatarStackItem = css({ position: 'relative', display: 'flex', _notFirst: { marginLeft: '-8px' } })
const avatarRing = css({ display: 'flex', borderRadius: 'full', borderWidth: '2px', borderStyle: 'solid', borderColor: 'background.surface' })
const hoverCard = css({ display: 'flex', alignItems: 'center', gap: '3', padding: '3' })
```

```vue
<div :class="avatarStack">
  <div v-for="e in visible" :key="e.id" :class="avatarStackItem">
    <MpPopover trigger="hover" use-portal placement="top">
      <MpPopoverTrigger>
        <div :class="avatarRing"><MpAvatar size="md" :name="e.name" :src="e.photo" variant-color="gray" /></div>
      </MpPopoverTrigger>
      <MpPopoverContent>
        <div :class="hoverCard">
          <MpAvatar size="lg" :name="e.name" :src="e.photo" variant-color="gray" />
          <MpFlex direction="column" gap="0">
            <span :class="hoverCardName">{{ e.name }}</span>
            <span :class="hoverCardMeta">{{ employeeMeta(e) }}</span>
          </MpFlex>
        </div>
      </MpPopoverContent>
    </MpPopover>
  </div>
</div>
```

The hover card itself follows the `lg` rule above — it *is* a full identity block.

## Overflow — cap the stack at 6 slots, then "+N" opens a modal

A stack of people shows at most **5** real avatars; the 6th slot is always the
overflow indicator once there's anyone left over (6 slots total). The remainder
collapses into a counter circle wrapped in a button that opens a modal listing
everyone (`MpAvatar size="lg"` + name + `employeeMeta()` per row, each row
separated by a 1px bottom border except the last, 16px gap between rows). Never
render an unbounded stack.

```ts
const OWNER_AVATAR_CAP = 5
const visibleOwners = computed(() => owners.value.slice(0, OWNER_AVATAR_CAP))
const hiddenOwnerCount = computed(() => Math.max(0, owners.value.length - OWNER_AVATAR_CAP))
```

**Don't pass the count to `MpAvatar`'s `name` prop** (e.g. `:name="`+${n}`"`) — its
`getInitial()` splits on a space and takes the first letter of each word, so `"+9"`
collapses to just `"+"` (the digit is silently dropped). Hand-roll the counter
circle instead, matching `MpAvatar size="md"`'s ACTUAL rendered footprint —
verify with `getComputedStyle()`, don't trust the token recipe on paper: it
reads 32px/`fs_sm`, but this build renders `size="md"` at **24px / 14px font**.
Match whatever you measure, or the counter renders visibly larger than its
neighbors.

```ts
const avatarCountCircle = css({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '24px', height: '24px', borderRadius: 'full',
  background: 'gray.50', color: 'gray.600',
  fontSize: '14px', fontWeight: '600', userSelect: 'none',
})
```
```vue
<div :class="avatarRing"><span :class="avatarCountCircle">+{{ hiddenOwnerCount }}</span></div>
```

**Don't use `MpAvatarGroup` when avatars need their own hover popover** — tried
it (wrapping each `MpPopover` as the group's slot child): `MpAvatarGroup`
clones its slot children to inject size/spacing/border/cap, and that cloning
breaks once the child is a `MpPopover` instead of a bare `MpAvatar` — the cap
stops being enforced (all avatars render, unbounded) and the excess bubble
never appears. Confirmed live, not a guess. Hand-roll the stack instead (as
above) and imitate `MpAvatarGroup`'s own look manually: `avatarRing`'s 2px
white border is its border-on-clone behavior, `avatarStackItem`'s `-8px`
`marginLeft` is its default `spacing: -2` overlap.

**Don't trust `MpAvatarGroup`'s `max` prop at all in this codebase** — even for a
plain bar with no hover card. `AddGoalDrawer.vue`'s "Goal owner" summary used
`<MpAvatarGroup :max="5"><MpAvatar v-for="o in owners" .../></MpAvatarGroup>` and,
confirmed live with 26 owners, it rendered all 26 unbounded — no excess bubble ever
appeared. The `v-for`'d slot children aren't capped the way the component's own
`getChildren()`/`slice(0, max)` logic expects in this build. Always hand-roll the
5-avatar-then-"+N" stack (as above) instead, even for the "plain" case.

Reference: `goal-cycles/[id]/new.vue` (goal owners bar, hand-rolled),
`AddGoalDrawer.vue` (`goal-owner-avatars`, now hand-rolled — `OWNER_AVATAR_CAP`,
`visibleOwners`, `hiddenOwnerCount`, `ownerAvatarStack`/`ownerAvatarRing`/
`ownerAvatarCountCircle`), `GoalSubmissionReview.vue`
(members & contributors — hover stack, no overflow cap).

## Rule

- Avatar + full identity block (name + id + job + org) → `size="lg"`.
- Otherwise size follows the local context; don't blanket-apply `lg`.
- Per-avatar hover card, or a capped `v-for` stack of any kind → hand-rolled stack,
  never `MpAvatarGroup` — its `max` prop doesn't cap `v-for`'d slot children.
- More than 5 people in a stack → cap at 6 slots (5 avatars + 1 counter) + view-all modal.
- The counter circle is hand-rolled `css()`, never `MpAvatar :name="'+N'"` — its
  initials logic drops everything but the first character.
