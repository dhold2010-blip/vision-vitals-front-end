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

### Real photo reports

The original prototype report used fixed values from `src/lib/vitals.ts` (age 26,
height 178 cm, weight 72.4 kg, heart rate 68, score 86). Those values are not camera
measurements. The live results route displays the backend's photo-specific framing,
lighting, and visible posture observations, capture tips, and explicit availability
labels for unsupported measurements. Older results retain their summary and can be
rescanned for the detailed report. Confidence is not presented as a health score.
Download report produces a text file containing the actual report. Home, History, and Reports now load the signed-in account’s saved analyses. Profile
editing saves the display name to the backend, with email as the fallback. Protected
routes require sign-in and saved reports open through `/results?id=<analysis-id>`.
Settings signs out the backend session and clears local cookies. Unsupported demo
preferences, subscriptions, charts, and sample health readings have been removed.

## Camera measurements

New scans run the pinned MediaPipe Pose Lite model on the same frozen canvas
used for the photo upload. The runtime and model are served from this app;
`predev`/`prebuild` copy runtime assets from the locked npm dependency. The model
revision and SHA-256 are documented in `public/models/README.txt`.

The browser submits normalized landmarks, not metric values. The backend
validates them, calculates seven image-plane angles, and stores them with the
report. See the backend API documentation for quality gates and limitations.
Reports and text downloads distinguish estimates, capture-specific failures,
and unsupported measurements. Old reports have no retroactive metrics; take
a new scan. Model loading has a 30-second deadline; failure does not fabricate
values or prevent saving a photo observation. A cancelled scan does not upload
once landmark detection completes. On phones the first model download can take
longer than later scans; cached assets are reused by the browser.

These are single-image 2D landmark estimates. Camera perspective/tilt and pose
occlusion affect results. No clinical measurements, physical dimensions, pulse,
body composition, or health/posture scores are inferred from appearance.

### Guided reference height and entered readings

The scanner's optional readings panel accepts age, measured height/weight and a
pulse reading from a device. These values are saved with that report only and
labeled `Entered by you`; they are not camera inferences. The server calculates
adult BMI only when age is 20+ and measured height/weight are supplied. It does
not classify health or body fat. Method: https://www.cdc.gov/bmi/adult-calculator/

Guided height freezes the captured image and asks for a known vertical
reference's top/bottom and the person's head/soles, plus the reference length
and explicit same-distance/level-camera confirmation. A standing pose and
usable geometry are required. The server uses the ratio of image heights and
labels the result as a rough reference estimate. Perspective, incorrect setup,
shoes/hair and marking error can bias it; accuracy is not clinically validated.
The reference estimate is never substituted into BMI. Users can skip this step.
