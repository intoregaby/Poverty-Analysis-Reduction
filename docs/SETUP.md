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

   `.env.example` lists every supported variable with placeholders; copy it to `.env.local` and fill
   in real values. Provider credentials may be supplied from several authorized accounts: use
   `GROQ_API_KEY`, `GROQ_API_KEY_2` … `GROQ_API_KEY_9` (same pattern for `NVIDIA_API_KEY`,
   `OLLAMA_API_KEY`). Keys are tried in order and the engine fails over to the next key when one is
   rejected or rate-limited; extra keys never raise the provider's account quota. Never commit
   `.env.local` or paste key values into issues, logs or the browser bundle.

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

### Checking provider keys and credit

```bash
python scripts/check_provider_accounts.py
```

The script reads key *names* from `.env.local`, authenticates every `PROVIDER_API_KEY[_2.._9]` slot against
`/models`, then makes one `max_tokens=1` call to confirm completion credit is available. It prints and
stores only slot names, HTTP statuses, model counts and rate-limit headers — never a key value — in
`docs/implementation/evidence/provider_credentials.json`. A `QUOTA_EXHAUSTED` line means the account is
rate-limited or out of tokens; `KEY_REJECTED` means the key is invalid or revoked. All keys failed over
during normal operation are tried in suffix order, so one exhausted key does not take the provider down.

## 3. Hosting the site

Any static host works (Vercel, Netlify, Cloudflare Pages). Build command `npm run build`, output folder `dist`, and add the two `VITE_SUPABASE_*` values as environment variables. Add a rewrite of all paths to `/index.html` so deep links like `/login` work.

## 4. Local run

```bash
npm install
npm run dev
```

Checks: `npm test`, `npm run lint`, `npm run build`.
