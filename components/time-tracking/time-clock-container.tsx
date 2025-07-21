"use client"

import { TimeClock } from "./time-clock"
import { useTimeTracking } from "@/hooks/use-time-tracking"
import { Card, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState, useRef } from "react"

interface TimeClockContainerProps {
  selectedUser?: {
    id: string
    name: string | null
    email: string | null
    organization_id: number | null
  } | null
  onClockSuccess?: () => void // Añadir esta propiedad
}

export function TimeClockContainer({ selectedUser, onClockSuccess }: TimeClockContainerProps) {
  const { userProfile, loading, error, clockInOut, getLastEntry } = useTimeTracking()
  const { toast } = useToast()

  // Estado local para manejar el último entry por usuario
  const [lastEntry, setLastEntry] = useState<any>(null)
  const [isLoadingEntry, setIsLoadingEntry] = useState(false)

  // Referencia para evitar solicitudes innecesarias
  const lastRequestedUserId = useRef<string | null>(null)

  // Usar el usuario seleccionado o el perfil del usuario actual
  const targetUser = selectedUser || userProfile

  // Efecto para cargar el último entry cuando cambia el usuario
  useEffect(() => {
    const loadLastEntry = async () => {
      // Validar que tenemos un usuario válido con ID
      if (!targetUser?.id || typeof targetUser.id !== "string" || targetUser.id.trim() === "") {
        setLastEntry(null)
        return
      }

      // Evitar solicitudes duplicadas para el mismo usuario
      if (lastRequestedUserId.current === targetUser.id) {
        return
      }

      lastRequestedUserId.current = targetUser.id
      setIsLoadingEntry(true)

      try {
        const entry = await getLastEntry(targetUser.id)
        setLastEntry(entry)
      } catch (err) {
        console.error("Error loading last entry:", err)
        setLastEntry(null)
      } finally {
        setIsLoadingEntry(false)
      }
    }

    loadLastEntry()
  }, [targetUser?.id, getLastEntry])

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
    if (!targetUser.id || !targetUser.organization_id) {
      toast({
        title: "❌ Error",
        description: "Información de usuario incompleta",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await clockInOut(targetUser.id, targetUser.organization_id, entryType)

      if (result.success) {
        toast({
          title: entryType === "entrada" ? "✅ Entrada registrada" : "✅ Salida registrada",
          description: `Fichaje de ${entryType} guardado correctamente.`,
        })

        // Actualizar el estado local inmediatamente
        const newEntry = {
          id: result.data?.id || "temp-id",
          entry_type: entryType,
          local_timestamp: new Date().toISOString(),
          user_name: targetUser.name,
        }
        setLastEntry(newEntry)

        // Actualizar la referencia para permitir una nueva solicitud
        lastRequestedUserId.current = null

        // Llamar al callback si existe para actualizar los registros
        if (onClockSuccess) {
          onClockSuccess()
        }
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

  return (
    <TimeClock
      user={targetUser}
      lastEntry={lastEntry}
      onClockInOut={handleClockInOut}
      isLoading={loading || isLoadingEntry}
    />
  )
}
