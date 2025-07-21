// app/(dashboard)/dashboard/layout.tsx
"use client"

import { MainSidebar } from "@/components/main-sidebar"
import { UserNav } from "@/components/dashboard/user-nav"

export default function MainDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      {/* Sidebar principal */}
      <div className="hidden md:block">
        <MainSidebar />
      </div>

      {/* Contenido principal */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="border-b bg-background">
         
        </header>

        {/* Contenido de la página */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}