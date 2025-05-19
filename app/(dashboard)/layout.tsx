import type React from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"

export const revalidate = 0

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Eliminamos la verificación de autenticación
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <aside className="hidden w-64 border-r md:block">
          <Sidebar />
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
