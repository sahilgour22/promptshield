---
name: Infrastructure Security for AI
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1d'
  surface-container: '#201f22'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#313032'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#adc6ff'
  on-secondary: '#002e6a'
  secondary-container: '#0566d9'
  on-secondary-container: '#e6ecff'
  tertiary: '#ffb3af'
  on-tertiary: '#650911'
  tertiary-container: '#fc7c78'
  on-tertiary-container: '#711419'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3af'
  on-tertiary-fixed: '#410005'
  on-tertiary-fixed-variant: '#842225'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '450'
    lineHeight: 16px
  metric-lg:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  label-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  container-margin: 32px
  gutter: 16px
---

## Brand & Style

The design system is engineered for high-stakes, infrastructure-grade security environments. It prioritizes clarity, speed of data ingestion, and a sense of absolute control over AI agentic workflows. The brand personality is **utilitarian, precise, and authoritative**, evoking the feeling of a mission-control dashboard where every pixel serves a functional purpose.

The visual style is a fusion of **Modern Minimalist and Developer-Centric Technicality**. It leverages a "Hyper-Flat" aesthetic: 
- **Restrained Visuals:** No gradients, drop shadows, or decorative flourishes.
- **High Information Density:** Optimized for expert users who need to scan vast amounts of telemetry and logs.
- **Precision Engineering:** Grid-aligned layouts and monospaced accents create a "built-to-last" industrial software feel.

## Colors

The palette is rooted in a deep Zinc-scale monochromatic foundation to reduce eye strain during long-running monitoring sessions. 

- **Infrastructure Base:** The primary background uses Zinc-950 (`#09090B`) to provide maximum contrast for critical alerts.
- **Functional Accents:** Colors are strictly semantic. **Emerald-500** signifies safe traffic and system health. **Red-500** is reserved exclusively for blocked prompts and critical threats.
- **Severity Scale:** A dedicated range of colors (Red to Lime) is used for risk categorization, ensuring that threat levels are distinguishable at a glance without text reliance.

## Typography

This design system utilizes a dual-font strategy to balance readability and technical precision.

- **Inter:** The primary workhorse for UI elements, headings, and descriptions. It provides a neutral, highly legible sans-serif foundation.
- **JetBrains Mono:** Employed for code blocks, prompt logs, and all numerical metrics. The use of monospaced characters for numbers (tabular figures) ensures that metrics do not "jump" during real-time updates.
- **Scale:** Type sizes are kept relatively small to support higher information density. Headlines use slight negative letter-spacing for a more modern, "tight" appearance.

## Layout & Spacing

The layout is built on a strict **4px baseline grid**. This ensures that every component, margin, and padding value is a multiple of four, resulting in a cohesive, mathematically sound UI.

- **Grid System:** A 12-column fluid grid is used for dashboard layouts, while sidebar-heavy applications utilize a fixed-width left navigation (240px) with a fluid content area.
- **Density:** Elements are packed tightly. Internal padding for cards and containers defaults to 16px (`md`) to maximize the visible data on a single screen.
- **Responsive Behavior:** On tablet and mobile, the layout collapses into a single-column stack, and internal margins reduce to 16px to conserve horizontal real estate.

## Elevation & Depth

Depth is conveyed through **Tonal Layering** rather than shadows. In this design system, "higher" surfaces are represented by lighter shades of Zinc.

- **Level 0 (Background):** Zinc-950. The canvas.
- **Level 1 (Cards/Sidebar):** Zinc-900. These surfaces sit directly on the background.
- **Level 2 (Modals/Popovers):** Zinc-800. These are the highest elements, used for temporary interactions.
- **Borders:** All surfaces are defined by a 1px solid border (`#27272A`). This creates a crisp, architectural structure that mimics the appearance of a physical circuit or a schematic. 
- **No Shadows:** Shadows are omitted to maintain the "Hyper-Flat" aesthetic and improve rendering performance for data-heavy views.

## Shapes

The shape language is **Sharp and Disciplined**. Rounded corners are used minimally—only enough to take the "edge" off the UI without feeling soft or consumer-focused.

- **Standard Elements:** Buttons, inputs, and small cards use a 6px corner radius.
- **Large Containers:** Main content areas and large sections use an 8px corner radius.
- **Icons:** Use 2px stroke weights with squared-off terminals where possible to match the technical aesthetic.

## Components

- **Buttons:** Low-profile, 36px height. Primary buttons use a solid Zinc-50 background with black text. Secondary and Ghost buttons use Zinc-800 borders or no borders respectively.
- **Cards:** Defined by Level 1 surfaces with a 1px Zinc-800 border. No shadows. Titles within cards should be in `label-xs` (uppercase Inter).
- **Input Fields:** Dark Zinc-950 backgrounds with Zinc-800 borders. Focus state is a simple 1px Emerald-500 border. No outer glow.
- **Chips/Badges:** Small, 20px height, using `code-sm` JetBrains Mono. Use subtle background tints of the semantic colors (e.g., 10% opacity Emerald for "Safe").
- **Tables:** Dense rows (40px height). Header row uses Zinc-900 background. Use `metric-lg` or `code-sm` for data columns to ensure vertical alignment of digits.
- **Status Indicators:** 8px solid circles. Pulsing animation for "Active Monitoring" states.