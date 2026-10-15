export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAssetCode } from "@/lib/resource-utils";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    const now = new Date();

    // Fetch resources with their category and active/future reservations
    const resources = await prisma.resource.findMany({
      include: {
        category: {
          select: { id: true, name: true },
        },
        reservations: {
          where: {
            status: { in: ["APPROVED", "PENDING"] },
            endTime: { gte: now },
          },
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            status: true,
          },
          orderBy: { startTime: "asc" },
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });

    const filtered = resources
      .map((r) => {
        const assetCode = getAssetCode(r.category.name, r.id);
        const isOperational = r.status === "AVAILABLE";
        const currentActiveBooking = r.reservations.find(
          (res) =>
            (res.status === "APPROVED" || res.status === "PENDING") &&
            res.startTime <= now &&
            res.endTime > now
        );
        const isOccupiedNow = Boolean(currentActiveBooking);

        return {
          id: r.id,
          name: r.name,
          description: r.description,
          location: r.location,
          capacity: r.capacity,
          status: r.status,
          requiresApproval: r.requiresApproval,
          categoryId: r.categoryId,
          categoryName: r.category.name,
          assetCode,
          isOperational,
          isOccupiedNow,
          bookedUntil: currentActiveBooking ? currentActiveBooking.endTime.toISOString() : null,
        };
      })
      .filter((r) => {
        if (!q) return true;
        return (
          r.name.toLowerCase().includes(q) ||
          (r.location && r.location.toLowerCase().includes(q)) ||
          (r.description && r.description.toLowerCase().includes(q)) ||
          r.categoryName.toLowerCase().includes(q) ||
          r.assetCode.toLowerCase().includes(q)
        );
      })
      .slice(0, 8); // Top 8 matches for quick dropdown

    return NextResponse.json({ results: filtered });
  } catch (error) {
    console.error("Resource search error:", error);
    return NextResponse.json({ error: "Failed to search resources" }, { status: 500 });
  }
}
