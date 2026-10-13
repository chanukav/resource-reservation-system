-- AlterTable: Update reservation timestamp fields to TIMESTAMPTZ(3)
ALTER TABLE "reservations" 
  ALTER COLUMN "startTime" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "endTime" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3);

-- Recreate GiST exclusion constraint using tstzrange for explicit timezone guarantees
ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "no_overlapping_active_reservations";

ALTER TABLE "reservations"
ADD CONSTRAINT "no_overlapping_active_reservations"
EXCLUDE USING gist (
  "resourceId" WITH =,
  tstzrange("startTime", "endTime", '[)') WITH &&
)
WHERE ("status" IN ('PENDING', 'APPROVED'));
