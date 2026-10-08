# Assessment Tasks V1 - Owner Database Setup Guide (DBeaver + Directus)

This guide describes the database and Directus changes that **only the VOS Sync owner may perform** before live QA of the Assessment Tasks feature. The implementation worker is **not** permitted to execute DDL, create or alter Directus collections, relations, folders, permissions, or environment values. The worker may only run read-only metadata checks and disposable row-level tests after you confirm this setup is complete.

Do not place real database passwords, Directus tokens, or connection strings in this file, screenshots, chat, or git.

Scope: exactly four new collections.

| # | Collection | Purpose |
| --- | --- | --- |
| 1 | `vs_company_pipeline_assessment_tasks` | Authoring definition of an assessment task on a company pipeline `ASSESSMENT` stage. |
| 2 | `vs_job_pipeline_assessment_tasks` | Frozen per-job copy of a company task, bound to the job's snapshotted stage. |
| 3 | `vs_application_assessment_attempts` | One immutable attempt by an applicant for a job assessment stage. |
| 4 | `vs_application_assessment_responses` | One response row per attempt and job task. |

Related existing tables used by foreign keys (do not modify):

| Table | PK used by this feature | Confirmed type (owner preflight) |
| --- | --- | --- |
| `vs_company_pipeline_stages` | `id` | `int unsigned` (MySQL) |
| `vs_job_pipeline_stages` | `id` | `int unsigned` (MySQL) |
| `vs_job_application` | `application_id` | `int` (MySQL) |
| `directus_files` | `id` | `char(36)` |

> Engine confirmed by owner preflight: **MySQL 8.0** (`utf8mb4` / `utf8mb4_0900_ai_ci`). The MySQL DDL below uses `INT UNSIGNED` for the two pipeline-stage references and `INT` for the application reference so foreign keys match their targets exactly. The PostgreSQL section is retained for reference only; do not run it on this deployment.

---

## 0. Rules for this setup

1. Run every statement with your own DBeaver connection. The worker must never run DDL.
2. Run the **Preflight** first and stop immediately if any stop-condition in Step 1.5 is true.
3. Run only the DDL section that matches your database engine. For this deployment that is **MySQL/MariaDB (Section 3.2)**. Do not run the PostgreSQL section on a MySQL database.
4. MySQL/MariaDB does **not** support transactional DDL. Take a database backup/snapshot before running Section 3.2.
5. FK column types must match the referenced primary key **type and signedness** exactly. `INT` cannot reference `INT UNSIGNED` (MySQL error 3780). The preflight tells you those types; the DDL below already reflects your confirmed types.
6. Creating the table in SQL does **not** register it in Directus. Steps 4-7 register the collections, relations, permissions, and the proof folder.
7. Rollback order is fixed (Step 9). Never drop parent tables before children.

---

## 1. Preflight (read-only)

Open DBeaver on the VOS Sync database and record the results privately.

### 1.1 Engine and version

MySQL / MariaDB (confirmed):

```sql
SELECT VERSION();
SELECT @@character_set_database AS charset, @@collation_database AS collation;
```

PostgreSQL (reference only):

```sql
SELECT version();
SHOW server_encoding;
```

### 1.2 Confirm the four tables do not already exist

MySQL / MariaDB:

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'vs_company_pipeline_assessment_tasks',
    'vs_job_pipeline_assessment_tasks',
    'vs_application_assessment_attempts',
    'vs_application_assessment_responses'
  );
```

PostgreSQL (reference only):

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name IN (
  'vs_company_pipeline_assessment_tasks',
  'vs_job_pipeline_assessment_tasks',
  'vs_application_assessment_attempts',
  'vs_application_assessment_responses'
);
```

Expected result: **zero rows**. Any returned row is a stop-condition (Step 1.5).

### 1.3 Confirm the exact referenced primary key types

MySQL / MariaDB:

```sql
SELECT table_name, column_name, column_type, extra
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND (
    (table_name = 'vs_company_pipeline_stages' AND column_name = 'id') OR
    (table_name = 'vs_job_pipeline_stages'     AND column_name = 'id') OR
    (table_name = 'vs_job_application'         AND column_name = 'application_id')
  )
ORDER BY table_name;
```

PostgreSQL (reference only):

```sql
SELECT table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'vs_company_pipeline_stages' AND column_name = 'id') OR
    (table_name = 'vs_job_pipeline_stages'     AND column_name = 'id') OR
    (table_name = 'vs_job_application'         AND column_name = 'application_id')
  )
ORDER BY table_name;
```

Record the three types **exactly, including signedness**. On this deployment the owner preflight returned:

```text
vs_company_pipeline_stages.id  -> int unsigned, auto_increment
vs_job_pipeline_stages.id      -> int unsigned, auto_increment
vs_job_application.application_id -> int, auto_increment
```

Because `INT` cannot reference `INT UNSIGNED`, the DDL below uses:

