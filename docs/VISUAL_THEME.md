# Visual Theme — Mockket

This document describes the visual language of Mockket so new screens feel consistent with the prototype. For token values (exact hex codes, spacing units, type scale) see `DESIGN_SYSTEM.md`. This document covers the *intent* behind those values — the mood, patterns, and rules that define how the app looks.

---

## Personality

**Dark, precise, alive.** Mockket looks like a Bloomberg terminal that has been stripped of everything corporate and replaced with personality. It should feel:

- **Serious** — real prices, real data, monospace numbers, no cartoonish decoration
- **Competitive** — agent colors, win/loss states, progress bars, live countdowns signal stakes
- **Approachable** — generous spacing, legible type, personality quotes from agents, not a wall of numbers

The aesthetic sits between a trading terminal and a sports app leaderboard. Finance-grade precision on top of a dark, high-contrast canvas.

---

## Surfaces (background hierarchy)

There are four elevation levels. Always go up exactly one level, never skip.

| Level | Color | Token | Use |
|---|---|---|---|
| Base | `#0F172A` | `bg.primary` | Screen background |
| Recessed | `#0D1526` | `bg.secondary` | Tab bar, bottom chrome, subtle insets |
| Card | `#1E293B` | `bg.surface` | Cards, panels, list items |
| Elevated | `#243044` | `bg.elevated` | Inputs, selected states, hover, chips |

The base (`#0F172A`) is a very dark blue-slate, not pure black. This is intentional — it reads warmer and makes the brand green pop without harsh contrast.

---

## Color Palette

### Brand / Accent

`#10B981` — Emerald green. This is the single accent color. Used for:
- Positive returns, gains
- Buy actions
- Active tabs, selected states, highlighted prices
- Brand buttons and CTAs

Tints:
- `rgba(16,185,129,0.12)` — subtle background fill (e.g. behind a green badge)
- `rgba(16,185,129,0.18)` — glow spread for cards that need emphasis

**Do not introduce a second accent color.** Green is the only primary accent.

### Positive / Negative

- **Positive / Up**: `#10B981` (same as brand — a deliberate choice; gains reinforce the brand color)
- **Negative / Down**: `#EF4444` (red-500)
- **Negative subtle background**: `rgba(239,68,68,0.12)`

Never use green/red for anything other than financial direction. Don't use them for decorative purposes.

### Warning / Alert

`#F59E0B` — Amber. Used for warnings, expiring recommendations, caution states. Also the color for Marcus ("The Bull") — his aggressive amber personality reinforces the meaning.

### Agent Identity Colors

Each agent has a signature color used for their avatar border, glow ring, and accent in their profile. These are fixed — don't change them.

| Agent | Color | Personality association |
|---|---|---|
| Marcus "The Bull" Chen | `#F59E0B` amber | Aggressive, high-energy, volatile |
| Priya Sharma | `#6366F1` indigo | Intellectual, steady, trustworthy |

V2 agents (pending design):
- HODL Hannah — likely a deep blue or slate (conviction, stoic)
- The Quant — cold cyan or steel (algorithmic, emotionless)
- The Degen — hot pink or lime (chaos, meme energy)
- Elena "The Steady" Park — warm teal or soft green (income, calm growth)

### Text

| Token | Color | Use |
|---|---|---|
| `text.primary` | `#F8FAFC` | Headings, prices, primary values |
| `text.secondary` | `#CBD5E1` | Supporting labels, descriptions |
| `text.muted` | `#94A3B8` | Metadata, timestamps, secondary stats |
| `text.dim` | `#64748B` | Placeholder text, disabled states, fine print |

### Borders

- `#334155` — standard card borders, dividers, input outlines
- `#1E293B` — subtle separators (borderSubtle; same as surface, creates a ghost border)

---

## Cards

The default card pattern:

```
background: #1E293B
border: 1px solid #334155
border-radius: 12px
```

**The border is always present.** Cards should never float borderless on the background — the 1px border at `#334155` gives them definition without harsh contrast.

### Glow cards

Cards that need visual emphasis (e.g. the active challenge, a hired agent) get a green glow:

```
box-shadow: 0 0 20px rgba(16,185,129,0.15)
```

Use sparingly — one or two glowing elements per screen max. If everything glows, nothing does.

---

## Typography

### Numbers and prices

All numeric values displaying money, percentages, or quantities use **tabular figures**:

```css
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum";
```

This prevents numbers from jumping width as they update. Apply this to any element showing live or changing numbers.

### Positive / negative treatment

