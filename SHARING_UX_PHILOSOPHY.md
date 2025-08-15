# Sharing UX Philosophy

## Core Principle: Context Determines Capability

**Collection View = Browse & Navigate**  
**Detail View = Manage & Configure**

## Current Implementation

### Routes (✅ Implemented)

- `/` - Homepage with folders & recent notebooks
- `/backpack` - All your folders (college-friendly!)
- `/folders/[id]` - One folder's notebooks
- `/notebooks/[id]` - One notebook's notes

### Sharing Model

**Folder Sharing**:

- Grants access to ALL notebooks and notes inside
- Notebooks inherit folder permissions by default
- Future: Warning if notebooks have conflicting permissions

**Notebook Sharing**:

- Can override folder permissions (more OR less restrictive)
- Grants access to all notes within
- Shows in recipient's "Shared with Me"

### Permission Levels

- **read**: View only
- **write**: Edit content, add items
- **admin**: Share, delete, manage permissions

## UI Rules

### On Collection Views (Homepage, Backpack)

✅ **DO**:

- Navigate on click
- Show shared indicator badges
- Display counts and stats

❌ **DON'T**:

- Show share buttons on cards
- Allow inline editing
- Show delete buttons

### On Detail Pages (Folder, Notebook)

✅ **DO**:

- Show share button in header
- Allow inline title editing
- Display "Shared with X people" section
- Show all management controls

## Navigation Fix Needed

**Current Issue**: Clicking folder title on homepage doesn't navigate to folder detail page

**Solution**: Update folder cards on homepage to navigate to `/folders/[id]` when clicked

## Design System Components

Using components from [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md):

- `PageHeader` - Detail page titles & share buttons
- `Card` - Browsable items in collections
- `ShareDialog` - Sharing UI modal
- `SharedIndicator` - Status badges on cards

## Next Steps

1. Fix folder navigation from homepage
2. Implement permission inheritance warnings
3. Add breadcrumb navigation
4. Create success toasts for actions
