# Demonstration Video Script & Recording Walkthrough

**Assessment:** Resource Reservation Management System  
**Organization:** PrimeWave Lab (Pvt) Ltd  
**Target Duration:** 3 – 5 Minutes  
**Candidate:** Chanuka Vithanage  

---

## Recording Checklist Before You Start

- [ ] Ensure local development server is running (`npm run dev` at `http://localhost:3000`).
- [ ] Database is seeded with sample data (`npm run seed`).
- [ ] Browser window is set to 1080p (Full HD) with clean zoom (100%).
- [ ] Screen recording tool ready (OBS Studio, Loom, or Windows Game Bar: `Win + Alt + R`).
- [ ] Microphone tested for clear audio.

---

## Timed Video Script (4 Minutes Total)

### 0:00 – 0:45 | Part 1: Introduction & Business Scenario Interpretation
- **What to show on screen:** Homepage ([`http://localhost:3000`](http://localhost:3000)) showing the PrimeWave Reserve branding and live KPI metric cards.
- **What to say:**
  > *"Hello everyone! My name is Chanuka Vithanage. This is my submission for the Software Engineering Internship Technical Assessment at PrimeWave Lab.*
  >
  > *The core problem in the scenario is that growing teams managing shared facilities—such as meeting rooms, multimedia gear, and workstations—face scheduling confusion, uncertainty over asset availability, and worst of all, double-bookings caused by manual records and informal messaging.*
  >
  > *To solve this, I designed PrimeWave Reserve using the modern full-stack TypeScript ecosystem: Next.js 16 with the App Router, PostgreSQL 18 with Prisma ORM, and Tailwind CSS with shadcn/ui. Let's take a look at how it works."*

---

### 0:45 – 1:30 | Part 2: Resource Discovery & Client-Side Filtering
- **What to show on screen:**
  - Click on category pills: *All Resources*, *Meeting & Conference Rooms*, *Hardware & Media Equipment*, *Workstations & Labs*.
  - Type in the search box (e.g., `"Camera"`, `"Boardroom"`, `"Floor 2"`).
  - Point out resource metadata: operational readiness badges (`Operational` vs `In Maintenance`), real-time occupancy indicators (`Vacant Now` vs `Occupied Now`), seating capacity, location, and the auto-approval vs admin review indicators.
- **What to say:**
  > *"On the homepage, users are immediately greeted with live organizational metrics that clearly distinguish operational fleet readiness from real-time occupancy: operational assets, currently vacant facilities, active ongoing sessions, and the scheduled queue.*
  >
  > *Users can instantly filter through categories or search by name, specifications, or room location with zero latency. Each card displays critical real-time information—such as capacity, location, operational state, immediate occupancy status, and whether the resource requires admin signoff."*

---

### 1:30 – 2:30 | Part 3: Placing a Reservation & Concurrency/Double-Booking Prevention (The Key Engineering Highlight!)
- **What to show on screen:**
  1. Click **"Reserve Resource"** on *Agile Discussion Pod B* (an auto-approving space).
  2. Enter:
     - Title: `"Sprint Retrospective"`
     - Date: Tomorrow's date
     - Time: `10:00 AM` to `11:00 AM`
  3. Click **"Confirm Reservation"** &rarr; see the green success toast!
  4. **NOW PROVE CONFLICT PREVENTION:** Click **"Reserve Resource"** on *Agile Discussion Pod B* again.
  5. Select the **same date** with an overlapping time: `10:30 AM` to `11:30 AM`.
  6. Click **"Confirm Reservation"** &rarr; show the red error alert:
     `"Schedule Conflict: This resource is already booked from 10:00 AM to 11:00 AM. Please select another time window."`
- **What to say:**
  > *"Now let's demonstrate the most critical operational requirement: zero double-bookings.*
  >
  > *I will reserve Agile Discussion Pod B for tomorrow from 10:00 AM to 11:00 AM. Since this is a standard huddle space, it auto-confirms instantly.*
  >
  > *Now, what happens if another team member attempts to reserve the exact same pod during an overlapping interval, say 10:30 AM to 11:30 AM?*
  >
  > *The system's conflict detection engine immediately rejects the request with a clear, user-friendly error specifying the conflicting time slot. This check runs directly on PostgreSQL with an indexed query checking whether existing.start < new.end and existing.end > new.start, preventing race conditions and double-bookings."*

---

### 2:30 – 3:30 | Part 4: Approval Workflows & Admin Management Hub
- **What to show on screen:**
  1. Return to the catalog, find the *4K Cinema Camera Kit (Sony FX3)* (marked *"Requires Admin Approval"*).
  2. Click **Reserve Resource**, enter Title: `"Product Launch Teaser Shoot"`, and submit &rarr; toast confirms: `"Reservation submitted and is pending administrator review."`
  3. Navigate to **"My Reservations"** tab &rarr; point out the amber badge `"Pending Review"`.
  4. In the top navbar, click the **"Admin"** persona toggle &rarr; point out the red notification badge `[1]` on the Admin tab.
  5. Click **"Admin Management"** &rarr; show the pending request from the Intern.
  6. Demonstrate clicking **"Approve"** (or click **"Reject"** and enter a rejection reason) &rarr; immediate update.
  7. Switch to the **"Manage Facilities"** tab in Admin &rarr; show how admins can toggle resource status to `"Maintenance"` or click **"Add Resource"** to register a new organizational space.
- **What to say:**
  > *"For high-demand or sensitive assets like this 4K Cinema Camera, the organization requires administrator oversight.*
  >
  > *When requested, it enters a 'Pending Review' queue. I have built an evaluator persona switcher directly in the navbar to make testing seamless.*
  >
  > *Switching to the Platform Administrator persona immediately reveals the notification badge. In the Admin Management Hub, administrators can inspect who requested the resource, review notes, and either approve or reject with custom feedback.*
  >
  > *Admins can also register new facilities and toggle assets into Maintenance mode, instantly taking them offline from the public booking catalog."*

---

### 3:30 – 4:15 | Part 5: Architecture & Closing
- **What to show on screen:** Show the project repository on GitHub ([`github.com/chanukav/resource-reservation-system`](https://github.com/chanukav/resource-reservation-system)) or the code in IDE showing `schema.prisma` and `src/actions/reservations.ts`.
- **What to say:**
  > *"Under the hood, the application is built on thoughtful software engineering principles:*
  > - *PostgreSQL provides ACID relational integrity with native enums for roles and statuses.*
  > - *Prisma ORM provides type-safe queries and version-controlled migrations.*
  > - *Next.js Server Actions execute mutations securely on the server with automatic UI revalidation.*
  > - *And the UI is constructed with Tailwind CSS v4 and shadcn/ui for clean, accessible design.*
  >
  > *Thank you to the PrimeWave Lab team for reviewing my assessment! The source code and documentation are available in the attached GitHub repository."*

---

## Tips for High Marks
1. Speak clearly and maintain an enthusiastic, confident tone.
2. Emphasize *why* you made decisions, not just *what* the buttons do (e.g. mention database indexes and concurrency prevention).
3. Keep the video under 5 minutes as explicitly stated in the submission brief.
