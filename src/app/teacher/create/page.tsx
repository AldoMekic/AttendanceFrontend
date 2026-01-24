"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import toast from "react-hot-toast";

import { useProgram, getEventPDA } from "@/lib/program";
import { getErrorMessage } from "@/lib/errors";
import TeacherNav from "../TeacherNav";

const DURATION_PRESETS = [
  { label: "30 min", value: 30 },
  { label: "50 min", value: 50 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hrs", value: 90 },
  { label: "2 hours", value: 120 },
  { label: "3 hours", value: 180 },
];

const MAX_EVENT_NAME_LENGTH = 64;
const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 1440;

export default function CreateEventPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const program = useProgram();

  const [name, setName] = useState("");
  const [duration, setDuration] = useState(60);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);

  const customNumber = Number(custom);
  const effectiveDuration = custom && !isNaN(customNumber) ? customNumber : duration;

  const handleCreate = async () => {
    if (!program || !publicKey) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Enter event name");
      return;
    }
    if (trimmedName.length > MAX_EVENT_NAME_LENGTH) {
      toast.error(`Name too long (max ${MAX_EVENT_NAME_LENGTH})`);
      return;
    }
    if (effectiveDuration < MIN_DURATION_MINUTES || effectiveDuration > MAX_DURATION_MINUTES) {
      toast.error(`Duration must be ${MIN_DURATION_MINUTES}-${MAX_DURATION_MINUTES} min`);
      return;
    }

    setLoading(true);
    try {
      const eventId = `evt-${Date.now().toString(36)}`;

      await program.methods
        .createEvent(eventId, trimmedName, effectiveDuration)
        .accounts({ authority: publicKey })
        .rpc();

      toast.success("Event created!");
      router.push(`/teacher/${getEventPDA(publicKey, eventId).toString()}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <TeacherNav />

      <div className="max-w-lg mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Create Event</h1>

        <div className="flex justify-center mb-6">
          <WalletMultiButton />
        </div>

        {publicKey ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Event Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={MAX_EVENT_NAME_LENGTH}
                placeholder="e.g., CS 101 Lecture"
                className="w-full p-3 border rounded-lg"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {name.length}/{MAX_EVENT_NAME_LENGTH}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Duration</label>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      setDuration(preset.value);
                      setCustom("");
                    }}
                    className={`p-3 rounded-lg border text-sm font-medium ${
                      duration === preset.value && !custom
                        ? "bg-blue-600 text-white border-blue-600"
                        : "hover:bg-blue-50"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">or custom:</span>
                <input
                  type="number"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  min={MIN_DURATION_MINUTES}
                  max={MAX_DURATION_MINUTES}
                  className="w-20 p-2 border rounded-lg text-center"
                />
                <span className="text-sm text-gray-500">min</span>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              className="w-full p-4 bg-blue-600 text-white rounded-lg font-medium disabled:bg-gray-300 hover:bg-blue-700"
            >
              {loading ? "Creating..." : "Create Event"}
            </button>

            <p className="text-xs text-gray-400 text-center">~0.002 SOL for account rent</p>
          </div>
        ) : (
          <p className="text-center text-gray-500">Connect wallet to create event</p>
        )}
      </div>
    </div>
  );
}