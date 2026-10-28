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

## Phone-camera scans

Set `VISION_VITALS_BACKEND_URL` in the frontend server environment to the backend
origin (for example, `https://api.example.com`, without `/api/v1`). Login and scan
requests must use the same backend/database. Phone scans use the user's session
and `POST /api/v1/analyses` with multipart `image` and `source=APP_CAMERA`.
`VISION_VITALS_DEVICE_ID` and `VISION_VITALS_DEVICE_CREDENTIAL` are no longer
required by this frontend; keep hardware credentials on the hardware integration.

The analysis endpoint returns the analysis directly in `data`. Errors use
`error.code` and `request_id`; the scan displays a safe message and reference ID
for support. The frontend allows JPEG/PNG images up to 10 MB. The backend's
configured limit remains authoritative. Camera retries reopen the stream, and
cancelled scans do not navigate when an earlier request finishes.

Run `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` before
publishing changes. Tests cover the API contract, error mapping, camera retries,
and cancellation without requiring real device credentials or camera hardware.
