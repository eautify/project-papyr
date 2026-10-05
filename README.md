# Papyr

Papyr is a private, edition-aware book catalog and reading journal. Readers can discover a title, choose the specific edition, save it to a personal library, track reading and purchase state independently, keep a reread history, write private reflections, and organize editions into collections.

## Features

- Email/password sign-up, confirmation, login, logout, and password recovery
- Private catalog with separate work and edition records
- Add a work even when Open Library has no edition record; choose an edition when available
- Open Library search by title, author, general query, or ISBN
- Reading status, independent ownership and purchase flags, favorites, page/percent progress, activity logs, completion and DNF history, and rereads
- Private ratings, reviews, spoiler flags, and notes
- Custom private collections with membership and accessible reorder controls
- Dashboard totals, annual pages/finishes/ratings/duration, monthly activity, reading streak, category and author summaries, and recent activity
- Responsive layout, keyboard-visible focus, empty/loading/error states, and cover fallbacks

## Stack and architecture

- React, TypeScript, Vite, React Router, and TanStack Query
- Supabase Auth and PostgreSQL with row-level security
- A Supabase Edge Function boundary for Open Library search, discovery, details, and import
- Open Library works and editions are stored separately; user-owned tracking is held in private rows

```text
React + Vite
  ├── Supabase Auth + private Postgres rows (RLS)
  └── Supabase Edge Function: book-service
        ├── validates and normalizes Open Library requests
        ├── persists selected shared metadata through a privileged RPC
        └── creates the authenticated user's catalog entry transactionally
                    │
                    └── Open Library Search / Works / Editions / Covers
```

The browser only uses a publishable key. The Edge Function validates the caller's Supabase user session; its service key stays server-side. Private reviews, notes, reading records, and collections are protected by database policies, not by frontend filters.

## Environment setup

Copy `.env.example` to `.env`, then set values from the **same Supabase project**:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Only a publishable key belongs in a `VITE_` variable. Never put a Supabase secret/service-role key in `.env` under a `VITE_` name. Papyr detects a secret key in the browser-key field and stops before creating a client.

Install and run the frontend:

```sh
npm install
npm run dev
```

## Supabase setup

1. Link the Supabase CLI to the project, or run a local Supabase stack.
2. Apply the schema and security migration:

   ```sh
   supabase db push
   ```

3. Deploy the Edge Function:

   ```sh
   supabase functions deploy book-service
   ```

4. Set `OPEN_LIBRARY_USER_AGENT` to an identifying application name and contact URL/email. Optionally set `APP_ORIGIN` to the frontend origin for a restricted CORS origin. The Supabase function runtime provides the project URL and service-role secret; do not copy these into frontend variables.
5. In **Authentication → URL Configuration**, allow the local and production app URLs, including `/app` and `/reset-password` redirects.
6. Confirm email delivery settings for account confirmation and password-reset emails.

The migrations in `supabase/migrations/` create the shared works/authors/editions tables, private profile/catalog/history/log/collection tables, RLS policies, transactional reading-state functions, and server-only metadata persistence RPCs. Catalog entries point to a work and may also point to a specific edition, so books with no listed edition can still be added. A pgTAP ownership test is in `supabase/tests/rls.test.sql`.

The Edge Function consolidates the blueprint's search/work/edition/discover/import boundaries into one authenticated endpoint to keep deployment simple. The frontend calls it through `src/services/books.ts`; React components do not make direct Open Library requests. Book covers render directly from Open Library, with local fallbacks.

## Local development and checks

```sh
npm run dev
npm run build
npm run lint
npm test
```

Run the SQL RLS test against the linked/local Supabase database with:

```sh
supabase test db
```

The frontend unit tests cover ISBN normalization, progress bounds, derived subject categories, and reading streak calculations. The database test checks private profile/library/collection visibility and cross-user insert rejection. For a release, also exercise signup confirmation, password reset, catalog mutations, Open Library function requests, and the RLS test against a non-production Supabase project.

## Deployment and privacy

Build the static frontend with `npm run build`; host `dist/` on any Vite-compatible static host with SPA fallback rewrites for `/app/*`, `/login`, `/signup`, and password recovery routes. Deploy the migration and Edge Function to the matching Supabase project and configure frontend environment variables in the host.

Every user's catalog, reading history, activity logs, collections, and profile are private to their authenticated user. Shared bibliographic metadata is read-only to authenticated browser users and only written by the server-side import path. Social profiles, public shelves, retailer links, barcode scanning, and AI recommendations are intentionally outside v1.
