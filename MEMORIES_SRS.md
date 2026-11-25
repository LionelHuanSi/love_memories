# MEMORIES — Software Requirements Specification (SRS)

**Version:** 1.0  
**Date:** 2026-10-13  
**Project:** Memories — Our Little Universe  
**Status:** Implementation-ready MVP specification  
**Primary audience:** Antigravity coding agent / developer

> **Product vision:** A beautiful, responsive couple-memory website with a constellation-style star map. Anyone with the public social-media link can view *published* memories; only two authorized people can sign in to create, edit, publish, or delete content.

---

## 1. Objective and scope

Build a production-deployable full-stack web app that is:
- **Publicly viewable:** Visitors from a Facebook/Instagram/TikTok bio link can explore a curated constellation, timeline, and public milestones without logging in.
- **Privately editable:** Exactly two allowlisted owner/editor accounts can log in to add memories and upload photos, and manage visibility.
- **Emotionally engaging:** A dark, elegant, animated star field with memory nodes connected into constellations; clicking a star opens its story and gallery.
- **Easy to update from a phone:** Upload multiple photos and save a memory in a few taps.
- **Privacy-by-default:** Newly created memories default to `draft` (not publicly exposed) unless an authorized editor explicitly publishes them.

### 1.1 Explicitly out of scope for MVP

Public registration, visitor comments, likes, chat, payments, social feed, AI-generated captions, native mobile apps, realtime collaborative editing, third-party media hosting, embedded IoT controls, video upload, location tracking, public upload submissions.

### 1.2 Single-couple assumption

MVP supports **one couple / one shared space / two authorized accounts**. Schema should avoid needless coupling where practical, but do **not** build multi-tenant onboarding, subscriptions, or marketplace functionality now.

---

## 2. Users, roles, and permissions

| Role | Login required | View published content | View private/draft | Create/edit memories | Publish/unpublish | Manage partner/identity |
|---|---|---|---|---|---|---|
| Visitor | No | Yes | No | No | No | No |
| Owner | Yes | Yes | Yes | Yes | Yes | Yes |
| Partner (editor) | Yes | Yes | Yes | Yes | Yes | No |

- Owner and Partner are the **only writers**. No unauthenticated mutation routes.
- Use Supabase Auth and an explicit DB allowlist/membership table (`space_members`) to determine editing rights; never authorize solely based on client UI or email text.
- Partner onboarding: owner sends a **single-use, time-limited invite**; partner authenticates and accepts it; server verifies invite token hash and binds Supabase user ID to `space_members`. Owner account configured via secure bootstrap instructions, not hardcoded password.
- Prevent a third editor account from being added in MVP (database constraint or transactional server-side check). Revoking an account invalidates its membership immediately for server reads/writes.
- All sensitive mutations are enforced server-side and with suitable PostgreSQL RLS policies.

---

## 3. Public vs private URLs and entry flows

### 3.1 Canonical routes

| URL | Audience | Purpose |
|---|---|---|
| `/` | Public | Public landing + interactive star map |
| `/story` | Public | Published memories chronological timeline |
| `/memories/[slug]` | Public or signed-in member | Published detail; unpublished only for members |
| `/milestones` | Public | Published significant dates/anniversaries |
| `/login` | Owner / Partner | Sign-in |
| `/invite/[token]` | Invited partner | Secure invite acceptance; no invite payload leaked |
| `/studio` | Owner / Partner | Private management dashboard |
| `/studio/memories/new` | Owner / Partner | Create memory |
| `/studio/memories/[id]/edit` | Owner / Partner | Edit/publish/archive memory |
| `/studio/settings` | Owner / Partner | Couple identity, anniversary date, public appearance |
| `/studio/invitations` | Owner only | Create/revoke partner invitation |

- Public social profile should contain **only the canonical public URL**, e.g. `https://your-domain.example/` or a custom vanity domain.
- Admin entry should be discreet: `/login` or a small footer link, not a giant visitor-facing "admin" button. The route is **not secret**; access is secured via authentication and authorization.
- Authenticated people may open the public page and see a small `Manage memories` link without changing what visitors see.
- `/studio/**` redirects anonymous users to login; unauthorized authenticated users receive 403/no access.
- For unlisted/private/draft memories, anonymous requests must return 404 (avoid leaking existence); no API/metadata/thumbnail should disclose them.

