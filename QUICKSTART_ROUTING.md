# Quick Start - TanStack Router

## ✅ Setup Complete!

Your VaultRaider app now has TanStack Router with file-based routing fully configured.

## Available Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `routes/index.tsx` | Home page with Azure authentication |
| `/dashboard` | `routes/dashboard.tsx` | Protected dashboard (requires auth) |
| `/vaults` | `routes/vaults.tsx` | Vaults list with search params demo |
| `/about` | `routes/about.tsx` | About page |

## Start Development

```bash
npm run dev
# or
npm run tauri dev
```

Visit `http://localhost:1420` to see your app with routing!

## What You'll See

1. **Navigation Bar** - At the top with links to all routes
2. **Active Route Highlighting** - Current route is bold and underlined
3. **Router DevTools** - Floating icon in bottom-right corner (dev mode only)

## Try It Out

1. ✅ Navigate between pages using the nav bar
2. ✅ Try accessing `/dashboard` before logging in (will redirect to home)
3. ✅ Login and then access `/dashboard` (will work)
4. ✅ Go to `/vaults` and try changing filters (URL updates with search params)
5. ✅ Use browser back/forward buttons (routing is browser-native)

## Add Your Own Route

1. Create `src/routes/mypage.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/mypage')({
  component: MyPage,
})

function MyPage() {
  return <div>My New Page!</div>
}
```

2. Add to navigation in `src/routes/__root.tsx` if desired

3. Route is automatically available at `/mypage`!

## File Structure

```
src/
├── routes/
│   ├── __root.tsx      # Layout wrapper
│   ├── index.tsx       # Home (/)
│   ├── dashboard.tsx   # Dashboard (/dashboard)
│   ├── vaults.tsx      # Vaults (/vaults)
│   └── about.tsx       # About (/about)
├── routeTree.gen.ts    # Auto-generated (don't edit!)
└── main.tsx            # Router setup
```

## Documentation

- 📖 `ROUTER_SETUP.md` - Complete setup details
- 📖 `ROUTING.md` - Comprehensive routing guide
- 🌐 [TanStack Router Docs](https://tanstack.com/router/latest)

## Common Tasks

### Navigate Programmatically
```tsx
import { useNavigate } from '@tanstack/react-router'

function MyComponent() {
  const navigate = useNavigate()
  navigate({ to: '/dashboard' })
}
```

### Get Route Params
```tsx
const { userId } = Route.useParams() // from /users/$userId
```

### Get Search Params
```tsx
const search = Route.useSearch() // from ?filter=value
```

### Protected Route
```tsx
export const Route = createFileRoute('/protected')({
  beforeLoad: async () => {
    const isAuth = await invoke<boolean>("check_auth")
    if (!isAuth) throw redirect({ to: '/' })
  },
  component: ProtectedPage,
})
```

---

🎉 **You're all set! Happy routing!**

