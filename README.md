# VOS Sync

VOS Sync is a multi-role employment and talent management platform connecting **Job Seekers, Employers, and Schools** with intelligent candidate matching, recruitment workflows, interview management, and AI-assisted hiring capabilities.

## Key Features

### VOS Admin
#### Gemini AI Service Monitoring

* Centralized `callGeminiMonitored()` wrapper for all Gemini API calls.
* Request telemetry, token usage, latency, status, user, company, provider, and request type tracking.
* Dynamic model-aware cost calculation and daily token monitoring.
* Live RPM, TPM, and RPD quota utilization.
* Application-level AI usage breakdown across:

  * Candidate Match Explainer
  * Best Match AI
  * Query Enrichment
  * AI Reranker
* Real-time request audit stream with Philippine local-time formatting.
* Per-user and per-company attribution for cost allocation and anomaly detection.
* Fire-and-forget telemetry persistence to prevent monitoring from affecting AI response latency.

#### Autonomous Taxonomy Enrichment & Shared Governance

* Unified taxonomy governance engine (`src/modules/vos-admin/role-matching/services/taxonomy/`).
* Zero-touch background auto-approval for safe additions (`SYNONYM`, `ABBREVIATION`, `Master Skill`) with confidence `>= 0.80-0.85`.
* Piggybacked inside `BEST_MATCH` and `AI_ROLE_SUGGEST` calls for 0 extra RPD/RPM cost.
* Automatic Directus deduplication & race-condition conflict handling across `vs_role_category`, `vs_role_title`, `vs_role_title_alias`, `vs_master_skills`, and `vs_role_skill_mapping`.
* Queues ambiguous `RELATED_ROLE` and `BROAD_ROLE` concepts for Admin Exception Review.

#### Matching Intelligence Module

* Renamed and broadened "Role & Skill Intelligence" into **Matching Intelligence** — a unified governance layer for all job taxonomy, search relevance, and candidate-job matching signals.
* Dashboard exposes five live metrics: Job Categories, Standard Roles, Keywords & Synonyms, Role Skill Mappings, and **Pending Requests** (count of `PENDING` category suggestions awaiting review).
* **Unified Matching Taxonomy Editor**: Consolidated 4 disconnected manager interfaces into a single interactive 4-tier tree editor (`/vos-admin/job-roles/taxonomy`) with real-time multi-level search (across categories, roles, skills, and keywords) and direct in-tree CRUD controls for categories and roles.
* **Role Detail Slide-Over Sheet**: Rich side-drawer panel (`RoleDetailSheet`) enabling comprehensive role management with visual importance weight sliders (`0%`–`100%`), required/preferred competency toggles, keyword match weight sliders, and built-in AI Skill and AI Keyword Generators with deduplication.
* **Streamlined 3 Governance Hubs**: Dashboard navigation simplified to **Approval Queue**, **Matching Taxonomy**, and **Match Test Studio**.
* **Interactive Match Test Studio & Candidate Sandbox**: Live query simulation environment (`MatchTestStudio`) equipped with an interactive Jobseeker Profile Inspector & Sandbox Editor allowing admins to customize headline, professional summary, skills (add/remove tag chips), work history roles, and industry certifications (`certifications`), or switch across candidate archetypes (Full-Stack, Frontend, Social Media, Data Analyst) to evaluate engine scoring, compatibility breakdowns, and verified evidence signals in real-time.
* **Approval Queue** at `/vos-admin/job-roles/approval-queue`: admin-facing governance panel fed from `vs_role_category_suggestion` supporting 3 resolution actions: **Create New Category**, **Map to Existing Category**, and **Reject Suggestion** with mandatory admin audit remarks.
* **Non-Destructive Job Governance**: Rejecting a taxonomy suggestion strictly rejects the taxonomy candidate; the originating job remains active and usable with `category_id = NULL`.
* **Originating Job Linkage**: Category suggestions link to originating `job_id`; approving via *Create New* or *Map Existing* automatically synchronizes `category_id` and canonical `job_category` onto the linked `vs_job_posting` record.
* Generalized `IntelligenceEntityType`, `IntelligenceRequestStatus`, `ResolutionType`, and `IntelligenceRequest` types designed to extend to Job Roles, Skills, Keywords, and other matching entities without redesigning the module.
* Approval transaction is atomic: category resolution must succeed before the suggestion is marked `APPROVED`; failures leave the suggestion `PENDING`.