### 3.2 Public viewer journey

1. Viewer clicks link in social bio; page loads without a login barrier.
2. Sees a polished star field, couple display name, safe-to-share anniversary counter, and published constellation nodes.
3. Taps a bright star to open a memory detail overlay/page with title, date, public story, and public gallery.
4. Switches to Timeline for efficient browsing on mobile.
5. No create/edit/publish controls appear for visitors.

### 3.3 Owner/partner publishing journey

1. Owner or partner opens `/login` and signs in.
2. `/studio` shows all `draft`, `private`, and `published` memories with clear status labels.
3. Click `Add memory`; select multiple photos; fill title, date, caption, optional location/theme.
4. Save as **Draft** by default; preview how it would appear publicly.
5. Explicitly click `Publish` to make content visible at the public URL, or `Save privately` to keep it visible only to the couple.
6. Published memories appear as new stars and timeline entries automatically after refresh/revalidation.

---

## 4. Functional requirements (priority)

### FR-01 — Public constellation homepage [P0]

- Render animated dark-night background: static/Canvas stars, subtle twinkle, optional faint nebula/glow; respect `prefers-reduced-motion`.
- Visual **memory nodes** representing only published memories. Differentiate milestone nodes (size/color) and normal memories.
- Interactive zoom, pan (touch and mouse), click/tap to inspect; accessible alternative list/timeline.
- Thin glow edges can connect memories chronologically or within a named constellation.
- Deterministic layout: same dataset should not randomly reshuffle across visits; persist custom positions if editing positions is later enabled.
- If no published memories, show tasteful empty state (not an empty/error screen).
- A visitor sees no private/draft nodes, edges, title strings, counts, or preview media.
- Display published count and friendly tagline; clicking on a star opens its memory content.

### FR-02 — Public memory detail and gallery [P0]

- Detail includes title, event date, story/caption, optional coarse location label, and image gallery with thumbnails and full-screen viewer.
- Responsive, mobile-friendly swipe gestures; keyboard arrow/Escape support where practical.
- Page URLs are human-readable (`/memories/[slug]`); published content can be shared directly.
- Open Graph social metadata for landing and **published** memory pages (public title, safe cover image, description). Private/draft URLs get no sensitive metadata.
- Never embed unsigned private storage paths/privileged credentials in HTML.

### FR-03 — Public timeline [P0]

- Filter/browse **published** memories in reverse chronological order and group by year/month.
- A memory selected in Timeline should link to the same detail as the star map.
- Mobile UI prioritizes timeline usability if graph gestures are challenging.

### FR-04 — Account authentication and two-editor access [P0]

- Supabase Auth: email OTP/magic link is preferred for MVP; OAuth optional and configurable.
- No public signup leading to edit rights; membership only via owner bootstrap or valid single-use invite.
- Protected pages and all write APIs validate server-side membership.
- Session persistence, sign-out, expired-session handling, meaningful error states.
- Avoid storing auth tokens manually in localStorage; use maintained Supabase SSR/session integration patterns.

### FR-05 — Memory creation and editing [P0]

- Fields: `title` (required, 1–120 chars), `event_date` (required), `description` (optional), `location_label` (optional), `type` (`date`, `trip`, `milestone`, `everyday`, `other`), `constellation_id` optional, `visibility` (`draft`, `private`, `published`).
- Default is `draft`; only explicit publish changes to `published`.
- Upload 1–30 photos per memory in a multi-select flow, with thumbnails, per-file progress, reordering, and recoverable retry. Support JPEG, PNG, WebP; HEIC if conversion is implemented and tested, otherwise show informative message.
- Provide a simple quick-add form for phone usage; optional fields should not block saving.
- Edit an existing memory, reorder/remove images, change status, archive or delete after confirmation.
- Both owner and partner can edit all memories (shared space); show `created_by` and timestamps.
- Drafts may contain text with zero images; published memory should have at least a title and story or one photo.

### FR-06 — Privacy/visibility lifecycle [P0]

- `draft`: work in progress, member-only.
- `private`: intentionally finished, member-only.
- `published`: visible to everyone via public site and public APIs.
- `archived`: optional internal flag independent of visibility, excluded from public displays.
- Publishing and unpublishing must invalidate appropriate caches so changes take effect promptly.
- A memory going from published to private/draft must disappear from all public queries, social metadata, star nodes/edges, timeline, sitemap and generated public media URLs (short-lived cached URLs may remain accessible until expiry; document this limitation).
- Publishing a memory must NEVER automatically publish other private memories referenced by relation/edge.

