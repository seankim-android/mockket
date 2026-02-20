# DESIGN_SYSTEM.md — Mockket Design System Reference

---

## Token Hierarchy

The design system is organized in four layers. Each layer builds on the one below it:

```
tokens (raw values)
  -> primitives (Box, Text, Stack — only layer that imports tokens directly)
    -> ui (Button, Card, Badge, Input, Sheet, Modal — built from primitives)
      -> domain (PortfolioCard, AgentAvatar, PriceTag, TradeRow — built from ui + primitives)
```

**The key rule:** Only primitive components (`Box`, `Text`, `Stack`) import directly from `@/design/tokens`. Everything else uses primitives or higher-level components. This creates a single choke point for design changes.

---

## Color Tokens

Colors are defined in `apps/mobile/src/design/tokens/colors.ts`. There are two layers:

1. **Palette** — raw hex values. These are private to the file and must **never** be used in components.
2. **Semantic tokens** — named by purpose. These are the only colors you should use.

### Semantic Color Groups

| Group | Tokens | Purpose |
|---|---|---|
| `colors.bg` | `primary`, `secondary`, `tertiary`, `surface` | Background colors. `primary` = darkest (slate900), `surface` = card/panel background (slate800). |
| `colors.text` | `primary`, `secondary`, `muted`, `inverse` | Text colors. `primary` = white, `secondary` = lighter gray, `muted` = dimmer gray, `inverse` = dark text on light bg. |
| `colors.brand` | `default`, `subtle`, `muted` | Brand green (emerald). `default` for buttons/accents, `subtle` for hover states, `muted` for faint backgrounds. |
| `colors.success` | (single value) | Green — confirmations, positive actions. |
| `colors.error` | (single value) | Red — errors, destructive actions. |
| `colors.warning` | (single value) | Amber — warnings, caution states. |
| `colors.positive` | (single value) | Green for charts — price up, gains. |
| `colors.negative` | (single value) | Red for charts — price down, losses. |
| `colors.border` | `default`, `subtle` | Border colors. `default` for visible dividers, `subtle` for faint separators. |

```typescript
import { colors } from '@/design/tokens'

// CORRECT
{ backgroundColor: colors.bg.surface, color: colors.text.primary }

// WRONG — using palette values directly
{ backgroundColor: '#1E293B', color: '#FFFFFF' }
```

---

## Typography Scale

Defined in `apps/mobile/src/design/tokens/typography.ts`.

### Font Size Scale (React Native units)

| Token | Value | Typical Use |
|---|---|---|
| `fontSize.xs` | 11 | Timestamps, fine print |
| `fontSize.sm` | 13 | Labels, captions, metadata |
| `fontSize.base` | 15 | Body text (default) |
| `fontSize.md` | 17 | Slightly emphasized body |
| `fontSize.lg` | 20 | Section headings |
| `fontSize.xl` | 24 | Screen headings |
| `fontSize['2xl']` | 28 | Large headings |
| `fontSize['3xl']` | 34 | Title text (portfolio value, etc.) |
| `fontSize['4xl']` | 40 | Hero numbers |

### Font Weight Values

| Token | Value | Use |
|---|---|---|
| `fontWeight.regular` | `'400'` | Body text |
| `fontWeight.medium` | `'500'` | Labels, subtle emphasis |
| `fontWeight.semibold` | `'600'` | Headings |
| `fontWeight.bold` | `'700'` | Titles, strong emphasis |

### Font Families

| Token | Value | Use |
|---|---|---|
| `fontFamily.sans` | `'System'` | All standard text (will be replaced with custom font later) |
| `fontFamily.mono` | `'Courier'` | Prices, numbers, code |

### Text Variants (via `<Text variant="...">`)

The `Text` primitive maps variant names to style combinations:

| Variant | Size | Weight | Use |
|---|---|---|---|
| `title` | 3xl (34) | bold | Screen titles, portfolio value |
| `heading` | xl (24) | semibold | Section headings |
| `body` | base (15) | regular | Default body text |
| `label` | sm (13) | medium | Form labels, metadata |
| `caption` | xs (11) | regular | Timestamps, fine print |
| `mono` | sm (13) | (mono font) | Prices, ticker symbols, numbers |

### Line Height and Letter Spacing

