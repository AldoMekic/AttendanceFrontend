"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={[
        "px-3 py-2 rounded text-sm",
        active ? "bg-gray-200 font-medium" : "hover:bg-gray-100",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function TeacherNav() {
  return (
    <div className="w-full border-b bg-white">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold hover:underline">
            Attendance
          </Link>

          <nav className="flex items-center gap-2">
            <NavLink href="/teacher/main" label="My Events" />
            <NavLink href="/teacher/create" label="Create Event" />

            <NavLink href="/teacher/classes" label="My Classes" />
            <NavLink href="/teacher/classes/create" label="Create Class" />
          </nav>
        </div>

        <WalletMultiButton />
      </div>
    </div>
  );
}
