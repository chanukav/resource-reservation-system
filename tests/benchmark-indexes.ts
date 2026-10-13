import { prisma } from "../src/lib/prisma";

async function runBenchmark() {
  console.log("📊 Running PostgreSQL Index & Query Plan Benchmark with EXPLAIN (ANALYZE, BUFFERS)...\n");

  const sampleResource = await prisma.resource.findFirst();
  if (!sampleResource) {
    console.error("No sample resource found.");
    return;
  }

  const sampleUser = await prisma.user.findFirst();
  if (!sampleUser) {
    console.error("No sample user found.");
    return;
  }

  // Ensure 1,000 reservations exist
  const existingCount = await prisma.reservation.count();
  console.log(`Total reservations currently in database: ${existingCount}`);

  if (existingCount < 1000) {
    console.log("Seeding up to 1,000 reservations across resources to test realistic distribution...");
    const baseDate = new Date("2026-11-01T08:00:00+05:30");
    const reservationsToInsert = [];

    const needed = 1000 - existingCount;
    for (let i = 0; i < needed; i++) {
      const start = new Date(baseDate.getTime() + (i + 300) * 2 * 3600 * 1000);
      const end = new Date(start.getTime() + 3600 * 1000);

      reservationsToInsert.push({
        title: `Historical Meeting #${existingCount + i + 1}`,
        resourceId: sampleResource.id,
        userId: sampleUser.id,
        startTime: start,
        endTime: end,
        status: "APPROVED" as const,
      });
    }

    for (let b = 0; b < reservationsToInsert.length; b += 100) {
      await prisma.reservation.createMany({
        data: reservationsToInsert.slice(b, b + 100),
      });
    }

    console.log(`Successfully seeded ${reservationsToInsert.length} additional reservations.`);
  }

  const testStart = new Date("2026-11-15T10:00:00+05:30");
  const testEnd = new Date("2026-11-15T11:00:00+05:30");

  // Run ANALYZE so PostgreSQL query planner statistics are fresh and accurate
  await prisma.$executeRawUnsafe(`ANALYZE reservations;`);

  // -------------------------------------------------------------------------
  // SCENARIO 1: Default Planner Cost Evaluation (with 1,000+ rows)
  // -------------------------------------------------------------------------
  console.log("\n==================================================");
  console.log("SCENARIO 1: Default Query Planner with 1,000+ Rows");
  console.log("==================================================");

  const defaultBtreePlan = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(
    `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
     SELECT id, "startTime", "endTime"
     FROM reservations
     WHERE "resourceId" = $1
       AND status IN ('APPROVED', 'PENDING')
       AND "startTime" < $2
       AND "endTime" > $3;`,
    sampleResource.id,
    testEnd,
    testStart
  );

  console.log("\n--- Plan with Default Costs ---");
  for (const row of defaultBtreePlan) {
    console.log(row["QUERY PLAN"]);
  }

  // -------------------------------------------------------------------------
  // SCENARIO 2: Forced Index Scan (enable_seqscan = off)
  // To observe the exact B-Tree Index Cond vs Filter mechanics
  // -------------------------------------------------------------------------
  console.log("\n==================================================");
  console.log("SCENARIO 2: Index Scan Mechanics (enable_seqscan = off)");
  console.log("Testing how B-Tree evaluates multi-column inequalities");
  console.log("==================================================");

  await prisma.$executeRawUnsafe(`SET enable_seqscan = off;`);

  const indexScanPlan = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(
    `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
     SELECT id, "startTime", "endTime"
     FROM reservations
     WHERE "resourceId" = $1
       AND status IN ('APPROVED', 'PENDING')
       AND "startTime" < $2
       AND "endTime" > $3;`,
    sampleResource.id,
    testEnd,
    testStart
  );

  for (const row of indexScanPlan) {
    console.log(row["QUERY PLAN"]);
  }

  // Reset setting
  await prisma.$executeRawUnsafe(`SET enable_seqscan = on;`);

  console.log("\n==================================================");
  console.log("SCENARIO 3: GiST tstzrange Exclusion Constraint & Index");
  console.log("Demonstrating concurrency exclusion check and range matching");
  console.log("==================================================");

  await prisma.$executeRawUnsafe(`SET enable_seqscan = off;`);

  const gistPlan = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(
    `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
     SELECT id, "startTime", "endTime"
     FROM reservations
     WHERE "resourceId" = $1
       AND status IN ('APPROVED', 'PENDING')
       AND tstzrange("startTime", "endTime", '[)') && tstzrange($2, $3, '[)');`,
    sampleResource.id,
    testStart,
    testEnd
  );

  for (const row of gistPlan) {
    console.log(row["QUERY PLAN"]);
  }

  await prisma.$executeRawUnsafe(`SET enable_seqscan = on;`);

  // Clean up benchmark test records above initial seed
  await prisma.reservation.deleteMany({
    where: {
      title: { startsWith: "Benchmark Meeting" },
    },
  });
  await prisma.reservation.deleteMany({
    where: {
      title: { startsWith: "Historical Meeting" },
    },
  });

  console.log("\n✅ Cleaned up benchmark test rows.");
}

runBenchmark()
  .catch((e) => {
    console.error("Benchmark error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
