"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { useProgram } from "@/lib/program";

type Status = "idle" | "loading" | "success" | "error";

export default function StudentCheckIn() {
  const searchParams = useSearchParams();
  const eventParam = searchParams.get("event");

  const { publicKey } = useWallet();
  const program = useProgram();

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const handleCheckIn = async () => {
    if (!program || !publicKey || !eventParam) return;

    setStatus("loading");
    setError("");

    try {
      const eventPDA = new PublicKey(eventParam);

      await program.methods
        .checkIn()
        .accounts({
          attendee: publicKey,
          event: eventPDA,
        })
        .rpc();

      setStatus("success");
    } catch (e: any) {
      console.error(e);
      setStatus("error");

      // Parse common errors
      const msg = e.message || "";
      if (msg.includes("already in use") || msg.includes("0x0")) {
        setError("You've already checked in to this event!");
      } else if (msg.includes("EventEnded")) {
        setError("This event has ended.");
      } else if (msg.includes("insufficient")) {
        setError("Insufficient SOL. You need ~0.002 SOL for the check-in fee.");
      } else {
        setError("Check-in failed. Please try again.");
      }
    }
  };

  // No event parameter
  if (!eventParam) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Student Check-In</h1>
          <p className="text-gray-600">
            Scan a QR code from your teacher to check in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <h1 className="text-2xl font-bold">Student Check-In</h1>

        <div className="flex justify-center">
          <WalletMultiButton />
        </div>

        {/* Idle - Ready to check in */}
        {publicKey && status === "idle" && (
          <div className="space-y-4">
            <button
              onClick={handleCheckIn}
              className="w-full p-4 bg-green-600 text-white rounded-lg text-lg font-medium hover:bg-green-700"
            >
              Check In Now
            </button>
            <p className="text-xs text-gray-500">
              This will cost ~0.0015 SOL for the attendance record
            </p>
          </div>
        )}

        {/* Loading */}
        {status === "loading" && (
          <div className="p-8 bg-gray-50 rounded-lg">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Recording your attendance...</p>
          </div>
        )}

        {/* Success */}
        {status === "success" && (
          <div className="p-8 bg-green-50 rounded-lg">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-xl font-medium text-green-800">
              You're checked in!
            </p>
            <p className="text-sm text-green-600 mt-2">
              Your attendance has been recorded on-chain.
            </p>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="p-8 bg-red-50 rounded-lg">
            <div className="text-5xl mb-4">❌</div>
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={() => {
                setStatus("idle");
                setError("");
              }}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Not connected */}
        {!publicKey && (
          <p className="text-gray-500">Connect your wallet to check in</p>
        )}
      </div>
    </div>
  );
}