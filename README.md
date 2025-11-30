# Notemaxxing

Collaborative note-taking with folders, notebooks, and real-time sharing.

## Quick Start

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth)
- **Editor**: TipTap (rich text)
- **State**: React Query + Zustand

## Features

- Folders → Notebooks → Notes hierarchy
- Rich text editing with AI enhancement (Claude)
- Folder sharing with inherited permissions (`read` or `write`)
- User authentication

## Sharing Model

- **Folder-only sharing** - Cannot share individual notebooks or notes
- Shared folder contents inherit permissions automatically
- Email-based invitations with 7-day expiry

## Development

```bash
npm run dev          # Development server
npm run build        # Production build
npm run format       # Prettier
npm run lint         # ESLint
```

## Database

Schema managed via Terraform in `/infrastructure/terraform/`.

## Deployment

Auto-deploys to Vercel on push to main.

## Roadmap

### Planned Features

- **Quizzmaxxing** - Quiz-based learning (multiple choice, true/false, fill-in-blank)
- **Typemaxxing** - Typing-based learning (type answers from memory, WPM tracking)
- Both features will use AI to generate questions from notes

### TODOs

- [ ] Deal with DB security issues. see below
- [ ] Fix AI enhancement numbered list rendering
- [ ] Build Quizzmaxxing and Typemaxxing
- [ ] Create seed script for test data
- [ ] Add test suite
- [ ] Move admin emails to env config

## Security

RLS migration prepared but not applied. See `SECURITY_MIGRATION.md`.
