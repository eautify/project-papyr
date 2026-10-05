# Papyr

Papyr is a personal book catalog and reading journal. Its first release is designed around private libraries, edition-aware book records, reading progress and history, and custom collections.

## Current state

The repository currently contains the responsive library dashboard foundation. Its visible books and reading totals are illustrative UI data; they are not a connected account or persisted catalog. Authentication, the database schema and policies, and Open Library search will be added on top of this screen.

## Stack

- React, TypeScript, and Vite
- Supabase for authentication and private catalog data
- Open Library for book discovery and bibliographic lookup, through a service boundary

## Run locally

```sh
npm install
npm run dev
```

## Planned architecture

```text
React app
  ├── Auth and private library features
  ├── Catalog services ────────────────┐
  ├── Open Library service wrappers    │
  └── Supabase browser client          │
          │                            │
          ▼                            ▼
     Supabase Auth + Postgres      Supabase Edge Functions
     private rows protected       validate and normalize
     with row-level security      Open Library requests
                                       │
                                       ▼
                                  Open Library
```

Book works and editions will be separate shared metadata records. User catalog entries, reading records, logs, and collections will be private rows protected by Supabase row-level security. The browser must only receive the Supabase publishable key; service credentials belong in server-side configuration.

## Next implementation foundations

1. Define migrations for works, editions, user books, reading records, logs, and collections, including constraints and row-level security.
2. Add Supabase session restoration and authentication routes.
3. Define domain types and service wrappers, then connect the dashboard to the signed-in user's data.
4. Add Open Library Edge Functions for search, work/edition lookup, and discovery.

See [SKILL.md](SKILL.md) for the product and technical blueprint.
