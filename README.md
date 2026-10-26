# Trace

Trace turns one uploaded video or PDF into a focused learning workspace with source analysis, structured study material, and a grounded tutor.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS with small shadcn-style primitives
- Supabase Auth, Postgres, and private Storage
- Inngest for resilient background processing
- Gemini (`@google/genai`) for multimodal source analysis
- Mistral (`@mistralai/mistralai`) for learning material and tutor responses
- Zod for API and provider output validation

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project and run [`supabase/setup.sql`](./supabase/setup.sql) in the Supabase SQL editor. Rerun it after pulling schema or Storage-policy changes; it is idempotent. The original [`supabase/schema.sql`](./supabase/schema.sql) is also included as a reference.

3. Enable email magic links in Supabase Auth. Add `http://localhost:3000/auth/callback` to the Auth redirect allow-list for local development. Add the production callback URL after deploying to Vercel.

4. Copy `.env.example` to `.env.local` and provide:

   - Supabase URL and anon key
   - Supabase service role key (server-only)
   - Gemini API key (server-only)
   - Mistral API key (server-only)
   - Inngest event and signing keys

5. Start the app:

   ```bash
   npm run dev
   ```

6. Local development uses a direct background processor automatically, so you do not need to run the event worker for the prototype. Production uses the event worker path. If you want to test that path locally, run:

   ```bash
    npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
    ```

## Google sign-in setup

The sign-in page now includes a Google button. Configure the provider once in Supabase and Google:

1. In Google Cloud Console, create or select a project.
2. Open Google Auth Platform and configure the consent screen with your app name and support email.
3. Create an OAuth client with application type **Web application**.
4. Add your local origin to **Authorized JavaScript origins**, for example `http://localhost:3001`.
5. Copy the callback URL shown in Supabase under **Authentication → Providers → Google** into Google's **Authorized redirect URIs**. Do not use `/auth/callback` here; Google's redirect goes to Supabase first.
6. Copy the Google Client ID and Client Secret into Supabase's Google provider settings and enable the provider.
7. In Supabase, open **Authentication → URL Configuration** and add the app callback URLs to the redirect allow-list:
   - `http://localhost:3001/auth/callback`
   - `https://YOUR_DOMAIN/auth/callback`
8. Restart the app and click **Continue with Google**.

Use the same exact port as the running app. If the app uses port `3000` instead of `3001`, use `3000` in all local URLs.

## Podcast voice setup

The podcast player prefers a real female voice for Maya when enhanced audio is configured. Set the voice explicitly in `.env.local`:

```env
ELEVENLABS_API_KEY=your-server-only-key
ELEVENLABS_VOICE_MAYA=OZ0L6eISlOejga3XjDFt
ELEVENLABS_TTS_MODEL=eleven_multilingual_v2
```

Then restart `npm run dev`. The app uses enhanced audio by default, passes the lesson language to the speech API, and keeps continuity context between dialogue turns. The lesson language menu includes English, Spanish, French, German, Hindi, Japanese, Chinese, Arabic, Korean, Portuguese, Italian, Indonesian, Dutch, Turkish, Filipino, Polish, Swedish, Bulgarian, Romanian, Czech, Greek, Finnish, Croatian, Malay, Slovak, Danish, Tamil, Ukrainian, and Russian. Without enhanced audio, the browser fallback uses the matching locale when the operating system exposes one.

## Tutor chat provider

Tutor chat uses Groq when `GROQ_API_KEY` is configured. Add the key to `.env.local` and restart the app:

```env
GROQ_API_KEY=your-server-only-key
TRACE_GROQ_MODEL=openai/gpt-oss-120b
```

The key stays on the server. If Groq is unavailable, Trace falls back to the configured Mistral provider, then to the local source-grounded fallback in development. Each question now uses the latest 12 chat messages, and each completed question is appended with a functional state update so replies do not overwrite earlier turns.

## Vercel deployment

### 1. Put the project in GitHub

This folder is not currently connected to a Git repository. Create a private GitHub repository, then from the project folder run:

```bash
git init
git add .
git commit -m "feat: prepare Trace for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Do not commit `.env.local`. It is already ignored by `.gitignore`.

### 2. Import into Vercel

1. Open Vercel Dashboard.
2. Select **Add New → Project**.
3. Import the GitHub repository.
4. Keep the detected framework as **Next.js**.
5. Keep the build command as `npm run build`.
6. Add the production environment variables listed below.
7. Deploy.

Vercel detects this as a Next.js project and uses the existing `npm run build` script.

### 3. Add Vercel environment variables

Add these in **Project → Settings → Environment Variables**. Add them to **Production** and **Preview** when you want both environments to work:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_GEMINI_API_KEY
MISTRAL_API_KEY
GROQ_API_KEY
ELEVENLABS_API_KEY
ELEVENLABS_VOICE_LEO
ELEVENLABS_VOICE_MAYA
ELEVENLABS_TTS_MODEL
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
TRACE_GEMINI_MODELS
TRACE_MISTRAL_MODEL
TRACE_GROQ_MODEL
TRACE_PODCAST_GEMINI_MODEL
TRACE_LOCAL_PROCESSING=false
TRACE_ALLOW_LOCAL_FALLBACK=false
```

Use real values for every key. Do not paste `.env.local` into the repository. Vercel stores variables separately per environment, and changes apply to the next deployment.

### 4. Configure Inngest

This app serves Inngest at:

```text
https://YOUR_DOMAIN/api/inngest
```

Install the **Inngest Vercel integration** and connect the production project. It sets the event/signing variables and automatically syncs the `/api/inngest` endpoint after deployments. The route is configured with `maxDuration = 300` for Vercel.

If you do not use the integration, manually sync the deployed endpoint in Inngest Dashboard → Apps → Sync new app. Keep the app ID as `trace`.

If Vercel Deployment Protection blocks Inngest, disable protection for the serve endpoint or configure Vercel Protection Bypass for Automation.

### 5. Configure Supabase Auth

After the first deployment, copy your Vercel production URL and set Supabase **Authentication → URL Configuration**:

```text
Site URL:
https://YOUR_DOMAIN

Redirect URL:
https://YOUR_DOMAIN/auth/callback
```

For Vercel previews, add a wildcard such as:

```text
https://*-YOUR_TEAM_SLUG.vercel.app/**
```

Use an exact production URL plus a wildcard for Vercel preview deployments.

For Google login, keep Google's authorized redirect URI pointed at the Supabase callback URL shown under **Authentication → Providers → Google**. Do not replace it with the Vercel callback URL.

### 6. Test the live app

Test in this order:

1. Open `/sign-in`.
2. Test Google login and magic-link login.
3. Create a small PDF lesson first.
4. Confirm it changes from queued to complete.
5. Ask two different tutor questions.
6. Confirm both replies remain visible.
7. Test Hindi audio if ElevenLabs is configured.
8. Test a video only after PDF processing works.

The browser only receives Supabase public credentials. Gemini, Mistral, Groq, ElevenLabs, Inngest signing, and the service-role key are read only in server-side modules and route handlers.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```
