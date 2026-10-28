# Vision Vitals

**Analysing You Beautifully.**

Vision Vitals is a camera-based wellness and visual-insight application. The frontend provides the user experience for authentication, onboarding, camera scanning, results, history, reports, profile, and settings.

## Tech stack

- React 19 + TypeScript
- TanStack Start / TanStack Router
- Vite
- Tailwind CSS
- Zod and React Hook Form
- ESLint + Prettier

## Project structure

- `src/routes/` — application routes and pages
- `src/components/vv/` — Vision Vitals application components
- `src/components/ui/` — reusable UI primitives used by the application
- `src/lib/` — shared utilities and application logic
- `public/` — static assets

## Environment configuration

Copy `.env.example` to `.env` for local development and set these exact keys:

- `VISION_VITALS_BACKEND_URL` — base URL of the Vision Vitals backend, without an API path suffix (for example, `http://localhost:8000` locally).
- `VISION_VITALS_DEVICE_ID` — ID returned when the device is registered with the backend.
- `VISION_VITALS_DEVICE_CREDENTIAL` — device secret returned at registration; keep it private.

These values are read by server-side code; do not rename the keys or expose the device credential as a `VITE_*` client variable. For deployed environments, set the same names in the hosting provider's server/runtime environment settings and redeploy/restart the frontend. The backend URL must point to the running API, and the API must use the database that received its migrations.

The backend owns the `users` database table; the frontend authenticates through backend API endpoints and does not query that table directly. If an error literally says a database table named `user` is not configured, check which service emits it: that exact message is not present in this frontend repository.

## Development

Install dependencies with your package manager, then run:

```bash
npm run dev
```

## Production build

```bash
npm run build
```

## Quality checks

```bash
npm run lint
npm run build
```

## Important

Vision Vitals provides estimates and visual insights and is not a medical diagnosis. Production deployments should connect the frontend to the secured Vision Vitals backend and must never expose backend secrets or provider API keys in the client.
