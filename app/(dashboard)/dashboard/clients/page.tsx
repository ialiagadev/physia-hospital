"use client"
export const dynamic = "force-dynamic"

import { Suspense } from "react"
import ClientsPageContent from "./ClientsPageContent"

export default function ClientsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Cargando clientes...</div>}>
      <ClientsPageContent />
    </Suspense>
  )
}
