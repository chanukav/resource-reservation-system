"use client";

import { useEffect, useRef, useState } from "react";
import type { AnimationItem } from "lottie-web";

interface LottiePlayerProps {
  animationData?: any;
  src?: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  speed?: number;
}

export function LottiePlayer({
  animationData,
  src,
  loop = true,
  autoplay = true,
  className = "",
  speed = 1,
}: LottiePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [data, setData] = useState<any>(animationData);

  // If a src URL is provided, fetch the Lottie JSON
  useEffect(() => {
    if (src && !animationData) {
      let isMounted = true;
      fetch(src)
        .then((res) => res.json())
        .then((json) => {
          if (isMounted) setData(json);
        })
        .catch((err) => {
          console.warn("Failed to load Lottie JSON from:", src, err);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [src, animationData]);

  // Load Lottie animation using lottie-web
  useEffect(() => {
    let anim: AnimationItem | null = null;
    let isCancelled = false;

    if (!containerRef.current || !data) return;

    import("lottie-web").then((lottieModule) => {
      if (isCancelled || !containerRef.current) return;
      const lottie = lottieModule.default || lottieModule;

      // Clean up previous instance if any
      if (animRef.current) {
        animRef.current.destroy();
      }

      anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop,
        autoplay,
        animationData: data,
      });

      anim.setSpeed(speed);
      animRef.current = anim;
    });

    return () => {
      isCancelled = true;
      if (anim) {
        anim.destroy();
      }
    };
  }, [data, loop, autoplay, speed]);

  return <div ref={containerRef} className={className} />;
}
