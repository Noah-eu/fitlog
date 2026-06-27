# FitLog (scaffold)

Local development

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Netlify

To deploy on Netlify, set the build command to `npm run build` and the publish directory to `dist`.
The repository includes `netlify.toml` for a SPA redirect fallback so client-side routes work after refresh.

Deployed site

The project is configured for Netlify and the site is available at: https://fitlog-training.netlify.app

Firebase Auth (local development)

To enable Firebase Authentication locally, create a `.env.local` with the following variables (example in `.env.example`). Do not commit real secrets.

After setting env vars, run the app normally with `npm run dev`.

If `VITE_FIREBASE_*` values are missing, empty, or still placeholders, the app now shows a setup screen instead of crashing. On Netlify, set the same variables in Site configuration -> Environment variables.

