-- CreateExtension
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- AlterTable: Add exclusion constraint to guarantee concurrency safety against overlapping reservations
ALTER TABLE "reservations"
ADD CONSTRAINT "no_overlapping_active_reservations"
EXCLUDE USING gist (
  "resourceId" WITH =,
  tsrange("startTime", "endTime", '[)') WITH &&
)
WHERE ("status" IN ('PENDING', 'APPROVED'));
