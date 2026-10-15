import { LoadingAnimation } from "@/components/loading-animation";

export default function Loading() {
  return (
    <div className="flex h-full min-h-[500px] w-full items-center justify-center">
      <LoadingAnimation
        message="Loading PrimeWave Operations"
        subMessage="Preparing real-time inventory, reservations, and dispatch controls..."
      />
    </div>
  );
}
