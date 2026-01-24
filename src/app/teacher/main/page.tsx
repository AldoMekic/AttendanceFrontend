"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import toast from "react-hot-toast";

import TeacherNav from "../TeacherNav";
import { useProgram } from "@/lib/program";

const GRACE_PERIOD_MS = 5 * 60 * 1000;
const STATUS_REFRESH_INTERVAL_MS = 30 * 1000;

type EventStatus = "active" | "grace" | "ended";

interface EventItem {
  pda: string;
  name: string;
  startTime: number;
  endTime: number;
  attendeeCount: number;
  status: EventStatus;
}

const STATUS_PRIORITY: Record<EventStatus, number> = {
  active: 0,
  grace: 1,
  ended: 2,
};

function getEventStatus(endTime: number): EventStatus {
  const now = Date.now();
  if (now < endTime) return "active";
  if (now < endTime + GRACE_PERIOD_MS) return "grace";
  return "ended";
}

function EventStatusBadge({ status }: { status: EventStatus }) {
  const styles: Record<EventStatus, string> = {
    active: "bg-green-100 text-green-700",
    grace: "bg-yellow-100 text-yellow-700",
    ended: "bg-gray-100 text-gray-500",
  };
  const labels: Record<EventStatus, string> = {
    active: "Active",
    grace: "Grace",
    ended: "Ended",
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function TeacherMainPage() {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!program || !publicKey) return;

    setLoading(true);
    try {
      const accounts = await (program as any).account.event.all([
        { memcmp: { offset: 8, bytes: publicKey.toBase58() } },
      ]);

      const eventItems: EventItem[] = accounts.map((acc: any) => {
        const endTime = Number(acc.account.endTime) * 1000;
        return {
          pda: acc.publicKey.toBase58(),
          name: acc.account.name,
          startTime: Number(acc.account.startTime) * 1000,
          endTime,
          attendeeCount: Number(acc.account.attendeeCount),
          status: getEventStatus(endTime),
        };
      });

      eventItems.sort((a, b) => {
        if (a.status !== b.status) return STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
        return b.startTime - a.startTime;
      });

      setEvents(eventItems);
    } catch (err) {
      console.error("Failed to load events:", err);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setEvents((current) =>
        current.map((event) => ({ ...event, status: getEventStatus(event.endTime) }))
      );
    }, STATUS_REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <TeacherNav />

      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Events</h1>

          <div className="flex gap-3">
            <button
              onClick={fetchEvents}
              disabled={!publicKey || loading}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>

            <Link href="/teacher/create" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              + New
            </Link>
          </div>
        </div>

        {!publicKey ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Connect wallet</p>
            <WalletMultiButton />
          </div>
        ) : loading && events.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No events</p>
            <Link href="/teacher/create" className="px-6 py-3 bg-blue-600 text-white rounded-lg">
              Create first event
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Link
                key={event.pda}
                href={`/teacher/${event.pda}`}
                className="block border rounded-xl p-4 hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{event.name}</h3>
                      <EventStatusBadge status={event.status} />
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(event.startTime).toLocaleDateString()} at{" "}
                      {new Date(event.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">{event.attendeeCount}</p>
                    <p className="text-xs text-gray-400">checked in</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}