# Connect this project to Supabase

These steps connect the app's community map, report feed, and photo uploads to your own Supabase project. The Supabase JavaScript SDK is already included. You do not need Docker, the Supabase CLI, or a database password in the frontend.

## 1. Create a Supabase project

1. Open the [Supabase dashboard](https://supabase.com/dashboard) and sign in.
2. Create a new project in your organization. Choose a name, database password, and region, then wait until the project is ready.
3. Open the project's **Connect** panel and copy the **Project URL** and **publishable key**. Keep both values from the same project.

The URL looks like `https://your-project-id.supabase.co`. A publishable key starts with `sb_publishable_`. See the official [React setup guide](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs) for where to find these values.

## 2. Create the database table and photo bucket

In your Supabase project, open **SQL Editor**. Run the contents of these repository files in this order, as separate queries:

1. [`supabase/migrations/20260905191116_create_reports_table.sql`](supabase/migrations/20260905191116_create_reports_table.sql)
2. [`supabase/migrations/20261019000000_secure_reports_and_add_storage.sql`](supabase/migrations/20261019000000_secure_reports_and_add_storage.sql)

For each file, open it in your code editor, copy its entire contents into a new SQL Editor query, and click **Run**. Check for success before continuing.

Run each migration once. If the first migration was already applied to this project, run only the second. Do not rerun the first after the second: the first creates older, broader permissions that the second removes.

After both migrations are applied, check:

- **Table Editor:** the `public.trash_reports` table exists.
- **Storage:** the public `report-images` bucket exists.
- The bucket allows JPEG, PNG, and WebP photos up to 5 MB.

The migrations configure row-level security. Visitors can read and submit reports and upload photos. Editing or deleting reports requires a trusted operator through the dashboard or backend. The app does not require user accounts or Supabase Auth configuration.

## 3. Configure your local environment

Open PowerShell in the repository root, the folder containing `package.json`.

If `.env.local` does not already exist, create it from the template:

```powershell
Copy-Item .env.example .env.local
```

If `.env.local` already exists, edit it directly to preserve any existing settings.

Set these values in `.env.local`, replacing the examples with your own:

```dotenv
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-actual-key
```

For a legacy project, you can use its public `anon` key instead:

```dotenv
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
```

Choose one key variable. If both are set, the app uses `VITE_SUPABASE_PUBLISHABLE_KEY`.

Use only a publishable or public anon key. Never put a database password, `sb_secret_` key, or `service_role` key in a `VITE_*` variable: Vite includes these variables in browser code. Read [Supabase's API key guidance](https://supabase.com/docs/guides/getting-started/api-keys) for the difference. `.env.local` is ignored by Git.

## 4. Start the app

Use Node.js 22 or later. Install the project's dependencies, then start Vite:

```powershell
npm ci
npm run dev
```

Open the local URL printed in the terminal. Restart the development server whenever you change `.env.local`: stop it with **Ctrl+C**, then run `npm run dev` again.

## 5. Verify the connection

1. Open **Report** in the app and enter a description.
2. Optionally select a JPEG, PNG, or WebP photo up to 5 MB.
3. Use **Use my location** and allow the browser's location request.
4. Select **Analyze with AI**, review the report, then select **Submit Report**.
5. Confirm that the app shows **Report Submitted!**.
6. Open the community map and feed. Your report should appear, with its photo visible in the feed if you attached one.
7. In Supabase's Table Editor, confirm there is a new row in `trash_reports`. For a photo report, check **Storage > report-images > reports** for the uploaded file.

Reports, coordinates, and uploaded photos are publicly visible. Use sample information when testing. Without configured environment variables, the app opens in demo mode with an empty map/feed and rejects report submissions.

## 6. Configure GitHub Pages

Local `.env.local` values are not sent to GitHub. Configure the hosted build separately:

1. Open this repository on GitHub.
2. Go to **Settings > Secrets and variables > Actions > Variables**.
3. Add these repository variables with the same values used locally:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Your Supabase project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Your project's publishable key |

   For a legacy project, use `VITE_SUPABASE_ANON_KEY` instead of the publishable-key variable. The existing workflow also accepts repository secrets with these names; if both a variable and secret exist, the variable takes precedence.

4. Make sure the Supabase integration changes are on `main`, which the deployment workflow checks out.
5. Open **Actions > Deploy RecycleCheck to GitHub Pages > Run workflow** and start the workflow.
6. Once deployment succeeds, open your GitHub Pages site and repeat the report test.

Rebuild and redeploy after changing these variables. Vite embeds them during the build, so refreshing an older deployment will not pick up new values. Creating the GitHub variables does not apply database migrations; complete step 2 separately.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| The app says reporting is in demo mode | Confirm `.env.local` is next to `package.json`, both required values are filled in, and Vite has been restarted. For GitHub Pages, set the repository variables and redeploy. |
| Invalid API key or unauthorized request | Copy the URL and public key again from the same Supabase project. Remove placeholder values. |
| `trash_reports` is missing | Run the first migration in the correct project's SQL Editor, then the second migration. |
| Bucket not found | Run the second migration and confirm Storage contains `report-images`. |
| Row-level security or permission error | Confirm both migrations completed successfully in order. Reports need a nonempty description, valid coordinates, and an allowed category. Keep row-level security enabled. |
| Photo rejected | Use JPEG, PNG, or WebP up to 5 MB. HEIC and other formats are not accepted. |
| Location cannot be retrieved | Allow location access in your browser. Use localhost during development or HTTPS for the hosted site. |
| Local reports work but the deployed site is empty | Check that GitHub's build variables point to the same Supabase project, then redeploy. |
| A report fails after its photo uploads | Check the report error and database policies. An unused photo may remain in Storage; a trusted operator can remove it through the dashboard. |

To check that the frontend compiles, run `npm run build`. A successful build verifies compilation; use step 5 to verify your live Supabase connection.
