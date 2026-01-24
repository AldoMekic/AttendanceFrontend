"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import QRCode from "qrcode";
import toast from "react-hot-toast";

import { useProgram } from "@/lib/program";
import TeacherNav from "../TeacherNav";

const POLL_INTERVAL_MS = 5000;
const GRACE_PERIOD_MS = 5 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

interface AttendeeInfo {
  wallet: string;
  firstName: string;
  lastName: string;
  timestamp: number;
}

type SortField = "name" | "time";
type TimeStatus = "active" | "grace" | "ended";

function TimeRemainingBadge({ label, status }: { label: string; status: TimeStatus }) {
  const styles: Record<TimeStatus, string> = {
    active: "bg-green-100 text-green-700",
    grace: "bg-yellow-100 text-yellow-700",
    ended: "bg-gray-100 text-gray-600",
  };

  return (
    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
      {label}
    </span>
  );
}

export default function EventDetailPage() {
  const { eventPda } = useParams();
  const program = useProgram();

  const [qrUrl, setQrUrl] = useState("");
  const [checkInUrl, setCheckInUrl] = useState("");
  const [eventName, setEventName] = useState("");
  const [endTime, setEndTime] = useState(0);

  const [attendees, setAttendees] = useState<AttendeeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [fullscreen, setFullscreen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("time");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!eventPda || typeof window === "undefined") return;
    const url = `${window.location.origin}/student?event=${eventPda}`;
    setCheckInUrl(url);
    QRCode.toDataURL(url, { width: 300, margin: 2 }).then(setQrUrl);
  }, [eventPda]);

  useEffect(() => {
    if (!program || !eventPda) return;
    (async () => {
      try {
        const acc = await (program as any).account.event.fetch(new PublicKey(eventPda as string));
        setEventName(acc.name);
        setEndTime(Number(acc.endTime) * 1000);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [program, eventPda]);

  const fetchAttendees = useCallback(async () => {
    if (!program || !eventPda) return;
    try {
      const pk = new PublicKey(eventPda as string);
      const accs = await (program as any).account.attendance.all([
        { dataSize: 153 },
        { memcmp: { offset: 8, bytes: pk.toBase58() } },
      ]);

      setAttendees(
        accs.map((a: any) => ({
          wallet: a.account.attendee.toString(),
          firstName: a.account.firstName ?? "",
          lastName: a.account.lastName ?? "",
          timestamp: a.account.timestamp.toNumber() * 1000,
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [program, eventPda]);

  useEffect(() => {
    fetchAttendees();
    const intervalId = setInterval(fetchAttendees, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchAttendees]);

  const sorted = [...attendees].sort((a, b) => {
    const cmp =
      sortField === "name"
        ? `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)
        : a.timestamp - b.timestamp;
    return sortAsc ? cmp : -cmp;
  });

  const getTimeRemaining = (): { label: string; status: TimeStatus } => {
    const now = Date.now();
    const diff = endTime - now;

    if (diff <= 0) {
      const inGracePeriod = now < endTime + GRACE_PERIOD_MS;
      return inGracePeriod ? { label: "Grace period", status: "grace" } : { label: "Ended", status: "ended" };
    }

    const minutes = Math.floor(diff / ONE_MINUTE_MS);
    const label =
      minutes < 60 ? `${minutes} min left` : `${Math.floor(minutes / 60)}h ${minutes % 60}m left`;
    return { label, status: "active" };
  };

  const handleExportCSV = () => {
    if (sorted.length === 0) {
      toast.error("No attendees to export");
      return;
    }

    const headers = ["First Name", "Last Name", "Wallet", "Time"];
    const rows = sorted.map((attendee) => [
      attendee.firstName,
      attendee.lastName,
      attendee.wallet,
      new Date(attendee.timestamp).toLocaleString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll(`"`, `""`)}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${eventName || "attendance"}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Exported successfully");
  };

  return (
    <div className="min-h-screen bg-white">
      <TeacherNav />

      {fullscreen && (
        <div
          className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center cursor-pointer"
          onClick={() => setFullscreen(false)}
        >
          <h2 className="text-3xl font-bold mb-8">{eventName}</h2>
          {qrUrl && <img src={qrUrl} alt="QR" className="w-[80vmin] max-w-[500px]" />}
          <p className="text-gray-400 mt-8">Tap to exit</p>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{eventName || "Loading..."}</h1>
          <TimeRemainingBadge {...getTimeRemaining()} />
        </div>

        <div className="bg-gray-50 rounded-xl p-6 mb-6 flex flex-col md:flex-row items-center gap-6">
          {qrUrl ? (
            <img
              src={qrUrl}
              alt="QR"
              className="border-4 border-white rounded-lg shadow-lg cursor-pointer"
              onClick={() => setFullscreen(true)}
            />
          ) : (
            <div className="w-[300px] h-[300px] bg-gray-200 rounded-lg animate-pulse" />
          )}

          <div className="text-center md:text-left">
            <p className="text-gray-600 mb-4">Students scan to check in</p>
            <div className="flex flex-col md:flex-row gap-2">
              <button
                onClick={() => setFullscreen(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Fullscreen
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(checkInUrl);
                  toast.success("Copied");
                }}
                className="px-6 py-3 border rounded-lg hover:bg-gray-50"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="font-semibold">Checked In ({attendees.length})</h2>

              <div className="flex gap-1 text-sm">
                <button
                  onClick={() => {
                    setSortField("name");
                    setSortAsc(sortField === "name" ? !sortAsc : true);
                  }}
                  className={`px-2 py-1 rounded ${sortField === "name" ? "bg-blue-100 text-blue-700" : ""}`}
                >
                  Name
                </button>
                <button
                  onClick={() => {
                    setSortField("time");
                    setSortAsc(sortField === "time" ? !sortAsc : false);
                  }}
                  className={`px-2 py-1 rounded ${sortField === "time" ? "bg-blue-100 text-blue-700" : ""}`}
                >
                  Time
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={fetchAttendees} className="text-sm text-blue-600 hover:underline">
                Refresh
              </button>
              <button
                onClick={handleExportCSV}
                className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="divide-y max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : sorted.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No check-ins yet</div>
            ) : (
              sorted.map((a) => (
                <div key={a.wallet} className="px-4 py-3 flex justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-medium">
                      {a.firstName} {a.lastName}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      {a.wallet.slice(0, 4)}...{a.wallet.slice(-4)}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}