### FR-07 — Media security and storage [P0]

- Store original/optimized images in **private Supabase Storage bucket**. Database stores storage keys, not permanent signed URLs.
- Authorized upload: server verifies member, validates file type/size/count, creates narrowly scoped short-lived signed upload authorization or equivalent.
- Public published-image delivery must use an access-controlled endpoint or short-lived signed read URLs issued only after checking that the image belongs to a published memory; avoid perpetual URLs for private files.
- For private images: only current authenticated members can obtain signed read links.
- Use thumbnail versions, responsive images, lazy loading and explicit width/height to minimize layout shift and bandwidth.
- Don't trust filename, client MIME, EXIF or client-side resizing alone. Set file limits, verify content, strip GPS EXIF from public derivatives, avoid leaking precise geolocation.
- Removal should delete or garbage-collect unused objects safely (no orphaned files or cross-memory deletion).

### FR-08 — Dates and milestone presentation [P1]

- Couple setting `relationship_start_date` with timezone `Asia/Ho_Chi_Minh` for date-based count display by default (configurable).
- Public page displays "Together for N days" **only if owner enables this**; public anniversary dates can be disabled for privacy.
- Published milestones are visually distinct and appear on the timeline.
- Display local dates without off-by-one errors; store calendar dates as `DATE` rather than implicit UTC timestamps when no exact clock time is intended.

### FR-09 — Constellations and graph relationships [P1]

- Optional named grouping (e.g. `First Dates`, `Our Travels`, `Little Things`).
- Auto-layout nodes by date/group; connect adjacent published memories with edges, but exclude all private nodes and their edges from public graph.
- Studio allows assigning a memory to a constellation; custom graph position editing can be delayed until later.

### FR-10 — Couple customization [P1]

- Owner can set public title, tagline, display names or nicknames, cover/artwork, theme accent color, toggle relationship counter and optional music link.
- Never expose account email addresses, full legal names, private notes, or partner invite tokens on public profile.

### FR-11 — Public sharing [P0]

- Canonical HTTPS URL suitable for social-media bio.
- Mobile-friendly share action using Web Share API if available, else copy link.
- Site-level SEO metadata plus Open Graph preview. Public indexed content only; studio/login/invite URLs not indexed. Note `robots.txt`/`noindex` is not an authorization boundary.
- Public site must look complete and appealing when opened in in-app browsers.

### FR-12 — Error handling, loading and empty states [P0]

- Skeleton/loading, accessible upload progress, upload failures with retry, offline/network warning, no-published-content empty state, graceful invalid invite/expired session/404.
- Failed upload must not publish half-saved memory unintentionally.

---

## 5. Proposed stack and architecture

| Layer | Choice |
|---|---|
| Web, rendering, server endpoints | Next.js App Router + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Constellation interaction | React Flow / `@xyflow/react` |
| Decorative background | Canvas 2D / CSS animations (lightweight) |
| UI animation | Motion, optional |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth (SSR integration) |
| Images | Supabase Storage private bucket |
| Validation | Zod + React Hook Form |
| Deployment | Vercel + Supabase |
| Monitoring | Server logs, optional error monitoring |

**Architecture guidelines:**
- Prefer a single Next.js repository; Route Handlers / Server Actions for privileged operations, rather than a separate FastAPI microservice in MVP.
- Keep the public read path distinct from member-only data access. Filter at both API boundary and RLS level.
- Use a server-side service role only where strictly needed; it must **never** ship to browser code.
- Use TypeScript shared validation schemas and database migrations checked into version control.
- React Flow provides interactions for memory nodes; Canvas creates decorative stars without a separate React component per background star.

---

## 6. Data model (logical schema)

### 6.1 `spaces`

`id UUID PK`, `slug TEXT UNIQUE`, `public_title TEXT`, `tagline TEXT`, `relationship_start_date DATE NULL`, `show_day_counter BOOLEAN DEFAULT FALSE`, `theme JSONB`, `created_at`, `updated_at`.

### 6.2 `space_members`

