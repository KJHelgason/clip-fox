'use client';

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  useEffect(() => {
    async function testSupabase() {
      const { data, error } = await supabase.from("test").select("*");
      console.log("data:", data);
      console.log("error:", error);
    }

    testSupabase();
  }, []);

  return (
    <main className="flex h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">🦊 Supabase connected</h1>
    </main>
  );
}