- `company_stage_id` and `job_stage_id` -> `INT UNSIGNED` (they reference unsigned stage PKs)
- `application_id` -> `INT` (it references a signed application PK)
- new table PKs and all self/FK references between the new tables -> `INT`

If your preflight differs (for example a `BIGINT`), change the FK column to the **same type and signedness** as its target before running the DDL.

### 1.4 Confirm `directus_files.id` exists and how the project stores file references

MySQL / MariaDB:

```sql
SELECT column_type
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'directus_files' AND column_name = 'id';
```

Expected: `char(36)`. The project stores Directus file references as a **raw UUID string** in a `*_uuid` / `*_file_id` / `file_url` column, never as a full URL. Confirmed existing implementations:

- `vs_company_document.directus_file_id` (UUID string) - company documents, looked up by `filter[directus_file_id][_eq]=<fileId>`.
- `vs_identity_verifications.gov_id_front_image_uuid`, `gov_id_selfie_image_uuid`, `address_doc_image_uuid` (UUID strings).
- `vs_job_seeker_resumes.file_url` - despite the name, the upload helper returns `{ url: fileId, id: fileId }`, so this column also holds the raw UUID string.

Therefore the assessment proof column is named `proof_file_id` and typed `char(36)` to match `directus_files.id` and the existing convention. No hard foreign key to `directus_files` is created: the file may be cleaned up independently by Directus, and the application compensates on failure.

### 1.5 Preflight stop-conditions

**Stop and do not run the DDL if any of the following is true.** Report the exact finding instead of repairing it:

- Any of the four tables already exists (Step 1.2 returned a row).
- Any referenced PK column is missing (Step 1.3 returned fewer than three rows).
- A referenced PK type/signedness differs from the DDL and you have not adjusted the FK columns to match exactly.
- `directus_files.id` is missing or is not a 36-character string type (Step 1.4).
- The DBeaver connection engine is neither MySQL/MariaDB nor (if you deliberately use it) PostgreSQL.
- You cannot confirm you are connected to the intended VOS Sync schema/database.

---

## 2. Schema contract

Column names, purposes, and constraints. `id` is the primary key for all four tables, matching the pipeline table family. New-table PKs are `INT` (signed). Timestamps are stored in UTC; the application writes them explicitly.

### 2.1 `vs_company_pipeline_assessment_tasks`

| Column | Type (PG / MySQL) | Null | Notes |
| --- | --- | --- | --- |
| `id` | `integer` / `INT` identity | no | PK |
| `company_stage_id` | `integer` / `INT UNSIGNED` | no | FK -> `vs_company_pipeline_stages(id)` `ON DELETE CASCADE` |
| `task_type` | `varchar(32)` | no | one of `SINGLE_CHOICE`, `EXTERNAL_TASK`, `FILE_UPLOAD`, `TEXT_RESPONSE` |
| `title` | `varchar(255)` | no | 1-255 chars |
| `instructions` | `text` | yes | at most 10,000 chars (app-enforced) |
| `is_required` | `boolean` / `TINYINT(1)` | no | default `true` |
| `sort_order` | `integer` / `INT` | no | default `0`; >= 0 |
| `choice_options` | `jsonb` / `JSON` | yes | required only for `SINGLE_CHOICE`; app-validated array of `{ key, label }` |
| `correct_choice_key` | `varchar(64)` | yes | required only for `SINGLE_CHOICE`; employer-only, never sent to freelancers |
| `external_url` | `varchar(2048)` | yes | required only for `EXTERNAL_TASK`; HTTPS |
| `text_max_length` | `integer` / `INT` | yes | required only for `TEXT_RESPONSE`; 1-20000 |
| `created_at` | `timestamptz` / `DATETIME` | no | UTC |
| `updated_at` | `timestamptz` / `DATETIME` | no | UTC |

Indexes: `(company_stage_id)`, `(company_stage_id, sort_order)`.

### 2.2 `vs_job_pipeline_assessment_tasks`

Frozen copy. All authoring fields are duplicated **except** that the copy points at a job stage and optionally remembers its source.

| Column | Type (PG / MySQL) | Null | Notes |
| --- | --- | --- | --- |
| `id` | `integer` / `INT` identity | no | PK |
| `job_stage_id` | `integer` / `INT UNSIGNED` | no | FK -> `vs_job_pipeline_stages(id)` `ON DELETE CASCADE` |
| `source_company_task_id` | `integer` / `INT` | yes | FK -> `vs_company_pipeline_assessment_tasks(id)` `ON DELETE SET NULL` |
| `task_type` | `varchar(32)` | no | frozen value |
| `title` | `varchar(255)` | no | frozen value |
| `instructions` | `text` | yes | frozen value |
| `is_required` | `boolean` / `TINYINT(1)` | no | default `true` |
| `sort_order` | `integer` / `INT` | no | default `0`; >= 0 |
| `choice_options` | `jsonb` / `JSON` | yes | frozen value |
| `correct_choice_key` | `varchar(64)` | yes | frozen value; employer-only |
| `external_url` | `varchar(2048)` | yes | frozen value |
| `text_max_length` | `integer` / `INT` | yes | frozen value |
| `created_at` | `timestamptz` / `DATETIME` | no | UTC |
| `updated_at` | `timestamptz` / `DATETIME` | no | UTC |