---


### Browse Companies

#### Searchable Filter Dropdowns & Real-Time Debounced Search

* Standard Optimistic UI Transaction Pattern (`useOptimisticMutation` & `AsyncActionButton`) with state snapshotting, instant client UI updates, async API requests, Sonner toast notifications, operational telemetry logging (`meta`), and automatic error rollback.
* Project-wide `mutation_migration_matrix.md` classifying interactive actions into Optimistic + Rollback, Server-Confirmed, or Local UI.
* `SearchableSelect` popovers for Industry, Company Size, Job Type, and Work Setup filters (`src/modules/public/company-profile/`).

* Real-time debounced search (300ms) on search inputs — automatically updates search results as users type.
* High-fidelity skeleton card loading with 250ms minimum shimmer threshold across Find Jobs, Public Company Jobs, and Freelancer Jobs (`/vos-sync/freelancer/jobs`).
* `AnimatePresence` and Framer Motion staggered entrance card animations and hover lift effects (`whileHover={{ y: -4 }}`).
* **Freelancer Job Application Modal**: 4-step interactive application wizard with auto-prefilling, dynamic candidate profile photo asset resolution via Directus proxy with initials fallback, custom resume & cover letter uploads, and referral connectivity tracking.
* **Directus Server-Side Pagination**: Responsive infinite scroll with initial 24-job fetch, batch +12 appending on scroll, dynamic Directus `meta` filter count evaluations, and callback-ref intersection observers.


* Employee Reviews tab with total review count header badge and pagination controls.



### Client Dashboard (Employer Command Center)

#### High-Level Hiring Aggregation Layer

* Aggregated employer command center (`/client/dashboard`) answering *"What is happening and what should I do next?"* without duplicating full sidebar module functionality.
* 7 core functional sections: Personalized Header with Post a Job CTA, 4-card KPI summary grid, interactive Hiring Overview time-series chart (7d/30d/3m/6m), top Job Performance table, Recent Applicants with match score preview, upcoming interview timeline widget, and prioritized Action Required checklist.
* Fluid motion transitions and staggered entrance animations powered by Framer Motion.
* Optimistic UI interactions for dismissing and resolving urgent action items.
* Full theme token compliance with zero hardcoded color values.

---

### Client Notification Center

#### Streamlined Alert Center, Real-Time Search & Multi-Category Filtering
* **Interactive Search & Multi-Category Toolbar**: Real-time search across candidate names, job titles, and alert messages paired with scrollable category filter pills (**All**, **Applications**, **Interviews**, **Messages**, **Team Activity**) with dynamic live count badges.
* **Unread State Filter**: Combinable "Unread only" toggle pill allowing recruiters to filter by unread status independently or across any category.
* **Actor Suppression & Team Activity**: Strict `actor_user_id !== recipient_user_id` governance suppressing self-notifications on recruiter actions (shortlisting, rejecting, hiring, scheduling) while dispatching `TEAM_ACTIVITY` exclusively to other hiring team members.
* **Chronological Date Grouping**: Organizes notifications dynamically into clear time sections (**Today**, **Yesterday**, **This Week**, **Earlier**).
* **Contextual Event Badges**: Category-specific color-coded icons (Applications, Shortlisting, Withdrawals, Interviews, Messages, Job Approvals) for rapid visual scanning.
* **Full-Card Click Target & Quick Actions**: Entire card functions as an interactive navigation target with subtle unread background tints, trailing chevron indicators, and an on-hover quick mark-as-read trigger.
* **Granular Preference Management**: Dual-channel control (Email & In-App) per notification category group with master toggles and real-time persistence.

