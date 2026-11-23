# TraCuuFB-BaoDuy API for Render

## Add this backend
1. Extract the ZIP.
2. Upload the included `api/` folder to the root of `TraCuFb-BaoDuy` (same level as `render.yaml`).
3. Commit the new files to the `main` branch.
4. Keep the existing `render.yaml` at the repository root. It already points to `rootDir: api`.

## Deploy
- In Render, use **New + → Blueprint** and select this repository, or sync the existing Blueprint.
- The service should use the Node runtime, build command `npm install`, and start command `npm start`.
- If your current Render service was created as a Docker service, do not delete it yet. Create/sync the Node Blueprint service separately and test that new service first.

## Meta settings
1. In Render → service → Environment, enter `META_APP_ID` and `META_APP_SECRET`.
2. Render automatically supplies `RENDER_EXTERNAL_URL`; do not add it yourself.
3. In Meta Developers → Facebook Login → Settings, add this exact Valid OAuth Redirect URI:
   `https://YOUR-RENDER-SERVICE.onrender.com/auth/facebook/callback`
   Replace the hostname with the actual Render service URL.
4. Ensure the Meta app has Facebook Login enabled. For public testing, add test users/roles or complete the required Meta review and switch the app to Live as applicable.

## Connect the website
1. Open `script.js`.
2. Set `API_BASE` to the actual Render base URL, for example:
   `const API_BASE = "https://tracuufb-baoduy-api.onrender.com";`
   Do not add `/auth`, `/api`, or a trailing path.
3. Commit the change to GitHub Pages.

## Test
- Open `https://YOUR-RENDER-SERVICE.onrender.com/health`; expect `{"ok":true,...}`.
- Then open the website, click **Đăng nhập Facebook**, approve the requested public profile access, and click **Xem hồ sơ đã cấp quyền**.

This backend only requests the signed-in user's permitted `public_profile` fields (ID, name, profile picture). It cannot search arbitrary people or retrieve private data. Never ask users for Facebook passwords or cookies. Keep the App Secret only in Render Environment.
