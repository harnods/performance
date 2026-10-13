# Builder modal (full-size, two-pane)

A full-screen editor for a record made of many repeatable blocks, where the
settings that shape those blocks live beside them. One exists today: the review
**template builder** (`components/template/ModalForm.vue` +
`components/template/TemplateForm.vue`), migrated 1:1 from production. Don't
pick this shape for new work — [`page-form.md`](page-form.md) says new
create/edit flows are full pages. Use it only to keep parity with a production
screen that already is one.

## Shell — `MpModal size="full"`

- **Colours (match production):** header `background.neutral` (white, not Pixel's
  grey default); `Template library` / `Preview` are secondary buttons with
  `text.link` text and icon (`'& svg': { color: 'text.link' }`); every "Add …" ghost
  button and "Add category" are `text.link` too; the indicator box and the
  category footer bar use `gray.25` (`rgb(248, 249, 251)`, no semantic token is
  this light). The settings panel's left border is `border.default`, set with explicit `borderLeftColor` / `borderTopColor` (use `borderLeftWidth`/`borderStyle` longhands: a `borderLeft: '1px solid'` shorthand resets the colour to black). Template name keeps its required asterisk.
- **Header** carries the title **and** the actions, right-aligned in production
  order: `Reset` (ghost) → `Template library` (secondary, `left-icon="book"`)
  → `Preview` (secondary, `left-icon="show"`) → `Save` (primary), then the
  `MpModalCloseButton`. The header row is `width: calc(100% - 48px)` so the
  buttons clear the close button. No footer.
- `MpModalContent` is a `height: 100vh` flex column; `MpModalBody` gets
  `padding: 0`, `flex: 1`, `minHeight: 0`, `overflow: hidden`, so each pane
  scrolls on its own.
- Closing (X) **always** asks first ("Cancel creating/editing template?" →
  `Keep template` ghost + `Discard …` danger). Esc is off
  (`:is-close-on-esc="false"`) so a stray key can't skip that confirmation.

## Two panes

| Pane | Style | Holds |
|---|---|---|
| Canvas (left, `flex: 1`) | `background.surface`, `overflowY: auto`; inner column `maxWidth: 684px`, centred, `paddingY: 10` | The repeatable blocks + the sections they feed (Overall ratings, Define points, Legends) |
| Settings (right) | `width: 356px` from `md` (100% below), `background.neutral`, 1px `border.default` left border, `padding: 6`, `gap: 6`, `overflowY: auto` | Name (with `n / 60` counter), radio groups, the option checkboxes |

Below `md` (768px) the panes **stack** (canvas, then settings with a top border) and the
modal body scrolls instead — the root flips to `flexWrap: 'wrap'` with
`height: 'auto'`, matching production's `['auto', 'auto', 'calc(100vh - 63px)']`.

Canvas sections are **white cards** (`background.neutral`, 1px `border.default`,
`radius: md`, `padding: 4`). That breaks the "no cards for form sections" rule on
purpose — it's production's look, kept for parity and logged as design-system
debt. Don't copy it into a page form.

A repeatable block (category) is a card with:
- a centred drag handle on top (`drag` icon rotated 90°),
- its fields, then a nested list of sub-items on `background.neutral.subtle`
  (indicators, each with its own left drag handle and a ghost `minus-circular`
  remove),
- a `background.neutral.subtle` footer bar (border-top) with the block-level
  checkbox and a ghost `Delete category`,
- a **2px `border.danger`** border plus an inline `text.danger` line when the
  block fails a cross-field rule (indicator weights ≠ 100%).

"Add …" actions inside the canvas are ghost `left-icon="add-circular"` buttons;
the block-level "Add category" is a full-width secondary button.

## View-only

When the viewer can't edit (a Talenta default template), the same builder opens
with a `MpBanner variant="warning"` "You can only view this template." at the top
of the canvas, both panes get `pointerEvents: 'none'`, and Reset / Template
library / Save are disabled. Preview stays enabled.

## Sub-modals are siblings, not children

