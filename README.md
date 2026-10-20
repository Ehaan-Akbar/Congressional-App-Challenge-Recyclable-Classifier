# RecycleCheck

React, TypeScript, and Vite app for recycling classification and community environmental reports.

## Local development

Requires Node.js 22 or later.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Fill in `.env.local` before starting Vite. Restart Vite after changing environment variables.

## Supabase setup

1. Create a Supabase project and copy its project URL and publishable key from the project's Connect panel into `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. A legacy `VITE_SUPABASE_ANON_KEY` is also supported.
2. In the Supabase SQL Editor, run the SQL files in `supabase/migrations/` in filename order. Run each migration once. If you already applied the original reports migration, run only the new migration.
3. Submit a report with a photo, then check the community feed and map. Reports are stored in `public.trash_reports`; photos are stored in the public `report-images` bucket.

Use only a publishable or legacy anon key in this frontend. Vite exposes `VITE_*` values in the browser; never use a secret or service-role key. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

Reports and photos are publicly visible. Row-level security permits visitors to read and submit reports and upload JPEG, PNG, or WebP photos up to 5 MB. Updates and deletions require a trusted operator through the Supabase dashboard or backend. No sign-in is required. Public submissions are not rate limited by this app. An upload followed by a failed database insert can leave an unused photo in Storage; operators can remove it from the dashboard.

Without Supabase environment variables the app opens in demo mode, with an empty map/feed and report submission disabled. A live connection requires your own Supabase project; no credentials are committed.

## GitHub Pages

In the repository's **Settings → Secrets and variables → Actions**, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as repository variables or secrets. The workflow also accepts `VITE_SUPABASE_ANON_KEY` for legacy projects. Run the existing deployment workflow again after changing these values: Vite embeds configuration during the build.

## Build

```powershell
npm run build
```

The build checks TypeScript and copies ONNX runtime assets for browser inference.

