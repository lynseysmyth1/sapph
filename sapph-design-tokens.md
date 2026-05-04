# Sapph — Design Tokens Reference

A reference guide for all colours, typography, spacing, shadows, and border radii used across the Sapph app.

---

## Colours

### Brand Colours (CSS custom properties in `src/index.css`)

| Token | Hex | Usage |
|---|---|---|
| `--sapph-orange` | `#F06B4A` | Primary brand colour — buttons, headings, links, icons, active states |
| `--sapph-orange-hover` | `#D85A3C` | Hover/pressed state for orange buttons |
| `--sapph-bg` | `#FFFFFF` | App background |
| `--sapph-white` | `#FFFFFF` | Explicit white (cards, modals, overlays) |
| `--sapph-text-body` | `#555555` | Default body text |

### Semantic / Named Colours (used directly in CSS files)

| Value | Usage |
|---|---|
| `#333333` | Dark headings, sign-in panel titles |
| `#555555` | Body copy (mirrors `--sapph-text-body`) |
| `#666666` | Secondary text, captions, muted content |
| `#888888` | Placeholder text, hints, step labels, muted labels |
| `#999999` | Disabled-state text, tertiary labels |
| `#CCCCCC` | Photo placeholder avatar letter, input borders (light) |
| `#DDDDDD` | Input borders, tag borders, faint dividers |
| `#EEEEEE` | Dividers, input borders, card borders |
| `#F5F5F5` | Surface backgrounds — filter chips, photo placeholder sections |
| `#F9F9F9` | Form input background (onboarding) |
| `#FAFAFA` | Input background (light variant) |
| `#FFFFFF` | Cards, modals, sheet overlays |

### Tinted Brand Surfaces

| Value | Usage |
|---|---|
| `#FEF0EC` | Light orange tint — conversation starter card, intimacy section background, action button highlight |
| `#FFF5F2` | Very light orange — selected option chip background, sign-in success state background |
| `rgba(240, 107, 74, 0.02)` | Near-transparent orange tint — radio option selected background |
| `rgba(240, 107, 74, 0.6)` | Semi-transparent orange — section divider/separator line |
| `#D14D04` | Darker orange — active profile label accent |
| `#D85A3C` | Orange hover (mirrors `--sapph-orange-hover`) |
| `#FFB7A5` | Light orange — selected chip border |

### Status / Warning Colours

| Value | Usage |
|---|---|
| `#FEF3CD` | Warning banner background (profile save reminder) |
| `#856404` | Warning banner text |
| `#FFC107` | Warning banner border |
| `#E53935` | Danger red — Delete Account button |
| `#C62828` | Delete button hover state |
| `rgba(76, 175, 80, 0.2)` | Success state background (sign-in feedback) |
| `rgba(244, 67, 54, 0.2)` | Error state background (sign-in feedback) |

### Overlay / Background Tints

| Value | Usage |
|---|---|
| `rgba(0, 0, 0, 0.5)` | Modal backdrop overlay |
| `rgba(0, 0, 0, 0.7)` | Match overlay backdrop |
| `rgba(232, 93, 44, 0.45)` | Sign-in background blob tint |
| `rgba(255, 255, 255, 0.8)` | Photo indicator pill background |
| `rgba(255, 255, 255, 0.95–0.96)` | Sign-in bottom sheet background |

---

## Typography

### Font Families

| Font | Role |
|---|---|
| **Prompt** | Headings (`h1–h6`), section headers, labels, buttons, brand name, step counters |
| **Lato** | Body copy, bio text, profile info lines, category values, form inputs |

Both fonts are loaded via Google Fonts.

### Type Scale

| Size | Usage |
|---|---|
| `4.8rem` | Sapph logo wordmark on sign-in screen |
| `2.5rem` | Profile name (home tab) |
| `2.25–2.5rem` | Onboarding divider screen heading |
| `2rem` | Profile name (profile tab) |
| `1.8rem` | Match overlay name |
| `1.75rem` | Sign-in tab heading, onboarding section title |
| `1.5rem` | Sign-in welcome heading, next-card name overlay, onboarding step title |
| `1.35rem` | Onboarding body intro text |
| `1.25rem` | Onboarding step label, form section headings |
| `1.1rem` | Body copy, profile info lines, category labels/values, section headers |
| `1rem` | Standard UI text — inputs, chips, buttons, action labels |
| `0.95rem` | Sub-labels, skip button, caption text |
| `0.9rem` | Small labels, warning text, step progress, filter chips |
| `0.875rem` | Fine print, profile sub-info |
| `0.85rem` | Hint text, photo count, small captions |
| `0.8rem` | Category section label (intimacy) |
| `0.75rem` | Micro labels, tag text |

