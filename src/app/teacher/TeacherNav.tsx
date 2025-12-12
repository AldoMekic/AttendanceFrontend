"use client";

import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function TeacherNav() {
  return (
    <div className="w-full border-b bg-white">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold hover:underline">
            Attendance
          </Link>

          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/teacher/main"
              className="px-3 py-2 rounded hover:bg-gray-100"
            >
              My Events
            </Link>
            <Link
              href="/teacher/create"
              className="px-3 py-2 rounded hover:bg-gray-100"
            >
              Create Event
            </Link>
          </nav>
        </div>

        <WalletMultiButton />
      </div>
    </div>
  );
}
