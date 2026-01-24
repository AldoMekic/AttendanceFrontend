"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import toast from "react-hot-toast";

import { useProgram } from "@/lib/program";
import { mintProofCnft } from "@/lib/cnft";
import { getErrorMessage } from "@/lib/errors";
import Link from "next/link";

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
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("studentInfo");
      if (saved) {
        const { firstName: fn, lastName: ln } = JSON.parse(saved);
        if (fn) setFirstName(fn);
        if (ln) setLastName(ln);
      }
    } catch {}
  }, []);

  const handleCheckIn = async () => {
    if (!program || !publicKey) return;

    const first = firstName.trim();
    const last = lastName.trim();

    if (!first || !last) {
      setError("Please enter your first and last name.");
      setStatus("error");
      return;
    }
    if (first.length > 32 || last.length > 32) {
      setError("Names must be 32 characters or less.");
      setStatus("error");
      return;
    }

    try {
      localStorage.setItem("studentInfo", JSON.stringify({ firstName: first, lastName: last }));
    } catch {}

    setStatus("loading");
    setError("");

    const handleCheckInSuccess = (pda: PublicKey) => {
      setCheckInTime(new Date());
      setStatus("success");
      toast.success("Checked in!");

      // Mint cnft proof in background (non-blocking)
      mintProofCnft({ wallet, leafOwner: publicKey, classOrEventPda: pda }).catch(console.warn);
    };

    try {
      if (eventParam) {
        const eventPDA = new PublicKey(eventParam);
        await program.methods
          .checkIn(first, last)
          .accounts({ attendee: publicKey, event: eventPDA })
          .rpc();
        handleCheckInSuccess(eventPDA);
        return;
      }

      if (classParam && sessionParam) {
        const classPDA = new PublicKey(classParam);
        await (program as any).methods
          .checkInSession(Number(sessionParam), first, last)
          .accounts({ student: publicKey, class: classPDA })
          .rpc();
        handleCheckInSuccess(classPDA);
        return;
      }

      setStatus("error");
      setError("Invalid link. Missing event or class.");
      toast.error("Invalid link. Missing event or class.");
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setStatus("error");
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  if (!eventParam && !(classParam && sessionParam)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Student Check-In</h1>
          <p className="text-gray-600">Scan a QR code from your teacher.</p>
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
            <div className="text-left space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">First name</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={32}
                  className="w-full p-3 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last name</label>
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
              disabled={!firstName.trim() || !lastName.trim()}
              className="w-full p-4 bg-green-600 text-white rounded-lg text-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
            >
              Check In Now
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="p-8 bg-gray-50 rounded-lg">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Recording attendance...</p>
          </div>
        )}

        {status === "success" && (
          <div className="p-8 bg-green-50 rounded-lg">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-xl font-medium text-green-800">You're checked in!</p>
            {checkInTime && (
              <p className="text-green-600 text-sm">
                {checkInTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
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

        {!publicKey && <p className="text-gray-500">Connect your wallet to check in</p>}
      </div>
    </div>
  );
}