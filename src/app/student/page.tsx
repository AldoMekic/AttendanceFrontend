import { Suspense } from "react";
import StudentPageClient from "./StudentPageClient";

export default function StudentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <p className="text-gray-600">Loading student page...</p>
        </div>
      }
    >
      <StudentPageClient />
    </Suspense>
  );
}