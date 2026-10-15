"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Zap, Building2, Clock, Sparkles } from "lucide-react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  baseAlpha: number;
}

export function AnimatedAuthBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseLeave = () => {
      setMousePos(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Particle Palette adhering to Emerald theme tokens
    const colors = [
      "rgba(16, 185, 129,", // Emerald-500
      "rgba(5, 150, 105,",  // Emerald-600
      "rgba(20, 184, 166,", // Teal-500
      "rgba(52, 211, 153,", // Emerald-400
      "rgba(99, 102, 241,", // Indigo-500 (rare accent)
    ];

    let particles: Particle[] = [];
    const particleCount = Math.min(Math.floor((width * height) / 22000), 55);

    function initParticles() {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        const baseAlpha = 0.2 + Math.random() * 0.45;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          size: 1.5 + Math.random() * 2.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: baseAlpha,
          baseAlpha,
        });
      }
    }

    initParticles();

    // Render loop
    let lastTime = performance.now();
    let isTabVisible = !document.hidden;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const render = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(render);
      if (!isTabVisible) return;

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      ctx.clearRect(0, 0, width, height);

      // Update and draw particles
      const maxDistance = 140;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Motion update
        p.x += p.vx * 60 * delta;
        p.y += p.vy * 60 * delta;

        // Wrap around screen boundaries with cushion
        if (p.x < -10) p.x = width + 10;
        else if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        else if (p.y > height + 10) p.y = -10;

        // Interactive mouse connection
        if (mousePos) {
          const dx = mousePos.x - p.x;
          const dy = mousePos.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const proximityFactor = 1 - dist / 180;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(16, 185, 129, ${proximityFactor * 0.35})`;
            ctx.lineWidth = 1;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mousePos.x, mousePos.y);
            ctx.stroke();

            // Slight gentle gravitational pull towards mouse
            p.x += dx * 0.005 * proximityFactor;
            p.y += dy * 0.005 * proximityFactor;
          }
        }

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const opacity = (1 - dist / maxDistance) * 0.22;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(16, 185, 129, ${opacity})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.shadowColor = "rgba(16, 185, 129, 0.4)";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [mousePos]);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden select-none -z-10">
      {/* 1. Large Ambient Radiant Aurora Glow Orbs */}
      <div
        className="absolute -top-32 -left-32 h-[580px] w-[580px] rounded-full bg-gradient-to-tr from-emerald-500/20 via-teal-400/15 to-transparent blur-3xl"
        style={{
          animation: "aurora-orbit 24s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute top-1/4 -right-32 h-[520px] w-[520px] rounded-full bg-gradient-to-bl from-teal-400/20 via-emerald-600/15 to-transparent blur-3xl"
        style={{
          animation: "aurora-orbit 28s ease-in-out infinite alternate-reverse",
        }}
      />
      <div
        className="absolute -bottom-40 left-1/3 h-[600px] w-[600px] rounded-full bg-gradient-to-t from-emerald-400/15 via-cyan-500/10 to-transparent blur-3xl"
        style={{
          animation: "pulse-glow 16s ease-in-out infinite",
        }}
      />

      {/* 2. Micro Dot Matrix Pattern with Radial Edge Fade */}
      <div
        className="absolute inset-0 opacity-[0.45] dark:opacity-[0.25]"
        style={{
          backgroundImage: `radial-gradient(circle, #10b981 0.75px, transparent 0.75px)`,
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, #000 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, #000 30%, transparent 100%)",
        }}
      />

      {/* 3. Subtle Animated Concentric Radar Rings in Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[980px] h-[980px] rounded-full border border-emerald-500/10 pointer-events-none animate-pulse-glow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1300px] h-[1300px] rounded-full border border-teal-500/5 pointer-events-none" />

      {/* 4. Canvas Floating Interactive Particle Constellation */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full pointer-events-auto"
      />

      {/* 5. Floating Enterprise Trust Badges on Screen Edges (Desktop Only) */}
      <div className="hidden 2xl:block">
        {/* Top-Left Floating Badge */}
        <div
          className="absolute top-16 left-16 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/70 dark:bg-card/70 border border-emerald-500/20 shadow-lg shadow-emerald-950/5 backdrop-blur-md"
          style={{ animation: "float-slow 8s ease-in-out infinite" }}
        >
          <div className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-foreground">Zero Double-Booking</p>
            <p className="text-[9px] text-muted-foreground font-medium">PostgreSQL Exclusion Guard</p>
          </div>
        </div>

        {/* Top-Right Floating Badge */}
        <div
          className="absolute top-20 right-20 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/70 dark:bg-card/70 border border-teal-500/20 shadow-lg shadow-emerald-950/5 backdrop-blur-md"
          style={{ animation: "float-reverse 9s ease-in-out infinite" }}
        >
          <div className="h-6 w-6 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
            <Zap className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-foreground">Real-Time Dispatch</p>
            <p className="text-[9px] text-muted-foreground font-medium">Instant State Transition</p>
          </div>
        </div>

        {/* Bottom-Left Floating Badge */}
        <div
          className="absolute bottom-16 left-20 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/70 dark:bg-card/70 border border-emerald-500/20 shadow-lg shadow-emerald-950/5 backdrop-blur-md"
          style={{ animation: "float-reverse 10s ease-in-out infinite" }}
        >
          <div className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-foreground">PrimeWave Hubs</p>
            <p className="text-[9px] text-muted-foreground font-medium">Rooms, Workstations & Gear</p>
          </div>
        </div>

        {/* Bottom-Right Floating Badge */}
        <div
          className="absolute bottom-20 right-24 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/70 dark:bg-card/70 border border-emerald-500/20 shadow-lg shadow-emerald-950/5 backdrop-blur-md"
          style={{ animation: "float-slow 7s ease-in-out infinite" }}
        >
          <div className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Clock className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-foreground">Asia/Colombo Clock</p>
            <p className="text-[9px] text-muted-foreground font-medium">UTC+05:30 Synchronized</p>
          </div>
        </div>
      </div>
    </div>
  );
}
