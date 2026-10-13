# PrimeWave Reserve — Resource Reservation Management System

A centralized digital reservation and scheduling platform developed for the **PrimeWave Lab (Pvt) Ltd** Software Engineering Internship Technical Assessment.

---

## 1. Business Problem & Solution Overview

### The Challenge
A growing organization manages shared facilities and resources (meeting rooms, video equipment, workstations, and lab gear). In the absence of a centralized digital tool, reservations handled via informal communication and manual spreadsheets lead to:
- **Scheduling confusion and uncertainty** regarding real-time resource availability.
- **Overlapping reservations (double-bookings)** for high-demand assets.
- **Lack of oversight** over shared equipment conditions and maintenance schedules.

### The Solution
**PrimeWave Reserve** eliminates scheduling friction with:
- **Real-Time Catalog & Availability:** Live status pills (`Available`, `Maintenance`, `Decommissioned`) and upcoming booking counts.
- **Zero-Double-Booking Guarantee:** Concurrency-safe reservation engine backed by PostgreSQL GiST exclusion constraints and application-level interval conflict detection.
- **Dual-Tier Booking Workflows:** Immediate auto-confirmation for standard workspaces, and a managed approval queue for high-value equipment.
- **Frictionless Evaluator Persona Switching:** Quick-toggle between **Intern User** and **Platform Administrator** in the top navigation bar.

---

## 2. Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router)** | Full-stack architecture with React Server Components (RSC) for zero client bundle database reads and Server Actions for data mutations. |
| **Language** | **TypeScript 5 (Strict Mode)** | End-to-end type safety spanning database queries, server actions, and UI components. |
| **Database** | **PostgreSQL 18** | Relational integrity, ACID compliance, and native ENUM enforcement. |
| **ORM** | **Prisma 6.4.1** | Declarative schema modeling, automatic migration tracking, and typed client queries. |
| **Styling** | **Tailwind CSS v4** | Modern CSS variable tokens with `@theme inline` and dark mode support. |
| **UI Components** | **shadcn/ui + Base UI** | Fully accessible, keyboard-navigable UI primitives (Dialogs, Badges, Tabs, Cards). |
| **Feedback** | **Sonner** | Clean toast notifications for immediate operational feedback. |

---

## 3. Entity Relationship (ER) Diagram

```mermaid
erDiagram
    User ||--o{ Reservation : "places"
    User {
        String id PK "cuid()"
        String email UK
        String name
        Role role "USER | ADMIN"
        DateTime createdAt
    }

    ResourceCategory ||--o{ Resource : "categorizes"
    ResourceCategory {
        String id PK "cuid()"
        String name UK
        String description
    }

    Resource ||--o{ Reservation : "has"
    Resource {
        String id PK "cuid()"
        String name "unique per category"
        String description
        String location
        Int capacity
        ResourceStatus status "AVAILABLE | MAINTENANCE | DECOMMISSIONED"
        Boolean requiresApproval
        String categoryId FK "references ResourceCategory.id (ON DELETE RESTRICT)"
    }

    Reservation {
        String id PK "cuid()"
        String title
        String description
        DateTime startTime "TIMESTAMPTZ(3) Asia/Colombo"
        DateTime endTime "TIMESTAMPTZ(3) Asia/Colombo"
        ReservationStatus status "PENDING | APPROVED | REJECTED | CANCELLED | COMPLETED"
        String rejectionReason
        String userId FK "references User.id (ON DELETE CASCADE)"
        String resourceId FK "references Resource.id (ON DELETE CASCADE)"
        DateTime createdAt "TIMESTAMPTZ(3)"
    }
```

---

## 4. Key Engineering Decisions

### 1. Conflict Detection & Overlapping Booking Prevention
The system enforces strict concurrency safeguards. When a reservation is requested for `[newStart, newEnd]`, the server validates that no existing active reservation satisfies:
$$\text{existing.startTime} < \text{newEnd} \quad \land \quad \text{existing.endTime} > \text{newStart}$$

Implemented in Prisma with compound database index optimization:
```typescript
const conflictingBooking = await prisma.reservation.findFirst({
  where: {
    resourceId,
    status: { in: [ReservationStatus.APPROVED, ReservationStatus.PENDING] },
    startTime: { lt: end },
    endTime: { gt: start },
  },
});
```

To eliminate race conditions under interleaved concurrent requests at `READ COMMITTED` isolation, the invariant is physically enforced in the database via a **PostgreSQL GiST Exclusion Constraint** using `tstzrange`:
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
Any simultaneous request attempting to insert an overlapping interval is stopped by the database engine with error `23P01` (`exclusion_violation`), which the application catches and converts into a user-friendly conflict message.

> **Engineering Note on Indexing & Concurrency:**  
> The composite B-tree index `@@index([resourceId, startTime, endTime])` accelerates candidate lookups in application queries. However, because interval overlap checks evaluate two distinct inequalities (`existing.startTime < newEnd AND existing.endTime > newStart`), B-trees cannot perform pure $O(\log N)$ point lookups on both columns simultaneously. The primary reason to implement the GiST exclusion constraint is **correctness under concurrency** (eliminating double-booking race conditions at the ACID level), not merely query speed. Detailed query execution plans and buffer benchmarks are documented in [docs/INDEXING_BENCHMARK.md](docs/INDEXING_BENCHMARK.md).

