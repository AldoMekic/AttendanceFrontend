"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";

import { useProgram } from "@/lib/program";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface AttendanceRecord {
  pda: string;
  name: string;
  timestamp: number;
  type: "event" | "class";
  session?: number;
}

function calculateStreak(timestamps: number[]): number {
  if (timestamps.length === 0) return 0;

  const uniqueDates = [...new Set(
    timestamps.map((ts) => {
      const date = new Date(ts);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
  )].sort((a, b) => b - a);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysSinceLast = (today.getTime() - uniqueDates[0]) / ONE_DAY_MS;
  if (daysSinceLast > 1) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const daysBetween = (uniqueDates[i - 1] - uniqueDates[i]) / ONE_DAY_MS;
    if (daysBetween === 1) streak++;
    else break;
  }

  return streak;
}

export default function StudentHistoryPage() {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  const fetchHistory = useCallback(async () => {
    if (!program || !publicKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const allRecords: AttendanceRecord[] = [];

      // Event attendance (Attendance account)
      try {
        const eventAttendance = await (program as any).account.attendance.all([
          { memcmp: { offset: 40, bytes: publicKey.toBase58() } },
        ]);

        for (const acc of eventAttendance) {
          try {
            const eventPda = acc.account.event as PublicKey;
            const eventData = await (program as any).account.event.fetch(eventPda);
            allRecords.push({
              pda: eventPda.toBase58(),
              name: eventData.name as string,
              timestamp: Number(acc.account.timestamp) * 1000,
              type: "event",
            });
          } catch {}
        }
      } catch (e) {
        console.warn("Event attendance fetch failed:", e);
      }

      // Class attendance (ClassAttendance account)
      try {
        const classAttendance = await (program as any).account.classAttendance.all([
          { memcmp: { offset: 40, bytes: publicKey.toBase58() } },
        ]);

        for (const acc of classAttendance) {
          try {
            const classPda = acc.account.class as PublicKey;
            const classData = await (program as any).account.class.fetch(classPda);
            allRecords.push({
              pda: classPda.toBase58(),
              name: classData.name as string,
              timestamp: Number(acc.account.timestamp) * 1000,
              type: "class",
              session: Number(acc.account.session),
            });
          } catch {}
        }
      } catch (e) {
        console.warn("Class attendance fetch failed:", e);
      }

      allRecords.sort((a, b) => b.timestamp - a.timestamp);
      setRecords(allRecords);
      setStreak(calculateStreak(allRecords.map((r) => r.timestamp)));
    } catch (e) {
      console.error("History fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Attendance</h1>
          <Link href="/student" className="text-blue-600 hover:underline text-sm">
            Check In
          </Link>
        </div>

        {!publicKey ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Connect wallet to view history</p>
            <WalletMultiButton />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{records.length}</p>
                <p className="text-sm text-gray-600">Total Check-ins</p>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-yellow-600">{streak}</p>
                <p className="text-sm text-gray-600">Day Streak</p>
              </div>
            </div>

            <div className="border rounded-lg">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h2 className="font-semibold">History</h2>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : records.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No records yet</div>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {records.map((r, i) => (
                    <div key={`${r.pda}-${i}`} className="px-4 py-3 flex justify-between">
                      <div>
                        <p className="font-medium">
                          {r.name}
                          {r.session !== undefined && (
                            <span className="text-gray-500"> (Session {r.session})</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(r.timestamp).toLocaleDateString()} at{" "}
                          {new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>

                      <span
                        className={`px-2 py-1 h-fit rounded text-xs ${
                          r.type === "event" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {r.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}