"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import TeacherNav from "../../TeacherNav";
import { useProgram, getClassPDA } from "@/lib/program";

export default function CreateClassPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const program = useProgram();

  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!program || !publicKey) return;

    if (!classId.trim()) {
      setError("Class ID is required.");
      return;
    }
    if (classId.length > 16) {
      setError("Class ID must be 16 characters or less.");
      return;
    }
    if (name.length > 64) {
      setError("Class name must be 64 characters or less.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await (program as any).methods
        .createClass(classId.trim(), name.trim())
        .accounts({ teacher: publicKey })
        .rpc();

      const classPda = getClassPDA(publicKey, classId.trim());
      router.push(`/teacher/classes/${classPda.toBase58()}`);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to create class");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <TeacherNav />

      <div className="max-w-md mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold text-center">Create Class</h1>

        <div className="flex justify-center">
          <WalletMultiButton />
        </div>

        {publicKey && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Class ID</label>
              <input
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                maxLength={16}
                className="w-full p-3 border rounded"
                placeholder="e.g., cs101"
              />
              <p className="text-xs text-gray-500 mt-1">{classId.length}/16</p>
              <p className="text-xs text-gray-500 mt-1">
                Tip: keep it short and unique per teacher wallet.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Class Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={64}
                className="w-full p-3 border rounded"
                placeholder="e.g., CS 101 Lecture"
              />
              <p className="text-xs text-gray-500 mt-1">{name.length}/64</p>
            </div>

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>
            )}

            <button
              onClick={handleCreate}
              disabled={loading || !classId.trim() || !name.trim()}
              className="w-full p-3 bg-blue-600 text-white rounded font-medium disabled:bg-gray-400 hover:bg-blue-700"
            >
              {loading ? "Creating..." : "Create Class"}
            </button>
          </div>
        )}

        {!publicKey && (
          <div className="text-center text-gray-600">
            Connect your wallet to create a class.
          </div>
        )}
      </div>
    </div>
  );
}