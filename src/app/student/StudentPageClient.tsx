"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { useProgram } from "@/lib/program";
import { mintProofCnft } from "@/lib/cnft";

type Status = "idle" | "loading" | "success" | "error";

export default function StudentPageClient() {
  const searchParams = useSearchParams();
  const eventParam = searchParams.get("event");
  const classParam = searchParams.get("class");
  const sessionParam = searchParams.get("session");

  const wallet = useWallet();
  const { publicKey } = wallet;
  const program = useProgram();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const handleCheckIn = async () => {
    if (!program || !publicKey) return;

    setStatus("loading");
    setError("");

    if (!firstName.trim() || !lastName.trim()) {
      setStatus("error");
      setError("Please enter your first and last name.");
      return;
    }

    if (firstName.length > 32 || lastName.length > 32) {
      setStatus("error");
      setError("First name and last name must be 32 characters or less.");
      return;
    }

    try {
      if (eventParam) {
        const eventPDA = new PublicKey(eventParam);

        await program.methods
          .checkIn(firstName.trim(), lastName.trim())
          .accounts({
            attendee: publicKey,
            event: eventPDA,
          })
          .rpc();

        setStatus("success");

        try {
          await mintProofCnft({
            wallet,
            leafOwner: publicKey,
            classOrEventPda: eventPDA,
          });
        } catch (e) {
          console.warn("Mint failed, but check-in succeeded:", e);
        }

        return;
      }

      if (classParam && sessionParam) {
        const classPDA = new PublicKey(classParam);
        const session = Number(sessionParam);

        await (program as any).methods
          .checkInSession(session, firstName.trim(), lastName.trim())
          .accounts({
            student: publicKey,
            class: classPDA,
          })
          .rpc();

        setStatus("success");

        try {
          await mintProofCnft({
            wallet,
            leafOwner: publicKey,
            classOrEventPda: classPDA,
          });
        } catch (e) {
          console.warn("Mint failed, but check-in succeeded:", e);
        }

        return;
      }

      setStatus("error");
      setError("Invalid check-in link. Missing event or class/session.");
    } catch (e: any) {
      console.error(e);
      setStatus("error");

      const msg = e?.message ?? "";

      if (msg.includes("already in use") || msg.includes("0x0")) {
        setError("You've already checked in!");
      } else if (msg.includes("EventEnded")) {
        setError("This event or session has ended.");
      } else if (msg.includes("insufficient")) {
        setError("Insufficient SOL for transaction fees.");
      } else {
        setError("Check-in failed. Please try again.");
      }
    }
  };

  if (!eventParam && !(classParam && sessionParam)) {
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

        {publicKey && status === "idle" && (
          <div className="space-y-4">
            <div className="space-y-3 text-left">
              <div>
                <label className="block text-sm font-medium mb-1">
                  First name
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={32}
                  className="w-full p-3 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Last name
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  maxLength={32}
                  className="w-full p-3 border rounded"
                />
              </div>
            </div>

            <button
              onClick={handleCheckIn}
              className="w-full p-4 bg-green-600 text-white rounded-lg text-lg font-medium hover:bg-green-700"
            >
              Check In Now
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="p-8 bg-gray-50 rounded-lg">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Recording your attendance...</p>
          </div>
        )}

        {status === "success" && (
          <div className="p-8 bg-green-50 rounded-lg">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-xl font-medium text-green-800">
              You're checked in!
            </p>
          </div>
        )}

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

        {!publicKey && (
          <p className="text-gray-500">Connect your wallet to check in</p>
        )}
      </div>
    </div>
  );
}