---

### Client Company Profile

#### Comprehensive Employer Organization & Verification Management

* **Dynamic Organization Profile Management**: Full editing suite for company basic info, classification, addresses, public visibility toggles, and real-time public profile preview slide-over.
* **Fast & Snappy Motion Animations**: Powered by `framer-motion` and `AnimatePresence` with non-disruptive, lightweight transitions (150ms–250ms), staggered card entrances, and smooth edit-to-view mode morphing.
* **Animated Profile Completion Meter**: Real-time animated progress bar reflecting profile completeness towards verification readiness.
* **Interactive Document Verification Pipeline**: Multi-slot verification upload zone (DTI/SEC, Business Permit, TIN, and optional supporting documents) with animated item additions, removals, and contextual status banners.

---

### Jobs Posting

#### Database-Backed Role Taxonomy Integration & Canonical Categories
* **Single Source of Truth (`vs_role_category`)**: Decoupled 3-tier taxonomy (`Category` $\rightarrow$ `Role` $\rightarrow$ `Skills`) sourcing canonical role families directly from Directus database table `vs_role_category` via dedicated client endpoints and cached custom hook (`useRoleCategories`).
* **Searchable Category Combobox & Controlled Suggestions**: In-form searchable combobox with real-time text matching, candidate descriptions, and an integrated category suggestion modal (`SuggestCategoryModal`) featuring AI semantic deduplication pre-checks to protect taxonomy integrity while preventing employer posting friction.
* **Referential Integrity**: Jobs maintain explicit foreign key mapping `category_id` $\rightarrow$ `vs_role_category(category_id)` alongside backwards-compatible legacy fallback resolution.
* **Unified Search, Multi-Filter Toolbar & ATS Workflow**: Real-time client-side search across Job Title, Department, and Location, paired with a searchable Category combobox, Employment Type selector, Work Arrangement filter, and Status filter.
* **Interactive Job Cards**: Full card click-to-preview with a 2-second hover tooltip, dedicated right-side ATS "View Applicants" primary action, and centralized job editing and live status controls inside the preview drawer.
* **Framer Motion Animations**: Staggered card entrance transitions, smooth list reordering (`AnimatePresence` + `layout="position"`), and responsive hover lift states.

#### Rule-Based Skill Intelligence

* Reusable global skill-matching engine.
* Exact, alias, technology-relation, hierarchy, and category-based matching.
### Applicant Management & Candidate Review

* **Comprehensive Candidate Review Modal**: Responsive dual-column layout separating high-level profile overview, contact information, metrics, screening Q&A, and compensation from deep candidate history (experience timeline, education, certifications, and document attachments).
* **Screening Questions & Responses**: Complete question-by-question candidate response display with individual unanswered indicators and a dedicated `"No screening answers submitted"` fallback state.
* **Dynamic Candidate Avatars**: High-fidelity candidate profile pictures with Directus asset proxying, safe URL fallbacks, smooth `<Image />` loading, and initials badges.
* **Inline Document Previews**: Interactive single-click document preview modal for Cover Letters and Resumes with full PDF/document viewer support and direct download links.
* **Portfolio Website Integration**: Direct link display for candidate portfolio websites across Contact Information, Compensation & Portfolio, and Social Links with automatic profile fallback resolution.
* **Strict Contextual ATS Action Workflow**: Contextual status transitions (`APPLIED` $\rightarrow$ `UNDER_REVIEW` [automatic upon candidate profile view or manual], `UNDER_REVIEW` $\rightarrow$ `SHORTLISTED`/`REJECTED`, `SHORTLISTED` $\rightarrow$ `INTERVIEWING` [system-driven on interview creation], `INTERVIEWING` $\rightarrow$ `HIRED`/`REJECTED` [system-driven on final evaluation]), contextual action gates (`Schedule Interview`, `View Interview`), and decoupled recruitment vs session lifecycle management.

### Best Match AI

* Deterministic candidate ranking using weighted factors:

  * Skills — 40%
  * Experience — 25%
  * Location — 15%
  * Education — 10%
  * Screening — 10%
