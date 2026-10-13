# Reservation Lifecycle & State Transition Guarantees

**Project:** PrimeWave Reserve — Resource Reservation Management System  
**Organization:** PrimeWave Lab (Pvt) Ltd  
**Author:** Chanuka Vithanage  

---

## 1. State Machine Definition & Transition Policy

The system defines five explicit lifecycle states: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, and `COMPLETED`.

```
                    ┌─────────────────────────┐
                    │         PENDING         │
                    │ (Provisional Lock Held) │
                    └───────────┬─────────────┘
                                │
               ┌────────────────┼────────────────┐
               │                │                │
               ▼                ▼                ▼
        ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
        │  APPROVED   │  │  REJECTED   │  │  CANCELLED  │
        │ (Confirmed) │  │ (Terminal)  │  │ (Terminal)  │
        └──────┬──────┘  └─────────────┘  └─────────────┘
               │                ▲                ▲
               │                │                │
               ├────────────────┴────────────────┘
               │ (User/Admin Cancel before end)
               ▼
        ┌─────────────┐
        │  COMPLETED  │
        │ (Terminal)  │
        └─────────────┘
```

### Transition Policy Matrix

| Current Status | Permitted Next Statuses | Actor / Mechanism | Invariants & Business Rules |
| :--- | :--- | :--- | :--- |
| **`PENDING`** | `APPROVED`, `REJECTED`, `CANCELLED` | Admin (Approve/Reject), Owner/Admin (Cancel) | Holds provisional interval lock. Cannot approve if resource is in `MAINTENANCE` or start time has passed. |
| **`APPROVED`** | `CANCELLED`, `COMPLETED` | Owner/Admin (Cancel), System/Time (Complete) | Can only be cancelled prior to `endTime`. Automatically completes once the reserved window elapses. |
| **`REJECTED`** | **None** (Terminal) | — | Immutable. Cannot be approved, cancelled, or modified. A new request must be submitted. |
| **`CANCELLED`** | **None** (Terminal) | — | Immutable. Releases interval lock. Cannot be reactivated. |
| **`COMPLETED`** | **None** (Terminal) | — | Immutable historical record. Cannot be cancelled or altered. |

---

## 2. Policy on Pending Bookings & Availability Blocking

### Architectural Decision: Provisional Interval Lock
In **PrimeWave Reserve**, both `PENDING` and `APPROVED` reservations participate in the overlap conflict check:
$$\text{WHERE status IN ('PENDING', 'APPROVED') AND startTime} < \text{newEnd AND endTime} > \text{newStart}$$

### Rationale
1. **Preventing Race Conditions During Administrative Triage:**  
   When high-demand lab equipment or meeting rooms require administrator approval (e.g., verifying safety equipment or room layout), placing a provisional lock prevents other users from swooping in and booking the exact same slot while the administrator is reviewing the request.
2. **Immediate Lock Release on Finalization:**  
   - If the administrator **rejects** the request, the status transitions to `REJECTED` (terminal), releasing the provisional lock instantly.
   - If the user **cancels** their request, the status transitions to `CANCELLED` (terminal), freeing the slot immediately.
   - If the administrator **approves** the request, the status transitions to `APPROVED`, confirming the reservation.

---

## 3. Atomic Conditional Updates (Guard Against Concurrency Races)

To prevent race conditions where:
- Administrator A approves a request while Administrator B rejects it simultaneously, or
- An administrator approves a request while the user cancels it at the exact same millisecond,

mutations execute **atomic conditional updates** using PostgreSQL `UPDATE ... WHERE id = $id AND status = 'PENDING'`:

```typescript
// Atomically update ONLY if status is still PENDING
const updated = await prisma.reservation.updateMany({
  where: {
    id: reservationId,
    status: ReservationStatus.PENDING,
  },
  data: {
    status: ReservationStatus.APPROVED,
    rejectionReason: null,
  },
});

if (updated.count === 0) {
  return {
    success: false,
    error: "Action conflict: This reservation is no longer pending review (it was already resolved or cancelled).",
  };
}
```

If `updated.count === 0`, the transaction fails gracefully, preventing illegal state overwrites.

---

## 4. Invariants Enforced During State Transitions

1. **Mandatory Rejection Explanation:**  
   Transitioning `PENDING` &rarr; `REJECTED` requires a non-empty `rejectionReason` with a minimum of 5 characters.
2. **Resource Status Recheck on Approval:**  
   Before approving a `PENDING` request, the server rechecks the resource's operational status. If the resource was marked as `MAINTENANCE` or `DECOMMISSIONED` while the request was queued, approval is blocked:
   `"Cannot approve reservation: Target resource is currently in MAINTENANCE status."`
3. **Start Time Expiration Check:**  
   If a `PENDING` request was left unreviewed until after its scheduled `startTime`, approval is rejected:
   `"Cannot approve reservation: the requested reservation start time has already passed."`
4. **Cancellation Expiration Check:**  
   A reservation cannot be cancelled once its `endTime` has elapsed:
   `"Cannot cancel a reservation that has already concluded."`
