import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
  component: () => (
    <>
      <div style={{ padding: '1rem', borderBottom: '1px solid #333' }}>
        <nav style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link
            to="/"
            style={{ textDecoration: 'none', color: '#646cff' }}
            activeProps={{ style: { fontWeight: 'bold', textDecoration: 'underline' } }}
          >
            Home
          </Link>
          <Link
            to="/dashboard"
            style={{ textDecoration: 'none', color: '#646cff' }}
            activeProps={{ style: { fontWeight: 'bold', textDecoration: 'underline' } }}
          >
            Dashboard
          </Link>
          <Link
            to="/vaults"
            style={{ textDecoration: 'none', color: '#646cff' }}
            activeProps={{ style: { fontWeight: 'bold', textDecoration: 'underline' } }}
          >
            Vaults
          </Link>
          <Link
            to="/about"
            style={{ textDecoration: 'none', color: '#646cff' }}
            activeProps={{ style: { fontWeight: 'bold', textDecoration: 'underline' } }}
          >
            About
          </Link>
        </nav>
      </div>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
})