* Gemini-generated recruiter explanations, strengths, and development areas.
* Session-based analysis caching per job.
* Automatic cache invalidation when applicant or job data changes.
* Duplicate-request protection and progressive AI analysis states.

### Interview Management

* Interactive monthly calendar and list views.
* Native browser fullscreen recruiter workflow.
* Scheduling, rescheduling, cancellation, feedback, screening Q&A, and evaluation directly from the calendar.
* Single-candidate and batch-candidate interviews.
* Candidate-specific attendance, feedback, and decision tracking.
* Custom date and time selection interface.
* Optional 15-minute scheduling buffer toggle between interviews with real-time overlap validation.
* Intelligent next-available time suggestions on conflicts and visual distinction for buffer periods.
* Server-side overlap validation with `409 Conflict` protection.
* Real-time availability indicators and conflict detection.
* Candidate-aware calendar labels and detailed schedule popovers.
* Smart calendar cell event overflow handling with interactive date click and day agenda modal: clicking any calendar date number or overflow badge opens a comprehensive day modal with full interview cards or an empty state with a `"Schedule Interview on this Date"` shortcut.
* Strict attendee eligibility gate: only `SHORTLISTED` (first round) and `INTERVIEWING` (additional rounds) candidates appear in the scheduling form, with active session deduplication preventing new bookings while an intermediate interview remains uncompleted.
* Decoupled recruitment lifecycle: interview scheduling, rescheduling, cancellation, and intermediate completion do not mutate `application_status` (maintains `INTERVIEWING`), keeping candidates eligible for subsequent rounds without state conflation or status drift.
* Read-only evaluation locking for completed or cancelled interviews.
* Strict company-scoped scheduling isolation.

---

## Talent Search

### Intelligent Candidate Matching

VOS Sync uses a modular multi-stage matching architecture combining deterministic algorithms, database-backed taxonomies, and optional Gemini AI.

```text
Recruiter Query
      ↓
Text Normalization
      ↓
Optional AI Query Understanding
      ↓
Database Taxonomy Resolution
      ↓
High-Recall Fuzzy Retrieval
      ↓
Deterministic Compatibility Scoring
      ↓
Internal Candidate Ranking
      ↓
Optional AI Reranking
      ↓
Optional Match Explanation
      ↓
Paginated Results
```

### Database-Backed Role Taxonomy

* Canonical job roles and categories.
* Job title aliases and weighted relationships.
* Skill mappings linked to master skills.
* Runtime alias expansion through Directus.
* Supports natural-language and non-exact job searches.

For example, a search for **"social media creator"** can resolve to related canonical roles such as **Social Media Specialist**, **Social Media Strategist**, and **Content Creator**.

### Matching Modes

* `BROWSE` — Candidate discovery without misleading match percentages.
* `ROLE_SIMILARITY` — Role and title similarity.
* `SKILL_MATCH` — Targeted skill evaluation.
* `JOB_MATCH` — Full job requirement matching.
* `HYBRID` — Combined keyword, role, taxonomy, and skill matching.
* `AI_RERANK` — Semantic AI-based reranking.

### Two-Layer Matching Engine

**Layer 1 — Retrieval**

* Jaro-Winkler similarity.
* Levenshtein distance.
* Token intersection.
* Compound-word splitting.
* Taxonomy and alias expansion.

**Layer 2 — Compatibility**

* Role.
* Experience.
* Skills.
* Education.
* Certifications.
* Availability.
* Location.
* Portfolio.

Retrieval scores remain internal. Recruiters see compatibility-based results rather than raw fuzzy-search scores.

### AI Controls

* Query-result caching.
* Confidence thresholds.
* Deterministic bypass for straightforward searches.
* Bounded AI reranking.
* Structured-output validation.
* Model fallback.
* Concurrent-request deduplication.
* Graceful fallback when Gemini is unavailable.

---

## Company Profile & Registration

