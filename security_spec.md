# Firestore Security Specification - DefensorIA SaaS

## Data Invariants
1. A user can only read and write their own profile, cases, searches, and rulings.
2. Only users with the `admin` role (verified via their profile document) can list all users in the system.
3. Users cannot change their own `role`, `plan`, or `org` once created (except via admin intervention, though for this SaaS we'll assume admins manage this).
4. `createdAt` must be the server time and immutable.
5. All IDs must be valid (max 128 chars, alphanumeric/dash/underscore).

## The "Dirty Dozen" Payloads (Denial Tests)

1. **Identity Theft (Write Other's Profile)**: Auth as User A, attempt to write to `/users/UserB`.
2. **Privilege Escalation (Self-Role)**: Auth as non-admin User A, attempt to update `/users/UserA` with `role: "admin"`.
3. **Plan Hijacking**: Auth as User A on `trial` plan, attempt to update `/users/UserA` with `plan: "enterprise"`.
4. **Shadow Field Injection**: Attempt to create a case with an extra field `isVerified: true` not in schema.
5. **PII Leak (Global List)**: Non-admin attempt to list `/users` collection.
6. **Cross-User Data Access**: User A attempt to read `/users/UserB/cases/CaseX`.
7. **Timestamp Spoofing**: Attempt to set `createdAt` to a date in the past instead of `request.time`.
8. **Resource Exhaustion (ID Poisoning)**: Attempt to create a document with a 2MB string as the ID.
9. **Relational Breakage**: Attempt to create a Case with a `userId` that doesn't match `request.auth.uid`.
10. **Immutable Violation**: Attempt to update `createdAt` of an existing case.
11. **Type Poisoning**: Attempt to set `org` to a number instead of a string.
12. **Status Bypass**: Attempt to update a user status from `suspended` to `active` without admin rights.

## Test Runner (Logic Verification)
A `firestore.rules.test.ts` would verify these boundaries.
