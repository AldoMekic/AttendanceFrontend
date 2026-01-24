// src/app/student/page.tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import StudentPageClient from "./StudentPageClient";

export default function StudentPage() {
  const searchParams = useSearchParams();
  const eventParam = searchParams.get("event");
  const classParam = searchParams.get("class");
  const sessionParam = searchParams.get("session");

  // If the student arrived via QR (event or class session), show check-in UI.
  const isCheckInFlow = Boolean(eventParam || (classParam && sessionParam));

  if (isCheckInFlow) {
    return <StudentPageClient />;
  }

  // Otherwise, show Student "home" with navigation options.
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-md text-center space-y-6">
        <h1 className="text-2xl font-bold">Student</h1>

        <p className="text-gray-600">
          To check in, scan a QR code from your teacher. You can also view your attendance history.
        </p>

        <div className="space-y-3">
          <Link
            href="/student/history"
            className="block w-full p-4 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700"
          >
            View My Attendance History
          </Link>

          <div className="border rounded-lg p-4 text-left bg-gray-50">
            <p className="font-medium mb-1">Check-in</p>
            <p className="text-sm text-gray-600">
              Scan a QR code to open a link like:
            </p>
            <p className="text-xs font-mono mt-2 text-gray-700 break-all">
              /student?event=... <br />
              /student?class=...&amp;session=...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
