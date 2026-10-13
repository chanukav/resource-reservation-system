/**
 * Empirical Benchmark Measurement Tool
 * Produces reproducible measurements for:
 * 1. Server HTTP response latencies (p50, p90, p95, p99) under stated conditions.
 * 2. Prisma database queries (min, mean, p50, p95, max) on representative data.
 */

import { prisma } from "../src/lib/prisma";
import { performance } from "perf_hooks";

function computePercentiles(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const getP = (p: number) => {
    const idx = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
    return sorted[idx];
  };

  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / sorted.length;

  return {
    min: sorted[0].toFixed(2),
    p50: getP(50).toFixed(2),
    p90: getP(90).toFixed(2),
    p95: getP(95).toFixed(2),
    p99: getP(99).toFixed(2),
    max: sorted[sorted.length - 1].toFixed(2),
    mean: mean.toFixed(2),
    samples: sorted.length,
  };
}

async function benchmarkEndpoint(url: string, samples = 50) {
  const durations: number[] = [];

  // Warmup 5 requests
  for (let i = 0; i < 5; i++) {
    try {
      await fetch(url);
    } catch {
      // ignore warmup errors
    }
  }

  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    const res = await fetch(url);
    await res.text();
    const end = performance.now();
    durations.push(end - start);
  }

  return computePercentiles(durations);
}

async function benchmarkPrismaQueries(samples = 100) {
  const resourceCount = await prisma.resource.count();
  const reservationCount = await prisma.reservation.count();
  const sampleResource = await prisma.resource.findFirst();

  if (!sampleResource) {
    throw new Error("No resource found for benchmarking");
  }

  const startCheck = new Date("2026-10-25T10:00:00+05:30");
  const endCheck = new Date("2026-10-25T11:00:00+05:30");

  // 1. Conflict detection query
  const conflictDurations: number[] = [];
  for (let i = 0; i < samples; i++) {
    const t0 = performance.now();
    await prisma.reservation.findFirst({
      where: {
        resourceId: sampleResource.id,
        status: { in: ["APPROVED", "PENDING"] },
        startTime: { lt: endCheck },
        endTime: { gt: startCheck },
      },
    });
    const t1 = performance.now();
    conflictDurations.push(t1 - t0);
  }

  // 2. Resource catalog query (with category and relations)
  const catalogDurations: number[] = [];
  for (let i = 0; i < samples; i++) {
    const t0 = performance.now();
    await prisma.resource.findMany({
      include: {
        category: true,
        reservations: {
          where: {
            status: { in: ["APPROVED", "PENDING"] },
            endTime: { gte: new Date() },
          },
          take: 5,
        },
      },
    });
    const t1 = performance.now();
    catalogDurations.push(t1 - t0);
  }

  // 3. User reservations query
  const userResDurations: number[] = [];
  const sampleUser = await prisma.user.findFirst();
  for (let i = 0; i < samples; i++) {
    const t0 = performance.now();
    await prisma.reservation.findMany({
      where: {
        userId: sampleUser?.id,
      },
      include: {
        resource: {
          include: { category: true },
        },
      },
      orderBy: { startTime: "desc" },
      take: 20,
    });
    const t1 = performance.now();
    userResDurations.push(t1 - t0);
  }

  return {
    datasetSize: {
      resources: resourceCount,
      reservations: reservationCount,
    },
    conflictQuery: computePercentiles(conflictDurations),
    catalogQuery: computePercentiles(catalogDurations),
    userResQuery: computePercentiles(userResDurations),
  };
}

async function runBenchmarks() {
  console.log("================================================================================");
  console.log("  PRIMEWAVE RESERVE — EMPIRICAL BENCHMARK MEASUREMENTS");
  console.log("================================================================================\n");

  console.log("1. Benchmarking Server Response Latencies (50 samples per endpoint)...");
  const homeStats = await benchmarkEndpoint("http://localhost:3000/");
  console.log("  GET / (Home / Catalog):", homeStats);

  const resStats = await benchmarkEndpoint("http://localhost:3000/reservations");
  console.log("  GET /reservations:", resStats);

  const adminStats = await benchmarkEndpoint("http://localhost:3000/admin");
  console.log("  GET /admin:", adminStats);

  console.log("\n2. Benchmarking Prisma Database Queries (100 samples per query)...");
  const prismaStats = await benchmarkPrismaQueries(100);
  console.log("  Dataset Size:", prismaStats.datasetSize);
  console.log("  Conflict Check Query (findFirst with index):", prismaStats.conflictQuery);
  console.log("  Catalog Listing Query (findMany + relations):", prismaStats.catalogQuery);
  console.log("  User Reservations Query (findMany + ordering):", prismaStats.userResQuery);

  console.log("\n================================================================================");
  console.log("  MEASUREMENT RUN COMPLETE");
  console.log("================================================================================\n");
}

runBenchmarks()
  .catch((e) => {
    console.error("Benchmark failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