* Interactive company logo and cover-image previews with lightbox viewing.
* Searchable government ID type selection.
* Support for additional ID types through an `Others` option.
* Optional back-side ID upload.
* Role-aware registration routing using URL parameters.
* Cloudflare Turnstile protection with server-side verification.
* Private company verification document management.
* Support for:

  * DTI/SEC Registration
  * Business Permit
  * TIN Documents
  * Other Supporting Documents
* Transactional document replacement and deletion.
* UTC database timestamps with Philippine local-time presentation.
* Verification status remains administrator-controlled and independent of document uploads.

---

## Role-Aware Public Experience

VOS Sync dynamically adapts public pages and CTAs based on authentication state and user role.

Supported experiences include:

* Job Seeker portal navigation.
* Employer/client management navigation.
* Guest registration and onboarding.
* Role-aware Contact Us, About Us, Career Advice, and Landing page CTAs.
* Smart role navigation with mismatch confirmation.
* Automatic routing for users already authenticated under the requested role.

---

## Job Browse

* **Standardized Job Card Layout**: Uniform equal-height grid cards with Next.js `<Image />` company avatars, clean single-line title truncation, structured metadata chips with location truncation, and bounded skills pills.
* **Persistent Bottom Actions**: Pinned card footer displaying salary, quick-bookmark toggle, and view job details action across all card rows.
* **Directus Server-Side Pagination & Infinite Scroll**: Initial server-side query fetching 24 jobs with debounced search and filters sent directly to Directus, and preloading scroll observer loading +12 job batches on scroll with total count metadata.
* Public company profile links from job cards and job details.
* Company logo and name navigation.
* Opens company profiles in a separate browser tab.

---

## Applicant & Talent Management

### Review Candidates (Applicant Management)

* **AI Candidate-Job Evaluation & Cross-Role Matching**: On-demand AI evaluation modal in Candidate Details powered by Google Gemini analyzing candidate skills, work history, education, certifications, and screening answers against target job requirements with match scores, key strengths, probing questions, recruiter recommendations, and cross-role opportunity scans across all active company job openings.
* **Instant Client-Side Cache & Regenerate**: Stores AI evaluations in `localStorage` for instant reopening with a dynamic CTA ("Check AI Analysis" / "View AI Analysis") and an on-demand "Regenerate" trigger.
* **Two-Row Metadata Stacking**: Structured card information with primary identifiers (Name, Email, Job Title) on the top row and softer muted secondary stats (experience, jobs, resumes, profile %, applied date) beneath.
* **Uniform Status Badge Column**: Status badges anchored to a dedicated vertical column immediately before the action button group.
* **Explicit Action Controls**: Visual hierarchy with ghost "View Candidate", outline "Message", and solid primary "Schedule Interview" buttons.
* **Cleaned 3-Dots Quick Actions**: Reserved exclusively for secondary administrative transitions (*Move to Under Review*, *Shortlist*, *Mark as Hired*, *Reject*, *Reopen*) and *Custom Status & Notes...* without action duplication.
* **Interactive Status Filter Badges with Popovers**: Positioned directly on top of the candidate search bar with hover popover tooltips explaining each stage, real-time candidate counts, and defaulting to **"Active Pipeline"** (in-progress applicants: `Applied`, `Under Review`, `Shortlisted`, `Interviewing`, excluding `Hired`, `Rejected`, and `Withdrawn`).

### Saved Candidates

* Company-scoped saved applicant records.
* Candidate notes and metadata.
* Dedicated saved candidate panel.

### Candidate Invitations

* Employer-to-candidate invitation workflow.
* Job-specific invitations.
* Invitation status and response tracking.
* Expiration handling.
* Candidate response messages.

---

## Messaging & Communication

### Authenticated At-Rest Message Encryption (AES-256-GCM)