Indexes: `(job_stage_id)`, `(job_stage_id, sort_order)`, `(source_company_task_id)`.

### 2.3 `vs_application_assessment_attempts`

| Column | Type (PG / MySQL) | Null | Notes |
| --- | --- | --- | --- |
| `id` | `integer` / `INT` identity | no | PK |
| `application_id` | `integer` / `INT` | no | FK -> `vs_job_application(application_id)` `ON DELETE CASCADE` |
| `job_stage_id` | `integer` / `INT UNSIGNED` | no | FK -> `vs_job_pipeline_stages(id)` `ON DELETE RESTRICT` |
| `attempt_number` | `integer` / `INT` | no | 1-based, >= 1 |
| `predecessor_attempt_id` | `integer` / `INT` | yes | FK -> self `ON DELETE SET NULL` |
| `status` | `varchar(32)` | no | one of `IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `NEEDS_REVISION`, `PASSED`, `FAILED` |
| `submitted_at` | `timestamptz` / `DATETIME` | yes | UTC |
| `reviewed_at` | `timestamptz` / `DATETIME` | yes | UTC |
| `reviewed_by` | `integer` / `INT` | yes | reviewer user id; soft reference |
| `review_notes` | `text` | yes | required by app for fail/revision |
| `created_at` | `timestamptz` / `DATETIME` | no | UTC |
| `updated_at` | `timestamptz` / `DATETIME` | no | UTC |

Constraints: `UNIQUE (application_id, job_stage_id, attempt_number)`, `CHECK (attempt_number >= 1)`, `CHECK (status IN (...))`.
Indexes: `(application_id)`, `(job_stage_id)`, `(status)`.

> Note: `NOT_STARTED` is **derived** by the application when no attempt row exists. It is intentionally not stored.

### 2.4 `vs_application_assessment_responses`

| Column | Type (PG / MySQL) | Null | Notes |
| --- | --- | --- | --- |
| `id` | `integer` / `INT` identity | no | PK |
| `attempt_id` | `integer` / `INT` | no | FK -> `vs_application_assessment_attempts(id)` `ON DELETE CASCADE` |
| `job_task_id` | `integer` / `INT` | no | FK -> `vs_job_pipeline_assessment_tasks(id)` `ON DELETE RESTRICT` |
| `selected_choice_key` | `varchar(64)` | yes | for `SINGLE_CHOICE` |
| `response_text` | `text` | yes | for `TEXT_RESPONSE` |
| `proof_file_id` | `char(36)` / `CHAR(36)` | yes | Directus file UUID string for `FILE_UPLOAD` (matches `directus_files.id`) |
| `proof_file_name` | `varchar(255)` | yes | original sanitized file name |
| `created_at` | `timestamptz` / `DATETIME` | no | UTC |
| `updated_at` | `timestamptz` / `DATETIME` | no | UTC |

Constraints: `UNIQUE (attempt_id, job_task_id)`.
Indexes: `(attempt_id)`, `(job_task_id)`, `(proof_file_id)`.

The exact per-type field rule is enforced in application validation (only the field matching the snapshotted task type is accepted).

---

## 3. DDL

This deployment is **MySQL 8.0**. Use the proven procedure in Section 3.2. Section 3.1 (PostgreSQL) is reference only and must not be run here.

### 3.1 PostgreSQL (reference only - DO NOT RUN here; superseded by Section 3.2)

```sql
BEGIN;

CREATE TABLE vs_company_pipeline_assessment_tasks (
  id                  integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  company_stage_id    integer NOT NULL,
  task_type           varchar(32) NOT NULL,
  title               varchar(255) NOT NULL,
  instructions        text NULL,
  is_required         boolean NOT NULL DEFAULT true,
  sort_order          integer NOT NULL DEFAULT 0,
  choice_options      jsonb NULL,
  correct_choice_key  varchar(64) NULL,
  external_url        varchar(2048) NULL,
  text_max_length     integer NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_cpa_task_type
    CHECK (task_type IN ('SINGLE_CHOICE','EXTERNAL_TASK','FILE_UPLOAD','TEXT_RESPONSE')),
  CONSTRAINT chk_cpa_sort CHECK (sort_order >= 0),
  CONSTRAINT chk_cpa_text_len
    CHECK (text_max_length IS NULL OR (text_max_length >= 1 AND text_max_length <= 20000)),
  CONSTRAINT fk_cpa_company_stage
    FOREIGN KEY (company_stage_id) REFERENCES vs_company_pipeline_stages(id) ON DELETE CASCADE
);
CREATE INDEX ix_cpa_company_stage ON vs_company_pipeline_assessment_tasks (company_stage_id);
CREATE INDEX ix_cpa_company_stage_order ON vs_company_pipeline_assessment_tasks (company_stage_id, sort_order);

