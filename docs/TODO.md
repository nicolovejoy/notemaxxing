# Notemaxxing TODO

## 🚀 Immediate Priorities

### 0. Refactor State Management Architecture 🆕

- [ ] Move Zustand store outside React lifecycle
- [ ] Load all user data (including shares) on initial login
- [ ] Make React components stateless consumers
- [ ] Add real-time sync capabilities

**Why**: Current architecture blocks sharing and won't scale. Zustand lives inside React instead of being a proper external state manager.

### 1. ~~Fix Data Loading on Login (Production)~~ ✅ FIXED

- [x] Folders don't load after login in production
- [x] Same issue we fixed in dev but still happening in prod
- [x] Need to ensure store initializes properly after auth
- [x] **FIXED**: Added auth state listener and retry logic (PR #1)

### 2. ~~Implement Sharing Features~~ ⚠️ BLOCKED

**Status**: UI built, but blocked by state architecture issues

**What's Done**:

- [x] Database tables (share_invitations, permissions)
- [x] API endpoints (/api/shares/\*)
- [x] ShareDialog UI component
- [x] Share acceptance flow (/share/[id])

**What's Broken**:

- [ ] Can't create invitations (FK constraint to auth.users)
- [ ] Share metadata doesn't load with initial data
- [ ] State management needs refactoring

**See**: ARCHITECTURE.md for technical details

### 3. Add Encryption for Shared Content

- [ ] Encrypt shared folders/notebooks
- [ ] Key management for shared access
- [ ] Ensure performance isn't impacted

### 4. Re-implement Seed Data (After Sharing)

- [ ] Add starter content for new users
- [ ] "Initialize Account" button on homepage
- [ ] Tutorial notebooks with examples

## 📋 Next Features

### Quiz Feature

- [ ] Generate quizzes from selected notes
- [ ] Multiple choice and open-ended questions
- [ ] Track scores and progress
- [ ] Study mode with spaced repetition

### Export & Import

- [ ] Export notes to PDF/Markdown
- [ ] Bulk export folders/notebooks
- [ ] Import from other note apps
- [ ] Backup/restore functionality

### Better Organization

- [ ] Tags for cross-folder organization
- [ ] Smart folders (saved searches)
- [ ] Note templates
- [ ] Archive system improvements

## 🐛 Known Issues

- [ ] Performance with large number of notes
- [ ] Better error messages for users
- [ ] Mobile UI needs optimization
- [ ] Search could be faster

## ✅ Recently Fixed

- [x] AI Enhancement Selection Bug - Fixed by preserving selection range through modal lifecycle
- [x] Enhance button positioning - Now stays within editor bounds

## 💡 Future Ideas

- [ ] Voice notes
- [ ] Drawing/sketching support
- [ ] Real-time collaboration
- [ ] API for integrations
- [ ] Mobile apps
