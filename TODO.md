# Notemaxxing TODO List

## High Priority Issues

### ✅ COMPLETED: Dynamic Folders & Full CRUD Operations

**Folders** - FULLY DYNAMIC:
- ✅ Create: New folders with custom names and colors
- ✅ Read: Stored in localStorage, no longer hardcoded
- ✅ Update: Inline rename functionality
- ✅ Delete: With confirmation and cascade delete

**Notebooks** - FULL CRUD + ARCHIVE:
- ✅ Create: Within any folder
- ✅ Read: Navigate to individual notebook pages
- ✅ Update: Inline rename functionality
- ✅ Archive: Soft delete with restore option
- ✅ Delete: Permanent delete (only for archived)

**Notes** - FULL CRUD:
- ✅ Create: Within notebooks
- ✅ Read: View and navigate notes
- ✅ Update: Edit title and content
- ✅ Delete: Remove individual notes

## Features to Implement

### Data Management
- [x] ~~Make folders dynamic (store in localStorage)~~ ✅ COMPLETED
- [x] ~~Add folder CRUD operations (Create, Update, Delete)~~ ✅ COMPLETED
- [x] ~~Add notebook rename/edit functionality~~ ✅ COMPLETED
- [ ] Add bulk operations (delete multiple notes/notebooks)
- [ ] Add move operations (move notes between notebooks, notebooks between folders)
- [ ] Add export/import functionality for backup
- [ ] Add search functionality across all notes
- [ ] Add tags or categories to notes

### UI/UX Improvements
- [x] ~~Simplify folder cards on home screen (show only name and count)~~ ✅ COMPLETED
- [ ] Add loading states for data fetching
- [x] ~~Add confirmation dialogs for delete operations~~ ✅ COMPLETED (for folders)
- [ ] Add keyboard shortcuts (Cmd+N for new note, etc.)
- [ ] Add markdown support for notes
- [ ] Add dark mode

### Performance
- [ ] Add debouncing for note auto-save
- [ ] Optimize localStorage usage (consider IndexedDB for larger datasets)
- [ ] Add pagination for large numbers of notes

### Mobile Experience
- [ ] Improve responsive design for mobile
- [ ] Add swipe gestures for navigation
- [ ] Optimize touch targets

## Technical Debt
- [ ] Add error boundaries
- [ ] Add proper TypeScript types for localStorage operations
- [ ] Consolidate data access into a service layer
- [ ] Add unit tests
- [ ] Add data validation

## Future Enhancements
- [ ] User authentication
- [ ] Cloud sync with a backend
- [ ] Collaborative editing
- [ ] Rich text editor
- [ ] File attachments
- [ ] Note templates
- [ ] Note sharing via public links

## Bugs to Fix
- [x] ~~Folders showing as hardcoded "2025" - should be dynamic~~ ✅ FIXED
- [ ] Ensure all localStorage operations handle errors gracefully
- [ ] Fix any navigation issues between notebook and note views