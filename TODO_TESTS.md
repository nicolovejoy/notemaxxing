# Testing TODO List

## Priority 1: Core Functionality Tests

- [ ] **Data Loading Tests**
  - Test that shared folders are loaded with `includeShared: true`
  - Test that all notes are loaded upfront
  - Test initialization sequence
- [ ] **Hook Return Value Tests**
  - Verify `useFolders()` returns `Folder[]`
  - Verify `useNotebooks()` returns `Notebook[]`
  - Verify no wrapped objects `{ data, loading }`
- [ ] **Share Functionality Tests**
  - Create share invitation
  - Accept invitation
  - Verify permissions created
  - Verify shared resources appear

## Priority 2: Navigation & UI Tests

- [ ] Test `useNavigateToRecentNotebook` finds correct notebook
- [ ] Test error states display correctly
- [ ] Test optimistic updates

## Priority 3: Edge Cases

- [ ] Test behavior with no data
- [ ] Test with large datasets
- [ ] Test error recovery

## Setup Required

- [ ] Choose testing framework (Jest + React Testing Library)
- [ ] Set up test utilities for Zustand stores
- [ ] Mock Supabase client
