'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type UserProfile = {
  id: string
  email: string
  username: string
  role: string
  created_at: string
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const session = (await supabase.auth.getSession()).data.session;
      const userId = session?.user.id;

      if (!userId) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      setCurrentUserRole(profile?.role ?? null);

      const { data: userList } = await supabase
        .from("profiles")
        .select("id, email, username, role, created_at");

      if (userList) setUsers(userList);
    };

    fetchData();
  }, []);

  const promoteToAdmin = async (id: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", id);

    if (!error) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, role: "admin" } : u
        )
      );
    }
  };

  const demoteToUser = async (id: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: "user" })
      .eq("id", id);

    if (!error) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, role: "user" } : u
        )
      );
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">👤 User Management</h1>
      <table className="w-full border">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-2">Email</th>
            <th className="p-2">Username</th>
            <th className="p-2">Role</th>
            {currentUserRole === 'owner' && <th className="p-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.username}</td>
              <td className="p-2">{u.role}</td>
              {currentUserRole === 'owner' && (
                <td className="p-2">
                  {u.role === 'user' ? (
                    <button
                      onClick={() => promoteToAdmin(u.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Promote
                    </button>
                  ) : (
                    u.role === 'admin' ? (
                    <button
                      onClick={() => demoteToUser(u.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Demote
                    </button>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
