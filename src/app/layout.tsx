import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrimeWave Reserve | Enterprise Resource Management",
  description:
    "Centralized resource reservation and scheduling management platform built for PrimeWave Lab.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let currentUser = null;
  let pendingCount = 0;

  try {
    currentUser = await getCurrentUser();
    if (currentUser?.role === "ADMIN") {
      pendingCount = await prisma.reservation.count({
        where: { status: "PENDING" },
      });
    }
  } catch (error) {
    console.error("Layout initialization error:", error);
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden bg-[#f0f3f8] dark:bg-[#0c1017] text-foreground font-sans">
        <DashboardShell currentUser={currentUser} pendingCount={pendingCount}>
          {children}
        </DashboardShell>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
