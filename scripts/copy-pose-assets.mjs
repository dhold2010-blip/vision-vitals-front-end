import { mkdir, copyFile } from "node:fs/promises";
// Self-host the pinned runtime; no camera data or runtime requests go to a CDN.
const dest = new URL("../public/mediapipe/1.2.0/", import.meta.url);
await mkdir(dest, { recursive: true });
for (const name of [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
]) {
  await copyFile(
    new URL("../node_modules/@mediapipe/tasks-vision/wasm/" + name, import.meta.url),
    new URL(name, dest),
  );
}
