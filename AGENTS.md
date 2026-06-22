# AGENTS.md — admin-panel (Kedil Admin Panel)

Next.js 16 (App Router) + React 19 + TanStack Query admin UI for Kedil. See
`README.md` for features and project structure. This file only adds non-obvious
operating notes for Cursor Cloud agents.

## Cursor Cloud specific instructions

Dependencies are installed automatically by the environment update script
(`npm install`). Typecheck and build run on startup to validate the checkout.

### Running the app

- Start dev server (port 3000): `npm run dev`
- Defaults to the production API (`https://api.kedil.money`) when
  `NEXT_PUBLIC_API_URL` is unset. For local full-stack work with `kedil_be`, create
  `.env.local`:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:5000
  NEXT_PUBLIC_ADMIN_PASSWORD=admin123
  ```
- Admin login uses `NEXT_PUBLIC_ADMIN_PASSWORD` (client-side check). Backend admin
  routes still require a valid JWT from a user in `ADMIN_EMAILS`.

### Gotchas

- **No `.env` required for build/typecheck** — `next build` and `tsc --noEmit` succeed
  without secrets. Runtime API calls need `NEXT_PUBLIC_API_URL` (and auth for protected
  pages).
- **Port 3000** may conflict with `kedil_fe` in multi-repo workspaces; run only one
  frontend dev server at a time or use `npm run dev -- -p 3001`.

### Lint / test / typecheck

- Type-check: `npm run typecheck` (or `npx tsc --noEmit`)
- Build: `npm run build`
- Lint: `npm run lint` (ESLint)
