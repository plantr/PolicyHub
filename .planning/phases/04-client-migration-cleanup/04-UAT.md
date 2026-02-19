---
status: testing
phase: 04-client-migration-cleanup
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md
started: 2026-02-19T20:30:00Z
updated: 2026-02-19T21:05:00Z
---

## Current Test

[paused — user exploratory testing on production]

## Tests

### 1. Landing Page
expected: Visiting / shows a public landing page with Policy Hub branding (Shield icon), a heading, and a "Sign in" button. No authentication required to view this page.
result: pass

### 2. Auth Form
expected: Visiting /login (or clicking Sign in from landing) shows a branded auth card with email/password fields, sign-up tab, and forgot-password link. Uses Supabase Auth UI styling.
result: pass

### 3. Route Protection
expected: Visiting a protected route (e.g., /dashboard) while not logged in redirects you to /login. You cannot access app content without authenticating.
result: pass

### 4. Login to Dashboard
expected: Entering valid email/password on /login signs you in and navigates to /dashboard. The dashboard loads with the app sidebar and header visible.
result: pass

### 5. User Menu and Logout
expected: Once logged in, the header shows a user avatar/menu. Clicking it shows your email and a Logout option. Clicking Logout signs you out, clears the session, and returns to the landing page.
result: pass

### 6. Session Persistence
expected: After logging in, refreshing the browser (F5 / Cmd+R) keeps you authenticated. You remain on the same page without being redirected to /login.
result: pass

### 7. Documents Page
expected: Navigating to the Documents page loads the document list directly from Supabase. Documents appear in a table/list with their metadata (title, status, etc.).
result: pass

### 8. Requirements Page
expected: Navigating to the Requirements page loads requirements from Supabase. The list displays with framework, control ID, and description columns.
result: pass

### 9. Dashboard Stats
expected: The Dashboard page shows aggregate statistics (document count, requirement count, finding count, etc.) loaded from the /api/stats serverless endpoint.
result: pass

### 10. Create a Record
expected: Creating a new record (e.g., a finding, commitment, or knowledge base article) via the UI form submits through the serverless API and the new record appears in the list after creation.
result: skipped
reason: User switched to exploratory testing on production

### 11. Edit a Record
expected: Editing an existing record via the UI updates it through the serverless API. Changes are reflected immediately after saving.
result: skipped
reason: User switched to exploratory testing on production

### 12. Delete a Record
expected: Deleting a record via the UI removes it through the serverless API. The record disappears from the list after deletion.
result: skipped
reason: User switched to exploratory testing on production

### 13. Document Upload (TUS Flow)
expected: Uploading a PDF when creating a document version uses the TUS signed-URL flow. The upload completes and the file is accessible via download.
result: skipped
reason: User switched to exploratory testing on production

### 14. Risk Pages
expected: Risk Overview, Risk Register, Risk Library, Risk Actions, and Risk Snapshots pages all load their data from Supabase. Lists display correctly with no errors.
result: skipped
reason: User switched to exploratory testing on production

### 15. Gap Analysis
expected: The Gap Analysis page loads and the Refresh button triggers a server-side analysis. Auto-map and AI match features dispatch jobs and return results.
result: skipped
reason: User switched to exploratory testing on production

## Summary

total: 15
passed: 9
issues: 0
pending: 0
skipped: 6

## Gaps

[none yet]
