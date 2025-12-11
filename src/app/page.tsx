import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-8">
        <h1 className="text-4xl font-bold">Attendance Check-In</h1>
        <p className="text-gray-600">Proof of presence on Solana</p>

        <div className="flex flex-col gap-4">
          <Link
            href="/teacher/create"
            className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg hover:bg-blue-700"
          >
            I'm a Teacher
          </Link>
          <Link
            href="/student"
            className="px-8 py-4 bg-green-600 text-white rounded-lg text-lg hover:bg-green-700"
          >
            I'm a Student
          </Link>
        </div>
      </div>
    </div>
  );
}