CREATE TABLE vs_job_pipeline_assessment_tasks (
  id                        integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  job_stage_id              integer NOT NULL,
  source_company_task_id    integer NULL,
  task_type                 varchar(32) NOT NULL,
  title                     varchar(255) NOT NULL,
  instructions              text NULL,
  is_required               boolean NOT NULL DEFAULT true,
  sort_order                integer NOT NULL DEFAULT 0,
  choice_options            jsonb NULL,
  correct_choice_key        varchar(64) NULL,
  external_url              varchar(2048) NULL,
  text_max_length           integer NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_jpa_task_type
    CHECK (task_type IN ('SINGLE_CHOICE','EXTERNAL_TASK','FILE_UPLOAD','TEXT_RESPONSE')),
  CONSTRAINT chk_jpa_sort CHECK (sort_order >= 0),
  CONSTRAINT chk_jpa_text_len
    CHECK (text_max_length IS NULL OR (text_max_length >= 1 AND text_max_length <= 20000)),
  CONSTRAINT fk_jpa_job_stage
    FOREIGN KEY (job_stage_id) REFERENCES vs_job_pipeline_stages(id) ON DELETE CASCADE,
  CONSTRAINT fk_jpa_source_task
    FOREIGN KEY (source_company_task_id) REFERENCES vs_company_pipeline_assessment_tasks(id) ON DELETE SET NULL
);
CREATE INDEX ix_jpa_job_stage ON vs_job_pipeline_assessment_tasks (job_stage_id);
CREATE INDEX ix_jpa_job_stage_order ON vs_job_pipeline_assessment_tasks (job_stage_id, sort_order);
CREATE INDEX ix_jpa_source_task ON vs_job_pipeline_assessment_tasks (source_company_task_id);

CREATE TABLE vs_application_assessment_attempts (
  id                       integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  application_id           integer NOT NULL,
  job_stage_id             integer NOT NULL,
  attempt_number           integer NOT NULL,
  predecessor_attempt_id   integer NULL,
  status                   varchar(32) NOT NULL,
  submitted_at             timestamptz NULL,
  reviewed_at              timestamptz NULL,
  reviewed_by              integer NULL,
  review_notes             text NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_attempt_unique UNIQUE (application_id, job_stage_id, attempt_number),
  CONSTRAINT chk_attempt_number CHECK (attempt_number >= 1),
  CONSTRAINT chk_attempt_status
    CHECK (status IN ('IN_PROGRESS','SUBMITTED','UNDER_REVIEW','NEEDS_REVISION','PASSED','FAILED')),
  CONSTRAINT fk_attempt_application
    FOREIGN KEY (application_id) REFERENCES vs_job_application(application_id) ON DELETE CASCADE,
  CONSTRAINT fk_attempt_job_stage
    FOREIGN KEY (job_stage_id) REFERENCES vs_job_pipeline_stages(id) ON DELETE RESTRICT,
  CONSTRAINT fk_attempt_predecessor
    FOREIGN KEY (predecessor_attempt_id) REFERENCES vs_application_assessment_attempts(id) ON DELETE SET NULL
);
CREATE INDEX ix_attempt_application ON vs_application_assessment_attempts (application_id);
CREATE INDEX ix_attempt_job_stage ON vs_application_assessment_attempts (job_stage_id);
CREATE INDEX ix_attempt_status ON vs_application_assessment_attempts (status);

CREATE TABLE vs_application_assessment_responses (
  id                   integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  attempt_id           integer NOT NULL,
  job_task_id          integer NOT NULL,
  selected_choice_key  varchar(64) NULL,
  response_text        text NULL,
  proof_file_id        char(36) NULL,
  proof_file_name      varchar(255) NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_response_unique UNIQUE (attempt_id, job_task_id),
  CONSTRAINT fk_response_attempt
    FOREIGN KEY (attempt_id) REFERENCES vs_application_assessment_attempts(id) ON DELETE CASCADE,
  CONSTRAINT fk_response_job_task
    FOREIGN KEY (job_task_id) REFERENCES vs_job_pipeline_assessment_tasks(id) ON DELETE RESTRICT
);
CREATE INDEX ix_response_attempt ON vs_application_assessment_responses (attempt_id);
CREATE INDEX ix_response_job_task ON vs_application_assessment_responses (job_task_id);
CREATE INDEX ix_response_proof_file ON vs_application_assessment_responses (proof_file_id);

COMMIT;
```

### 3.2 MySQL / MariaDB (run this one - proven procedure)

This deployment is MySQL 8.0 (`utf8mb4` / `utf8mb4_0900_ai_ci`). MySQL/MariaDB does not support transactional DDL, so take a backup/snapshot first.

> **Important:** an earlier version of this guide put `FOREIGN KEY` and `CHECK` clauses inside each `CREATE TABLE`. On this deployment that aborted and cascaded into `1146 Table '...assessment_responses' doesn't exist`. Use the ordered procedure below instead. `CHECK` constraints are omitted because the application enforces every one of those rules (task type, sort order, text length, attempt number, status) in code.

