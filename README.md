# Notemaxxing

A collaborative note-taking application with folders, notebooks, and real-time sharing.

**Status**: Pre-production (limited users)

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit http://localhost:3000

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth)
- **Editor**: TipTap (rich text editing)
- **State**: React Query (server state), Zustand (UI state)
- **Deployment**: Vercel

## Features

### Core Functionality

- ✅ Folders, notebooks, and notes hierarchy
- ✅ Rich text editing with AI enhancement
- ✅ Folder sharing with inherited permissions
- ✅ User authentication
- ✅ Admin console for user management

### Sharing System

- **FOLDER-ONLY SHARING**: You can ONLY share folders (NOT individual notebooks or notes)
- **Inherited permissions**: When you share a folder, ALL notebooks and notes inside automatically inherit those permissions
- **Permission levels**: `read` (view only) or `write` (can edit)
- **Invitation flow**: Email-based with 7-day expiry and preview
- **Ownership model**: Notebooks inherit folder's owner, notes inherit notebook's owner
- **Important**: Notebook/note sharing was intentionally removed to simplify the permission model

## Development

### Database Management

**Database**: `dvuvhfjbjoemtoyfjjsg` (production)

Schema changes via Terraform:

```bash
# 1. Update schema
edit /infrastructure/setup-database.sql

# 2. Apply changes (ask developer to do this, not agent)
cd infrastructure/terraform
terraform apply
```

### Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run format       # Format code with Prettier
npm run lint         # Run ESLint
npm run type-check   # TypeScript checking
```

## Deployment

Automatic deployment via Vercel on push to main branch.

## Project Roadmap

### Current TODOs

#### Bug Fixes & Features

- [x] Add read-only view mode for notes with view permission
- [x] Hide delete button on view-only shared notes
- [x] Fix note click behavior (first click does nothing, second works)
- [x] Fix date/timezone issues (shows 'Yesterday' for just-created items)
- [x] Fix folder name editing (broken)
- [x] Fix notebook name editing (broken)
- [ ] Fix note name editing (if needed)
- [x] Fix real-time sync issues (cache invalidation on permissions change)
- [ ] Fix AI enhancement numbered list rendering
- [ ] Change default share permission to 'can edit' instead of 'can view'
- [ ] Build out quizzing and typemaxing
- [ ] Fix user emails showing as UUIDs in share dialog (needs API endpoint)
- [ ] Create seed script for generating test data
- [ ] Build out user profiles, maybe teams, maybe friends
- [ ] Implement master-detail view for notes (instead of modals)

#### Production Readiness (eventually - not today)

- [ ] Add test suite
- [ ] Set up CI/CD pipeline
- [ ] Move admin emails from hardcoded to environment config
- [ ] Code of conduct for users
- [ ] Cost management and visibility

#### Ask Max (UX Questions)

- [ ] Make ownership model clear in UX to users
- [ ] Show ownership and sharing info more clearly in UI (owner label in dialog?)
- [ ] Are folders and notebooks routes too similar? Is there a better approach?
- [ ] AI assisted content creation (notes, notebooks, folders) as a way to lure friends into the ecosystem

#### To Discuss

- [ ] Admin access configuration approach

## Documentation

- `README.md` - This file, for developers
- `CLAUDE.md` - Guidelines for AI assistants
- `ARCHITECTURE.md` - Deep technical details

## License

Private project