* End-to-end server encryption utility (`src/lib/message-encryption.ts`) using Node.js `crypto` with `aes-256-gcm`.
* Encrypts normal conversation messages (`message_content`) before persisting to Directus database (`vs_message`), securing message content against unauthorized database dumps.
* Transparent automatic decryption on message retrieval for authorized conversation participants across both Client and Freelancer portals.
* Real-time conversation list previews (`last_message_preview`) decrypted dynamically.
* Structured fallback for unencrypted legacy messages and graceful decryption error handling.
* Preserves structured JSON payload queries for system-generated recruitment and interview events (`message_type: "SYSTEM"`).

### Interactive Message Reactions

* Curated professional 8-emoji reaction palette (`👍`, `❤️`, `😂`, `🎉`, `🔥`, `👀`, `🙏`, `❓`).
* Dedicated relational reaction storage (`vs_message_reaction`) keeping reaction aggregations fast without modifying encrypted `message_content`.
* Shared reaction toggle API (`/api/shared/messaging/messages/[messageId]/reactions`) supporting optimistic toggle states with error rollback.
* Click-and-hold (long-press) and drag-to-select gesture interaction with live hover animations.
* Right-positioned quick reaction triggers and bottom-right overlapping reaction pill badges.
* Fullscreen Hiring Celebration Surprise: Automatic detection of unread `HIRED` system messages upon opening a conversation, triggering a high-fidelity celebratory modal with multi-colored bursting confetti particles, glowing trophy visuals, and target job details.

### Dynamic Role-Aware System Message Cards

* Unified system message card renderers (`ApplicationCard.tsx`, `InterviewCard.tsx`) adapting layout, badges, and contextual copy dynamically based on the viewer's authenticated role (`CANDIDATE` vs `CLIENT`).
* Contextual event messaging across recruitment and interview milestones (`HIRED`, `APPLICATION_SUBMITTED`, `APPLICATION_STATUS_CHANGED`, `INTERVIEW_SCHEDULED`, `INTERVIEW_UPDATED`):
  * **Hired**: Freelancer sees *"You Were Hired"* and *"You were hired for [Position]"*, while the employer sees *"Candidate Hired"* and *"You hired [Candidate Name] for [Position]"*.
  * **Application Submitted**: Freelancer sees *"Application Submitted"* with their target job, while the employer receives *"New Application"* with the applicant's name and position.
  * **Status Updates**: Tailored update headlines for candidates and recruiters with event date prioritization (`updated_at` / `status_updated_at`).
  * **Interview Cards**: Role- and status-aware interview cards with status-driven headers, icons, and contextual headlines (`SCHEDULED`, `CONFIRMED`, `RESCHEDULED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`). Action buttons (*"Join Online Meeting"*) are strictly gated by active interview states and automatically hidden upon completion or cancellation.
* Integrated document viewers, resumé downloads, external portfolio links, cover letter accordions, and salary badges within the conversation thread.

---

## System Resilience & Outage Management

VOS Sync includes dedicated infrastructure for detecting and communicating backend failures without disrupting active workflows.

* **Non-Disruptive Floating Outage Overlay**: System outage and service monitor rendered as a fixed modal backdrop overlay (`z-[9999] bg-black/60 backdrop-blur-md`) rather than destroying active page state, preserving user inputs, forms, and navigation context.
* **In-Place Recovery & Diagnostics**: Real-time `/api/health` connectivity verification with live Web Server & Database Backend indicators, response latency, Philippine local-time (PST) timestamps, and in-place `reset()` reconnection.
* **Dismissible Monitoring**: User dismiss action allowing workflow continuation if the disruption is non-critical.
* **Dedicated Outage Pages**: Standalone `/server-down` and `/500` fallback routes configured to bypass authentication middleware to avoid redirect loops during infrastructure downtimes.

---

## Code Quality & Engineering Standards

* Zero ESLint errors and warnings.
* Zero TypeScript compilation errors.
* Strict TypeScript typing.
* Explicit interfaces and `unknown` types instead of unsafe `any`.
* React hook patterns optimized to prevent cascading state updates.
* Company-scoped data isolation.
* Server-side validation for critical scheduling operations.
* Modular matching and AI service architecture.
* Graceful AI failure handling so core recruitment functionality remains operational.
