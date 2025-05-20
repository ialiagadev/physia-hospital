import type React from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { Breadcrumbs } from "@/components/breadcrumbs"

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
        <main className="flex-1 flex flex-col">
          <div className="px-6 py-2 border-b">
            <Breadcrumbs />
          </div>
          <div className="p-6 flex-1">{children}</div>
        </main>
      </div>
    </div>
  )
}
