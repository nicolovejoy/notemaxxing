# Notemaxxing

Collaborative note-taking with folders, notebooks, and sharing.

## Quick Start

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore, Auth) via API routes
- **Editor**: TipTap (rich text)
- **State**: Zustand (notebook page) + React Query (folders/backpack)
- **Drag-and-drop**: dnd-kit (note reordering)
- **AI**: Claude API for note enhancement and quiz generation

## Features

- Folders → Notebooks → Notes hierarchy
- Rich text editing with AI enhancement
- Manual note reordering (drag-and-drop)
- Folder sharing with inherited permissions (`read` or `write`)
- Email invitations and shareable links
- Firebase Auth (Google + email/password)

## Sharing Model

- **Folder-only sharing** — cannot share individual notebooks or notes
- Shared folder contents inherit permissions automatically
- Email-based invitations with 7-day expiry

## Development

```bash
npm run dev          # Development server
npm run build        # Production build
npm run format       # Prettier
npm run lint         # ESLint
```

## Deployment

- Production: notemaxxing.net (Vercel, auto-deploys on push to main)
- Firebase project: `piano-house-shared`
- CI: GitHub Actions runs `npm run build` on PRs to main
- Firestore indexes: `firebase deploy --only firestore:indexes --project piano-house-shared`

## Roadmap

- **Quizzmaxxing** — Quiz-based learning (multiple choice, fill-in-blank)
- **Typemaxxing** — Typing-based learning (type from memory, WPM tracking)
- Both features use AI to generate questions from notes
- Extract shared API helpers (ADMIN_EMAILS, email validation, permission checking)
- Write `firestore.rules` for defense-in-depth