`space_id UUID FK`, `user_id UUID FK auth.users`, `role ENUM(owner,partner)`, `joined_at`; compound PK `(space_id,user_id)`. Enforce max 2 members transactionally and at most 1 owner.

### 6.3 `partner_invites`

`id UUID PK`, `space_id UUID FK`, `token_hash TEXT`, `expires_at`, `used_at NULL`, `revoked_at NULL`, `created_by UUID`, `created_at`. Tokens must be securely random, never stored in plaintext in DB, single-use/expiring.

### 6.4 `memories`

`id UUID PK`, `space_id UUID FK`, `slug TEXT`, `title TEXT`, `description TEXT`, `event_date DATE`, `location_label TEXT NULL`, `type TEXT`, `visibility ENUM(draft,private,published) DEFAULT draft`, `is_archived BOOLEAN DEFAULT FALSE`, `constellation_id UUID NULL`, `created_by UUID`, `updated_by UUID`, `created_at`, `updated_at`, `published_at NULL`. Unique `(space_id,slug)`.

### 6.5 `memory_media`

`id UUID PK`, `memory_id UUID FK`, `storage_path TEXT UNIQUE`, `thumbnail_path TEXT NULL`, `mime_type TEXT`, `file_size_bytes BIGINT`, `width INT NULL`, `height INT NULL`, `alt_text TEXT NULL`, `sort_order INT`, `created_at`.

### 6.6 `constellations`

`id UUID PK`, `space_id UUID FK`, `name TEXT`, `slug TEXT`, `description TEXT NULL`, `created_at`.

### 6.7 `memory_edges` (optional persistence)

`id UUID PK`, `space_id UUID FK`, `source_memory_id UUID FK`, `target_memory_id UUID FK`, `kind TEXT DEFAULT chronological`; enforce both ends in same space. Public query includes an edge **only when both nodes are published and not archived**. Auto-generated edges may also be derived without a table in MVP.

### 6.8 `milestones` (P1)

`id UUID PK`, `space_id UUID FK`, `title TEXT`, `event_date DATE`, `is_public BOOLEAN DEFAULT FALSE`, `created_at`.

### 6.9 Row-level security & invariants

- Enable RLS on every content/membership/invitation table; define explicit SELECT, INSERT, UPDATE, DELETE policies (or server-only procedures for privileged mutations).
- Anonymous SELECT permits only active space settings intentionally public and published unarchived content; never all rows from `memories`.
- Member SELECT permits rows belonging only to joined space.
- Member mutation permits authorized roles and same-space records; invitation mutation owner-only.
- Apply rules also to media metadata and storage objects. Ensure deleted/hidden media never remains publicly queryable.
- Database/service uses stable `auth.uid()` membership checks, not user-controlled request headers.

---

## 7. Key UI screens and behavior

### 7.1 Public homepage `/`

- Dark midnight background `#090E20`, deep blue `#232946`, starlight lavender `#A78BFA`, soft pink `#F2A7C4`, warm ivory `#F8EBDD`.
- Hero: couple display name / `Our Little Universe`, elegant serif accent + highly readable sans-serif body, optional day counter.
- Main canvas with a constellation consisting of interactive glowy nodes + subtle connecting strokes; star effect never blocks hit targets.
- Public navigation: `Universe`, `Our Story`, `Milestones` (P1). Footer `Made with love`, discrete `Sign in` link.
- Public star popup: preview cover, title, date, short excerpt, open detail.
- Mobile: swipe/zoom support with obvious `View as timeline` fallback.

### 7.2 Public `/story`

- Vertical chronological memory cards with photo previews; year/month headings, lazy-loading and filters by year.

### 7.3 Public memory detail

- Immersive hero photo, title, event date, narrative, gallery/lightbox, previous/next public memory.

### 7.4 Private `/studio`

- Clear `Add memory` primary action; cards/list with statuses `Draft`, `Private`, `Published`; edit/publish/unpublish and confirmations.
- Indicator showing what is public vs private (never confuse labels).

### 7.5 Create/edit screen

- Phone-first form: file picker (multiple), thumbnail previews, progress bars, title/date/story; optional fields behind an expandable section.
- Main actions: `Save draft`, `Save privately`, `Publish` with confirmation/preview.
- Browser confirms before abandoning dirty form; retry failed media upload without wiping form.

### 7.6 Auth/invite screens

