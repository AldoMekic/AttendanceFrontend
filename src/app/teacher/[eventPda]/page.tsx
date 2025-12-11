"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import QRCode from "qrcode";
import { useProgram, PROGRAM_ID } from "@/lib/program";

interface AttendeeInfo {
  wallet: string;
  timestamp: number;
}

export default function EventPage() {
  const { eventPda } = useParams();
  const { connection } = useConnection();
  const program = useProgram();

  const [qrUrl, setQrUrl] = useState("");
  const [eventName, setEventName] = useState("");
  const [attendees, setAttendees] = useState<AttendeeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate QR code
  useEffect(() => {
    if (!eventPda) return;

    const checkInUrl = `${window.location.origin}/student?event=${eventPda}`;
    QRCode.toDataURL(checkInUrl, { width: 300, margin: 2 }).then(setQrUrl);
  }, [eventPda]);

  // Fetch event details
  useEffect(() => {
    if (!program || !eventPda) return;

    const fetchEvent = async () => {
      try {
        const eventAccount = await (program as any).account.event.fetch(
  new PublicKey(eventPda as string)
);
        setEventName(eventAccount.name);
      } catch (e) {
        console.error("Failed to fetch event:", e);
      }
    };

    fetchEvent();
  }, [program, eventPda]);

  // Fetch attendees
  const fetchAttendees = useCallback(async () => {
    if (!program || !eventPda) return;

    try {
      const eventPubkey = new PublicKey(eventPda as string);

      // Fetch all attendance accounts filtered by this event
      const accounts = await (program as any).account.attendance.all([
  {
    memcmp: {
      offset: 8, // After discriminator
      bytes: eventPubkey.toBase58(),
    },
  },
]);

      const attendeeList: AttendeeInfo[] = accounts.map((acc: { account: { attendee: { toString: () => any; }; timestamp: { toNumber: () => number; }; }; }) => ({
        wallet: acc.account.attendee.toString(),
        timestamp: acc.account.timestamp.toNumber() * 1000,
      }));

      // Sort by timestamp (most recent first)
      attendeeList.sort((a, b) => b.timestamp - a.timestamp);

      setAttendees(attendeeList);
    } catch (e) {
      console.error("Failed to fetch attendees:", e);
    } finally {
      setLoading(false);
    }
  }, [program, eventPda]);

  // Poll for new attendees
  useEffect(() => {
    fetchAttendees();
    const interval = setInterval(fetchAttendees, 5000);
    return () => clearInterval(interval);
  }, [fetchAttendees]);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">
            {eventName || "Loading..."}
          </h1>
          <p className="text-gray-600">Scan to check in</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-8">
          {qrUrl ? (
            <img
              src={qrUrl}
              alt="Check-in QR Code"
              className="border-4 border-gray-200 rounded-lg"
            />
          ) : (
            <div className="w-[300px] h-[300px] bg-gray-100 rounded-lg animate-pulse" />
          )}
        </div>

        {/* Manual URL */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-500 mb-2">Or share this link:</p>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">
            {typeof window !== "undefined" &&
              `${window.location.origin}/student?event=${eventPda}`}
          </code>
        </div>

        {/* Attendee List */}
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Checked In ({attendees.length})</h2>
            <button
              onClick={fetchAttendees}
              className="text-sm text-blue-600 hover:underline"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500 text-center py-4">Loading...</p>
          ) : attendees.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No one has checked in yet
            </p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {attendees.map((a, i) => (
                <li
                  key={a.wallet}
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <span className="font-mono text-sm">
                    {a.wallet.slice(0, 4)}...{a.wallet.slice(-4)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(a.timestamp).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}