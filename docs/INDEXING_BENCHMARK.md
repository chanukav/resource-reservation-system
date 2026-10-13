# PostgreSQL Indexing & Query Plan Performance Analysis

**Project:** PrimeWave Reserve — Resource Reservation Management System  
**Organization:** PrimeWave Lab (Pvt) Ltd  
**Author:** Chanuka Vithanage  
**Database:** PostgreSQL 18 with `btree_gist` Extension  

---

## 1. Executive Summary & Clarification (Finding 4 Resolution)

Initial documentation described the composite B-tree index `@@index([resourceId, startTime, endTime])` as providing an "$O(\log N)$ sub-millisecond guarantee" for interval conflict detection.

### Why That Description Overstated the Performance Guarantee
1. **Inequality Limitations in Multi-Column B-Trees:**  
   The application's double-booking conflict check evaluates:
   $$\text{resourceId} = \$1 \quad \land \quad \text{startTime} < \$2 \quad \land \quad \text{endTime} > \$3$$
   While a B-tree performs an exact $O(\log N)$ point seek on the leading equality column (`resourceId`), once an inequality range condition is applied to the second column (`startTime < $2`), the B-tree cannot perform a direct logarithmic binary seek on the third column (`endTime`). Instead, the query planner must scan index entries matching the `startTime` boundary and apply `endTime > $3` as a filter or recheck predicate across candidate index/heap tuples.
2. **PostgreSQL Cost-Based Optimizer Behavior:**  
   B-tree indexes do not automatically guarantee faster execution across all table sizes. As demonstrated by empirical `EXPLAIN (ANALYZE, BUFFERS)` benchmarks below, when table data fits within a small number of buffer pages (e.g., 23 memory pages for 1,000 reservation rows), PostgreSQL's cost planner deliberately chooses a sequential page scan (`Seq Scan`) because reading contiguous memory buffers incurs lower total CPU and planning overhead than random heap lookups via an index.
3. **The True Role of the GiST Exclusion Constraint:**  
   The primary justification for the GiST exclusion constraint (`no_overlapping_active_reservations`) is **transactional correctness under concurrency**, not theoretical query speed. It guarantees ACID serializability at the PostgreSQL engine level, physically preventing overlapping inserts even under high-throughput race conditions at `READ COMMITTED` isolation.

---

## 2. Empirical Benchmark: `EXPLAIN (ANALYZE, BUFFERS)`

The benchmark was executed against 1,000 reservations distributed across resources in PostgreSQL 18. Fresh query planner statistics were established via `ANALYZE reservations;`.

### Scenario 1: Default PostgreSQL Cost Evaluation (1,000 Rows)

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, "startTime", "endTime"
FROM reservations
WHERE "resourceId" = 'cmv5s69470006t8680tzhuful'
  AND status IN ('APPROVED', 'PENDING')
  AND "startTime" < '2026-11-15 11:00:00+05:30'
  AND "endTime" > '2026-11-15 10:00:00+05:30';
```

**Execution Plan:**
```
Seq Scan on public.reservations  (cost=0.00..43.00 rows=142 width=42) (actual time=0.099..0.335 rows=1.00 loops=1)
  Output: id, "startTime", "endTime"
  Filter: ((reservations.status = ANY ('{APPROVED,PENDING}'::"ReservationStatus"[])) 
           AND (reservations."startTime" < '2026-11-15 11:00:00+05:30'::timestamptz) 
           AND (reservations."endTime" > '2026-11-15 10:00:00+05:30'::timestamptz) 
           AND (reservations."resourceId" = 'cmv5s69470006t8680tzhuful'::text))
  Rows Removed by Filter: 999
  Buffers: shared hit=23
Planning Time: 0.486 ms
Execution Time: 0.352 ms
```
*Observation:* With 1,000 rows, the entire table occupies just **23 shared buffer pages**. Reading 23 memory pages linearly takes 0.35 ms, causing the planner to favor a sequential scan over index traversal overhead.

---

### Scenario 2: Index Scan Mechanics (Forced via `enable_seqscan = off`)

To evaluate the exact mechanics of the composite B-tree index `reservations_resourceId_startTime_endTime_idx`:

```sql
SET enable_seqscan = off;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, "startTime", "endTime"
FROM reservations
WHERE "resourceId" = 'cmv5s69470006t8680tzhuful'
  AND status IN ('APPROVED', 'PENDING')
  AND "startTime" < '2026-11-15 11:00:00+05:30'
  AND "endTime" > '2026-11-15 10:00:00+05:30';
