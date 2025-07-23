'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LoggedInUI() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function fetchProfile() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) setProfile(data);
    }

    fetchProfile();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  if (!profile) return <div>Loading profile...</div>;

  return (
  <div className="bg-white text-black p-6 rounded shadow w-full max-w-md text-center space-y-4">
    {profile.avatar_url && (
      <img
        src={profile.avatar_url}
        alt="Profile"
        className="w-20 h-20 mx-auto rounded-full"
      />
    )}
    <h2 className="text-xl font-bold">{profile.username || profile.email}</h2>
    <p className="text-sm text-gray-600">Logged in via {profile.provider}</p>
    <Link href="/dashboard">
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Dashboard</button>
      </Link>
    <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">
      Log Out
    </button>
  </div>
);

}
