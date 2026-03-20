# Frontend Style Overview

## Core Aesthetics & Methodologies
The application employs a strong **Neumorphic (Soft UI)** design system, combined with occasional glassmorphism elements. It relies on standard **Tailwind CSS** utility classes for structure, spacing, and layout, while complex box-shadows and specific font families are primarily applied via inline React `style={{ ... }}` attributes.

---

## 🎨 Color Palette
The app uses a carefully curated set of soft background colors and vivid accents to create the neumorphic effect.

### Backgrounds
- **Primary Background**: `#d6dae8` (Light grayish-blue) - Used across `<body>`, main structural containers, forms, and cards to establish the base layer for neumorphism. 
- **Admin/Dark Mode Background**: `#0F1117` (Very dark navy) - Used almost exclusively in the admin section.

### Accents & Gradients
- **Primary Accent**: `#5B4FE9` (Vibrant purple/indigo) - Prominently used for buttons, active navigation states, primary text highlights, and icons.
- **Gradient Accent**: `linear-gradient(to right, #6C63FF, #A78BFA)` - Used for large hero text and special branding text highlights to give a modern, premium feel.

### Text & Typographic Colors
- **Primary Text**: `#1a1d2e` (Dark navy) - Used for headings, titles, and high-readability body text.
- **Secondary/Muted Text**: `#64748B` (Slate gray) - Used for subtitles, metadata, descriptions, and placeholder text.
- **Tertiary Text**: `#3D4852` (Dark gray) - Used in specific inputs and not-found pages.

### System & Alert Colors
- **Success/Verified**: `#10B981` (Emerald green).
- **Destructive/Reported**: `#ef4444` (Red) or `text-red-500` via Tailwind.

---

## 🔤 Typography
Fonts are distinctively segregated based on their purpose for maximum visual hierarchy, imported primarily from Google Fonts:

- **Body Text (`DM Sans, sans-serif`)**: Used for descriptions, navigation links, small labels, and metadata. Provides excellent readability at small sizes.
- **Headings & Cards (`Plus Jakarta Sans, sans-serif`)**: Used for resource card titles, page headers, secondary headers, and the main branding. Gives a geometric and modern look.
- **Hero & Stats Text (`Inter, sans-serif`)**: Selected specifically for large homepage hero texts and large numerical statistics (tabular proportional data).

---

## 📦 Neumorphic Box Shadows (Shapes & Depth)
There are no traditional borders used in the main design framework (except very mildly in some overlay components). Instead, depth is represented entirely through inset and outset shadows utilizing the base color `#d6dae8` with light/#ffffff and dark/#b0b8cc shadows.

### Outset Shadows (Elevated Elements)
Used for Cards, Containers, Buttons, and floating action areas.
- **Subtle Elevation**: `box-shadow: 4px 4px 8px #b0b8cc, -4px -4px 8px #ffffff` (Icon buttons, nav elements)
- **Standard Elevation**: `box-shadow: 8px 8px 16px #b0b8cc, -8px -8px 16px #ffffff` (Resource cards, primary buttons)
- **High Elevation**: `box-shadow: 12px 12px 24px #b0b8cc, -12px -12px 24px #ffffff` (Large empty-state container boxes, sidebars)
- **Modal Elevation**: `box-shadow: 9px 9px 16px #b0b8cc, -9px -9px 16px #ffffff`

### Inset Shadows (Depressed Elements)
Used for active states, pressed buttons, search bars, inner containers, and selected nav items.
- **Shallow Depression**: `box-shadow: inset 3px 3px 6px #b0b8cc, inset -3px -3px 6px #ffffff`
- **Standard Depression**: `box-shadow: inset 4px 4px 8px #b0b8cc, inset -4px -4px 8px #ffffff` (Search inputs, icon backgrounds)
- **Deep Depression**: `box-shadow: inset 6px 6px 12px #b0b8cc, inset -6px -6px 12px #ffffff` (Inner content wrappers)
- **Very Deep Depression (Empty States)**: `box-shadow: inset 12px 12px 24px #b0b8cc, inset -12px -12px 24px #ffffff`

---

## 📏 Layouts, Spacing & Sizing
- **Border Radius**: The design favors heavily rounded, bubbly edges to soften the neumorphic aesthetic.
  - Buttons/Small Elements: `rounded-xl` (12px) or `rounded-2xl` (16px)
  - Cards: `rounded-[24px]` (24px)
  - Large Modals and Sections: `rounded-[32px]` or `rounded-[40px]`
- **Scrollbars**: A custom thin scrollbar is utilized globally within `index.css` (width: 6px, thumb colored `rgba(163, 177, 198, 0.7)`).
- **Line clamping**: Multi-line truncation is manually defined in `index.css` (`.line-clamp-2`, `.line-clamp-3`) and heavily used for descriptions and titles in UI cards.

---

## ✨ Component Interactions & Micro-animations
- **Hover/Lift Effects**: Almost all elevated items include utility classes like `transition-all duration-300 hover:-translate-y-0.5` or `hover:-translate-y-1.5` to physically "lift" when hovered.
- **Active (Click) Effects**: `active:translate-y-0.5` is paired with changes to box-shadows to simulate pressing the neumorphic button down into the surface.
- **Grouped Hovering**: Broad usage of Tailwind's `group` and `group-hover` modifier—hovering over a card may cause its inner icon to scale up (`group-hover:scale-110`) or its title text color to change to the primary purple.
- **Glassmorphism Overlay**: Wait/Loading and Modal backgrounds utilize an overlay pattern like `background: rgba(26,29,46,0.4)` coupled with a CSS `backdrop-filter: blur(8px)` to let underlying content visually bleed through slightly out-of-focus.
