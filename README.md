# iconic-engine

Public booking engine for Iconic. Nuxt 4 with **SSR** on port **3000**. Extends the `iconic-ui` layer and applies engine-only visual overrides from the booking-engine prototype.

| | |
|---|---|
| Port | **3000** |
| Render | SSR |
| Layer | local `../iconic-ui`; Netlify `github:iconic-project/iconic-ui#dev` |
| API | `NUXT_PUBLIC_API_BASE` (default `http://localhost:8000`) |

The API must already allow this origin. CORS is configured on the API via `FRONTEND_ENGINE_URL=http://localhost:3000`.

## Setup

```bash
pnpm install
cp .env.example .env
```

`.env`:

```
NUXT_PUBLIC_API_BASE=http://localhost:8000
```

## Run

From the Cursor workspace, use **Iconic: start everything** — it starts the API and `pnpm dev --port 3000` for this app.

Or locally:

```bash
pnpm dev
```

Open `http://localhost:3000`.

Placeholder routes (flow built in Sprint 8): `/`, `/itineraries`, `/itineraries/[slug]`, `/book/cabins`, `/book/details`, `/book/confirmation`, `/charter`.

## Deploy (Netlify)

`netlify.toml` owns the build command (`pnpm build`) and publish directory (`dist`). Do not set those in the Netlify UI. Set `NUXT_PUBLIC_API_BASE` in the site env.

The API must allow this origin: `FRONTEND_ENGINE_URL`, plus the host in `SANCTUM_STATEFUL_DOMAINS`.

## Quality

```bash
pnpm lint
pnpm typecheck
pnpm build
```
