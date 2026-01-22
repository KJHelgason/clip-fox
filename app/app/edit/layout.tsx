'use client'

// This layout removes the dashboard sidebar for the editor page
// The editor has its own full-screen layout
export default function EditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a14]">
      {children}
    </div>
  )
}
