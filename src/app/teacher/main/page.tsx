"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import TeacherNav from "../TeacherNav";
import { useProgram } from "@/lib/program";

type TeacherEvent = {
  pda: string;
  name: string;
  eventId: string;
  startTime: number; // ms
  endTime: number;   // ms
  attendeeCount: number;
};

export default function TeacherMainPage() {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [events, setEvents] = useState<TeacherEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchEvents = useCallback(async () => {
    if (!program || !publicKey) return;

    setLoading(true);
    setError("");

    try {
      // Filter events by authority (offset 8 after discriminator)
      const accounts = await (program as any).account.event.all([
        {
          memcmp: {
            offset: 8,
            bytes: publicKey.toBase58(),
          },
        },
      ]);

      const mapped: TeacherEvent[] = accounts.map((acc: any) => ({
        pda: acc.publicKey.toBase58(),
        name: acc.account.name as string,
        eventId: acc.account.eventId as string,
        startTime: Number(acc.account.startTime) * 1000,
        endTime: Number(acc.account.endTime) * 1000,
        attendeeCount: Number(acc.account.attendeeCount),
      }));

      // newest first
      mapped.sort((a, b) => b.startTime - a.startTime);

      setEvents(mapped);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const content = useMemo(() => {
    if (!publicKey) {
      return (
        <div className="text-center text-gray-600">
          Connect your wallet to see your events.
        </div>
      );
    }

    if (loading) {
      return <div className="text-center text-gray-600">Loading events...</div>;
    }

    if (error) {
      return (
        <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      );
    }

    if (events.length === 0) {
      return (
        <div className="text-center space-y-4">
          <p className="text-gray-600">No events found for this wallet.</p>
          <Link
            href="/teacher/create"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create your first event
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {events.map((ev) => (
          <Link
            key={ev.pda}
            href={`/teacher/${ev.pda}`}
            className="block border rounded-lg p-4 hover:bg-gray-50"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-lg">{ev.name}</div>
                <div className="text-xs text-gray-500 font-mono break-all">
                  {ev.pda}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Start: {new Date(ev.startTime).toLocaleString()} <br />
                  End: {new Date(ev.endTime).toLocaleString()}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-600">Checked in</div>
                <div className="text-2xl font-bold">{ev.attendeeCount}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  }, [publicKey, loading, error, events]);

  return (
    <div className="min-h-screen bg-white">
      <TeacherNav />

      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">My Events</h1>

          <button
            onClick={fetchEvents}
            disabled={!publicKey || !program || loading}
            className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {content}
      </div>
    </div>
  );
}