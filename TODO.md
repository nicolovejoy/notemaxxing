# Notemaxxing TODO List

## High Priority Issues

### 1. ❗ Folders are Hardcoded
**Problem**: Folders (Q1-Q4) are hardcoded in multiple files
**Files affected**:
- `/app/folders/page.tsx` - Lines 24-29
- `/app/page.tsx` - Lines 25-30
- Folders cannot be created, edited, or deleted by users

**Solution**: 
- Store folders in localStorage like notebooks
- Add folder management UI (create, edit, delete)
- Migrate existing hardcoded folders to localStorage on first load

### 2. ❗ Complete CRUD Operations
**Current Status**:
- **Notebooks**: ✅ Create, ✅ Read, ❌ Update (rename), ✅ Delete
- **Notes**: ✅ Create, ✅ Read, ✅ Update, ✅ Delete (in notebook page)
- **Folders**: ❌ Create, ✅ Read, ❌ Update, ❌ Delete (hardcoded)

**Missing Operations**:
- Cannot rename notebooks (only delete)
- Cannot rename/edit folders
- Need better organization of CRUD operations

## Features to Implement

### Data Management
- [ ] Make folders dynamic (store in localStorage)
- [ ] Add folder CRUD operations (Create, Update, Delete)
- [ ] Add notebook rename/edit functionality
- [ ] Add bulk operations (delete multiple notes/notebooks)
- [ ] Add move operations (move notes between notebooks, notebooks between folders)
- [ ] Add export/import functionality for backup
- [ ] Add search functionality across all notes
- [ ] Add tags or categories to notes

### UI/UX Improvements
- [ ] Add loading states for data fetching
- [ ] Add confirmation dialogs for delete operations
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
- [ ] Folders showing as hardcoded "2025" - should be dynamic
- [ ] Ensure all localStorage operations handle errors gracefully
- [ ] Fix any navigation issues between notebook and note views