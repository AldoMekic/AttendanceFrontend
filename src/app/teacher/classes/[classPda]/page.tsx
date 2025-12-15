"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import QRCode from "qrcode";
import TeacherNav from "../../TeacherNav";
import { useProgram } from "@/lib/program";

type RosterItem = {
  wallet: string;
  firstName: string;
  lastName: string;
  timestamp: number;
};

export default function ClassDetailPage() {
  const params = useParams();
  const classPdaStr = params.classPda as string;

  const { publicKey } = useWallet();
  const program = useProgram();

  const [className, setClassName] = useState("");
  const [classId, setClassId] = useState("");
  const [teacher, setTeacher] = useState("");
  const [currentSession, setCurrentSession] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionEnd, setSessionEnd] = useState<number>(0);

  const [qrUrl, setQrUrl] = useState("");
  const [duration, setDuration] = useState(60);

  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [error, setError] = useState("");

  const classPk = useMemo(() => new PublicKey(classPdaStr), [classPdaStr]);

  const fetchClass = useCallback(async () => {
    if (!program) return;

    setError("");
    try {
      const acc = await (program as any).account.class.fetch(classPk);
      setClassName(acc.name as string);
      setClassId(acc.classId as string);
      setTeacher((acc.teacher as PublicKey).toBase58());
      setCurrentSession(Number(acc.currentSession));
      setIsActive(Boolean(acc.isActive));
      setSessionEnd(Number(acc.sessionEnd) * 1000);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to fetch class");
    }
  }, [program, classPk]);

  useEffect(() => {
    if (!isActive || currentSession === 0) {
      setQrUrl("");
      return;
    }
    const url = `${window.location.origin}/student?class=${classPdaStr}&session=${currentSession}`;
    QRCode.toDataURL(url, { width: 320, margin: 2 }).then(setQrUrl);
  }, [isActive, currentSession, classPdaStr]);

  const fetchRoster = useCallback(async () => {
    if (!program) return;

    setLoadingRoster(true);
    try {
      const accounts = await (program as any).account.classAttendance.all([
        {
          memcmp: {
            offset: 8,
            bytes: classPk.toBase58(),
          },
        },
      ]);

      const mapped: RosterItem[] = accounts
        .map((acc: any) => ({
          wallet: (acc.account.student as PublicKey).toBase58(),
          firstName: acc.account.firstName as string,
          lastName: acc.account.lastName as string,
          timestamp: Number(acc.account.timestamp) * 1000,
          session: Number(acc.account.session),
        }))
        .filter((x: any) => x.session === currentSession)
        .map(({ session, ...rest }: any) => rest);

      mapped.sort((a, b) => b.timestamp - a.timestamp);
      setRoster(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRoster(false);
    }
  }, [program, classPk, currentSession]);

  useEffect(() => {
    fetchClass();
  }, [fetchClass]);

  useEffect(() => {
    fetchRoster();
    const t = setInterval(fetchRoster, 5000);
    return () => clearInterval(t);
  }, [fetchRoster]);

  const handleStart = async () => {
    if (!program || !publicKey) return;
    setError("");

    try {
      await (program as any).methods
        .startSession(duration)
        .accounts({
          teacher: publicKey,
          class: classPk,
        })
        .rpc();

      await fetchClass();
      await fetchRoster();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to start session");
    }
  };

  const handleEnd = async () => {
    if (!program || !publicKey) return;
    setError("");

    try {
      await (program as any).methods
        .endSession()
        .accounts({
          teacher: publicKey,
          class: classPk,
        })
        .rpc();

      await fetchClass();
      await fetchRoster();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to end session");
    }
  };

  const isOwner = publicKey?.toBase58() === teacher;

  return (
    <div className="min-h-screen bg-white">
      <TeacherNav />

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{className || "Class"}</h1>
            <div className="text-sm text-gray-600">Class ID: {classId}</div>
            <div className="text-xs text-gray-500 font-mono break-all mt-1">
              {classPdaStr}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600">Current session</div>
            <div className="text-3xl font-bold">{currentSession}</div>
            <div className={`text-xs mt-1 ${isActive ? "text-green-700" : "text-gray-500"}`}>
              {isActive ? "ACTIVE" : "INACTIVE"}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>
        )}

        <div className="border rounded-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="p-2 border rounded"
                disabled={!isOwner || isActive}
              >
                <option value={30}>30 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
                <option value={120}>120 min</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleStart}
                disabled={!isOwner || !program || isActive}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 hover:bg-green-700"
              >
                Start Session
              </button>
              <button
                onClick={handleEnd}
                disabled={!isOwner || !program || !isActive}
                className="px-4 py-2 bg-gray-800 text-white rounded disabled:opacity-50 hover:bg-gray-900"
              >
                End Session
              </button>
              <button
                onClick={fetchClass}
                disabled={!program}
                className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {isActive && sessionEnd > 0 && (
            <div className="text-xs text-gray-600 mt-3">
              Session ends: {new Date(sessionEnd).toLocaleString()}
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Check-in QR</h2>

          {!isActive ? (
            <div className="text-gray-600">
              Start a session to generate the QR code.
            </div>
          ) : qrUrl ? (
            <div className="flex flex-col items-center gap-3">
              <img
                src={qrUrl}
                alt="Session QR"
                className="border-4 border-gray-200 rounded-lg"
              />
              <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">
                {`${typeof window !== "undefined" ? window.location.origin : ""}/student?class=${classPdaStr}&session=${currentSession}`}
              </code>
            </div>
          ) : (
            <div className="w-[320px] h-[320px] bg-gray-100 rounded-lg animate-pulse" />
          )}
        </div>
        
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">
              Roster (Session {currentSession}) — {roster.length}
            </h2>
            <button
              onClick={fetchRoster}
              className="text-sm text-blue-600 hover:underline"
              disabled={!program || loadingRoster}
            >
              {loadingRoster ? "Loading..." : "Refresh"}
            </button>
          </div>

          {!isActive ? (
            <div className="text-gray-600">
              No active session. Start a session to accept check-ins.
            </div>
          ) : roster.length === 0 ? (
            <div className="text-gray-600">No check-ins yet for this session.</div>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {roster.map((r) => (
                <li
                  key={`${r.wallet}-${r.timestamp}`}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <div className="font-medium">
                      {r.firstName} {r.lastName}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {r.wallet.slice(0, 4)}...{r.wallet.slice(-4)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}