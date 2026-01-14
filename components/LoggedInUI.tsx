'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LoggedInUI() {
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user;
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      setUser(currentUser);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (data) {
        setProfile(data);
      } else if (error) {
        // Profile doesn't exist - create it
        // Profile not found, creating...
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            email: currentUser.email,
            username: currentUser.user_metadata?.name || currentUser.email?.split('@')[0],
            avatar_url: currentUser.user_metadata?.avatar_url,
            role: 'user'
          })
          .select()
          .single();
        
        if (newProfile) {
          setProfile(newProfile);
        } else {
          console.error('Failed to create profile:', createError);
          // Still show UI with user data
          setProfile({
            id: currentUser.id,
            email: currentUser.email,
            username: currentUser.user_metadata?.name || currentUser.email?.split('@')[0],
            avatar_url: currentUser.user_metadata?.avatar_url,
          });
        }
      }
      setLoading(false);
    }

    fetchProfile();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  if (loading) return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  );

  if (!user) return <div>Not logged in</div>;

  return (
    <div className="bg-zinc-900 text-white p-8 rounded-xl shadow-xl w-full max-w-md text-center space-y-6">
      {(profile?.avatar_url || user?.user_metadata?.avatar_url) && (
        <img
          src={profile?.avatar_url || user?.user_metadata?.avatar_url}
          alt="Profile"
          className="w-24 h-24 mx-auto rounded-full border-4 border-purple-600"
        />
      )}
      <div>
        <h2 className="text-2xl font-bold">{profile?.username || user?.user_metadata?.name || user?.email}</h2>
        <p className="text-sm text-zinc-400">{user?.email}</p>
      </div>
      
      <div className="space-y-3">
        <Link href="/dashboard" className="block">
          <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-medium transition">
            🎬 Go to Dashboard
          </button>
        </Link>
        <Link href="/dashboard/clips" className="block">
          <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-lg font-medium transition border border-zinc-700">
            📂 My Clips
          </button>
        </Link>
      </div>
      
      <button 
        onClick={handleLogout} 
        className="text-zinc-400 hover:text-red-400 text-sm transition"
      >
        Log Out
      </button>
    </div>
  );
}
