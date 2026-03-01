# Sharing: Known Issues

## How Sharing Works

1. Owner opens ShareDialog, enters invitee email + permission level (read/write)
2. API creates an `invitation` doc (with token, expiry) and an `invitationPreview` doc (public, for unauthenticated link preview)
3. Invitee receives link (`/share/[token]`), sees preview, logs in, clicks Accept
4. Accept API creates a `permission` doc and marks the invitation as accepted
5. View routes check `permissions` collection to include shared folders in the invitee's folder list

## Issues

### 1. No email enforcement on accept

Anyone who has the share link can accept it, regardless of whether their email matches `invitee_email` on the invitation. The client has an `emailMismatch` state variable but it's hardcoded to `false` and never checked. The server-side accept route doesn't verify email either.

**Impact:** Share links are effectively bearer tokens. Anyone with the link gets access.

### 2. Non-atomic accept flow

Permission creation and invitation update are two separate Firestore writes with no transaction. If the permission write succeeds but the invitation update fails, the permission exists but the invitation still looks unaccepted. A retry would then skip the "already has permission" check (which queries by `user_id` + `resource_id`) — though in practice this would find the existing permission and short-circuit.

**Impact:** Low risk in practice, but the flow isn't crash-safe.

### 3. Non-atomic invitation creation

The invitation doc and invitationPreview doc are written separately. If the preview write fails, the invitation exists but the share link 404s.

**Impact:** Invitee gets a broken link. Inviter doesn't know.

### 4. Double-accept returns 404

If a user clicks Accept twice quickly, the second request sees `accepted_at != null` and the query filters it out, returning "Invitation not found or already accepted" (404). The client can't distinguish "already done successfully" from "never existed."

**Impact:** Confusing UX on slow connections or double-clicks, but no data loss.

### 5. No rate limiting on share creation

No limit on how many invitations a user can generate. Could be used to spam invitation emails (if email sending is ever added) or to create unbounded Firestore docs.

**Impact:** Theoretical. No email sending exists today, and Firestore costs are negligible at current scale.
