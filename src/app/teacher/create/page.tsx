"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useProgram, getEventPDA } from "@/lib/program";
import TeacherNav from "../TeacherNav";

export default function CreateEvent() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const program = useProgram();

  const [name, setName] = useState("");
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!program || !publicKey) return;

    // Validate inputs
    if (name.length > 64) {
      setError("Event name must be 64 characters or less");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Generate unique event ID
      const eventId = `evt-${Date.now().toString(36)}`;

      await program.methods
        .createEvent(eventId, name, duration)
        .accounts({ authority: publicKey })
        .rpc();

      const eventPDA = getEventPDA(publicKey, eventId);
      router.push(`/teacher/${eventPDA.toString()}`);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen bg-white">
    <TeacherNav />

    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Create Event</h1>

      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <WalletMultiButton />
        </div>

        {publicKey && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Event Name
              </label>
              <input
                type="text"
                placeholder="e.g., CS 101 Lecture"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={64}
                className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">{name.length}/64</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full p-3 border rounded"
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              className="w-full p-3 bg-blue-600 text-white rounded font-medium disabled:bg-gray-400 hover:bg-blue-700"
            >
              {loading ? "Creating..." : "Create Event"}
            </button>

            <p className="text-xs text-gray-500 text-center">
              This will cost ~0.002 SOL for account rent
            </p>
          </div>
        )}

        {!publicKey && (
          <p className="text-center text-gray-600">
            Connect your wallet to create an event.
          </p>
        )}
      </div>
    </div>
  </div>
);
}