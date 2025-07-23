// src/app/admin/layout.tsx
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen">
            <aside className="w-60 bg-gray-900 text-white p-4 space-y-4">
                <h2 className="text-lg font-bold">Admin Panel</h2>
                <nav className="space-y-2">
                    <Link
                        href="/admin"
                        className="block hover:text-blue-300 transition"
                    >
                        📊 Analytics
                    </Link>
                    <Link
                        href="/admin/users"
                        className="block hover:text-blue-300 transition"
                    >
                        👤 User Management
                    </Link>
                </nav>
            </aside>
            <main className="flex-1 bg-white p-6">{children}</main>
        </div>
    );
}
