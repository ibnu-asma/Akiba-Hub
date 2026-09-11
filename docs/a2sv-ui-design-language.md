# A2SV Hub — UI Design Language

Extracted from the reference Hub screenshots. Every new screen must comply; this
file is the contract the implementation is checked against.

## Tokens (apps/web/src/app/globals.css)

| Token | Value | Notes |
| --- | --- | --- |
| Font | Poppins 400/500/600/700 | `--font-sans`, loaded via Google Fonts import |
| Primary green | `#0FA958` (`a2sv-500`) | buttons, active states, focus rings |
| Hover green | `#0C9149` (`a2sv-600`) | primary button hover |
| Tint | `#ECF9F0` (`a2sv-50`) | active nav pill, tinted cards, icon squares |
| Banner gradient | `#C8F5D4 → #A9ECC0` | quote banner, register-invite header band |
| Status semantics | green=present/solved · red=absent/unsolved · yellow=excused · blue=late | locked — never repurpose |

## Surfaces

- Page background: **white**. Cards: white, `1px` hairline `slate-200` border,
  `20px` radius, **flat** (no drop shadows except the primary-button glow).
- Tinted variant `.card-tint`: green tint + `a2sv-100` border (Recent Actions,
  highlights).
- Radii: cards 20px, inputs/buttons 12px, chips/pills fully rounded.

## Components (`apps/web/src/components/form/field.tsx`)

- `OutlinedInput` / `OutlinedSelect` — Material-style outlined fields:
  empty+unfocused → label centered on the border, placeholder inside;
  filled/focused → label floats (green when focused); error → red border, red
  label, red helper text. Required fields show a red `*`.
- `Checkbox` — native checkbox, green `accent-color`.
- `SelectUser` (`form/select-user.tsx`) — searchable user combobox: trigger with
  chevron + clear `✕`, panel with search input, avatar rows (group · role meta),
  light-green hover, check on active. `multiple` → removable green chips.

## Chrome

- **Sidebar**: default-avatar circle with green online dot → HUB logo + role
  label → UPPERCASE section titles (uppercase via CSS, text unchanged) →
  icon+label items; active = light-green pill. Sticky on desktop (w-72),
  drawer behind a hamburger on mobile (`< lg`).
- **Top bar**: search input left; sparkle, bell (+red dot when unread), avatar
  with green dot, divider, logout right.
- **FAB**: floating green settings button bottom-right (≥ sm screens).

## Dashboard widgets

- **Quote banner**: light-green gradient, giant uppercase role watermark behind
  (hidden on mobile), quote + author, "Welcome back, {First}!", green
  **Problems** CTA, 🚀 accent.
- **Stat card**: label → green delta pill (`↘ 0.0%`) → big value (+ suffix) →
  hint line → colored bar sparkline (green/blue/orange per card).
- **Events**: card with tinted calendar icon rows; empty state = 🚀 + "NO NEW
  EVENT".
- **Recent Actions**: tinted green cards, green bold `ACTION - <date>` header,
  avatar + online dot, role chip, description.

## Do / Don't

- Do use the shared component classes (`.card`, `.btn-primary`, `.field-*`);
  don't hand-roll new input styles per screen.
- Don't introduce shadows on cards or a second accent color per feature.
- Don't redefine status colors — the green/red/yellow/blue semantics are locked.