**Step 1 - create the four tables (no foreign keys, no CHECKs; keep the two UNIQUE constraints):**

```sql
CREATE TABLE vs_company_pipeline_assessment_tasks (
  id                  INT NOT NULL AUTO_INCREMENT,
  company_stage_id    INT UNSIGNED NOT NULL,
  task_type           VARCHAR(32) NOT NULL,
  title               VARCHAR(255) NOT NULL,
  instructions        TEXT NULL,
  is_required         TINYINT(1) NOT NULL DEFAULT 1,
  sort_order          INT NOT NULL DEFAULT 0,
  choice_options      JSON NULL,
  correct_choice_key  VARCHAR(64) NULL,
  external_url        VARCHAR(2048) NULL,
  text_max_length     INT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vs_job_pipeline_assessment_tasks (
  id                      INT NOT NULL AUTO_INCREMENT,
  job_stage_id            INT UNSIGNED NOT NULL,
  source_company_task_id  INT NULL,
  task_type               VARCHAR(32) NOT NULL,
  title                   VARCHAR(255) NOT NULL,
  instructions            TEXT NULL,
  is_required             TINYINT(1) NOT NULL DEFAULT 1,
  sort_order              INT NOT NULL DEFAULT 0,
  choice_options          JSON NULL,
  correct_choice_key      VARCHAR(64) NULL,
  external_url            VARCHAR(2048) NULL,
  text_max_length         INT NULL,
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vs_application_assessment_attempts (
  id                       INT NOT NULL AUTO_INCREMENT,
  application_id           INT NOT NULL,
  job_stage_id             INT UNSIGNED NOT NULL,
  attempt_number           INT NOT NULL,
  predecessor_attempt_id   INT NULL,
  status                   VARCHAR(32) NOT NULL,
  submitted_at             DATETIME NULL,
  reviewed_at              DATETIME NULL,
  reviewed_by              INT NULL,
  review_notes             TEXT NULL,
  created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_attempt_unique UNIQUE (application_id, job_stage_id, attempt_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vs_application_assessment_responses (
  id                   INT NOT NULL AUTO_INCREMENT,
  attempt_id           INT NOT NULL,
  job_task_id          INT NOT NULL,
  selected_choice_key  VARCHAR(64) NULL,
  response_text        TEXT NULL,
  proof_file_id        CHAR(36) NULL,
  proof_file_name      VARCHAR(255) NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_response_unique UNIQUE (attempt_id, job_task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Confirm all four exist (expect 4 rows) before continuing:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_name LIKE 'vs_%assessment%'
ORDER BY table_name;
```

**Step 2 - add the eight foreign keys, one statement at a time** (run each separately; if one errors, stop and recheck Step 1.3):

```sql
ALTER TABLE vs_company_pipeline_assessment_tasks
  ADD CONSTRAINT fk_cpa_company_stage FOREIGN KEY (company_stage_id) REFERENCES vs_company_pipeline_stages(id) ON DELETE CASCADE;

ALTER TABLE vs_job_pipeline_assessment_tasks
  ADD CONSTRAINT fk_jpa_job_stage FOREIGN KEY (job_stage_id) REFERENCES vs_job_pipeline_stages(id) ON DELETE CASCADE;

ALTER TABLE vs_job_pipeline_assessment_tasks
  ADD CONSTRAINT fk_jpa_source_task FOREIGN KEY (source_company_task_id) REFERENCES vs_company_pipeline_assessment_tasks(id) ON DELETE SET NULL;

ALTER TABLE vs_application_assessment_attempts
  ADD CONSTRAINT fk_attempt_application FOREIGN KEY (application_id) REFERENCES vs_job_application(application_id) ON DELETE CASCADE;

ALTER TABLE vs_application_assessment_attempts
  ADD CONSTRAINT fk_attempt_job_stage FOREIGN KEY (job_stage_id) REFERENCES vs_job_pipeline_stages(id) ON DELETE RESTRICT;

ALTER TABLE vs_application_assessment_attempts
  ADD CONSTRAINT fk_attempt_predecessor FOREIGN KEY (predecessor_attempt_id) REFERENCES vs_application_assessment_attempts(id) ON DELETE SET NULL;

ALTER TABLE vs_application_assessment_responses
  ADD CONSTRAINT fk_response_attempt FOREIGN KEY (attempt_id) REFERENCES vs_application_assessment_attempts(id) ON DELETE CASCADE;

ALTER TABLE vs_application_assessment_responses
  ADD CONSTRAINT fk_response_job_task FOREIGN KEY (job_task_id) REFERENCES vs_job_pipeline_assessment_tasks(id) ON DELETE RESTRICT;
```

**Step 3 - add the four meaningful secondary indexes** (MySQL already indexes every FK column and the two UNIQUE constraints; do NOT add duplicate single-column indexes):