| Token | Value | | Token | Value |
|---|---|---|---|---|
| `lineHeight.tight` | 1.2 | | `letterSpacing.tight` | -0.5 |
| `lineHeight.normal` | 1.5 | | `letterSpacing.normal` | 0 |
| `lineHeight.relaxed` | 1.75 | | `letterSpacing.wide` | 0.5 |
| | | | `letterSpacing.wider` | 1 |

---

## Spacing System

Based on a **4pt grid**. Defined in `apps/mobile/src/design/tokens/spacing.ts`.

| Token | Value (px) | | Token | Value (px) |
|---|---|---|---|---|
| `spacing[0]` | 0 | | `spacing[5]` | 20 |
| `spacing[0.5]` | 2 | | `spacing[6]` | 24 |
| `spacing[1]` | 4 | | `spacing[8]` | 32 |
| `spacing[1.5]` | 6 | | `spacing[10]` | 40 |
| `spacing[2]` | 8 | | `spacing[12]` | 48 |
| `spacing[3]` | 12 | | `spacing[16]` | 64 |
| `spacing[4]` | 16 | | `spacing[20]` | 80 |
| | | | `spacing[24]` | 96 |

### Border Radii

| Token | Value | Use |
|---|---|---|
| `radii.none` | 0 | Sharp corners |
| `radii.sm` | 4 | Subtle rounding (badges) |
| `radii.md` | 8 | Standard cards, inputs |
| `radii.lg` | 12 | Larger cards, sheets |
| `radii.xl` | 16 | Modal containers |
| `radii['2xl']` | 24 | Prominent rounded elements |
| `radii.full` | 9999 | Circles, pills |

---

## Component Hierarchy

### `primitives/` — Foundation Layer

Located at `apps/mobile/src/components/primitives/`. These are the ONLY components that import from `@/design/tokens` directly.

| Component | What it does |
|---|---|
| `Box` | Thin wrapper around `View`. Accepts all `ViewProps`. Use for layout containers. |
| `Text` | Styled `Text` with `variant` and `color` props. Maps variant names to token-based styles. Default: `variant="body"`, `color="primary"`. |
| `Stack` | Flexbox layout helper. Props: `direction` (`row`/`column`), `gap` (spacing key), `align`, `justify`. Default: vertical column with no gap. |

### `ui/` — Reusable UI Components (to be built)

Located at `apps/mobile/src/components/ui/`. Must be built using primitives only.

- **Button** — pressable with variants (primary, secondary, ghost), sizes, loading state
- **Card** — surface container with padding, border radius, optional border
- **Badge** — small label (risk level, status indicator)
- **Input** — text input with label, error state, token-based styling
- **Sheet** — bottom sheet modal
- **Modal** — centered modal overlay

### `domain/` — Business-Specific Components (to be built)

Located at `apps/mobile/src/components/domain/`. Built from ui + primitives.

- **PortfolioCard** — shows portfolio value, P&L, cash balance
- **AgentAvatar** — agent identity with icon/image, name, risk badge
- **PriceTag** — ticker price display with positive/negative coloring
- **TradeRow** — single trade in a list (ticker, action, quantity, price, time)

---

## Naming Conventions

| What | Convention | Example |
|---|---|---|
| Component files | PascalCase `.tsx` | `Button.tsx`, `TradeRow.tsx` |
| Hook files | camelCase with `use` prefix | `usePortfolio.ts` |
| Utility files | kebab-case `.ts` | `format-currency.ts` |
| Token files | kebab-case `.ts` | `colors.ts`, `spacing.ts` |
| Directories | kebab-case | `src/features/`, `marcus-bull-chen/` |

---

## Do / Don't

| Do | Don't |
|---|---|
| `{ color: colors.text.primary }` | `{ color: '#FFFFFF' }` |
| `{ padding: spacing[4] }` | `{ padding: 16 }` |
| `{ borderRadius: radii.md }` | `{ borderRadius: 8 }` |
| `<Text variant="heading">Title</Text>` | `<RNText style={{ fontSize: 24, fontWeight: '600' }}>Title</RNText>` |
| `<Stack gap={3} direction="row">` | `<View style={{ flexDirection: 'row', gap: 12 }}>` |
| Import `colors` from `@/design/tokens` | Import from `@/design/tokens/colors` (use barrel export) |