### Font Weights

| Weight | Usage |
|---|---|
| `400` | Body copy, intro text, form inputs |
| `500` | Sub-labels, skip button, step progress text |
| `600` | Section sub-headings, filter chips, profile action buttons |
| `700` | Most headings, profile name, sign-in title, onboarding divider heading |
| `800` | Profile name (large display), profile tab name |

---

## Border Radius

| Token / Value | Usage |
|---|---|
| `--radius` = `12px` | Standard cards, input fields, buttons (pill-shaped excluded) |
| `8px` | Skeleton loading blocks |
| `16px` | Modal cards (delete confirmation, conversation starter card) |
| `20px` | Photo indicator pill, filter tag |
| `24px` | Sign-in bottom sheet, sign-in card |
| `30px` | Action filter chip (e.g. "All filters") |
| `50%` | Circular elements — photo dots, action buttons (pass/wave/heart), back/next round buttons |

---

## Shadows

| Token / Value | Usage |
|---|---|
| `--shadow` = `0 2px 12px rgba(0,0,0,0.05)` | Subtle card lift (default) |
| `--shadow-lg` = `0 4px 24px rgba(0,0,0,0.1)` | Elevated card / modal |
| `0 2px 8px rgba(0,0,0,0.1)` | Sign-in buttons |
| `0 2px 8px rgba(0,0,0,0.1)` | Social auth buttons |
| `0 -2px 20px rgba(0,0,0,0.08)` | Sign-in bottom sheet top shadow |
| `0 -4px 24px rgba(0,0,0,0.1)` | Sign-in email drawer shadow |
| `0 4px 12px rgba(0,0,0,0.1)` | Onboarding footer |
| `0 4px 12px rgba(0,0,0,0.15)` | Action buttons (pass/wave/heart) |
| `0 2px 12px rgba(0,0,0,0.15)` | Match overlay buttons |

---

## Gradients

| Value | Usage |
|---|---|
| `linear-gradient(transparent, rgba(0,0,0,0.5))` | Name overlay on next-card peek preview |
| `linear-gradient(180deg, #eee 0%, #e5e5e5 100%)` | Photo placeholder background |
| `linear-gradient(180deg, #e5e5e5 0%, #ddd 100%)` | Photo placeholder hover |
| `linear-gradient(180deg, var(--sapph-bg) 0%, #fff5f2 100%)` | Landing page background |
| `linear-gradient(135deg, var(--sapph-orange) 0%, #FF8C5A 100%)` | Message avatar / chat bubble accent |
| `linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 50%, #f0f0f0 75%)` | Skeleton loading shimmer animation |

---

## Spacing & Layout

| Value | Typical usage |
|---|---|
| `4px` | Micro gap — dots, tight inline items |
| `8px` | Small gap — photo dots spacing, loading dots |
| `12px` | Standard gap — padding, list items |
| `16px` | Page padding, card padding inner |
| `20px` | Section gap |
| `24px` | Card bottom padding, section spacing |
| `32px` | Large spacing — modal padding |
| `52px` | Round back/next button size (both width and height) |

---

## Navigation Bar

- Height: standard iOS safe area aware — uses `env(safe-area-inset-bottom)` for bottom padding
- Background: `white` with `border-top: 1px solid #eee`
- Active icon colour: `--sapph-orange`
- Inactive icon colour: `#999` / `#ccc`

---

## Action Buttons (Home tab)

| Button | Background | Icon colour | Size |
|---|---|---|---|
| Pass (✕) | `#f5f5f5` | `#666` | `52px` circle |
| Wave (👋) | `--sapph-orange` | `white` | `64px` circle |
| Heart (♥) | `--sapph-orange` | `white` | `64px` circle |

---

## Photo Carousel

- Aspect ratio: `3 / 4` (portrait)
- Background (no photo): `#f5f5f5`
- Indicator dots: `#ddd` (inactive) / `--sapph-orange` (active)
- Indicator background pill: `rgba(255,255,255,0.8)` with `border-radius: 20px`
- Transition: `opacity 0.2s ease` (crossfade between stacked images)