```sql
CREATE INDEX ix_cpa_company_stage_order ON vs_company_pipeline_assessment_tasks (company_stage_id, sort_order);
CREATE INDEX ix_jpa_job_stage_order ON vs_job_pipeline_assessment_tasks (job_stage_id, sort_order);
CREATE INDEX ix_attempt_status ON vs_application_assessment_attempts (status);
CREATE INDEX ix_response_proof_file ON vs_application_assessment_responses (proof_file_id);
```

> Signedness reminder: `company_stage_id` and `job_stage_id` are `INT UNSIGNED` because `vs_company_pipeline_stages.id` and `vs_job_pipeline_stages.id` are unsigned; `application_id` is `INT` because `vs_job_application.application_id` is signed. A plain `INT` cannot reference an `INT UNSIGNED` column (MySQL errno 3780). If a foreign key fails, recheck Step 1.3 rather than changing an existing table.

> `CHECK` constraints are intentionally omitted: MySQL/MariaDB enforce them inconsistently across versions and the application validates every corresponding rule in code.

---

## 4. Register the collections in Directus

After the DDL, Directus does not yet know the tables exist. For each of the four tables:

1. Open **Settings -> Data Model**. Directus lists database tables that have no collection as unmanaged/available tables.
2. Select the table and choose **Create collection** / add it to Data Model, keeping the exact table name. Do not rename the table.
3. Set the primary key field to `id` and confirm it is treated as an integer identity/auto-increment.
4. Confirm Directus shows the FK fields as integers and that it detects the relationships; if it does not auto-detect them, add them in Step 5.
5. Set a readable display template:
   - `vs_company_pipeline_assessment_tasks` -> `{{title}}`
   - `vs_job_pipeline_assessment_tasks` -> `{{title}}`
   - `vs_application_assessment_attempts` -> `{{application_id}} / attempt {{attempt_number}}`
   - `vs_application_assessment_responses` -> `{{id}}`
6. Do not add browser-facing translations, layouts, or flows for these collections in V1.

---

## 5. Directus relations

Configure these many-to-one relations in **Settings -> Data Model** (or confirm the auto-detected ones). Delete behavior must match the DDL.

| Collection | Field | Related collection | Related field | On delete |
| --- | --- | --- | --- | --- |
| `vs_company_pipeline_assessment_tasks` | `company_stage_id` | `vs_company_pipeline_stages` | `id` | Cascade |
| `vs_job_pipeline_assessment_tasks` | `job_stage_id` | `vs_job_pipeline_stages` | `id` | Cascade |
| `vs_job_pipeline_assessment_tasks` | `source_company_task_id` | `vs_company_pipeline_assessment_tasks` | `id` | Set null |
| `vs_application_assessment_attempts` | `application_id` | `vs_job_application` | `application_id` | Cascade |
| `vs_application_assessment_attempts` | `job_stage_id` | `vs_job_pipeline_stages` | `id` | Restrict |
| `vs_application_assessment_attempts` | `predecessor_attempt_id` | `vs_application_assessment_attempts` | `id` | Set null |
| `vs_application_assessment_responses` | `attempt_id` | `vs_application_assessment_attempts` | `id` | Cascade |
| `vs_application_assessment_responses` | `job_task_id` | `vs_job_pipeline_assessment_tasks` | `id` | Restrict |

Optional (soft, for admin convenience only): `vs_application_assessment_responses.proof_file_id` -> `directus_files.id` as a file relation. This is **not** a database foreign key; the application stores the raw UUID string in `char(36)`. Do not make it required.

---

## 6. Directus permissions

Identify the Directus role used by `DIRECTUS_STATIC_TOKEN` (the server service role). For each of the four new collections, grant that role the minimum below and deny everyone else.

Server service role:

| Collection | Create | Read | Update | Delete |
| --- | --- | --- | --- | --- |
| `vs_company_pipeline_assessment_tasks` | yes | yes | yes | yes |
| `vs_job_pipeline_assessment_tasks` | yes | yes | yes | yes |
| `vs_application_assessment_attempts` | yes | yes | yes (only the fields the review flow changes) | yes |
| `vs_application_assessment_responses` | yes | yes | yes | yes |

Rules:

1. Grant **no** Public-role access to any of the four collections.
2. Grant **no** browser/client/freelancer Directus-role access. All end-user access is mediated by the Next.js API with signed-session checks; Directus collections are never queried from the browser.
3. `correct_choice_key`, and any `choice_options` answer metadata, must never be readable by a freelancer-facing role. Since freelancers have no Directus access to these collections, this is satisfied by rule 2; do not add field exceptions that would expose it.
4. Do not grant the service role permission to modify Directus schema, roles, or permissions.
5. Confirm the service role keeps its existing read access to `vs_job_application`, `vs_job_pipeline_stages`, `vs_company_pipeline_stages`, `vs_job_pipeline_versions`, and `vs_user` fields it already uses.

---

## 7. Proof-file folder and environment value

