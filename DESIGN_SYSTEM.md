# Design System Documentation

## Overview

This document outlines the reusable UI components and patterns in our design system. Always use these components instead of creating new ones from scratch.

## Core Components

### Form Components

#### FormField

Universal input component with built-in label, error handling, and accessibility.

```tsx
import { FormField } from '@/components/ui/FormField'

;<FormField
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="Enter email"
  error={error}
  helperText="We'll never share your email"
  disabled={loading}
/>
```

#### SelectField

Dropdown select with consistent styling and error handling.

```tsx
import { SelectField } from '@/components/ui/SelectField'

;<SelectField
  label="Permission"
  value={permission}
  onChange={(value) => setPermission(value)}
  options={[
    { value: 'read', label: 'Can view' },
    { value: 'write', label: 'Can edit' },
  ]}
  error={error}
  disabled={loading}
/>
```

#### LoadingButton

Button with built-in loading state and spinner.

```tsx
import { LoadingButton } from '@/components/ui/LoadingButton'

;<LoadingButton
  loading={isSubmitting}
  loadingText="Saving..."
  variant="primary" // primary | secondary | danger | ghost
  size="md" // sm | md | lg
  icon={SaveIcon}
  fullWidth
  onClick={handleSubmit}
>
  Save Changes
</LoadingButton>
```

### Feedback Components

#### StatusMessage

Consistent status messages with icons.

```tsx
import { StatusMessage } from '@/components/ui/StatusMessage'

;<StatusMessage
  type="error" // error | success | warning | info
  message="Something went wrong"
  onDismiss={() => setError(null)}
/>
```

### Modal Components

#### Modal

Base modal with consistent styling and behavior.

```tsx
import { Modal } from '@/components/ui/Modal'

;<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Modal Title"
  size="md" // sm | md | lg
>
  {/* Modal content */}
</Modal>
```

#### ModalFooter

Consistent footer for modal actions.

```tsx
import { ModalFooter } from '@/components/ui/ModalFooter'

;<ModalFooter>
  <LoadingButton variant="secondary" onClick={onCancel}>
    Cancel
  </LoadingButton>
  <LoadingButton variant="primary" onClick={onConfirm}>
    Confirm
  </LoadingButton>
</ModalFooter>
```

### Layout Components

#### Card

Container with consistent styling.

```tsx
import { Card, CardHeader, CardBody } from '@/components/ui/Card'

;<Card hover onClick={handleClick}>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
</Card>
```

#### PageHeader

Consistent page header with navigation.

```tsx
import { PageHeader } from '@/components/ui/PageHeader'

;<PageHeader backUrl="/folders" rightContent={<button>Action</button>} />
```

#### EmptyState

Placeholder for empty content.

```tsx
import { EmptyState } from '@/components/ui/EmptyState'

;<EmptyState title="No items yet" description="Create your first item to get started" />
```

### Interactive Components

#### IconButton

Icon-only button with consistent styling.

```tsx
import { IconButton } from '@/components/ui/IconButton'

;<IconButton
  icon={TrashIcon}
  onClick={handleDelete}
  size="sm" // sm | md | lg
  variant="danger" // primary | secondary | danger | ghost
  title="Delete item"
/>
```

#### Dropdown

Select dropdown with consistent styling.

```tsx
import { Dropdown } from '@/components/ui/Dropdown'

;<Dropdown
  label="Sort by"
  icon={<SortIcon />}
  value={sortBy}
  onChange={setSortBy}
  options={[
    { value: 'name', label: 'Name' },
    { value: 'date', label: 'Date' },
  ]}
/>
```

#### SearchInput

Search field with icon and clear button.

```tsx
import { SearchInput } from '@/components/ui/SearchInput'

;<SearchInput value={search} onChange={setSearch} placeholder="Search..." />
```

#### InlineEdit

Inline editable text field.

```tsx
import { InlineEdit } from '@/components/ui/InlineEdit'

;<InlineEdit value={name} onSave={handleSave} onCancel={handleCancel} />
```

## Design Tokens

### Colors

- **Primary**: Blue (blue-500, blue-600, blue-700)
- **Secondary**: Gray (gray-200, gray-300, gray-400)
- **Success**: Green (green-500, green-600)
- **Danger**: Red (red-500, red-600)
- **Warning**: Yellow (yellow-500, yellow-600)
- **Info**: Blue (blue-500, blue-600)

### Spacing

- **xs**: 0.5rem (8px)
- **sm**: 1rem (16px)
- **md**: 1.5rem (24px)
- **lg**: 2rem (32px)
- **xl**: 3rem (48px)

### Border Radius

- **sm**: rounded (0.125rem)
- **md**: rounded-md (0.375rem)
- **lg**: rounded-lg (0.5rem)

### Typography

- **text-xs**: 0.75rem
- **text-sm**: 0.875rem
- **text-base**: 1rem
- **text-lg**: 1.125rem
- **text-xl**: 1.25rem
- **text-2xl**: 1.5rem

## Best Practices

1. **Always use existing components** - Check this document before creating new UI
2. **Consistent spacing** - Use the spacing tokens, not arbitrary values
3. **Consistent colors** - Use semantic colors (primary, danger, etc.)
4. **Accessibility** - All interactive elements should have proper ARIA labels
5. **Loading states** - Use LoadingButton for async actions
6. **Error handling** - Use StatusMessage for all error/success feedback
7. **Modal patterns** - Use Modal + ModalFooter for all dialogs

## Component Locations

All UI components are in `/components/ui/`:

- FormField.tsx
- LoadingButton.tsx
- StatusMessage.tsx
- Modal.tsx
- ModalFooter.tsx
- Card.tsx
- IconButton.tsx
- Button.tsx
- PageHeader.tsx
- EmptyState.tsx
- Dropdown.tsx
- SearchInput.tsx
- InlineEdit.tsx
- Skeleton.tsx

## Adding to CLAUDE.md

To ensure AI assistants use these components, add this to your CLAUDE.md:

```markdown
## Design System

- ALWAYS use components from /components/ui/
- See DESIGN_SYSTEM.md for component documentation
- Never create duplicate form inputs, buttons, or modals
- Use FormField for ALL input fields
- Use LoadingButton for ALL async buttons
- Use StatusMessage for ALL error/success messages
```
