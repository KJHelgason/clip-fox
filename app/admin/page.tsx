// src/app/admin/page.tsx
'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AnalyticsPage() {
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (!error) setUserCount(count ?? 0);
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">📊 Analytics</h1>
      <p className="text-lg">Total Registered Users: {userCount ?? "Loading..."}</p>
    </div>
  );
}
