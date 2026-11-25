# Architecture & Implementation Decisions (DECISIONS.md)

**Project:** Memories — Our Little Universe  
**Specification:** [MEMORIES_SRS.md](file:///Users/nguyen.van.huan/memories/MEMORIES_SRS.md)  
**Date:** 2026-10-13  
**Status:** Approved & Implemented (Milestones A & B)

---

## 1. Decision 01: Framework & Rendering Architecture
- **Choice:** Next.js 16 App Router with React 19, TypeScript, and Tailwind CSS.
- **Rationale:** Next.js App Router provides native Server Components, streaming with `<Suspense>`, and unified Route Handlers/Server Actions. This eliminates the need for a secondary backend service (e.g. FastAPI) for MVP, keeps deployment streamlined on Vercel, and provides server-side rendering for optimal SEO and fast initial mobile loading.
- **Reference:** SRS Section 5.

---

## 2. Decision 02: Supabase SSR Authentication & Client Isolation
- **Choice:** `@supabase/ssr` with separate client utilities:
  - `src/lib/supabase/client.ts`: Browser client for client-side interactivity.
  - `src/lib/supabase/server.ts`: Server client using Next.js async cookies.
  - `src/lib/supabase/admin.ts`: Guarded with `import 'server-only'`, using `SUPABASE_SERVICE_ROLE_KEY` exclusively for privileged operations (bootstrapping, initial system setup, short-lived media signing).
  - `src/middleware.ts` & `src/lib/supabase/middleware.ts`: Session token refresh and route guard protecting `/studio/**`.
- **Security Rule:** The `SUPABASE_SERVICE_ROLE_KEY` is never shipped to client bundles.
- **Reference:** SRS Section 2, Section 4 (FR-04).

---

## 3. Decision 03: Single-Couple Two-User Constraint (Database-Enforced)
- **Choice:** PostgreSQL `BEFORE INSERT` trigger function `public.check_space_members_limit()` on the `space_members` table.
- **Invariant:**
  - Maximum 2 members per space.
  - Maximum 1 owner per space.
  - Attempting to insert a 3rd member transactionally fails with an exception (`'Space cannot have more than 2 members in single-couple MVP'`).
- **Rationale:** Relying solely on client UI checks or server application logic can be bypassed by race conditions or direct API manipulation. Database triggers guarantee absolute enforcement.
- **Reference:** SRS Section 1.2, Section 2, Section 6.2.

---

## 4. Decision 04: Partner Invitation Security (Single-Use Token Hashing)
- **Choice:**
  - Owner generates a 32-byte (256-bit) cryptographically secure random token (`crypto.randomBytes(32).toString('hex')`).
  - The server computes the SHA-256 hash of this token.
  - Only `token_hash` is stored in `partner_invites` along with `expires_at` (default 7 days). The raw token is returned to the owner once and never persisted as plaintext in the database.
  - Partner acceptance is handled via PostgreSQL stored procedure `accept_partner_invite(p_token_hash)` using row locking (`FOR UPDATE`):
    - Validates token exists, not expired, not revoked, and `used_at IS NULL`.
    - Validates space member count < 2.
    - Atomically inserts Partner into `space_members` and updates `used_at = now()`.
- **Reference:** SRS Section 2, Section 6.3, Section 10 (AC-04).

---

## 5. Decision 05: Strict Data Isolation & Row Level Security (RLS)
- **Choice:**
  - RLS enabled on all tables: `spaces`, `space_members`, `partner_invites`, `memories`, `memory_media`, `constellations`, `memory_edges`, `milestones`.
  - Helper functions `is_space_member()` and `get_user_space_role()` defined with `SECURITY DEFINER` and explicit `SET search_path = public, auth` to prevent recursion and search-path injection.
  - **Public Visitors (Anonymous):** Can only query memories where `visibility = 'published' AND is_archived = FALSE`.
  - **Draft/Private Memories:** Non-members attempting to access return 404 Not Found to prevent existence disclosure.
  - **Graph Edge Invariant:** Public visitors can only query memory edges where **both** source and target memories are published and non-archived.
  - **Relationship Counter Privacy:** When `show_day_counter = false`, `relationship_start_date` is omitted from public responses.
- **Reference:** SRS Section 4 (FR-01, FR-06), Section 6.9, Section 10 (AC-01, AC-02, AC-03, AC-05).

---

## 6. Decision 06: Private Storage & Access-Controlled Media Delivery
- **Choice:**
  - Supabase Storage bucket `memories-media` is private (`public = false`).
  - Storage RLS policies permit upload, update, and deletion only to authenticated members of the space.
  - Public image access is controlled via `GET /api/media/:id`, which checks if the media belongs to a published, non-archived memory, and generates short-lived signed URLs (15-minute validity) or 404 for private images.
- **Reference:** SRS Section 4 (FR-07), Section 10 (AC-08, AC-12).

---

## 7. Decision 07: Deterministic Owner Bootstrap Procedure
- **Choice:**
  - CLI script `scripts/bootstrap.mjs` and authenticated Route Handler `POST /api/bootstrap` guarded by `BOOTSTRAP_SECRET`.
  - Sets up the initial space and first `owner` account safely without hardcoding passwords into commits.
- **Reference:** SRS Section 2, Section 11.

---

## 8. Decision 08: Vietnamese Slug Generation & Uniqueness
- **Choice:** Function `generateMemorySlug(title: string)` in `src/lib/validations/memory.ts`.
- **Rationale:** Normalizes Vietnamese diacritics using Unicode NFD and regex decomposition (`đ` -> `d`, removing tone accents), generates clean hyphenated lowercase slugs, and appends a 6-character cryptographic hex suffix. This guarantees uniqueness under the `(space_id, slug)` database constraint without colliding across identical titles.
- **Reference:** SRS Section 4 (FR-02), Section 6.4.

---

## 9. Decision 09: Multi-Image Upload Flow & Limits
- **Choice:**
  - Member requests a signed upload path via `POST /api/studio/uploads/sign`.
  - Path format: `<space_id>/<memory_id>/<timestamp>-<randomHex>.<ext>`.
  - Client uploads directly to the private Supabase Storage bucket via `uploadToSignedUrl`.
  - Client registers media metadata via `POST /api/studio/memories/:id/media`.
- **Limits Enforced:**
  - Maximum 30 images per memory.
  - Maximum 15MB per image.
  - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp` (HEIC informs user to convert).
- **Reference:** SRS Section 4 (FR-05, FR-07), Section 10 (AC-08).

---

## 10. Decision 10: Visibility Lifecycle & Publishing Invariants
- **Choice:**
  - Default state on creation: `visibility = 'draft'`.
  - Explicit action required to switch to `private` or `published`.
  - Publishing constraint: A memory can only be published if it has a valid title AND either a story description or at least one uploaded photo.
  - Unpublishing guarantee: Switching from `published` to `private`/`draft` immediately revokes visibility from all visitor queries and `/api/media/:id`.
- **Reference:** SRS Section 4 (FR-06), Section 10 (AC-05, AC-06, AC-07).

---

## 11. Decision 11: Cascading Storage Deletion
- **Choice:** When deleting a memory via `DELETE /api/studio/memories/:id`, the server fetches all related `storage_path` and `thumbnail_path` entries from `memory_media` and removes physical files from Supabase Storage before removing the database row.
- **Rationale:** Prevents orphaned storage files from consuming storage quotas.
- **Reference:** SRS Section 4 (FR-07), Section 9.

---

## 12. Decision 12: Mobile-First Constellation Map & Lightbox Touch Architecture
- **Choice:**
  - Wrap interactive star map in `ReactFlowProvider` with custom 44px+ touch control buttons (Zoom In, Zoom Out, Center Fit).
  - Expand Star Node touch hitboxes to 52px (WCAG 2.2 AA compliant) with active haptic/scale feedback.
  - Implement native mobile Bottom Sheet Drawer for selected star preview on screens `< 640px` with drag handle and backdrop blur.
  - Fullscreen Lightbox incorporates multi-directional touch gesture detection: swipe left/right for next/prev photo, and swipe down (`diffY > 80`) to dismiss the viewer.
  - Programmatic body scroll locking (`document.body.style.overflow = 'hidden'`) during Lightbox modal display to prevent iOS Safari background scroll interference.
- **Reference:** SRS Section 4 (FR-01, FR-02), Section 8 (NFR-01, NFR-02), Section 10 (AC-09, AC-10).

---

## 13. Decision 13: Viewport, Safe-Area & Mobile Form Ergonomics
- **Choice:**
  - Root layout exports explicit Next.js `Viewport` configuration (`themeColor: '#090E20'`, `viewportFit: 'cover'`).
  - Mobile Studio bottom navigation automatically adapts to modern iPhone Home indicators via CSS `env(safe-area-inset-bottom)`.
  - Global CSS enforces `16px` minimum font size on mobile inputs to eliminate unwanted iOS Safari auto-zooming on focus.
  - Native Web Share API integration (`navigator.share`) enables direct sharing into iOS/Android share sheets (Zalo, Instagram, Messenger) with seamless clipboard fallback.
- **Reference:** SRS Section 4 (FR-11), Section 7.5, Section 8 (NFR-02).