- Positive numbers: `#10B981` with a `+` prefix (e.g. `+$2,341.18`)
- Negative numbers: `#EF4444` with a `-` prefix (e.g. `-$412.30`)
- Neutral / unchanged: `text.muted` (`#94A3B8`)

The prefix sign is always shown explicitly — never let the user infer direction from color alone.

### Section structure

Each content section on a screen follows this pattern:
1. Section label in `text.muted`, `font-size: 11px`, `font-weight: 500`, `letter-spacing: 0.8px`, `text-transform: uppercase`
2. Content below with `margin-top: 8px`

This creates a consistent rhythm where labels are clearly subordinate to content.

---

## Sparklines

Small inline charts used in market rows and portfolio headers follow these rules:

- **Line color**: green (`#10B981`) for positive, red (`#EF4444`) for negative
- **Gradient fill**: a vertical gradient from the line color at ~20% opacity at the top to transparent at the bottom
- **Grid lines**: faint horizontal lines at `rgba(255,255,255,0.04)` — present but nearly invisible
- **No axes, no labels** — sparklines are purely directional indicators, not data displays
- **Viewport**: no padding within the SVG viewBox; line touches the edges

The portfolio header sparkline is larger and shows the full account history. All other sparklines are thumbnail size (40–60px wide, 28–32px tall).

---

## Badges

Risk level badges follow a consistent shape and color system:

| Level | Background | Text | Border |
|---|---|---|---|
| `high` / `degen` | `rgba(239,68,68,0.15)` | `#EF4444` | `rgba(239,68,68,0.3)` |
| `medium` | `rgba(245,158,11,0.15)` | `#F59E0B` | `rgba(245,158,11,0.3)` |
| `low` | `rgba(16,185,129,0.15)` | `#10B981` | `rgba(16,185,129,0.3)` |

Shape: `border-radius: 9999px` (pill), `padding: 2px 8px`, `font-size: 11px`, `font-weight: 600`.

Status badges (e.g. `AUTOPILOT`, `ADVISORY`, `ACTIVE`) follow the same pill shape. `AUTOPILOT` uses the brand green. `ADVISORY` uses indigo. `ACTIVE` uses brand green.

---

## Agent cards

Agent cards in the marketplace and portfolio use this structure:
1. **Color ring** — a circular avatar with a border in the agent's signature color + a subtle matching glow (`box-shadow: 0 0 12px {agentColor}40`)
2. **Name + strategy** — name in `text.primary`, strategy tag in `text.muted`
3. **Win rate bar** — a horizontal progress bar showing win rate, filled in the agent's color
4. **Key stats** — return %, trade count, AUM in a row using tabular nums
5. **Hire / Hired badge** — brand green when hired, outlined when not

The agent's color is never used for large fills — always for accents, rings, and small indicators. This keeps the dark palette intact.

---

## Numeric formatting

| Type | Format | Example |
|---|---|---|
| Currency (large) | `$XXX,XXX.XX` | `$127,843.62` |
| Currency (small) | `$X,XXX.XX` | `$2,341.18` |
| Percentage change | `+X.XX%` / `-X.XX%` | `+1.86%` |
| Ticker | Uppercase, mono font | `NVDA`, `BTC` |
| Quantity (stocks) | Integer | `12 shares` |
| Quantity (crypto) | Up to 4 decimal places | `0.5 BTC` |
| Market cap | Abbreviated | `2.15T`, `394B` |

---

## Tab bar

- Background: `bg.secondary` (`#0D1526`) — slightly darker than the screen base
- Active tab: brand green icon + label, with a pill indicator underneath the active icon (`background: brandSubtle`, `border-radius: 9999px`)
- Inactive tabs: `text.dim` (`#64748B`)
- The pill indicator slides between tabs (animated, not a hard cut)
- Top border: `1px solid #1E293B` — a ghost line separating the bar from content

---

## Motion principles

- **Tab switching**: the active indicator pill slides horizontally (CSS `transition: left 200ms ease`)
- **Price updates**: numbers update in-place; no flash or fade animation — they just change. The tabular-nums CSS handles visual stability.
- **Overlays / sheets**: slide up from the bottom (`translateY` transition, ~300ms ease-out)
- **Nothing bounces**. No spring physics, no playful easing. Transitions are quick and linear-ish. This is a finance app.

---

## What not to do

- No gradients on backgrounds or cards (gradient fills are only in sparklines)
- No shadows on cards except the specific glow pattern above
- No colored backgrounds for full cards (agent colors on rings/accents only, never on card backgrounds)
- No light mode — the app is dark only
- No rounded corners above `border-radius: 16px` except pills (`9999px`)
- No icons for decoration — every icon carries meaning
- No empty animations or skeleton loaders that persist more than 1s
