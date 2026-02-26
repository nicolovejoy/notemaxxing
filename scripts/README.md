# Project Scripts

## Utility Scripts

- **`generate-build-info.js`** — Generates build timestamp, runs automatically during `npm run build`

## Firestore Indexes

Indexes are defined in `/firestore.indexes.json` (project root). Deploy with:

```bash
firebase deploy --only firestore:indexes --project piano-house-shared
```

## Legacy

The SQL scripts and Supabase tooling that used to live here have been removed. The project now uses Firestore exclusively. Database schema is defined implicitly by the API routes and `firestore.indexes.json`.
