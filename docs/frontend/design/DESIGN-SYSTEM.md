# Design System - Desk Booking (Camerfirma Edition)

Version: v1.0.0
Scope: Frontend UI consistency
Brand base: Camerfirma (Tinexta Infocert)

---

## 1. Philosophy

Internal corporate product. Priorities:

- Clarity over decoration
- Consistency over novelty
- Accessibility first
- Functional UX over visual noise
- Brand alignment without visual overload

---

## 2. Color System

### 2.1 Brand Primary Scale

Derived from Camerfirma visual identity.

| Token | Hex |
| --- | --- |
| primary-50 | #E6F3F8 |
| primary-100 | #CDE7F1 |
| primary-200 | #9FD0E3 |
| primary-300 | #70BAD5 |
| primary-400 | #419FC3 |
| primary-500 | #17647E |
| primary-600 | #195C73 |
| primary-700 | #144B5D |
| primary-800 | #0E3A5B |
| primary-900 | #0A2C45 |

Usage:

- primary-500 -> primary actions
- primary-600/700 -> hover/active states
- primary-50/100 -> soft backgrounds
- primary-800 -> top bars and emphasis containers

### 2.2 Neutral Scale

| Token | Hex |
| --- | --- |
| neutral-50 | #F8FAFB |
| neutral-100 | #F1F5F7 |
| neutral-200 | #E2E8EC |
| neutral-300 | #CBD5DB |
| neutral-400 | #94A3B0 |
| neutral-500 | #64748B |
| neutral-600 | #475569 |
| neutral-700 | #334155 |
| neutral-800 | #1F2937 |
| neutral-900 | #111827 |

Usage:

- App background -> neutral-50
- Surfaces/cards -> white or neutral-100
- Borders/dividers -> neutral-200
- Secondary text -> neutral-500

### 2.3 Functional Colors

| Type | Hex |
| --- | --- |
| success | #15803D |
| warning | #B45309 |
| error | #B91C1C |
| info | #2563EB |

Rule: functional semantics never replaced by brand colors.

---

## 3. Typography

Font stack: Inter, system-ui, sans-serif.

Scale:

- h1 -> 28px / semibold
- h2 -> 22px / semibold
- h3 -> 18px / medium
- body -> 14-16px
- small -> 12px

Text colors:

- Primary text -> neutral-800
- Secondary text -> neutral-500

---

## 4. Spacing

4px scale only:

- 4, 8, 12, 16, 24, 32, 40, 48

No arbitrary spacing values without documented exception.

---

## 5. Radius

- Buttons -> 8px
- Inputs -> 8px
- Cards -> 12px
- Modals -> 16px

---

## 6. Shadows

- Cards -> subtle (`shadow-sm` equivalent)
- Modals/popovers -> medium (`shadow-lg` equivalent)

Avoid heavy marketing-style shadows.

---

## 7. Component Variants

### Primary button
- bg: primary-500
- hover: primary-600
- text: white

### Secondary button
- bg: white
- border: neutral-300
- hover: neutral-100

### Destructive button
- bg: error
- hover: darker error tone
- text: white

---

## 8. Accessibility Contract

Mandatory baseline:

- WCAG AA contrast minimum
- Color is never the only indicator
- Visible focus state in all interactive controls
- Keyboard navigation supported in dialogs, menus, forms

Verification checklist:

- Contrast >= 4.5:1 for normal text
- Contrast >= 3:1 for large text and UI controls
- Focus outline visible in light and dark backgrounds
- Error states include text/icon, not color only

---

## 9. Dark Mode (Optional)

If enabled:

- Background -> neutral-900
- Surface -> neutral-800
- Primary text -> neutral-100
- Brand action -> primary-400

---

## 10. Implementation Contract (Tailwind)

### 10.1 Tokens in theme

Define tokens in `tailwind.config.*` under `theme.extend.colors`:

- `primary.*`
- `neutral.*`
- `success`, `warning`, `error`, `info`

### 10.2 Semantic aliases

Expose semantic utility aliases at component level (recommended):

- `bg-surface`, `bg-surface-muted`
- `text-primary`, `text-muted`
- `border-default`
- `bg-action-primary`, `bg-action-danger`

Rule: components consume semantic aliases; raw palette tokens only in design primitives.

### 10.3 Forbidden patterns

- Inline hex in components
- Ad-hoc colors not present in design tokens
- One-off spacing/radius values not in scale

---

## 11. Governance

- Any new token requires doc update in this file.
- Any deviation requires rationale in PR.
- Keep brand usage subtle and consistent with corporate context.

---

End of document
