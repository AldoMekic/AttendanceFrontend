"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import TeacherNav from "../TeacherNav";
import { useProgram } from "@/lib/program";

type TeacherClass = {
  pda: string;
  name: string;
  classId: string;
  currentSession: number;
  isActive: boolean;
  sessionStart: number;
  sessionEnd: number;
};

export default function TeacherClassesPage() {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchClasses = useCallback(async () => {
    if (!program || !publicKey) return;

    setLoading(true);
    setError("");

    try {
      const accounts = await (program as any).account.class.all([
        {
          memcmp: { offset: 8, bytes: publicKey.toBase58() },
        },
      ]);

      const mapped: TeacherClass[] = accounts.map((acc: any) => ({
        pda: acc.publicKey.toBase58(),
        name: acc.account.name as string,
        classId: acc.account.classId as string,
        currentSession: Number(acc.account.currentSession),
        isActive: Boolean(acc.account.isActive),
        sessionStart: Number(acc.account.sessionStart) * 1000,
        sessionEnd: Number(acc.account.sessionEnd) * 1000,
      }));

      mapped.sort((a, b) => b.sessionStart - a.sessionStart);

      setClasses(mapped);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load classes");
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const content = useMemo(() => {
    if (!publicKey) {
      return (
        <div className="text-center text-gray-600">
          Connect your wallet to see your classes.
        </div>
      );
    }

    if (loading) return <div className="text-center text-gray-600">Loading...</div>;

    if (error) {
      return (
        <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>
      );
    }

    if (classes.length === 0) {
      return (
        <div className="text-center space-y-4">
          <p className="text-gray-600">No classes found for this wallet.</p>
          <Link
            href="/teacher/classes/create"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create your first class
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {classes.map((c) => (
          <Link
            key={c.pda}
            href={`/teacher/classes/${c.pda}`}
            className="block border rounded-lg p-4 hover:bg-gray-50"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-lg">{c.name}</div>
                <div className="text-xs text-gray-500">
                  Class ID: <span className="font-mono">{c.classId}</span>
                </div>
                <div className="text-xs text-gray-500 font-mono break-all mt-1">
                  {c.pda}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-600">Session</div>
                <div className="text-2xl font-bold">{c.currentSession}</div>
                <div className={`text-xs mt-1 ${c.isActive ? "text-green-700" : "text-gray-500"}`}>
                  {c.isActive ? "ACTIVE" : "INACTIVE"}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  }, [publicKey, loading, error, classes]);

  return (
    <div className="min-h-screen bg-white">
      <TeacherNav />

      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">My Classes</h1>

          <div className="flex gap-2">
            <Link
              href="/teacher/classes/create"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Class
            </Link>
            <button
              onClick={fetchClasses}
              disabled={!publicKey || !program || loading}
              className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {content}
      </div>
    </div>
  );
}