```

**Execution Plan:**
```
Bitmap Heap Scan on public.reservations  (cost=18.45..44.29 rows=142 width=42) (actual time=0.202..0.203 rows=1.00 loops=1)
  Output: id, "startTime", "endTime"
  Recheck Cond: ((reservations."resourceId" = 'cmv5s69470006t8680tzhuful'::text) 
                 AND (reservations."startTime" < '2026-11-15 11:00:00+05:30'::timestamptz) 
                 AND (reservations."endTime" > '2026-11-15 10:00:00+05:30'::timestamptz))
  Filter: (reservations.status = ANY ('{APPROVED,PENDING}'::"ReservationStatus"[]))
  Heap Blocks: exact=1
  Buffers: shared hit=14
  ->  Bitmap Index Scan on "reservations_resourceId_startTime_endTime_idx"  (cost=0.00..18.41 rows=142 width=0) (actual time=0.176..0.176 rows=1.00 loops=1)
        Index Cond: ((reservations."resourceId" = 'cmv5s69470006t8680tzhuful'::text) 
                     AND (reservations."startTime" < '2026-11-15 11:00:00+05:30'::timestamptz) 
                     AND (reservations."endTime" > '2026-11-15 10:00:00+05:30'::timestamptz))
        Index Searches: 1
        Buffers: shared hit=13
Planning Time: 0.237 ms
Execution Time: 0.229 ms
```
*Observation:* The planner uses a **Bitmap Index Scan**. It performs an equality seek on `resourceId`, scans index keys up to `startTime < $2`, and evaluates `endTime > $3` as a candidate condition. Total buffer touches: **14 buffers** (13 index blocks + 1 heap block).

---

### Scenario 3: GiST `tstzrange` Interval Overlap Scan

Testing interval matching directly against the GiST index created by the exclusion constraint:

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, "startTime", "endTime"
FROM reservations
WHERE "resourceId" = 'cmv5s69470006t8680tzhuful'
  AND status IN ('APPROVED', 'PENDING')
  AND tstzrange("startTime", "endTime", '[)') && tstzrange('2026-11-15 10:00:00+05:30', '2026-11-15 11:00:00+05:30', '[)');
```

**Execution Plan:**
```
Bitmap Heap Scan on public.reservations  (cost=4.25..23.56 rows=10 width=42) (actual time=0.135..0.136 rows=1.00 loops=1)
  Output: id, "startTime", "endTime"
  Recheck Cond: ((reservations."resourceId" = 'cmv5s69470006t8680tzhuful'::text) 
                 AND (tstzrange(reservations."startTime", reservations."endTime", '[)'::text) && '["2026-11-15 10:00:00+05:30","2026-11-15 11:00:00+05:30")'::tstzrange) 
                 AND (reservations.status = ANY ('{PENDING,APPROVED}'::"ReservationStatus"[])))
  Heap Blocks: exact=1
  Buffers: shared hit=3
  ->  Bitmap Index Scan on no_overlapping_active_reservations  (cost=0.00..4.24 rows=10 width=0) (actual time=0.107..0.107 rows=1.00 loops=1)
        Index Cond: ((reservations."resourceId" = 'cmv5s69470006t8680tzhuful'::text) 
                     AND (tstzrange(reservations."startTime", reservations."endTime", '[)'::text) && '["2026-11-15 10:00:00+05:30","2026-11-15 11:00:00+05:30")'::tstzrange))
        Index Searches: 1
        Buffers: shared hit=2
```
*Observation:* The GiST index uses an R-tree hierarchical bounding box on the 1D interval `tstzrange`. It touches only **3 buffer pages** (2 index blocks + 1 heap block) with an estimated cost of **4.25..23.56** (compared to B-Tree's 18.45..44.29).

---

## 3. Comparison of Indexing Strategies

| Metric / Dimension | Composite B-Tree `(resourceId, startTime, endTime)` | GiST Exclusion Index `(resourceId, tstzrange)` |
| :--- | :--- | :--- |
| **Leading Equality Column** | `resourceId` ($O(\log N)$ binary seek) | `resourceId` (hash/equality seek via `btree_gist`) |
| **Interval Range Handling** | Scans `startTime` range; filters on `endTime` | Hierarchical bounding box on 1D interval `[start, end)` |
| **Buffer Touches (1,000 rows)**| 14 buffer hits | **3 buffer hits** |
| **Primary Engineering Purpose**| Speeds up application lookups when filtering by resource and start time | **Enforces physical serializability & prevents double-booking race conditions** |
| **Concurrency Protection** | None (read query only; requires app locks or Serializable) | **PostgreSQL Engine-Level Invariant (Violation 23P01)** |

---

## 4. Key Takeaways & Recommendations

1. **Avoid Overstating Theoretical Guarantees:** Do not claim that multi-column B-tree indexes guarantee $O(\log N)$ total execution time for two-sided interval range checks. In reality, inequalities on multiple columns require scanning candidate index ranges.
2. **Contextual Cost Models:** PostgreSQL's cost planner intelligently chooses between Sequential Scans, Bitmap Index Scans, and Index Scans depending on table cardinality, page count, and correlation.
3. **Separate Concerns:**
   - Use the composite B-tree `@@index([resourceId, startTime, endTime])` as a standard lookup helper for resource-specific time queries.
   - Use the PostgreSQL GiST exclusion constraint (`no_overlapping_active_reservations`) for **absolute correctness under concurrency**.