The project authorizes protected files by folder name and by ownership association. Existing protected folders use underscore names (`client_documents`, `resume_documents`), so name the assessment folder to match that convention.

1. In Directus **Files**, create a folder named `assessment_proofs`.
2. Open the folder and copy its folder UUID from the URL.
3. The folder UUID is consumed by the implementation. Mirror the existing resume/identity pattern rather than requiring configuration: the code defines
   `ASSESSMENT_PROOF_FOLDER_ID = process.env.DIRECTUS_ASSESSMENT_PROOF_FOLDER_ID?.trim() || "49ce8918-ac09-476f-9b25-14a2c9dfad48"`.
   The environment variable is an **optional override**, exactly as `DIRECTUS_RESUME_FOLDER_ID` is optional for resumes today. Setting it is recommended only so production can point at its own folder.

   Recorded development folder: `assessment_proofs` = `49ce8918-ac09-476f-9b25-14a2c9dfad48`.

4. If you do set the variable, do not prefix it with `NEXT_PUBLIC_`; it is server-only.
5. The implementation (Todo 3) must register this folder so `authorizeAssetAccess` recognizes it: add `assessment_proofs` to `PROTECTED_FOLDER_NAMES` and add `DIRECTUS_ASSESSMENT_PROOF_FOLDER_ID` to `protectedFolderIds()` in `src/lib/protected-assets.ts`, then classify the new `ASSESSMENT_PROOF` kind by joining `vs_application_assessment_responses` -> attempt -> application -> job ownership. Folder-name protection alone is not sufficient; ownership association is the authoritative check.
6. Recommended fallback: add `49ce8918-ac09-476f-9b25-14a2c9dfad48` to `KNOWN_PROTECTED_FOLDER_IDS` in `src/lib/protected-assets.ts`, mirroring the resume/identity folder pattern, so the folder stays protected even if the env var is unset.
7. Upload policy already enforced in application code for this folder: PDF/JPEG/PNG/WebP, up to 10 MiB, with extension, MIME, and magic-byte validation. Do not relax it here.

### 7.1 How the file-upload task is implemented (reference, not a copy)

The project's existing upload helpers are a **reference**, not a template to copy. Assessment attempts are immutable, which changes the storage lifecycle.

- **Binary** -> Directus `directus_files`, filed into `assessment_proofs`. **Reference** -> `vs_application_assessment_responses.proof_file_id` (`char(36)`) and `proof_file_name`. No separate file table in V1: one file per `FILE_UPLOAD` task per attempt.
- **Upload flow:** validate (extension + MIME + magic bytes, 10 MiB) -> `POST` to Directus `/files` into `assessment_proofs` -> write the returned UUID onto the editable response row. If folder assignment fails, delete the just-created file; if the metadata write fails, delete the uploaded file. Never leave an orphan in Directus' default public folder.
- **Immutability rule (this is where it differs from company documents):** company documents delete the previous file on replacement. Assessment proofs must **not** delete a referenced file once the attempt is `SUBMITTED` or later, because the immutable attempt's response still points at it. Replacement-with-cleanup is allowed only while the response is in an editable `IN_PROGRESS` draft and no other response row references that exact file.
- **Revision successors:** a new attempt copies `proof_file_id` / `proof_file_name` from its predecessor as the starting value and leaves the predecessor's own row intact. Uploading a replacement updates only the successor; the predecessor's file is preserved.
- **Authorization:** by attempt -> application -> job -> company ownership (the freelancer who owns the application, the client whose company owns the job, or an administrator). The `assessment_proofs` folder name is defense in depth, not the authorization source.

---

## 8. Verification (read-only)

Run the queries for MySQL/MariaDB after setup. All counts must match expectations.

### 8.1 Tables exist

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'vs_company_pipeline_assessment_tasks',
    'vs_job_pipeline_assessment_tasks',
    'vs_application_assessment_attempts',
    'vs_application_assessment_responses'
  )
ORDER BY table_name;
```

Expected: exactly four rows.

### 8.2 Foreign keys exist

```sql
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_schema = DATABASE()
  AND constraint_type = 'FOREIGN KEY'
  AND constraint_name IN (
    'fk_cpa_company_stage','fk_jpa_job_stage','fk_jpa_source_task',
    'fk_attempt_application','fk_attempt_job_stage','fk_attempt_predecessor',
    'fk_response_attempt','fk_response_job_task'
  )
ORDER BY constraint_name;
```

Expected: eight rows.

### 8.3 Confirm FK signedness matches targets

```sql
SELECT table_name, column_name, column_type
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND (
    (table_name = 'vs_company_pipeline_assessment_tasks' AND column_name = 'company_stage_id') OR
    (table_name = 'vs_job_pipeline_assessment_tasks'     AND column_name = 'job_stage_id') OR
    (table_name = 'vs_application_assessment_attempts'   AND column_name IN ('application_id','job_stage_id'))
  )
