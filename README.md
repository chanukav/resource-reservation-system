# PrimeWave Reserve — Resource Reservation Management System

A centralized digital reservation and scheduling platform developed for the **PrimeWave Lab (Pvt) Ltd** Software Engineering Internship Technical Assessment.

---

## 📌 Assessment Submission Deliverables

| Deliverable | Description | Access / Submission Reference |
| :--- | :--- | :--- |
| **1. GitHub Repository** | Complete, production-grade application source code, version-controlled migrations, automated test suites, and documentation. | [**github.com/chanukav/resource-reservation-system**](https://github.com/chanukav/resource-reservation-system) |
| **2. Demonstration Video** | 3–5 minute structured walkthrough communicating the business problem, live demonstration, and engineering decisions. | Script & Walkthrough Guide: [**docs/DEMO_VIDEO_SCRIPT.md**](docs/DEMO_VIDEO_SCRIPT.md) |
| **3. Entity Relationship (ER) Diagram** | Database architecture illustrating entities, relational cardinalities, constraints, and data dictionary. | **Shareable Link:** [**Open on Mermaid.live**](https://mermaid.live/edit#pako:vZZRb6NGEMe_ymifclLuTm3f_EYwd6WxsWXwSa2Qqgk7treFXbI7JHXjfPdqweZwQnqtK9UPeFn-swz_-e3AkyiMJDERZKcKtxarXAMArB1ZOBzevzdPsCJH9gFZGQ0TyEVdYkEOrr6bJO9y8VqfGFYbVXwNsFSQehgNeerG_peyVXoLSsLyFnJRNEpe9eKBgCpUJay9ptHqvqFuZkSpsSLIhVSuLnHfno6oanTu0Vj5I7od5MJhySRheXM7_fQ97NDthjErUxJYf8jFOo1WcIBgOo-ToWaKTJmqCApLyCQD9knQBpuSQZvH86fq1U0tezU2bE4TJ_FzrrvBipxpbEEhMm2N3Q_q1M63nhfdRfXnS9tfRV9QgtbYYQWK02JveCzJFVbVLRF9bnuQxKhKd5l5r_x4i1csS-NvKYHNuBcXe5CLDRaqVLwHY4HuG1VXpPmf2YAVacWKnI91NRVuJKRNvdNbYyovLfBOaeL-0jAq1gwF1lj4lHLhCBkK02j2gY1WDPcNala8H7mXqnBLa1tCLkybJJaAzhFDvTNszvbB0bmUkRsHrvvLRfAliGfBzSyCA8yDOMmiJEhCfzaNwsV8HqdpvEii6XCtG2NKQg3W-2fJBXVtzQP6NB6N_X1TmkfYlLgdyfhEUizh023baTZkSfv29JLzD0r-z5u0h_Dtvthn-xLLPvYCMllx25_qxtbGka98RcT-kmvufqOCv4lmX35tmBx8BGQmLYnG96pjtNyOcpHF8yjNgvky--Xqh3cQOIUfQ1Oa6s6MxpKW_y5y4M5L-pZRMo2Tz74pL5erxZdoCgdYRT9FYdYOQ8_ibNaNF_PlLMrOUTyaYcm7pIxeEbpur8pKaaA_6hJ1Vxi1OcpIjqzQOLIjUPp33gcl4SoM0jCYRmPls0dw_4bpN5cYpfrc129iPS7vwT6j-AI6_4MzJ7CPFMOOUJIdEVbkHG69VA-zvTPyrO0NHyXb1wTsD7no4AlmPTzxIoED3CwWt3Hy-ddwFQUdT-nPaRbNx3qZcitCOWgpGyzd2CvBfqV5vOCnq605aZRBsp7NLi36s7gWFdkKlRSTJ8E7qvzH3zFJ8XzdNrV0rwsxYdvQtejIOH4bdpPPfwE) <br> Specification & Dictionary: [**docs/ERD.md**](docs/ERD.md) |

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
    User ||--o{ Reservation : "places (1:N)"
    User ||--o{ Notification : "receives (1:N)"
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
        String name "facility or equipment name"
        String description "amenities or specs"
        String location "room or cabinet location"
        Int capacity "seat count or unit quantity"
        String imageUrl "optional asset photo"
        ResourceStatus status "AVAILABLE | MAINTENANCE | DECOMMISSIONED"
        Boolean requiresApproval "workflow flag"
        String categoryId FK "references ResourceCategory.id"
        DateTime createdAt "default now()"
        DateTime updatedAt "auto updated"
    }

    Reservation ||--o{ Notification : "references (1:N)"
    Reservation {
        String id PK "cuid()"
        String title "purpose or meeting subject"
        String description "optional notes / attendees"
        DateTime startTime "TIMESTAMPTZ(3) Asia/Colombo"
        DateTime endTime "TIMESTAMPTZ(3) Asia/Colombo"
        ReservationStatus status "PENDING | APPROVED | REJECTED | CANCELLED | COMPLETED"
        String rejectionReason "admin explanation if rejected"
        String userId FK "references User.id (CASCADE)"
        String resourceId FK "references Resource.id (CASCADE)"
        DateTime createdAt "TIMESTAMPTZ(3)"
        DateTime updatedAt "TIMESTAMPTZ(3)"
    }

    Notification {
        String id PK "cuid()"
        String userId FK "references User.id (CASCADE)"
        String title "subject header"
        String message "notification body"
        NotificationType type "APPROVAL | REJECTION | BOOKING_CREATED | SYSTEM"
        Boolean isRead "default false"
        String reservationId FK "references Reservation.id (SET NULL)"
        DateTime createdAt "TIMESTAMPTZ(3)"
    }
```

> **Shareable ER Diagram Links:**  
> - **Interactive Mermaid Live Editor:** [https://mermaid.live/edit#pako:vZZRb6NGEMe_ymifclLuTm3f_EYwd6WxsWXwSa2Qqgk7treFXbI7JHXjfPdqweZwQnqtK9UPeFn-swz_-e3AkyiMJDERZKcKtxarXAMArB1ZOBzevzdPsCJH9gFZGQ0TyEVdYkEOrr6bJO9y8VqfGFYbVXwNsFSQehgNeerG_peyVXoLSsLyFnJRNEpe9eKBgCpUJay9ptHqvqFuZkSpsSLIhVSuLnHfno6oanTu0Vj5I7od5MJhySRheXM7_fQ97NDthjErUxJYf8jFOo1WcIBgOo-ToWaKTJmqCApLyCQD9knQBpuSQZvH86fq1U0tezU2bE4TJ_FzrrvBipxpbEEhMm2N3Q_q1M63nhfdRfXnS9tfRV9QgtbYYQWK02JveCzJFVbVLRF9bnuQxKhKd5l5r_x4i1csS-NvKYHNuBcXe5CLDRaqVLwHY4HuG1VXpPmf2YAVacWKnI91NRVuJKRNvdNbYyovLfBOaeL-0jAq1gwF1lj4lHLhCBkK02j2gY1WDPcNala8H7mXqnBLa1tCLkybJJaAzhFDvTNszvbB0bmUkRsHrvvLRfAliGfBzSyCA8yDOMmiJEhCfzaNwsV8HqdpvEii6XCtG2NKQg3W-2fJBXVtzQP6NB6N_X1TmkfYlLgdyfhEUizh023baTZkSfv29JLzD0r-z5u0h_Dtvthn-xLLPvYCMllx25_qxtbGka98RcT-kmvufqOCv4lmX35tmBx8BGQmLYnG96pjtNyOcpHF8yjNgvky--Xqh3cQOIUfQ1Oa6s6MxpKW_y5y4M5L-pZRMo2Tz74pL5erxZdoCgdYRT9FYdYOQ8_ibNaNF_PlLMrOUTyaYcm7pIxeEbpur8pKaaA_6hJ1Vxi1OcpIjqzQOLIjUPp33gcl4SoM0jCYRmPls0dw_4bpN5cYpfrc129iPS7vwT6j-AI6_4MzJ7CPFMOOUJIdEVbkHG69VA-zvTPyrO0NHyXb1wTsD7no4AlmPTzxIoED3CwWt3Hy-ddwFQUdT-nPaRbNx3qZcitCOWgpGyzd2CvBfqV5vOCnq605aZRBsp7NLi36s7gWFdkKlRSTJ8E7qvzH3zFJ8XzdNrV0rwsxYdvQtejIOH4bdpPPfwE](https://mermaid.live/edit#pako:vZZRb6NGEMe_ymifclLuTm3f_EYwd6WxsWXwSa2Qqgk7treFXbI7JHXjfPdqweZwQnqtK9UPeFn-swz_-e3AkyiMJDERZKcKtxarXAMArB1ZOBzevzdPsCJH9gFZGQ0TyEVdYkEOrr6bJO9y8VqfGFYbVXwNsFSQehgNeerG_peyVXoLSsLyFnJRNEpe9eKBgCpUJay9ptHqvqFuZkSpsSLIhVSuLnHfno6oanTu0Vj5I7od5MJhySRheXM7_fQ97NDthjErUxJYf8jFOo1WcIBgOo-ToWaKTJmqCApLyCQD9knQBpuSQZvH86fq1U0tezU2bE4TJ_FzrrvBipxpbEEhMm2N3Q_q1M63nhfdRfXnS9tfRV9QgtbYYQWK02JveCzJFVbVLRF9bnuQxKhKd5l5r_x4i1csS-NvKYHNuBcXe5CLDRaqVLwHY4HuG1VXpPmf2YAVacWKnI91NRVuJKRNvdNbYyovLfBOaeL-0jAq1gwF1lj4lHLhCBkK02j2gY1WDPcNala8H7mXqnBLa1tCLkybJJaAzhFDvTNszvbB0bmUkRsHrvvLRfAliGfBzSyCA8yDOMmiJEhCfzaNwsV8HqdpvEii6XCtG2NKQg3W-2fJBXVtzQP6NB6N_X1TmkfYlLgdyfhEUizh023baTZkSfv29JLzD0r-z5u0h_Dtvthn-xLLPvYCMllx25_qxtbGka98RcT-kmvufqOCv4lmX35tmBx8BGQmLYnG96pjtNyOcpHF8yjNgvky--Xqh3cQOIUfQ1Oa6s6MxpKW_y5y4M5L-pZRMo2Tz74pL5erxZdoCgdYRT9FYdYOQ8_ibNaNF_PlLMrOUTyaYcm7pIxeEbpur8pKaaA_6hJ1Vxi1OcpIjqzQOLIjUPp33gcl4SoM0jCYRmPls0dw_4bpN5cYpfrc129iPS7vwT6j-AI6_4MzJ7CPFMOOUJIdEVbkHG69VA-zvTPyrO0NHyXb1wTsD7no4AlmPTzxIoED3CwWt3Hy-ddwFQUdT-nPaRbNx3qZcitCOWgpGyzd2CvBfqV5vOCnq605aZRBsp7NLi36s7gWFdkKlRSTJ8E7qvzH3zFJ8XzdNrV0rwsxYdvQtejIOH4bdpPPfwE)  
> - **Detailed Schema & Data Dictionary:** [docs/ERD.md](docs/ERD.md)

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

## 7. Automated Verification & Test Suites (182+ Assertions)

The repository includes a comprehensive, multi-layered automated test suite covering unit logic, integration workflows, security defenses, concurrency race conditions, and stress testing:

```bash
# Run the entire test suite (all 6 suites, 182+ assertions)
npm test

# Run specific domain suites:
npm run test:checklist   # Evaluator 18-point verification checklist
npm run test:auth        # Matrix RBAC, session tampering & exclusion constraint checks
npm run test:users       # User management, RBAC promotion/demotion invariants
npm run test:stress      # High-concurrency stress & race condition testing
npm run test:full        # Core end-to-end booking & conflict lifecycle
```

### Test Suite Execution Output
```
=====================================================================================
  🏁 MASTER TEST ORCHESTRATION SUMMARY
=====================================================================================
  ✅ Full Project Core Suite                  Passed (0.91s)
  ✅ Extended Stress & Invariants Suite       Passed (1.27s)
  ✅ Evaluator Assessment Checklist           Passed (2.04s)
  ✅ User Management & Life Cycle             Passed (0.70s)
  ✅ Matrix RBAC & Session Defense            Passed (1.93s)
  ✅ Real-Time Notifications & Approvals      Passed (1.08s)
-------------------------------------------------------------------------------------
  TOTAL ELAPSED TIME: ~8.0s across all test suites
  TOTAL PASSING TESTS: 182+ automated assertions across all P0, P1, and P2 domains
=====================================================================================
```

---

## 8. Alignment with Evaluation Criteria

| Evaluation Area | How PrimeWave Reserve Addresses It | Technical Evidence / Documentation |
| :--- | :--- | :--- |
| **Understanding of Business Problem** | Directly eliminates scheduling confusion, double-bookings, and asset mismanagement through centralized live status, instant conflict feedback, and dual-tier booking workflows. | [Section 1](#1-business-problem--solution-overview), [docs/DEMO_VIDEO_SCRIPT.md](docs/DEMO_VIDEO_SCRIPT.md) |
| **Problem-Solving & Engineering Judgement** | Solved double-booking race conditions at the ACID level using PostgreSQL GiST Exclusion Constraints (`tstzrange`) rather than error-prone application locks. Modeled strict state machines and provisional interval locking. | [Section 4](#4-key-engineering-decisions), [docs/INDEXING_BENCHMARK.md](docs/INDEXING_BENCHMARK.md), [docs/RESERVATION_LIFECYCLE.md](docs/RESERVATION_LIFECYCLE.md) |
| **Functional Completeness & Reliability** | Complete end-to-end flows: resource discovery, instant filtering, booking modal, conflict rejection, dual-tier approval workflows, rejection feedback, cancellations, and user management. | [docs/TECHNICAL_EVIDENCE.md](docs/TECHNICAL_EVIDENCE.md), 182+ tests passing |
| **Application Architecture & Database Design** | Modular Next.js 16 App Router with React Server Components, Server Actions, PostgreSQL 18 with Prisma ORM, strict foreign key constraints (`ON DELETE RESTRICT` for categories, `CASCADE` for users/reservations), composite and GiST indexes. | [Section 3](#3-entity-relationship-er-diagram), [docs/ERD.md](docs/ERD.md) |
| **Code Quality & Maintainability** | 100% strict TypeScript (`strict: true`), zero ESLint warnings, typed Zod runtime schemas, error sanitization, single Prisma singleton, modular component hierarchy. | Clean `tsc --noEmit` and `npm run lint` results |
| **User Experience & Practical Usability** | Modern design using Tailwind CSS v4 and shadcn/ui. Clear visual indicators (Available vs Occupied), real-time notification toasts via Sonner, and an evaluator persona quick-switcher. | Accessible UI components in `src/components/` |
| **Technical Understanding & Communication** | Clear technical documentation, comprehensive ERD data dictionary, indexing and buffer benchmarks, timed demonstration video script, and reproducible test suites. | [docs/](docs/), [README.md](README.md), [docs/DEMO_VIDEO_SCRIPT.md](docs/DEMO_VIDEO_SCRIPT.md) |

---

## 9. Project Directory Structure

```
├── docs/                 # Architectural specifications, benchmarks & video script
│   ├── DEMO_VIDEO_SCRIPT.md    # Timed 4-minute demonstration script & cues
│   ├── ERD.md                  # Comprehensive ER diagram & data dictionary
│   ├── INDEXING_BENCHMARK.md   # PostgreSQL query execution plans & buffer analysis
│   ├── RESERVATION_LIFECYCLE.md# State machine transition rules & locks
│   └── TECHNICAL_EVIDENCE.md   # Empirical performance & checklist evidence
├── prisma/
│   ├── migrations/       # Version-controlled SQL migration history
│   ├── schema.prisma     # Relational database models and indexes
│   └── seed.ts           # Demo data seed script
├── src/
│   ├── actions/          # Server Actions (Mutations & conflict checking)
│   │   ├── auth.ts       # Login, logout, session management
│   │   ├── notifications.ts # Real-time notification actions
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
│   │   ├── notifications-popover.tsx # Real-time notifications bell & inbox
│   │   ├── reserve-modal.tsx
│   │   ├── resource-catalog.tsx
│   │   └── user-reservations-list.tsx
│   └── lib/              # Database clients and session helpers
│       ├── auth.ts       # Persona switching server actions
│       ├── prisma.ts     # Global Prisma Client singleton
│       ├── reservation-state.ts # Authority state machine validator
│       └── utils.ts      # Class merging utilities
├── tests/                # Automated verification suites (182+ assertions)
├── .env.example          # Environment variable template
└── README.md             # Technical documentation
```

---

## 10. License & Attribution
Developed for the **PrimeWave Lab (Pvt) Ltd** Software Engineering Internship Technical Assessment.  
Author: **Chanuka Vithanage**