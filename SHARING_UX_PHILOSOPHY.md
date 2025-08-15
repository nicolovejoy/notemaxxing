# Sharing UX Philosophy

## Core Principle: Context Determines Capability

**View = Browse & Navigate**  
**Detail = Manage & Configure**

## Page Types & Their Roles

### Collection Pages (Browse Multiple Items)

**Purpose**: Discovery, navigation, status overview  
**Examples**: `/folders`, future `/study-sessions`

**Shows**:

- Item cards with key info
- Sharing indicators (icon/badge)
- Quick stats (counts, dates)

**Does NOT show**:

- Share buttons
- Edit controls
- Delete buttons

### Detail Pages (Focus on One Item)

**Purpose**: Work within a specific context  
**Examples**: `/folders/[id]` (one folder's notebooks), `/notebooks/[id]` (one notebook's notes)

**Shows**:

- Item title (editable inline)
- Share button in header
- "Shared with" section
- All management controls

## Sharing Rules

### What Gets Shared

**Folder Sharing**:

- Grants access to ALL notebooks and notes inside
- Notebooks inherit folder permissions by default
- ⚠️ Shows warning if any notebooks have conflicting permissions

**Notebook Sharing**:

- Can override folder permissions (more OR less restrictive)
- Grants access to all notes within
- Shows in recipient's "Shared with Me" if folder isn't shared

### Permission Inheritance

```
Folder (write) → All notebooks inside (write) → All notes (write)
                  ↓
                  Unless notebook has explicit override
                  ↓
                  Warning shown when sharing folder
```

### Permission Levels

**read**: View only  
**write**: Edit content, add items  
**admin**: Share, delete, manage permissions

### Conflict Detection

When sharing a folder, check for notebooks with explicit permissions:

- **Match**: No warning needed
- **More restrictive**: 🔒 "Some notebooks have restricted access"
- **Less restrictive**: ⚠️ "Some notebooks have broader access"

## Route Clarity (Implementation Required)

**Current (Confusing)**:

- `/folders` - All folders
- `/notebooks/[id]` - Actually shows ONE folder's contents

**Proposed (Clear)**:

- `/backpack` - All your folders (college-friendly!)
- `/folders/[id]` - One folder's notebooks
- `/notebooks/[id]` - One notebook's notes

## Action Placement

### On Cards (Collection View)

✅ Navigate on click  
✅ Show shared indicator  
❌ NO inline editing  
❌ NO share buttons  
❌ NO delete buttons

### In Headers (Detail View)

✅ Editable title  
✅ Share button  
✅ Settings menu  
✅ Navigation breadcrumbs

### In Page Body (Detail View)

✅ "Shared with X people" section  
✅ Permission management  
✅ Child items as cards

## Future Collections

**Study Sessions** (Planned):

- Custom collections across folders/notebooks
- For quizzing and typing practice
- Share study sessions with others
- Same rules: browse in collection, manage in detail

## Implementation Priority

1. **Fix route names** - Clear up confusion
2. **Move share buttons** - From cards to page headers
3. **Add detail pages** - Notebook detail view
4. **Unify patterns** - Same behavior everywhere

## Design Decisions

**Inheritance by default** - Sharing a folder shares everything inside  
**Explicit overrides allowed** - Notebooks can have different permissions  
**Conflict warnings** - Alert when permissions don't match expectations  
**Status everywhere** - Always show if something is shared  
**Actions in context** - Management only on detail pages

## Building It

When implementing, use components from [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md):

- `PageHeader` for detail page titles & share buttons
- `Card` for browsable items
- `IconButton` for share indicators
- `Modal` + `ShareDialog` for sharing UI
- `StatusMessage` for permission feedback

Keep it simple: if users can't find it, they can't share it.
