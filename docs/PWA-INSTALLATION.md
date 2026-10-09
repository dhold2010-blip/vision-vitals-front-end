# VisionVitals PWA installation and rollout

This branch adds the web-app manifest and app icon needed for an app-like Home Screen experience. It does not replace the existing Vercel frontend, Render API, or database.

## Deploy safely

1. Review and merge this branch only after checking the preview build.
2. Keep the existing Vercel project connected to this frontend repository and deploy from the intended production branch.
3. Keep the existing Render backend and database unchanged.
4. Confirm the Vercel deployment still has the server-side environment variables from the existing deployment:
   - `VISION_VITALS_BACKEND_URL=https://vision-vitals-main-backend.onrender.com`
   - `VISION_VITALS_DEVICE_ID` (existing registered device ID)
   - `VISION_VITALS_DEVICE_CREDENTIAL` (existing secret; configure in the hosting dashboard only, never commit it)
5. Do not paste secrets into GitHub, chat, source files, build logs, or client-side environment variables.

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
- Installability does not itself enforce approval of each device. The backend's existing device registration/revocation endpoints must be inspected and an explicit user-device approval workflow verified or implemented before describing the product as restricted to approved devices.
- Existing dashboard/history/report/profile screens contain seeded example values. Those must be replaced with backend-backed records before treating them as a source of truth.
- Do not run database resets or migrations for this PWA change.