- Simple romantic visual design, input email, verify OTP/magic link. Clear invite accepted/expired/already-used states.

---

## 8. Non-functional requirements

### NFR-01 Accessibility

- WCAG 2.2 AA targets on core UI; appropriate contrast, focus indicators, keyboard navigation, `aria-label` for star controls, usable timeline alternative.
- Respect reduced-motion; animations must not be essential to accessing memories.

### NFR-02 Mobile and browsers

- Responsive from 360px phone width through desktop; support current Safari iOS, Chrome Android, Chrome/Safari/Edge desktop.
- Avoid touch-scroll trapping on interactive graph; ensure zoom and page scroll remain usable.

### NFR-03 Performance targets

- Aim for LCP under 2.5s on representative mobile network for public homepage, where feasible.
- Keep initial JS / decorative effects lightweight; images use lazy loading, responsive sizes and thumbnails.
- Load image detail only when opened; support at least ~200 memories via sensible graph grouping or viewport culling.

### NFR-04 Reliability and backup

- Handle interrupted upload; retry without duplicate DB records. No partially published memories.
- Maintain a documented export/backup process for PostgreSQL data **and** all storage objects; verify restore in staging before relying on it.
- Configure reasonable file size and rate limits; log and surface errors without exposing secrets.

### NFR-05 Security/privacy

- All routes over HTTPS; no secrets in frontend bundle; CSRF protections appropriate to auth/session mechanism; validate/sanitize rich content.
- Abuse controls (upload quotas, request throttling). Public data should not reveal IPs, exact GPS or private accounts.
- No third-party analytics or trackers in MVP by default.

### NFR-06 Discoverability

- Open Graph and social preview verified with published-safe data; hide studio/login/invite via `noindex` (not a security substitute).
- Social app embedded browsers must load the site and login fallback reliably.

---

## 9. API / application operations (indicative)

Final endpoints may be implemented as Next.js Route Handlers or Server Actions. Authorization requirements are mandatory regardless of framework choice.

| Operation | Access | Output |
|---|---|---|
| `GET /api/public/space` | Public | Safe public title/theme/counter settings |
| `GET /api/public/memories` | Public | Published, non-archived summaries (no hidden data) |
| `GET /api/public/memories/:slug` | Public | Published detail and authorized public gallery links |
| `GET /api/public/graph` | Public | Published nodes and edges only |
| `GET /api/studio/memories` | Member | All shared-space memories and statuses |
| `POST /api/studio/memories` | Member | Create memory, default draft |
| `PATCH /api/studio/memories/:id` | Member | Edit, publish, unpublish, archive |
| `DELETE /api/studio/memories/:id` | Member | Confirmed removal and cleanup |
| `POST /api/studio/uploads/sign` | Member | Signed upload token/path scoped to member and memory |
| `GET /api/media/:id` or signed read flow | Contextual | Validate publication or membership first |
| `POST /api/studio/invites` | Owner | Create secure invitation |
| `POST /api/invites/accept` | Auth + valid invite | Bind partner account transactionally |

Public endpoints should paginate or limit payloads; do not send entire media manifests and full descriptions to the star map.

---

## 10. Concrete acceptance criteria / QA scenarios

**AC-01: Public access.** In incognito mode, opening `/` displays published constellation content and `/story` displays only published memories. No login required.

**AC-02: Editing isolation.** In incognito mode, visiting `/studio` redirects to login; calling any write endpoint without session returns 401 and mutates nothing.

**AC-03: Wrong account.** A valid Supabase user who is not one of the two members cannot read private data or upload/edit/publish; expected 403/404 as appropriate.

**AC-04: Invitation.** Owner creates an invite; partner can accept once before expiry. A used/expired/revoked token cannot be reused; third editor cannot be added.

**AC-05: Draft-by-default.** Member creates a memory with photos. It appears in Studio as `Draft` and is absent from public page, public APIs, public graph edges, SEO metadata, and anonymous media access.

**AC-06: Publish.** Member explicitly publishes a draft; it becomes visible to visitors in homepage, timeline, direct detail URL and the appropriate media display.

**AC-07: Unpublish.** Member changes published memory to private; anonymous graph/timeline/detail endpoints stop exposing it and associated media links are not reissued. Explain that previously issued signed URLs may remain valid until short expiry.

