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

  if (!sessionChecked) return <div>Loading...</div>;

  return (
    <main className="flex h-screen items-center justify-center">
      {loggedIn ? <LoggedInUI /> : <AuthForm />}
    </main>

  );
}
