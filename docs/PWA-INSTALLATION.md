# VisionVitals PWA installation and rollout

This branch adds the web-app manifest and app icon needed for an app-like Home Screen experience. It does not replace the existing Vercel frontend, Render API, or database.

## Deploy safely

1. Review and merge this branch only after checking the preview build.
2. Keep the existing Vercel project connected to this frontend repository and deploy from the intended production branch.
3. Keep the existing Render backend and database unchanged.
4. Confirm the Vercel deployment still has the server-side environment variables from the existing deployment:
   - `VISION_VITALS_BACKEND_URL=https://vision-vitals-main-backend.onrender.com`
5. Do not add device secrets as environment variables for this frontend. Each signed-in user must explicitly register the browser in Settings; the device secret is stored in an HTTP-only, Secure-in-production, SameSite=Strict cookie and is never returned to browser JavaScript.
6. Do not paste secrets into GitHub, chat, source files, build logs, or client-side environment variables.

## Install on iPhone

1. Open the production HTTPS frontend in Safari.
2. Sign in and verify the existing app works first.
3. Tap Share, then Add to Home Screen.
4. Name it VisionVitals and tap Add.
5. Launch it from the new Home Screen icon.

The web app uses the same HTTPS frontend URL and backend API. This is a Progressive Web App, not a signed native iOS IPA.

## Security and data notes

- The manifest does not add offline storage or cache private health pages.
- Do not add service-worker caching for authenticated HTML, health data, camera images, or API responses without a separate security review.
- Installability does not itself enforce approval. This branch adds an explicit per-account browser registration step using the backend's existing device registration and revocation endpoints. It is a user-approved browser device, not an administrator-controlled device approval system.
- Dashboard, history, reports, profile, and settings now read the backend-supported account data in this branch. The backend currently exposes analysis observations and account profile fields, not verified body-composition, weight, heart-rate, posture, or health-score time series; the frontend intentionally does not fabricate those values.
- Do not run database resets or migrations for this PWA change.
