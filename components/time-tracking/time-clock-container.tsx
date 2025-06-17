"use client"

import { TimeClock } from "./time-clock"
import { useTimeTracking } from "@/hooks/use-time-tracking"
import { Card, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TimeClockContainerProps {
  selectedUser?: {
    id: string
    name: string | null
    email: string | null // Cambiado a string | null
    organization_id: number | null
  } | null
}

export function TimeClockContainer({ selectedUser }: TimeClockContainerProps) {
  const { userProfile, lastEntry, loading, error, refreshLastEntry, clockInOut } = useTimeTracking()
  const { toast } = useToast()

  // Usar el usuario seleccionado o el perfil del usuario actual
  const targetUser = selectedUser || userProfile

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          <p>Cargando...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          <div className="text-center text-red-500">
            <p>Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!targetUser || !targetUser.organization_id) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          <div className="text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No se pudo cargar el usuario</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleClockInOut = async (entryType: "entrada" | "salida") => {
    try {
      const result = await clockInOut(targetUser.id, targetUser.organization_id!, entryType)

      if (result.success) {
        toast({
          title: entryType === "entrada" ? "✅ Entrada registrada" : "✅ Salida registrada",
          description: `Fichaje de ${entryType} guardado correctamente`,
        })
        refreshLastEntry(targetUser.id)
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al fichar"
      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  return <TimeClock user={targetUser} lastEntry={lastEntry} onClockInOut={handleClockInOut} isLoading={loading} />
}
