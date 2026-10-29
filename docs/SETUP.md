# Setup

The app has no third-party app builder behind it. It is a static Vite/React site plus a Supabase project.

## 1. Supabase project (database and sign-in)

1. Create a project at https://supabase.com.
2. Project Settings > API: copy the **Project URL** and the **publishable (anon) key**.
3. Put them in `.env.local` (never commit this file):

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   GROQ_API_KEY=your-groq-key
   ```

4. Authentication > Providers: Email is on by default. Turn on **Confirm email** and set the email template to include the 6-digit `{{ .Token }}` (the sign-up screen asks for that code).
5. Authentication > URL Configuration: set **Site URL** to your deployed address, and add `http://localhost:5173/**` and the deployed address to **Redirect URLs** (needed for password reset and Google sign-in).
6. Optional Google sign-in: Authentication > Providers > Google, using a client ID and secret from Google Cloud Console.
7. Make your own account an admin: in the SQL editor, `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"platform_admin"}' where email = 'you@example.com';`

## 2. Edge functions

Install the Supabase CLI, then:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase secrets set GROQ_API_KEY=your-groq-key
supabase functions deploy chart-insight
supabase functions deploy ussd --no-verify-jwt
```

`chart-insight` requires a signed-in user. `ussd` is called by the USSD gateway, so it skips JWT checks; rebuild it first with `node tools/ussd/build-function.mjs` if the USSD logic changed.

## 3. Hosting the site

Any static host works (Vercel, Netlify, Cloudflare Pages). Build command `npm run build`, output folder `dist`, and add the two `VITE_SUPABASE_*` values as environment variables. Add a rewrite of all paths to `/index.html` so deep links like `/login` work.

## 4. Local run

```bash
npm install
npm run dev
```

Checks: `npm test`, `npm run lint`, `npm run build`.
