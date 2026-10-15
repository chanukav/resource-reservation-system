import { LoadingAnimation } from "@/components/loading-animation";

export default function ReservationsLoading() {
  return (
    <div className="flex h-full min-h-[500px] w-full items-center justify-center">
      <LoadingAnimation
        message="Loading Personal Reservation Ledger"
        subMessage="Retrieving scheduled bookings, approvals, and dispatch calendar..."
      />
    </div>
  );
}
