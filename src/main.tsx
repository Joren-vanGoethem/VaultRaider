import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { ThemeProvider } from './contexts/ThemeContext'
import './index.css'

// Import the generated route tree
import { routeTree } from './routeTree.gen.ts'

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>,
);
