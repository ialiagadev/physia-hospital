"use client"

import { MainSidebar } from "@/components/main-sidebar"
import { BalanceDropdown } from "@/components/balance/balance-dropdown"

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
        <header className="border-b bg-background flex justify-end items-center px-6 py-3">
          {/* Balance a la derecha */}
          <BalanceDropdown />
        </header>

        {/* Contenido de la página */}
        <main className="flex-1 overflow-auto py-6 px-0">
  {children}
</main>


      </div>
    </div>
  )
}