ORDER BY table_name, column_name;
```

Expected: `company_stage_id` and both `job_stage_id` columns are `int unsigned`; `application_id` is `int`.

### 8.4 Unique constraints exist

```sql
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_schema = DATABASE()
  AND constraint_type = 'UNIQUE'
  AND constraint_name IN ('uq_attempt_unique','uq_response_unique')
ORDER BY constraint_name;
```

Expected: two rows.

### 8.5 Application smoke check

Run the app and confirm the assessment authoring route can list tasks for a company `ASSESSMENT` stage without a Directus permission error. Do not create real applicant data as part of this check.

---

## 9. Rollback

Run in this exact order so foreign keys never block a drop. The worker must not run this; the owner does, only if the feature must be backed out.

```sql
DROP TABLE IF EXISTS vs_application_assessment_responses;
DROP TABLE IF EXISTS vs_application_assessment_attempts;
DROP TABLE IF EXISTS vs_job_pipeline_assessment_tasks;
DROP TABLE IF EXISTS vs_company_pipeline_assessment_tasks;
```

Then, in Directus:

1. Remove the four collections from Data Model (do not delete the underlying tables again; they are already dropped).
2. Remove the `assessment_proofs` folder only after confirming no proof files remain, or leave the folder and orphaned files for later manual cleanup.
3. Remove `DIRECTUS_ASSESSMENT_PROOF_FOLDER_ID` from the environment.
4. Revoke the four collections' service-role permissions.

Rollback intentionally stops at the database boundary. Immutable attempt history has no partial rollback: if attempts already exist, drop them only with explicit owner approval and a backup.

---

## 10. Owner sign-off checklist

Confirm privately before telling the worker the schema is ready:

- [ ] Preflight run; engine confirmed MySQL 8.0 / MariaDB.
- [ ] Preflight confirmed none of the four tables existed.
- [ ] Preflight confirmed `vs_company_pipeline_stages.id` and `vs_job_pipeline_stages.id` are `int unsigned`, and `vs_job_application.application_id` is `int`.
- [ ] Preflight confirmed `directus_files.id` is `char(36)`.
- [ ] DDL (Section 3.2 MySQL) run after a backup.
- [ ] All four tables exist with the exact names.
- [ ] All eight foreign keys exist with the documented delete rules.
- [ ] FK signedness matches targets (`company_stage_id`/`job_stage_id` unsigned, `application_id` signed) per Step 8.3.
- [ ] `uq_attempt_unique` and `uq_response_unique` exist.
- [ ] Directus shows the four collections with `id` as integer primary key.
- [ ] All eight relations are configured with the documented delete behavior.
- [ ] Server service role has the documented CRUD; Public and browser/client access are denied.
- [ ] `assessment_proofs` folder created; its UUID is used by the code fallback and registered in `protected-assets.ts` (env override optional).
- [ ] Verification queries returned four tables, eight FKs, matching FK signedness, and two unique constraints.
- [ ] No real credentials or tokens were added to this file or git.

After sign-off, send the worker the exact message: `Assessment schema ready`. That message is necessary but not sufficient: the worker must still pass its own read-only preflight and will stop on any mismatch. Implied approval, partial completion, or the existence of this guide is not sign-off. The worker must never repair or alter database schema or Directus configuration.

---

## 11. Add assessment submission deadline columns (V2)

The deadline is a **relative window per job assessment**: the freelancer's deadline is the time they entered the ASSESSMENT stage plus the stage's configured window. The effective deadline is DERIVED (entry time + window); no separate deadline column is needed.

Run the block for your engine.

MySQL / MariaDB:

```sql
ALTER TABLE vs_company_pipeline_stages
  ADD COLUMN assessment_submission_window_days INT NULL;

ALTER TABLE vs_job_pipeline_stages
  ADD COLUMN assessment_submission_window_days INT NULL;
```

PostgreSQL (reference):

```sql
ALTER TABLE vs_company_pipeline_stages
  ADD COLUMN assessment_submission_window_days integer NULL;

ALTER TABLE vs_job_pipeline_stages
  ADD COLUMN assessment_submission_window_days integer NULL;
```

Then in Directus:

1. Settings -> Data Model -> `vs_company_pipeline_stages` and `vs_job_pipeline_stages`: confirm the new `assessment_submission_window_days` field appears (integer, nullable).
2. No permission change is required beyond those collections' existing service-role access.

Rules:

- Only meaningful when `stage_type = 'ASSESSMENT'`. `NULL` means "no deadline".
- The employer sets it on the company template; `snapshotCompanyPipeline()` must copy it into the job snapshot (the code change adds it to the stage-copy field list).
- The freelancer-facing deadline for an application = (timestamp it entered the current ASSESSMENT stage) + `assessment_submission_window_days`. Do not store a second deadline.
- Verification:

```sql
SELECT table_name, column_name, column_type
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND column_name = 'assessment_submission_window_days';
```

Expected: two rows.

After running the ALTERs and confirming the Directus fields, send `Assessment deadline columns ready`.
