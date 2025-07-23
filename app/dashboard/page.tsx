'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) {
        router.push("/"); // Redirect if not logged in
      } else {
        setUserEmail(session.user.email ?? null);
      }

      setLoading(false);
    };

    getSession();
  }, [router]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Welcome to your Dashboard</h1>
      <p className="mt-2 text-gray-600">You're logged in as {userEmail}</p>
      <Link href="/dashboard/upload">
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Upload Clips</button>
      </Link>
      <Link href="/dashboard/clips">
        <button className="bg-green-600 text-white px-4 py-2 rounded">Manage Clips</button>
      </Link>
    </main>
  );
}
