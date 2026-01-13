# Quick Start - Using Themes

## Theme Toggle

The theme toggle button is located in the top-right corner of the navigation bar.

### Theme Modes

Click the theme button to cycle through:

1. **🌞 Light Mode** (Yellow sun icon)
   - Bright background
   - High contrast
   - Best for daytime use

2. **🌙 Dark Mode** (Blue moon icon)
   - Dark background
   - Reduced eye strain
   - Best for nighttime use

3. **💻 System Mode** (Purple monitor icon)
   - Follows your OS/browser setting
   - Automatically switches with system
   - Best for automatic adaptation

Your theme preference is automatically saved and will be remembered next time you open the app.

## Using Themes in Your Code

### In Components

```tsx
import { useTheme } from '../contexts/ThemeContext';

function MyComponent() {
  const { theme, setTheme, effectiveTheme } = useTheme();
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>Effective theme: {effectiveTheme}</p>
      
      <button onClick={() => setTheme('dark')}>
        Switch to Dark
      </button>
    </div>
  );
}
```

### In Styles

```tsx
// Use dark: prefix for dark mode styles
<div className="bg-white dark:bg-gray-800">
  <h1 className="text-gray-900 dark:text-gray-100">
    This text adapts to theme
  </h1>
</div>
```

### Custom Components

Use the pre-built utility classes:

```tsx
// Primary button
<button className="btn-primary">
  Click Me
</button>

// Secondary button
<button className="btn-secondary">
  Cancel
</button>

// Card container
<div className="card">
  <h2>Card Title</h2>
  <p>Card content...</p>
</div>

// Gradient text
<h1 className="gradient-text">
  VaultRaider
</h1>
```

## Customizing Colors

Edit `src/index.css` to change the color scheme:

```css
@theme {
  /* Change primary color */
  --color-primary-500: #your-color;
  
  /* Change accent color */
  --color-accent-500: #your-color;
  
  /* Add more color scales */
  --color-primary-600: #darker-shade;
  --color-primary-400: #lighter-shade;
}
```

## Tips

- **System Mode**: Best default for most users
- **Dark Mode**: Reduces eye strain in low light
- **Light Mode**: Better for detailed work in bright environments
- Theme persists across sessions
- No page reload needed when switching themes

