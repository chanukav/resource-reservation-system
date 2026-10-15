import { LoadingAnimation } from "@/components/loading-animation";

export default function AdminLoading() {
  return (
    <div className="flex h-full min-h-[500px] w-full items-center justify-center">
      <LoadingAnimation
        message="Synchronizing Admin Management Hub"
        subMessage="Querying pending approval queues, facility records, and audit logs..."
      />
    </div>
  );
}
