# Entity Relationship (ER) Diagram & Data Dictionary

**Project:** PrimeWave Reserve — Resource Reservation Management System  
**Organization:** PrimeWave Lab (Pvt) Ltd  
**Author:** Chanuka Vithanage  
**Database:** PostgreSQL 18 with Prisma ORM  

---

## 1. Visual Entity Relationship Diagram

GitHub renders the following Mermaid ER diagram natively:

```mermaid
erDiagram
    User ||--o{ Reservation : "places (1:N)"
    User {
        String id PK "cuid()"
        String email UK "unique email"
        String name "display name"
        String passwordHash "salted PBKDF2 hash"
        Role role "USER | ADMIN"
        DateTime createdAt "default now()"
        DateTime updatedAt "auto updated"
    }

    ResourceCategory ||--o{ Resource : "categorizes (1:N)"
    ResourceCategory {
        String id PK "cuid()"
        String name UK "unique category name"
        String description "category details"
        DateTime createdAt "default now()"
    }

    Resource ||--o{ Reservation : "allocated to (1:N)"
    Resource {
        String id PK "cuid()"
        String name "facility or equipment name (unique per category)"
        String description "amenities or specs"
        String location "room or cabinet location"
        Int capacity "seat count or unit quantity"
        String imageUrl "optional asset photo"
        ResourceStatus status "AVAILABLE | MAINTENANCE | DECOMMISSIONED"
        Boolean requiresApproval "workflow flag"
        String categoryId FK "references ResourceCategory.id (ON DELETE RESTRICT)"
        DateTime createdAt "default now()"
        DateTime updatedAt "auto updated"
    }

    Reservation {
        String id PK "cuid()"
        String title "purpose or meeting subject"
        String description "optional notes / attendees"
        DateTime startTime "TIMESTAMPTZ(3) Asia/Colombo"
        DateTime endTime "TIMESTAMPTZ(3) Asia/Colombo"
        ReservationStatus status "PENDING | APPROVED | REJECTED | CANCELLED | COMPLETED"
        String rejectionReason "admin explanation if rejected"
        String userId FK "references User.id (ON DELETE CASCADE)"
        String resourceId FK "references Resource.id (ON DELETE CASCADE)"
        DateTime createdAt "TIMESTAMPTZ(3) default now()"
        DateTime updatedAt "TIMESTAMPTZ(3) auto updated"
    }
```

