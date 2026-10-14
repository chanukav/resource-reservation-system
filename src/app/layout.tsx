import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
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
  title: "PrimeWave Reserve | Resource Reservation Management System",
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
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Navbar currentUser={currentUser} pendingCount={pendingCount} />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
          <div className="container mx-auto px-4">
            PrimeWave Lab (Pvt) Ltd • Resource Reservation Management System • Technical Assessment
          </div>
        </footer>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
