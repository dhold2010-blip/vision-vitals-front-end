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