Preview, Template library, preset detail and the Cancel / Reset confirmations
are mounted **next to** the builder `MpModal` in the same component, never
inside its content — see [`modal.md`](modal.md#stacking-modals--mount-them-as-siblings).
The form exposes `form`, `is_use_weight` and `currentLegendsData` via
`defineExpose` so the sibling preview can read them.

## Validation

Same rules as [`buttons.md`](buttons.md): Save is never disabled for an editable
template. On Save each child (`CategoryForm`, `RatingList`, `PointList`,
`LegendListForm`) runs its exposed `validate()`; any failure → inline errors only,
**no toast** for empty required fields (a deliberate deviation from `buttons.md`). Cross-field rules (weights add to 100%,
last legend reaches the max rating) toast their own message after that.

## Preview (`ModalTemplatePreview`) — measured off production

Measured with `getComputedStyle` on `review.talenta.co/settings/template`; keep these exact.

- Frame: `MpModalContent` with a 4px `amber.400` border (`#F59E0B`) on `background.surface`;
  sticky "Exit preview" tab (`amber.400`, **square corners**, 16px × 8px padding, 14/600, 4px
  icon gap, 40px tall) centred at the top.
- Stage: 684px wide, `marginTop: 40px` under the tab, children in a flex column with
  **16px** gap. Don't put `white-space: pre-wrap` on the stage — it turns template
  whitespace around `PxSelectPopover` into extra lines (a 38px select became 78px). Apply it
  only to the user-text elements (category name, description, indicator text).
- Category card: `gray.100` border (`#D0D6DD`, not `border.default`), 6px radius, white. Header
  `gray.25`, 16px padding, 20/600/32 title with the weight in violet (`(40%)`), optional 14/20
  `text.secondary` description. Body 16px padding, **20px** gap (explicit px: token `5` is 20.8px).
- Indicator: 14/**24** text, select 8px below (38px tall) = 70px block. Comment: label 4px above an
  80px textarea = 104px block.
- Summary card: same border/radius, 16px padding, 20px gap. "Legends" 14/24/600 with 8px below;
  legend items `gap: 8px`, 12px swatch with 4px radius, row/column gap 8/16.
- Violet weight text is `rgb(139, 92, 246)` in production; DT 2.4 has no matching token
  (`violet.400` is `#9F91E3`), so the nearest token is used. Design-system debt.
- The builder's cards use `gray.100` borders too, like production.

### What the preview shows per question type (verified against production)

Verified by switching types in the production builder (unsaved) and reading the preview DOM.
Block heights are per indicator (24px question text + 8px gap + control):

| Setting | Control per indicator | Block | Summary card |
|---|---|---|---|
| Free text | textarea, **89px** | 121px | Summary only |
| Yes or no | inline Yes / No radios, 40px apart | 68px (36px control) | Summary only |
| Rating | select ("Select rating", `1 - description`) | 70px | Summary + Legends |
| Rating + layered scoring | select + "Input point" field (placeholder = rating's `from - to`) | 70px | Summary + Legends |
| Rating + rating per indicator | select reads the indicator's own ratings | 70px | Summary + Legends |
| Percentage | slider (`0%` … `100%`) + 100px `%` input; slider hidden when "Allow value more than 100%" | 70px (38px row) | Summary + Legends |
| Point | select of point descriptions only (no number) | 70px | Summary + Legends |
| Custom | each indicator renders by **its own** type | per type | Summary only (no legends) |

- Use weight adds `(n%)` after category and indicator text (violet).
- Free text indicator adds a trailing category card with no Comment field (the textarea sits where the
  indicator text would be).
- Allow negative indicator adds a "Negative indicator" card (`gray.100` border, 16px padding/gap, item box
  `gray.25`, "Add indicator" link 34px tall) before the Summary card.
- Score for goal only replaces the categories with a plain blue notice (no banner icon, 12px padding)
  and two "Goal example" cards.
- The rating table (`SummaryFooter`'s `isRating`) is **not** shown in the preview — production never
  passes the prop. Don't add it.
- Pixel 3's `MpSlider` always renders label / value / min / max captions; pass empty slots to drop
  them (`components/form/SliderBar.vue`). Production's value-in-thumb pill has no Pixel 3 equivalent.

### Legends range inputs

For a **Percentage** question type both legend range inputs (`from` – `to`) carry a `%` right addon
(`MpInputGroup` + `MpInputRightAddon`, field widened 70 → 96px). Rating and Point legends stay unitless.
Reference: `components/template/LegendListForm.vue` (`isPercent`).

### Legend label (rating / percentage / point)

A settings-panel block of its own (sibling of "Additional for … type", so the 24px panel gap separates them,
the same rhythm as Question type → Additional). `MpFormControl` + `MpFormLabel` "Legend label" +
`PxSelectPopover` (`allow-custom-value`, 30 chars, placeholder `Select or type legend label`; **no caption**),
then **8px** below an `MpCheckbox` "Set as default" (one line).

- **Prefilled with "Legends"**. The popover lists "Legends" first, then the user's saved labels; only saved
  labels have a small ghost `MpButton size="sm"` with a small `minus-circular` `MpIcon` on the right (`MpTooltip` "Remove", `@click.stop`, via the `#option`
  slot). Removing a label never closes the template.
- **The default label carries a badge** next to its text in the list: `MpBadge for="tableStatus"
  type="announcement" size="sm"` "Default". "Legends" is the default until the user sets another one.
- Saving a template saves a custom label to the list (mock: `useReviewTemplateStore` `savedLegendNames`).
- The label replaces the "Legends" title in the builder section and in the preview summary card
  (`LegendList` `title` prop) and is part of the payload (`legend_name`).
- **Field behaviour (`keep-text-on-focus`):** focusing the field keeps the selected label (no wipe to the
  placeholder) and swaps the chevron for a filled `MpIcon name="error" variant="fill"` (x) **only while focused**. The (x) empties the
  value, keeps the field focused and the popover open, so typing a new label works straight away (the
  `Add “…”` row appears as usual). Blur restores the chevron. Removing the *currently selected* saved label from
  the popover also empties the field (placeholder shown); removing another label leaves the value alone.
- **Validation:** an empty field on Save shows the error state with `MpFormErrorMessage` "You must select legend
  label"; it clears once a label is chosen. Only when the
  block is visible and not view-only.
- **Checkbox rules:** "Set as default" with a one-line `#description` caption "Applies to every template you create". It is **hidden whenever the selected label already is the default** — at first that is "Legends", so a
  fresh template shows no checkbox; later it is hidden on the saved default label too. Selecting any other
  label reveals it (unticked); changing the label back to the default hides it again. Ticking and saving makes
  the label the company default (`nextLegendName`), toast "Default legend label saved"; **a new template starts
  with the default label and no checkbox**. To change the default later, pick another label (or "Legends" to go
  back) and tick the box.
- Copy follows the Mekari UXW library: sentence case, no periods.
