# Notemaxxing TODO List

## Development Philosophy: Ship Fast, Test with Users, Iterate

**Current Focus**: Get to working MVP that college students love
**Skip For Now**: Unit tests, perfect code, complex features
**Success Metric**: Students using it for real classes within 3 weeks

## Development Strategy: Move Fast First

### Phase 1: Core Infrastructure (Week 1)

- [x] ~~Dependencies, Supabase setup, schema, auth~~ ✅
- [x] ~~Configure Vercel environment variables~~ ✅
- [ ] **localStorage → Supabase Migration** (Next up!)
  - [ ] Create Zustand store for state management
  - [ ] Build data service layer (dual read/write)
  - [ ] Implement offline queue with IndexedDB
  - [ ] Add sync status indicators
  - [ ] Auto-migrate existing localStorage data
- [ ] Create default folders for new users

### Phase 2: Essential Features (Week 2)

- [ ] Improve mobile responsiveness
- [ ] Add real-time sync across devices
- [ ] Implement proper error handling
- [ ] Add loading states
- [ ] Basic keyboard shortcuts (Cmd+N for new note)

### Phase 3: User Testing & Polish (Week 3)

- [ ] Test with 3-5 college students
- [ ] Fix critical bugs from feedback
- [ ] Add export functionality
- [ ] Implement search across notes

### Phase 4: AI Features (After Core is Stable)

- [ ] Install `openai` package
- [ ] Create `/api/enhance` endpoint for note enhancement
- [ ] Add AI-powered diagramming
- [ ] Smart quiz generation from notes

## Must-Have Features (MVP)

### Core Functionality

- [x] ~~Auto-save with debouncing~~ ✅ COMPLETED
- [ ] Mobile-first responsive design
- [ ] Offline support with sync
- [ ] Search across all notes
- [ ] Export notes (PDF/Markdown)

### Learning Features

- [ ] Note selection UI for quiz/typing practice:
  - Checkbox selection (rounded squares)
  - Shift+click range selection
  - Visual feedback for selected notes
- [ ] Improved quiz generation from notes
- [ ] Better typing practice with note content

## Nice-to-Have Features (Post-MVP)

### Enhanced Editing

- [ ] Markdown support
- [ ] Dark mode
- [ ] Tags/categories for notes
- [ ] Bulk operations
- [ ] Move notes between notebooks

### AI Features (Phase 4)

- [ ] Note enhancement/expansion
- [ ] AI-generated diagrams
- [ ] Smart summaries
- [ ] Study guide generation

### Future Considerations

- [ ] Collaborative editing
- [ ] Rich text editor
- [ ] File attachments
- [ ] Note templates
- [ ] Public sharing links

## Technical Architecture

### Folder Structure

```
/lib
  /supabase.ts    # Supabase client
  /store.ts       # Zustand store
  /ai.ts          # AI functions
/api
  /notes          # CRUD endpoints
  /enhance        # AI enhancement
  /quiz           # Quiz generation
```

### Testing Strategy

- **Current**: Manual testing only
- **Future**: Add Vitest + React Testing Library when stable

## Success Metrics

- User creates first note < 30 seconds
- Auto-save works 100% reliably
- Works perfectly on mobile
- College students use it for real classes

## Data Migration Architecture

### Dual Write Strategy

```
User Action → Memory/localStorage (instant) → Background sync to Supabase
```

### Sync Priority

1. **Online**: Read from Supabase, write to both
2. **Offline**: Read/write localStorage, queue for sync
3. **Reconnect**: Process sync queue automatically

### Key Features

- **No data loss**: Existing localStorage migrates on first login
- **Instant UI**: Updates happen at localStorage speed
- **Cross-device**: Data syncs when online
- **Offline-first**: Works perfectly without internet
