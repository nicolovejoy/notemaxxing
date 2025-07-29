# Notebook Page Refactor Plan

## Goal
Transform the isolated notebook page into a contextual workspace with folder awareness and sibling notebook navigation.

## Current Problems
- No visibility of which folder you're in
- Can't switch between notebooks without going back
- No context of sibling notebooks
- Inconsistent styling with folders page

## New Layout Design

```
┌─────────────────────────────────────────────────────────┐
│ [←] Notemaxxing                                         │
├─────────────────────┬───────────────────────────────────┤
│ FOLDER SIDEBAR      │ MAIN CONTENT AREA                 │
│                     │                                   │
│ 📁 Q1 2025         │ Math Notes                        │
│                     │ [🔍 Search] [Filter ▼] [Sort ▼]   │
│ Notebooks:          │                                   │
│ ▸ Math Notes ✓     │ ┌─────────────┐ ┌─────────────┐ │
│ ▸ Physics          │ │ Note Card   │ │ Note Card   │ │
│ ▸ Chemistry        │ │ Calculus    │ │ Linear Alg  │ │
│                     │ │ Updated: 2h │ │ Updated: 1d │ │
│                     │ └─────────────┘ └─────────────┘ │
│                     │ ┌─────────────┐ ┌─────────────┐ │
│                     │ │ Note Card   │ │ + Add Note  │ │
│                     │ │ Diff Eqs    │ │             │ │
│                     │ │ Updated: 3d │ │             │ │
│                     │ └─────────────┘ └─────────────┘ │
└─────────────────────┴───────────────────────────────────┘
```

## Key Features

1. **Folder Context**
   - Show current folder name and color
   - Display folder icon

2. **Notebook List**
   - List all notebooks in current folder
   - Highlight currently selected notebook
   - Click to switch instantly

3. **Notes Grid View**
   - Display notes as cards (similar to folder cards)
   - Show note title and last updated time
   - Default sort: Most recently edited first
   - Grid layout with responsive columns
   - "Add Note" card always visible

4. **Search & Organization**
   - Search bar (placeholder for now)
   - Filter dropdown (placeholder for now)
   - Sort options: 
     - Recently edited (default)
     - Alphabetical
     - Date created

5. **Consistent Styling**
   - Card-based layout matching folders page
   - Same hover effects and shadows
   - Consistent spacing and typography

6. **Preserved Functionality**
   - All existing note CRUD operations
   - Auto-save behavior
   - Click card to open/edit note

## Technical Implementation

1. **Update notebook page route** to fetch folder info
2. **Create sidebar component** with folder/notebooks data
3. **Convert notes list to card grid**
   - Create NoteCard component
   - Implement grid layout
   - Add "Add Note" card
4. **Add search/filter/sort UI**
   - Search input (non-functional placeholder)
   - Filter dropdown (non-functional placeholder)
   - Sort dropdown (functional)
5. **Implement sorting logic**
   - Recently edited (default)
   - Alphabetical
   - Date created
6. **Add notebook switching** without page reload
7. **Apply consistent card styles** from folders page

## Success Criteria

- [ ] Users can see which folder they're in
- [ ] Users can see all notebooks in the folder
- [ ] Users can switch notebooks without going back
- [ ] Notes displayed as cards in grid layout
- [ ] Sort functionality works (recently edited by default)
- [ ] Search and filter UI present (as placeholders)
- [ ] Card styling matches folders page
- [ ] All existing functionality preserved