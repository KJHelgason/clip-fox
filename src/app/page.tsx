'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthForm from "@/components/AuthForm";
import LoggedInUI from "@/components/LoggedInUI";

export default function Home() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setLoggedIn(!!data.session);
      setSessionChecked(true);
    };
    checkSession();
  }, []);

  if (!sessionChecked) return <div>Loading...</div>;

  return (
    <main className="flex h-screen items-center justify-center">
      {loggedIn ? <LoggedInUI /> : <AuthForm />}
    </main>
  );
}
