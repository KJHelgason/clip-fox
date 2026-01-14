'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthForm from "@/components/AuthForm";
import LoggedInUI from "@/components/LoggedInUI";
import Link from "next/link";

export default function Home() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setLoggedIn(!!data.session);
      setSessionChecked(true);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!sessionChecked) return (
    <main className="flex h-screen items-center justify-center bg-zinc-950">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </main>
  );

  return (
    <main className="flex h-screen items-center justify-center bg-zinc-950">
      {loggedIn ? <LoggedInUI /> : <AuthForm />}
    </main>

  );
}
