# Permissions System Overview

## Core Philosophy

Our permissions system follows a **container-based ownership model** where ownership flows downward through the hierarchy. If you own a folder, you own everything inside it. This keeps the mental model simple and avoids complex edge cases.

## Architecture

### Three-Layer Design

1. **Database Functions** (SECURITY DEFINER)
   - Handle complex operations like creating invitations and granting permissions
   - Bypass RLS to avoid circular dependencies
   - Ensure atomic operations across multiple tables

2. **Row Level Security** (Simple, One-Way)
   - Resources check permissions table for access
   - Permissions table has minimal RLS (only direct relationships)
   - No circular dependencies: permissions never checks back to resources

3. **Hybrid Public/Private Tables**
   - Public preview tables for invitation links (no authentication needed)
   - Private permission tables for actual access control
   - Separation allows for better user experience without compromising security

## Ownership vs Permissions vs Creator

**Ownership**: Determined by container hierarchy. Own a folder = own all notebooks inside.

**Permissions**: Grant read/write access to resources you don't own.

**Creator Attribution**: Track who created something for UI display, but creator ≠ owner.

- **NOT IMPLEMENTED YET**: Need to add `created_by` column separate from `user_id` (owner)
- Currently `user_id` represents both owner and creator, which is incorrect

## Permission Levels

- **read**: View content only
- **write**: View and edit content
- **admin**: (Future) Can share with others

## How Sharing Works

1. Owner generates an invitation link via database function
2. Recipient previews invitation without logging in (public table)
3. Upon acceptance, permissions are granted via database function
4. Recipient can now access the shared resource and its contents

## Key Design Decisions

- **No transitive sharing**: If Alice shares with Bob, Bob cannot share with Carol
- **Ownership can't be transferred**: Only moved by relocating to owned container
- **Most restrictive wins**: Conflicting permissions resolve to least access
- **Folder owners see everything**: Transparency within owned containers

## Current State & Future Work

_Note: This document describes the intended architecture. Implementation status varies._

### Completed

- Basic permission tables and RLS structure (fixed infinite recursion)
- Invitation creation and acceptance flow
- Basic folder sharing works

### Not Yet Implemented

- **Creator tracking**: Need something along the lines of a `created_by` column separate from `user_id`. discuss a plan with user. think through some scenarios together.
- **Folder owner visibility**: need to think about how we allow folder owners to see all notebooks
- **Share indicators**: UI would like to show `sharedByMe` and `sharedWithMe`
- **Notebook-level sharing**: Interdependent with folder sharing (see above, need a plan)
- **Revocation UI**: Interface to remove permissions (need to describe a plan)

The permission system foundation is somewhat in place but needs the ownership/creator separation to match the intended design.
