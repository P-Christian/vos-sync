# vos-sync

# Features
- ## Client Features
    - ### Jobs Posting
        - Rule Based Skill Intelligence Engine
            - Global, reusable matching engine (`src/lib/skill-matcher`)
            - Preserves `vs_master_skills` table schema without modifications
            - Relational schema support (`vs_skill_category`, `vs_skill_alias`, `vs_skill_relation`, `vs_skill_hierarchy`)
            - Multi-tier matching logic: Exact Match (100%), Alias Normalization (100%), Explicit Technology Relations (75-95%), Hierarchy Trees (85%), and Category Families (65%)
            - Integrated into candidate matching and applicant ranking
        - ### Best Match AI (Review Candidates)
        - AI Recruiter Match Explainer & Skill Scoring (`bestMatchAIService.ts` & `BestMatchesTab.tsx`)
            - Deterministic match engine ranks top candidates using weighted scoring (40% skills, 25% experience, 15% location, 10% education, 10% screening).
            - Gemini AI evaluates top candidates and generates recruiter explanations, key strengths, and development areas.
            - Clean recommendation layout without numbered ranking badges or grayscaling, using vibrant theme indicators.
            - Smart Session Storage Cache (`useBestMatchCache.ts`): Stores analysis results per job ID in `sessionStorage` (`vos_sync_best_matches_[jobId]`), featuring automatic cache invalidation when applicant count or job posting updates.
            - UX Enhancements: Concurrency locking against duplicate calls and a multi-step loader (*Finding Candidates...* → *Ranking Skills...* → *Analyzing with Gemini...*).
    - ### Interview Management
        - Batch Interview Architecture & Junction Table Engine (`vs_interview_application` & `types.ts`)
            - Integrated `vs_interview_application` junction table separating schedule-level data (`vs_interview`) from candidate-level data.
            - Recruiter Scheduling Workflow (`InterviewForm.tsx`): 2-step job-first candidate selection (Target Job Position dropdown → Candidate Name multi-select checklist).
            - Excludes `REJECTED` and `WITHDRAWN` applicants automatically from candidate attendee selection lists.
            - Evaluation Immutability & Lock (`InterviewEvaluationModal.tsx`): Locks submitted candidate evaluations in `🔒 Read-Only` mode to prevent accidental overwrites while preserving feedback visibility.
            - Instant Real-Time Data Refresh (`useInterviews.ts`): Automatically re-fetches interview list state (`loadInterviews()`) upon saving evaluations without requiring a full browser page reload.
            - Payload Enriched API (`/api/client/applicants`): Returns company `jobs` array alongside candidate applicants to populate target job dropdown.
            - Supports both single candidate interviews and batch candidate interviews (`applications: InterviewApplication[]`).
            - Individual candidate attendance tracking (`PENDING`, `ATTENDED`, `NO_SHOW`).
            - Candidate-specific feedback and decision recording per attendee.
            - Excludes inactive statuses (`COMPLETED`, `CANCELLED`, `NO_SHOW`); only active `SCHEDULED`, `CONFIRMED`, and `RESCHEDULED` interviews block calendar slots.
            - Enforces 15-minute buffer after meetings to prevent back-to-back recruiter burnout.
            - Server-side schedule overlap validation on `POST` and `PATCH` endpoints returning HTTP 409 Conflict to prevent race conditions.
            - Interactive time slot picker grid disabling booked/buffered slots (`🔒 Booked`) and highlighting available slots (`🟢 Available`).
            - Rich popover details on booked badges/slots revealing Candidate Name, Position Title, Time, and Format.
            - Color legend bar: `🟢 Available`, `🔴 Booked`, `🟡 Selected`, `⚠️ Conflict`.
            - Strict company-scoped schedule isolation (`company_id`).
    - ### Company Profile
        - Interactive Cover & Logo Image Preview
            - Visual hover cues with overlay indicators on cover banner and profile logo
            - Click-to-open lightbox modal (`Dialog`) using Next.js `<Image>` for full-resolution view
    - ### Job Browse
        - Clickable Company Profile Links
            - Company name and logo avatar in job cards and job details open the public company profile in a new browser tab (`target="_blank"`)
    - ### Talent Search
        - Profile Image Asset URL Resolution
            - Implemented `getImageUrl` helper to resolve Directus file UUIDs into full asset URLs using `NEXT_PUBLIC_API_BASE_URL`
            - Ensured proper avatar rendering across talent search cards (`TalentCard`), talent drawer (`TalentProfileDrawer`), and saved candidates panel (`SavedTalentPanel`)
        - `vs_saved_applicant` Schema Integration
            - Updated API routes (`saved-talent`, `talent-search`, `talent-profile`) to query and persist saved applicants via `vs_saved_applicant` table (`saved_applicant_id`, `company_id`, `applicant_user_id`, `notes`, `created_by`, `created_at`, `updated_at`)
        - `vs_applicant_invitation` Schema Integration
            - Aligned invitation API endpoints (`/api/client/talent-invitation`) to query and persist records via `vs_applicant_invitation` collection (`invitation_id`, `company_id`, `applicant_user_id`, `job_id`, `subject`, `message`, `status`, `response_message`, `responded_at`, `expires_at`, `created_by`, `created_at`, `updated_at`)
        - Candidate Compatibility Engine & DB-Backed Role Taxonomy Infrastructure
            - **Database-Backed Role Taxonomy (`vs_role_category`, `vs_role_title`, `vs_role_title_alias`, `vs_role_skill_mapping`)**:
                - Built SQL schema (`vs_role_taxonomy_schema.sql`) for DB-driven role classification, canonical job titles, title aliases with `normalized_alias` & `match_weight`, and weighted skills linked to `vs_master_skills` with `is_required` flags.
                - Replaced static dictionaries with dynamic DB lookup and runtime alias expansion via Directus `/items/vs_role_title_alias`.
            - **Tokenized & Taxonomy-Expanded Keyword Matching**:
                - Solved exact contiguous string matching limitations: searching `"social media creator"` automatically resolves to canonical role **Social Media Specialist** (Category: *Digital Marketing & Social Media*) and expands aliases (*Social Media Strategist*, *Content Creator*, *Social Media Specialist*), matching profiles like *"Freelance Social Media Strategist"*.
                - Exposes `search_context` in API response (`keyword`, `resolved_role`, `category_name`, `matched_alias`, `match_weight`).
        - Modular Matching Engine Architecture (`src/modules/matching-engine/`)
            ```text
            src/modules/matching-engine/
            ├── retrieval/
            ├── normalizers/
            ├── evaluators/
            ├── engine/
            ├── confidence/
            └── explanation/
            ```
        - Engine Match Modes (`MatchMode`)
            - `BROWSE`: Suppresses misleading match percentages when browsing without criteria (`match_score: null`, `match_breakdown: null`) and orders candidates by profile completeness and recent activity.
            - `ROLE_SIMILARITY`: Evaluates canonical role fit and title similarity.
            - `SKILL_MATCH`: Evaluates candidates strictly against targeted skill matrices.
            - `JOB_MATCH`: Multi-factor evaluation matched directly against active job posting requirements.
            - `HYBRID`: Combined keyword, taxonomy, role, and skill matching.
            - `AI_RERANK`: Semantic reranking over candidate pool.
        - Two-Layer Matching Pipeline: Retrieval vs. Compatibility Metrics
            - **Layer 1 — High-Recall Retrieval** (`src/modules/matching-engine/retrieval/`): Optimizes recall and produces an internal candidate pool using Jaro-Winkler character similarity, Levenshtein distance, token intersection, compound word splitting, and taxonomy alias expansion. The retrieval score remains internal and is never presented as the recruiter-facing match percentage.
            - **Layer 2 — Compatibility Engine & Separated Metrics**: Multi-factor scoring (role, experience, skills, education, certifications, availability, location, portfolio) evaluated on retrieved candidates:
                - `compatibility_score`: Candidate fit against the recruiter’s search criteria.
                - `ranking_score`: Internal ordering score incorporating compatibility fit, profile completeness, and candidate activity.
            - **Ranking without Rejection**: Candidates are ranked by compatibility and ranking score. No secondary keyword gate discards candidates after scoring — position is determined by score, not hard keyword exclusion.
        - Gemini AI Integration & Operational Controls (`src/lib/gemini/`)
            - **Layer A — Query Understanding** (`queryUnderstanding.ts`): Attempts to resolve natural-language queries (e.g. `"I need someone who builds websites with React"`) into a canonical role and inferred skills before retrieval. Gemini-inferred roles and skills are merged with the normalized original query and database taxonomy. A low-confidence or failed Gemini result never replaces or suppresses deterministic retrieval.
            - **Layer B — AI Reranking** (`aiReranker.ts`): When active, semantically reorders a bounded top set of candidates (up to 50) by relevance to the employer prompt, falling back gracefully to Layer 2 score order on API timeout or failure.
            - **Layer C — Match Explanation** (`matchExplainer.ts`): Lazy on-demand explanation endpoint (`POST /api/client/talent-search/explain`) called when a candidate drawer is opened, avoiding unnecessary AI calls on page turns.
            - **AI Efficiency Controls**:
                - Query-result caching
                - Minimum-confidence gate
                - Bypass AI call for clear title or skill searches
                - AI reranking limited to a bounded candidate set
                - Structured-output validation
                - Model fallback configuration
                - Deduplication of concurrent identical requests
        - Recommended Final Matching Flow
            ```text
            Recruiter Query
                    ↓
            Generic text normalization
                    ↓
            Optional Gemini query enrichment
                    ↓
            Database taxonomy resolution
                    ↓
            Layer 1: High-recall fuzzy retrieval
                    ↓
            Layer 2: Deterministic compatibility engine
                    ↓
            Internal ranking score
                    ↓
            Optional Gemini reranking of bounded top candidates
                    ↓
            Optional explanation generation
                    ↓
            Paginated results
            ```
        - Implementation Strengths
            - Search no longer depends on exact title strings.
            - Retrieval and scoring are separated.
            - Low-scoring candidates are ranked rather than discarded by a second strict gate.
            - The role taxonomy is maintained through database data rather than source-code dictionaries.
            - Gemini failures are designed not to break core search.
            - Browse mode no longer presents arbitrary compatibility percentages.