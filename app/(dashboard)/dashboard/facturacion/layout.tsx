// app/(dashboard)/dashboard/facturacion/layout.tsx
"use client"

import { Sidebar } from "@/components/dashboard/sidebar"

export default function FacturacionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1">
      {/* Sidebar de facturación (segundo sidebar) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Contenido de facturación */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}