### 2. Next.js Server Actions over REST Boilerplate
Rather than building separate Express controllers and client-side `axios` fetching hooks, mutations are executed via typed **Server Actions** (`src/actions/reservations.ts` and `src/actions/resources.ts`). This guarantees:
- Direct execution within database transactions.
- Zero client bundle overhead.
- Automatic path revalidation (`revalidatePath`) to instantly sync the UI.

### 3. Connection Pooling Singleton
In development mode, Next.js fast-refresh can spawn multiple Prisma client instances. We implement a global singleton pattern (`src/lib/prisma.ts`) to avoid PostgreSQL connection exhaustion.

### 4. Explicit Lifecycle State Machine & Provisional Interval Locking
Reservation status transitions follow a rigid, validated state machine ([src/lib/reservation-state.ts](src/lib/reservation-state.ts)):
- **Provisional Interval Lock:** `PENDING` requests hold a temporary availability lock on the resource. This eliminates double-booking race conditions while administrators evaluate requests. If rejected or cancelled, the provisional lock is instantly released.
- **Terminal Immutability:** `REJECTED`, `CANCELLED`, and `COMPLETED` are terminal states; no further transitions are permitted.
- **Atomic Conditional Updates:** Administrator reviews (`updateReservationStatusAction`) execute atomic conditional updates (`WHERE id = $id AND status = 'PENDING'`), eliminating concurrent administrator race conditions.
- **Mandatory Rejection Explanation:** Rejections require an explicit, audited explanation (minimum 5 characters).
- Full specification documented in [docs/RESERVATION_LIFECYCLE.md](docs/RESERVATION_LIFECYCLE.md).

---

## 5. Getting Started (Local Setup)

### Prerequisites
- **Node.js**: `v20+` (Tested on `v24.11.1`)
- **PostgreSQL**: `15+` (Tested on `v18.0`)
- **Git**

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/chanukav/resource-reservation-system.git
   cd resource-reservation-system
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment template:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your PostgreSQL credentials:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/resource_reservation_db?schema=public"
   ```

4. **Initialize Database & Migrations:**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Seed Demo Data:**
   Populate sample categories, resources, and demo accounts:
   ```bash
   npm run seed
   ```

6. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

---

## 6. Authentication System & User Management

PrimeWave Reserve provides an enterprise authentication system with role-based access control (RBAC):

### 1. Dedicated Login Page (`/login`)
- **Credentials:** Form authentication using PBKDF2-SHA512 password verification.
- **Session Security:** Cryptographically signed session cookies (HMAC-SHA256) marked `httpOnly`, `sameSite: lax`.
- **Evaluator Quick-Fill:** One-click demo login buttons for instant evaluation.

| Role | Seeded Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Platform Administrator** | `admin@primewave.com` | `Admin@123` | **Full access**: Approve/reject bookings, manage resources, and full User Management (create users, promote/demote roles, delete accounts). |
| **Engineering Intern** | `intern@primewave.com` | `Intern@123` | **User access**: Browse catalog, book resources, track & cancel personal reservations. **Admin console is completely blocked (403 Forbidden).** |

### 2. User Management (Admin Only)
Only administrators have access to user management in the **Admin Console** under the **User Management** tab:
- **Directory**: View all registered users, their roles, join dates, and lifetime reservation counts.
- **Provisioning**: Create new enterprise users with temporary passwords and designated roles (`USER` or `ADMIN`).
- **Role Assignment**: Promote members to `ADMIN` or demote administrators to `USER`.
- **Safety Invariants**:
  - Administrators cannot demote themselves.
  - Administrators cannot delete their own active accounts.
  - The system prevents deleting or demoting the last remaining administrator.
  - Regular `USER` accounts receive a strict `403 Forbidden` if attempting to access `/admin` or execute administrative Server Actions.

---

## 7. Project Directory Structure

```
├── prisma/
│   ├── migrations/       # Version-controlled SQL migration history
│   ├── schema.prisma     # Relational database models and indexes
│   └── seed.ts           # Demo data seed script
├── src/
│   ├── actions/          # Server Actions (Mutations & conflict checking)
│   │   ├── auth.ts       # Login, logout, session management
│   │   ├── reservations.ts
│   │   ├── resources.ts
│   │   └── users.ts      # Administrator User Management (Create, Role, Delete)
│   ├── app/              # Next.js App Router pages
│   │   ├── admin/        # Administrator Management Hub (RBAC-protected)
│   │   ├── login/        # Dedicated enterprise login page
│   │   ├── reservations/ # User's personal reservation tracking
│   │   ├── layout.tsx    # Root application shell with Navbar and Sonner toaster
│   │   └── page.tsx      # Resource catalog and live KPI dashboard
│   ├── components/       # Reusable Client & Server components
│   │   ├── ui/           # shadcn/ui accessible primitives
│   │   ├── admin-dashboard.tsx # Hub with Pending, Bookings, Resources & Users tabs
│   │   ├── login-form.tsx      # Interactive sign-in form with demo quick-fill
│   │   ├── navbar.tsx          # Dynamic navigation with user profile & sign out
│   │   ├── reserve-modal.tsx
│   │   ├── resource-catalog.tsx
│   │   └── user-reservations-list.tsx
│   └── lib/              # Database clients and session helpers
│       ├── auth.ts       # Persona switching server actions
│       ├── prisma.ts     # Global Prisma Client singleton
│       └── utils.ts      # Class merging utilities
├── .env.example          # Environment variable template
└── README.md             # Technical documentation
```

---

## 8. License & Attribution
Developed for the **PrimeWave Lab (Pvt) Ltd** Software Engineering Internship Technical Assessment.
Author: **Chanuka Vithanage**