**AC-08: Image upload.** Authorized member selects 10 JPEG/PNG/WebP photos; UI shows previews and progress, allows reorder, gallery reflects chosen order. Disallowed/oversized files give clear error.

**AC-09: Touch UX.** On a 390px-width phone, user can view star map, open a star and swipe its gallery without accidental navigation or unreadable text.

**AC-10: Accessibility.** With reduced-motion active, animation is minimized; keyboard-only user can access all published memories via timeline/list.

**AC-11: Date calculations.** Anniversary counter respects configured calendar date/timezone, including around UTC midnight and leap days.

**AC-12: Privacy regression.** Images uploaded to a private memory cannot be fetched by anonymous users through predictable storage paths or incorrectly scoped media endpoints.

**AC-13: Bio link/social preview.** Public URL loads on Facebook/Instagram in-app browsers; OG title/preview image shows only deliberately public info.

**AC-14: Empty state.** Website renders a graceful welcome when no memories are published, not a broken graph.

**AC-15: Security.** Client-side role tampering or API request modifications do not bypass DB policies; no service key/client secret exposed in HTML/bundle.

---

## 11. Delivery order for Antigravity agent

### Milestone A — Foundation

1. Scaffold Next.js App Router TypeScript, Tailwind, shadcn/ui; lint, format, env example and README.
2. Create Supabase SQL migrations for schema, constraints, RLS and bucket policies.
3. Setup Supabase Auth SSR and owner bootstrap procedure; implement protected studio and invitations.
4. Verify authorization with automated tests **before** public publishing.

### Milestone B — Memory CRUD + image pipeline

5. Build Studio dashboard and create/edit form.
6. Implement validated member upload flow, private storage, thumbnails, retry/progress.
7. Implement draft/private/published lifecycle and secure image reads.
8. Test private/published media leak scenarios.

### Milestone C — Public website

9. Implement public landing layout, story timeline, memory detail and public metadata.
10. Add interactive React Flow constellation nodes/edges and lightweight decorative background.
11. Responsive styles, accessibility and motion preferences.

### Milestone D — Polish/deployment

12. Add milestones/day counter settings (P1 if time permits).
13. Create seed data/mock placeholder content with no real personal data.
14. Run acceptance tests, performance check, verify RLS, deploy to Vercel, configure HTTPS + canonical URL.
15. Write setup/deployment/backup documentation; test production sign-in and social link preview.

**Required deliverables:** source code; `.env.example` (no secrets), SQL migration files, README with Supabase and Vercel setup, owner bootstrap + partner invite guide, permission matrix, deployment instructions, and smoke/authorization tests.

---

## 12. Implementation guardrails (mandatory)

- **Do not** implement public sign-up into writer role or allow visitor upload.
- **Do not** make the Supabase image bucket public for convenience.
- **Do not** rely solely on hiding UI buttons as authorization.
- **Do not** expose draft/private node metadata or edges to visitor APIs.
- **Do not** substitute a static landing-page mockup for working CRUD/auth/upload.
- **Do not** add a second backend framework, AI, payments, chat, or multi-couple SaaS infrastructure in MVP.
- **Do not** write real personal details or photos into fixtures, commits or example configs.
- If a product decision is not specified, choose the simplest secure and responsive implementation, document the assumption, and proceed.

## 13. Definition of Done (MVP)

A deployable HTTPS URL can be placed in a social media bio. Anonymous visitors explore published memories in an attractive star-map interface and mobile timeline without any login. The owner and invited partner can each sign in, upload photos, create/edit memories, preview and explicitly publish/unpublish them. Draft/private memories and their media remain inaccessible to all unauthenticated and unauthorized users. README, database migrations, environment example, basic tests and deployment instructions are complete.

---

## 14. Agent kickoff prompt (copy into Antigravity)

> Read `MEMORIES_SRS.md` end to end and treat it as the implementation source of truth. Build Memories as a secure single-couple Next.js + TypeScript + Supabase application. Prioritize P0 requirements, privacy/authorization, fully working upload and publishing, then public timeline and constellation UI. Work milestone by milestone, implementing and testing each stage; create migrations, env example, README, and deployment instructions. Avoid adding out-of-scope features. If an assumption is needed, record it in `DECISIONS.md` and continue. Do not claim a feature complete unless it works end-to-end and its acceptance tests pass.
