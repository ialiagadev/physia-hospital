"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface InvoiceStatusSelectorProps {
  invoiceId: number
  currentStatus: string
  size?: "sm" | "default"
  onStatusChange?: (newStatus: string) => void
}

export function InvoiceStatusSelector({
  invoiceId,
  currentStatus,
  size = "default",
  onStatusChange,
}: InvoiceStatusSelectorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState(currentStatus)
  const { toast } = useToast()
  const router = useRouter()

  // Definir los estados disponibles
  const statuses = [
    { value: "draft", label: "Borrador", color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" },
    { value: "issued", label: "Emitida", color: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
    { value: "paid", label: "Pagada", color: "bg-green-100 text-green-800 hover:bg-green-200" },
    { value: "rejected", label: "Rechazada", color: "bg-red-100 text-red-800 hover:bg-red-200" },
  ]

  // Obtener el estado actual
  const currentStatusObj = statuses.find((s) => s.value === status) || statuses[0]

  // Función para actualizar el estado
  const updateStatus = async (newStatus: string) => {
    if (newStatus === status) return

    // Actualización optimista de la UI
    const previousStatus = status
    setStatus(newStatus)
    setIsLoading(true)

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Error al actualizar el estado")
      }

      toast({
        title: "Estado actualizado",
        description: `La factura ha sido actualizada a "${
          statuses.find((s) => s.value === newStatus)?.label || newStatus
        }"`,
      })

      // Llamar al callback si existe
      if (onStatusChange) {
        onStatusChange(newStatus)
      }
    } catch (error) {
      console.error("Error al actualizar el estado:", error)

      // Revertir la actualización optimista en caso de error
      setStatus(previousStatus)

      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la factura",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer",
            currentStatusObj.color,
            isLoading && "opacity-70 cursor-not-allowed",
          )}
        >
          {currentStatusObj.label}
          <span className="sr-only">Cambiar estado</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        {statuses.map((status) => (
          <DropdownMenuItem
            key={status.value}
            className={`${status.value === currentStatus ? "bg-muted" : ""} cursor-pointer text-sm`}
            onClick={() => updateStatus(status.value)}
            disabled={isLoading}
          >
            <div className={`mr-2 h-1.5 w-1.5 rounded-full ${status.color.split(" ")[0]}`} />
            {status.label}
            {status.value === currentStatus && <Check className="ml-auto h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
