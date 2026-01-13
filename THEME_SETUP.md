# Tailwind CSS v4 Theme Setup

This project uses **Tailwind CSS v4** with a complete theming system that supports light, dark, and system modes.

## Files Structure

### Core Theme Files

1. **`src/index.css`** - Tailwind v4 configuration with:
   - `@import "tailwindcss"` for Tailwind v4
   - `@theme` block with custom color definitions
   - Custom component classes (`.btn-primary`, `.btn-secondary`, `.card`, `.gradient-text`)

2. **`tailwind.config.js`** - Minimal configuration for v4:
   - Dark mode set to 'class' strategy
   - Content paths for purging

3. **`src/contexts/ThemeContext.tsx`** - React context for theme management:
   - Manages theme state (light/dark/system)
   - Handles system preference detection
   - Persists theme choice to localStorage

4. **`src/components/ThemeToggle.tsx`** - Theme toggle button component:
   - Cycles through light → dark → system modes
   - Shows appropriate icon for each mode
   - Located in navigation bar

## Tailwind CSS v4 Changes

This project uses **Tailwind CSS v4**, which has a different syntax than v3:

- Use `@import "tailwindcss"` instead of `@tailwind` directives
- Define custom colors in `@theme` blocks
- No need for layers (`@layer base`, `@layer components`, etc.)

### Example: index.css

```css
@import "tailwindcss";

@theme {
  --color-primary-500: #0078d4;
  --color-accent-500: #00bcf2;
}
```

## Usage

### Theme Provider

The `ThemeProvider` is wrapped around the entire app in `src/main.tsx`:

```tsx
import { ThemeProvider } from './contexts/ThemeContext'

<ThemeProvider>
  <RouterProvider router={router} />
</ThemeProvider>
```

### Using the Theme Hook

Access theme state and controls in any component:

```tsx
import { useTheme } from '../contexts/ThemeContext';

function MyComponent() {
  const { theme, setTheme, effectiveTheme } = useTheme();
  
  // theme: 'light' | 'dark' | 'system'
  // effectiveTheme: 'light' | 'dark' (resolved theme)
  // setTheme: function to change theme
}
```

### Custom Components

Pre-built component classes are available in `index.css`:

- **`.btn-primary`** - Primary button style with gradient
- **`.btn-secondary`** - Secondary button with border
- **`.card`** - Card container with shadow and border
- **`.gradient-text`** - Gradient text effect

### Color Palette

#### Primary Colors (Blue)
- `primary-50` through `primary-900`
- Main brand color: `primary-500` (#0078d4)

#### Accent Colors (Cyan)
- `accent-50` through `accent-900`
- Accent color: `accent-500` (#00bcf2)

### Dark Mode

Use `dark:` prefix for dark mode styles:

```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
  Content
</div>
```

## Theme Modes

1. **Light Mode** - Bright, high contrast theme
2. **Dark Mode** - Dark background with lighter text
3. **System Mode** - Follows OS/browser theme preference

The theme toggle button in the navigation bar cycles through these modes.

## Customization

### Changing Colors

Edit `src/index.css` to modify the color palette:

```css
@theme {
  --color-primary-500: #your-color;
  --color-accent-500: #your-color;
}
```

### Adding Custom Components

Add new component classes in `src/index.css`:

```css
.your-component {
  @apply /* tailwind classes */;
}
```

## Migration from App.css

All styling has been migrated from `src/App.css` to Tailwind utility classes:

- Removed custom CSS classes
- Converted to Tailwind utilities
- Added dark mode support
- Improved responsiveness

The old `App.css` can be safely deleted if no longer referenced.

## Pages Updated

All pages have been updated to use Tailwind classes and support theming:

- ✅ **index.tsx** (Home/Login page)
- ✅ **dashboard.tsx** (Protected dashboard)
- ✅ **vaults.tsx** (Vaults list with filters)
- ✅ **about.tsx** (About page)
- ✅ **__root.tsx** (Navigation with theme toggle)