> **Shareable Link for Submission Form:**  
> You can view and edit this diagram on Mermaid Live Editor:  
> [Open Interactive ER Diagram on Mermaid.live](https://mermaid.live/edit#pako:eJy1lk1zmzAQhv_Kjk7OTNJMpzffCNAOrY09QHrocNnA2lELEpGWpG6c_94R2C5x6Ec8Ux9sIb27yM--K3gUhS5JTAWZQOLaYJ0rAIBrSwa224sL_QgJWTL3yFIrmEIumgoLsjB5O43PcjHQP_Zj90nZSLUGWcLyE-SiaGU5OYgHAqpRVnDtNK2Sdy31MyNKhTVBLkppmwo33eVQleiKwLivXFynYQJb8IJ5FA81ATJlsiYoDCFT6bFLSCtsKwalH57v8KBum_Kgxpb1fmIvfspVP0jI6tYU5CPTWpvNAGA339Er-kX54xjhi-gTcHaQhjSLfbJjXruAkmxhZNPV9rC3DZTEKCt7GrwXPH5nJKwq7W5ZAutxFiczyMUKC1lJ3oA2QHetbGpS3C9OdnAaMgdAY5mew8GalGRJ1mW0DRV2JKT7Q73eaF07aYE3UhEfloZRkWIosMHCbTQXlpCh0K1iF9gqyXDXomLJm5F7yRrXdG0qyIXuNokVoLXE0Nxq1s-6Y8czZeTWgu1_cuF99qKZdzULYQtzL4qzMPZi310Fob-Yz6M0jRZxGAxzXWldESowjqoh6zWN0ffotvGgzbdVpR9gVeF6ZMd72FEJ710NDa3IkHKnybH738gSJosYgnAWZiEkYZolkZ-Nd-j_6-eDX08wIkvujqOmNY225EpaE7Fbsu3NVyr4r5471FVpJguXgMykSqLx1rSMhrtRLrJoHqaZN19mXybvzsCzEi99Xen6Ro_GkipfFzmgc2yrZRgHUfzBncHLZbL4HAawhST8GPpZN_SdyWazfryYL12JgxEYhhwlqVVCaPsmLGupgL43Faq-MHK1k_0q4CBDa8mMuM09ro4c5nup7wXhWCHNzpt_sO0_JBt16xHr15n3KHjUy-Jc1GRqlKWYPgq-pdo97Xf3EU_nXQekG1WIKZuWzkWfYPcy0E8-_QT8wpPp)

---

## 2. Data Dictionary

### Table: `users`
Represents individuals interacting with the system (Regular Members / Interns and Platform Administrators).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(30)` | **PRIMARY KEY** (`cuid()`) | Unique alphanumeric identifier. |
| `email` | `VARCHAR(255)` | **UNIQUE, NOT NULL** | Work email address. |
| `name` | `VARCHAR(255)` | **NOT NULL** | User full name. |
| `passwordHash` | `TEXT` | **NOT NULL** | Salted PBKDF2 hash of the password. |
| `role` | `ENUM ('USER', 'ADMIN')` | **NOT NULL**, Default: `'USER'` | Access control role. |
| `createdAt` | `TIMESTAMP` | **NOT NULL**, Default: `now()` | Account creation timestamp. |
| `updatedAt` | `TIMESTAMP` | **NOT NULL**, Auto-updated | Last profile modification timestamp. |

---

### Table: `resource_categories`
Groups organizational resources into logical classifications (Meeting Rooms, Media Hardware, Labs).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(30)` | **PRIMARY KEY** (`cuid()`) | Unique category identifier. |
| `name` | `VARCHAR(100)` | **UNIQUE, NOT NULL** | Name of category (e.g. "Meeting & Conference Rooms"). |
| `description` | `TEXT` | `NULLABLE` | Explanation of resources in this category. |
| `createdAt` | `TIMESTAMP` | **NOT NULL**, Default: `now()` | Category creation timestamp. |

---

### Table: `resources`
The core physical assets, meeting spaces, and equipment shared across teams.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(30)` | **PRIMARY KEY** (`cuid()`) | Unique resource identifier. |
| `name` | `VARCHAR(255)` | **NOT NULL**, Compound **UNIQUE** `("categoryId", "name")` | Resource display name. Guaranteed unique within its parent category. |
| `description` | `TEXT` | `NULLABLE` | Equipment specs, seating capacity, or instructions. |
| `location` | `VARCHAR(255)` | `NULLABLE` | Physical room, floor, or storage cabinet. |
| `capacity` | `INTEGER` | **NOT NULL**, Default: `1` | Seating capacity or unit quantity available. |
| `imageUrl` | `TEXT` | `NULLABLE` | Photo reference. |
| `status` | `ENUM ('AVAILABLE', 'MAINTENANCE', 'DECOMMISSIONED')` | **NOT NULL**, Default: `'AVAILABLE'` | Real-time operational state. |
| `requiresApproval`| `BOOLEAN` | **NOT NULL**, Default: `false` | If `true`, reservations require admin confirmation. |
| `categoryId` | `VARCHAR(30)` | **FOREIGN KEY** &rarr; `resource_categories.id` (**`ON DELETE RESTRICT`**) | References parent category. Deletion of category is rejected if resources exist, eliminating orphaned resources. |
| `createdAt` | `TIMESTAMP(3)` | **NOT NULL**, Default: `now()` | Timestamp added. |
| `updatedAt` | `TIMESTAMP(3)` | **NOT NULL**, Auto-updated | Last modified. |

---

### Table: `reservations`
Booked time slots for shared resources. Stored with explicit microsecond timezone instants (`TIMESTAMPTZ(3)`) locked to the organization's timezone (`Asia/Colombo` / UTC+05:30).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(30)` | **PRIMARY KEY** (`cuid()`) | Unique booking identifier. |
| `title` | `VARCHAR(255)` | **NOT NULL** | Purpose of booking (e.g. "Sprint Planning"). |
| `description` | `TEXT` | `NULLABLE` | Meeting agenda or equipment requirements. |
| `startTime` | `TIMESTAMPTZ(3)` | **NOT NULL** | Reserved start instant in `Asia/Colombo`. |
| `endTime` | `TIMESTAMPTZ(3)` | **NOT NULL** | Reserved end instant in `Asia/Colombo`. |
| `status` | `ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED')` | **NOT NULL**, Default: `'PENDING'` | Lifecycle status of booking across 5 authoritative states. |
| `rejectionReason` | `TEXT` | `NULLABLE` | Feedback if rejected by admin. Mandatory on rejection. |
| `userId` | `VARCHAR(30)` | **FOREIGN KEY** &rarr; `users.id` (`ON DELETE CASCADE`) | User who reserved. |
| `resourceId` | `VARCHAR(30)` | **FOREIGN KEY** &rarr; `resources.id` (`ON DELETE CASCADE`) | Resource being reserved. |
| `createdAt` | `TIMESTAMPTZ(3)` | **NOT NULL**, Default: `now()` | When booking was submitted. |
| `updatedAt` | `TIMESTAMPTZ(3)` | **NOT NULL**, Auto-updated | Status transition timestamp. |

---

## 3. Database Indexes for Performance & Concurrency

1. **PostgreSQL GiST Exclusion Constraint with `tstzrange` (Hardware-Level Concurrency & Timezone Safety):**
   ```sql
   CREATE EXTENSION IF NOT EXISTS btree_gist;

   ALTER TABLE "reservations"
   ADD CONSTRAINT "no_overlapping_active_reservations"
   EXCLUDE USING gist (
     "resourceId" WITH =,
     tstzrange("startTime", "endTime", '[)') WITH &&
   )
   WHERE ("status" IN ('PENDING', 'APPROVED'));
   ```
   *Rationale:* Solves race conditions under high concurrent booking traffic across global and local timezones. Uses `tstzrange` with half-open intervals `'[)'` to ensure adjacent bookings (e.g., 10:00–11:00 followed by 11:00–12:00) are cleanly permitted, while true overlaps are physically rejected by the PostgreSQL storage engine with error `23P01 (exclusion_violation)`.

2. **Composite B-Tree Application Index:**
   ```sql
   CREATE INDEX "reservations_resourceId_startTime_endTime_idx" 
   ON "reservations" ("resourceId", "startTime", "endTime");
   ```
   *Rationale & Query Planner Characteristics:*  
   - Filters candidate reservations by exact equality on `resourceId` and establishes a starting boundary on `startTime`.
   - *Technical Nuance on Range Complexity:* Because the double-booking check applies inequalities across two distinct columns (`existing.startTime < newEnd AND existing.endTime > newStart`), a B-tree cannot perform a pure $O(\log N)$ point search on `endTime`. The query engine scans matching `resourceId` and `startTime` index entries and evaluates `endTime` as a candidate filter condition.
   - *Empirical Analysis:* In moderate-sized datasets (1,000+ rows), PostgreSQL's cost-based optimizer may favor reading cached shared buffers directly (`Seq Scan` over ~23 buffer pages) or a `Bitmap Index Scan`. Full query plans and buffer analysis are documented in [docs/INDEXING_BENCHMARK.md](docs/INDEXING_BENCHMARK.md).
   - *Separation of Concerns:* The B-tree optimizes application read paths, whereas the GiST exclusion constraint guarantees **correctness under concurrency** (preventing race conditions at the ACID storage engine level).

3. **User Dashboard Index:**
   ```sql
   CREATE INDEX "reservations_userId_idx" ON "reservations" ("userId");
   ```
   *Rationale:* Optimizes "My Reservations" queries for instant loading.

4. **Status Queue Index:**
   ```sql
   CREATE INDEX "reservations_status_idx" ON "reservations" ("status");
   ```
   *Rationale:* Accelerates the Administrator Pending Approval queue.

5. **Resource Scoped Uniqueness Index:**
   ```sql
   CREATE UNIQUE INDEX "resources_categoryId_name_key" ON "resources" ("categoryId", "name");
   ```
   *Rationale:* Enforces scoped name uniqueness per category at the physical storage layer.

---

## 4. Architectural Integrity & Schema Invariants (Assessment Finding 6 Alignment)

To eliminate documentation divergence and ensure institutional reliability across all artifacts, the following invariants are enforced:

### 1. Single Authoritative Source of Truth
The Prisma schema file ([prisma/schema.prisma](prisma/schema.prisma)) is the sole source of truth for the database structure. Both the Visual ER Diagram (Mermaid), the Interactive Live Editor link, the Data Dictionary, and the project [README.md](README.md) are derived directly from this schema. All 5 `ReservationStatus` enum values (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `COMPLETED`) and all model attributes are 100% synchronized across every document.

### 2. Category Cascade Policy & Orphan Prevention
- **Decision:** Category deletion employs `onDelete: Restrict` in PostgreSQL foreign key constraints (`category ResourceCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)`).
- **Guarantee:** An administrator cannot accidentally delete a `ResourceCategory` if resources are currently linked to it. The relational engine raises a foreign key violation (`23503`), preventing orphaned resources and preserving audit trails for historical bookings.

### 3. Resource Name Uniqueness Scope
- **Decision:** Resource names are unique **within their respective category** (`@@unique([categoryId, name])`), rather than globally unique.
- **Rationale:** Different departments or categories may share common equipment designations (e.g., both "Conference Rooms" and "Laboratories" may host a "Pod 1" or "Screen 01"). Scoping uniqueness to `(categoryId, name)` prevents accidental duplicates within the same department while allowing autonomous naming conventions across distinct organizational categories.

### 4. Clean-Slate Migration Pipeline Reproducibility
The database migration pipeline is strictly version-controlled via Prisma Migrate and consists of sequential, deterministic SQL migrations:
1. `20261012214214_init`: Initial table structures, foreign keys, and indexes.
2. `20261013101500_add_exclusion_constraint`: PostgreSQL `btree_gist` extension and GiST exclusion constraint for concurrency safety.
3. `20261013110000_update_timestamptz`: Standardized `TIMESTAMPTZ(3)` microsecond precision with timezone support.
4. `20261013120000_add_resource_category_unique_constraint`: Scoped unique constraint on `("categoryId", "name")`.

Executing `npx prisma migrate reset` or `npx prisma migrate deploy` on any clean PostgreSQL instance deterministically reconstructs the production database without drift or manual intervention.

